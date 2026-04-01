"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { WorkDay } from "@/types";
import type { WeekSummary } from "@/hooks/useMonthReport";
import {
  effectiveWorkedMinutes,
  formatHours,
  extraMinutesForDay,
  totalExtraMinutes,
  formatEarningsBRL,
  REAIS_POR_HORA_NORMAL,
  REAIS_POR_HORA_EXTRA,
  JORNADA_REFERENCIA_RESUMO,
} from "@/hooks/useMonthReport";
import type { FortnightPayBreakdown } from "@/lib/fortnightEarnings";
import { buildMonthFortnightBreakdowns } from "@/lib/fortnightEarnings";
import type { Timestamp } from "firebase/firestore";

function toDate(ts: Timestamp): Date {
  if (ts.toDate) return ts.toDate();
  return new Date((ts as unknown as { seconds: number }).seconds * 1000);
}

function formatTime(ts: Timestamp): string {
  return toDate(ts).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Lista de textos "o que fiz" a partir de records ou notes (compatibilidade). */
function getDayRecords(wd: WorkDay): string[] {
  if (wd.records && Array.isArray(wd.records) && wd.records.length > 0) {
    return wd.records.filter((s) => s != null && String(s).trim() !== "");
  }
  if (wd.notes != null && String(wd.notes).trim() !== "") {
    return String(wd.notes)
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s !== "");
  }
  return [];
}

/** Altura aproximada em pt (A4) para quebrar página: quantos dias cabem. */
const PAGE_USABLE_HEIGHT_PT = 750;
const DAY_BLOCK_BASE_PT = 95;
const PUNCH_LINE_PT = 18;
const FEITOS_HEADER_PT = 28;
const FEITO_ITEM_PT = 14;
const EXTRA_LINE_PT = 22;

function estimateDayHeightPt(wd: WorkDay): number {
  const records = getDayRecords(wd);
  const extraLine =
    extraMinutesForDay(wd) > 0 ? EXTRA_LINE_PT : 0;
  return (
    DAY_BLOCK_BASE_PT +
    extraLine +
    wd.punches.length * PUNCH_LINE_PT +
    (records.length > 0 ? FEITOS_HEADER_PT + records.length * FEITO_ITEM_PT : 0)
  );
}

/** Agrupa workDays em páginas: cada página recebe quantos dias couberem pela altura estimada. */
function chunkDaysToPages(workDays: WorkDay[]): WorkDay[][] {
  const chunks: WorkDay[][] = [];
  let currentChunk: WorkDay[] = [];
  let currentHeight = 0;

  for (const wd of workDays) {
    const h = estimateDayHeightPt(wd);
    if (currentChunk.length > 0 && currentHeight + h > PAGE_USABLE_HEIGHT_PT) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentHeight = 0;
    }
    currentChunk.push(wd);
    currentHeight += h;
  }
  if (currentChunk.length > 0) chunks.push(currentChunk);
  return chunks;
}

