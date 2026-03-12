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
  type Timestamp,
  type DocumentReference,
} from "firebase/firestore";
import { db } from "./firebase";
import type { WorkDay, WorkDayData, Punch } from "@/types";

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
  const ref = doc(db, WORK_DAYS, workDayId(userId, date));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as WorkDay;
}

export async function punchIn(userId: string, date: string): Promise<void> {
  const hasOpen = await hasOpenPunch(userId);
  if (hasOpen) {
    throw new Error("Já existe um expediente em aberto. Registre a saída antes de nova entrada.");
  }
  const id = workDayId(userId, date);
  const ref = doc(db, WORK_DAYS, id);
  const existing = await getDoc(ref);
  const now = serverTimestamp() as Timestamp;
  const newPunch: Punch = { entry: now, exit: null };
  if (existing.exists()) {
    const data = existing.data();
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
  const now = serverTimestamp() as Timestamp;
  const updated = [...punches];
  updated[punchIndex] = { ...updated[punchIndex], exit: now };
  await updateDoc(docRef, { punches: updated, updatedAt: serverTimestamp() });
}

export async function hasOpenPunch(userId: string): Promise<boolean> {
  const open = await getOpenPunchDocument(userId);
  return !!open;
}

export async function getOpenPunchDocument(
  userId: string
): Promise<{ docRef: DocumentReference; punchIndex: number; punches: Punch[] } | null> {
  const col = collection(db, WORK_DAYS);
  const q = query(col, where("userId", "==", userId));
  const snapshot = await getDocs(q);
  for (const d of snapshot.docs) {
    const data = d.data();
    const punches = (data.punches || []) as Punch[];
    const idx = punches.findIndex((p: Punch) => p.exit === null);
    if (idx !== -1) {
      return { docRef: doc(db, WORK_DAYS, d.id), punchIndex: idx, punches };
    }
  }
  return null;
}

export async function updateWorkDayNotes(
  userId: string,
  date: string,
  notes: string
): Promise<void> {
  const id = workDayId(userId, date);
  const ref = doc(db, WORK_DAYS, id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await updateDoc(ref, { notes, updatedAt: serverTimestamp() });
  } else {
    await setDoc(ref, {
      userId,
      date,
      punches: [],
      notes,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function getWorkDaysInMonth(
  userId: string,
  month: string
): Promise<WorkDay[]> {
  const [year, m] = month.split("-").map(Number);
  const start = `${year}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  const end = `${year}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const col = collection(db, WORK_DAYS);
  const q = query(col, where("userId", "==", userId));
  const snapshot = await getDocs(q);
  const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as WorkDay));
  const inRange = all.filter((w) => w.date >= start && w.date <= end);
  inRange.sort((a, b) => a.date.localeCompare(b.date));
  return inRange;
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
  const ref = doc(db, MONTH_CLOSURES, id);
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
  const ref = doc(db, MONTH_CLOSURES, monthClosureId(userId, month));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { closedAt: snap.data().closedAt } as { closedAt: Timestamp };
}

export { workDayId, monthClosureId };
