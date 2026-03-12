/**
 * Armazena batida em aberto e dia fechado no localStorage.
 */

const KEY_OPEN = "relogio-ponto-open";
const KEY_CLOSED_DAY = "relogio-ponto-closed-day";
const KEY_INTERVALS = "relogio-ponto-intervals";

export interface LocalInterval {
  entryAt: number;
  exitAt: number;
}

export interface LocalOpenPunch {
  userId: string;
  date: string;
  entryAt: number;
}

export function getLocalOpenPunch(): LocalOpenPunch | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY_OPEN);
    if (!raw) return null;
    return JSON.parse(raw) as LocalOpenPunch;
  } catch {
    return null;
  }
}

export function setLocalOpenPunch(data: LocalOpenPunch): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_OPEN, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function clearLocalOpenPunch(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY_OPEN);
  } catch {
    // ignore
  }
}

/** Data (YYYY-MM-DD) em que o usuário fechou o dia. Só encerra ao clicar em "Fechar dia". */
export function getClosedDay(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY_CLOSED_DAY);
  } catch {
    return null;
  }
}

export function setClosedDay(date: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_CLOSED_DAY, date);
  } catch {
    // ignore
  }
}

export function isDayClosed(today: string): boolean {
  return getClosedDay() === today;
}

/** Intervalos (entrada/saída) salvos localmente por data. Ao pausar, o trecho é guardado aqui. */
export function getLocalIntervals(date: string): LocalInterval[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY_INTERVALS);
    if (!raw) return [];
    const all = JSON.parse(raw) as Record<string, LocalInterval[]>;
    return all[date] ?? [];
  } catch {
    return [];
  }
}

export function addLocalInterval(date: string, entryAt: number, exitAt: number): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY_INTERVALS);
    const all: Record<string, LocalInterval[]> = raw ? JSON.parse(raw) : {};
    const list = all[date] ?? [];
    list.push({ entryAt, exitAt });
    all[date] = list;
    localStorage.setItem(KEY_INTERVALS, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export function clearLocalIntervals(date: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY_INTERVALS);
    if (!raw) return;
    const all = JSON.parse(raw) as Record<string, LocalInterval[]>;
    delete all[date];
    localStorage.setItem(KEY_INTERVALS, JSON.stringify(all));
  } catch {
    // ignore
  }
}
