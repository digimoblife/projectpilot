"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  ListTodo,
  Printer,
  Share2,
  Users,
  AlertCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { MarkdownViewer } from "@/components/ui/markdown-viewer";

interface MoMActionItem {
  id?: string;
  title: string;
  module?: string;
  owner?: string;
  due_date?: string;
  priority?: string;
  status: string;
  category?: string;
}

interface MoMPublicShareData {
  mom_key: string;
  title: string;
  meeting_date: string | null;
  project_name: string | null;
  project_code: string | null;
  summary: string | null;
  attendees: string[];
  decisions: string[];
  action_items: MoMActionItem[];
  content_md: string;
  created_at: string;
  share_token: string;
  view_count: number;
}

export default function MoMPublicSharePage() {
  const params = useParams();
  const token = typeof params?.token === "string" ? params.token : "";

  const [data, setData] = useState<MoMPublicShareData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"DOCUMENT" | "ACTION_ITEMS" | "DECISIONS">("DOCUMENT");
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (!token) return;

    async function fetchSharedMoM() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiClient<MoMPublicShareData>(`/mom/share/${token}`);
        if (res.data) {
          setData(res.data);
        } else {
          setError(res.error || "Dokumen MoM tidak ditemukan atau tautan telah dinonaktifkan.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal memuat dokumen MoM.";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSharedMoM();
  }, [token]);

  function handleCopyMarkdown() {
    if (!data?.content_md) return;
    navigator.clipboard.writeText(data.content_md);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }

  function handleDownloadMarkdown() {
    if (!data) return;
    const blob = new Blob([data.content_md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${data.mom_key}_${data.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-500">Memuat Dokumen MoM...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Tautan Tidak Tersedia</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || "Tautan dokumen yang Anda tuju mungkin sudah kedaluwarsa, dinonaktifkan oleh pemilik, atau salah ketik."}
          </p>
        </div>
      </div>
    );
  }

  const formattedDate = data.meeting_date
    ? new Date(data.meeting_date).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Tidak ditentukan";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">ProjectPilot</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60 rounded-full">
                  Public MoM View
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Minutes of Meeting Official Document</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs"
              title="Salin isi dokumen dalam format Markdown"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>{copySuccess ? "Tersalin!" : "Salin Teks"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs"
              title="Download file dokumen .md"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Download .md</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 rounded-xl transition-colors shadow-xs"
              title="Cetak atau simpan sebagai PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cetak PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Document Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 pt-8 space-y-6">
        {/* Header Hero Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="px-2.5 py-1 text-xs font-mono font-semibold bg-slate-100 text-slate-700 rounded-lg">
              {data.mom_key}
            </span>
            {data.project_name && (
              <span className="text-xs font-medium text-slate-500">
                Proyek: <strong className="text-slate-800">{data.project_name}</strong>
                {data.project_code && ` (${data.project_code})`}
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
            {data.title}
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Tanggal Pelaksanaan: <strong>{formattedDate}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Dibuat pada: <strong>{new Date(data.created_at).toLocaleDateString("id-ID")}</strong></span>
            </div>
          </div>

          {/* Attendees List */}
          {data.attendees && data.attendees.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>Daftar Peserta Hadir ({data.attendees.length}):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.attendees.map((attendee, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200 rounded-lg"
                  >
                    {attendee}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Executive Summary Card */}
        {data.summary && (
          <div className="bg-gradient-to-r from-purple-50/80 to-indigo-50/80 border border-purple-200/70 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              <span>Ringkasan Eksekutif</span>
            </h3>
            <p className="text-xs sm:text-sm text-purple-950/90 leading-relaxed">
              {data.summary}
            </p>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("DOCUMENT")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 ${
              activeTab === "DOCUMENT"
                ? "bg-purple-600 text-white shadow-2xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Dokumen MoM</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ACTION_ITEMS")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 ${
              activeTab === "ACTION_ITEMS"
                ? "bg-purple-600 text-white shadow-2xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Matriks Tindak Lanjut ({data.action_items?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("DECISIONS")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 ${
              activeTab === "DECISIONS"
                ? "bg-purple-600 text-white shadow-2xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Keputusan Disepakati ({data.decisions?.length || 0})</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "DOCUMENT" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <MarkdownViewer
              content={data.content_md}
              title={data.title}
              className="p-0 border-0 shadow-none"
            />
          </div>
        )}

        {activeTab === "ACTION_ITEMS" && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900">Action Items & Checklist Matrix</h3>
                <p className="text-[11px] text-slate-500">Tindak lanjut tugas, dependensi klien, dan penanggung jawab.</p>
              </div>
            </div>

            {data.action_items && data.action_items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Action Item</th>
                      <th className="py-3 px-4">Modul / Area</th>
                      <th className="py-3 px-4">PIC / Owner</th>
                      <th className="py-3 px-4">Prioritas</th>
                      <th className="py-3 px-4">Tenggat Waktu</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.action_items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">{item.title}</td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                            {item.module || "Umum"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{item.owner || "TBD"}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              item.priority?.toUpperCase() === "CRITICAL"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : item.priority?.toUpperCase() === "HIGH"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : item.priority?.toUpperCase() === "MEDIUM"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {item.priority || "Not specified"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{item.due_date || "TBD"}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              item.status === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : item.status === "CARRIED_OVER"
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {item.status || "PENDING"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                Tidak ada item tindak lanjut dalam dokumen ini.
              </div>
            )}
          </div>
        )}

        {activeTab === "DECISIONS" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Daftar Keputusan Disepakati
            </h3>
            {data.decisions && data.decisions.length > 0 ? (
              <ul className="space-y-2.5">
                {data.decisions.map((dec, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/70 text-xs text-slate-800 leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{dec}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">Tidak ada poin keputusan spesifik yang dicatat.</p>
            )}
          </div>
        )}

        {/* Public Footer */}
        <footer className="pt-6 border-t border-slate-200 text-center text-xs text-slate-400 space-y-1">
          <p>Dokumen ini dibagikan secara resmi melalui <strong>ProjectPilot Hub</strong>.</p>
          <p className="text-[11px]">Tampilan ini bersifat publik & read-only. Dilihat {data.view_count} kali.</p>
        </footer>
      </main>
    </div>
  );
}
