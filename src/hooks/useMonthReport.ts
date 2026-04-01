"use client";

import { useState, useEffect, useCallback } from "react";
import { getWorkDaysInMonth, getMonthClosure } from "@/lib/firestore";
import type { WorkDay } from "@/types";
import type { Timestamp } from "firebase/firestore";

function minutesBetween(entry: Timestamp, exit: Timestamp | null): number {
  if (!exit) return 0;
  const a = entry.toDate ? entry.toDate() : new Date((entry as unknown as { seconds: number }).seconds * 1000);
  const b = exit.toDate ? exit.toDate() : new Date((exit as unknown as { seconds: number }).seconds * 1000);
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

export function totalMinutesForDay(workDay: WorkDay): number {
  return workDay.punches.reduce((acc, p) => acc + minutesBetween(p.entry, p.exit), 0);
}

/**
 * Minutos trabalhados no dia: maior valor entre soma das batidas fechadas e `totalWorkedMs`
 * (relógio ao vivo / fechamento), para não perder dias só com tempo sincronizado.
 */
export function effectiveWorkedMinutes(workDay: WorkDay): number {
  const fromPunches = totalMinutesForDay(workDay);
  const ms = workDay.totalWorkedMs;
  const fromMs =
    typeof ms === "number" && ms > 0 ? Math.round(ms / 60000) : 0;
  return Math.max(fromPunches, fromMs);
}

/**
 * Jornada prevista por dia (extras e faltas): seg–sex 5h; sábado 9h; domingo 0 (folga —
 * qualquer tempo trabalhado conta como hora extra).
 */
export function expectedMinutesForDate(dateStr: string): number {
  const d = new Date(dateStr + "T12:00:00");
  const dow = d.getDay();
  if (dow === 0) return 0;
  if (dow === 6) return 9 * 60;
  return 5 * 60;
}

/** Texto curto para UI (demonstrativos). */
export const JORNADA_REFERENCIA_RESUMO =
  "Seg–sex: 5h. Sábado: 9h. Domingo: folga (trabalho = 100% extra).";

/** @deprecated use expectedMinutesForDate — mantido para migração de imports. */
export const JORNADA_PADRAO_MINUTOS_DIA = 8 * 60;

/** Valor por hora na jornada normal. */
export const REAIS_POR_HORA_NORMAL = 23.08;
/** Valor por hora extra (acima da jornada prevista no mesmo dia). */
export const REAIS_POR_HORA_EXTRA = 25;

/**
 * Valor estimado: parte “dentro da jornada do dia” a REAIS_POR_HORA_NORMAL e parte “acima” a REAIS_POR_HORA_EXTRA.
 * `extraMinutes` = soma dos minutos acima da jornada prevista por dia.
 * `regular = total - extra` separa alíquotas: cada minuto trabalhado entra em **uma** só (sem pagar o mesmo minuto duas vezes).
 * Errado seria (total × normal) + (extra × extra), pois incluiria os minutos extra também no total à taxa normal.
 */
export function earningsFromMinutes(
  totalMinutes: number,
  extraMinutes: number
): number {
  const regular = totalMinutes - extraMinutes;
  return (
    (regular / 60) * REAIS_POR_HORA_NORMAL +
    (extraMinutes / 60) * REAIS_POR_HORA_EXTRA
  );
}

export function formatEarningsBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Minutos acima da jornada prevista para aquele dia da semana. */
export function extraMinutesForDay(workDay: WorkDay): number {
  const worked = effectiveWorkedMinutes(workDay);
  const expected = expectedMinutesForDate(workDay.date);
  return Math.max(0, worked - expected);
}

/** Minutos abaixo da jornada prevista quando houve trabalho registrado (“falta”). */
export function missingMinutesForDay(workDay: WorkDay): number {
  const worked = effectiveWorkedMinutes(workDay);
  if (worked <= 0) return 0;
  const expected = expectedMinutesForDate(workDay.date);
  return Math.max(0, expected - worked);
}

export function totalExtraMinutes(workDays: WorkDay[]): number {
  return workDays.reduce((acc, wd) => acc + extraMinutesForDay(wd), 0);
}

export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

export interface WeekSummary {
  weekLabel: string;
  days: WorkDay[];
  totalMinutes: number;
  extraMinutes: number;
}

export function groupByWeek(workDays: WorkDay[]): WeekSummary[] {
  const byWeek = new Map<string, WorkDay[]>();
  for (const wd of workDays) {
    const d = new Date(wd.date + "T12:00:00");
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
    const key = start.toISOString().slice(0, 10);
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key)!.push(wd);
  }
  const entries = Array.from(byWeek.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return entries.map(([key, days]) => {
    const totalMinutes = days.reduce(
      (acc, wd) => acc + effectiveWorkedMinutes(wd),
      0
    );
    const extraMinutes = days.reduce((acc, wd) => acc + extraMinutesForDay(wd), 0);
    const start = new Date(key);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const weekLabel = `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`;
    return { weekLabel, days, totalMinutes, extraMinutes };
  });
}

export function useMonthReport(userId: string | undefined, month: string) {
  const [workDays, setWorkDays] = useState<WorkDay[]>([]);
  const [closedAt, setClosedAt] = useState<Timestamp | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setWorkDays([]);
      setClosedAt(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [days, closure] = await Promise.all([
        getWorkDaysInMonth(userId, month),
        getMonthClosure(userId, month),
      ]);
      setWorkDays(days);
      setClosedAt(closure?.closedAt ?? null);
    } catch {
      setWorkDays([]);
      setClosedAt(null);
    } finally {
      setLoading(false);
    }
  }, [userId, month]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalMinutes = workDays.reduce(
    (acc, wd) => acc + effectiveWorkedMinutes(wd),
    0
  );
  const weekSummaries = groupByWeek(workDays);

  return {
    workDays,
    totalMinutes,
    weekSummaries,
    closedAt,
    loading,
    refresh,
  };
}
