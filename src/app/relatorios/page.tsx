"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getMonthClosure } from "@/lib/firestore";

function formatMonthLabel(mes: string): string {
  return new Date(mes + "-01T12:00:00").toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

export default function RelatoriosPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentMonthClosed, setCurrentMonthClosed] = useState(false);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user?.uid) return;
    getMonthClosure(user.uid, currentMonth).then((closure) => {
      setCurrentMonthClosed(!!closure?.closedAt);
    });
  }, [user?.uid, currentMonth]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Carregando...</div>
      </div>
    );
  }

  const otherMonths: string[] = currentMonthClosed
    ? (() => {
        const list: string[] = [];
        for (let i = 1; i <= 5; i++) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          list.push(
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
          );
        }
        return list;
      })()
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-semibold text-slate-800">Relatórios</h1>
        <nav className="flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-800">
            Dashboard
          </Link>
          <Link href="/relatorios" className="text-blue-600 font-medium">
            Relatórios
          </Link>
        </nav>
      </header>
      <main className="max-w-3xl mx-auto p-4 sm:p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          Histórico do mês
        </h2>
        <p className="text-slate-600 text-sm mb-4">
          Clique no mês para ver os dias registrados e as horas trabalhadas.
        </p>

        <section className="mb-6">
          <Link
            href={`/relatorios/mes/${currentMonth}`}
            className="block p-5 bg-white rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50/50 transition shadow-sm"
          >
            <span className="text-lg font-semibold text-slate-800 capitalize">
              {formatMonthLabel(currentMonth)}
            </span>
            <p className="text-slate-500 text-sm mt-1">
              Ver dias registrados e horas trabalhadas →
            </p>
          </Link>
        </section>

        {otherMonths.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-slate-600 mb-2">
              Outros meses
            </h3>
            <ul className="space-y-2">
              {otherMonths.map((mes) => (
                <li key={mes}>
                  <Link
                    href={`/relatorios/mes/${mes}`}
                    className="block p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition"
                  >
                    <span className="font-medium text-slate-800 capitalize">
                      {formatMonthLabel(mes)}
                    </span>
                    <span className="text-slate-500 text-sm ml-2">
                      → Ver dias e relatório
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
