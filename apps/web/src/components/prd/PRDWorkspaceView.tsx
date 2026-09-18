"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck,
  FileCode,
  FileText,
  History,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { MarkdownViewer } from "@/components/ui/markdown-viewer";

interface DocumentEvidence {
  id: string;
  evidence_type: string;
  evidence_entity_id: string | null;
  evidence_snapshot: Record<string, any> | null;
  created_at: string;
}

interface GeneratedDocument {
  id: string;
  project_id: string;
  document_key: string;
  document_type: string;
  title: string;
  status: "DRAFT" | "UNDER_REVIEW" | "FINAL" | "SUPERSEDED";
  version: number;
  content: string;
  summary: string | null;
  created_by_user_id: string | null;
  finalized_by_user_id: string | null;
  finalized_at: string | null;
  supersedes_document_id: string | null;
  created_at: string;
  updated_at: string;
  evidences: DocumentEvidence[];
}

const docStatusConfigs: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draf Kerja (Draft)", color: "bg-amber-50 text-amber-700 border-amber-200" },
  UNDER_REVIEW: { label: "Dalam Review", color: "bg-blue-50 text-blue-700 border-blue-200" },
  FINAL: { label: "Resmi (Final & Terkunci)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  SUPERSEDED: { label: "Tergantikan (Superseded)", color: "bg-slate-100 text-slate-500 border-slate-200" },
};

export interface PRDWorkspaceViewProps {
  projectId: string;
}

