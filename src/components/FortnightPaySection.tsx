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
          <div className="rounded-xl bg-emerald-50/90 border border-emerald-200 px-3 py-3">
            <p className="text-xs font-semibold text-emerald-900/80 uppercase tracking-wide mb-2">
              Conta principal (pelo tempo batido)
            </p>
            <p className="text-xs text-emerald-900/85 mb-2 leading-relaxed">
              O que multiplica <strong>{formatEarningsBRL(REAIS_POR_HORA_NORMAL)}/h</strong> são{" "}
              <strong>{formatHours(b.clockNormalMinutes)}</strong>, não as{" "}
              {formatHours(b.referenceNormalMinutes)} da referência de calendário abaixo.
            </p>
            <p className="text-emerald-950 tabular-nums">
              {formatHours(b.clockNormalMinutes)} × {formatEarningsBRL(REAIS_POR_HORA_NORMAL)}/h
              = <span className="font-semibold">{formatEarningsBRL(b.clockNormalValue)}</span>
            </p>
            {hasDiscount ? (
              <p className="text-xs text-emerald-900/90 mt-2 leading-relaxed rounded-md bg-white/60 border border-emerald-100 px-2 py-1.5">
                <span className="font-medium text-emerald-950">O desconto já está aplicado nesse valor:</span>{" "}
                você não recebe pelas {formatHours(b.missingMinutes)} em falta em relação ao
                calendário, então a base na taxa normal é menor do que 78h ×{" "}
                {formatEarningsBRL(REAIS_POR_HORA_NORMAL)}/h. Em dinheiro, é o mesmo que{" "}
                <span className="tabular-nums font-medium">
                  {formatEarningsBRL(b.referenceNormalValue)} − {formatEarningsBRL(b.discountValue)} ={" "}
                  {formatEarningsBRL(b.clockNormalValue)}
                </span>
                . <span className="text-emerald-800/95">Não subtraímos o desconto de novo no total</span>{" "}
                (seria descontar a falta duas vezes).
              </p>
            ) : null}
            {hasExtra ? (
              <div className="mt-2 pt-2 border-t border-emerald-200/80 space-y-1.5">
                <p className="text-xs text-emerald-900/85 leading-relaxed">
                  Trecho do <strong>mesmo</strong> total ({formatHours(b.totalMinutes)}) acima da
                  jornada do dia (5h / 9h sáb. / domingo):
                </p>
                <p className="text-emerald-950 tabular-nums">
                  {formatHours(b.extraMinutes)} × {formatEarningsBRL(REAIS_POR_HORA_EXTRA)}/h ={" "}
                  <span className="font-semibold">+{formatEarningsBRL(b.extraValue)}</span>
                </p>
              </div>
            ) : null}
            <p className="text-lg sm:text-xl font-bold text-emerald-950 tabular-nums mt-3 pt-2 border-t border-emerald-200/80">
              Total da quinzena: {formatEarningsBRL(b.totalValue)}
            </p>
            <p className="text-xs text-emerald-800/90 mt-2 tabular-nums">
              Tempo: {formatHours(b.clockNormalMinutes)}
              {hasExtra ? ` + ${formatHours(b.extraMinutes)}` : ""} = {formatHours(b.totalMinutes)}
            </p>
          </div>

          <p className="text-xs text-slate-500 px-0.5">
            Mesmo total em reais, por outro caminho (meta do calendário − falta + trechos na alíquota
            extra):
          </p>

          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 space-y-1.5">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Referência de calendário (não é o total batido)
            </p>
            <p className="text-slate-600 text-xs leading-relaxed mb-1">
              {JORNADA_REFERENCIA_RESUMO} Soma da jornada prevista (seg–sáb) no período; serve para
              medir falta, não para multiplicar suas horas de ponto por {formatEarningsBRL(REAIS_POR_HORA_NORMAL)}/h.
            </p>
            <p className="text-slate-700 leading-relaxed tabular-nums">
              {formatHours(b.referenceNormalMinutes)} × {formatEarningsBRL(REAIS_POR_HORA_NORMAL)}/h
              = {formatEarningsBRL(b.referenceNormalValue)}
            </p>
          </div>

          {hasDiscount ? (
            <div className="rounded-xl bg-amber-50/90 border border-amber-100 px-3 py-2.5 space-y-1.5">
              <p className="text-xs font-semibold text-amber-900/80 uppercase tracking-wide">
                Desconto — abaixo da jornada prevista
              </p>
              <p className="text-amber-950/90 leading-relaxed">
                Faltaram{" "}
                <span className="font-medium tabular-nums">{formatHours(b.missingMinutes)}</span>{" "}
                para completar a referência (falta integral ou parcial).
              </p>
              <p className="text-amber-950/90 tabular-nums">
                − ({b.missingMinutes} min ÷ 60) × {formatEarningsBRL(REAIS_POR_HORA_NORMAL)}/h ={" "}
                <span className="font-semibold">−{formatEarningsBRL(b.discountValue)}</span>
              </p>
              <p className="text-amber-950/85 text-xs border-t border-amber-200/60 pt-1.5 mt-1">
                Após desconto, na taxa normal: equivale a{" "}
                <strong className="tabular-nums">{formatHours(b.clockNormalMinutes)}</strong> ×{" "}
                {formatEarningsBRL(REAIS_POR_HORA_NORMAL)}/h ={" "}
                {formatEarningsBRL(b.clockNormalValue)}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500">
              Sem desconto ({JORNADA_REFERENCIA_RESUMO}).
            </div>
          )}

          {hasExtra ? (
            <p className="text-xs text-slate-600 tabular-nums px-1">
              + trechos na alíquota extra: {formatEarningsBRL(b.extraValue)} (
              {formatHours(b.extraMinutes)} × {formatEarningsBRL(REAIS_POR_HORA_EXTRA)}/h)
            </p>
          ) : null}

          <p className="text-xs text-slate-600 tabular-nums px-1 pb-1">
            {formatEarningsBRL(b.referenceNormalValue)}
            {hasDiscount ? ` − ${formatEarningsBRL(b.discountValue)}` : ""}
            {hasExtra ? ` + ${formatEarningsBRL(b.extraValue)}` : ""} ={" "}
            <span className="font-medium text-slate-900">{formatEarningsBRL(b.totalValue)}</span>
            {" "}(conferência do caminho calendário)
          </p>
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
          Em cada card, a <span className="font-medium text-slate-800">conta principal</span> usa
          primeiro o tempo batido: horas na taxa normal (não as horas da referência de calendário) +
          trechos extra. Abaixo dela, o mesmo valor por referência de calendário − falta + extras.{" "}
          {JORNADA_REFERENCIA_RESUMO}
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
