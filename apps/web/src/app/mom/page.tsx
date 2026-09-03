"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  FolderKanban,
  History,
  Layers,
  ListTodo,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { SkeletonCardGrid, SkeletonTable } from "@/components/ui/skeleton-loader";
import { EmptyState } from "@/components/ui/empty-state";

interface ProjectOption {
  id: string;
  name: string;
  code: string;
}

interface ActionItem {
  title: string;
  owner?: string | null;
  due_date?: string | null;
  status?: string;
}

interface MoMDocument {
  id: string;
  mom_key: string;
  title: string;
  meeting_date: string | null;
  project_id: string | null;
  project_name?: string | null;
  project_code?: string | null;
  raw_text: string;
  content_md: string;
  summary: string | null;
  attendees: string[];
  action_items: ActionItem[];
  decisions: string[];
  created_at: string;
  updated_at: string;
}

interface MoMListItem {
  id: string;
  mom_key: string;
  title: string;
  meeting_date: string | null;
  project_id: string | null;
  project_name?: string | null;
  project_code?: string | null;
  summary: string | null;
  action_items_count: number;
  created_at: string;
}

const SAMPLE_RAW_TEXT = `Catatan Pembahasan Diskusi:
- Modul autentikasi dan API dasar sudah selesai 100% di staging server.
- Klien meminta alur checkout pembayaran disederhanakan menjadi 2 langkah saja.
- Pengujian sandbox webhook perbankan memerlukan IP whitelist server produksi.
- Sinta telah menyiapkan desain wireframe halaman checkout dan siap untuk slicing.

Keputusan Disepakati:
1. Alur checkout disederhanakan tanpa perlu verifikasi OTP tambahan untuk transaksi di bawah Rp 500.000.
2. Format laporan mingguan ke klien dikirimkan setiap hari Jumat sore dalam format Markdown.
3. Target peluncuran UAT ditetapkan pada tanggal 10 September 2026.

Action Items:
- Budi: Konfigurasi webhook endpoint staging & kirim IP public ke tim IT klien paling lambat 28 Agustus 2026.
- Sinta: Selesaikan prototype interaktif checkout di Figma sebelum 29 Agustus 2026.
- Cahyo: Siapkan dokumen skenario uji UAT bersama tim QA.`;

