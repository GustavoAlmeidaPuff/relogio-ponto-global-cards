"use client";

import { useState, useEffect, useMemo } from "react";
import type { Punch } from "@/types";
import type { Timestamp } from "firebase/firestore";
import {
  getTotalWorkedMs,
  msToHHMMSS,
  type LocalInterval,
} from "@/lib/workDayTotal";
import {
  JORNADA_PADRAO_MINUTOS_DIA,
  earningsFromMinutes,
  formatEarningsBRL,
} from "@/hooks/useMonthReport";

function msToReais(ms: number): string {
  const totalMinutes = ms / (1000 * 60);
  const extraMinutes = Math.max(0, totalMinutes - JORNADA_PADRAO_MINUTOS_DIA);
  return formatEarningsBRL(earningsFromMinutes(totalMinutes, extraMinutes));
}

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
  const valorReais = useMemo(() => msToReais(totalMs), [totalMs]);

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
      {totalMs > 0 && (
        <p
          className={`text-sm mt-2 font-medium tabular-nums ${
            openIsToday ? "text-emerald-700" : "text-slate-600"
          }`}
        >
          {valorReais}
          <span className="text-slate-500 font-normal text-xs ml-1">
            (23,08/h · 25/h extra)
          </span>
        </p>
      )}
      {openIsToday && (
        <p className="text-xs text-slate-500 mt-1">Contando...</p>
      )}
    </div>
  );
}
