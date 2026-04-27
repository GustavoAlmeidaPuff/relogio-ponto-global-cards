"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";

/**
 * Provedor de autenticação no cliente. O módulo `@/lib/firebase` já evita
 * inicializar Auth/Firestore no SSR; não usar `dynamic(..., { ssr: false })`
 * aqui para o AuthProvider, para que `useAuth` nunca renderize fora do contexto.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
