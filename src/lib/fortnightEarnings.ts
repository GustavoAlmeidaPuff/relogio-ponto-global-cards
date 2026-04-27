import type { WorkDay } from "@/types";
import {
  effectiveWorkedMinutes,
  expectedMinutesForDate,
  REAIS_POR_HORA_EXTRA,
  REAIS_POR_HORA_NORMAL,
} from "@/hooks/useMonthReport";

/** 1 = dias 1–15; 2 = dias 16 em diante. */
export type FortnightIndex = 1 | 2;

export function fortnightFromDate(dateStr: string): FortnightIndex {
  const day = parseInt(dateStr.slice(8, 10), 10);
  if (Number.isNaN(day)) return 1;
  return day <= 15 ? 1 : 2;
}

export interface FortnightPayBreakdown {
  fortnight: FortnightIndex;
  /** Ex.: "1–15 abr." */
  labelRange: string;
  daysWithRecords: number;
  /** Número de dias marcados como feriado (PTO) no período. */
  ptoCount: number;
  /** Minutos de PTO (feriados sem ponto) adicionados ao total efetivo. */
  ptoMinutes: number;
  /** Soma da jornada prevista (seg–sáb) no período considerado. */
  referenceNormalMinutes: number;
  referenceNormalValue: number;
  /** Prevista dos dias úteis em que não houve ponto (falta integral). */
  fullDayMissingMinutes: number;
  /**
   * Horas previstas efetivas: referência − falta em dia inteiro (ex.: 78h − sábado sem ponto).
   * Usado no resumo; o valor em R$ da linha normal usa `clockNormalMinutes`.
   */
  expectedEffectiveMinutes: number;
  /** Falta total (integral + parcial: saiu cedo etc.). Abate das extras brutas. */
  missingMinutes: number;
  /** missingMinutes × taxa normal (conferência em R$). */
  discountValue: number;
  /** Minutos realmente trabalhados (sem PTO). */
  totalMinutes: number;
  /** totalMinutes + ptoMinutes — base para cálculo de extras e normais. */
  effectiveTotalMinutes: number;
  /** max(0, effectiveTotal − expectedEffective). */
  grossExtraMinutes: number;
  /** max(0, brutas − missing). Pagas à taxa extra. */
  formattedExtraMinutes: number;
  formattedExtraValue: number;
  /** min(effectiveTotal, esperadas) = effectiveTotal − extras brutas — base para ganhos na taxa normal. */
  clockNormalMinutes: number;
  clockNormalValue: number;
  /** Normais + extras líquidas em R$. */
  subtotalGross: number;
  totalValue: number;
}

function lastDayOfMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

/** Data de hoje no fuso local (YYYY-MM-DD). */
export function todayYmdLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function lastDayOfMonthYmd(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const last = lastDayOfMonth(y, m - 1);
  return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

/**
 * Data limite para fechar o calendário da quinzena: mês passado = último dia do mês;
 * mês atual ou futuro = hoje (dias posteriores ainda não entram na obrigação).
 */
export function asOfDateForReportMonth(monthKey: string): string {
  const today = todayYmdLocal();
  const curMonth = today.slice(0, 7);
  if (monthKey < curMonth) {
    return lastDayOfMonthYmd(monthKey);
  }
  if (monthKey > curMonth) {
    return today;
  }
  const last = lastDayOfMonthYmd(monthKey);
  return today < last ? today : last;
}

/** Cada YYYY-MM-DD da quinzena dentro do mês. */
export function datesInFortnight(
  validMes: string,
  fortnight: FortnightIndex
): string[] {
  const [y, m] = validMes.split("-").map(Number);
  const last = lastDayOfMonth(y, m - 1);
  const startDay = fortnight === 1 ? 1 : 16;
  const endDay = fortnight === 1 ? 15 : last;
  const dates: string[] = [];
  for (let d = startDay; d <= endDay; d++) {
    dates.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return dates;
}

function formatMonthRangeLabel(
  validMes: string,
  fortnight: FortnightIndex
): string {
  const [y, m] = validMes.split("-").map(Number);
  const monthName = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
    month: "short",
  });
  if (fortnight === 1) {
    return `1–15 ${monthName}`;
  }
  const last = lastDayOfMonth(y, m - 1);
  return `16–${last} ${monthName}`;
}

