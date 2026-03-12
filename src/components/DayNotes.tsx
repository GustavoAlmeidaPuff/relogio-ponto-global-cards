"use client";

import { useState, useEffect, useRef } from "react";
import { updateWorkDayNotes } from "@/lib/firestore";

const DEBOUNCE_MS = 800;

interface DayNotesProps {
  userId: string;
  date: string;
  initialNotes: string;
  onUpdate?: () => void;
}

export function DayNotes({
  userId,
  date,
  initialNotes,
  onUpdate,
}: DayNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNotes(initialNotes);
  }, [date, initialNotes]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (notes === initialNotes) return;
    timerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await updateWorkDayNotes(userId, date, notes);
        onUpdate?.();
      } finally {
        setSaving(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notes, userId, date, initialNotes, onUpdate]);

  return (
    <div className="space-y-1">
      <label htmlFor="day-notes" className="block text-sm font-medium text-slate-700">
        O que você fez hoje
      </label>
      <textarea
        id="day-notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
        placeholder="Descreva suas atividades..."
      />
      {saving && <p className="text-xs text-slate-500">Salvando...</p>}
    </div>
  );
}