export default function MoMGeneratorPage() {
  const { token } = useAuth();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"GENERATOR" | "HISTORY">("GENERATOR");

  // Generator form state
  const [rawText, setRawText] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingAttendees, setMeetingAttendees] = useState("");
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [projectName, setProjectName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Active generated/viewed MoM
  const [currentMoM, setCurrentMoM] = useState<MoMDocument | null>(null);
  const [previewMode, setPreviewMode] = useState<"DOCUMENT" | "MARKDOWN">("DOCUMENT");
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editedContentMd, setEditedContentMd] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // History repository state
  const [historyList, setHistoryList] = useState<MoMListItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [historyProjectFilter, setHistoryProjectFilter] = useState("ALL");

  // Projects options for dropdown
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  // Selected MoM for detail modal in History tab
  const [selectedHistoryMoM, setSelectedHistoryMoM] = useState<MoMDocument | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchHistory();
  }, [token]);

  async function fetchProjects() {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await apiClient<ProjectOption[]>("/projects", { headers });
      if (res.data) {
        setProjects(res.data);
      }
    } catch {
      // Handled silently
    }
  }

  async function fetchHistory() {
    if (!token) return;
    setIsLoadingHistory(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await apiClient<MoMListItem[]>("/mom", { headers });
      if (res.data) {
        setHistoryList(res.data);
      }
    } catch {
      // Handled silently
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function handleGenerateMoM(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!rawText.trim()) {
      setGenerateError("Harap masukkan catatan mentah hasil rapat terlebih dahulu.");
      return;
    }

    setGenerateError(null);
    setIsGenerating(true);

    try {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await apiClient<MoMDocument>("/mom/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          raw_text: rawText,
          title: meetingTitle.trim() || undefined,
          attendees_raw: meetingAttendees.trim() || undefined,
          meeting_date: meetingDate ? new Date(meetingDate).toISOString() : undefined,
          project_name: projectName.trim() || undefined,
        }),
      });

      if (res.data) {
        setCurrentMoM(res.data);
        setEditedContentMd(res.data.content_md);
        setIsEditingContent(false);
        fetchHistory(); // Refresh history
      } else {
        setGenerateError(res.error || "Gagal meng-generate MoM. Coba lagi.");
      }
    } catch {
      setGenerateError("Terjadi kesalahan jaringan saat memproses MoM.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSaveEditedContent() {
    if (!currentMoM) return;
    setIsSavingEdit(true);
    try {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await apiClient<MoMDocument>(`/mom/${currentMoM.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          content_md: editedContentMd,
        }),
      });

      if (res.data) {
        setCurrentMoM(res.data);
        setIsEditingContent(false);
        fetchHistory();
      }
    } catch {
      // Handled silently
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleOpenHistoryDetail(momId: string) {
    setIsLoadingDetail(true);
    try {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await apiClient<MoMDocument>(`/mom/${momId}`, { headers });
      if (res.data) {
        setSelectedHistoryMoM(res.data);
      }
    } catch {
      // Handled silently
    } finally {
      setIsLoadingDetail(false);
    }
  }

  async function handleDeleteMoM(momId: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus dokumen MoM ini dari riwayat?")) return;
    try {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      await apiClient(`/mom/${momId}`, {
        method: "DELETE",
        headers,
      });

      if (currentMoM?.id === momId) {
        setCurrentMoM(null);
      }
      if (selectedHistoryMoM?.id === momId) {
        setSelectedHistoryMoM(null);
      }
      fetchHistory();
    } catch {
      // Handled silently
    }
  }

  function handleDownloadMarkdown(doc: MoMDocument | null) {
    if (!doc) return;
    const blob = new Blob([doc.content_md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${doc.mom_key}_${doc.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleCopyMarkdown(text: string) {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }

  function handleUseSampleTemplate() {
    setRawText(SAMPLE_RAW_TEXT);
    setMeetingTitle("Rapat Evaluasi Sprint & Rencana Integrasi Gateway");
    setMeetingAttendees("Pak Hendra (Client PIC), Cahyo (PM Lead), Budi (Backend Engineer), Sinta (UI Designer)");
    setProjectName("POS & CRM Integration");
  }

  const filteredHistory = historyList.filter((item) => {
    const matchesQuery =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.mom_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.summary && item.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.project_name && item.project_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesProject =
      historyProjectFilter === "ALL" ||
      (historyProjectFilter === "STANDALONE" && !item.project_id) ||
      item.project_id === historyProjectFilter;

    return matchesQuery && matchesProject;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Minutes of Meeting (MoM) Generator
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold border border-purple-200">
              ✨ AI Powered
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Transformasikan teks mentah atau transkrip rapat menjadi dokumen notulensi resmi terstruktur (.md) dan kelola riwayatnya.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("GENERATOR")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "GENERATOR"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Generator MoM</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("HISTORY");
              fetchHistory();
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "HISTORY"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="w-3.5 h-3.5 text-sky-600" />
            <span>Riwayat Dokumen</span>
            {historyList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono">
                {historyList.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GENERATOR MOM */}
      {/* ========================================================================= */}
      {activeTab === "GENERATOR" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Input Form */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <h2 className="text-sm font-bold text-slate-900">Masukan Hasil Rapat</h2>
                </div>
                <button
                  type="button"
                  onClick={handleUseSampleTemplate}
                  className="text-[11px] font-semibold text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Gunakan Contoh Catatan</span>
                </button>
              </div>

              {generateError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{generateError}</span>
                </div>
              )}

              <form onSubmit={handleGenerateMoM} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Judul / Topik Rapat <span className="text-slate-400 font-normal">(opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="Contoh: Rapat Koordinasi Teknis & Kickoff Sprint 2"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Rapat</label>
                    <input
                      type="date"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Proyek Terkait <span className="text-slate-400 font-normal">(opsional)</span>
                    </label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Contoh: POS & CRM Integration atau NUSA-2026"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                      <span>Daftar Peserta Rapat (Attendees)</span>
                    </label>
                    <span className="text-slate-400 font-normal text-[10px]">(opsional, pisahkan koma)</span>
                  </div>
                  <input
                    type="text"
                    value={meetingAttendees}
                    onChange={(e) => setMeetingAttendees(e.target.value)}
                    placeholder="Contoh: Pak Hendra (Client PIC), Cahyo (PM Lead), Budi (Backend)"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-800"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Teks Mentah Hasil Rapat / Transkrip *
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {rawText.length} karakter
                    </span>
                  </div>
                  <textarea
                    rows={12}
                    required
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={`Tempelkan coret-coretan catatan rapat, poin pembahasan santai, transkrip meeting Google Meet/Zoom, atau daftar tugas di sini...\n\nContoh:\n- Hadir: Budi, Sinta, Pak Hendra\n- Pembahasan: integrasi webhook QRIS dinamis selesai\n- Keputusan: rilis UAT Jumat jam 14.00\n- Action items: Budi setup staging, Sinta desain wireframe`}
                    className="w-full p-3 text-xs font-mono leading-relaxed bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-800 placeholder:text-slate-400"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  {rawText && (
                    <button
                      type="button"
                      onClick={() => {
                        setRawText("");
                        setMeetingTitle("");
                        setCurrentMoM(null);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Bersihkan
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isGenerating || !rawText.trim()}
                    className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>AI Sedang Menyusun MoM...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>✨ Generate MoM (.md)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Output Preview / Editor */}
          <div className="lg:col-span-7 space-y-4">
            {isGenerating ? (
              <div className="bg-white rounded-2xl border border-purple-200 p-12 text-center shadow-xs space-y-4 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 mx-auto flex items-center justify-center">
                  <Sparkles className="w-6 h-6 animate-spin" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">ProjectPilot AI sedang menganalisis rapat...</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Mengekstrak peserta rapat, merangkum poin diskusi, memisahkan keputusan kunci, serta menyusun tabel action items ke dalam format Markdown (.md).
                  </p>
                </div>
              </div>
            ) : currentMoM ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col space-y-4 p-5">
                {/* Header of MoM */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
                        {currentMoM.mom_key}
                      </span>
                      {currentMoM.project_code && (
                        <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {currentMoM.project_code}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-slate-900 leading-snug">{currentMoM.title}</h2>
                    <span className="text-xs text-slate-500 block">
                      Dilaksanakan pada: {currentMoM.meeting_date ? new Date(currentMoM.meeting_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "Tidak tercatat"}
                    </span>
                  </div>

                  {/* Actions Header Bar */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleDownloadMarkdown(currentMoM)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                      title="Download File Markdown (.md)"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download (.md)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyMarkdown(currentMoM.content_md)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                    >
                      {copySuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Salin .md</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* AI Executive Summary Card */}
                {currentMoM.summary && (
                  <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-purple-900 font-bold text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Ringkasan Eksekutif (AI Summary):</span>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed">{currentMoM.summary}</p>
                  </div>
                )}

                {/* Highlights Grid: Attendees & Decisions & Action Items */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Attendees */}
                  {currentMoM.attendees && currentMoM.attendees.length > 0 && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>Peserta Teridentifikasi ({currentMoM.attendees.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {currentMoM.attendees.map((att, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] text-slate-700"
                          >
                            {att}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action items summary */}
                  {currentMoM.action_items && currentMoM.action_items.length > 0 && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                        <ListTodo className="w-3.5 h-3.5 text-slate-500" />
                        <span>Tindak Lanjut / Action Items ({currentMoM.action_items.length})</span>
                      </div>
                      <ul className="space-y-1 text-[11px] text-slate-600">
                        {currentMoM.action_items.slice(0, 3).map((act, i) => (
                          <li key={i} className="line-clamp-1">
                            • <strong>{act.title}</strong> {act.owner ? `(${act.owner})` : ""}
                          </li>
                        ))}
                        {currentMoM.action_items.length > 3 && (
                          <li className="text-[10px] text-slate-400">
                            + {currentMoM.action_items.length - 3} aksi lainnya
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                {/* View Switcher & Document Container */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewMode("DOCUMENT");
                          setIsEditingContent(false);
                        }}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                          previewMode === "DOCUMENT" && !isEditingContent
                            ? "bg-slate-900 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Pratinjau Dokumen
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewMode("MARKDOWN");
                        }}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                          previewMode === "MARKDOWN" || isEditingContent
                            ? "bg-slate-900 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Sumber Markdown (.md)
                      </button>
                    </div>

                    {isEditingContent ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditedContentMd(currentMoM.content_md);
                            setIsEditingContent(false);
                          }}
                          className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          disabled={isSavingEdit}
                          onClick={handleSaveEditedContent}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                        >
                          {isSavingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditedContentMd(currentMoM.content_md);
                          setIsEditingContent(true);
                          setPreviewMode("MARKDOWN");
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-purple-700"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Markdown</span>
                      </button>
                    )}
                  </div>

                  {isEditingContent ? (
                    <div className="space-y-1.5">
                      <textarea
                        rows={16}
                        value={editedContentMd}
                        onChange={(e) => setEditedContentMd(e.target.value)}
                        className="w-full p-4 text-xs font-mono leading-relaxed bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>
                  ) : previewMode === "MARKDOWN" ? (
                    <pre className="p-5 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                      {currentMoM.content_md}
                    </pre>
                  ) : (
                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap max-h-[500px] overflow-y-auto shadow-inner">
                      {currentMoM.content_md}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Dokumen MoM Belum Digenerate</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Tulis atau tempelkan catatan rapat di form sebelah kiri, lalu klik tombol <strong>Generate MoM</strong> untuk membuat notulensi otomatis dalam format Markdown.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RIWAYAT DOKUMEN MOM */}
      {/* ========================================================================= */}
      {activeTab === "HISTORY" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul MoM, kode MOM-xxx, ringkasan, atau proyek..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={historyProjectFilter}
                onChange={(e) => setHistoryProjectFilter(e.target.value)}
                className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="ALL">Semua Proyek</option>
                <option value="STANDALONE">Umum / Standalone</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={fetchHistory}
                disabled={isLoadingHistory}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                title="Refresh Riwayat"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* History List Table / Cards */}
          {isLoadingHistory ? (
            <SkeletonTable rows={5} cols={5} />
          ) : filteredHistory.length === 0 ? (
            <EmptyState
              icon={History}
              title="Belum Ada Riwayat MoM"
              description="Dokumen Minutes of Meeting yang digenerate akan tersimpan otomatis di arsip riwayat ini."
              actionLabel="✨ Buat MoM Baru"
              onAction={() => setActiveTab("GENERATOR")}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 min-w-[750px]">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Kode & Judul MoM</th>
                      <th className="px-4 py-3">Proyek Terkait</th>
                      <th className="px-4 py-3">Tanggal Rapat</th>
                      <th className="px-4 py-3">Action Items</th>
                      <th className="px-4 py-3">Dibuat</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {filteredHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                              {item.mom_key}
                            </span>
                            <span className="font-semibold text-slate-900 line-clamp-1">{item.title}</span>
                          </div>
                          {item.summary && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 max-w-md">
                              {item.summary}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {item.project_name ? (
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[10px] font-bold text-slate-400">
                                {item.project_code}
                              </span>
                              <span className="truncate max-w-[150px]">{item.project_name}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Umum (Standalone)</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {item.meeting_date
                            ? new Date(item.meeting_date).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            <ListTodo className="w-3 h-3 text-slate-500" />
                            <span>{item.action_items_count} Aksi</span>
                          </span>
                        </td>

                        <td className="px-4 py-3 text-[11px] text-slate-400 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleDateString("id-ID")}
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenHistoryDetail(item.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                            >
                              <span>Buka</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteMoM(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus MoM"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL / DRAWER DETAIL DOKUMEN MOM DARI RIWAYAT */}
      {/* ========================================================================= */}
      {selectedHistoryMoM && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                    {selectedHistoryMoM.mom_key}
                  </span>
                  {selectedHistoryMoM.project_code && (
                    <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      {selectedHistoryMoM.project_code}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">{selectedHistoryMoM.title}</h3>
                <span className="text-xs text-slate-500 block">
                  Tanggal Rapat: {selectedHistoryMoM.meeting_date ? new Date(selectedHistoryMoM.meeting_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedHistoryMoM(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {/* AI Summary */}
              {selectedHistoryMoM.summary && (
                <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1">
                  <span className="text-xs font-bold text-purple-950 block">Ringkasan Eksekutif:</span>
                  <p className="text-xs text-slate-800 leading-relaxed">{selectedHistoryMoM.summary}</p>
                </div>
              )}

              {/* Rendered Markdown Document */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-900 block">Isi Dokumen Notulensi:</span>
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-wrap">
                  {selectedHistoryMoM.content_md}
                </div>
              </div>
            </div>

            {/* Modal Sticky Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDeleteMoM(selectedHistoryMoM.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Dokumen</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyMarkdown(selectedHistoryMoM.content_md)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin .md</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadMarkdown(selectedHistoryMoM)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download (.md)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
