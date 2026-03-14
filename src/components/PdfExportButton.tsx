"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import type { WorkDay } from "@/types";
import type { WeekSummary } from "@/hooks/useMonthReport";
import type { Timestamp } from "firebase/firestore";
import { MonthReportPdf } from "./MonthReportPdf";

export interface MonthReportData {
  workDays: WorkDay[];
  weekSummaries: WeekSummary[];
  totalMinutes: number;
  closedAt: Timestamp | null;
}

interface PdfExportButtonProps {
  month: string;
  monthLabel: string;
  workDays: WorkDay[];
  weekSummaries: WeekSummary[];
  totalMinutes: number;
  closedAt: Timestamp | null;
  /** Busca dados atualizados do servidor antes de gerar o PDF (inclui "o que fiz" de cada dia). */
  onPrepareExport?: () => Promise<MonthReportData>;
}

export function PdfExportButton({
  month,
  monthLabel,
  workDays,
  weekSummaries,
  totalMinutes,
  closedAt,
  onPrepareExport,
}: PdfExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      let data: MonthReportData = {
        workDays,
        weekSummaries,
        totalMinutes,
        closedAt,
      };
      if (onPrepareExport) {
        data = await onPrepareExport();
      }
      const blob = await pdf(
        <MonthReportPdf
          monthLabel={monthLabel}
          workDays={data.workDays}
          weekSummaries={data.weekSummaries}
          totalMinutes={data.totalMinutes}
          closedAt={data.closedAt}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-ponto-${month}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
    >
      {loading ? "Gerando PDF..." : "Exportar PDF"}
    </button>
  );
}
