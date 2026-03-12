"use client";

import { useEffect, useRef } from "react";
import { updateWorkDayTotal } from "@/lib/firestore";

const SYNC_INTERVAL_MS = 10_000;

/**
 * Sincroniza o total de tempo trabalhado no dia para o Firestore a cada 10 segundos.
 */
export function useSyncWorkDayTotal(
  userId: string | undefined,
  date: string,
  totalWorkedMs: number
): void {
  const lastSynced = useRef(0);

  useEffect(() => {
    if (!userId || !date) return;

    const sync = () => {
      updateWorkDayTotal(userId, date, totalWorkedMs)
        .then(() => {
          lastSynced.current = Date.now();
        })
        .catch(() => {
          // Silencioso: não bloqueia a UI
        });
    };

    const id = setInterval(sync, SYNC_INTERVAL_MS);
    sync(); // primeira vez logo

    return () => clearInterval(id);
  }, [userId, date, totalWorkedMs]);
}
