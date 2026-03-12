"use client";

import { useState, useEffect, useCallback } from "react";
import { updateWorkDayRecords } from "@/lib/firestore";

interface DayNotesProps {
  userId: string;
  date: string;
  /** Lista de registros "o que fiz". Se não existir, usa initialNotes (compatibilidade). */
  initialRecords?: string[];
  /** @deprecated use initialRecords */
  initialNotes?: string;
  dayStarted: boolean;
  onUpdate?: () => void;
}

function normalizeRecords(records?: string[], notes?: string): string[] {
  if (records?.length) return records;
  if (notes) return notes.split("\n").filter((s) => s.trim());
  return [];
}

export function DayNotes({
  userId,
  date,
  initialRecords,
  initialNotes = "",
  dayStarted,
  onUpdate,
}: DayNotesProps) {
  const [records, setRecords] = useState<string[]>(() =>
    normalizeRecords(initialRecords, initialNotes)
  );
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRecords(normalizeRecords(initialRecords, initialNotes));
  }, [date, initialRecords, initialNotes]);

  const addRecord = useCallback(async () => {
    if (!dayStarted) return;
    const text = input.trim();
    if (!text) return;
    const newRecords = [...records, text];
    setRecords(newRecords);
    setInput("");
    setSaving(true);
    try {
      await updateWorkDayRecords(userId, date, newRecords);
      onUpdate?.();
    } finally {
      setSaving(false);
    }
  }, [dayStarted, input, records, userId, date, onUpdate]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter") return;
    if (e.shiftKey) return; // Shift+Enter = nova linha
    if (!dayStarted) return;
    e.preventDefault();
    addRecord();
  }

  return (
    <div className="space-y-2">
      <label htmlFor="day-notes" className="block text-sm font-medium text-slate-700">
        O que você fez hoje
      </label>
      {!dayStarted && (
        <p className="text-sm text-slate-500 bg-slate-100 rounded-lg px-3 py-2">
          Registre sua entrada para poder adicionar registros do dia.
        </p>
      )}
      {records.length > 0 && (
        <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
          {records.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
      <textarea
        id="day-notes"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        disabled={!dayStarted}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
        placeholder={
          dayStarted
            ? "Descreva uma atividade e pressione Enter para adicionar (Shift+Enter para nova linha)"
            : "Registre a entrada primeiro"
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addRecord}
          disabled={!dayStarted || saving || !input.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {saving ? "Salvando..." : "Adicionar registro"}
        </button>
        {dayStarted && (
          <span className="text-xs text-slate-500">
            Enter para adicionar · Shift+Enter para nova linha
          </span>
        )}
      </div>
    </div>
  );
}
