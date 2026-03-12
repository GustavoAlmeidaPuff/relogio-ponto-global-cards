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

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10 },
  title: { fontSize: 18, marginBottom: 8 },
  subtitle: { fontSize: 12, marginBottom: 20, color: "#374151" },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, marginBottom: 8, fontWeight: "bold" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  dayBlock: { marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  dayTitle: { fontSize: 11, fontWeight: "bold", marginBottom: 4 },
  punchLine: { fontSize: 9, color: "#4b5563", marginBottom: 2 },
  notes: { fontSize: 9, marginTop: 4, color: "#6b7280" },
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
        <Text style={styles.title}>Relatório de Ponto</Text>
        <Text style={styles.subtitle}>{monthLabel}</Text>
        {closedAt && (
          <Text style={styles.subtitle}>
            Mês fechado em {toDate(closedAt).toLocaleDateString("pt-BR")}
          </Text>
        )}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo do mês</Text>
          <Text>
            Total: {formatHours(totalMinutes)} — {workDays.length} dia(s) com
            registro
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Por semana</Text>
          {weekSummaries.map((w, i) => (
            <View key={i} style={styles.row}>
              <Text>Semana {w.weekLabel}</Text>
              <Text>{formatHours(w.totalMinutes)}</Text>
            </View>
          ))}
        </View>
      </Page>
      {workDays.map((wd) => (
        <Page key={wd.id} size="A4" style={styles.page}>
          <View style={styles.dayBlock}>
            <Text style={styles.dayTitle}>
              {formatDate(wd.date)} — {formatHours(totalMinutesForDay(wd))}
            </Text>
            {wd.punches.map((p, i) => (
              <Text key={i} style={styles.punchLine}>
                Entrada {formatTime(p.entry)}
                {p.exit ? ` → Saída ${formatTime(p.exit)}` : " (em aberto)"}
              </Text>
            ))}
            {wd.notes ? (
              <Text style={styles.notes}>O que fiz: {wd.notes}</Text>
            ) : null}
          </View>
        </Page>
      ))}
    </Document>
  );
}
