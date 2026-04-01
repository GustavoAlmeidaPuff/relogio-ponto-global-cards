"use client";

import type { WorkDay } from "@/types";
import {
  effectiveWorkedMinutes,
  formatHours,
  type WeekSummary,
} from "@/hooks/useMonthReport";
import { PunchList } from "./PunchList";
import { Timestamp } from "firebase/firestore";

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

interface ReportMonthProps {
  month: string;
  workDays: WorkDay[];
  weekSummaries: WeekSummary[];
  totalMinutes: number;
  closedAt: Timestamp | null;
}

export function ReportMonth({
  month,
  workDays,
  weekSummaries,
  totalMinutes,
  closedAt,
}: ReportMonthProps) {
  const monthLabel = new Date(month + "-01").toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const daysWithWorkedTime = workDays.filter(
    (wd) => effectiveWorkedMinutes(wd) > 0
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{monthLabel}</h2>
        {closedAt && (
          <p className="text-slate-600 text-sm mt-1">
            Mês fechado em{" "}
            {closedAt.toDate?.()
              ? closedAt.toDate().toLocaleDateString("pt-BR")
              : "—"}
          </p>
        )}
      </div>

      <section>
        <h3 className="text-lg font-semibold text-slate-700 mb-3">
          Resumo do mês
        </h3>
        <p className="text-slate-700">
          Total: <strong>{formatHours(totalMinutes)}</strong> (
          {daysWithWorkedTime} dia{daysWithWorkedTime !== 1 ? "s" : ""} com tempo
          registrado)
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-700 mb-3">
          Por semana
        </h3>
        <ul className="space-y-2">
          {weekSummaries.map((w, i) => (
            <li
              key={i}
              className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg"
            >
              <span className="text-slate-700">Semana {w.weekLabel}</span>
              <span className="font-medium text-slate-800">
                {formatHours(w.totalMinutes)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-700 mb-3">
          Detalhamento por dia
        </h3>
        <ul className="space-y-4">
          {workDays.map((wd) => (
            <li
              key={wd.id}
              className="p-4 bg-white border border-slate-200 rounded-lg"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-slate-800">
                  {formatDate(wd.date)}
                </span>
                <span className="text-slate-600">
                  {formatHours(effectiveWorkedMinutes(wd))}
                </span>
              </div>
              <PunchList punches={wd.punches} />
              {wd.notes && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-sm font-medium text-slate-600 mb-1">
                    O que fiz
                  </p>
                  <p className="text-slate-700 text-sm whitespace-pre-wrap">
                    {wd.notes}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
