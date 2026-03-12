"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useLocalPunch } from "@/hooks/useLocalPunch";
import { useWorkDay } from "@/hooks/useWorkDay";
import { useSyncWorkDayTotal } from "@/hooks/useSyncWorkDayTotal";
import { ClockButton } from "@/components/ClockButton";
import { PunchList } from "@/components/PunchList";
import { DayNotes } from "@/components/DayNotes";
import { LiveClock } from "@/components/LiveClock";
import { TodayWorkedTimer } from "@/components/TodayWorkedTimer";
import { getTotalWorkedMs } from "@/lib/workDayTotal";
import { punchOut } from "@/lib/firestore";

function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const today = todayString();
  const { isOpen, openDetails, localIntervals, isDayClosed, registerEntry, registerExit, closeDay, refresh } = useLocalPunch(user?.uid, today);
  const { workDay, loading: workDayLoading, refresh: refreshWorkDay } = useWorkDay(user?.uid, today);

  const [now, setNow] = useState(() => Date.now());
  const openIsToday = isOpen && openDetails?.date === today;
  useEffect(() => {
    if (!openIsToday) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [openIsToday]);

  const totalWorkedMs = getTotalWorkedMs(
    workDay?.punches ?? [],
    localIntervals,
    today,
    isOpen,
    openDetails,
    now
  );
  useSyncWorkDayTotal(user?.uid, today, totalWorkedMs);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  function handleRefresh() {
    refresh();
    refreshWorkDay();
  }

  function handleCloseDay() {
    if (isOpen) {
      registerExit();
      punchOut(user?.uid ?? "").then(() => handleRefresh()).catch(() => {});
    }
    closeDay();
    handleRefresh();
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between flex-wrap gap-2 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-slate-800">Relógio Ponto</h1>
        <nav className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-blue-600 font-medium"
          >
            Hoje
          </Link>
          <Link
            href="/relatorios"
            className="text-slate-600 hover:text-slate-800"
          >
            Relatórios
          </Link>
          <span className="text-slate-500 text-sm">{user.email}</span>
          <button
            type="button"
            onClick={() => signOut().then(() => router.replace("/login"))}
            className="text-slate-500 hover:text-slate-700 text-sm"
          >
            Sair
          </button>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-8">
        <section className="flex flex-col items-center py-6">
          <p className="text-slate-600 mb-2">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <div className="mb-6">
            <LiveClock />
          </div>
          <div className="mb-6">
            <TodayWorkedTimer
              punches={workDay?.punches ?? []}
              localIntervals={localIntervals}
              today={today}
              isOpen={isOpen}
              openDetails={openDetails}
            />
          </div>
          {isDayClosed ? (
            <div className="text-center py-4 px-6 bg-slate-100 rounded-xl">
              <p className="text-slate-700 font-medium">Dia fechado</p>
              <p className="text-slate-500 text-sm mt-1">Amanhã você pode registrar nova entrada.</p>
            </div>
          ) : (
            <>
              <ClockButton
                userId={user.uid}
                isOpen={isOpen}
                today={today}
                openDetails={openDetails}
                onRegisterEntry={registerEntry}
                onRegisterExit={registerExit}
                onRefresh={handleRefresh}
              />
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={handleCloseDay}
                  className="text-sm text-slate-500 hover:text-slate-700 underline"
                >
                  Fechar dia (ao final do expediente)
                </button>
              </div>
            </>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium text-slate-700 mb-2">Registros de hoje</h2>
          {workDayLoading ? (
            <p className="text-slate-500 text-sm">Carregando...</p>
          ) : (
            <PunchList punches={workDay?.punches ?? []} />
          )}
        </section>

        <section>
          <DayNotes
            userId={user.uid}
            date={today}
            initialRecords={workDay?.records}
            initialNotes={workDay?.notes ?? ""}
            dayStarted={(workDay?.punches?.length ?? 0) > 0}
            onUpdate={refreshWorkDay}
          />
        </section>
      </main>
    </div>
  );
}
