"use client";

import type { Punch } from "@/types";
import { Timestamp } from "firebase/firestore";

function formatTime(ts: Timestamp | null): string {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date((ts as unknown as { seconds: number }).seconds * 1000);
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

interface PunchListProps {
  punches: Punch[];
}

export function PunchList({ punches }: PunchListProps) {
  if (punches.length === 0) {
    return (
      <p className="text-slate-500 text-sm">Nenhum registro hoje.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {punches.map((p, i) => (
        <li
          key={i}
          className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg"
        >
          <span className="text-slate-700">
            Entrada {formatTime(p.entry)}
            {p.exit ? ` → Saída ${formatTime(p.exit)}` : " (em aberto)"}
          </span>
        </li>
      ))}
    </ul>
  );
}
