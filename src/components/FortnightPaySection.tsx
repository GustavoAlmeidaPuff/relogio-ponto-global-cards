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
  const hasDiscount = b.missingMinutes > 0;
  const hasExtra = b.extraMinutes > 0;

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
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 space-y-1.5">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              1. Ganhos — horas normais
            </p>
            <p className="text-slate-600 text-xs leading-relaxed">
              {JORNADA_REFERENCIA_RESUMO} Referência de calendário na quinzena (seg–sáb).
            </p>
            <p className="text-slate-800 tabular-nums">
              {formatHours(b.referenceNormalMinutes)} × {formatEarningsBRL(REAIS_POR_HORA_NORMAL)}/h
              = <span className="font-semibold">{formatEarningsBRL(b.referenceNormalValue)}</span>
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 space-y-1.5">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              2. Ganhos — horas extras
            </p>
            <p className="text-slate-600 text-xs leading-relaxed">
              Acima de 5h (seg–sex), de 9h no sábado, ou qualquer hora no domingo.
            </p>
            {hasExtra ? (
              <p className="text-slate-800 tabular-nums">
                {formatHours(b.extraMinutes)} × {formatEarningsBRL(REAIS_POR_HORA_EXTRA)}/h ={" "}
                <span className="font-semibold">{formatEarningsBRL(b.extraValue)}</span>
              </p>
            ) : (
              <p className="text-slate-500 text-xs tabular-nums">R$ 0,00</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 tabular-nums">
            <span className="text-xs text-slate-500">Soma (normais + extras): </span>
            <span className="font-medium">{formatEarningsBRL(b.subtotalGross)}</span>
          </div>

          <div
            className={`rounded-xl px-3 py-2.5 space-y-1.5 ${
              hasDiscount
                ? "bg-amber-50/90 border border-amber-100"
                : "border border-dashed border-slate-200"
            }`}
          >
            <p className="text-xs font-semibold text-amber-900/80 uppercase tracking-wide">
              3. Desconto — horas faltantes à jornada prevista
            </p>
            {hasDiscount ? (
              <>
                <p className="text-amber-950/90 text-xs leading-relaxed">
                  Faltaram {formatHours(b.missingMinutes)} em relação à referência (dia sem ponto ou
                  abaixo de 5h / 9h sáb.).
                </p>
                <p className="text-amber-950 tabular-nums">
                  − ({b.missingMinutes} min ÷ 60) × {formatEarningsBRL(REAIS_POR_HORA_NORMAL)}/h ={" "}
                  <span className="font-semibold">−{formatEarningsBRL(b.discountValue)}</span>
                </p>
              </>
            ) : (
              <p className="text-slate-500 text-xs">Sem desconto neste período.</p>
            )}
          </div>

          <div className="rounded-xl bg-emerald-50/90 border border-emerald-200 px-3 py-3">
            <p className="text-xs font-semibold text-emerald-900/80 uppercase tracking-wide mb-2">
              4. Total da quinzena
            </p>
            <p className="text-xs text-emerald-900/90 tabular-nums leading-relaxed break-words">
              {formatEarningsBRL(b.referenceNormalValue)}
              {hasExtra ? ` + ${formatEarningsBRL(b.extraValue)}` : ""}
              {hasDiscount ? ` − ${formatEarningsBRL(b.discountValue)}` : ""} ={" "}
            </p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-950 tabular-nums mt-1">
              {formatEarningsBRL(b.totalValue)}
            </p>
            <p className="text-xs text-emerald-800/80 mt-2">
              Tempo registrado no período: {formatHours(b.totalMinutes)}
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
          {JORNADA_REFERENCIA_RESUMO} Em cada quinzena: ganhos na taxa normal (referência de
          calendário), ganhos em horas extra, desconto por falta à jornada e total.
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
