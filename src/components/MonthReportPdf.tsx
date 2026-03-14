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
import { totalMinutesForDay, formatHours } from "@/hooks/useMonthReport";
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
  dayPageBody: { paddingHorizontal: 40, paddingTop: 24, paddingBottom: 40 },
  dayBlock: {
    backgroundColor: colors.bgCard,
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 12,
    color: colors.text,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
});

interface MonthReportPdfProps {
  monthLabel: string;
  workDays: WorkDay[];
  weekSummaries: WeekSummary[];
  totalMinutes: number;
  closedAt: Timestamp | null;
}

export function MonthReportPdf({
  monthLabel,
  workDays,
  weekSummaries,
  totalMinutes,
  closedAt,
}: MonthReportPdfProps) {
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
                Total: {formatHours(totalMinutes)} — {workDays.length} dia(s) com
                registro
              </Text>
            </View>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Por semana</Text>
            {weekSummaries.map((w, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.weekLabel}>Semana {w.weekLabel}</Text>
                <Text style={styles.weekTotal}>
                  {formatHours(w.totalMinutes)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Page>
      {workDays.map((wd) => {
        const dayRecords = getDayRecords(wd);
        return (
          <Page key={wd.id} size="A4" style={styles.page}>
            <View style={styles.dayPageBody}>
              <View style={styles.dayBlock}>
                <Text style={styles.dayTitle}>
                  {formatDate(wd.date)} — {formatHours(totalMinutesForDay(wd))}
                </Text>
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
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
