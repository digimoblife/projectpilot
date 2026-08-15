"use client";

import React, { useEffect, useState, use } from "react";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  History,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Send,
  Shield,
  Sparkles,
  Tag,
  User,
  Users,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface ReportEvidence {
  id: string;
  evidence_type: string;
  evidence_entity_id: string | null;
  evidence_snapshot: Record<string, any> | null;
  created_at: string;
}

interface Report {
  id: string;
  project_id: string;
  report_key: string;
  report_type: "WEEKLY_INTERNAL" | "WEEKLY_CLIENT" | "MONTHLY_INTERNAL" | "MONTHLY_CLIENT";
  reporting_period_start: string;
  reporting_period_end: string;
  status: "DRAFT" | "UNDER_REVIEW" | "FINAL" | "SUPERSEDED";
  version: number;
  title: string;
  content: string;
  summary: string | null;
  created_by_user_id: string | null;
  finalized_by_user_id: string | null;
  finalized_at: string | null;
  supersedes_report_id: string | null;
  created_at: string;
  updated_at: string;
  evidences: ReportEvidence[];
}

const reportTypeConfigs = {
  WEEKLY_INTERNAL: { label: "Mingguan Internal", color: "bg-blue-50 text-blue-700 border-blue-200", audience: "Internal" },
  WEEKLY_CLIENT: { label: "Mingguan Klien", color: "bg-purple-50 text-purple-700 border-purple-200", audience: "Client" },
  MONTHLY_INTERNAL: { label: "Bulanan Internal", color: "bg-indigo-50 text-indigo-700 border-indigo-200", audience: "Internal" },
  MONTHLY_CLIENT: { label: "Bulanan Klien (Steering)", color: "bg-teal-50 text-teal-700 border-teal-200", audience: "Client" },
};

