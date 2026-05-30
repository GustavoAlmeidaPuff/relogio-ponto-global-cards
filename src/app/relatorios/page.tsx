"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  useMonthReport,
  totalExtraMinutes,
  earningsFromMinutes,
  formatEarningsBRL,
} from "@/hooks/useMonthReport";
import { getMonthsWithWorkRecords } from "@/lib/firestore";

function formatMonthLabel(mes: string): string {
  return new Date(mes + "-01T12:00:00").toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

export default function RelatoriosPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [monthsWithRecords, setMonthsWithRecords] = useState<string[]>([]);
  const [monthsListLoading, setMonthsListLoading] = useState(true);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const {
    workDays: currentMonthDays,
    totalMinutes: currentMonthMinutes,
    loading: monthLoading,
  } = useMonthReport(user?.uid, currentMonth);

  const valorMesReais = formatEarningsBRL(
    earningsFromMinutes(
      currentMonthMinutes,
      totalExtraMinutes(currentMonthDays)
    )
  );

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user?.uid) {
      setMonthsWithRecords([]);
      setMonthsListLoading(false);
      return;
    }
    setMonthsListLoading(true);
    getMonthsWithWorkRecords(user.uid)
      .then((months) => {
        if (!months.includes(currentMonth)) {
          setMonthsWithRecords([currentMonth, ...months]);
        } else {
          setMonthsWithRecords(months);
        }
      })
      .catch(() => setMonthsWithRecords([currentMonth]))
      .finally(() => setMonthsListLoading(false));
  }, [user?.uid]);

  if (loading || !user) {
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
          <h1 className="text-lg font-semibold text-slate-800">Relatórios</h1>
        </div>
        <nav className="flex-1 flex items-center justify-center gap-4 min-w-0">
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-800">
            Hoje
          </Link>
          <Link href="/relatorios" className="text-blue-600 font-medium">
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
          href="/relatorios/personalizado"
          className="block mb-5 p-4 sm:p-5 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 hover:border-blue-400 hover:bg-blue-50 transition"
        >
          <span className="block font-semibold text-blue-800">
            Período personalizado
          </span>
          <p className="text-blue-700/80 text-sm mt-1">
            Escolha uma data inicial e final para ver horas, extras e valor no
            intervalo →
          </p>
        </Link>

        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          Histórico do mês
        </h2>
        <p className="text-slate-600 text-sm mb-4">
          Só aparecem meses em que há registro de ponto. Clique para ver os dias
          e as horas trabalhadas.
        </p>

        {monthsListLoading ? (
          <div className="animate-pulse rounded-xl bg-slate-200/80 h-24" aria-hidden />
        ) : monthsWithRecords.length === 0 ? (
          <p className="text-slate-600 text-sm py-6 text-center border border-dashed border-slate-200 rounded-xl bg-white">
            Nenhum mês com registro de ponto ainda.
          </p>
        ) : (
          <ul className="space-y-3">
            {monthsWithRecords.map((mes) => {
              const isCurrent = mes === currentMonth;
              return (
                <li key={mes}>
                  <Link
                    href={`/relatorios/mes/${mes}`}
                    className={`block p-4 sm:p-5 rounded-xl border transition shadow-sm ${
                      isCurrent
                        ? "bg-white border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50/50"
                        : "bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`block capitalize ${
                        isCurrent
                          ? "text-lg font-semibold text-slate-800"
                          : "font-medium text-slate-800"
                      }`}
                    >
                      {formatMonthLabel(mes)}
                    </span>
                    <p className="text-slate-500 text-sm mt-1">
                      Ver dias registrados e horas trabalhadas →
                    </p>
                    {isCurrent && !monthLoading && (
                      <p className="text-emerald-700 font-medium text-sm mt-2">
                        Total do mês: {valorMesReais}
                        <span className="text-slate-500 font-normal">
                          {" "}
                          (23,08/h · 25/h extra)
                        </span>
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
