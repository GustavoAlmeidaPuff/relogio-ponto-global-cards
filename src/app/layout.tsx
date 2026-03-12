import type { Metadata } from "next";
import dynamic from "next/dynamic";
import "./globals.css";

const AuthProvider = dynamic(
  () => import("@/contexts/AuthContext").then((m) => ({ default: m.AuthProvider })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        Carregando…
      </div>
    ),
  }
);

export const metadata: Metadata = {
  title: "Relógio Ponto",
  description: "Controle de ponto e relatórios",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
