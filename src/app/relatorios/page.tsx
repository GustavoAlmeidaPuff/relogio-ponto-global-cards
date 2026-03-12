"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function RelatoriosPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Carregando...</div>
      </div>
    );
  }

  const months: string[] = [];
  const d = new Date();
  for (let i = 0; i < 6; i++) {
    const date = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    months.push(`${y}-${String(m).padStart(2, "0")}`);
  }

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
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Por mês</h2>
        <ul className="space-y-2">
          {months.map((mes) => (
            <li key={mes}>
              <Link
                href={`/relatorios/mes/${mes}`}
                className="block p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-slate-50 transition"
              >
                <span className="font-medium text-slate-800">
                  {new Date(mes + "-01").toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="text-slate-500 text-sm ml-2">→ Ver relatório</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-slate-600 text-sm">
          Acesse o relatório do mês para ver totais, fechar o mês e exportar PDF.
        </p>
      </main>
    </div>
  );
}
