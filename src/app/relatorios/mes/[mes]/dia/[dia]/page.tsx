"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getWorkDay } from "@/lib/firestore";
import { totalMinutesForDay, formatHours } from "@/hooks/useMonthReport";
import type { WorkDay } from "@/types";
import { PunchList } from "@/components/PunchList";

function formatDayLabel(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function DiaPage() {
  const params = useParams();
  const router = useRouter();
  const mes = (params.mes as string) || "";
  const dia = (params.dia as string) || "";
  const validMes = /^\d{4}-\d{2}$/.test(mes) ? mes : null;
  const validDia = /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : null;
  const { user, loading: authLoading, signOut } = useAuth();
  const [workDay, setWorkDay] = useState<WorkDay | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.uid || !validDia) {
      setWorkDay(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const wd = await getWorkDay(user.uid, validDia);
      setWorkDay(wd);
    } catch {
      setWorkDay(null);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, validDia]);

  useEffect(() => {
    load();
  }, [load]);

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

  if (!validMes || !validDia) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Data inválida.</p>
          <Link href="/relatorios" className="text-blue-600 hover:underline">
            Voltar aos relatórios
          </Link>
        </div>
      </div>
    );
  }

  const monthLabel = new Date(validMes + "-01").toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Carregando...</p>
      </div>
    );
  }

  if (!workDay) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center flex-wrap gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-slate-800">Dia</h1>
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
          <p className="text-slate-600 mb-4">
            Nenhum registro encontrado para este dia.
          </p>
          <Link
            href={`/relatorios/mes/${validMes}`}
            className="text-blue-600 hover:underline"
          >
            ← Voltar para {monthLabel}
          </Link>
        </main>
      </div>
    );
  }

  const records = workDay.records && workDay.records.length > 0
    ? workDay.records
    : workDay.notes
      ? [workDay.notes]
      : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center flex-wrap gap-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-slate-800 capitalize truncate">
            {formatDayLabel(workDay.date)}
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
        <Link
          href={`/relatorios/mes/${validMes}`}
          className="inline-block text-slate-600 hover:text-slate-800 text-sm mb-4"
        >
          ← Voltar para {monthLabel}
        </Link>

        <section className="mb-6">
          <p className="text-slate-700">
            Total do dia: <strong>{formatHours(totalMinutesForDay(workDay))}</strong>
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">
            Entrada e saída
          </h2>
          <PunchList punches={workDay.punches} />
        </section>

        {records.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">
              O que fiz
            </h2>
            <ul className="space-y-2">
              {records.map((text, i) => (
                <li
                  key={i}
                  className="p-3 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm whitespace-pre-wrap"
                >
                  {text}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