const colors = {
  primary: "#1e40af",
  primaryLight: "#3b82f6",
  text: "#1e293b",
  textMuted: "#64748b",
  border: "#e2e8f0",
  bgCard: "#f8fafc",
  bgHeader: "#1e40af",
};

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: "Helvetica",
    fontSize: 10,
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: colors.bgHeader,
    paddingVertical: 20,
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    textTransform: "capitalize",
  },
  closedBadge: {
    fontSize: 9,
    color: "rgba(255,255,255,0.8)",
    marginTop: 6,
  },
  body: { paddingHorizontal: 40, paddingBottom: 40 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 10,
    color: colors.primary,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  summaryCard: {
    backgroundColor: colors.bgCard,
    padding: 14,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryLight,
  },
  summaryText: { fontSize: 11, color: colors.text },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: colors.bgCard,
    borderRadius: 4,
  },
  weekLabel: { fontSize: 10, color: colors.text },
  weekTotal: { fontSize: 10, fontWeight: "bold", color: colors.primary },
  weekColRight: { alignItems: "flex-end" },
  weekExtraLine: { fontSize: 9, color: colors.textMuted, marginTop: 2 },
  daysPageBody: {
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 40,
  },
  dayBlock: {
    backgroundColor: colors.bgCard,
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  dayHeader: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayTitleLine: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.text,
  },
  dayExtra: {
    fontSize: 10,
    fontWeight: "normal",
    color: colors.primary,
    marginTop: 4,
  },
  punchLine: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 6,
    paddingLeft: 4,
  },
  feitosTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 6,
    color: colors.text,
  },
  feitosItem: {
    fontSize: 10,
    color: colors.text,
    marginBottom: 4,
    paddingLeft: 4,
  },
  fortnightPageBody: {
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 40,
  },
  fortnightMainTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 8,
  },
  fortnightIntro: {
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: 16,
    lineHeight: 1.45,
  },
  fortnightCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    backgroundColor: colors.bgCard,
  },
  fortnightCardTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 4,
  },
  fortnightRange: {
    fontSize: 8,
    color: colors.textMuted,
    marginBottom: 8,
    textTransform: "capitalize",
  },
  fortnightBlock: {
    marginBottom: 8,
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
  },
  fortnightBlockLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  fortnightBody: {
    fontSize: 9,
    color: colors.text,
    lineHeight: 1.4,
  },
  fortnightEmphasis: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.text,
    marginTop: 4,
  },
  fortnightDiscountBlock: {
    marginBottom: 8,
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#fcd34d",
    backgroundColor: "#fffbeb",
  },
  fortnightDiscountLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#92400e",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  fortnightDiscountText: {
    fontSize: 9,
    color: "#78350f",
    lineHeight: 1.4,
  },
  fortnightTotalBlock: {
    marginTop: 6,
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#6ee7b7",
    backgroundColor: "#ecfdf5",
  },
  fortnightTotalLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#065f46",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  fortnightTotalFormula: {
    fontSize: 8,
    color: "#047857",
    lineHeight: 1.35,
    marginBottom: 4,
  },
  fortnightTotalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#064e3b",
  },
  fortnightCheckLine: {
    fontSize: 8,
    color: "#047857",
    marginTop: 6,
    lineHeight: 1.35,
  },
  fortnightMonthTotalRow: {
    marginTop: 8,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#6ee7b7",
    backgroundColor: "#f0fdf4",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fortnightMonthTotalLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#065f46",
  },
  fortnightMonthTotalValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#064e3b",
  },
  dashedNote: {
    marginBottom: 8,
    padding: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: 4,
  },
  dashedNoteText: {
    fontSize: 8,
    color: colors.textMuted,
    lineHeight: 1.35,
  },
  fortnightSummaryBlock: {
    marginBottom: 8,
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#f8fafc",
  },
  fortnightSummaryLine: {
    fontSize: 8,
    color: colors.text,
    marginBottom: 3,
    lineHeight: 1.4,
  },
  fortnightDiscountSaldo: {
    fontSize: 9,
    color: "#78350f",
    fontWeight: "bold",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#fcd34d",
  },
});

