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
  expectedMinutesForDate,
  formatEarningsBRL,
  marginalHourlyRateForWorkedMs,
  REAIS_POR_HORA_EXTRA,
  REAIS_POR_HORA_NORMAL,
} from "@/hooks/useMonthReport";

interface WorkProgressBarProps {
  totalMs: number;
  today: string;
}

function WorkProgressBar({ totalMs, today }: WorkProgressBarProps) {
  const isSunday = new Date(today + "T12:00:00").getDay() === 0;
  if (isSunday) return null;

  const normalCapMs = expectedMinutesForDate(today) * 60 * 1000;
  const normalWorkedMs = Math.min(totalMs, normalCapMs);
  const extraMs = Math.max(0, totalMs - normalCapMs);

  let bluePercent: number;
  let greenPercent: number;

  if (extraMs === 0) {
    bluePercent = normalCapMs > 0 ? (normalWorkedMs / normalCapMs) * 100 : 0;
    greenPercent = 0;
  } else {
    const total = normalCapMs + extraMs;
    bluePercent = (normalCapMs / total) * 100;
    greenPercent = (extraMs / total) * 100;
  }

  const normalCapLabel = expectedMinutesForDate(today) / 60 + "h";
  const extraHours = (extraMs / (1000 * 60 * 60)).toFixed(1).replace(".", ",");

  return (
    <div className="w-full mt-4 px-1">
      <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-700 ease-out rounded-l-full"
          style={{ width: `${bluePercent}%` }}
        />
        <div
          className="absolute top-0 h-full bg-emerald-500 transition-all duration-700 ease-out"
          style={{ left: `${bluePercent}%`, width: `${greenPercent}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-slate-500 px-0.5">
        {extraMs === 0 ? (
          <>
            <span>0h</span>
            <span className="text-blue-600 font-medium">
              {msToHHMMSS(normalWorkedMs).replace(/^0+:/, "")} / {normalCapLabel}
            </span>
            <span className="text-slate-400">{normalCapLabel} ✓</span>
          </>
        ) : (
          <>
            <span className="text-blue-600 font-medium">{normalCapLabel} normal</span>
            <span className="text-emerald-600 font-medium">{extraHours}h extra</span>
          </>
        )}
      </div>
    </div>
  );
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
  const valorReais = useMemo(
    () => formatEarningsBRL(earningsFromWorkedMs(totalMs, today)),
    [totalMs, today]
  );
  const taxaAgora = useMemo(
    () => marginalHourlyRateForWorkedMs(totalMs, today),
    [totalMs, today]
  );
  const isExtraHour = taxaAgora === REAIS_POR_HORA_EXTRA;
  const taxaAgoraLabel = isExtraHour ? "hora extra" : "jornada normal";
  /** Ao vivo: azul = jornada normal; verde = hora extra (inclui domingo). */
  const liveAccentClass = isExtraHour ? "text-emerald-700" : "text-blue-700";

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
          openIsToday ? liveAccentClass : "text-slate-800"
        }`}
      >
        {msToHHMMSS(totalMs)}
      </p>
      {totalMs > 0 && (
        <>
          <p
            className={`text-sm mt-2 font-medium tabular-nums ${
              openIsToday ? liveAccentClass : "text-slate-600"
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
          <WorkProgressBar totalMs={totalMs} today={today} />
        </>
      )}
      {openIsToday && (
        <p className="text-xs text-slate-500 mt-1">Contando...</p>
      )}
    </div>
  );
}
