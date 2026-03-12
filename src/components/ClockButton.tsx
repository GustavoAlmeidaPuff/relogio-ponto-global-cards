"use client";

import { useState } from "react";
import { punchIn, punchOut } from "@/lib/firestore";

interface ClockButtonProps {
  userId: string;
  isOpen: boolean;
  today: string;
  /** Ao pausar, passa o horário de entrada (ms) para o contador acumular o intervalo. */
  openDetails: { entry: { toMillis: () => number } } | null;
  onRegisterEntry: () => void;
  onRegisterExit: (entryAt?: number) => void;
  onRefresh?: () => void;
}

/**
 * Botão de entrada/saída: atualiza a UI na hora (localStorage).
 * Tenta sincronizar com Firestore em segundo plano, sem bloquear.
 */
export function ClockButton({
  userId,
  isOpen,
  today,
  openDetails,
  onRegisterEntry,
  onRegisterExit,
  onRefresh,
}: ClockButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleEntry() {
    setMessage(null);
    setLoading(true);
    onRegisterEntry();
    setMessage({ type: "success", text: "Entrada registrada." });
    setLoading(false);
    onRefresh?.();

    // Sincroniza com Firestore em background (não bloqueia)
    punchIn(userId, today)
      .then(() => onRefresh?.())
      .catch(() => {
        // Silencioso: já registramos localmente
      });
  }

  function handleExit() {
    setMessage(null);
    setLoading(true);
    const entryAt = isOpen && openDetails ? openDetails.entry.toMillis() : undefined;
    onRegisterExit(entryAt);
    setMessage({ type: "success", text: "Pausado." });
    setLoading(false);
    onRefresh?.();

    punchOut(userId)
      .then(() => onRefresh?.())
      .catch(() => {});
  }

  function handleClick() {
    if (isOpen) {
      handleExit();
    } else {
      handleEntry();
    }
  }

  const buttonLabel = loading ? "..." : isOpen ? "Pausar" : "Registrar entrada";

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`
          w-40 h-40 sm:w-48 sm:h-48 rounded-full text-lg sm:text-xl font-bold shadow-lg
          transition transform active:scale-95 disabled:opacity-70
          ${isOpen
            ? "bg-amber-500 hover:bg-amber-600 text-white"
            : "bg-emerald-600 hover:bg-emerald-700 text-white"
          }
        `}
      >
        {buttonLabel}
      </button>
      {message && (
        <p
          className={`text-sm ${
            message.type === "success" ? "text-green-700" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
