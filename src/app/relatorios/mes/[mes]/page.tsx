"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useOpenPunch } from "@/hooks/useOpenPunch";
import { useMonthReport } from "@/hooks/useMonthReport";
import { ReportMonth } from "@/components/ReportMonth";
import { CloseMonthButton } from "@/components/CloseMonthButton";
import { PdfExportButton } from "@/components/PdfExportButton";

export default function MesPage() {
  const params = useParams();
  const router = useRouter();
  const mes = (params.mes as string) || "";
  const validMes = /^\d{4}-\d{2}$/.test(mes) ? mes : null;
  const { user, loading: authLoading } = useAuth();
  const { isOpen } = useOpenPunch(user?.uid);
  const {
    workDays,
    totalMinutes,
    weekSummaries,
    closedAt,
    loading,
    refresh,
  } = useMonthReport(user?.uid, validMes ?? "2000-01");

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

  const monthLabel = new Date(validMes + "-01").toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-semibold text-slate-800">
          Relatório — {monthLabel}
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
          />
        </div>
        {loading ? (
          <p className="text-slate-500">Carregando...</p>
        ) : (
          <ReportMonth
            month={validMes}
            workDays={workDays}
            weekSummaries={weekSummaries}
            totalMinutes={totalMinutes}
            closedAt={closedAt}
          />
        )}
      </main>
    </div>
  );
}
