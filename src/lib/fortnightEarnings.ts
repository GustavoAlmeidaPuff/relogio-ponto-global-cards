import type { WorkDay } from "@/types";
import {
  earningsFromMinutes,
  effectiveWorkedMinutes,
  expectedMinutesForDate,
  extraMinutesForDay,
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
  /** Soma das jornadas previstas (5h seg–sex, 9h sáb.; dom. 0) nos dias úteis da quinzena no período considerado. */
  referenceNormalMinutes: number;
  referenceNormalValue: number;
  missingMinutes: number;
  discountValue: number;
  extraMinutes: number;
  extraValue: number;
  /** Igual a earningsFromMinutes(totalMin, extraMin) na quinzena. */
  totalValue: number;
  totalMinutes: number;
  /** Minutos na faixa normal: total registrado − classificados como extra (por dia). */
  clockNormalMinutes: number;
  /** (clockNormalMinutes / 60) × taxa normal. */
  clockNormalValue: number;
  /** clockNormalValue + extraValue (= totalValue). */
  subtotalGross: number;
}

function lastDayOfMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function localTodayYmd(): string {
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
  const today = localTodayYmd();
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
  const daysInFortnight = workDays.filter(
    (wd) => fortnightFromDate(wd.date) === fortnight
  );
  const daysWithWorkedTime = daysInFortnight.filter(
    (wd) => effectiveWorkedMinutes(wd) > 0
  );
  const n = daysWithWorkedTime.length;
  const totalMinutes = daysInFortnight.reduce(
    (acc, wd) => acc + effectiveWorkedMinutes(wd),
    0
  );
  const extraMinutes = daysInFortnight.reduce(
    (acc, wd) => acc + extraMinutesForDay(wd),
    0
  );

  const byDate = new Map(daysInFortnight.map((wd) => [wd.date, wd]));
  let referenceNormalMinutes = 0;
  let missingMinutes = 0;
  for (const dateStr of datesInFortnight(validMes, fortnight)) {
    if (dateStr > asOf) continue;
    const exp = expectedMinutesForDate(dateStr);
    if (exp === 0) continue;
    referenceNormalMinutes += exp;
    const wd = byDate.get(dateStr);
    const worked = wd ? effectiveWorkedMinutes(wd) : 0;
    if (worked === 0) {
      missingMinutes += exp;
    } else {
      missingMinutes += Math.max(0, exp - worked);
    }
  }
  const referenceNormalValue =
    (referenceNormalMinutes / 60) * REAIS_POR_HORA_NORMAL;
  const discountValue = (missingMinutes / 60) * REAIS_POR_HORA_NORMAL;
  const extraValue = (extraMinutes / 60) * REAIS_POR_HORA_EXTRA;
  const clockNormalMinutes = totalMinutes - extraMinutes;
  const clockNormalValue =
    (clockNormalMinutes / 60) * REAIS_POR_HORA_NORMAL;
  const totalValue = earningsFromMinutes(totalMinutes, extraMinutes);
  const subtotalGross = clockNormalValue + extraValue;

  return {
    fortnight,
    labelRange: formatMonthRangeLabel(validMes, fortnight),
    daysWithRecords: n,
    referenceNormalMinutes,
    referenceNormalValue,
    missingMinutes,
    discountValue,
    extraMinutes,
    extraValue,
    totalValue,
    totalMinutes,
    clockNormalMinutes,
    clockNormalValue,
    subtotalGross,
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
