"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FileUp,
  FolderArchive,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  Download,
  Archive,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  PackageCheck,
  Eye,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import {
  ProjectResource,
  formatBytes,
  formatDate,
  formatDateTime,
  downloadResourceFile,
  MAX_FILE_SIZE_BYTES,
  DANGEROUS_EXTENSIONS,
} from "./types";
import { isPreviewable } from "./resourcePreview";
import { ResourcePreviewModal } from "./ResourcePreviewModal";

interface ResourcesFilesViewProps {
  projectId: string;
}

export function ResourcesFilesView({ projectId }: ResourcesFilesViewProps) {
  const [resources, setResources] = useState<ProjectResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [resourceToArchive, setResourceToArchive] = useState<ProjectResource | null>(null);
  const [resourceToRestore, setResourceToRestore] = useState<ProjectResource | null>(null);
  const [resourceToDeliverable, setResourceToDeliverable] = useState<ProjectResource | null>(null);
  const [previewResource, setPreviewResource] = useState<ProjectResource | null>(null);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download & action processing state
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Deliverable registration form state
  const [delivName, setDelivName] = useState("");
  const [delivVersion, setDelivVersion] = useState("v1.0.0");
  const [delivDate, setDelivDate] = useState("");
  const [delivStatus, setDelivStatus] = useState<"DRAFT" | "SUBMITTED" | "ACCEPTED" | "REJECTED">("SUBMITTED");
  const [delivDescription, setDelivDescription] = useState("");
  const [delivError, setDelivError] = useState<string | null>(null);
  const [isRegisteringDeliv, setIsRegisteringDeliv] = useState(false);

  const fetchFiles = useCallback(async () => {
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
      setError("Gagal memuat berkas proyek.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Flash message timeout
  useEffect(() => {
    if (actionSuccessMessage) {
      const t = setTimeout(() => setActionSuccessMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [actionSuccessMessage]);

  const handleFileSelect = (selected: File) => {
    setUploadError(null);
    const lowerName = selected.name.toLowerCase();
    for (const ext of DANGEROUS_EXTENSIONS) {
      if (lowerName.endsWith(ext)) {
        setUploadError(`Ekstensi '${ext}' dilarang demi keamanan sistem.`);
        return;
      }
    }

    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(
        `Ukuran file (${formatBytes(selected.size)}) melebihi batas maksimum 25 MB.`
      );
      return;
    }

    setUploadFile(selected);
    if (!uploadName.trim()) {
      setUploadName(selected.name);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError("Pilih berkas terlebih dahulu.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      if (uploadName.trim()) {
        formData.append("name", uploadName.trim());
      }
      if (uploadDescription.trim()) {
        formData.append("description", uploadDescription.trim());
      }

      const res = await apiClient<ProjectResource>(
        `/projects/${projectId}/resources/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (res.error) {
        setUploadError(res.error);
      } else {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadName("");
        setUploadDescription("");
        setActionSuccessMessage(`Berkas '${uploadFile.name}' berhasil diunggah.`);
        await fetchFiles();
      }
    } catch {
      setUploadError("Terjadi kesalahan saat mengunggah berkas.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (resource: ProjectResource) => {
    setDownloadingId(resource.id);
    const fileName = resource.file_name || resource.name;
    const result = await downloadResourceFile(projectId, resource.id, fileName);
    setDownloadingId(null);
    if (!result.success && result.error) {
      alert(result.error);
    }
  };

  const handleConfirmArchive = async () => {
    if (!resourceToArchive) return;
    setIsProcessingAction(true);
    try {
      const res = await apiClient<ProjectResource>(
        `/projects/${projectId}/resources/${resourceToArchive.id}/archive`,
        { method: "POST" }
      );
      if (res.error) {
        alert(res.error);
      } else {
        setActionSuccessMessage(`Berkas '${resourceToArchive.name}' berhasil diarsipkan.`);
        setResourceToArchive(null);
        await fetchFiles();
      }
    } catch {
      alert("Gagal mengarsipkan berkas.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!resourceToRestore) return;
    setIsProcessingAction(true);
    try {
      const res = await apiClient<ProjectResource>(
        `/projects/${projectId}/resources/${resourceToRestore.id}/restore`,
        { method: "POST" }
      );
      if (res.error) {
        alert(res.error);
      } else {
        setActionSuccessMessage(`Berkas '${resourceToRestore.name}' berhasil dipulihkan.`);
        setResourceToRestore(null);
        await fetchFiles();
      }
    } catch {
      alert("Gagal memulihkan berkas.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleOpenDeliverableModal = (resource: ProjectResource) => {
    setResourceToDeliverable(resource);
    setDelivName(resource.name);
    setDelivVersion("v1.0.0");
    setDelivDate(new Date().toISOString().split("T")[0]);
    setDelivStatus("SUBMITTED");
    setDelivDescription(resource.description || "");
    setDelivError(null);
  };

  const handleRegisterDeliverableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceToDeliverable) return;
    if (!delivName.trim()) {
      setDelivError("Nama deliverable tidak boleh kosong.");
      return;
    }
    if (!delivVersion.trim()) {
      setDelivError("Versi deliverable wajib diisi (contoh: v1.0.0).");
      return;
    }

    setIsRegisteringDeliv(true);
    setDelivError(null);
    try {
      const res = await apiClient<ProjectResource>(
        `/projects/${projectId}/resources/${resourceToDeliverable.id}/register-deliverable`,
        {
          method: "POST",
          body: JSON.stringify({
            name: delivName.trim(),
            deliverable_version: delivVersion.trim(),
            delivery_date: delivDate || null,
            deliverable_status: delivStatus,
            description: delivDescription.trim() || null,
          }),
        }
      );
      if (res.error) {
        setDelivError(res.error);
      } else {
        setResourceToDeliverable(null);
        setActionSuccessMessage(
          `Deliverable '${delivName}' berhasil didaftarkan ke Arsip Deliverable.`
        );
      }
    } catch {
      setDelivError("Gagal mendaftarkan deliverable.");
    } finally {
      setIsRegisteringDeliv(false);
    }
  };

  const filteredResources = resources
    .filter((item) => {
      // Strict domain boundary: only non-text FILE resources in Berkas Proyek
      // Markdown and text documents have their own dedicated "File Teks" tab
      if (item.resource_type !== "FILE") return false;

      const fn = (item.file_name || "").toLowerCase();
      const mime = (item.mime_type || "").toLowerCase();
      const isTextDoc =
        fn.endsWith(".md") ||
        fn.endsWith(".markdown") ||
        fn.endsWith(".txt") ||
        mime.includes("text/markdown") ||
        mime.includes("text/plain") ||
        mime.includes("text/x-markdown");

      if (isTextDoc) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchFile = item.file_name?.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        return matchName || matchFile || matchDesc;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.status === "ACTIVE" && b.status === "ARCHIVED") return -1;
      if (a.status === "ARCHIVED" && b.status === "ACTIVE") return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const renderFileIcon = (fileName?: string | null, mime?: string | null) => {
    const fn = (fileName || "").toLowerCase();
    const m = (mime || "").toLowerCase();
    if (fn.endsWith(".pdf") || m.includes("pdf")) {
      return <FileText className="w-5 h-5 text-rose-500" />;
    }
    if (
      fn.endsWith(".xlsx") ||
      fn.endsWith(".xls") ||
      fn.endsWith(".csv") ||
      m.includes("sheet") ||
      m.includes("excel") ||
      m.includes("csv")
    ) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    }
    if (
      fn.endsWith(".zip") ||
      fn.endsWith(".tar") ||
      fn.endsWith(".gz") ||
      fn.endsWith(".7z") ||
      fn.endsWith(".rar") ||
      m.includes("zip") ||
      m.includes("tar") ||
      m.includes("compressed")
    ) {
      return <FileArchive className="w-5 h-5 text-amber-500" />;
    }
    if (
      fn.endsWith(".png") ||
      fn.endsWith(".jpg") ||
      fn.endsWith(".jpeg") ||
      fn.endsWith(".svg") ||
      fn.endsWith(".webp") ||
      m.includes("image")
    ) {
      return <FileImage className="w-5 h-5 text-indigo-500" />;
    }
    return <FileText className="w-5 h-5 text-slate-500" />;
  };

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

      {/* Header Bar: Title, Search, and Upload Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Berkas Proyek</h2>
          <p className="text-xs text-slate-500">Berkas dan dokumen pendukung proyek</p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari berkas..."
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

          {/* Upload Button */}
          <button
            type="button"
            onClick={() => {
              setUploadError(null);
              setUploadFile(null);
              setUploadName("");
              setUploadDescription("");
              setShowUploadModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-black transition-all shadow-xs cursor-pointer shrink-0"
          >
            <FileUp className="w-3.5 h-3.5 text-slate-300" />
            <span>Unggah Berkas</span>
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Memuat berkas proyek...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center shadow-xs">
          <div className="max-w-md mx-auto space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900">Gagal Memuat Berkas</h4>
            <p className="text-xs text-slate-500">{error}</p>
            <button
              type="button"
              onClick={fetchFiles}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-black cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Lagi</span>
            </button>
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
                  ? "Tidak Ada Berkas yang Cocok"
                  : "Berkas Proyek Belum Memiliki Berkas"}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {searchQuery
                  ? `Pencarian untuk "${searchQuery}" tidak menemukan berkas apapun.`
                  : "Unggah berkas atau dokumen pendukung untuk mulai mengisi repositori berkas proyek ini."}
              </p>
            </div>

            {!searchQuery && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-black transition-all shadow-xs cursor-pointer"
                >
                  <FileUp className="w-3.5 h-3.5 text-slate-300" />
                  <span>Unggah Berkas</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

          {/* File List Cards */}
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
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                          {renderFileIcon(file.file_name, file.mime_type)}
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
                            {file.file_name || "Tanpa nama berkas"}
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
                        <span title={`Diunggah: ${formatDateTime(file.created_at)}`}>
                          {formatDate(file.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Preview button for supported formats */}
                        {isPreviewable(file.file_name, file.mime_type) && (
                          <button
                            type="button"
                            onClick={() => setPreviewResource(file)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 transition-all cursor-pointer"
                            title="Lihat Preview Berkas"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Preview</span>
                          </button>
                        )}

                        {/* Download button */}
                        <button
                          type="button"
                          onClick={() => handleDownload(file)}
                          disabled={isDownloading}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all cursor-pointer disabled:opacity-50"
                          title="Unduh Berkas Resmi"
                        >
                          {isDownloading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5 text-slate-600" />
                          )}
                          <span>Unduh</span>
                        </button>

                        {/* Promote to Deliverable */}
                        {!isArchived && (
                          <button
                            type="button"
                            onClick={() => handleOpenDeliverableModal(file)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 transition-all cursor-pointer"
                            title="Daftarkan Berkas Ini Sebagai Deliverable Resmi"
                          >
                            <PackageCheck className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="hidden sm:inline">Jadikan Deliverable</span>
                          </button>
                        )}

                        {/* Archive or Restore */}
                        {!isArchived ? (
                          <button
                            type="button"
                            onClick={() => setResourceToArchive(file)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50 transition-all cursor-pointer"
                            title="Arsipkan Berkas"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setResourceToRestore(file)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all cursor-pointer"
                            title="Pulihkan Berkas ke Aktif"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Pulihkan</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

      {/* Upload File Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileUp className="w-4 h-4 text-slate-800" />
                <h4 className="text-sm font-bold text-slate-900">
                  Unggah Berkas Proyek
                </h4>
              </div>
              <button
                type="button"
                onClick={() => !isUploading && setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer disabled:opacity-50"
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{uploadError}</span>
                </div>
              )}

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                  isDragOver
                    ? "border-slate-900 bg-slate-50"
                    : uploadFile
                    ? "border-emerald-300 bg-emerald-50/40"
                    : "border-slate-200 hover:border-slate-400 bg-slate-50/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                {uploadFile ? (
                  <div className="space-y-1">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-slate-900 text-xs truncate max-w-xs mx-auto">
                      {uploadFile.name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {formatBytes(uploadFile.size)}
                    </p>
                    <p className="text-[10px] text-emerald-700 font-semibold pt-1">
                      Klik untuk mengganti berkas
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center mx-auto shadow-2xs">
                      <FileUp className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-slate-800 text-xs">
                      Pilih berkas atau seret ke sini
                    </p>
                    <p className="text-[11px] text-slate-400">
                      PDF, Dokumen Office, ZIP, Gambar (Maksimum 25 MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Resource Custom Name */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Nama Label Berkas (Opsional)
                </label>
                <input
                  type="text"
                  placeholder={uploadFile ? uploadFile.name : "Contoh: Briefing Klien Final v2"}
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Deskripsi / Catatan Konteks (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan singkat tentang isi berkas ini..."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  disabled={isUploading}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || isUploading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-black transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengunggah...</span>
                    </>
                  ) : (
                    <>
                      <FileUp className="w-3.5 h-3.5 text-slate-300" />
                      <span>Unggah Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Confirmation Dialog */}
      {resourceToArchive && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center gap-2 text-amber-700 font-bold">
              <Archive className="w-4 h-4" />
              <h4 className="text-sm text-slate-900">Arsipkan Berkas?</h4>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Berkas <span className="font-semibold text-slate-900">&quot;{resourceToArchive.name}&quot;</span> akan ditandai sebagai arsip. Berkas tetap tersimpan di storage dan dapat dipulihkan kapan saja.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResourceToArchive(null)}
                disabled={isProcessingAction}
                className="px-3 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={isProcessingAction}
                className="inline-flex items-center gap-1 px-3.5 py-2 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {isProcessingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Ya, Arsipkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Dialog */}
      {resourceToRestore && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <RefreshCw className="w-4 h-4" />
              <h4 className="text-sm text-slate-900">Pulihkan Berkas?</h4>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Berkas <span className="font-semibold text-slate-900">&quot;{resourceToRestore.name}&quot;</span> akan dikembalikan ke status aktif dan muncul di daftar berkas utama proyek.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResourceToRestore(null)}
                disabled={isProcessingAction}
                className="px-3 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isProcessingAction}
                className="inline-flex items-center gap-1 px-3.5 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-black transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {isProcessingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Pulihkan Berkas</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register as Deliverable Modal */}
      {resourceToDeliverable && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-indigo-700" />
                <h4 className="text-sm font-bold text-slate-900">
                  Daftarkan Sebagai Deliverable Resmi
                </h4>
              </div>
              <button
                type="button"
                onClick={() => !isRegisteringDeliv && setResourceToDeliverable(null)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterDeliverableSubmit} className="space-y-3">
              {delivError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{delivError}</span>
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
                <span className="text-[11px] font-semibold text-slate-800 block">Sumber Berkas:</span>
                <span className="font-mono text-slate-700">{resourceToDeliverable.file_name}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  ({formatBytes(resourceToDeliverable.file_size_bytes)})
                </span>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Nama Deliverable *
                </label>
                <input
                  type="text"
                  value={delivName}
                  onChange={(e) => setDelivName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Versi Rilis *
                  </label>
                  <input
                    type="text"
                    value={delivVersion}
                    placeholder="v1.0.0"
                    onChange={(e) => setDelivVersion(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Tanggal Rilis
                  </label>
                  <input
                    type="date"
                    value={delivDate}
                    onChange={(e) => setDelivDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Status Deliverable
                </label>
                <select
                  value={delivStatus}
                  onChange={(e) => setDelivStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="DRAFT">DRAFT (Konsep Rilis)</option>
                  <option value="SUBMITTED">SUBMITTED (Diajukan ke Klien)</option>
                  <option value="ACCEPTED">ACCEPTED (Diterima / Disetujui)</option>
                  <option value="REJECTED">REJECTED (Perlu Revisi)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Deskripsi / Ringkasan Rilis (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={delivDescription}
                  onChange={(e) => setDelivDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResourceToDeliverable(null)}
                  disabled={isRegisteringDeliv}
                  className="px-3 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isRegisteringDeliv}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isRegisteringDeliv && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan ke Deliverables</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* File Preview Modal */}
      {previewResource && (
        <ResourcePreviewModal
          projectId={projectId}
          resource={previewResource}
          onClose={() => setPreviewResource(null)}
          onDownload={() => handleDownload(previewResource)}
        />
      )}
    </div>
  );
}
