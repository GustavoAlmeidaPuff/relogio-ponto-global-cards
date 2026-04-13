"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { getWorkDay, upsertWorkDayPunches, setWorkDayHoliday } from "@/lib/firestore";
import { effectiveWorkedMinutes, formatHours, expectedMinutesForDate } from "@/hooks/useMonthReport";
import type { WorkDay, Punch } from "@/types";
import { PunchList } from "@/components/PunchList";

function formatDayLabel(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function tsToTimeStr(ts: Timestamp): string {
  return ts.toDate().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function timeStrToTs(date: string, time: string): Timestamp {
  return Timestamp.fromDate(new Date(`${date}T${time}:00`));
}

interface EditPunch {
  entry: string;
  exit: string;
}

function punchesToEdit(punches: Punch[]): EditPunch[] {
  return punches.map((p) => ({
    entry: tsToTimeStr(p.entry),
    exit: p.exit ? tsToTimeStr(p.exit) : "",
  }));
}

function editToPunches(date: string, edits: EditPunch[]): Punch[] {
  return edits
    .filter((e) => e.entry.trim() !== "")
    .map((e) => ({
      entry: timeStrToTs(date, e.entry),
      exit: e.exit.trim() ? timeStrToTs(date, e.exit) : null,
    }));
}

function PageHeader({
  title,
  email,
  onSignOut,
}: {
  title: string;
  email: string;
  onSignOut: () => void;
}) {
  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center flex-wrap gap-2">
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold text-slate-800 capitalize truncate">
          {title}
        </h1>
      </div>
      <nav className="flex-1 flex items-center justify-center gap-4 min-w-0">
        <Link href="/dashboard" className="text-slate-600 hover:text-slate-800">
          Hoje
        </Link>
        <Link href="/relatorios" className="text-slate-600 hover:text-slate-800">
          Relatórios
        </Link>
      </nav>
      <div className="flex-1 flex items-center justify-end gap-4 min-w-0">
        <span className="text-slate-500 text-sm truncate max-w-[180px] sm:max-w-none">
          {email}
        </span>
        <button
          type="button"
          onClick={onSignOut}
          className="text-slate-500 hover:text-slate-700 text-sm flex-shrink-0"
        >
          Sair
        </button>
      </div>
    </header>
  );
}

function PunchEditor({
  date,
  initialPunches,
  onSave,
  onCancel,
}: {
  date: string;
  initialPunches: EditPunch[];
  onSave: (punches: Punch[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [punches, setPunches] = useState<EditPunch[]>(
    initialPunches.length > 0 ? initialPunches : [{ entry: "", exit: "" }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updatePunch(i: number, field: "entry" | "exit", value: string) {
    setPunches((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  function removePunch(i: number) {
    setPunches((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addPunch() {
    setPunches((prev) => [...prev, { entry: "", exit: "" }]);
  }

  async function handleSave() {
    setError(null);
    // Validate: all entries must have an entry time
    const hasEmpty = punches.some((p) => p.entry.trim() === "");
    if (hasEmpty) {
      setError("Preencha o horário de entrada em todas as batidas.");
      return;
    }
    // Validate exit > entry when exit is set
    for (const p of punches) {
      if (p.exit.trim() && p.exit <= p.entry) {
        setError("O horário de saída deve ser depois da entrada.");
        return;
      }
    }
    setSaving(true);
    try {
      await onSave(editToPunches(date, punches));
    } catch (e) {
      setError((e as Error).message ?? "Erro ao salvar.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {punches.map((p, i) => (
        <div
          key={i}
          className="flex items-center gap-2 flex-wrap bg-white border border-slate-200 rounded-lg p-3"
        >
          <span className="text-sm text-slate-500 w-6 text-right">{i + 1}.</span>
          <div className="flex items-center gap-1">
            <label className="text-sm text-slate-600">Entrada</label>
            <input
              type="time"
              value={p.entry}
              onChange={(e) => updatePunch(i, "entry", e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={saving}
            />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-sm text-slate-600">Saída</label>
            <input
              type="time"
              value={p.exit}
              onChange={(e) => updatePunch(i, "exit", e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={saving}
            />
          </div>
          <button
            type="button"
            onClick={() => removePunch(i)}
            disabled={saving}
            className="ml-auto text-slate-400 hover:text-red-500 text-lg leading-none px-1 disabled:opacity-40"
            title="Remover batida"
          >
            ×
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addPunch}
        disabled={saving}
        className="text-blue-600 hover:text-blue-800 text-sm disabled:opacity-40"
      >
        + Adicionar batida
      </button>

      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function DiaPage() {
  const params = useParams();
  const router = useRouter();
  const mes = (params.mes as string) || "";
  const dia = (params.dia as string) || "";
  const validMes = /^\d{4}-\d{2}$/.test(mes) ? mes : null;
  const validDia = /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : null;
  const { user, loading: authLoading, signOut } = useAuth();
  const [workDay, setWorkDay] = useState<WorkDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [holidayLoading, setHolidayLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.uid || !validDia) {
      setWorkDay(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const wd = await getWorkDay(user.uid, validDia);
      setWorkDay(wd);
    } catch {
      setWorkDay(null);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, validDia]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  const handleSignOut = useCallback(
    () => signOut().then(() => router.replace("/login")),
    [signOut, router]
  );

  const handleSave = useCallback(
    async (punches: Punch[]) => {
      if (!user?.uid || !validDia) return;
      await upsertWorkDayPunches(user.uid, validDia, punches);
      await load();
      setEditing(false);
    },
    [user?.uid, validDia, load]
  );

  const handleToggleHoliday = useCallback(
    async (holiday: boolean) => {
      if (!user?.uid || !validDia) return;
      setHolidayLoading(true);
      try {
        await setWorkDayHoliday(user.uid, validDia, holiday);
        await load();
      } finally {
        setHolidayLoading(false);
      }
    },
    [user?.uid, validDia, load]
  );

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Carregando...</div>
      </div>
    );
  }

  if (!validMes || !validDia) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Data inválida.</p>
          <Link href="/relatorios" className="text-blue-600 hover:underline">
            Voltar aos relatórios
          </Link>
        </div>
      </div>
    );
  }

  const monthLabel = new Date(validMes + "-01").toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Carregando...</p>
      </div>
    );
  }

  // Day doesn't exist yet — allow creating it
  if (!workDay) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader
          title="Dia"
          email={user.email ?? ""}
          onSignOut={handleSignOut}
        />
        <main className="max-w-3xl mx-auto p-4 sm:p-6">
          <Link
            href={`/relatorios/mes/${validMes}`}
            className="inline-block text-slate-600 hover:text-slate-800 text-sm mb-4"
          >
            ← Voltar para {monthLabel}
          </Link>

          {editing ? (
            <>
              <h2 className="text-lg font-semibold text-slate-800 mb-1 capitalize">
                {formatDayLabel(validDia)}
              </h2>
              <p className="text-slate-500 text-sm mb-4">
                Criando novo dia — informe os horários abaixo.
              </p>
              <PunchEditor
                date={validDia}
                initialPunches={[]}
                onSave={handleSave}
                onCancel={() => setEditing(false)}
              />
            </>
          ) : (
            <>
              <p className="text-slate-600 mb-4">
                Nenhum registro encontrado para este dia.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Criar este dia
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleHoliday(true)}
                  disabled={holidayLoading}
                  className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-60"
                >
                  {holidayLoading ? "Salvando..." : "Marcar como feriado"}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  const records =
    workDay.records && workDay.records.length > 0
      ? workDay.records
      : workDay.notes
      ? [workDay.notes]
      : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title={formatDayLabel(workDay.date)}
        email={user.email ?? ""}
        onSignOut={handleSignOut}
      />
      <main className="max-w-3xl mx-auto p-4 sm:p-6">
        <Link
          href={`/relatorios/mes/${validMes}`}
          className="inline-block text-slate-600 hover:text-slate-800 text-sm mb-4"
        >
          ← Voltar para {monthLabel}
        </Link>

        <section className="mb-6">
          <p className="text-slate-700">
            Total do dia:{" "}
            <strong>{formatHours(effectiveWorkedMinutes(workDay))}</strong>
          </p>
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-800">
              Entrada e saída
            </h2>
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Editar horários
              </button>
            )}
          </div>

          {editing ? (
            <PunchEditor
              date={validDia}
              initialPunches={punchesToEdit(workDay.punches)}
              onSave={handleSave}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <PunchList punches={workDay.punches} />
          )}
        </section>

        {!editing && records.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">
              O que fiz
            </h2>
            <ul className="space-y-2">
              {records.map((text, i) => (
                <li
                  key={i}
                  className="p-3 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm whitespace-pre-wrap"
                >
                  {text}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
