import type { Punch } from "@/types";
import type { Timestamp } from "firebase/firestore";

export interface LocalInterval {
  entryAt: number;
  exitAt: number;
}

function timestampToMs(ts: Timestamp | { toMillis: () => number }): number {
  if (typeof (ts as { toMillis?: () => number }).toMillis === "function") {
    return (ts as { toMillis: () => number }).toMillis();
  }
  return (ts as unknown as { seconds: number }).seconds * 1000;
}

export function totalMsFromPunches(punches: Punch[]): number {
  let total = 0;
  for (const p of punches) {
    if (p.exit) {
      total += timestampToMs(p.exit) - timestampToMs(p.entry);
    }
  }
  return total;
}

export function totalMsFromLocalIntervals(intervals: LocalInterval[]): number {
  let total = 0;
  for (const { entryAt, exitAt } of intervals) {
    total += exitAt - entryAt;
  }
  return total;
}

/** Total trabalhado no dia: punches + intervalos locais + trecho em aberto (se hoje). */
export function getTotalWorkedMs(
  punches: Punch[],
  localIntervals: LocalInterval[],
  today: string,
  isOpen: boolean,
  openDetails: { date: string; entry: Timestamp | { toMillis: () => number } } | null,
  nowMs: number = Date.now()
): number {
  const baseMs = totalMsFromPunches(punches);
  const localMs = totalMsFromLocalIntervals(localIntervals);
  const openIsToday = isOpen && openDetails?.date === today;
  const openElapsedMs = openIsToday && openDetails
    ? nowMs - timestampToMs(openDetails.entry)
    : 0;
  return baseMs + localMs + openElapsedMs;
}

export function msToHHMMSS(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}
