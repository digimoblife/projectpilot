"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileText,
  Info,
  PackageCheck,
  ShieldCheck,
  Search,
  AlertCircle,
  X,
  Loader2,
  RefreshCw,
  Plus,
  Download,
  ExternalLink,
  Edit3,
  Calendar,
  Layers,
  FolderArchive,
  Link2,
  Eye,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import {
  ProjectResource,
  RelatedResourceBrief,
  DeliverableStatus,
  formatDate,
  formatDateTime,
  formatBytes,
  downloadResourceFile,
} from "./types";
import { isPreviewable } from "./resourcePreview";
import { ResourcePreviewModal } from "./ResourcePreviewModal";

interface ResourcesDeliverablesViewProps {
  projectId: string;
}

const deliverableStatuses: { id: string; label: string; status?: DeliverableStatus }[] = [
  { id: "ALL", label: "Semua Deliverable" },
  { id: "ACCEPTED", label: "Disetujui (ACCEPTED)", status: "ACCEPTED" },
  { id: "SUBMITTED", label: "Diajukan (SUBMITTED)", status: "SUBMITTED" },
  { id: "DRAFT", label: "Konsep (DRAFT)", status: "DRAFT" },
  { id: "REJECTED", label: "Perlu Revisi (REJECTED)", status: "REJECTED" },
  { id: "ARCHIVED", label: "Diarsipkan" },
];