function FortnightPdfCard({
  b,
  title,
}: {
  b: FortnightPayBreakdown;
  title: string;
}) {
  const hasFalta = b.missingMinutes > 0;
  const hasBrutas = b.grossExtraMinutes > 0;
  const hasLiquidas = b.formattedExtraMinutes > 0;

  if (b.daysWithRecords === 0) {
    return (
      <View style={styles.fortnightCard}>
        <Text style={styles.fortnightCardTitle}>{title}</Text>
        <Text style={styles.fortnightRange}>{b.labelRange}</Text>
        <Text style={styles.fortnightBody}>
          Nenhum dia com registro neste período.
        </Text>
        <Text style={[styles.fortnightEmphasis, { marginTop: 6 }]}>
          Total: {formatEarningsBRL(0)}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.fortnightCard}>
      <Text style={styles.fortnightCardTitle}>{title}</Text>
      <Text style={styles.fortnightRange}>{b.labelRange}</Text>
      <Text style={[styles.fortnightBody, { marginBottom: 8 }]}>
        {b.daysWithRecords} dia{b.daysWithRecords !== 1 ? "s" : ""} com ponto
      </Text>

      <View style={styles.fortnightSummaryBlock}>
        <Text style={styles.fortnightSummaryLine}>
          <Text style={{ color: colors.textMuted }}>Tempo total trabalhado: </Text>
          {formatHours(b.totalMinutes)}
        </Text>
        <Text style={styles.fortnightSummaryLine}>
          <Text style={{ color: colors.textMuted }}>Referência calendário (seg–sáb): </Text>
          {formatHours(b.referenceNormalMinutes)}
        </Text>
        <Text style={styles.fortnightSummaryLine}>
          <Text style={{ color: colors.textMuted }}>Horas esperadas (ref. − dia sem ponto): </Text>
          {formatHours(b.expectedEffectiveMinutes)}
        </Text>
      </View>

      <View style={styles.fortnightBlock}>
        <Text style={styles.fortnightBlockLabel}>1. Ganhos — horas normais</Text>
        <Text style={[styles.fortnightBody, { fontSize: 8, color: colors.textMuted }]}>
          {JORNADA_REFERENCIA_RESUMO} Base = tempo total − extras brutas (
          {formatHours(b.totalMinutes)} − {formatHours(b.grossExtraMinutes)}).
        </Text>
        <Text style={[styles.fortnightBody, { marginTop: 4 }]}>
          {formatHours(b.clockNormalMinutes)} × {formatEarningsBRL(REAIS_POR_HORA_NORMAL)}/h ={" "}
          {formatEarningsBRL(b.clockNormalValue)}
        </Text>
      </View>

      <View style={styles.fortnightBlock}>
        <Text style={styles.fortnightBlockLabel}>2. Horas extras brutas</Text>
        <Text style={[styles.fortnightBody, { fontSize: 8, color: colors.textMuted }]}>
          Trabalhado além das horas esperadas (item acima): total − esperadas.
        </Text>
        <Text style={[styles.fortnightBody, { marginTop: 4, fontWeight: "bold" }]}>
          {hasBrutas ? formatHours(b.grossExtraMinutes) : "0h 00min"}
        </Text>
      </View>

      {hasFalta ? (
        <View style={styles.fortnightDiscountBlock}>
          <Text style={styles.fortnightDiscountLabel}>3. Faltas (abatem das extras brutas)</Text>
          <Text style={styles.fortnightDiscountText}>
            Falta à jornada prevista (dia sem ponto, saiu mais cedo, etc.):{" "}
            {formatHours(b.missingMinutes)}. Equivale a {formatEarningsBRL(b.discountValue)} na taxa
            normal, mas no cálculo{" "}
            <Text style={{ fontWeight: "bold" }}>reduz o saldo de horas extra</Text>, não a linha 1.
          </Text>
          <Text style={styles.fortnightDiscountSaldo}>
            Saldo extras (brutas − faltas): {formatHours(b.grossExtraMinutes)} −{" "}
            {formatHours(b.missingMinutes)} = {formatHours(b.formattedExtraMinutes)}
          </Text>
        </View>
      ) : (
        <View style={styles.dashedNote}>
          <Text style={styles.dashedNoteText}>
            3. Faltas (abatem das extras brutas): nenhuma falta registrada na referência.
          </Text>
        </View>
      )}

      <View style={styles.fortnightBlock}>
        <Text style={styles.fortnightBlockLabel}>4. Ganhos — horas extras (líquidas)</Text>
        <Text style={[styles.fortnightBody, { fontSize: 8, color: colors.textMuted }]}>
          Saldo do passo 3 × {formatEarningsBRL(REAIS_POR_HORA_EXTRA)}/h.
        </Text>
        {hasLiquidas ? (
          <Text style={[styles.fortnightBody, { marginTop: 4 }]}>
            {formatHours(b.formattedExtraMinutes)} × {formatEarningsBRL(REAIS_POR_HORA_EXTRA)}/h ={" "}
            {formatEarningsBRL(b.formattedExtraValue)}
          </Text>
        ) : (
          <Text style={[styles.fortnightBody, { marginTop: 4, fontSize: 8, color: colors.textMuted }]}>
            R$ 0,00
          </Text>
        )}
      </View>

      <View style={[styles.fortnightTotalBlock, { marginTop: 8 }]}>
        <Text style={styles.fortnightTotalLabel}>5. Total da quinzena</Text>
        <Text style={styles.fortnightTotalFormula}>
          {formatEarningsBRL(b.clockNormalValue)}
          {hasLiquidas ? ` + ${formatEarningsBRL(b.formattedExtraValue)}` : ""} =
        </Text>
        <Text style={styles.fortnightTotalValue}>{formatEarningsBRL(b.totalValue)}</Text>
        <Text style={styles.fortnightCheckLine}>
          Tempo registrado no período: {formatHours(b.totalMinutes)}
        </Text>
      </View>
    </View>
  );
}

