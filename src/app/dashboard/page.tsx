"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useWorkDay } from "@/hooks/useWorkDay";
import { useSyncWorkDayTotal } from "@/hooks/useSyncWorkDayTotal";
import { ClockButton } from "@/components/ClockButton";
import { PunchList } from "@/components/PunchList";
import { DayNotes } from "@/components/DayNotes";
import { LiveClock } from "@/components/LiveClock";
import { TodayWorkedTimer } from "@/components/TodayWorkedTimer";
import { getTotalWorkedMs } from "@/lib/workDayTotal";
import { punchIn, punchOut, closeWorkDay } from "@/lib/firestore";
import type { Timestamp } from "firebase/firestore";

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
  const { workDay, loading: workDayLoading } = useWorkDay(user?.uid, today);

  const { isOpen, openDetails, isDayClosed } = useMemo(() => {
    const punches = workDay?.punches ?? [];
    const last = punches[punches.length - 1];
    const open = !!(
      workDay &&
      punches.length > 0 &&
      last &&
      (last.exit === null || last.exit === undefined)
    );
    return {
      isOpen: open && workDay!.date === today,
      openDetails:
        open && last && workDay!.date === today
          ? { date: workDay!.date, entry: last.entry as Timestamp }
          : null,
      isDayClosed: !!workDay?.closedAt,
    };
  }, [workDay, today]);

  const [now, setNow] = useState(() => Date.now());
  const openIsToday = isOpen && openDetails?.date === today;
  useEffect(() => {
    if (!openIsToday) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [openIsToday]);

  const totalWorkedMs = getTotalWorkedMs(
    workDay?.punches ?? [],
    [],
    today,
    isOpen,
    openDetails,
    now
  );
  useSyncWorkDayTotal(user?.uid, today, totalWorkedMs);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  async function handleRegisterEntry() {
    if (!user) return;
    await punchIn(user.uid, today);
  }

  async function handleRegisterExit() {
    if (!user) return;
    await punchOut(user.uid);
  }

  async function handleCloseDay() {
    if (!user) return;
    if (isOpen) await punchOut(user.uid);
    await closeWorkDay(user.uid, today);
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
              localIntervals={[]}
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
                isOpen={isOpen}
                openDetails={openDetails}
                onRegisterEntry={handleRegisterEntry}
                onRegisterExit={handleRegisterExit}
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
          />
        </section>
      </main>
    </div>
  );
}
