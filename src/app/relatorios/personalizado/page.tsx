"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getWorkDaysInRange } from "@/lib/firestore";
import {
  buildRangeBreakdown,
  todayYmdLocal,
  type RangePayBreakdown,
} from "@/lib/fortnightEarnings";
import {
  effectiveWorkedMinutes,
  extraMinutesForDay,
  expectedMinutesForDate,
  formatEarningsBRL,
  formatHours,
} from "@/hooks/useMonthReport";
import type { WorkDay } from "@/types";

function firstDayOfCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function formatDayDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function formatRangeLabel(start: string, end: string): string {
  const f = (s: string) =>
    new Date(s + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  return `${f(start)} → ${f(end)}`;
}

type DayEntry =
  | { type: "worked"; workDay: WorkDay; date: string }
  | { type: "holiday"; workDay: WorkDay; date: string }
  | { type: "absent"; date: string };

function buildEntries(
  workDays: WorkDay[],
  start: string,
  end: string
): DayEntry[] {
  const today = todayYmdLocal();
  const byDate = new Map(workDays.map((w) => [w.date, w]));
  const entries: DayEntry[] = [];
  const seen = new Set<string>();

  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const cur = new Date(sy, sm - 1, sd);
  const last = new Date(ey, em - 1, ed);
  while (cur <= last) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;
    seen.add(dateStr);
    const dow = cur.getDay();
    const isWorkingDay = dow !== 0;
    const wd = byDate.get(dateStr);
    if (wd) {
      const hasTime = effectiveWorkedMinutes(wd) > 0 || wd.holiday === true;
      if (!hasTime && !isWorkingDay) {
        cur.setDate(cur.getDate() + 1);
        continue;
      }
      if (wd.holiday === true) {
        entries.push({ type: "holiday", workDay: wd, date: dateStr });
      } else {
        entries.push({ type: "worked", workDay: wd, date: dateStr });
      }
    } else if (isWorkingDay && dateStr !== today && dateStr <= today) {
      entries.push({ type: "absent", date: dateStr });
    }
    cur.setDate(cur.getDate() + 1);
  }

  for (const wd of workDays) {
    if (!seen.has(wd.date) && wd.date >= start && wd.date <= end) {
      entries.push({
        type: wd.holiday ? "holiday" : "worked",
        workDay: wd,
        date: wd.date,
      });
    }
  }
  entries.sort((a, b) => a.date.localeCompare(b.date));
  return entries;
}

