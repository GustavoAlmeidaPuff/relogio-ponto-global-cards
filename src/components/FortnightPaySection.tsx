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
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Referência de jornada normal
            </p>
            <p className="text-slate-600 text-xs leading-relaxed mb-1">
              {JORNADA_REFERENCIA_RESUMO} Soma da jornada prevista nos dias com tempo
              registrado:
            </p>
            <p className="text-slate-700 leading-relaxed">
              {formatHours(b.referenceNormalMinutes)} × {formatEarningsBRL(REAIS_POR_HORA_NORMAL)}
              /h
            </p>
            <p className="text-slate-900 font-semibold tabular-nums">
              = {formatEarningsBRL(b.referenceNormalValue)}
            </p>
            <p className="text-xs text-slate-500">
              ({formatHours(b.referenceNormalMinutes)} no total de referência)
            </p>
          </div>

          {hasDiscount ? (
            <div className="rounded-xl bg-amber-50/90 border border-amber-100 px-3 py-2.5 space-y-1.5">
              <p className="text-xs font-semibold text-amber-900/80 uppercase tracking-wide">
                Desconto — abaixo da jornada prevista
              </p>
              <p className="text-amber-950/90 leading-relaxed">
                Nos dias em que trabalhou menos que a jornada daquele dia (5h ou 9h no
                sábado), faltaram{" "}
                <span className="font-medium tabular-nums">
                  {formatHours(b.missingMinutes)}
                </span>{" "}
                para completar a referência.
              </p>
              <p className="text-amber-950/90 tabular-nums">
                − ({b.missingMinutes} min ÷ 60) × {formatEarningsBRL(REAIS_POR_HORA_NORMAL)}
                /h = <span className="font-semibold">−{formatEarningsBRL(b.discountValue)}</span>
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500">
              Sem desconto: em todos os dias com ponto o tempo trabalhado atingiu ou
              passou da jornada prevista ({JORNADA_REFERENCIA_RESUMO}).
            </div>
          )}

          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 space-y-1.5">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Horas extras (acima de 5h ou de 9h no sábado)
            </p>
            {hasExtra ? (
              <>
                <p className="text-slate-700">
                  <span className="font-medium tabular-nums">
                    {formatHours(b.extraMinutes)}
                  </span>{" "}
                  × {formatEarningsBRL(REAIS_POR_HORA_EXTRA)}/h
                </p>
                <p className="text-slate-900 font-semibold tabular-nums">
                  = +{formatEarningsBRL(b.extraValue)}
                </p>
              </>
            ) : (
              <p className="text-slate-500 text-xs">Nenhuma hora extra neste período.</p>
            )}
          </div>

          <div className="rounded-xl bg-emerald-50/90 border border-emerald-200 px-3 py-3 mt-2">
            <p className="text-xs font-semibold text-emerald-900/80 uppercase tracking-wide mb-2">
              Total da quinzena
            </p>
            <p className="text-xs text-emerald-900/90 leading-relaxed break-words">
              {formatEarningsBRL(b.referenceNormalValue)}
              {hasDiscount ? ` − ${formatEarningsBRL(b.discountValue)}` : ""}
              {hasExtra ? ` + ${formatEarningsBRL(b.extraValue)}` : ""} =
            </p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-950 tabular-nums mt-1">
              {formatEarningsBRL(b.totalValue)}
            </p>
            <p className="text-xs text-emerald-800/80 mt-2">
              Conferência: horas normais efetivas ({formatHours(b.totalMinutes - b.extraMinutes)}) ×{" "}
              {formatEarningsBRL(REAIS_POR_HORA_NORMAL)}/h
              {hasExtra
                ? ` + horas extras (${formatHours(b.extraMinutes)}) × ${formatEarningsBRL(REAIS_POR_HORA_EXTRA)}/h`
                : ""}
              .
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
          Demonstrativo: {JORNADA_REFERENCIA_RESUMO} Nos dias com registro, desconto
          quando faltou tempo em relação à jornada daquele dia, e horas extras a{" "}
          {formatEarningsBRL(REAIS_POR_HORA_EXTRA)}/h. O total da quinzena é:{" "}
          <span className="font-medium text-slate-800">
            ref. normal − desconto + extras
          </span>
          .
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
