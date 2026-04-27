"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useCallback, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useWorkDay } from "@/hooks/useWorkDay";
import {
  useMonthReport,
  effectiveWorkedMinutes,
  formatHours,
  groupByWeek,
  extraMinutesForDay,
  totalExtraMinutes,
  earningsFromMinutes,
  formatEarningsBRL,
  expectedMinutesForDate,
} from "@/hooks/useMonthReport";
import { getWorkDaysInMonth, getMonthClosure } from "@/lib/firestore";
import { CloseMonthButton } from "@/components/CloseMonthButton";
import { PdfExportButton } from "@/components/PdfExportButton";
import { FortnightPaySection } from "@/components/FortnightPaySection";
import { buildMonthFortnightBreakdowns, asOfDateForReportMonth } from "@/lib/fortnightEarnings";
import type { WorkDay } from "@/types";

function formatDayDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

type DayEntry =
  | { type: "worked"; workDay: WorkDay; date: string }
  | { type: "holiday"; workDay: WorkDay; date: string }
  | { type: "absent"; date: string };

function buildAllDayEntries(workDays: WorkDay[], validMes: string): DayEntry[] {
  const asOf = asOfDateForReportMonth(validMes);
  const [y, m] = validMes.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();

  const byDate = new Map(workDays.map((wd) => [wd.date, wd]));
  const entries: DayEntry[] = [];
  const seenDates = new Set<string>();

  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (dateStr > asOf) continue;
    const dow = new Date(dateStr + "T12:00:00").getDay();
    const isWorkingDay = dow !== 0; // não domingo
    const wd = byDate.get(dateStr);
    seenDates.add(dateStr);

    if (wd) {
      const hasTime = effectiveWorkedMinutes(wd) > 0 || wd.holiday === true;
      // Domingo sem tempo real não precisa aparecer
      if (!hasTime && !isWorkingDay) continue;
      if (wd.holiday === true) {
        entries.push({ type: "holiday", workDay: wd, date: dateStr });
      } else {
        entries.push({ type: "worked", workDay: wd, date: dateStr });
      }
    } else if (isWorkingDay) {
      entries.push({ type: "absent", date: dateStr });
    }
  }

  // Inclui workDays fora do asOf (ex: domingo trabalhado após asOf)
  for (const wd of workDays) {
    if (!seenDates.has(wd.date)) {
      entries.push({ type: wd.holiday ? "holiday" : "worked", workDay: wd, date: wd.date });
    }
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));
  return entries;
}

function minutesToReais(totalMinutes: number, extraMinutes: number): string {
  return formatEarningsBRL(
    earningsFromMinutes(totalMinutes, extraMinutes)
  );
}

type DashTab = "mes" | "semanas" | "dias";

