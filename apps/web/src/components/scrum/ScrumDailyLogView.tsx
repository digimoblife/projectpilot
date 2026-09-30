"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  Loader2,
  Plus,
  Save,
  Trash2,
  User,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScrumEntry {
  id: string;
  session_id: string;
  project_id: string;
  member_id: string | null;
  member_name: string;
  what_done: string;
  issues: string | null;
  what_next: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

interface ScrumSession {
  id: string;
  project_id: string;
  session_date: string;
  week_number: number;
  week_year: number;
  facilitator_id: string | null;
  notes: string | null;
  entries: ScrumEntry[];
  created_at: string;
  updated_at: string;
}

interface EntryFormState {
  member_name: string;
  what_done: string;
  issues: string;
  what_next: string;
}

const EMPTY_FORM: EntryFormState = {
  member_name: "",
  what_done: "",
  issues: "",
  what_next: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Entry Card ───────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  onEdit,
  onDelete,
  readonly = false,
}: {
  entry: ScrumEntry;
  onEdit: (entry: ScrumEntry) => void;
  onDelete: (entryId: string) => void;
  readonly?: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs hover:shadow-xs transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <span className="text-sm font-bold text-slate-900">
            {entry.member_name}
          </span>
        </div>
        {!readonly && (
          <div className="flex items-center gap-1">
            {confirmDelete ? (
              <>
                <button
                  onClick={() => onDelete(entry.id)}
                  className="px-2 py-1 text-[11px] font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  Hapus
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 text-[11px] font-semibold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onEdit(entry)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Edit entry"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Hapus entry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-2.5 text-xs">
        {/* What Done */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="font-semibold text-slate-600">What Have Done</span>
          </div>
          <p className="text-slate-700 leading-relaxed pl-5 whitespace-pre-line">
            {entry.what_done}
          </p>
        </div>

        {/* Issues */}
        {entry.issues && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-semibold text-slate-600">Issue / Kendala</span>
            </div>
            <p className="text-slate-700 leading-relaxed pl-5 whitespace-pre-line bg-amber-50 rounded-lg px-2 py-1.5 border border-amber-100">
              {entry.issues}
            </p>
          </div>
        )}

        {/* What Next */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="font-semibold text-slate-600">What To Do Next</span>
          </div>
          <p className="text-slate-700 leading-relaxed pl-5 whitespace-pre-line">
            {entry.what_next}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Entry Form ───────────────────────────────────────────────────────────────

function EntryForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: EntryFormState;
  onSave: (data: EntryFormState) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<EntryFormState>(initial);

  const set = (key: keyof EntryFormState) =>
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.member_name.trim() || !form.what_done.trim() || !form.what_next.trim()) return;
    onSave(form);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-50 border-2 border-slate-900 rounded-xl p-4 space-y-4"
    >
      <h4 className="text-xs font-bold text-slate-900">
        {initial.member_name ? `Edit: ${initial.member_name}` : "Tambah Entry Scrum"}
      </h4>

      {/* Member Name */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-slate-600">
          Nama Programmer <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={form.member_name}
          onChange={set("member_name")}
          placeholder="Contoh: Budi Santoso"
          required
          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-slate-900 placeholder:text-slate-400"
        />
      </div>

      {/* What Done */}
      <div className="space-y-1">
        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
          <Check className="w-3 h-3 text-emerald-500" />
          What Have Done <span className="text-rose-500">*</span>
        </label>
        <textarea
          value={form.what_done}
          onChange={set("what_done")}
          placeholder="Apa yang sudah dikerjakan hari ini?"
          required
          rows={3}
          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-slate-900 placeholder:text-slate-400 resize-none"
        />
      </div>

      {/* Issues */}
      <div className="space-y-1">
        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
          <AlertCircle className="w-3 h-3 text-amber-500" />
          Issue / Kendala{" "}
          <span className="text-slate-400 font-normal">(opsional)</span>
        </label>
        <textarea
          value={form.issues}
          onChange={set("issues")}
          placeholder="Ada kendala? Tulis di sini..."
          rows={2}
          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 text-slate-900 placeholder:text-slate-400 resize-none"
        />
      </div>

      {/* What Next */}
      <div className="space-y-1">
        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
          <Clock className="w-3 h-3 text-blue-500" />
          What To Do Next <span className="text-rose-500">*</span>
        </label>
        <textarea
          value={form.what_next}
          onChange={set("what_next")}
          placeholder="Apa yang akan dikerjakan selanjutnya?"
          required
          rows={3}
          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-slate-900 placeholder:text-slate-400 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={isSaving || !form.member_name.trim() || !form.what_done.trim() || !form.what_next.trim()}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          Simpan Entry
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all active:scale-[0.98] cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          Batal
        </button>
      </div>
    </form>
  );
}

// ─── History Panel ────────────────────────────────────────────────────────────

function HistoryPanel({
  projectId,
  currentDate,
}: {
  projectId: string;
  currentDate: string;
}) {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<ScrumSession[]>([]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecentSessions();
  }, [projectId, token]);

  async function fetchRecentSessions() {
    setIsLoading(true);
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};
    try {
      const res = await apiClient<ScrumSession[]>(
        `/projects/${projectId}/scrum/sessions`,
        { headers }
      );
      if (res.data) {
        // Exclude today's session from history
        const past = res.data.filter((s) => s.session_date !== currentDate);
        setSessions(past);
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-xs text-slate-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Memuat histori...
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-400">
        Belum ada histori Scrum sebelumnya.
      </div>
    );
  }

  const session = sessions[historyIdx];

  return (
    <div className="space-y-3">
      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setHistoryIdx((i) => Math.min(i + 1, sessions.length - 1))}
          disabled={historyIdx >= sessions.length - 1}
          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-semibold text-slate-700 text-center">
          {formatDate(session.session_date)}
        </span>
        <button
          onClick={() => setHistoryIdx((i) => Math.max(i - 1, 0))}
          disabled={historyIdx <= 0}
          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* History entries (read-only, compact) */}
      {session.entries.length === 0 ? (
        <p className="text-center text-xs text-slate-400">Sesi tanpa entry.</p>
      ) : (
        <div className="space-y-2">
          {session.entries.map((e) => (
            <div
              key={e.id}
              className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs"
            >
              <div className="flex items-center gap-1.5">
                <User className="w-3 h-3 text-slate-400" />
                <span className="font-bold text-slate-800">{e.member_name}</span>
              </div>
              <div className="pl-4 space-y-1.5">
                <div>
                  <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">
                    Done
                  </span>
                  <p className="text-slate-600 leading-relaxed mt-0.5 whitespace-pre-line">
                    {e.what_done}
                  </p>
                </div>
                {e.issues && (
                  <div>
                    <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">
                      Issue
                    </span>
                    <p className="text-amber-700 leading-relaxed mt-0.5 whitespace-pre-line">
                      {e.issues}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">
                    Next →
                  </span>
                  <p className="text-slate-700 leading-relaxed mt-0.5 font-medium whitespace-pre-line">
                    {e.what_next}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-center text-slate-400">
        {historyIdx + 1} dari {sessions.length} sesi lalu
      </p>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function ScrumDailyLogView({ projectId }: { projectId: string }) {
  const { token } = useAuth();
  const [todaySession, setTodaySession] = useState<ScrumSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScrumEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = todayISODate();

  const headers = useCallback(
    (): Record<string, string> =>
      token ? { Authorization: `Bearer ${token}` } : {},
    [token]
  );

  useEffect(() => {
    fetchTodaySession();
  }, [projectId, token]);

  async function fetchTodaySession() {
    setIsLoadingSession(true);
    setError(null);
    try {
      const res = await apiClient<ScrumSession>(
        `/projects/${projectId}/scrum/sessions/today`,
        { headers: headers() }
      );
      if (res.data) {
        setTodaySession(res.data);
      } else if (res.status === 404) {
        setTodaySession(null);
      }
    } catch {
      setTodaySession(null);
    } finally {
      setIsLoadingSession(false);
    }
  }

  async function handleCreateSession() {
    setIsCreatingSession(true);
    setError(null);
    try {
      const res = await apiClient<ScrumSession>(
        `/projects/${projectId}/scrum/sessions`,
        {
          method: "POST",
          headers: { ...headers(), "Content-Type": "application/json" },
          body: JSON.stringify({ session_date: today }),
        }
      );
      if (res.data) {
        setTodaySession(res.data);
      } else {
        setError(res.error || "Gagal membuat sesi.");
      }
    } catch {
      setError("Gagal membuat sesi Scrum hari ini.");
    } finally {
      setIsCreatingSession(false);
    }
  }

  async function handleAddEntry(data: EntryFormState) {
    if (!todaySession) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await apiClient<ScrumEntry>(
        `/projects/${projectId}/scrum/sessions/${todaySession.id}/entries`,
        {
          method: "POST",
          headers: { ...headers(), "Content-Type": "application/json" },
          body: JSON.stringify({
            member_name: data.member_name.trim(),
            what_done: data.what_done.trim(),
            issues: data.issues.trim() || null,
            what_next: data.what_next.trim(),
          }),
        }
      );
      if (res.data) {
        setTodaySession((prev) =>
          prev
            ? { ...prev, entries: [...prev.entries, res.data!] }
            : prev
        );
        setShowAddForm(false);
      } else {
        setError(res.error || "Gagal menyimpan entry.");
      }
    } catch {
      setError("Terjadi kesalahan saat menyimpan entry.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateEntry(data: EntryFormState) {
    if (!todaySession || !editingEntry) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await apiClient<ScrumEntry>(
        `/projects/${projectId}/scrum/sessions/${todaySession.id}/entries/${editingEntry.id}`,
        {
          method: "PUT",
          headers: { ...headers(), "Content-Type": "application/json" },
          body: JSON.stringify({
            member_name: data.member_name.trim(),
            what_done: data.what_done.trim(),
            issues: data.issues.trim() || null,
            what_next: data.what_next.trim(),
          }),
        }
      );
      if (res.data) {
        setTodaySession((prev) =>
          prev
            ? {
                ...prev,
                entries: prev.entries.map((e) =>
                  e.id === editingEntry.id ? res.data! : e
                ),
              }
            : prev
        );
        setEditingEntry(null);
      } else {
        setError(res.error || "Gagal memperbarui entry.");
      }
    } catch {
      setError("Terjadi kesalahan saat memperbarui entry.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteEntry(entryId: string) {
    if (!todaySession) return;
    const originalEntries = [...todaySession.entries];
    setTodaySession((prev) =>
      prev ? { ...prev, entries: prev.entries.filter((e) => e.id !== entryId) } : prev
    );
    try {
      const res = await apiClient(
        `/projects/${projectId}/scrum/sessions/${todaySession.id}/entries/${entryId}`,
        { method: "DELETE", headers: headers() }
      );
      if (res.status !== 204 && res.status !== 200) {
        // rollback
        setTodaySession((prev) =>
          prev ? { ...prev, entries: originalEntries } : prev
        );
        setError("Gagal menghapus entry.");
      }
    } catch {
      setTodaySession((prev) =>
        prev ? { ...prev, entries: originalEntries } : prev
      );
      setError("Gagal menghapus entry.");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoadingSession) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat data Scrum...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ── LEFT: Today's Session ──────────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                📅 Scrum Harian
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {formatDate(today)}
              </p>
            </div>
            {todaySession && (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Sesi Aktif
                </span>
                <span className="text-[11px] text-slate-500">
                  {todaySession.entries.length} programmer
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto p-0.5 hover:bg-rose-100 rounded cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* No session yet */}
        {!todaySession ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center space-y-4">
            <div className="text-4xl">📋</div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Belum Ada Sesi Scrum Hari Ini
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Mulai sesi Scrum untuk merekap perkembangan tiap programmer hari ini.
              </p>
            </div>
            <button
              onClick={handleCreateSession}
              disabled={isCreatingSession}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isCreatingSession ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Mulai Scrum Hari Ini
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Entry list */}
            {todaySession.entries.map((entry) =>
              editingEntry?.id === entry.id ? (
                <EntryForm
                  key={entry.id}
                  initial={{
                    member_name: entry.member_name,
                    what_done: entry.what_done,
                    issues: entry.issues || "",
                    what_next: entry.what_next,
                  }}
                  onSave={handleUpdateEntry}
                  onCancel={() => setEditingEntry(null)}
                  isSaving={isSaving}
                />
              ) : (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={(e) => {
                    setEditingEntry(e);
                    setShowAddForm(false);
                  }}
                  onDelete={handleDeleteEntry}
                />
              )
            )}

            {/* Add form or button */}
            {showAddForm ? (
              <EntryForm
                initial={EMPTY_FORM}
                onSave={handleAddEntry}
                onCancel={() => setShowAddForm(false)}
                isSaving={isSaving}
              />
            ) : (
              !editingEntry && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl text-xs font-semibold text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Programmer
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT: History Panel ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-800">
              📖 Histori Scrum Sebelumnya
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Cocokkan &quot;Next&quot; kemarin dengan &quot;Done&quot; hari ini
            </p>
          </div>
          <div className="p-3">
            <HistoryPanel projectId={projectId} currentDate={today} />
          </div>
        </div>
      </div>
    </div>
  );
}
