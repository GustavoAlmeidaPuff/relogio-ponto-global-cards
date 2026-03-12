"use client";

import { useState, useEffect, useCallback } from "react";
import { getOpenPunchDocument } from "@/lib/firestore";
import { getLocalOpenPunch } from "@/lib/localPunch";
import type { Timestamp } from "firebase/firestore";

const OPEN_PUNCH_TIMEOUT_MS = 6000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export interface OpenPunchDetails {
  date: string;
  entry: Timestamp;
}

export function useOpenPunch(userId: string | undefined) {
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [openDetails, setOpenDetails] = useState<OpenPunchDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setIsOpen(null);
      setOpenDetails(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const open = await withTimeout(
        getOpenPunchDocument(userId),
        OPEN_PUNCH_TIMEOUT_MS
      );
      if (open === null) {
        // Timeout ou falha: usar batida local se houver (modo offline)
        const local = getLocalOpenPunch();
        if (local?.userId === userId) {
          setIsOpen(true);
          setOpenDetails({
            date: local.date,
            entry: { toMillis: () => local.entryAt } as unknown as Timestamp,
          });
        } else {
          setIsOpen(false);
          setOpenDetails(null);
        }
      } else {
        setIsOpen(true);
        const date = open.docRef.id.slice(userId.length + 1);
        setOpenDetails({
          date,
          entry: open.punches[open.punchIndex].entry,
        });
      }
    } catch {
      const local = getLocalOpenPunch();
      if (local?.userId === userId) {
        setIsOpen(true);
        setOpenDetails({
          date: local.date,
          entry: { toMillis: () => local.entryAt } as unknown as Timestamp,
        });
      } else {
        setIsOpen(false);
        setOpenDetails(null);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { isOpen, openDetails, loading, refresh };
}
