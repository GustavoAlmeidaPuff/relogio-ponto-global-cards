"use client";

import { useState } from "react";

const BUTTON_TIMEOUT_MS = 12_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

interface ClockButtonProps {
  isOpen: boolean;
  openDetails: { entry: { toMillis: () => number } } | null;
  onRegisterEntry: () => void | Promise<void>;
  onRegisterExit: () => void | Promise<void>;
}

/**
 * Botão de entrada/saída: chama Firestore e nunca fica preso em "..." por tempo indefinido.
 */
export function ClockButton({
  isOpen,
  openDetails,
  onRegisterEntry,
  onRegisterExit,
}: ClockButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleEntry() {
    setMessage(null);
    setLoading(true);
    try {
      await withTimeout(Promise.resolve(onRegisterEntry()), BUTTON_TIMEOUT_MS);
      setMessage({ type: "success", text: "Entrada registrada." });
    } catch {
      setMessage({
        type: "error",
        text: "Demorou demais ou falhou. Verifique a conexão e tente de novo.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleExit() {
    setMessage(null);
    setLoading(true);
    try {
      await withTimeout(Promise.resolve(onRegisterExit()), BUTTON_TIMEOUT_MS);
      setMessage({ type: "success", text: "Pausado." });
    } catch {
      setMessage({
        type: "error",
        text: "Demorou demais ou falhou. Verifique a conexão e tente de novo.",
      });
    } finally {
      setLoading(false);
    }
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
