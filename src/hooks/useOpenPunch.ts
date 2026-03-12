"use client";

import { useState, useEffect, useCallback } from "react";
import { hasOpenPunch } from "@/lib/firestore";

export function useOpenPunch(userId: string | undefined) {
  const [isOpen, setIsOpen] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setIsOpen(null);
      return;
    }
    try {
      const open = await hasOpenPunch(userId);
      setIsOpen(open);
    } catch {
      setIsOpen(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { isOpen, refresh };
}
