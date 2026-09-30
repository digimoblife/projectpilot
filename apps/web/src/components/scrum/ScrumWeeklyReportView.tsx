"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScrumEntry {
  id: string;
  member_name: string;
  what_done: string;
  issues: string | null;
  what_next: string;
}

interface ScrumSession {
  id: string;
  session_date: string;
  week_number: number;
  week_year: number;
  entries: ScrumEntry[];
}

interface ScrumWeekInfo {
  week_number: number;
  week_year: number;
  start_date: string;
  end_date: string;
  session_count: number;
  already_generated: boolean;
  report_id: string | null;
}

interface ScrumWeekPreview extends ScrumWeekInfo {
  sessions: ScrumSession[];
}

interface ScrumWeeklyReport {
  id: string;
  week_number: number;
  week_year: number;
  session_count: number;
  ai_summary: string | null;
  report_markdown: string | null;
  generated_at: string;
  created_at: string;
}

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

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Markdown Renderer (simple) ───────────────────────────────────────────────

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");

  const rendered = lines.map((line, idx) => {
    if (line.startsWith("# ")) {
      return (
        <h1 key={idx} className="text-base font-bold text-slate-900 mt-4 mb-2">
          {line.slice(2)}
        </h1>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h2
          key={idx}
          className="text-sm font-bold text-slate-800 mt-4 mb-1.5 pt-3 border-t border-slate-100"
        >
          {line.slice(3)}
        </h2>
      );
    }
    if (line.startsWith("### ")) {
      return (
        <h3
          key={idx}
          className="text-xs font-bold text-slate-800 mt-3 mb-1 flex items-center gap-1.5"
        >
          {line.slice(4)}
        </h3>
      );
    }
    if (line.startsWith("**") && line.endsWith("**")) {
      return (
        <p key={idx} className="text-xs font-semibold text-slate-700 my-0.5">
          {line.slice(2, -2)}
        </p>
      );
    }
    if (line.startsWith("- ")) {
      const text = line.slice(2);
      // Handle **bold:** prefix
      const boldMatch = text.match(/^\*\*(.+?):\*\*\s(.+)/);
      if (boldMatch) {
        return (
          <li key={idx} className="text-xs text-slate-700 my-0.5 ml-4">
            <span className="font-semibold">{boldMatch[1]}:</span>{" "}
            {boldMatch[2]}
          </li>
        );
      }
      return (
        <li key={idx} className="text-xs text-slate-700 my-0.5 ml-4">
          {text}
        </li>
      );
    }
    if (line.startsWith("---")) {
      return <hr key={idx} className="border-slate-200 my-3" />;
    }
    if (line.trim() === "") {
      return <div key={idx} className="h-1" />;
    }
    // Regular line — handle inline **bold**
    const parts = line.split(/\*\*(.+?)\*\*/g);
    return (
      <p key={idx} className="text-xs text-slate-700 leading-relaxed">
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <strong key={i} className="font-semibold text-slate-900">
              {part}
            </strong>
          ) : (
            part
          )
        )}
      </p>
    );
  });

  return <div className="space-y-0.5">{rendered}</div>;
}

// ─── Week Card ────────────────────────────────────────────────────────────────