export default function PersonalizadoPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const [startDate, setStartDate] = useState<string>(firstDayOfCurrentMonth);
  const [endDate, setEndDate] = useState<string>(todayYmdLocal);
  const [workDays, setWorkDays] = useState<WorkDay[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  const validRange = startDate && endDate && startDate <= endDate;

  useEffect(() => {
    if (!user?.uid || !validRange) {
      setWorkDays([]);
      return;
    }
    let cancelled = false;
    setLoadingData(true);
    setError(null);
    getWorkDaysInRange(user.uid, startDate, endDate)
      .then((days) => {
        if (!cancelled) setWorkDays(days);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Não foi possível carregar os dados do período.");
          setWorkDays([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingData(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, startDate, endDate, validRange]);

  const breakdown: RangePayBreakdown | null = useMemo(() => {
    if (!validRange) return null;
    return buildRangeBreakdown(workDays, startDate, endDate);
  }, [workDays, startDate, endDate, validRange]);

  const entries = useMemo(
    () => (validRange ? buildEntries(workDays, startDate, endDate) : []),
    [workDays, startDate, endDate, validRange]
  );

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center flex-wrap gap-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-slate-800 truncate">
            Período personalizado
          </h1>
        </div>
        <nav className="flex-1 flex items-center justify-center gap-4 min-w-0">
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-800">
            Hoje
          </Link>
          <Link href="/relatorios" className="text-slate-600 hover:text-slate-800">
            Relatórios
          </Link>
        </nav>
        <div className="flex-1 flex items-center justify-end gap-4 min-w-0">
          <span className="text-slate-500 text-sm truncate max-w-[180px] sm:max-w-none">
            {user.email}
          </span>
          <button
            type="button"
            onClick={() => signOut().then(() => router.replace("/login"))}
            className="text-slate-500 hover:text-slate-700 text-sm flex-shrink-0"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Data inicial
              </span>
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Data final
              </span>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>
          </div>
          {!validRange && (
            <p className="text-red-600 text-sm mt-3">
              A data inicial precisa ser anterior ou igual à final.
            </p>
          )}
        </section>

        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        {loadingData ? (
          <div className="animate-pulse rounded-2xl bg-slate-200/80 h-40" aria-hidden />
        ) : breakdown ? (
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgb(15,23,42,0.06)]">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Resumo do período
              </p>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                {formatRangeLabel(startDate, endDate)}
              </h2>
              <p className="text-slate-500 text-xs mt-1">
                {breakdown.daysWithRecords} dia
                {breakdown.daysWithRecords !== 1 ? "s" : ""} com registro
                {breakdown.ptoCount > 0
                  ? ` · ${breakdown.ptoCount} feriado${breakdown.ptoCount !== 1 ? "s" : ""}`
                  : ""}
              </p>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/80 p-4 border border-slate-100 mb-4">
              <p className="text-xs text-slate-600 mb-1">Horas trabalhadas</p>
              <p className="text-3xl sm:text-4xl font-bold tabular-nums text-slate-900 tracking-tight">
                {formatHours(breakdown.totalMinutes)}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-orange-50/90 border border-orange-100 px-3 py-2.5">
                <p className="text-orange-900/80 text-xs leading-snug">
                  Horas extras (brutas)
                </p>
                <p className="font-semibold text-orange-950 tabular-nums">
                  {formatHours(breakdown.grossExtraMinutes)}
                </p>
              </div>
              <div className="rounded-lg bg-amber-50/90 border border-amber-100 px-3 py-2.5">
                <p className="text-amber-900/80 text-xs leading-snug">
                  Horas faltantes
                </p>
                <p className="font-semibold text-amber-950 tabular-nums">
                  {formatHours(breakdown.missingMinutes)}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50/90 border border-blue-100 px-3 py-2.5">
                <p className="text-blue-900/80 text-xs leading-snug">
                  Horas extras líquidas (pagas)
                </p>
                <p className="font-semibold text-blue-950 tabular-nums">
                  {formatHours(breakdown.formattedExtraMinutes)}
                </p>
                <p className="text-blue-900/70 text-[11px] mt-1 leading-snug">
                  = extras brutas − faltas
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
                <p className="text-slate-600 text-xs">Horas previstas</p>
                <p className="font-semibold text-slate-900 tabular-nums">
                  {formatHours(breakdown.expectedEffectiveMinutes)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mt-3">
              <div className="rounded-lg bg-emerald-50/90 border border-emerald-100 px-3 py-2.5">
                <p className="text-emerald-800/80 text-xs leading-snug">
                  Valor no período (23,08/h · 25/h extra)
                </p>
                <p className="font-semibold text-emerald-900 text-lg tabular-nums">
                  {formatEarningsBRL(breakdown.totalValue)}
                </p>
                <p className="text-emerald-800/70 text-[11px] mt-1 leading-snug">
                  Normal {formatEarningsBRL(breakdown.clockNormalValue)} + extra{" "}
                  {formatEarningsBRL(breakdown.formattedExtraValue)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
                <p className="text-slate-600 text-xs">Desconto por faltas</p>
                <p className="font-semibold text-slate-900 tabular-nums">
                  {formatEarningsBRL(breakdown.discountValue)}
                </p>
                <p className="text-slate-500 text-[11px] mt-1 leading-snug">
                  Já abatido das extras brutas
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {breakdown && (
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Dias do período
              </p>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                Detalhe por dia
              </h2>
            </div>
            {entries.length === 0 ? (
              <p className="text-slate-500 text-sm py-6 text-center">
                Nenhum dia no período.
              </p>
            ) : (
              <ul className="space-y-2">
                {entries.map((entry) => {
                  const mes = entry.date.slice(0, 7);
                  if (entry.type === "absent") {
                    return (
                      <li key={entry.date}>
                        <Link
                          href={`/relatorios/mes/${mes}/dia/${entry.date}`}
                          className="block rounded-xl border border-red-100 bg-red-50/50 p-3 hover:bg-red-50"
                        >
                          <div className="flex justify-between items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-800 capitalize text-sm">
                              {formatDayDate(entry.date)}
                            </span>
                            <span className="text-red-600 font-semibold text-xs px-2 py-0.5 bg-red-100 rounded-full">
                              Falta
                            </span>
                          </div>
                          <p className="text-red-700 text-xs mt-1">
                            {formatHours(expectedMinutesForDate(entry.date))} previstas
                          </p>
                        </Link>
                      </li>
                    );
                  }
                  if (entry.type === "holiday") {
                    const wd = entry.workDay;
                    const worked = effectiveWorkedMinutes(wd);
                    const pto = expectedMinutesForDate(entry.date);
                    return (
                      <li key={entry.date}>
                        <Link
                          href={`/relatorios/mes/${mes}/dia/${entry.date}`}
                          className="block rounded-xl border border-blue-100 bg-blue-50/50 p-3 hover:bg-blue-50"
                        >
                          <div className="flex justify-between items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-800 capitalize text-sm">
                              {formatDayDate(entry.date)}
                            </span>
                            <span className="text-blue-700 font-semibold text-xs px-2 py-0.5 bg-blue-100 rounded-full">
                              Feriado
                            </span>
                          </div>
                          <p className="text-blue-800 text-xs mt-1">
                            PTO: {formatHours(pto)}
                            {worked > 0 ? ` + ${formatHours(worked)} trabalhado` : ""}
                          </p>
                        </Link>
                      </li>
                    );
                  }
                  const wd = entry.workDay;
                  const dayMin = effectiveWorkedMinutes(wd);
                  const dayExtra = extraMinutesForDay(wd);
                  return (
                    <li key={entry.date}>
                      <Link
                        href={`/relatorios/mes/${mes}/dia/${entry.date}`}
                        className="block rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-blue-50/40"
                      >
                        <div className="flex justify-between items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-800 capitalize text-sm">
                            {formatDayDate(entry.date)}
                          </span>
                          <span className="text-slate-700 font-semibold tabular-nums text-sm">
                            {formatHours(dayMin)}
                          </span>
                        </div>
                        {dayExtra > 0 && (
                          <p className="text-orange-700 text-xs mt-1">
                            Extras: {formatHours(dayExtra)}
                          </p>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
