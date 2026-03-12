"use client";

import { useState, useEffect } from "react";

export function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <p className="text-2xl sm:text-3xl font-mono text-slate-800 tabular-nums">
      {now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}
    </p>
  );
}
