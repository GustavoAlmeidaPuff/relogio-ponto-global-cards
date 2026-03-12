"use client";

import { useState } from "react";
import { closeMonth } from "@/lib/firestore";

interface CloseMonthButtonProps {
  userId: string;
  month: string;
  isOpenPunch: boolean;
  onClosed: () => void;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function CloseMonthButton({
  userId,
  month,
  isOpenPunch,
  onClosed,
}: CloseMonthButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(month);

  const [year] = month.split("-").map(Number);

  const disabled = isOpenPunch;

  async function handleClose() {
    setError("");
    setLoading(true);
    try {
      await closeMonth(userId, selectedMonth);
      setOpen(false);
      onClosed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fechar mês.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        Fechar mês
      </button>
      {disabled && (
        <p className="text-amber-700 text-sm">
          Registre sua saída antes de fechar o mês.
        </p>
      )}

      {open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Escolha o mês a fechar
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {Array.from({ length: 12 }, (_, i) => {
                const m = `${year}-${String(i + 1).padStart(2, "0")}`;
                const isSelected = selectedMonth === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMonth(m)}
                    className={`py-2 px-3 rounded-lg border text-sm ${
                      isSelected
                        ? "border-blue-600 bg-blue-50 text-blue-800"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {MONTHS[i]} {year}
                  </button>
                );
              })}
            </div>
            {error && (
              <p className="text-red-600 text-sm mb-3">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? "Fechando..." : "Fechar mês"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