export function PRDWorkspaceView({ projectId }: PRDWorkspaceViewProps) {
  const { token } = useAuth();

  const [prdDoc, setPrdDoc] = useState<GeneratedDocument | null>(null);
  const [prdTitle, setPrdTitle] = useState("");
  const [prdContent, setPrdContent] = useState("");
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);

  // Custom AI instructions modal
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");

  useEffect(() => {
    fetchPRD();
  }, [projectId, token]);

  async function fetchPRD() {
    setIsLoading(true);
    setError(null);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<GeneratedDocument[]>(`/projects/${projectId}/documents`, { headers });
      if (res.data) {
        // Find PRD or fallback to FSD if historical
        const found = res.data.find((d) => d.document_type === "PRD") || res.data.find((d) => d.document_type === "FSD");
        if (found) {
          setPrdDoc(found);
          setPrdTitle(found.title);
          setPrdContent(found.content);
          if (found.status === "FINAL") {
            setViewMode("preview");
          }
        }
      } else {
        setError(res.error || "Gagal memuat dokumen proyek.");
      }
    } catch {
      setError("Terjadi kesalahan saat memuat dokumen PRD.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGeneratePRD(instructions?: string) {
    setIsGenerating(true);
    setError(null);
    setSuccessMessage(null);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const payload: Record<string, any> = { document_type: "PRD" };
      if (instructions && instructions.trim()) {
        payload.custom_instructions = instructions.trim();
      }

      const genRes = await apiClient<GeneratedDocument>(`/projects/${projectId}/documents/generate-draft`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (genRes.data) {
        setPrdDoc(genRes.data);
        setPrdTitle(genRes.data.title);
        setPrdContent(genRes.data.content);
        setIsPromptModalOpen(false);
        setCustomInstructions("");
        setSuccessMessage("Draf PRD berhasil disusun oleh AI berdasarkan bukti proyek.");
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setError(genRes.error || "Gagal menyusun draf PRD.");
      }
    } catch {
      setError("Terjadi kesalahan sistem saat menghubungi AI generator.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
    if (!prdDoc) return;
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<GeneratedDocument>(`/projects/${projectId}/documents/${prdDoc.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          title: prdTitle,
          content: prdContent,
          status: prdDoc.status,
        }),
      });

      if (res.data) {
        setPrdDoc(res.data);
        setSuccessMessage("Perubahan dokumen PRD berhasil disimpan.");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(res.error || "Gagal menyimpan perubahan PRD.");
      }
    } catch {
      setError("Terjadi kesalahan saat menyimpan dokumen.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateStatus(targetStatus: string) {
    if (!prdDoc) return;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const res = await apiClient<GeneratedDocument>(`/projects/${projectId}/documents/${prdDoc.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          title: prdTitle,
          content: prdContent,
          status: targetStatus,
        }),
      });
      if (res.data) {
        setPrdDoc(res.data);
        setSuccessMessage(`Status dokumen diperbarui menjadi ${targetStatus}.`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch {
      setError("Gagal memperbarui status dokumen.");
    }
  }

  async function handleFinalize() {
    if (!prdDoc) return;
    if (!confirm("Kunci dokumen ini menjadi status FINAL? Dokumen yang telah difinalisasi tidak dapat diedit langsung melainkan melalui revisi versi baru.")) return;

    setIsFinalizing(true);
    setError(null);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<GeneratedDocument>(`/projects/${projectId}/documents/${prdDoc.id}/finalize`, {
        method: "POST",
        headers,
      });

      if (res.data) {
        setPrdDoc(res.data);
        setViewMode("preview");
        setSuccessMessage("Dokumen PRD resmi difinalisasi dan dikunci.");
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setError(res.error || "Gagal memfinalisasi dokumen.");
      }
    } catch {
      setError("Terjadi kesalahan saat memfinalisasi dokumen.");
    } finally {
      setIsFinalizing(false);
    }
  }

  async function handleCreateVersion() {
    if (!prdDoc) return;
    if (!confirm("Buat revisi versi baru dari PRD ini? Versi saat ini akan ditandai sebagai SUPERSEDED.")) return;

    setIsCreatingVersion(true);
    setError(null);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<GeneratedDocument>(`/projects/${projectId}/documents/${prdDoc.id}/create-version`, {
        method: "POST",
        headers,
      });

      if (res.data) {
        setPrdDoc(res.data);
        setPrdTitle(res.data.title);
        setPrdContent(res.data.content);
        setViewMode("edit");
        setSuccessMessage(`Revisi baru v${res.data.version} berhasil dibuat dalam status Draf.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setError(res.error || "Gagal membuat revisi versi baru.");
      }
    } catch {
      setError("Terjadi kesalahan saat membuat versi baru.");
    } finally {
      setIsCreatingVersion(false);
    }
  }

  function handleCopy() {
    if (!prdContent) return;
    navigator.clipboard.writeText(prdContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }

  function handleDownload() {
    if (!prdDoc) return;
    const blob = new Blob([prdContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${prdDoc.document_key || "PRD"}_v${prdDoc.version}_${prdTitle.replace(/\\s+/g, "_")}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const isFinal = prdDoc?.status === "FINAL";
  const statusConfig = prdDoc ? (docStatusConfigs[prdDoc.status] || docStatusConfigs.DRAFT) : docStatusConfigs.DRAFT;
  const evidences = prdDoc?.evidences || [];

  return (
    <div className="space-y-6">
      {/* Workspace Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-900 text-white uppercase tracking-wider">
                Workspace
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>PRD & Spesifikasi Produk</span>
                {prdDoc && (
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    {prdDoc.document_key} v{prdDoc.version}
                  </span>
                )}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Definisi spesifikasi teknis, arsitektur, dan ruang lingkup produk yang diverifikasi dari bukti proyek.
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {prdDoc && (
              <>
                <button
                  type="button"
                  onClick={() => setIsEvidenceOpen(!isEvidenceOpen)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    isEvidenceOpen
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Bukti Rujukan ({evidences.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                  title="Salin konten Markdown"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? "Tersalin!" : "Salin MD"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                  title="Unduh file Markdown"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setIsPromptModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-semibold rounded-xl shadow-xs active:scale-[0.98] transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{prdDoc ? "Regenerate PRD" : "Susun Draf PRD"}</span>
            </button>
          </div>
        </div>

        {/* Operational Status & Mode Switcher Bar */}
        {prdDoc && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap text-xs">
              {/* Status Indicator / Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Status Dokumen:</span>
                {isFinal ? (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${statusConfig.color}`}>
                    <Lock className="w-3 h-3" />
                    <span>{statusConfig.label}</span>
                  </span>
                ) : (
                  <select
                    value={prdDoc.status}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer ${statusConfig.color}`}
                  >
                    <option value="DRAFT">Draf Kerja (Draft)</option>
                    <option value="UNDER_REVIEW">Dalam Review</option>
                    <option value="FINAL">Resmi (Final)</option>
                  </select>
                )}
              </div>

              {/* Version & Date */}
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Diperbarui: {new Date(prdDoc.updated_at || prdDoc.created_at).toLocaleDateString("id-ID")}</span>
              </span>
            </div>

            {/* Right Action Controls: Edit/Preview Toggle & Save/Finalize */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* View Mode Toggle */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode("edit")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === "edit"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editor Markdown</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("preview")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === "preview"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Dokumen</span>
                </button>
              </div>

              {/* Save Button (Draft mode) */}
              {!isFinal && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? "Menyimpan..." : "Simpan Perubahan"}</span>
                </button>
              )}

              {/* Finalize Button */}
              {!isFinal && (
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={isFinalizing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                  title="Kunci dokumen menjadi status FINAL"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isFinalizing ? "Mengunci..." : "Finalisasi Dokumen"}</span>
                </button>
              )}

              {/* Create New Version Button (Final mode) */}
              {isFinal && (
                <button
                  type="button"
                  onClick={handleCreateVersion}
                  disabled={isCreatingVersion}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCreatingVersion ? "animate-spin" : ""}`} />
                  <span>Buat Revisi Baru (v{prdDoc.version + 1})</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="p-1 text-rose-400 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button type="button" onClick={() => setSuccessMessage(null)} className="p-1 text-emerald-400 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Evidence & Traceability Drawer */}
      {isEvidenceOpen && (
        <div className="bg-white rounded-2xl border border-indigo-200 p-5 shadow-xs space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                  Matriks Bukti Rujukan (Evidence & Traceability)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Entitas proyek yang menjadi landasan faktual AI dalam menyusun PRD ini untuk mencegah halusinasi.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsEvidenceOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {evidences.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
              Belum ada snapshot bukti yang ditautkan ke dokumen ini. Bukti ditautkan secara otomatis saat AI menyusun dokumen dari kebutuhan proyek.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {evidences.map((ev) => {
                const snap = ev.evidence_snapshot || {};
                return (
                  <div key={ev.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-white text-slate-700 border border-slate-200">
                        {snap.key || ev.evidence_type}
                      </span>
                      <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                        {ev.evidence_type}
                      </span>
                    </div>
                    <h5 className="font-bold text-slate-900 text-xs truncate">
                      {snap.title || snap.name || "Bukti Proyek"}
                    </h5>
                    {snap.decision && (
                      <p className="text-[11px] text-slate-600 line-clamp-2">Keputusan: {snap.decision}</p>
                    )}
                    {snap.acceptance_criteria && (
                      <p className="text-[11px] text-slate-600 line-clamp-2">Kriteria: {snap.acceptance_criteria}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main PRD Document Workspace Surface */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-slate-400 space-y-2">
          <div className="w-7 h-7 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Memuat dokumen PRD proyek...</p>
        </div>
      ) : !prdDoc ? (
        /* Empty State: No PRD Document Created Yet */
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">Belum Ada Dokumen PRD</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Proyek ini belum memiliki dokumen Product Requirement Document (PRD). Anda dapat menyusun draf dokumen secara otomatis menggunakan AI dari kebutuhan (Requirements), keputusan (ADR), dan scope proyek.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsPromptModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs active:scale-[0.98] transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Susun Draf PRD Sekarang</span>
            </button>
          </div>
        </div>
      ) : (
        /* Active PRD Document Workspace */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Title Editor (in edit mode) */}
          {viewMode === "edit" && !isFinal && (
            <div className="p-4 bg-slate-50/60 border-b border-slate-200">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Judul Dokumen PRD:
              </label>
              <input
                type="text"
                value={prdTitle}
                onChange={(e) => setPrdTitle(e.target.value)}
                className="w-full font-bold text-slate-900 text-base bg-white border border-slate-200 rounded-xl px-3.5 py-2 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/10 transition-all"
                placeholder="Contoh: Product Requirement Document (PRD): Sistem Kasir..."
              />
            </div>
          )}

          {/* View Mode: Edit vs Preview */}
          <div className="p-5 min-h-[500px]">
            {viewMode === "edit" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                  <span className="font-medium">
                    Editor Markdown {isFinal ? "(Hanya Lihat - Dokumen Terkunci)" : "(Dapat diedit langsung)"}:
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {prdContent.length} karakter • {prdContent.split("\\n").length} baris
                  </span>
                </div>
                <textarea
                  rows={26}
                  readOnly={isFinal}
                  value={prdContent}
                  onChange={(e) => setPrdContent(e.target.value)}
                  placeholder="Tulis atau sunting spesifikasi produk dalam format Markdown..."
                  className={`w-full p-4 font-mono text-xs border border-slate-200 rounded-xl leading-relaxed focus:outline-none ${
                    isFinal
                      ? "bg-slate-50/80 text-slate-600 cursor-not-allowed"
                      : "bg-slate-50/40 text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  }`}
                />
              </div>
            ) : (
              <div className="prose prose-slate max-w-none">
                <MarkdownViewer content={prdContent} title={prdTitle} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Generate Prompt Modal */}
      {isPromptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {prdDoc ? "Susun Ulang PRD dengan AI" : "Susun Draf PRD Otomatis"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPromptModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              AI akan menyusun draf Product Requirement Document secara terstruktur menggunakan bukti faktual dari Brief, Requirements, ADR Keputusan, dan Ruang Lingkup proyek (Model: <code>gemini-3.5-flash-lite</code>).
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Instruksi Khusus PM (Opsional)
              </label>
              <textarea
                rows={3}
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Contoh: Berikan penekanan pada integrasi payment gateway dan arsitektur multi-tenant..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white text-slate-900"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPromptModalOpen(false)}
                className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleGeneratePRD(customInstructions)}
                disabled={isGenerating}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Menyusun Dokumen...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{prdDoc ? "Susun Ulang Sekarang" : "Mulai Penyusunan"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
