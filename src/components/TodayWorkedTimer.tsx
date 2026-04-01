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
  earningsFromWorkedMs,
  formatEarningsBRL,
  marginalHourlyRateForWorkedMs,
  REAIS_POR_HORA_EXTRA,
  REAIS_POR_HORA_NORMAL,
} from "@/hooks/useMonthReport";

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
  const valorReais = useMemo(
    () => formatEarningsBRL(earningsFromWorkedMs(totalMs, today)),
    [totalMs, today]
  );
  const taxaAgora = useMemo(
    () => marginalHourlyRateForWorkedMs(totalMs, today),
    [totalMs, today]
  );
  const taxaAgoraLabel =
    taxaAgora === REAIS_POR_HORA_EXTRA ? "hora extra" : "jornada normal";

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
          <span className="block text-sm sm:text-base font-semibold tabular-nums mt-1.5">
            Agora: {formatEarningsBRL(taxaAgora)}/h
            <span className="text-slate-500 font-normal text-xs sm:text-sm">
              {" "}
              ({taxaAgoraLabel})
            </span>
          </span>
          <span className="text-slate-500 font-normal text-xs mt-1 block max-w-[min(100%,22rem)] mx-auto leading-snug px-1">
            {REAIS_POR_HORA_NORMAL.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            /h até 5h (seg–sex) ou 9h (sáb); depois{" "}
            {REAIS_POR_HORA_EXTRA.toLocaleString("pt-BR")}/h. Domingo:{" "}
            {REAIS_POR_HORA_EXTRA.toLocaleString("pt-BR")}/h o dia todo.
          </span>
        </p>
      )}
      {openIsToday && (
        <p className="text-xs text-slate-500 mt-1">Contando...</p>
      )}
    </div>
  );
}
