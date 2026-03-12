"use client";

import { useState } from "react";
import { punchIn, punchOut } from "@/lib/firestore";

interface ClockButtonProps {
  userId: string;
  isOpen: boolean;
  today: string; // YYYY-MM-DD
  onSuccess: () => void;
}

export function ClockButton({
  userId,
  isOpen,
  today,
  onSuccess,
}: ClockButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleClick() {
    setMessage(null);
    setLoading(true);
    try {
      if (isOpen) {
        await punchOut(userId);
        setMessage({ type: "success", text: "Saída registrada." });
      } else {
        await punchIn(userId, today);
        setMessage({ type: "success", text: "Entrada registrada." });
      }
      onSuccess();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao registrar.",
      });
    } finally {
      setLoading(false);
    }
  }

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
        {loading ? "..." : isOpen ? "Registrar saída" : "Registrar entrada"}
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
