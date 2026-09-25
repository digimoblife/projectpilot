"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText,
  Plus,
  Search,
  Download,
  Archive,
  RefreshCw,
  Eye,
  Edit3,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Table,
  Quote,
  Minus,
  Link as LinkIcon,
  HelpCircle,
  FolderArchive,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiClient } from "@/lib/api-client";
import {
  ProjectResource,
  formatBytes,
  formatDate,
  formatDateTime,
  downloadResourceFile,
} from "./types";
import { ResourcePreviewModal } from "./ResourcePreviewModal";

interface ResourcesTextViewProps {
  projectId: string;
}

interface TextContentApiResponse {
  id: string;
  name: string;
  file_name: string;
  content: string;
}

export function ResourcesTextView({ projectId }: ResourcesTextViewProps) {
  const [resources, setResources] = useState<ProjectResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ACTIVE");

  // Modal editor states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docFileName, setDocFileName] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [docContent, setDocContent] = useState("");
  const [editorMode, setEditorMode] = useState<"write" | "preview" | "split">("split");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDocContent, setIsLoadingDocContent] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isFileNameManuallyEdited, setIsFileNameManuallyEdited] = useState(false);

  // Modal preview & actions
  const [previewResource, setPreviewResource] = useState<ProjectResource | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [resourceToArchive, setResourceToArchive] = useState<ProjectResource | null>(null);
  const [resourceToRestore, setResourceToRestore] = useState<ProjectResource | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch file list
  const fetchResources = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient<ProjectResource[]>(
        `/projects/${projectId}/resources?type=FILE&include_archived=true`
      );
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setResources(res.data);
      }
    } catch {
      setError("Gagal memuat daftar dokumen teks proyek.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Flash message timeout
  useEffect(() => {
    if (actionSuccessMessage) {
      const timer = setTimeout(() => setActionSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccessMessage]);

  // Filter only text & markdown files
  const filteredResources = resources
    .filter((res) => {
      if (res.resource_type !== "FILE") return false;

      const fn = (res.file_name || "").toLowerCase();
      const mime = (res.mime_type || "").toLowerCase();
      const isTextDoc =
        fn.endsWith(".md") ||
        fn.endsWith(".markdown") ||
        fn.endsWith(".txt") ||
        mime.includes("text/markdown") ||
        mime.includes("text/plain") ||
        mime.includes("text/x-markdown");

      if (!isTextDoc) return false;

      if (statusFilter === "ACTIVE" && res.status !== "ACTIVE") return false;
      if (statusFilter === "ARCHIVED" && res.status !== "ARCHIVED") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = res.name.toLowerCase().includes(q);
        const matchFileName = fn.includes(q);
        const matchDesc = (res.description || "").toLowerCase().includes(q);
        return matchName || matchFileName || matchDesc;
      }

      return true;
    })
    .sort((a, b) => {
      if (a.status === "ACTIVE" && b.status === "ARCHIVED") return -1;
      if (a.status === "ARCHIVED" && b.status === "ACTIVE") return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Helper auto-format slug file name from title
  const generateFileNameFromTitle = (title: string): string => {
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s_-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    return slug ? `${slug}.md` : "dokumen.md";
  };

  const handleTitleChange = (val: string) => {
    setDocTitle(val);
    if (!isEditing && !isFileNameManuallyEdited) {
      setDocFileName(generateFileNameFromTitle(val));
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingResourceId(null);
    setDocTitle("");
    setDocFileName("dokumen-baru.md");
    setDocDescription("");
    setDocContent(
      "# Dokumen Baru\n\nTuliskan catatan, petunjuk teknis, atau dokumentasi arsitektur di sini.\n\n## Poin Utama\n- Poin pertama\n- Poin kedua\n"
    );
    setEditorMode("split");
    setEditorError(null);
    setIsFileNameManuallyEdited(false);
    setIsEditorOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = async (resource: ProjectResource) => {
    setIsEditing(true);
    setEditingResourceId(resource.id);
    setDocTitle(resource.name);
    setDocFileName(resource.file_name || "dokumen.md");
    setDocDescription(resource.description || "");
    setDocContent("");
    setEditorMode("split");
    setEditorError(null);
    setIsFileNameManuallyEdited(true);
    setIsEditorOpen(true);
    setIsLoadingDocContent(true);

    try {
      const res = await apiClient<TextContentApiResponse>(
        `/projects/${projectId}/resources/${resource.id}/content`
      );
      if (res.error) {
        setEditorError(res.error);
      } else if (res.data) {
        setDocContent(res.data.content);
      }
    } catch {
      setEditorError("Gagal mengambil isi teks dokumen.");
    } finally {
      setIsLoadingDocContent(false);
    }
  };

  // Save document (Create or Update)
  const handleSaveDocument = async () => {
    setEditorError(null);
    if (!docTitle.trim()) {
      setEditorError("Judul dokumen wajib diisi.");
      return;
    }

    let finalFileName = docFileName.trim();
    if (!finalFileName) {
      finalFileName = generateFileNameFromTitle(docTitle);
    }
    const lowerFn = finalFileName.toLowerCase();
    if (!lowerFn.endsWith(".md") && !lowerFn.endsWith(".markdown") && !lowerFn.endsWith(".txt")) {
      finalFileName = `${finalFileName}.md`;
    }

    setIsSaving(true);
    try {
      if (isEditing && editingResourceId) {
        const payload = {
          name: docTitle.trim(),
          file_name: finalFileName,
          description: docDescription.trim() || null,
          content: docContent,
        };
        const res = await apiClient<ProjectResource>(
          `/projects/${projectId}/resources/${editingResourceId}/text`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );
        if (res.error) {
          setEditorError(res.error);
        } else {
          setIsEditorOpen(false);
          setActionSuccessMessage(`Dokumen '${docTitle}' berhasil diperbarui.`);
          fetchResources();
        }
      } else {
        const payload = {
          name: docTitle.trim(),
          file_name: finalFileName,
          description: docDescription.trim() || null,
          content: docContent,
        };
        const res = await apiClient<ProjectResource>(
          `/projects/${projectId}/resources/text`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );
        if (res.error) {
          setEditorError(res.error);
        } else {
          setIsEditorOpen(false);
          setActionSuccessMessage(`Dokumen '${docTitle}' berhasil dibuat dan disimpan.`);
          fetchResources();
        }
      }
    } catch {
      setEditorError("Terjadi kesalahan saat menyimpan dokumen.");
    } finally {
      setIsSaving(false);
    }
  };

  // Download action
  const handleDownload = async (resource: ProjectResource) => {
    setDownloadingId(resource.id);
    const fileName = resource.file_name || `${resource.name}.md`;
    const res = await downloadResourceFile(projectId, resource.id, fileName);
    setDownloadingId(null);
    if (!res.success) {
      setError(res.error || "Gagal mengunduh berkas.");
    }
  };

  // Archive & Restore actions
  const handleArchiveConfirm = async () => {
    if (!resourceToArchive) return;
    setIsProcessingAction(true);
    try {
      const res = await apiClient(
        `/projects/${projectId}/resources/${resourceToArchive.id}/archive`,
        { method: "POST" }
      );
      if (res.error) {
        setError(res.error);
      } else {
        setActionSuccessMessage(`Dokumen '${resourceToArchive.name}' berhasil diarsipkan.`);
        setResourceToArchive(null);
        fetchResources();
      }
    } catch {
      setError("Gagal mengarsipkan dokumen.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRestoreConfirm = async () => {
    if (!resourceToRestore) return;
    setIsProcessingAction(true);
    try {
      const res = await apiClient(
        `/projects/${projectId}/resources/${resourceToRestore.id}/restore`,
        { method: "POST" }
      );
      if (res.error) {
        setError(res.error);
      } else {
        setActionSuccessMessage(`Dokumen '${resourceToRestore.name}' berhasil dipulihkan.`);
        setResourceToRestore(null);
        fetchResources();
      }
    } catch {
      setError("Gagal memulihkan dokumen.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Toolbar action helpers
  const insertTextAtCursor = (prefix: string, suffix: string = "", placeholder: string = "") => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = el.value.substring(start, end) || placeholder;
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newContent =
      el.value.substring(0, start) + replacement + el.value.substring(end);
    setDocContent(newContent);

    setTimeout(() => {
      el.focus();
      const newCursorPos = start + prefix.length + selectedText.length;
      el.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Stats
  const wordCount = docContent.trim() ? docContent.trim().split(/\s+/).length : 0;
  const charCount = docContent.length;
  const lineCount = docContent ? docContent.split("\n").length : 0;

  return (
    <div className="space-y-6">
      {/* Toast feedback banner */}
      {actionSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs transition-all">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Error Alert */}
      {error && (
        <div className="bg-white rounded-2xl border border-rose-200 p-4 shadow-xs flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Bar: Title, Search, and Create Action (Consistent with Berkas Proyek & Tautan Referensi) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">File Teks</h2>
          <p className="text-xs text-slate-500">Dokumen dan catatan markdown proyek</p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari dokumen teks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Create Document Button */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-black transition-all shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-slate-300" />
            <span>Buat Dokumen</span>
          </button>
        </div>
      </div>

      {/* Status Filter Pills (Consistent with Tautan Referensi) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            statusFilter === "ALL"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/80"
          }`}
        >
          Semua
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("ACTIVE")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            statusFilter === "ACTIVE"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/80"
          }`}
        >
          Aktif
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("ARCHIVED")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            statusFilter === "ARCHIVED"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/80"
          }`}
        >
          Diarsipkan
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Memuat dokumen teks...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredResources.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-xs text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 shadow-xs">
              <FolderArchive className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                {searchQuery
                  ? "Tidak Ada Dokumen Teks yang Cocok"
                  : "Belum Memiliki Dokumen Teks"}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {searchQuery
                  ? `Pencarian untuk "${searchQuery}" tidak menemukan dokumen teks apapun.`
                  : "Buat dokumen markdown untuk menyimpan catatan teknis, panduan arsitektur, checklist, atau spesifikasi dokumen proyek."}
              </p>
            </div>

            {!searchQuery && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-black transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-300" />
                  <span>Buat Dokumen</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* File List Cards (Consistent with Berkas Proyek grid and styling) */}
      {!isLoading && !error && filteredResources.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredResources.map((file) => {
            const isArchived = file.status === "ARCHIVED";
            const isDownloading = downloadingId === file.id;

            return (
              <div
                key={file.id}
                className={`bg-white rounded-2xl border p-4 shadow-xs transition-all flex flex-col justify-between gap-3 ${
                  isArchived
                    ? "border-amber-200/70 bg-amber-50/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 text-slate-600">
                      <FileText className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-xs font-bold truncate ${
                            isArchived ? "text-slate-600 line-through decoration-amber-500" : "text-slate-900"
                          }`}
                          title={file.name}
                        >
                          {file.name}
                        </h4>
                        {isArchived ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-semibold uppercase tracking-wider shrink-0">
                            Diarsipkan
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold shrink-0">
                            Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5" title={file.file_name || ""}>
                        {file.file_name || "dokumen.md"}
                      </p>
                      {file.description && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {file.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-700">
                      {formatBytes(file.file_size_bytes)}
                    </span>
                    <span>•</span>
                    <span title={`Diperbarui: ${formatDateTime(file.updated_at || file.created_at)}`}>
                      {formatDate(file.updated_at || file.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* View Preview Button */}
                    <button
                      type="button"
                      onClick={() => setPreviewResource(file)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Lihat Pratinjau Dokumen"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit Button */}
                    {!isArchived && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(file)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Dokumen Markdown"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Download Button */}
                    <button
                      type="button"
                      onClick={() => handleDownload(file)}
                      disabled={isDownloading}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      title="Unduh Berkas Markdown (.md)"
                    >
                      {isDownloading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-700" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Archive / Restore Button */}
                    {isArchived ? (
                      <button
                        type="button"
                        onClick={() => setResourceToRestore(file)}
                        className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Pulihkan Dokumen"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setResourceToArchive(file)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Arsipkan Dokumen"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL EDITOR: CREATE / EDIT MARKDOWN DOCUMENT */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isEditing ? "Edit Dokumen Markdown" : "Buat Dokumen Teks Baru"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gunakan sintaks Markdown standar untuk memformat dokumen.
                  </p>
                </div>
              </div>

              <button
                onClick={() => !isSaving && setIsEditorOpen(false)}
                disabled={isSaving}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content / Form Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {editorError && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editorError}</span>
                </div>
              )}

              {/* Title and Filename Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Judul Dokumen <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Arsitektur Sistem dan API"
                    value={docTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    disabled={isSaving}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-300 transition-all font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nama Berkas (.md) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="arsitektur-sistem.md"
                    value={docFileName}
                    onChange={(e) => {
                      setIsFileNameManuallyEdited(true);
                      setDocFileName(e.target.value);
                    }}
                    disabled={isSaving}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-300 transition-all font-mono text-slate-800"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Deskripsi Singkat (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Keterangan singkat isi dokumen..."
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  disabled={isSaving}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-300 transition-all text-slate-800"
                />
              </div>

              {/* Editor Workspace with Toolbar & Modes */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 flex flex-col">
                {/* Toolbar */}
                <div className="px-3 py-2 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("**", "**", "teks tebal")}
                      title="Tebal (Bold)"
                      className="p-1.5 text-slate-700 hover:bg-white hover:text-slate-900 rounded-md transition-colors cursor-pointer"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("*", "*", "teks miring")}
                      title="Miring (Italic)"
                      className="p-1.5 text-slate-700 hover:bg-white hover:text-slate-900 rounded-md transition-colors cursor-pointer"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-4 bg-slate-300 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("# ", "", "Judul Utama")}
                      title="Heading 1"
                      className="p-1.5 text-slate-700 hover:bg-white hover:text-slate-900 rounded-md transition-colors cursor-pointer"
                    >
                      <Heading1 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("## ", "", "Sub Judul")}
                      title="Heading 2"
                      className="p-1.5 text-slate-700 hover:bg-white hover:text-slate-900 rounded-md transition-colors cursor-pointer"
                    >
                      <Heading2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("### ", "", "Topik Detail")}
                      title="Heading 3"
                      className="p-1.5 text-slate-700 hover:bg-white hover:text-slate-900 rounded-md transition-colors cursor-pointer"
                    >
                      <Heading3 className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-4 bg-slate-300 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("- ", "", "Item daftar")}
                      title="Daftar Poin"
                      className="p-1.5 text-slate-700 hover:bg-white hover:text-slate-900 rounded-md transition-colors cursor-pointer"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("1. ", "", "Item berurutan")}
                      title="Daftar Angka"
                      className="p-1.5 text-slate-700 hover:bg-white hover:text-slate-900 rounded-md transition-colors cursor-pointer"
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("- [ ] ", "", "Tugas baru")}
                      title="Checklist Tugas"
                      className="p-1.5 text-slate-700 hover:bg-white hover:text-slate-900 rounded-md transition-colors cursor-pointer"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-4 bg-slate-300 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("```typescript\n", "\n```", "// Tulis kode di sini")}
                      title="Blok Kode"
                      className="p-1.5 text-slate-700 hover:bg-white hover:text-slate-900 rounded-md transition-colors cursor-pointer"
                    >
                      <Code className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertTextAtCursor(
                          "| Kolom 1 | Kolom 2 |\n|---|---|\n| Data 1 | Data 2 |\n"
                        )
                      }
                      title="Tabel"
                      className="p-1.5 text-slate-700 hover:bg-white hover:text-slate-900 rounded-md transition-colors cursor-pointer"
                    >
                      <Table className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("> ", "", "Kutipan atau catatan penting")}
                      title="Kutipan (Quote)"
                      className="p-1.5 text-slate-700 hover:bg-white hover:text-slate-900 rounded-md transition-colors cursor-pointer"
                    >
                      <Quote className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("\n---\n")}
                      title="Garis Pemisah"
                      className="p-1.5 text-slate-700 hover:bg-white hover:text-slate-900 rounded-md transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("[", "](https://example.com)", "Teks Tautan")}
                      title="Tautan (Link)"
                      className="p-1.5 text-slate-700 hover:bg-white hover:text-slate-900 rounded-md transition-colors cursor-pointer"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Mode switcher tabs */}
                  <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setEditorMode("write")}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        editorMode === "write"
                          ? "bg-slate-900 text-white font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Tulis
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode("split")}
                      className={`hidden lg:block px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        editorMode === "split"
                          ? "bg-slate-900 text-white font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Berdampingan
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode("preview")}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        editorMode === "preview"
                          ? "bg-slate-900 text-white font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Pratinjau
                    </button>
                  </div>
                </div>

                {/* Editor Content Area */}
                {isLoadingDocContent ? (
                  <div className="flex flex-col items-center justify-center py-24 bg-white">
                    <Loader2 className="w-8 h-8 text-slate-500 animate-spin mb-2" />
                    <p className="text-xs text-slate-500">Memuat isi dokumen...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 min-h-[360px] max-h-[460px] bg-white">
                    {editorMode === "split" ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 h-full">
                        <textarea
                          ref={textareaRef}
                          value={docContent}
                          onChange={(e) => setDocContent(e.target.value)}
                          placeholder="Ketik konten markdown di sini..."
                          className="w-full h-[360px] p-4 text-xs font-mono text-slate-800 bg-white resize-none focus:outline-hidden leading-relaxed"
                          disabled={isSaving}
                        />
                        <div className="h-[360px] overflow-y-auto p-4 bg-slate-50/50">
                          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Hasil Pratinjau
                          </div>
                          <div className="prose prose-sm max-w-none text-slate-800">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {docContent || "*Belum ada konten untuk ditampilkan.*"}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ) : editorMode === "write" ? (
                      <textarea
                        ref={textareaRef}
                        value={docContent}
                        onChange={(e) => setDocContent(e.target.value)}
                        placeholder="Ketik konten markdown di sini..."
                        className="w-full h-[360px] p-4 text-xs font-mono text-slate-800 bg-white resize-none focus:outline-hidden leading-relaxed"
                        disabled={isSaving}
                      />
                    ) : (
                      <div className="h-[360px] overflow-y-auto p-5 bg-white">
                        <div className="prose prose-sm max-w-none text-slate-800">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {docContent || "*Belum ada konten untuk ditampilkan.*"}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Editor Footer / Stats Bar */}
                <div className="px-4 py-2 bg-slate-100/70 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-4">
                    <span>{wordCount} kata</span>
                    <span>{charCount} karakter</span>
                    <span>{lineCount} baris</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Mendukung sintaks GFM (GitHub Flavored Markdown)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveDocument}
                disabled={isSaving || isLoadingDocContent}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan Dokumen...</span>
                  </>
                ) : (
                  <span>{isEditing ? "Simpan Perubahan" : "Simpan Dokumen"}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW MARKDOWN */}
      {previewResource && (
        <ResourcePreviewModal
          projectId={projectId}
          resource={previewResource}
          onClose={() => setPreviewResource(null)}
          onDownload={() => handleDownload(previewResource)}
        />
      )}

      {/* CONFIRMATION MODAL: ARCHIVE */}
      {resourceToArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-md w-full">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <Archive className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Arsipkan Dokumen Teks?
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Dokumen <span className="font-semibold text-slate-800">&quot;{resourceToArchive.name}&quot;</span> akan dipindahkan ke daftar arsip. Anda dapat memulihkannya kembali kapan saja.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setResourceToArchive(null)}
                disabled={isProcessingAction}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleArchiveConfirm}
                disabled={isProcessingAction}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:pointer-events-none rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                {isProcessingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Ya, Arsipkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: RESTORE */}
      {resourceToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-md w-full">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Pulihkan Dokumen Teks?
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Dokumen <span className="font-semibold text-slate-800">&quot;{resourceToRestore.name}&quot;</span> akan dikembalikan ke status aktif dan muncul di daftar utama.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setResourceToRestore(null)}
                disabled={isProcessingAction}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleRestoreConfirm}
                disabled={isProcessingAction}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                {isProcessingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Ya, Pulihkan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