interface MonthReportPdfProps {
  monthLabel: string;
  /** Formato YYYY-MM (mesmo valor do relatório) para calcular o demonstrativo por quinzena. */
  monthKey: string;
  workDays: WorkDay[];
  weekSummaries: WeekSummary[];
  totalMinutes: number;
  closedAt: Timestamp | null;
}

export function MonthReportPdf({
  monthLabel,
  monthKey,
  workDays,
  weekSummaries,
  totalMinutes,
  closedAt,
}: MonthReportPdfProps) {
  const [fortnightFirst, fortnightSecond] = buildMonthFortnightBreakdowns(
    workDays,
    monthKey
  );
  const monthTotalFortnight = fortnightFirst.totalValue + fortnightSecond.totalValue;
  const daysWithWorkedTime = workDays.filter(
    (wd) => effectiveWorkedMinutes(wd) > 0
  ).length;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Relatório de Ponto</Text>
          <Text style={styles.subtitle}>{monthLabel}</Text>
          {closedAt && (
            <Text style={styles.closedBadge}>
              Mês fechado em {toDate(closedAt).toLocaleDateString("pt-BR")}
            </Text>
          )}
        </View>
        <View style={styles.body}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumo do mês</Text>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>
                Total trabalhado: {formatHours(totalMinutes)} —{" "}
                {daysWithWorkedTime} dia(s) com tempo registrado
              </Text>
              <Text style={[styles.summaryText, { marginTop: 8 }]}>
                Horas extras (acima da jornada prevista):{" "}
                {formatHours(totalExtraMinutes(workDays))}
              </Text>
            </View>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Por semana</Text>
            {weekSummaries.map((w, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.weekLabel}>Semana {w.weekLabel}</Text>
                <View style={styles.weekColRight}>
                  <Text style={styles.weekTotal}>
                    {formatHours(w.totalMinutes)}
                  </Text>
                  <Text style={styles.weekExtraLine}>
                    Extras: {formatHours(w.extraMinutes)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </Page>
      <Page size="A4" style={styles.page}>
        <View style={styles.fortnightPageBody}>
          <Text style={styles.fortnightMainTitle}>Quanto receber — por quinzena</Text>
          <Text style={styles.fortnightIntro}>
            {JORNADA_REFERENCIA_RESUMO} Extras brutas = trabalhado − horas esperadas; faltas reduzem
            o saldo extra; pagamento = normais + extras líquidas.
          </Text>
          <FortnightPdfCard b={fortnightFirst} title="Primeira quinzena" />
          <FortnightPdfCard b={fortnightSecond} title="Segunda quinzena" />
          <View style={styles.fortnightMonthTotalRow}>
            <Text style={styles.fortnightMonthTotalLabel}>
              Total do mês (1ª + 2ª quinzena)
            </Text>
            <Text style={styles.fortnightMonthTotalValue}>
              {formatEarningsBRL(monthTotalFortnight)}
            </Text>
          </View>
        </View>
      </Page>
      {chunkDaysToPages(workDays).map((chunk, chunkIndex) => (
        <Page key={chunkIndex} size="A4" style={styles.page}>
          <View style={styles.daysPageBody}>
            {chunk.map((wd) => {
              const dayRecords = getDayRecords(wd);
              const extraMin = extraMinutesForDay(wd);
              return (
                <View key={wd.id} style={styles.dayBlock}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayTitleLine}>
                      {formatDate(wd.date)} — {formatHours(effectiveWorkedMinutes(wd))}
                    </Text>
                    {extraMin > 0 ? (
                      <Text style={styles.dayExtra}>
                        Horas extras: {formatHours(extraMin)}
                      </Text>
                    ) : null}
                  </View>
                  {wd.punches.map((p, i) => (
                    <Text key={i} style={styles.punchLine}>
                      Entrada {formatTime(p.entry)}
                      {p.exit
                        ? ` → Saída ${formatTime(p.exit)}`
                        : " (em aberto)"}
                    </Text>
                  ))}
                  {dayRecords.length > 0 ? (
                    <>
                      <Text style={styles.feitosTitle}>Feitos:</Text>
                      {dayRecords.map((text, i) => (
                        <Text key={i} style={styles.feitosItem}>
                          • {text}
                        </Text>
                      ))}
                    </>
                  ) : null}
                </View>
              );
            })}
          </View>
        </Page>
      ))}
    </Document>
  );
}
