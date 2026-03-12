"use client";

import { useState, useEffect, useCallback } from "react";
import { getWorkDay } from "@/lib/firestore";
import type { WorkDay } from "@/types";

export function useWorkDay(userId: string | undefined, date: string) {
  const [workDay, setWorkDay] = useState<WorkDay | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setWorkDay(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const wd = await getWorkDay(userId, date);
      setWorkDay(wd);
    } catch {
      setWorkDay(null);
    } finally {
      setLoading(false);
    }
  }, [userId, date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { workDay, loading, refresh };
}
