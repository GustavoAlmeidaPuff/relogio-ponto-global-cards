import type { WorkDay } from "@/types";
import {
  earningsFromMinutes,
  effectiveWorkedMinutes,
  expectedMinutesForDate,
  extraMinutesForDay,
  missingMinutesForDay,
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
  /** Soma das jornadas previstas (5h/9h) só nos dias com tempo trabalhado efetivo. */
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
  const missingMinutes = daysInFortnight.reduce(
    (acc, wd) => acc + missingMinutesForDay(wd),
    0
  );

  const referenceNormalMinutes = daysWithWorkedTime.reduce(
    (acc, wd) => acc + expectedMinutesForDate(wd.date),
    0
  );
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