export function buildFortnightBreakdown(
  workDays: WorkDay[],
  validMes: string,
  fortnight: FortnightIndex,
  asOfDate?: string
): FortnightPayBreakdown {
  const asOf = asOfDate ?? asOfDateForReportMonth(validMes);
  const todayStr = todayYmdLocal();
  const daysInFortnight = workDays.filter(
    (wd) => fortnightFromDate(wd.date) === fortnight
  );
  const daysWithWorkedTime = daysInFortnight.filter(
    (wd) => effectiveWorkedMinutes(wd) > 0 || wd.holiday === true
  );
  const n = daysWithWorkedTime.length;
  const totalMinutes = daysInFortnight.reduce(
    (acc, wd) => acc + effectiveWorkedMinutes(wd),
    0
  );

  const byDate = new Map(daysInFortnight.map((wd) => [wd.date, wd]));
  let referenceNormalMinutes = 0;
  let missingMinutes = 0;
  let fullDayMissingMinutes = 0;
  let ptoMinutes = 0;
  let ptoCount = 0;
  for (const dateStr of datesInFortnight(validMes, fortnight)) {
    if (dateStr > asOf) continue;
    const exp = expectedMinutesForDate(dateStr);
    if (exp === 0) continue;
    referenceNormalMinutes += exp;
    const wd = byDate.get(dateStr);
    const isHoliday = wd?.holiday === true;
    const worked = wd ? effectiveWorkedMinutes(wd) : 0;
    /** Só a partir do dia seguinte: o dia civil em curso não gera "falta" nem falta de dia inteiro. */
    const isOngoingCalendarDay = dateStr === todayStr;
    if (isHoliday) {
      // Feriado: PTO cobre a diferença entre o que foi trabalhado e a jornada esperada
      const ptoDiff = Math.max(0, exp - worked);
      ptoMinutes += ptoDiff;
      if (ptoDiff > 0) ptoCount += 1;
    } else if (worked === 0) {
      if (!isOngoingCalendarDay) {
        missingMinutes += exp;
        fullDayMissingMinutes += exp;
      }
    } else {
      if (!isOngoingCalendarDay) {
        missingMinutes += Math.max(0, exp - worked);
      }
    }
  }

  const effectiveTotalMinutes = totalMinutes + ptoMinutes;
  const expectedEffectiveMinutes = Math.max(
    0,
    referenceNormalMinutes - fullDayMissingMinutes
  );
  const grossExtraMinutes = Math.max(0, effectiveTotalMinutes - expectedEffectiveMinutes);
  const clockNormalMinutes = effectiveTotalMinutes - grossExtraMinutes;
  const formattedExtraMinutes = Math.max(
    0,
    grossExtraMinutes - missingMinutes
  );

  const referenceNormalValue =
    (referenceNormalMinutes / 60) * REAIS_POR_HORA_NORMAL;
  const discountValue = (missingMinutes / 60) * REAIS_POR_HORA_NORMAL;
  const clockNormalValue =
    (clockNormalMinutes / 60) * REAIS_POR_HORA_NORMAL;
  const formattedExtraValue =
    (formattedExtraMinutes / 60) * REAIS_POR_HORA_EXTRA;
  const totalValue = clockNormalValue + formattedExtraValue;
  const subtotalGross = totalValue;

  return {
    fortnight,
    labelRange: formatMonthRangeLabel(validMes, fortnight),
    daysWithRecords: n,
    ptoCount,
    ptoMinutes,
    referenceNormalMinutes,
    referenceNormalValue,
    fullDayMissingMinutes,
    expectedEffectiveMinutes,
    missingMinutes,
    discountValue,
    totalMinutes,
    effectiveTotalMinutes,
    grossExtraMinutes,
    formattedExtraMinutes,
    formattedExtraValue,
    clockNormalMinutes,
    clockNormalValue,
    subtotalGross,
    totalValue,
  };
}

export function buildMonthFortnightBreakdowns(
  workDays: WorkDay[],
  validMes: string,
  options?: { asOfDate?: string }
): [FortnightPayBreakdown, FortnightPayBreakdown] {
  const asOf = options?.asOfDate;
  return [
    buildFortnightBreakdown(workDays, validMes, 1, asOf),
    buildFortnightBreakdown(workDays, validMes, 2, asOf),
  ];
}
