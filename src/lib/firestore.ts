import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  type DocumentReference,
  type DocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "./firebase";
import type { WorkDay, WorkDayData, Punch } from "@/types";

const RETRYABLE_CODES = new Set(["unavailable", "failed-precondition"]);

async function withRetry<T>(fn: () => Promise<T>, retries = 4): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      const isLast = attempt === retries - 1;
      if (isLast || !RETRYABLE_CODES.has(code)) throw err;
      await new Promise((res) => setTimeout(res, 600 * (attempt + 1)));
    }
  }
  throw new Error("Falha após múltiplas tentativas.");
}

const WORK_DAYS = "workDays";
const MONTH_CLOSURES = "monthClosures";

function workDayId(userId: string, date: string): string {
  return `${userId}_${date}`;
}

function monthClosureId(userId: string, month: string): string {
  return `${userId}_${month}`;
}

export async function getWorkDay(
  userId: string,
  date: string
): Promise<WorkDay | null> {
  const ref = doc(getDb(), WORK_DAYS, workDayId(userId, date));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as WorkDay;
}

const OPEN_CHECK_TIMEOUT_MS = 4000;

async function hasOpenPunchWithTimeout(userId: string): Promise<boolean> {
  return Promise.race([
    hasOpenPunch(userId),
    new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(false), OPEN_CHECK_TIMEOUT_MS)
    ),
  ]);
}

export async function punchIn(userId: string, date: string): Promise<void> {
  const hasOpen = await hasOpenPunchWithTimeout(userId);
  if (hasOpen) {
    throw new Error("Já existe um expediente em aberto. Registre a saída antes de nova entrada.");
  }
  const id = workDayId(userId, date);
  const ref = doc(getDb(), WORK_DAYS, id);
  let existing: DocumentSnapshot | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      existing = await getDocWithTimeout(ref, WORK_DAY_READ_TIMEOUT_MS);
      break;
    } catch (e) {
      if (attempt === 1) throw new Error("Leitura do dia demorou demais. Tente de novo.");
    }
  }
  const now = Timestamp.now();
  const newPunch: Punch = { entry: now, exit: null };
  if (existing!.exists()) {
    const data = existing!.data();
    const punches = (data.punches || []) as Punch[];
    punches.push(newPunch);
    await updateDoc(ref, {
      punches,
      updatedAt: serverTimestamp(),
    });
  } else {
    const data: Omit<WorkDayData, "createdAt" | "updatedAt"> & {
      createdAt: ReturnType<typeof serverTimestamp>;
      updatedAt: ReturnType<typeof serverTimestamp>;
    } = {
      userId,
      date,
      punches: [newPunch],
      notes: "",
      records: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, data);
  }
}

export async function punchOut(userId: string): Promise<void> {
  const openDoc = await getOpenPunchDocument(userId);
  if (!openDoc) {
    throw new Error("Nenhum expediente em aberto para registrar saída.");
  }
  const { docRef, punchIndex, punches } = openDoc;
  const now = Timestamp.now();
  const updated = [...punches];
  updated[punchIndex] = { ...updated[punchIndex], exit: now };
  await updateDoc(docRef, { punches: updated, updatedAt: serverTimestamp() });
}

export async function hasOpenPunch(userId: string): Promise<boolean> {
  const open = await getOpenPunchDocument(userId);
  return !!open;
}

const SINGLE_GET_TIMEOUT_MS = 3000;
/** Leitura do documento do dia em punchIn; banco novo ou frio pode demorar. */
const WORK_DAY_READ_TIMEOUT_MS = 15_000;

function getDocWithTimeout(
  ref: DocumentReference,
  ms: number = SINGLE_GET_TIMEOUT_MS
): Promise<DocumentSnapshot> {
  return Promise.race([
    getDoc(ref),
    new Promise<DocumentSnapshot>((_, reject) =>
      setTimeout(
        () => reject(new Error("Timeout ao ler documento.")),
        ms
      )
    ),
  ]);
}

export async function getOpenPunchDocument(
  userId: string
): Promise<{ docRef: DocumentReference; punchIndex: number; punches: Punch[] } | null> {
  const base = new Date();
  for (let daysBack = 0; daysBack <= 3; daysBack++) {
    const d = new Date(base);
    d.setDate(base.getDate() - daysBack);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const ref = doc(getDb(), WORK_DAYS, workDayId(userId, dateStr));
    let snap: DocumentSnapshot | undefined;
    try {
      snap = await getDocWithTimeout(ref);
    } catch {
      continue;
    }
    if (!snap?.exists()) continue;
    const punches = ((snap.data() as { punches?: Punch[] })?.punches || []) as Punch[];
    const idx = punches.findIndex((p: Punch) => p.exit === null);
    if (idx !== -1) {
      return { docRef: ref, punchIndex: idx, punches };
    }
  }
  return null;
}

/** Retorna data (YYYY-MM-DD) e horário de entrada da batida em aberto, ou null. */
export async function getOpenPunchDetails(
  userId: string
): Promise<{ date: string; entry: Timestamp } | null> {
  const open = await getOpenPunchDocument(userId);
  if (!open) return null;
  const date = open.docRef.id.slice(userId.length + 1);
  const entry = open.punches[open.punchIndex].entry;
  return { date, entry };
}

