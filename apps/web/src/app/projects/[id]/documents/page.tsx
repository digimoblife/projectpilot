"use client";

import React, { useEffect, useState, use } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileCode,
  FileSpreadsheet,
  FileText,
  Files,
  Filter,
  History,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  User,
  Users,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

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
  document_type: "FSD" | "USER_GUIDE" | "ADMIN_GUIDE" | "TECHNICAL_DOCUMENTATION" | "USER_DOCUMENTATION" | "DESIGN_DOCUMENTATION";
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

const docTypeConfigs = {
  FSD: { label: "FSD (Functional Spec)", color: "bg-blue-50 text-blue-700 border-blue-200", icon: FileSpreadsheet },
  USER_GUIDE: { label: "User Manual", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: BookOpen },
  ADMIN_GUIDE: { label: "Admin & Ops Guide", color: "bg-amber-50 text-amber-700 border-amber-200", icon: ShieldCheck },
  TECHNICAL_DOCUMENTATION: { label: "Technical Runbook", color: "bg-purple-50 text-purple-700 border-purple-200", icon: FileCode },
  USER_DOCUMENTATION: { label: "User Docs", color: "bg-teal-50 text-teal-700 border-teal-200", icon: FileText },
  DESIGN_DOCUMENTATION: { label: "Design Docs", color: "bg-rose-50 text-rose-700 border-rose-200", icon: Layers },
};

function ShieldCheck(props: any) {
  return <CheckCircle2 {...props} />;
}

