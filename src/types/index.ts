import type { Timestamp } from "firebase/firestore";

export interface Punch {
  entry: Timestamp;
  exit: Timestamp | null;
}

export interface WorkDay {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  punches: Punch[];
  /** @deprecated use records */
  notes?: string;
  /** Registros "o que fiz" do dia. */
  records?: string[];
  /** Tempo trabalhado no dia em milissegundos (atualizado a cada ~10s). */
  totalWorkedMs?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WorkDayData {
  userId: string;
  date: string;
  punches: Punch[];
  notes?: string;
  records?: string[];
  totalWorkedMs?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MonthClosure {
  id: string;
  userId: string;
  month: string; // YYYY-MM
  closedAt: Timestamp;
}

export interface MonthClosureData {
  userId: string;
  month: string;
  closedAt: Timestamp;
}