export async function updateWorkDayNotes(
  userId: string,
  date: string,
  notes: string
): Promise<void> {
  const id = workDayId(userId, date);
  const ref = doc(getDb(), WORK_DAYS, id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await updateDoc(ref, { notes, updatedAt: serverTimestamp() });
  } else {
    await setDoc(ref, {
      userId,
      date,
      punches: [],
      notes,
      records: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/** Atualiza o total de tempo trabalhado no dia (chamado a cada ~10s). */
export async function updateWorkDayTotal(
  userId: string,
  date: string,
  totalWorkedMs: number
): Promise<void> {
  const id = workDayId(userId, date);
  const ref = doc(getDb(), WORK_DAYS, id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await updateDoc(ref, {
      totalWorkedMs,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      userId,
      date,
      punches: [],
      notes: "",
      records: [],
      totalWorkedMs,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/** Atualiza a lista de registros "o que fiz" do dia. */
export async function updateWorkDayRecords(
  userId: string,
  date: string,
  records: string[]
): Promise<void> {
  const id = workDayId(userId, date);
  const ref = doc(getDb(), WORK_DAYS, id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await updateDoc(ref, { records, updatedAt: serverTimestamp() });
  } else {
    await setDoc(ref, {
      userId,
      date,
      punches: [],
      notes: "",
      records,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/** Marca o dia como fechado (sincronizado entre dispositivos). */
export async function closeWorkDay(userId: string, date: string): Promise<void> {
  const id = workDayId(userId, date);
  const ref = doc(getDb(), WORK_DAYS, id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await updateDoc(ref, { closedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  } else {
    await setDoc(ref, {
      userId,
      date,
      punches: [],
      notes: "",
      records: [],
      closedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/** Inscreve para atualizações em tempo real do documento do dia. Retorna função para cancelar. */
export function subscribeWorkDay(
  userId: string,
  date: string,
  onUpdate: (workDay: WorkDay | null) => void
): Unsubscribe {
  const ref = doc(getDb(), WORK_DAYS, workDayId(userId, date));
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      onUpdate({ id: snap.id, ...snap.data() } as WorkDay);
    },
    (err) => {
      console.error("subscribeWorkDay", err);
      onUpdate(null);
    }
  );
}

export async function getWorkDaysInMonth(
  userId: string,
  month: string
): Promise<WorkDay[]> {
  const [year, m] = month.split("-").map(Number);
  const start = `${year}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  const end = `${year}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const col = collection(getDb(), WORK_DAYS);
  const q = query(col, where("userId", "==", userId));
  const snapshot = await getDocs(q);
  const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as WorkDay));
  const inRange = all.filter((w) => w.date >= start && w.date <= end);
  inRange.sort((a, b) => a.date.localeCompare(b.date));
  return inRange;
}

/** Dia conta como “com registro” se há batida completa ou tempo trabalhado salvo. */
export function workDayHasTimeRegistration(w: WorkDay): boolean {
  if (typeof w.totalWorkedMs === "number" && w.totalWorkedMs > 0) return true;
  const punches = w.punches || [];
  return punches.some((p) => p.entry != null && p.exit != null);
}

/**
 * Lista todos os meses (YYYY-MM) em que o usuário tem pelo menos um dia com registro de ponto,
 * do mais recente ao mais antigo.
 */
export async function getMonthsWithWorkRecords(
  userId: string
): Promise<string[]> {
  const col = collection(getDb(), WORK_DAYS);
  const q = query(col, where("userId", "==", userId));
  const snapshot = await withRetry(() => getDocs(q));
  const months = new Set<string>();
  for (const d of snapshot.docs) {
    const w = { id: d.id, ...d.data() } as WorkDay;
    if (!w.date || w.date.length < 7) continue;
    if (!workDayHasTimeRegistration(w)) continue;
    months.add(w.date.slice(0, 7));
  }
  return Array.from(months).sort((a, b) => b.localeCompare(a));
}

export async function closeMonth(
  userId: string,
  month: string
): Promise<void> {
  const hasOpen = await hasOpenPunch(userId);
  if (hasOpen) {
    throw new Error("Registre sua saída antes de fechar o mês.");
  }
  const id = monthClosureId(userId, month);
  const ref = doc(getDb(), MONTH_CLOSURES, id);
  await setDoc(ref, {
    userId,
    month,
    closedAt: serverTimestamp(),
  });
}

export async function getMonthClosure(
  userId: string,
  month: string
): Promise<{ closedAt: Timestamp } | null> {
  const ref = doc(getDb(), MONTH_CLOSURES, monthClosureId(userId, month));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { closedAt: snap.data().closedAt } as { closedAt: Timestamp };
}

/** Cria ou atualiza os punches de um dia (edição manual de horários). */
export async function upsertWorkDayPunches(
  userId: string,
  date: string,
  punches: Punch[]
): Promise<void> {
  const id = workDayId(userId, date);
  const ref = doc(getDb(), WORK_DAYS, id);
  const existing = await getDoc(ref);
  const totalWorkedMs = punches.reduce((acc, p) => {
    if (p.entry && p.exit) {
      return acc + (p.exit.toMillis() - p.entry.toMillis());
    }
    return acc;
  }, 0);
  if (existing.exists()) {
    await updateDoc(ref, {
      punches,
      totalWorkedMs,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      userId,
      date,
      punches,
      notes: "",
      records: [],
      totalWorkedMs,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export { workDayId, monthClosureId };
