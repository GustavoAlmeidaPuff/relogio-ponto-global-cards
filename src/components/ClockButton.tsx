"use client";

import { useState } from "react";

const BUTTON_TIMEOUT_MS = 35_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

function getErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: string })?.code ?? "";
  if (typeof err === "object" && err !== null) {
    try {
      console.error("[ClockButton] Erro ao registrar:", err);
    } catch {
      // ignore
    }
  }
  if (msg.includes("timeout") || msg.includes("Demorou")) return "Demorou demais. Tente de novo.";
  if (msg.includes("expediente em aberto") || msg.includes("Nenhum expediente")) return msg;
  if (msg.includes("Firebase não está") || msg.includes("disponível")) return "Sistema ainda carregando. Aguarde e tente em instantes.";
  if (code === "permission-denied" || msg.toLowerCase().includes("permission")) return "Sem permissão no banco. Confira as regras do Firestore e faça deploy.";
  if (code === "unavailable" || msg.includes("unavailable")) return "Firestore indisponível. Tente em alguns segundos.";
  if (code === "failed-precondition") return "Condição do banco falhou. Tente de novo.";
  if (msg.length > 0 && msg.length <= 180) return msg;
  return "Não foi possível registrar. Tente de novo. (Abra o Console F12 para detalhes.)";
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
    } catch (err) {
      setMessage({ type: "error", text: getErrorMessage(err) });
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
    } catch (err) {
      setMessage({ type: "error", text: getErrorMessage(err) });
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
