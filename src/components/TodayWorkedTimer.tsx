"use client";

import { useState, useEffect } from "react";
import type { Punch } from "@/types";
import type { Timestamp } from "firebase/firestore";
import {
  getTotalWorkedMs,
  msToHHMMSS,
  type LocalInterval,
} from "@/lib/workDayTotal";

interface TodayWorkedTimerProps {
  punches: Punch[];
  localIntervals: LocalInterval[];
  today: string;
  isOpen: boolean;
  openDetails: { date: string; entry: Timestamp | { toMillis: () => number } } | null;
}

export function TodayWorkedTimer({
  punches,
  localIntervals,
  today,
  isOpen,
  openDetails,
}: TodayWorkedTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  const openIsToday = isOpen && openDetails?.date === today;
  const totalMs = getTotalWorkedMs(
    punches,
    localIntervals,
    today,
    isOpen,
    openDetails,
    now
  );

  useEffect(() => {
    if (!openIsToday) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [openIsToday]);

  return (
    <div className="text-center">
      <p className="text-sm text-slate-500 mb-1">Tempo trabalhado hoje</p>
      <p
        className={`text-2xl sm:text-3xl font-mono tabular-nums ${
          openIsToday ? "text-emerald-700" : "text-slate-800"
        }`}
      >
        {msToHHMMSS(totalMs)}
      </p>
      {openIsToday && (
        <p className="text-xs text-slate-500 mt-1">Contando...</p>
      )}
    </div>
  );
}
