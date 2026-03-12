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
  notes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WorkDayData {
  userId: string;
  date: string;
  punches: Punch[];
  notes: string;
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
