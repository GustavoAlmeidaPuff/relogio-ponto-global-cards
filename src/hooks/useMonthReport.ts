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

export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

export interface WeekSummary {
  weekLabel: string;
  days: WorkDay[];
  totalMinutes: number;
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
    const totalMinutes = days.reduce((acc, wd) => acc + totalMinutesForDay(wd), 0);
    const start = new Date(key);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const weekLabel = `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`;
    return { weekLabel, days, totalMinutes };
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

  const totalMinutes = workDays.reduce((acc, wd) => acc + totalMinutesForDay(wd), 0);
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