function WeekCard({
  week,
  isSelected,
  onClick,
}: {
  week: ScrumWeekInfo;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div
            className={`text-[10px] font-bold uppercase tracking-wider ${
              isSelected ? "text-slate-300" : "text-slate-400"
            }`}
          >
            Minggu {week.week_number}, {week.week_year}
          </div>
          <div
            className={`text-xs font-semibold ${
              isSelected ? "text-white" : "text-slate-800"
            }`}
          >
            {formatShortDate(week.start_date)} –{" "}
            {formatShortDate(week.end_date)}
          </div>
          <div
            className={`text-[11px] ${
              isSelected ? "text-slate-300" : "text-slate-500"
            }`}
          >
            {week.session_count} sesi Scrum
          </div>
        </div>
        <div className="shrink-0">
          {week.already_generated ? (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                isSelected
                  ? "bg-emerald-400/20 text-emerald-300"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              ✓ Sudah Generate
            </span>
          ) : (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                isSelected
                  ? "bg-amber-400/20 text-amber-300"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              Belum Generate
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Report View ──────────────────────────────────────────────────────────────

function ReportView({
  report,
  onPrint,
}: {
  report: ScrumWeeklyReport;
  onPrint: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Laporan Minggu {report.week_number}, {report.week_year}
          </h3>
          <p className="text-[11px] text-slate-500">
            Dibuat:{" "}
            {new Date(report.created_at).toLocaleString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <button
          onClick={onPrint}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Print / Export PDF
        </button>
      </div>
      <div
        id="scrum-report-print"
        className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs"
      >
        {report.report_markdown ? (
          <MarkdownContent content={report.report_markdown} />
        ) : (
          <p className="text-xs text-slate-400">Konten laporan tidak tersedia.</p>
        )}
      </div>
    </div>
  );
}

// ─── Preview View ─────────────────────────────────────────────────────────────

function PreviewView({
  preview,
  onGenerate,
  isGenerating,
}: {
  preview: ScrumWeekPreview;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(
    new Set(preview.sessions.map((s) => s.id))
  );

  const toggle = (id: string) =>
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const totalEntries = preview.sessions.reduce(
    (sum, s) => sum + s.entries.length,
    0
  );
  const issueCount = preview.sessions
    .flatMap((s) => s.entries)
    .filter((e) => e.issues).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
          <div className="text-xl font-bold text-slate-900">
            {preview.session_count}
          </div>
          <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
            Sesi Scrum
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
          <div className="text-xl font-bold text-slate-900">{totalEntries}</div>
          <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
            Total Entry
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-200">
          <div className="text-xl font-bold text-amber-700">{issueCount}</div>
          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
            Issue Dilaporkan
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-slate-900">
            {preview.already_generated
              ? "⚠️ Generate Ulang Laporan"
              : "🚀 Generate Laporan Mingguan"}
          </h4>
          <p className="text-[11px] text-slate-500">
            {preview.already_generated
              ? "Laporan sudah ada. Generate ulang akan menimpa laporan sebelumnya."
              : "AI akan merangkum semua data Scrum minggu ini menjadi laporan formal."}
          </p>
        </div>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shrink-0"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Sedang Generate...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Generate dengan AI
            </>
          )}
        </button>
      </div>

      {/* Sessions preview */}
      <div className="space-y-3">
        {preview.sessions.map((session) => (
          <div
            key={session.id}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
          >
            <button
              onClick={() => toggle(session.id)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-800">
                  {formatDate(session.session_date)}
                </span>
                <span className="text-[11px] text-slate-400">
                  {session.entries.length} programmer
                </span>
              </div>
              {expandedSessions.has(session.id) ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
            {expandedSessions.has(session.id) && (
              <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
                {session.entries.map((entry) => (
                  <div key={entry.id} className="text-xs space-y-1.5">
                    <div className="font-bold text-slate-800">
                      👤 {entry.member_name}
                    </div>
                    <div className="pl-4 space-y-1 text-slate-600">
                      <p>
                        <span className="font-semibold text-emerald-600">
                          ✅ Done:{" "}
                        </span>
                        {entry.what_done}
                      </p>
                      {entry.issues && (
                        <p>
                          <span className="font-semibold text-amber-600">
                            ⚠️ Issue:{" "}
                          </span>
                          {entry.issues}
                        </p>
                      )}
                      <p>
                        <span className="font-semibold text-blue-600">
                          🎯 Next:{" "}
                        </span>
                        {entry.what_next}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function ScrumWeeklyReportView({ projectId }: { projectId: string }) {
  const { token } = useAuth();
  const [weeks, setWeeks] = useState<ScrumWeekInfo[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<ScrumWeekInfo | null>(null);
  const [preview, setPreview] = useState<ScrumWeekPreview | null>(null);
  const [report, setReport] = useState<ScrumWeeklyReport | null>(null);
  const [isLoadingWeeks, setIsLoadingWeeks] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"preview" | "report">("preview");

  const headers = (): Record<string, string> =>
    token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    fetchWeeks();
  }, [projectId, token]);

  async function fetchWeeks() {
    setIsLoadingWeeks(true);
    try {
      const res = await apiClient<ScrumWeekInfo[]>(
        `/projects/${projectId}/scrum/weeks`,
        { headers: headers() }
      );
      if (res.data) {
        setWeeks(res.data);
        if (res.data.length > 0) {
          handleSelectWeek(res.data[0]);
        }
      }
    } finally {
      setIsLoadingWeeks(false);
    }
  }

  async function handleSelectWeek(week: ScrumWeekInfo) {
    setSelectedWeek(week);
    setPreview(null);
    setReport(null);
    setError(null);
    setIsLoadingDetail(true);

    try {
      // Load preview
      const previewRes = await apiClient<ScrumWeekPreview>(
        `/projects/${projectId}/scrum/weeks/${week.week_year}/${week.week_number}/preview`,
        { headers: headers() }
      );
      if (previewRes.data) setPreview(previewRes.data);

      // If already generated, load report
      if (week.already_generated && week.report_id) {
        const reportRes = await apiClient<ScrumWeeklyReport>(
          `/projects/${projectId}/scrum/reports/${week.report_id}`,
          { headers: headers() }
        );
        if (reportRes.data) {
          setReport(reportRes.data);
          setViewMode("report");
        }
      } else {
        setViewMode("preview");
      }
    } catch {
      setError("Gagal memuat data minggu ini.");
    } finally {
      setIsLoadingDetail(false);
    }
  }

  async function handleGenerate() {
    if (!selectedWeek) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await apiClient<ScrumWeeklyReport>(
        `/projects/${projectId}/scrum/weeks/${selectedWeek.week_year}/${selectedWeek.week_number}/generate`,
        {
          method: "POST",
          headers: { ...headers(), "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      if (res.data) {
        setReport(res.data);
        setViewMode("report");
        // Update week list to mark as generated
        setWeeks((prev) =>
          prev.map((w) =>
            w.week_number === selectedWeek.week_number &&
            w.week_year === selectedWeek.week_year
              ? { ...w, already_generated: true, report_id: res.data!.id }
              : w
          )
        );
        setSelectedWeek((prev) =>
          prev
            ? { ...prev, already_generated: true, report_id: res.data!.id }
            : prev
        );
      } else {
        setError(res.error || "Gagal generate laporan.");
      }
    } catch {
      setError("Terjadi kesalahan saat generate laporan.");
    } finally {
      setIsGenerating(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ── LEFT: Week List ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-800">
              📊 Daftar Minggu
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Pilih minggu untuk generate laporan
            </p>
          </div>
          <div className="p-3 space-y-2">
            {isLoadingWeeks ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Memuat data...
              </div>
            ) : weeks.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-400">
                  Belum ada data Scrum.
                  <br />
                  Mulai dari tab Daily Log.
                </p>
              </div>
            ) : (
              weeks.map((week) => (
                <WeekCard
                  key={`${week.week_year}-${week.week_number}`}
                  week={week}
                  isSelected={
                    selectedWeek?.week_number === week.week_number &&
                    selectedWeek?.week_year === week.week_year
                  }
                  onClick={() => handleSelectWeek(week)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Detail Panel ─────────────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">
        {/* Header */}
        {selectedWeek && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Minggu ke-{selectedWeek.week_number}, {selectedWeek.week_year}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {formatShortDate(selectedWeek.start_date)} –{" "}
                  {formatShortDate(selectedWeek.end_date)} ·{" "}
                  {selectedWeek.session_count} sesi
                </p>
              </div>
              {/* Toggle view mode if report exists */}
              {report && preview && (
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setViewMode("preview")}
                    className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                      viewMode === "preview"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Preview Data
                  </button>
                  <button
                    onClick={() => setViewMode("report")}
                    className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                      viewMode === "report"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Laporan AI
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error */}
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

        {/* Content */}
        {!selectedWeek ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3 shadow-2xs">
            <div className="text-4xl">📊</div>
            <p className="text-xs text-slate-500">
              Pilih minggu di panel kiri untuk melihat detail & generate laporan.
            </p>
          </div>
        ) : isLoadingDetail ? (
          <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Memuat detail minggu...
          </div>
        ) : viewMode === "report" && report ? (
          <ReportView report={report} onPrint={handlePrint} />
        ) : preview ? (
          <PreviewView
            preview={preview}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        ) : null}
      </div>
    </div>
  );
}
