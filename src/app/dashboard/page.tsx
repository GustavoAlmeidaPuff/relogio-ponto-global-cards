"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useOpenPunch } from "@/hooks/useOpenPunch";
import { useWorkDay } from "@/hooks/useWorkDay";
import { ClockButton } from "@/components/ClockButton";
import { PunchList } from "@/components/PunchList";
import { DayNotes } from "@/components/DayNotes";
import { LiveClock } from "@/components/LiveClock";

function todayString(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const today = todayString();
  const { isOpen, refresh } = useOpenPunch(user?.uid);
  const { workDay, loading: workDayLoading, refresh: refreshWorkDay } = useWorkDay(user?.uid, today);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  function handlePunchSuccess() {
    refresh();
    refreshWorkDay();
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
          <ClockButton
            userId={user.uid}
            isOpen={isOpen ?? false}
            today={today}
            onSuccess={handlePunchSuccess}
          />
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
            initialNotes={workDay?.notes ?? ""}
            onUpdate={refreshWorkDay}
          />
        </section>
      </main>
    </div>
  );
}