export function ResourcesDeliverablesView({ projectId }: ResourcesDeliverablesViewProps) {
  const [deliverables, setDeliverables] = useState<ProjectResource[]>([]);
  const [availableSourceResources, setAvailableSourceResources] = useState<ProjectResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<ProjectResource | null>(null);
  const [showBoundaryModal, setShowBoundaryModal] = useState(false);
  const [deliverableToArchive, setDeliverableToArchive] = useState<ProjectResource | null>(null);
  const [deliverableToRestore, setDeliverableToRestore] = useState<ProjectResource | null>(null);
  const [previewResource, setPreviewResource] = useState<RelatedResourceBrief | ProjectResource | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formVersion, setFormVersion] = useState("v1.0.0");
  const [formDeliveryDate, setFormDeliveryDate] = useState("");
  const [formStatus, setFormStatus] = useState<DeliverableStatus>("SUBMITTED");
  const [formDescription, setFormDescription] = useState("");
  const [formRelatedResourceId, setFormRelatedResourceId] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Download & action processing state
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [delivRes, allRes] = await Promise.all([
        apiClient<ProjectResource[]>(`/projects/${projectId}/resources?type=DELIVERABLE&include_archived=true`),
        apiClient<ProjectResource[]>(`/projects/${projectId}/resources`),
      ]);

      if (delivRes.error) {
        setError(delivRes.error);
      } else if (delivRes.data) {
        setDeliverables(delivRes.data);
      }

      if (allRes.data) {
        // filter active files and links as candidates for related resource
        setAvailableSourceResources(
          allRes.data.filter(
            (r) => (r.resource_type === "FILE" || r.resource_type === "LINK") && r.status === "ACTIVE"
          )
        );
      }
    } catch {
      setError("Gagal memuat arsip deliverable proyek.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (actionSuccessMessage) {
      const t = setTimeout(() => setActionSuccessMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [actionSuccessMessage]);

  const handleOpenAddModal = () => {
    setEditingDeliverable(null);
    setFormName("");
    setFormVersion("v1.0.0");
    setFormDeliveryDate(new Date().toISOString().split("T")[0]);
    setFormStatus("SUBMITTED");
    setFormDescription("");
    setFormRelatedResourceId("");
    setFormError(null);
    setShowAddEditModal(true);
  };

  const handleOpenEditModal = (deliv: ProjectResource) => {
    setEditingDeliverable(deliv);
    setFormName(deliv.name);
    setFormVersion(deliv.deliverable_version || "v1.0.0");
    setFormDeliveryDate(deliv.delivery_date || "");
    setFormStatus(deliv.deliverable_status || "SUBMITTED");
    setFormDescription(deliv.description || "");
    setFormRelatedResourceId(deliv.related_resource_id || "");
    setFormError(null);
    setShowAddEditModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = formName.trim();
    const trimmedVersion = formVersion.trim();

    if (!trimmedName) {
      setFormError("Nama deliverable tidak boleh kosong.");
      return;
    }

    if (!trimmedVersion) {
      setFormError("Versi deliverable wajib diisi (contoh: v1.0.0).");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingDeliverable) {
        // Update
        const res = await apiClient<ProjectResource>(
          `/projects/${projectId}/resources/${editingDeliverable.id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              name: trimmedName,
              deliverable_version: trimmedVersion,
              delivery_date: formDeliveryDate || null,
              deliverable_status: formStatus,
              description: formDescription.trim() || null,
              related_resource_id: formRelatedResourceId ? formRelatedResourceId : null,
            }),
          }
        );
        if (res.error) {
          setFormError(res.error);
        } else {
          setShowAddEditModal(false);
          setActionSuccessMessage(`Deliverable '${trimmedName}' berhasil diperbarui.`);
          await fetchData();
        }
      } else {
        // Create
        const res = await apiClient<ProjectResource>(
          `/projects/${projectId}/resources`,
          {
            method: "POST",
            body: JSON.stringify({
              resource_type: "DELIVERABLE",
              name: trimmedName,
              deliverable_version: trimmedVersion,
              delivery_date: formDeliveryDate || null,
              deliverable_status: formStatus,
              description: formDescription.trim() || null,
              related_resource_id: formRelatedResourceId ? formRelatedResourceId : null,
            }),
          }
        );
        if (res.error) {
          setFormError(res.error);
        } else {
          setShowAddEditModal(false);
          setActionSuccessMessage(`Deliverable '${trimmedName}' berhasil didaftarkan.`);
          await fetchData();
        }
      }
    } catch {
      setFormError("Terjadi kesalahan saat menyimpan deliverable.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadRelatedFile = async (relatedResId: string, fallbackName: string) => {
    setDownloadingId(relatedResId);
    const result = await downloadResourceFile(projectId, relatedResId, fallbackName);
    setDownloadingId(null);
    if (!result.success && result.error) {
      alert(result.error);
    }
  };

  const handleConfirmArchive = async () => {
    if (!deliverableToArchive) return;
    setIsProcessingAction(true);
    try {
      const res = await apiClient<ProjectResource>(
        `/projects/${projectId}/resources/${deliverableToArchive.id}`,
        { method: "DELETE" }
      );
      if (res.error) {
        alert(res.error);
      } else {
        setActionSuccessMessage(`Deliverable '${deliverableToArchive.name}' berhasil diarsipkan.`);
        setDeliverableToArchive(null);
        await fetchData();
      }
    } catch {
      alert("Gagal mengarsipkan deliverable.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!deliverableToRestore) return;
    setIsProcessingAction(true);
    try {
      const res = await apiClient<ProjectResource>(
        `/projects/${projectId}/resources/${deliverableToRestore.id}/restore`,
        { method: "POST" }
      );
      if (res.error) {
        alert(res.error);
      } else {
        setActionSuccessMessage(`Deliverable '${deliverableToRestore.name}' berhasil dipulihkan.`);
        setDeliverableToRestore(null);
        await fetchData();
      }
    } catch {
      alert("Gagal memulihkan deliverable.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const filteredDeliverables = deliverables.filter((item) => {
    if (item.resource_type !== "DELIVERABLE") return false;
    if (selectedStatusFilter === "ARCHIVED") {
      if (item.status !== "ARCHIVED") return false;
    } else {
      if (item.status === "ARCHIVED") return false;
      if (selectedStatusFilter !== "ALL" && item.deliverable_status !== selectedStatusFilter) {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchVer = (item.deliverable_version || "").toLowerCase().includes(q);
      const matchDesc = (item.description || "").toLowerCase().includes(q);
      return matchName || matchVer || matchDesc;
    }
    return true;
  });

  const activeCount = deliverables.filter((r) => r.status === "ACTIVE").length;
  const archivedCount = deliverables.filter((r) => r.status === "ARCHIVED").length;

  const renderStatusBadge = (status?: DeliverableStatus | null) => {
    switch (status) {
      case "ACCEPTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>ACCEPTED</span>
          </span>
        );
      case "SUBMITTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
            <PackageCheck className="w-3 h-3 text-blue-600" />
            <span>SUBMITTED</span>
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>REJECTED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
            <FileText className="w-3 h-3 text-slate-500" />
            <span>DRAFT</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
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

      {/* Domain Boundary Notice Banner */}
      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg shrink-0 mt-0.5 sm:mt-0">
            <PackageCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-indigo-950 block sm:inline">
              Arsip Deliverable Resmi (Formal Deliverables Archive)
            </span>
            <span className="text-indigo-800 sm:ml-1">
              : Ruang khusus artefak rilis formal proyek. Terpisah secara ketat dari rekaman dokumen terstruktur.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowBoundaryModal(true)}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-900 bg-white border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-xl shadow-2xs transition-all shrink-0 cursor-pointer"
        >
          <Info className="w-3.5 h-3.5 text-indigo-600" />
          <span>Lihat Batasan Arsitektur</span>
        </button>
      </div>

      {/* Filter & Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          {deliverableStatuses.map((st) => {
            const isSelected = selectedStatusFilter === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex-1 sm:w-52">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari deliverable..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-black transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-300" />
            <span>Daftarkan Deliverable</span>
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Memuat arsip deliverable...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center shadow-xs">
          <div className="max-w-md mx-auto space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900">Gagal Memuat Deliverables</h4>
            <p className="text-xs text-slate-500">{error}</p>
            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-black cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredDeliverables.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-xs text-center">
          <div className="max-w-lg mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 shadow-xs">
              <Archive className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                {searchQuery
                  ? "Tidak Ada Deliverable yang Cocok"
                  : selectedStatusFilter === "ARCHIVED"
                  ? "Belum Ada Deliverable yang Diarsipkan"
                  : selectedStatusFilter !== "ALL"
                  ? "Tidak Ada Deliverable dengan Status Ini"
                  : "Belum Ada Artefak Deliverable yang Didaftarkan"}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {searchQuery
                  ? `Pencarian untuk "${searchQuery}" tidak menemukan deliverable apapun.`
                  : "Arsip deliverable resmi mencatat rilis dan artefak formal (seperti PRD_Final.pdf, Handover_Package.zip, atau tautan Prototype Disetujui) yang diserahkan kepada klien."}
              </p>
            </div>

            {!searchQuery && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-black transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-300" />
                  <span>Daftarkan Deliverable Pertama</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deliverables List Grid */}
      {!isLoading && !error && filteredDeliverables.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredDeliverables.map((deliv) => {
            const isArchived = deliv.status === "ARCHIVED";
            const rel = deliv.related_resource;
            const isDownloading = downloadingId === deliv.related_resource_id;

            return (
              <div
                key={deliv.id}
                className={`bg-white rounded-2xl border p-4 shadow-xs transition-all flex flex-col justify-between gap-3.5 ${
                  isArchived
                    ? "border-amber-200/70 bg-amber-50/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {renderStatusBadge(deliv.deliverable_status)}
                        {deliv.deliverable_version && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono text-[10px] font-bold">
                            {deliv.deliverable_version}
                          </span>
                        )}
                        {isArchived && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-semibold uppercase tracking-wider">
                            Diarsipkan
                          </span>
                        )}
                      </div>

                      <h4
                        className={`text-sm font-bold truncate ${
                          isArchived ? "text-slate-600 line-through decoration-amber-500" : "text-slate-900"
                        }`}
                        title={deliv.name}
                      >
                        {deliv.name}
                      </h4>
                    </div>
                  </div>

                  {deliv.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {deliv.description}
                    </p>
                  )}

                  {/* Related Resource Association Card */}
                  {rel ? (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        {rel.resource_type === "FILE" ? (
                          <FolderArchive className="w-4 h-4 text-indigo-600 shrink-0" />
                        ) : (
                          <Link2 className="w-4 h-4 text-purple-600 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 text-[11px] truncate">
                            {rel.file_name || rel.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {rel.resource_type === "FILE"
                              ? `Berkas Terkait • ${formatBytes(rel.file_size_bytes)}`
                              : `Tautan Terkait • ${rel.url}`}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {rel.resource_type === "FILE" && (
                          <>
                            {isPreviewable(rel.file_name, rel.mime_type) && (
                              <button
                                type="button"
                                onClick={() => setPreviewResource(rel)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 border border-indigo-200/60 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                                title="Lihat Preview Berkas"
                              >
                                <Eye className="w-3 h-3 text-indigo-600" />
                                <span>Preview</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDownloadRelatedFile(rel.id, rel.file_name || "deliverable-file")}
                              disabled={isDownloading}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                              title="Unduh Berkas Deliverable"
                            >
                              {isDownloading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3 text-slate-500" />
                              )}
                              <span>Unduh</span>
                            </button>
                          </>
                        )}

                        {rel.resource_type === "LINK" && rel.url && (
                          <a
                            href={rel.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-semibold shadow-2xs transition-all cursor-pointer"
                            title="Buka Tautan Deliverable"
                          >
                            <span>Buka</span>
                            <ExternalLink className="w-3 h-3 text-slate-500" />
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      Tidak terhubung ke berkas/tautan spesifik (Artefak Independen)
                    </div>
                  )}
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <div className="flex items-center gap-3">
                    {deliv.delivery_date ? (
                      <span className="flex items-center gap-1 text-slate-600 font-medium">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Rilis: {formatDate(deliv.delivery_date)}</span>
                      </span>
                    ) : (
                      <span>Dibuat: {formatDate(deliv.created_at)}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Edit */}
                    {!isArchived && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(deliv)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
                        title="Edit Deliverable"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Archive or Restore */}
                    {!isArchived ? (
                      <button
                        type="button"
                        onClick={() => setDeliverableToArchive(deliv)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50 transition-all cursor-pointer"
                        title="Arsipkan Deliverable"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeliverableToRestore(deliv)}
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all cursor-pointer"
                        title="Pulihkan Deliverable ke Aktif"
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

      {/* Add / Edit Deliverable Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-slate-800" />
                <h4 className="text-sm font-bold text-slate-900">
                  {editingDeliverable ? "Edit Deliverable Resmi" : "Daftarkan Deliverable Baru"}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setShowAddEditModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Nama Deliverable *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Dokumen Spesifikasi Final & Paket Handover"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
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
                    placeholder="v1.0.0"
                    value={formVersion}
                    onChange={(e) => setFormVersion(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Tanggal Rilis / Serah Terima
                  </label>
                  <input
                    type="date"
                    value={formDeliveryDate}
                    onChange={(e) => setFormDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Status Deliverable
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as DeliverableStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="DRAFT">DRAFT (Konsep Rilis / Belum Diserahkan)</option>
                  <option value="SUBMITTED">SUBMITTED (Diajukan ke Klien / Menunggu UAT)</option>
                  <option value="ACCEPTED">ACCEPTED (Disetujui Resmi oleh Klien)</option>
                  <option value="REJECTED">REJECTED (Ditolak / Memerlukan Perbaikan)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Hubungkan dengan Berkas / Tautan (Opsional)
                </label>
                <select
                  value={formRelatedResourceId}
                  onChange={(e) => setFormRelatedResourceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="">-- Tanpa Berkas Terkait (Artefak Independen) --</option>
                  {availableSourceResources.map((src) => (
                    <option key={src.id} value={src.id}>
                      [{src.resource_type}] {src.name} {src.file_name ? `(${src.file_name})` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400">
                  Menghubungkan deliverable ke berkas/tautan memungkinkan akses unduh/buka langsung dari kartu deliverable.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Deskripsi / Ringkasan Rilis (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan persetujuan, cakupan serah terima, atau tautan bukti..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  disabled={isSubmitting}
                  className="px-3 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-black transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingDeliverable ? "Simpan Perubahan" : "Daftarkan Deliverable"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Confirmation Dialog */}
      {deliverableToArchive && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center gap-2 text-amber-700 font-bold">
              <Archive className="w-4 h-4" />
              <h4 className="text-sm text-slate-900">Arsipkan Deliverable?</h4>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Deliverable <span className="font-semibold text-slate-900">&quot;{deliverableToArchive.name}&quot;</span> akan ditandai sebagai arsip. Berkas atau tautan terkait tetap aman.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeliverableToArchive(null)}
                disabled={isProcessingAction}
                className="px-3 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={isProcessingAction}
                className="inline-flex items-center gap-1 px-3.5 py-2 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-all cursor-pointer"
              >
                {isProcessingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Ya, Arsipkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Dialog */}
      {deliverableToRestore && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <RefreshCw className="w-4 h-4" />
              <h4 className="text-sm text-slate-900">Pulihkan Deliverable?</h4>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Deliverable <span className="font-semibold text-slate-900">&quot;{deliverableToRestore.name}&quot;</span> akan dikembalikan ke status aktif di daftar deliverable utama.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeliverableToRestore(null)}
                disabled={isProcessingAction}
                className="px-3 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isProcessingAction}
                className="inline-flex items-center gap-1 px-3.5 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-black transition-all cursor-pointer"
              >
                {isProcessingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Pulihkan Deliverable</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Architecture & Boundary Details Modal */}
      {showBoundaryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-800" />
                <h4 className="text-sm font-bold text-slate-900">
                  Prinsip Batasan Domain Deliverable
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowBoundaryModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  GeneratedDocument ≠ ProjectResource
                </span>
                <p className="text-[11px] text-slate-500">
                  GeneratedDocument (PRD, Dokumen FSD, Laporan) memiliki lifecycle, riwayat revisi, sitasi bukti (evidence), dan kemampuan AI. Dokumen ini tidak boleh digantikan oleh entitas Resource.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Tidak Ada Otomatisasi Tersembunyi
                </span>
                <p className="text-[11px] text-slate-500">
                  Perubahan status dokumen menjadi FINAL di PRD tidak akan otomatis menambahkan berkas ke dalam Arsip Deliverable. Semua arsip dihasilkan melalui aksi eksplisit pengguna.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Pemisahan dengan Domain Delivery & Handover
                </span>
                <p className="text-[11px] text-slate-500">
                  Arsip Deliverable menyimpan artefak statis, sedangkan pilar Delivery bertanggung jawab atas Handover Checklist dan Completion Gate penutupan proyek.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowBoundaryModal(false)}
              className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-black cursor-pointer"
            >
              Saya Memahami Batasan Ini
            </button>
          </div>
        </div>
      )}

      {/* File Preview Modal for Related Resource */}
      {previewResource && (
        <ResourcePreviewModal
          projectId={projectId}
          resource={previewResource}
          onClose={() => setPreviewResource(null)}
          onDownload={(res) => handleDownloadRelatedFile(res.id, res.file_name || res.name)}
        />
      )}
    </div>
  );
}
