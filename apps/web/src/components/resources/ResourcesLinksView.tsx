"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ExternalLink,
  GitBranch,
  Globe,
  Layers,
  Link2,
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Archive,
  RefreshCw,
  Copy,
  Check,
  HardDrive,
  FileText,
  PackageCheck,
  Edit3,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import {
  ProjectResource,
  LinkCategory,
  formatDate,
  formatDateTime,
} from "./types";

interface ResourcesLinksViewProps {
  projectId: string;
}

const linkCategories: { id: string; label: string; categoryValue?: LinkCategory }[] = [
  { id: "ALL", label: "Semua" },
  { id: "FIGMA", label: "Figma", categoryValue: "FIGMA" },
  { id: "GITHUB", label: "Repository", categoryValue: "GITHUB" },
  { id: "DOCS", label: "Dokumentasi", categoryValue: "DOCS" },
  { id: "STAGING", label: "Staging", categoryValue: "STAGING" },
  { id: "PRODUCTION", label: "Production", categoryValue: "PRODUCTION" },
  { id: "DRIVE", label: "Drive", categoryValue: "DRIVE" },
  { id: "OTHER", label: "Lainnya", categoryValue: "OTHER" },
];

export function ResourcesLinksView({ projectId }: ResourcesLinksViewProps) {
  const [resources, setResources] = useState<ProjectResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingResource, setEditingResource] = useState<ProjectResource | null>(null);
  const [resourceToArchive, setResourceToArchive] = useState<ProjectResource | null>(null);
  const [resourceToRestore, setResourceToRestore] = useState<ProjectResource | null>(null);
  const [resourceToDeliverable, setResourceToDeliverable] = useState<ProjectResource | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formCategory, setFormCategory] = useState<LinkCategory>("FIGMA");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deliverable registration form state
  const [delivName, setDelivName] = useState("");
  const [delivVersion, setDelivVersion] = useState("v1.0.0");
  const [delivDate, setDelivDate] = useState("");
  const [delivStatus, setDelivStatus] = useState<"DRAFT" | "SUBMITTED" | "ACCEPTED" | "REJECTED">("SUBMITTED");
  const [delivDescription, setDelivDescription] = useState("");
  const [delivError, setDelivError] = useState<string | null>(null);
  const [isRegisteringDeliv, setIsRegisteringDeliv] = useState(false);

  // Feedback & Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient<ProjectResource[]>(
        `/projects/${projectId}/resources?type=LINK&include_archived=true`
      );
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setResources(res.data);
      }
    } catch {
      setError("Gagal memuat tautan referensi proyek.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  useEffect(() => {
    if (actionSuccessMessage) {
      const t = setTimeout(() => setActionSuccessMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [actionSuccessMessage]);

  const handleOpenAddModal = () => {
    setEditingResource(null);
    setFormName("");
    setFormUrl("");
    setFormCategory("FIGMA");
    setFormDescription("");
    setFormError(null);
    setShowAddEditModal(true);
  };

  const handleOpenEditModal = (resource: ProjectResource) => {
    setEditingResource(resource);
    setFormName(resource.name);
    setFormUrl(resource.url || "");
    setFormCategory((resource.link_category as LinkCategory) || "OTHER");
    setFormDescription(resource.description || "");
    setFormError(null);
    setShowAddEditModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = formName.trim();
    const trimmedUrl = formUrl.trim();

    if (!trimmedName) {
      setFormError("Nama tautan tidak boleh kosong.");
      return;
    }

    if (!trimmedUrl) {
      setFormError("URL tautan tidak boleh kosong.");
      return;
    }

    if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
      setFormError("URL harus diawali dengan http:// atau https://");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingResource) {
        // Update
        const res = await apiClient<ProjectResource>(
          `/projects/${projectId}/resources/${editingResource.id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              name: trimmedName,
              url: trimmedUrl,
              link_category: formCategory,
              description: formDescription.trim() || null,
            }),
          }
        );
        if (res.error) {
          setFormError(res.error);
        } else {
          setShowAddEditModal(false);
          setActionSuccessMessage(`Tautan '${trimmedName}' berhasil diperbarui.`);
          await fetchLinks();
        }
      } else {
        // Create
        const res = await apiClient<ProjectResource>(
          `/projects/${projectId}/resources`,
          {
            method: "POST",
            body: JSON.stringify({
              resource_type: "LINK",
              name: trimmedName,
              url: trimmedUrl,
              link_category: formCategory,
              description: formDescription.trim() || null,
            }),
          }
        );
        if (res.error) {
          setFormError(res.error);
        } else {
          setShowAddEditModal(false);
          setActionSuccessMessage(`Tautan '${trimmedName}' berhasil ditambahkan.`);
          await fetchLinks();
        }
      }
    } catch {
      setFormError("Terjadi kesalahan saat menyimpan tautan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleConfirmArchive = async () => {
    if (!resourceToArchive) return;
    setIsProcessingAction(true);
    try {
      const res = await apiClient<ProjectResource>(
        `/projects/${projectId}/resources/${resourceToArchive.id}`,
        { method: "DELETE" }
      );
      if (res.error) {
        alert(res.error);
      } else {
        setActionSuccessMessage(`Tautan '${resourceToArchive.name}' berhasil diarsipkan.`);
        setResourceToArchive(null);
        await fetchLinks();
      }
    } catch {
      alert("Gagal mengarsipkan tautan.");
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
        setActionSuccessMessage(`Tautan '${resourceToRestore.name}' berhasil dipulihkan.`);
        setResourceToRestore(null);
        await fetchLinks();
      }
    } catch {
      alert("Gagal memulihkan tautan.");
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
      // Strict domain boundary: only LINK resources in Tautan Referensi
      if (item.resource_type !== "LINK") return false;
      if (selectedCategory !== "ALL" && item.link_category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchUrl = (item.url || "").toLowerCase().includes(q);
        const matchDesc = (item.description || "").toLowerCase().includes(q);
        return matchName || matchUrl || matchDesc;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.status === "ACTIVE" && b.status === "ARCHIVED") return -1;
      if (a.status === "ARCHIVED" && b.status === "ACTIVE") return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const renderCategoryBadge = (category?: string | null) => {
    switch (category) {
      case "FIGMA":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60 text-[10px] font-semibold">
            <Layers className="w-3 h-3 text-purple-600" />
            <span>Figma</span>
          </span>
        );
      case "GITHUB":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-semibold">
            <GitBranch className="w-3 h-3 text-slate-700" />
            <span>Repository</span>
          </span>
        );
      case "STAGING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
            <Globe className="w-3 h-3 text-amber-600" />
            <span>Staging</span>
          </span>
        );
      case "PRODUCTION":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
            <Globe className="w-3 h-3 text-emerald-600" />
            <span>Production</span>
          </span>
        );
      case "DOCS":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
            <FileText className="w-3 h-3 text-blue-600" />
            <span>Dokumentasi</span>
          </span>
        );
      case "DRIVE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200 text-[10px] font-semibold">
            <HardDrive className="w-3 h-3 text-cyan-600" />
            <span>Drive</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-semibold">
            <Link2 className="w-3 h-3 text-slate-500" />
            <span>Lainnya</span>
          </span>
        );
    }
  };

  const getHostname = (urlStr?: string | null) => {
    if (!urlStr) return "-";
    try {
      const u = new URL(urlStr);
      return u.hostname.replace(/^www\./, "");
    } catch {
      return urlStr;
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

      {/* Header Bar: Title, Search, and Add CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Tautan Referensi</h2>
          <p className="text-xs text-slate-500">Tautan referensi eksternal, desain, repositori & deployment</p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari tautan..."
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

          {/* Add Link Button */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-black transition-all shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-slate-300" />
            <span>Tambah Tautan</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {linkCategories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/80"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Memuat tautan referensi...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center shadow-xs">
          <div className="max-w-md mx-auto space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900">Gagal Memuat Tautan</h4>
            <p className="text-xs text-slate-500">{error}</p>
            <button
              type="button"
              onClick={fetchLinks}
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
          <div className="max-w-lg mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 shadow-xs">
              <Link2 className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                {searchQuery
                  ? "Tidak Ada Tautan yang Cocok"
                  : selectedCategory !== "ALL"
                  ? "Belum Ada Tautan di Kategori Ini"
                  : "Belum Ada Tautan Referensi"}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {searchQuery
                  ? `Pencarian untuk "${searchQuery}" tidak menemukan tautan apapun.`
                  : "Simpan tautan ke papan desain Figma, repository GitHub, lingkungan Staging/Produksi, atau portal dokumentasi eksternal agar seluruh tim dan pemangku kepentingan dapat mengaksesnya dengan mudah."}
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
                  <span>Tambah Tautan Pertama</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Links Grid */}
      {!isLoading && !error && filteredResources.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredResources.map((link) => {
            const isArchived = link.status === "ARCHIVED";
            const hostname = getHostname(link.url);
            const isCopied = copiedId === link.id;

            return (
              <div
                key={link.id}
                className={`bg-white rounded-2xl border p-4 shadow-xs transition-all flex flex-col justify-between gap-3 ${
                  isArchived
                    ? "border-amber-200/70 bg-amber-50/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      {renderCategoryBadge(link.link_category)}
                      <h4
                        className={`text-xs font-bold truncate ${
                          isArchived ? "text-slate-600 line-through decoration-amber-500" : "text-slate-900"
                        }`}
                        title={link.name}
                      >
                        {link.name}
                      </h4>
                    </div>

                    {isArchived && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-semibold uppercase tracking-wider shrink-0">
                        Diarsipkan
                      </span>
                    )}
                  </div>

                  {link.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {link.description}
                    </p>
                  )}

                  {link.url && (
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 rounded-xl px-2.5 py-1.5 text-[11px]">
                      <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-slate-700 font-medium shrink-0">
                        {hostname}
                      </span>
                      <span className="text-slate-300">/</span>
                      <span className="text-slate-400 font-mono truncate" title={link.url}>
                        {link.url}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span title={`Dibuat: ${formatDateTime(link.created_at)}`}>
                    Ditambahkan: {formatDate(link.created_at)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Copy URL */}
                    {link.url && (
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(link.id, link.url!)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
                        title="Salin URL ke Clipboard"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    {/* Open External Link */}
                    {link.url && (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all cursor-pointer"
                        title="Buka Tautan di Tab Baru"
                      >
                        <span>Buka</span>
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </a>
                    )}

                    {/* Promote to Deliverable */}
                    {!isArchived && (
                      <button
                        type="button"
                        onClick={() => handleOpenDeliverableModal(link)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 transition-all cursor-pointer"
                        title="Daftarkan Tautan Ini Sebagai Deliverable Resmi"
                      >
                        <PackageCheck className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="hidden sm:inline">Jadikan Deliverable</span>
                      </button>
                    )}

                    {/* Edit */}
                    {!isArchived && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(link)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
                        title="Edit Tautan"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Archive or Restore */}
                    {!isArchived ? (
                      <button
                        type="button"
                        onClick={() => setResourceToArchive(link)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50 transition-all cursor-pointer"
                        title="Arsipkan Tautan"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setResourceToRestore(link)}
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all cursor-pointer"
                        title="Pulihkan Tautan ke Aktif"
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

      {/* Add / Edit Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-slate-800" />
                <h4 className="text-sm font-bold text-slate-900">
                  {editingResource ? "Edit Tautan Referensi" : "Tambah Tautan Referensi"}
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
                  Nama / Label Tautan *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Figma UI Mockup Final"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  URL Tautan (HTTP/HTTPS) *
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Kategori Tautan
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as LinkCategory)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="FIGMA">FIGMA — Desain, Prototype, Wireframe</option>
                  <option value="GITHUB">GITHUB — Repository, Pull Request, CI/CD</option>
                  <option value="STAGING">STAGING — Lingkungan Pengujian UAT</option>
                  <option value="PRODUCTION">PRODUCTION — Lingkungan Rilis Live</option>
                  <option value="DOCS">DOCS — Dokumentasi Teknis Eksternal</option>
                  <option value="DRIVE">DRIVE — Google Drive, Cloud Storage</option>
                  <option value="OTHER">OTHER — Lainnya</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Deskripsi / Keterangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan tambahan mengenai tautan ini..."
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
                  <span>{editingResource ? "Simpan Perubahan" : "Tambah Tautan"}</span>
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
              <h4 className="text-sm text-slate-900">Arsipkan Tautan?</h4>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Tautan <span className="font-semibold text-slate-900">&quot;{resourceToArchive.name}&quot;</span> akan ditandai sebagai arsip. Tautan ini tetap tersimpan dan dapat dipulihkan kapan saja.
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
      {resourceToRestore && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <RefreshCw className="w-4 h-4" />
              <h4 className="text-sm text-slate-900">Pulihkan Tautan?</h4>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Tautan <span className="font-semibold text-slate-900">&quot;{resourceToRestore.name}&quot;</span> akan dikembalikan ke status aktif di daftar tautan utama.
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
                className="inline-flex items-center gap-1 px-3.5 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-black transition-all cursor-pointer"
              >
                {isProcessingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Pulihkan Tautan</span>
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
                  Daftarkan Tautan Sebagai Deliverable Resmi
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
                <span className="text-[11px] font-semibold text-slate-800 block">Sumber Tautan:</span>
                <span className="font-mono text-slate-700 truncate block">{resourceToDeliverable.url}</span>
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


    </div>
  );
}
