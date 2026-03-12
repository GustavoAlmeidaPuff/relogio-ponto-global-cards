"use client";

import { useState, useEffect } from "react";
import { subscribeWorkDay } from "@/lib/firestore";
import type { WorkDay } from "@/types";

/**
 * Retorna o dia de trabalho com atualização em tempo real (onSnapshot).
 * Qualquer aba ou dispositivo que altere o documento atualiza todos os outros.
 */
export function useWorkDay(userId: string | undefined, date: string) {
  const [workDay, setWorkDay] = useState<WorkDay | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !date) {
      setWorkDay(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeWorkDay(userId, date, (wd) => {
      setWorkDay(wd);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId, date]);

  return { workDay, loading };
}