const docStatusConfigs = {
  DRAFT: { label: "Draft AI", color: "bg-amber-50 text-amber-700 border-amber-200" },
  UNDER_REVIEW: { label: "Dalam Review", color: "bg-blue-50 text-blue-700 border-blue-200" },
  FINAL: { label: "Final (Resmi)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  SUPERSEDED: { label: "Tergantikan", color: "bg-slate-100 text-slate-500 border-slate-200" },
};

export default function ProjectDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { token } = useAuth();

  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<GeneratedDocument | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");

  // Generate Document Modal
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [docType, setDocType] = useState<"FSD" | "USER_GUIDE" | "ADMIN_GUIDE" | "TECHNICAL_DOCUMENTATION" | "DESIGN_DOCUMENTATION">("FSD");
  const [customInstructions, setCustomInstructions] = useState("");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [projectId, token]);

  async function fetchDocuments() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<GeneratedDocument[]>(`/projects/${projectId}/documents`, { headers });
      if (res.data) {
        setDocuments(res.data);
        if (selectedDoc) {
          const updated = res.data.find((d) => d.id === selectedDoc.id);
          if (updated) {
            setSelectedDoc(updated);
            setEditedTitle(updated.title);
            setEditedContent(updated.content);
          }
        } else if (res.data.length > 0) {
          setSelectedDoc(res.data[0]);
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

  async function handleGenerateDocument(e: React.FormEvent) {
    e.preventDefault();
    setGenerateError(null);
    setIsGenerating(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<GeneratedDocument>(`/projects/${projectId}/documents/generate-draft`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          document_type: docType,
          custom_instructions: customInstructions || null,
        }),
      });

      if (res.data) {
        setIsGenerateModalOpen(false);
        setCustomInstructions("");
        fetchDocuments();
        setSelectedDoc(res.data);
        setEditedTitle(res.data.title);
        setEditedContent(res.data.content);
      } else {
        setGenerateError(res.error || "Gagal membuat draft dokumen.");
      }
    } catch {
      setGenerateError("Terjadi kesalahan sistem saat generate dokumen.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSaveEdits() {
    if (!selectedDoc) return;
    setIsSaving(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<GeneratedDocument>(`/projects/${projectId}/documents/${selectedDoc.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          title: editedTitle,
          content: editedContent,
        }),
      });

      if (res.data) {
        setSelectedDoc(res.data);
        setIsEditing(false);
        fetchDocuments();
      }
    } catch {
      // Handled
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFinalizeDocument() {
    if (!selectedDoc) return;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<GeneratedDocument>(`/projects/${projectId}/documents/${selectedDoc.id}/finalize`, {
        method: "POST",
        headers,
      });

      if (res.data) {
        setSelectedDoc(res.data);
        fetchDocuments();
      }
    } catch {
      // Handled
    }
  }

  async function handleCreateRevision() {
    if (!selectedDoc) return;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<GeneratedDocument>(`/projects/${projectId}/documents/${selectedDoc.id}/create-version`, {
        method: "POST",
        headers,
      });

      if (res.data) {
        fetchDocuments();
        setSelectedDoc(res.data);
        setEditedTitle(res.data.title);
        setEditedContent(res.data.content);
        setIsEditing(true);
      }
    } catch {
      // Handled
    }
  }

  function handleDownloadMarkdown() {
    if (!selectedDoc) return;
    const blob = new Blob([selectedDoc.content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedDoc.document_key}_${selectedDoc.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.document_key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedTypeFilter === "ALL" || d.document_type === selectedTypeFilter;
    const matchesStatus = selectedStatusFilter === "ALL" || d.status === selectedStatusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Dokumentasi Final Proyek</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
              AI Documentation Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Generator draft FSD, User Guide, Admin Guide, dan Technical Architecture Runbook berbasis bukti deliverable proyek.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsGenerateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          <Sparkles className="w-4 h-4 text-sky-200" />
          <span>✨ Generate Dokumen Baru</span>
        </button>
      </div>

      {/* Main Grid: Document List (4 cols) & Document Viewer / Editor (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Documents List */}
        <div className="lg:col-span-4 space-y-3">
          {/* Search & Filter */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari dokumen..."
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
                {Object.keys(docTypeConfigs).map((k) => (
                  <option key={k} value={k}>
                    {docTypeConfigs[k as keyof typeof docTypeConfigs].label}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="text-[11px] px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-slate-700"
              >
                <option value="ALL">Semua Status</option>
                {Object.keys(docStatusConfigs).map((k) => (
                  <option key={k} value={k}>
                    {docStatusConfigs[k as keyof typeof docStatusConfigs].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
              Memuat arsip dokumen...
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500 space-y-2">
              <Files className="w-8 h-8 text-slate-300 mx-auto" />
              <p>Belum ada dokumen yang dibuat.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
              {filteredDocs.map((d) => {
                const typeCfg = docTypeConfigs[d.document_type] || docTypeConfigs.FSD;
                const statusCfg = docStatusConfigs[d.status] || docStatusConfigs.DRAFT;
                const isSelected = selectedDoc?.id === d.id;

                return (
                  <div
                    key={d.id}
                    onClick={() => {
                      setSelectedDoc(d);
                      setEditedTitle(d.title);
                      setEditedContent(d.content);
                      setIsEditing(false);
                    }}
                    className={`p-3.5 bg-white rounded-xl border cursor-pointer transition-all hover:shadow-xs ${
                      isSelected
                        ? "border-sky-500 ring-2 ring-sky-500/10"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {d.document_key} v{d.version}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${typeCfg.color}`}>
                          {typeCfg.label}
                        </span>
                      </div>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{d.title}</h4>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-2">
                      <CheckCircle2 className="w-3 h-3 text-slate-400" />
                      <span>{d.evidences.length} Sumber Bukti Terpetakan</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Markdown Document Editor & Live Preview */}
        <div className="lg:col-span-8">
          {selectedDoc ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
              {/* Document Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                      {selectedDoc.document_key} (Versi {selectedDoc.version})
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        docTypeConfigs[selectedDoc.document_type]?.color
                      }`}
                    >
                      {docTypeConfigs[selectedDoc.document_type]?.label}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        docStatusConfigs[selectedDoc.status]?.color
                      }`}
                    >
                      {docStatusConfigs[selectedDoc.status]?.label}
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
                    <h3 className="text-base font-bold text-slate-900">{selectedDoc.title}</h3>
                  )}

                  <span className="text-xs text-slate-500">
                    Dibuat pada: {new Date(selectedDoc.created_at).toLocaleDateString("id-ID")}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadMarkdown}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Unduh file .md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>

                  {selectedDoc.status !== "FINAL" && (
                    <>
                      {isEditing ? (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={handleSaveEdits}
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
                        onClick={handleFinalizeDocument}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Finalisasi Dokumen</span>
                      </button>
                    </>
                  )}

                  {selectedDoc.status === "FINAL" && (
                    <button
                      type="button"
                      onClick={handleCreateRevision}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold text-xs rounded-lg transition-colors"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Buat Versi Revisi</span>
                    </button>
                  )}
                </div>
              </div>

              {/* AI Summary Highlight */}
              {selectedDoc.summary && (
                <div className="p-3 bg-sky-50/60 border border-sky-200 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-sky-800 block mb-0.5">
                    Ringkasan Dokumen (AI Grounded):
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed">{selectedDoc.summary}</p>
                </div>
              )}

              {/* Document Editor or Rendered View */}
              {isEditing ? (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Editor Konten Markdown:</label>
                  <textarea
                    rows={18}
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full p-4 font-mono text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 block">Isi Dokumen Spesifikasi:</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(selectedDoc.content)}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Markdown</span>
                    </button>
                  </div>

                  <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                    {selectedDoc.content}
                  </div>
                </div>
              )}

              {/* Evidence Snapshot Accordion */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-900 block mb-1.5">
                  Bukti Dasar & Ketertelusuran (Evidence Snapshots: {selectedDoc.evidences.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDoc.evidences.map((ev) => (
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
              <Files className="w-8 h-8 text-slate-300 mx-auto" />
              <p>Pilih dokumen di sebelah kiri atau klik &quot;Generate Dokumen Baru&quot; untuk memulai.</p>
            </div>
          )}
        </div>
      </div>

      {/* GENERATE DOCUMENT MODAL */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Generator Dokumen Spesifikasi & Panduan</h3>
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

            <form onSubmit={handleGenerateDocument} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Dokumen *</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                >
                  <option value="FSD">FSD (Functional Specification Document)</option>
                  <option value="USER_GUIDE">Panduan Pengguna (User Manual)</option>
                  <option value="ADMIN_GUIDE">Panduan Administrator & Operasional</option>
                  <option value="TECHNICAL_DOCUMENTATION">Dokumentasi Teknis & Runbook Arsitektur</option>
                  <option value="DESIGN_DOCUMENTATION">Dokumentasi Desain & UI/UX</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Instruksi Khusus PM / Penekanan Modul (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Contoh: Berikan detail alur data pada integrasi webhook dan langkah rekonsiliasi manual."
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
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isGenerating ? "Gemini sedang menyusun draft..." : "Generate Dokumen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
