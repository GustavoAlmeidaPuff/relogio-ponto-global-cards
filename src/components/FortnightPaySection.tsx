"use client";

import type { FortnightPayBreakdown } from "@/lib/fortnightEarnings";
import {
  formatEarningsBRL,
  formatHours,
  JORNADA_REFERENCIA_RESUMO,
  REAIS_POR_HORA_EXTRA,
  REAIS_POR_HORA_NORMAL,
} from "@/hooks/useMonthReport";

function FortnightCard({ b, title }: { b: FortnightPayBreakdown; title: string }) {
  const hasLiquidas = b.formattedExtraMinutes > 0;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <span className="text-xs text-slate-500 capitalize">{b.labelRange}</span>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        {b.daysWithRecords === 0
          ? "Nenhum dia com registro neste período."
          : `${b.daysWithRecords} dia${b.daysWithRecords !== 1 ? "s" : ""} com ponto`}
      </p>

      {b.daysWithRecords === 0 ? (
        <p className="text-slate-600 text-sm tabular-nums">
          Total: {formatEarningsBRL(0)}
        </p>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-600 space-y-1">
            <p className="tabular-nums">
              <span className="text-slate-500">Tempo total trabalhado: </span>
              <span className="font-medium text-slate-800">{formatHours(b.totalMinutes)}</span>
            </p>
            {b.ptoMinutes > 0 && (
              <p className="tabular-nums">
                <span className="text-slate-500">Feriados PTO ({b.ptoCount} dia{b.ptoCount !== 1 ? "s" : ""}): </span>
                <span className="font-medium text-blue-700">+{formatHours(b.ptoMinutes)}</span>
              </p>
            )}
            <p className="tabular-nums">
              <span className="text-slate-500">Referência calendário (seg–sáb): </span>
              <span className="font-medium text-slate-800">{formatHours(b.referenceNormalMinutes)}</span>
            </p>
            <p className="tabular-nums">
              <span className="text-slate-500">Horas esperadas (ref. − dia sem ponto): </span>
              <span className="font-medium text-slate-800">{formatHours(b.expectedEffectiveMinutes)}</span>
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 space-y-1.5">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              1. Ganhos — horas normais
            </p>
            <p className="text-slate-600 text-xs leading-relaxed">
              {JORNADA_REFERENCIA_RESUMO} Base = total efetivo − extras brutas (
              {formatHours(b.effectiveTotalMinutes)} − {formatHours(b.grossExtraMinutes)}).
            </p>
            <p className="text-slate-800 tabular-nums">
              {formatHours(b.clockNormalMinutes)} × {formatEarningsBRL(REAIS_POR_HORA_NORMAL)}/h
              = <span className="font-semibold">{formatEarningsBRL(b.clockNormalValue)}</span>
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 space-y-1.5">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              2. Ganhos — horas extras (líquidas)
            </p>
            <p className="text-slate-600 text-xs leading-relaxed">
              Extras brutas − faltas do período (detalhe em &quot;Visão do mês&quot;) ×{" "}
              {formatEarningsBRL(REAIS_POR_HORA_EXTRA)}/h.
            </p>
            {hasLiquidas ? (
              <p className="text-slate-800 tabular-nums">
                {formatHours(b.formattedExtraMinutes)} × {formatEarningsBRL(REAIS_POR_HORA_EXTRA)}/h
                = <span className="font-semibold">{formatEarningsBRL(b.formattedExtraValue)}</span>
              </p>
            ) : (
              <p className="text-slate-500 text-xs tabular-nums">R$ 0,00</p>
            )}
          </div>

          <div className="rounded-xl bg-emerald-50/90 border border-emerald-200 px-3 py-3">
            <p className="text-xs font-semibold text-emerald-900/80 uppercase tracking-wide mb-2">
              3. Total da quinzena
            </p>
            <p className="text-xs text-emerald-900/90 tabular-nums leading-relaxed break-words">
              {formatEarningsBRL(b.clockNormalValue)}
              {hasLiquidas ? ` + ${formatEarningsBRL(b.formattedExtraValue)}` : ""} =
            </p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-950 tabular-nums mt-1">
              {formatEarningsBRL(b.totalValue)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface FortnightPaySectionProps {
  fortnights: [FortnightPayBreakdown, FortnightPayBreakdown];
  monthTotal: number;
}

export function FortnightPaySection({
  fortnights,
  monthTotal,
}: FortnightPaySectionProps) {
  const [first, second] = fortnights;

  return (
    <section
      className="mt-6 sm:mt-8"
      aria-labelledby="fortnight-pay-heading"
    >
      <div className="mb-4">
        <h2
          id="fortnight-pay-heading"
          className="text-lg font-bold text-slate-900"
        >
          Quanto receber — por quinzena
        </h2>
        <p className="text-slate-600 text-sm mt-1 max-w-3xl">
          {JORNADA_REFERENCIA_RESUMO} Totais de extras brutas e horas faltantes estão na seção
          &quot;Visão do mês&quot;; abaixo segue o valor por quinzena já com saldo líquido de extras.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <FortnightCard b={first} title="Primeira quinzena" />
        <FortnightCard b={second} title="Segunda quinzena" />
      </div>

      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <span className="text-sm font-medium text-emerald-900">
          Total do mês (1ª + 2ª quinzena)
        </span>
        <span className="text-lg font-bold text-emerald-950 tabular-nums">
          {formatEarningsBRL(monthTotal)}
        </span>
      </div>
    </section>
  );
}
