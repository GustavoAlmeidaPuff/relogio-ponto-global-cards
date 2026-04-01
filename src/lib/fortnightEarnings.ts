import type { WorkDay } from "@/types";
import {
  extraMinutesForDay,
  JORNADA_PADRAO_MINUTOS_DIA,
  missingMinutesForDay,
  REAIS_POR_HORA_EXTRA,
  REAIS_POR_HORA_NORMAL,
  totalMinutesForDay,
  earningsFromMinutes,
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
  /** Dias com registro × 8h — base da “jornada cheia” para o demonstrativo. */
  referenceNormalMinutes: number;
  referenceNormalValue: number;
  missingMinutes: number;
  discountValue: number;
  extraMinutes: number;
  extraValue: number;
  /** Igual a earningsFromMinutes(totalMin, extraMin) na quinzena. */
  totalValue: number;
  totalMinutes: number;
}

function lastDayOfMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
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
  fortnight: FortnightIndex
): FortnightPayBreakdown {
  const days = workDays.filter((wd) => fortnightFromDate(wd.date) === fortnight);
  const n = days.length;
  const totalMinutes = days.reduce((acc, wd) => acc + totalMinutesForDay(wd), 0);
  const extraMinutes = days.reduce((acc, wd) => acc + extraMinutesForDay(wd), 0);
  const missingMinutes = days.reduce(
    (acc, wd) => acc + missingMinutesForDay(wd),
    0
  );

  const referenceNormalMinutes = n * JORNADA_PADRAO_MINUTOS_DIA;
  const referenceNormalValue =
    (referenceNormalMinutes / 60) * REAIS_POR_HORA_NORMAL;
  const discountValue = (missingMinutes / 60) * REAIS_POR_HORA_NORMAL;
  const extraValue = (extraMinutes / 60) * REAIS_POR_HORA_EXTRA;
  const totalValue = earningsFromMinutes(totalMinutes, extraMinutes);

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
  };
}

export function buildMonthFortnightBreakdowns(
  workDays: WorkDay[],
  validMes: string
): [FortnightPayBreakdown, FortnightPayBreakdown] {
  return [
    buildFortnightBreakdown(workDays, validMes, 1),
    buildFortnightBreakdown(workDays, validMes, 2),
  ];
}