const reportStatusConfigs = {
  DRAFT: { label: "Draft AI", color: "bg-amber-50 text-amber-700 border-amber-200" },
  UNDER_REVIEW: { label: "Dalam Review", color: "bg-blue-50 text-blue-700 border-blue-200" },
  FINAL: { label: "Final (Resmi)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  SUPERSEDED: { label: "Tergantikan (Superseded)", color: "bg-slate-100 text-slate-500 border-slate-200" },
};

export default function ProjectReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { token } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");

  // Generate Report Modal
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [reportType, setReportType] = useState<"WEEKLY_INTERNAL" | "WEEKLY_CLIENT" | "MONTHLY_INTERNAL" | "MONTHLY_CLIENT">("WEEKLY_INTERNAL");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchReports();
    // Default date range: Last 7 days
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    setPeriodEnd(end.toISOString().slice(0, 10));
    setPeriodStart(start.toISOString().slice(0, 10));
  }, [projectId, token]);

  async function fetchReports() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Report[]>(`/projects/${projectId}/reports`, { headers });
      if (res.data) {
        setReports(res.data);
        if (selectedReport) {
          const updated = res.data.find((r) => r.id === selectedReport.id);
          if (updated) {
            setSelectedReport(updated);
            setEditedTitle(updated.title);
            setEditedContent(updated.content);
          }
        } else if (res.data.length > 0) {
          setSelectedReport(res.data[0]);
          setEditedTitle(res.data[0].title);
          setEditedContent(res.data[0].content);
        }
      }
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerateReport(e: React.FormEvent) {
    e.preventDefault();
    setGenerateError(null);
    setIsGenerating(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Report>(`/projects/${projectId}/reports/generate-draft`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          report_type: reportType,
          reporting_period_start: periodStart,
          reporting_period_end: periodEnd,
          custom_instructions: customInstructions || null,
        }),
      });

      if (res.data) {
        setIsGenerateModalOpen(false);
        setCustomInstructions("");
        fetchReports();
        setSelectedReport(res.data);
        setEditedTitle(res.data.title);
        setEditedContent(res.data.content);
      } else {
        setGenerateError(res.error || "Gagal membuat draft laporan.");
      }
    } catch {
      setGenerateError("Terjadi kesalahan sistem saat membuat laporan.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSaveReportEdits() {
    if (!selectedReport) return;
    setIsSaving(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Report>(`/projects/${projectId}/reports/${selectedReport.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          title: editedTitle,
          content: editedContent,
        }),
      });

      if (res.data) {
        setSelectedReport(res.data);
        setIsEditing(false);
        fetchReports();
      }
    } catch {
      // Handled
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFinalizeReport() {
    if (!selectedReport) return;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Report>(`/projects/${projectId}/reports/${selectedReport.id}/finalize`, {
        method: "POST",
        headers,
      });

      if (res.data) {
        setSelectedReport(res.data);
        fetchReports();
      }
    } catch {
      // Handled
    }
  }

  async function handleCreateRevisionVersion() {
    if (!selectedReport) return;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Report>(`/projects/${projectId}/reports/${selectedReport.id}/create-version`, {
        method: "POST",
        headers,
      });

      if (res.data) {
        fetchReports();
        setSelectedReport(res.data);
        setEditedTitle(res.data.title);
        setEditedContent(res.data.content);
        setIsEditing(true);
      }
    } catch {
      // Handled
    }
  }

  function setPresetPeriod(preset: "THIS_WEEK" | "LAST_WEEK" | "THIS_MONTH") {
    const today = new Date();
    if (preset === "THIS_WEEK") {
      const start = new Date();
      start.setDate(today.getDate() - today.getDay() + 1);
      setPeriodStart(start.toISOString().slice(0, 10));
      setPeriodEnd(today.toISOString().slice(0, 10));
    } else if (preset === "LAST_WEEK") {
      const start = new Date();
      start.setDate(today.getDate() - today.getDay() - 6);
      const end = new Date();
      end.setDate(today.getDate() - today.getDay());
      setPeriodStart(start.toISOString().slice(0, 10));
      setPeriodEnd(end.toISOString().slice(0, 10));
    } else if (preset === "THIS_MONTH") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setPeriodStart(start.toISOString().slice(0, 10));
      setPeriodEnd(today.toISOString().slice(0, 10));
    }
  }

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.report_key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedTypeFilter === "ALL" || r.report_type === selectedTypeFilter;
    const matchesStatus = selectedStatusFilter === "ALL" || r.status === selectedStatusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Pelaporan Mingguan & Bulanan Proyek</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Evidence Grounded Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Otomatisasi draft laporan kemajuan internal & klien berbasis rekaman deliverables, milestone, dan notulen rapat.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsGenerateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          <Sparkles className="w-4 h-4 text-emerald-200" />
          <span>✨ Buat Laporan Baru (AI Draft)</span>
        </button>
      </div>

      {/* Main Grid: Reports List (4 cols) & Report Viewer / Editor (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Report List */}
        <div className="lg:col-span-4 space-y-3">
          {/* Filter Inputs */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari laporan..."
                className="w-full text-xs bg-transparent focus:outline-hidden text-slate-800 placeholder-slate-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100">
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="text-[11px] px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-slate-700"
              >
                <option value="ALL">Semua Jenis</option>
                {Object.keys(reportTypeConfigs).map((k) => (
                  <option key={k} value={k}>
                    {reportTypeConfigs[k as keyof typeof reportTypeConfigs].label}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="text-[11px] px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-slate-700"
              >
                <option value="ALL">Semua Status</option>
                {Object.keys(reportStatusConfigs).map((k) => (
                  <option key={k} value={k}>
                    {reportStatusConfigs[k as keyof typeof reportStatusConfigs].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
              Memuat arsip laporan...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500 space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p>Belum ada laporan yang dibuat.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
              {filteredReports.map((r) => {
                const typeCfg = reportTypeConfigs[r.report_type] || reportTypeConfigs.WEEKLY_INTERNAL;
                const statusCfg = reportStatusConfigs[r.status] || reportStatusConfigs.DRAFT;
                const isSelected = selectedReport?.id === r.id;

                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      setSelectedReport(r);
                      setEditedTitle(r.title);
                      setEditedContent(r.content);
                      setIsEditing(false);
                    }}
                    className={`p-3.5 bg-white rounded-xl border cursor-pointer transition-all hover:shadow-xs ${
                      isSelected
                        ? "border-emerald-500 ring-2 ring-emerald-500/10"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {r.report_key} v{r.version}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${typeCfg.color}`}>
                          {typeCfg.label}
                        </span>
                      </div>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{r.title}</h4>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-2">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>
                        {new Date(r.reporting_period_start).toLocaleDateString("id-ID")} - {new Date(r.reporting_period_end).toLocaleDateString("id-ID")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Markdown Report Editor & Preview */}
        <div className="lg:col-span-8">
          {selectedReport ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
              {/* Report Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                      {selectedReport.report_key} (Versi {selectedReport.version})
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        reportTypeConfigs[selectedReport.report_type]?.color
                      }`}
                    >
                      {reportTypeConfigs[selectedReport.report_type]?.label}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        reportStatusConfigs[selectedReport.status]?.color
                      }`}
                    >
                      {reportStatusConfigs[selectedReport.status]?.label}
                    </span>
                  </div>

                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="w-full text-base font-bold text-slate-900 border-b border-slate-300 pb-1 focus:outline-hidden"
                    />
                  ) : (
                    <h3 className="text-base font-bold text-slate-900">{selectedReport.title}</h3>
                  )}

                  <span className="text-xs text-slate-500">
                    Periode Laporan: {new Date(selectedReport.reporting_period_start).toLocaleDateString("id-ID")} s/d {new Date(selectedReport.reporting_period_end).toLocaleDateString("id-ID")}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {selectedReport.status !== "FINAL" && (
                    <>
                      {isEditing ? (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={handleSaveReportEdits}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
                        >
                          {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Konten</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleFinalizeReport}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Finalisasi Laporan</span>
                      </button>
                    </>
                  )}

                  {selectedReport.status === "FINAL" && (
                    <button
                      type="button"
                      onClick={handleCreateRevisionVersion}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold text-xs rounded-lg transition-colors"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Buat Versi Revisi</span>
                    </button>
                  )}
                </div>
              </div>

              {/* AI Summary Highlight */}
              {selectedReport.summary && (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block mb-0.5">
                    Ringkasan Eksekutif (AI Grounded):
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed">{selectedReport.summary}</p>
                </div>
              )}

              {/* Report Editor or Rendered View */}
              {isEditing ? (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Editor Konten Markdown:</label>
                  <textarea
                    rows={16}
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full p-4 font-mono text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 block">Isi Dokumen Laporan:</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(selectedReport.content)}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Markdown</span>
                    </button>
                  </div>

                  <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                    {selectedReport.content}
                  </div>
                </div>
              )}

              {/* Evidence Snapshot Accordion */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-900 block mb-1.5">
                  Bukti Dasar Laporan (Evidence Snapshots: {selectedReport.evidences.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedReport.evidences.map((ev) => (
                    <span
                      key={ev.id}
                      className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-700 font-mono"
                    >
                      {ev.evidence_type}: {ev.evidence_snapshot?.key || ev.evidence_snapshot?.title || "Item"}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p>Pilih laporan di sebelah kiri atau klik &quot;Buat Laporan Baru&quot; untuk memulai.</p>
            </div>
          )}
        </div>
      </div>

      {/* GENERATE REPORT MODAL */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Generator Laporan Proyek AI</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {generateError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {generateError}
              </div>
            )}

            <form onSubmit={handleGenerateReport} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Laporan & Audiens *</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                >
                  <option value="WEEKLY_INTERNAL">Mingguan Internal (Untuk Manajemen & Tim Pengembang)</option>
                  <option value="WEEKLY_CLIENT">Mingguan Klien (Diformat Aman & Profesional untuk Stakeholder Klien)</option>
                  <option value="MONTHLY_INTERNAL">Bulanan Internal (Tata Kelola & Analisis Risiko)</option>
                  <option value="MONTHLY_CLIENT">Bulanan Klien (Laporan Steering Committee)</option>
                </select>
              </div>

              {/* Period Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Rentang Waktu Evaluasi *</label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setPresetPeriod("THIS_WEEK")}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                    >
                      Minggu Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetPeriod("LAST_WEEK")}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                    >
                      Minggu Lalu
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetPeriod("THIS_MONTH")}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                    >
                      Bulan Ini
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Tanggal Mulai:</span>
                    <input
                      type="date"
                      required
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Tanggal Selesai:</span>
                    <input
                      type="date"
                      required
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Instruksi Khusus PM (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Contoh: Berikan penekanan pada penyelesaian modul pembayaran dan status IP whitelist."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isGenerating ? "Gemini sedang menyusun..." : "Generate Draft Laporan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