export default function MesPage() {
  const params = useParams();
  const router = useRouter();
  const mes = (params.mes as string) || "";
  const validMes = /^\d{4}-\d{2}$/.test(mes) ? mes : null;
  const { user, loading: authLoading, signOut } = useAuth();
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const { workDay } = useWorkDay(user?.uid, today);
  const isOpen = useMemo(() => {
    const punches = workDay?.punches ?? [];
    const last = punches[punches.length - 1];
    return !!(
      workDay &&
      punches.length > 0 &&
      last &&
      (last.exit === null || last.exit === undefined) &&
      workDay.date === today
    );
  }, [workDay, today]);
  const {
    workDays,
    totalMinutes,
    weekSummaries,
    closedAt,
    loading,
    refresh,
  } = useMonthReport(user?.uid, validMes ?? "2000-01");
  const [dashTab, setDashTab] = useState<DashTab>("mes");

  const fortnightBreakdowns = useMemo(
    () => buildMonthFortnightBreakdowns(workDays, validMes ?? "2000-01"),
    [workDays, validMes]
  );
  const totalExtraMin = useMemo(
    () => totalExtraMinutes(workDays),
    [workDays]
  );
  const monthTotalPay = useMemo(
    () =>
      fortnightBreakdowns[0].totalValue + fortnightBreakdowns[1].totalValue,
    [fortnightBreakdowns]
  );
  /** Mesma base da quinzena: extras brutas e faltas só entram aqui na visão do mês (soma das quinzenas). */
  const monthExtrasEFaltas = useMemo(() => {
    const [a, b] = fortnightBreakdowns;
    return {
      grossExtraMinutes: a.grossExtraMinutes + b.grossExtraMinutes,
      missingMinutes: a.missingMinutes + b.missingMinutes,
    };
  }, [fortnightBreakdowns]);
  const daysWithWorkedTime = useMemo(
    () => workDays.filter((wd) => effectiveWorkedMinutes(wd) > 0 || wd.holiday).length,
    [workDays]
  );

  const allDayEntries = useMemo(
    () => buildAllDayEntries(workDays, validMes ?? "2000-01"),
    [workDays, validMes]
  );

  const prepareExport = useCallback(async () => {
    if (!user?.uid || !validMes) {
      return { workDays, weekSummaries, totalMinutes, closedAt };
    }
    const [days, closure] = await Promise.all([
      getWorkDaysInMonth(user.uid, validMes),
      getMonthClosure(user.uid, validMes),
    ]);
    const closedAtStamp = closure?.closedAt ?? null;
    const total = days.reduce((acc, wd) => acc + effectiveWorkedMinutes(wd), 0);
    const weeks = groupByWeek(days);
    return {
      workDays: days,
      weekSummaries: weeks,
      totalMinutes: total,
      closedAt: closedAtStamp,
    };
  }, [user?.uid, validMes, workDays, weekSummaries, totalMinutes, closedAt]);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Carregando...</div>
      </div>
    );
  }

  if (!validMes) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Mês inválido.</p>
          <Link href="/relatorios" className="text-blue-600 hover:underline">
            Voltar aos relatórios
          </Link>
        </div>
      </div>
    );
  }

  const monthLabel = new Date(validMes + "-01T12:00:00").toLocaleDateString(
    "pt-BR",
    { month: "long", year: "numeric" }
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center flex-wrap gap-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-slate-800 truncate">
            {monthLabel}
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
          <span className="text-slate-500 text-sm truncate max-w-[180px] sm:max-w-none">{user.email}</span>
          <button
            type="button"
            onClick={() => signOut().then(() => router.replace("/login"))}
            className="text-slate-500 hover:text-slate-700 text-sm flex-shrink-0"
          >
            Sair
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="flex flex-wrap gap-3 mb-6">
          <CloseMonthButton
            userId={user.uid}
            month={validMes}
            isOpenPunch={isOpen ?? false}
            onClosed={refresh}
          />
          <PdfExportButton
            month={validMes}
            monthLabel={monthLabel}
            workDays={workDays}
            weekSummaries={weekSummaries}
            totalMinutes={totalMinutes}
            closedAt={closedAt}
            onPrepareExport={prepareExport}
          />
        </div>

        {loading ? (
          <p className="text-slate-500">Carregando...</p>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              role="tablist"
              aria-label="Tipo de visão do relatório"
            >
              <button
                type="button"
                role="tab"
                id="tab-mes"
                aria-selected={dashTab === "mes"}
                aria-controls="panel-mes"
                onClick={() => setDashTab("mes")}
                className={`text-left rounded-2xl border p-4 sm:p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] transition-colors min-h-[120px] flex flex-col justify-between ${
                  dashTab === "mes"
                    ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-400/40"
                    : "border-slate-200/90 bg-white hover:bg-slate-50"
                }`}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Mês
                </span>
                <span className="font-bold text-slate-900 capitalize text-base sm:text-lg leading-tight mt-1">
                  {monthLabel}
                </span>
                <span className="text-slate-600 text-sm mt-2 tabular-nums break-words">
                  {formatHours(totalMinutes)} ·{" "}
                  {minutesToReais(totalMinutes, totalExtraMin)}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                id="tab-semanas"
                aria-selected={dashTab === "semanas"}
                aria-controls="panel-semanas"
                onClick={() => setDashTab("semanas")}
                className={`text-left rounded-2xl border p-4 sm:p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] transition-colors min-h-[120px] flex flex-col justify-between ${
                  dashTab === "semanas"
                    ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-400/40"
                    : "border-slate-200/90 bg-white hover:bg-slate-50"
                }`}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Semanas
                </span>
                <span className="font-bold text-slate-900 text-base sm:text-lg mt-1">
                  Por semana
                </span>
                <span className="text-slate-600 text-sm mt-2">
                  {weekSummaries.length} semana
                  {weekSummaries.length !== 1 ? "s" : ""} · toque para ver
                </span>
              </button>

              <button
                type="button"
                role="tab"
                id="tab-dias"
                aria-selected={dashTab === "dias"}
                aria-controls="panel-dias"
                onClick={() => setDashTab("dias")}
                className={`text-left rounded-2xl border p-4 sm:p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] transition-colors min-h-[120px] flex flex-col justify-between ${
                  dashTab === "dias"
                    ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-400/40"
                    : "border-slate-200/90 bg-white hover:bg-slate-50"
                }`}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Dias
                </span>
                <span className="font-bold text-slate-900 text-base sm:text-lg mt-1">
                  Por dia
                </span>
                <span className="text-slate-600 text-sm mt-2">
                  {daysWithWorkedTime} dia
                  {daysWithWorkedTime !== 1 ? "s" : ""} · horas e valores
                </span>
              </button>
            </div>

            {dashTab === "mes" && (
              <div
                id="panel-mes"
                role="tabpanel"
                aria-labelledby="tab-mes"
                className="space-y-6 sm:space-y-8"
              >
                <FortnightPaySection
                  fortnights={fortnightBreakdowns}
                  monthTotal={monthTotalPay}
                />

                <section
                  className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgb(15,23,42,0.08)]"
                  aria-labelledby="dash-mes-heading"
                >
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Visão do mês
                      </p>
                      <h2
                        id="dash-mes-heading"
                        className="text-xl font-bold text-slate-900 capitalize mt-1"
                      >
                        {monthLabel}
                      </h2>
                    </div>
                    {closedAt && (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        Fechado
                      </span>
                    )}
                  </div>
                  {closedAt && (
                    <p className="text-slate-600 text-sm mb-4">
                      Fechamento:{" "}
                      {closedAt.toDate?.()
                        ? closedAt.toDate().toLocaleDateString("pt-BR")
                        : "—"}
                    </p>
                  )}
                  <div className="space-y-4">
                    <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/80 p-4 border border-slate-100">
                      <p className="text-xs text-slate-600 mb-1">Horas no mês</p>
                      <p className="text-3xl sm:text-4xl font-bold tabular-nums text-slate-900 tracking-tight">
                        {formatHours(totalMinutes)}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-orange-50/90 border border-orange-100 px-3 py-2.5">
                        <p className="text-orange-900/80 text-xs leading-snug">
                          Horas extras (brutas)
                        </p>
                        <p className="font-semibold text-orange-950 tabular-nums">
                          {formatHours(monthExtrasEFaltas.grossExtraMinutes)}
                        </p>
                        <p className="text-orange-800/70 text-[11px] mt-1 leading-snug">
                          Trabalhado efetivo + PTO − horas esperadas (referência − dia sem ponto),
                          somando as quinzenas.
                        </p>
                      </div>
                      <div className="rounded-lg bg-amber-50/90 border border-amber-100 px-3 py-2.5">
                        <p className="text-amber-900/80 text-xs leading-snug">
                          Horas faltantes
                        </p>
                        <p className="font-semibold text-amber-950 tabular-nums">
                          {formatHours(monthExtrasEFaltas.missingMinutes)}
                        </p>
                        <p className="text-amber-900/70 text-[11px] mt-1 leading-snug">
                          Dia útil sem ponto ou tempo abaixo da jornada prevista; abatem das extras
                          brutas no salário.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-emerald-50/90 border border-emerald-100 px-3 py-2.5">
                        <p className="text-emerald-800/80 text-xs leading-snug">
                          Valor (23,08/h · 25/h extra; 5h seg–sex · 9h sáb. · dom. extra)
                        </p>
                        <p className="font-semibold text-emerald-900 tabular-nums">
                          {minutesToReais(totalMinutes, totalExtraMin)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
                        <p className="text-slate-600 text-xs">Dias com tempo registrado</p>
                        <p className="font-semibold text-slate-900 tabular-nums">
                          {daysWithWorkedTime}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {dashTab === "semanas" && (
              <section
                id="panel-semanas"
                role="tabpanel"
                aria-labelledby="tab-semanas"
                className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgb(15,23,42,0.08)] min-w-0"
              >
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Por semana
                  </p>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">
                    Distribuição semanal
                  </h2>
                </div>
                {weekSummaries.length === 0 ? (
                  <p className="text-slate-500 text-sm py-8 text-center">
                    Nenhuma semana com registros neste mês.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {weekSummaries.map((w, i) => {
                      const pct =
                        totalMinutes > 0
                          ? Math.round((w.totalMinutes / totalMinutes) * 100)
                          : 0;
                      const weekExtra = w.days.reduce(
                        (acc, d) => acc + extraMinutesForDay(d),
                        0
                      );
                      return (
                        <li
                          key={`${w.weekLabel}-${i}`}
                          className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 sm:p-4"
                        >
                          <div className="flex justify-between items-center gap-2 mb-2 flex-wrap">
                            <span className="text-slate-800 font-medium text-sm sm:text-base">
                              Semana {w.weekLabel}
                            </span>
                            <span className="text-slate-700 font-semibold tabular-nums text-sm shrink-0">
                              {formatHours(w.totalMinutes)}
                            </span>
                          </div>
                          <p className="text-emerald-800 text-xs sm:text-sm font-medium mb-2">
                            {minutesToReais(w.totalMinutes, weekExtra)}
                          </p>
                          <div
                            className="h-1.5 rounded-full bg-slate-200 overflow-hidden"
                            role="presentation"
                          >
                            <div
                              className="h-full rounded-full bg-blue-500/90 transition-[width]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-slate-500 text-xs mt-1.5">
                            {pct}% do mês · {w.days.length} dia
                            {w.days.length !== 1 ? "s" : ""}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}

            {dashTab === "dias" && (
              <section
                id="panel-dias"
                role="tabpanel"
                aria-labelledby="tab-dias"
                className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgb(15,23,42,0.08)] min-w-0"
              >
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Por dia
                  </p>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">
                    Todos os dias
                  </h2>
                  <p className="text-slate-600 text-sm mt-2">
                    Horas trabalhadas e valor por dia (23,08/h · 25/h extra; extras acima
                    de 5h, 9h no sábado, ou qualquer hora no domingo).
                    Toque em um dia para ver entradas, saídas e anotações.
                  </p>
                </div>
                {allDayEntries.length === 0 ? (
                  <p className="text-slate-500 text-sm py-8 text-center">
                    Nenhum dia registrado neste mês.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {allDayEntries.map((entry) => {
                      if (entry.type === "absent") {
                        return (
                          <li key={entry.date}>
                            <Link
                              href={`/relatorios/mes/${validMes}/dia/${entry.date}`}
                              className="block rounded-xl border border-red-100 bg-red-50/50 p-3 sm:p-4 hover:border-red-200 hover:bg-red-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
                            >
                              <div className="flex justify-between items-start gap-2 flex-wrap">
                                <span className="font-medium text-slate-800 capitalize text-sm sm:text-base">
                                  {formatDayDate(entry.date)}
                                </span>
                                <span className="text-red-600 font-semibold text-xs px-2 py-0.5 bg-red-100 rounded-full shrink-0">
                                  Falta
                                </span>
                              </div>
                              <p className="text-red-700 text-xs mt-1.5">
                                {formatHours(expectedMinutesForDate(entry.date))} previstas — marcar como feriado →
                              </p>
                            </Link>
                          </li>
                        );
                      }
                      if (entry.type === "holiday") {
                        const wd = entry.workDay;
                        const worked = effectiveWorkedMinutes(wd);
                        const ptoMin = expectedMinutesForDate(entry.date);
                        return (
                          <li key={entry.date}>
                            <Link
                              href={`/relatorios/mes/${validMes}/dia/${entry.date}`}
                              className="block rounded-xl border border-blue-100 bg-blue-50/50 p-3 sm:p-4 hover:border-blue-200 hover:bg-blue-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                            >
                              <div className="flex justify-between items-start gap-2 flex-wrap">
                                <span className="font-medium text-slate-800 capitalize text-sm sm:text-base">
                                  {formatDayDate(entry.date)}
                                </span>
                                <span className="text-blue-700 font-semibold text-xs px-2 py-0.5 bg-blue-100 rounded-full shrink-0">
                                  Feriado
                                </span>
                              </div>
                              <p className="text-blue-800 text-xs sm:text-sm font-medium mt-1.5">
                                PTO: {formatHours(ptoMin)}
                                {worked > 0 ? ` + ${formatHours(worked)} trabalhado` : ""}
                              </p>
                              <span className="text-blue-600 text-xs sm:text-sm font-medium mt-2 inline-block">
                                Abrir dia →
                              </span>
                            </Link>
                          </li>
                        );
                      }
                      // worked
                      const wd = entry.workDay;
                      const dayMin = effectiveWorkedMinutes(wd);
                      const dayExtra = extraMinutesForDay(wd);
                      return (
                        <li key={entry.date}>
                          <Link
                            href={`/relatorios/mes/${validMes}/dia/${entry.date}`}
                            className="block rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:p-4 hover:border-blue-200 hover:bg-blue-50/40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                          >
                            <div className="flex justify-between items-start gap-2 flex-wrap">
                              <span className="font-medium text-slate-800 capitalize text-sm sm:text-base">
                                {formatDayDate(entry.date)}
                              </span>
                              <span className="text-slate-700 font-semibold tabular-nums text-sm shrink-0">
                                {formatHours(dayMin)}
                              </span>
                            </div>
                            <p className="text-emerald-800 text-xs sm:text-sm font-medium mt-1.5">
                              {minutesToReais(dayMin, dayExtra)}
                            </p>
                            <span className="text-blue-600 text-xs sm:text-sm font-medium mt-2 inline-block">
                              Abrir dia →
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
