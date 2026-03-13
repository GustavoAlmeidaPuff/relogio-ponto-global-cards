"use client";

import { useCallback, useState } from "react";
import {
  getLocalOpenPunch,
  setLocalOpenPunch,
  clearLocalOpenPunch,
  setClosedDay,
  isDayClosed as checkDayClosed,
  getLocalIntervals,
  addLocalInterval,
} from "@/lib/localPunch";
import type { Timestamp } from "firebase/firestore";

export interface OpenPunchDetails {
  date: string;
  entry: Timestamp | { toMillis: () => number };
}

/**
 * Estado do ponto baseado apenas em localStorage.
 * Resposta instantânea, sem depender de rede ou Firestore.
 */
export function useLocalPunch(userId: string | undefined, today: string) {
  const [version, setVersion] = useState(0);

  const localPunch = getLocalOpenPunch();
  const localIntervals = getLocalIntervals(today);

  const isOpen =
    !!userId &&
    !!localPunch &&
    localPunch.userId === userId &&
    localPunch.date === today;

  const openDetails: OpenPunchDetails | null = isOpen
    ? {
        date: localPunch!.date,
        entry: { toMillis: () => localPunch!.entryAt },
      }
    : null;

  const registerEntry = useCallback(() => {
    if (!userId) return;
    setLocalOpenPunch({ userId, date: today, entryAt: Date.now() });
    setVersion((v) => v + 1);
  }, [userId, today]);

  const registerExit = useCallback(
    (entryAt?: number) => {
      if (entryAt !== undefined) {
        addLocalInterval(today, entryAt, Date.now());
      }
      clearLocalOpenPunch();
      setVersion((v) => v + 1);
    },
    [today]
  );

  const refresh = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  const isDayClosed = checkDayClosed(today);

  const closeDay = useCallback(() => {
    clearLocalOpenPunch();
    setClosedDay(today);
    setVersion((v) => v + 1);
  }, [today]);

  return { isOpen, openDetails, localIntervals, isDayClosed, registerEntry, registerExit, closeDay, refresh };
}
