"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useCallback, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useWorkDay } from "@/hooks/useWorkDay";
import {
  useMonthReport,
  totalMinutesForDay,
  formatHours,
  groupByWeek,
} from "@/hooks/useMonthReport";
import { getWorkDaysInMonth, getMonthClosure } from "@/lib/firestore";
import { CloseMonthButton } from "@/components/CloseMonthButton";
import { PdfExportButton } from "@/components/PdfExportButton";

const REAIS_POR_HORA = 23.08;
const MINUTOS_DIA_SEMANA = 5 * 60; // 300 min (seg-sex)
const MINUTOS_SABADO = 9 * 60;     // 540 min

function expectedMinutesForDate(dateStr: string): number {
  const dow = new Date(dateStr + "T12:00:00").getDay();
  if (dow === 6) return MINUTOS_SABADO;
  if (dow === 0) return 0;
  return MINUTOS_DIA_SEMANA;
}

function formatDayDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function minutesToReais(minutes: number): string {
  const horas = minutes / 60;
  const reais = horas * REAIS_POR_HORA;
  return reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatBalance(minutes: number): { text: string; className: string } {
  if (minutes === 0) return { text: "No horário", className: "text-slate-500" };
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const hStr = `${h}h ${String(m).padStart(2, "0")}min`;
  if (minutes > 0) return { text: `+${hStr} extras`, className: "text-emerald-700 font-semibold" };
  return { text: `-${hStr} faltando`, className: "text-red-600 font-semibold" };
}

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
  const [showAddDay, setShowAddDay] = useState(false);
  const [addDayDate, setAddDayDate] = useState("");

  const {
    workDays,
    totalMinutes,
    weekSummaries,
    closedAt,
    loading,
    refresh,
  } = useMonthReport(user?.uid, validMes ?? "2000-01");

  // Diagnóstico de horas: esperado vs trabalhado
  const weeksAnalysis = useMemo(() => {
    if (!validMes) return [];
    const [year, mon] = validMes.split("-").map(Number);
    const firstDay = new Date(year, mon - 1, 1);
    const lastDay = new Date(year, mon, 0);

    const workedByDate = new Map<string, number>();
    for (const wd of workDays) workedByDate.set(wd.date, totalMinutesForDay(wd));

    const weekMap = new Map<string, { dates: string[]; weekLabel: string }>();
    for (const d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dow = d.getDay();
      const ws = new Date(d);
      ws.setDate(d.getDate() - dow + (dow === 0 ? -6 : 1));
      const weekKey = `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, "0")}-${String(ws.getDate()).padStart(2, "0")}`;
      if (!weekMap.has(weekKey)) {
        const we = new Date(ws);
        we.setDate(ws.getDate() + 6);
        const weekLabel = `${ws.getDate()}/${ws.getMonth() + 1} – ${we.getDate()}/${we.getMonth() + 1}`;
        weekMap.set(weekKey, { dates: [], weekLabel });
      }
      weekMap.get(weekKey)!.dates.push(dateStr);
    }

    return Array.from(weekMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, { dates, weekLabel }]) => {
        const pastDates = dates.filter((d) => d <= today);
        const expectedMinutes = pastDates.reduce((acc, d) => acc + expectedMinutesForDate(d), 0);
        const workedMinutes = dates.reduce((acc, d) => acc + (workedByDate.get(d) ?? 0), 0);
        const balance = workedMinutes - expectedMinutes;
        const recordedDays = workDays.filter((wd) => dates.includes(wd.date));
        return { weekLabel, expectedMinutes, workedMinutes, balance, recordedDays };
      });
  }, [validMes, today, workDays]);

  const { expectedMonthMinutes, monthBalance } = useMemo(() => {
    if (!validMes) return { expectedMonthMinutes: 0, monthBalance: 0 };
    const [year, mon] = validMes.split("-").map(Number);
    const firstDay = new Date(year, mon - 1, 1);
    const lastDay = new Date(year, mon, 0);
    let expected = 0;
    for (const d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (dateStr <= today) expected += expectedMinutesForDate(dateStr);
    }
    return { expectedMonthMinutes: expected, monthBalance: totalMinutes - expected };
  }, [validMes, today, totalMinutes]);

  function handleGoToDay() {
    if (!addDayDate) return;
    router.push(`/relatorios/mes/${validMes}/dia/${addDayDate}`);
  }

  const prepareExport = useCallback(async () => {
    if (!user?.uid || !validMes) {
      return { workDays, weekSummaries, totalMinutes, closedAt };
    }
    const [days, closure] = await Promise.all([
      getWorkDaysInMonth(user.uid, validMes),
      getMonthClosure(user.uid, validMes),
    ]);
    const closedAtStamp = closure?.closedAt ?? null;
    const total = days.reduce((acc, wd) => acc + totalMinutesForDay(wd), 0);
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
      <main className="max-w-3xl mx-auto p-4 sm:p-6">
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
          <>
            <section className="mb-6 p-4 bg-white rounded-lg border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 mb-3">
                Resumo do mês
              </h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-3">
                <span className="text-slate-500">Trabalhado</span>
                <span className="font-medium text-slate-800">{formatHours(totalMinutes)}</span>
                <span className="text-slate-500">Esperado</span>
                <span className="font-medium text-slate-800">{formatHours(expectedMonthMinutes)}</span>
                <span className="text-slate-500">Saldo</span>
                <span className={formatBalance(monthBalance).className}>{formatBalance(monthBalance).text}</span>
                {monthBalance > 0 && (
                  <>
                    <span className="text-slate-500">Ganho extra</span>
                    <span className="text-emerald-700 font-semibold">{minutesToReais(monthBalance)}</span>
                  </>
                )}
              </div>
              <p className="text-emerald-700 font-medium text-sm border-t border-slate-100 pt-2">
                Total bruto: {minutesToReais(totalMinutes)}
                <span className="text-slate-400 font-normal ml-1">({workDays.length} dia{workDays.length !== 1 ? "s" : ""} • R$ 23,08/h)</span>
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-3">Semanas</h2>
              <div className="space-y-2">
                {weeksAnalysis.map((week) => {
                  const bal = formatBalance(week.balance);
                  return (
                    <div key={week.weekLabel} className="p-3 bg-white rounded-lg border border-slate-200">
                      <p className="font-medium text-slate-700 mb-2 text-sm">{week.weekLabel}</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <span className="text-slate-500">Trabalhado</span>
                        <span className="font-medium text-slate-800">{formatHours(week.workedMinutes)}</span>
                        <span className="text-slate-500">Esperado</span>
                        <span className="font-medium text-slate-800">{formatHours(week.expectedMinutes)}</span>
                        <span className="text-slate-500">Saldo</span>
                        <span className={bal.className}>{bal.text}</span>
                        {week.balance > 0 && (
                          <>
                            <span className="text-slate-500">Ganho extra</span>
                            <span className="text-emerald-700 font-semibold">{minutesToReais(week.balance)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                <h2 className="text-lg font-semibold text-slate-800">
                  Dias registrados
                </h2>
                <button
                  type="button"
                  onClick={() => { setShowAddDay((v) => !v); setAddDayDate(""); }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {showAddDay ? "Cancelar" : "+ Adicionar dia ausente"}
                </button>
              </div>
              {showAddDay && (
                <div className="mb-3 p-3 bg-white border border-slate-200 rounded-lg flex items-center gap-3 flex-wrap">
                  <input
                    type="date"
                    value={addDayDate}
                    min={`${validMes}-01`}
                    max={`${validMes}-${String(new Date(Number(validMes.split("-")[0]), Number(validMes.split("-")[1]), 0).getDate()).padStart(2, "0")}`}
                    onChange={(e) => setAddDayDate(e.target.value)}
                    className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <button
                    type="button"
                    onClick={handleGoToDay}
                    disabled={!addDayDate}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    Ir para o dia
                  </button>
                </div>
              )}
              <p className="text-slate-600 text-sm mb-3">
                Clique no dia para ver todos os registros (entrada/saída e o que
                você fez).
              </p>
              {workDays.length === 0 ? (
                <p className="text-slate-500 py-4">
                  Nenhum dia registrado neste mês.
                </p>
              ) : (
                <ul className="space-y-2">
                  {workDays.map((wd) => {
                    const worked = totalMinutesForDay(wd);
                    const expected = expectedMinutesForDate(wd.date);
                    const dayBalance = worked - expected;
                    const bal = formatBalance(dayBalance);
                    return (
                      <li key={wd.id}>
                        <Link
                          href={`/relatorios/mes/${validMes}/dia/${wd.date}`}
                          className="block p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-slate-50 transition"
                        >
                          <div className="flex justify-between items-center flex-wrap gap-2 mb-2">
                            <span className="font-medium text-slate-800 capitalize">
                              {formatDayDate(wd.date)}
                            </span>
                            <span className="text-slate-600 font-medium">
                              {formatHours(worked)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm mb-1">
                            <span className="text-slate-500">Esperado</span>
                            <span className="text-slate-700">{formatHours(expected)}</span>
                            <span className="text-slate-500">Saldo</span>
                            <span className={bal.className}>{bal.text}</span>
                            {dayBalance > 0 && (
                              <>
                                <span className="text-slate-500">Ganho extra</span>
                                <span className="text-emerald-700 font-semibold">{minutesToReais(dayBalance)}</span>
                              </>
                            )}
                          </div>
                          <p className="text-emerald-700 text-xs font-medium">
                            Bruto do dia: {minutesToReais(worked)}
                            <span className="text-slate-400 font-normal ml-1">(R$ 23,08/h)</span>
                          </p>
                          <span className="text-slate-400 text-xs mt-1 inline-block">
                            Ver registros →
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
