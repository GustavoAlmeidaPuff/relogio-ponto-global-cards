"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useCallback } from "react";
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

function formatDayDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export default function MesPage() {
  const params = useParams();
  const router = useRouter();
  const mes = (params.mes as string) || "";
  const validMes = /^\d{4}-\d{2}$/.test(mes) ? mes : null;
  const { user, loading: authLoading } = useAuth();
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
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-semibold text-slate-800">
          {monthLabel}
        </h1>
        <nav className="flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-800">
            Dashboard
          </Link>
          <Link href="/relatorios" className="text-slate-600 hover:text-slate-800">
            Relatórios
          </Link>
        </nav>
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
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-1">
                Resumo do mês
              </h2>
              <p className="text-slate-700">
                Total: <strong>{formatHours(totalMinutes)}</strong> (
                {workDays.length} dia{workDays.length !== 1 ? "s" : ""} com
                registro)
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-800 mb-3">
                Dias registrados
              </h2>
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
                  {workDays.map((wd) => (
                    <li key={wd.id}>
                      <Link
                        href={`/relatorios/mes/${validMes}/dia/${wd.date}`}
                        className="block p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-slate-50 transition"
                      >
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <span className="font-medium text-slate-800 capitalize">
                            {formatDayDate(wd.date)}
                          </span>
                          <span className="text-slate-600 font-medium">
                            {formatHours(totalMinutesForDay(wd))}
                          </span>
                        </div>
                        <span className="text-slate-500 text-sm mt-1 inline-block">
                          Ver registros do dia →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
