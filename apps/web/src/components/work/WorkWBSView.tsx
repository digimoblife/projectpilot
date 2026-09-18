"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FolderTree,
  Layers,
  Lock,
  Plus,
  RotateCcw,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import {
  AISuggestionItem,
  AISuggestionReviewModal,
} from "@/components/ai/AISuggestionReviewModal";

interface Requirement {
  id: string;
  key: string;
  title: string;
}

interface Feature {
  id: string;
  key: string;
  title: string;
  description: string | null;
  status: string;
  epic_id: string | null;
  requirement_id: string | null;
}

interface Epic {
  id: string;
  key: string;
  title: string;
  description: string | null;
  status: string;
}


export interface WorkWBSViewProps {
  projectId: string;
  embedded?: boolean;
}

export function WorkWBSView({
  projectId,
  embedded = false,
}: WorkWBSViewProps) {
  const { token } = useAuth();

  const [epics, setEpics] = useState<Epic[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);


  // AI Epics & Features Suggestion States
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<AISuggestionItem | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);

  // Create Epic Modal
  const [isCreateEpicOpen, setIsCreateEpicOpen] = useState(false);
  const [epicKey, setEpicKey] = useState("");
  const [epicTitle, setEpicTitle] = useState("");
  const [epicDesc, setEpicDesc] = useState("");
  const [epicError, setEpicError] = useState<string | null>(null);

  // Edit Epic Modal
  const [isEditEpicOpen, setIsEditEpicOpen] = useState(false);
  const [editingEpicId, setEditingEpicId] = useState<string | null>(null);
  const [editEpicKey, setEditEpicKey] = useState("");
  const [editEpicTitle, setEditEpicTitle] = useState("");
  const [editEpicDesc, setEditEpicDesc] = useState("");
  const [editEpicError, setEditEpicError] = useState<string | null>(null);

  // Create Feature Modal
  const [isCreateFeatureOpen, setIsCreateFeatureOpen] = useState(false);
  const [featKey, setFeatKey] = useState("");
  const [featTitle, setFeatTitle] = useState("");
  const [featDesc, setFeatDesc] = useState("");
  const [featEpicId, setFeatEpicId] = useState<string>("");
  const [featReqId, setFeatReqId] = useState<string>("");
  const [featError, setFeatError] = useState<string | null>(null);

  // Edit Feature Modal
  const [isEditFeatureOpen, setIsEditFeatureOpen] = useState(false);
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
  const [editFeatKey, setEditFeatKey] = useState("");
  const [editFeatTitle, setEditFeatTitle] = useState("");
  const [editFeatDesc, setEditFeatDesc] = useState("");
  const [editFeatEpicId, setEditFeatEpicId] = useState<string>("");
  const [editFeatReqId, setEditFeatReqId] = useState<string>("");
  const [editFeatError, setEditFeatError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPlanningData();
  }, [projectId, token]);

  async function fetchPlanningData() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [epicsRes, featsRes, reqsRes] = await Promise.all([
        apiClient<Epic[]>(`/projects/${projectId}/epics`, { headers }),
        apiClient<Feature[]>(`/projects/${projectId}/features`, { headers }),
        apiClient<Requirement[]>(`/projects/${projectId}/requirements`, { headers }),
      ]);

      if (epicsRes.data) setEpics(epicsRes.data);
      if (featsRes.data) setFeatures(featsRes.data);
      if (reqsRes.data) setRequirements(reqsRes.data);
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  }

  // =========================================================================
  // 2. AI EPICS & FEATURES GENERATOR & APPROVAL
  // =========================================================================
  async function handleAIExtractEpics() {
    setIsAILoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<AISuggestionItem>(`/projects/${projectId}/ai/generate-epics-features`, {
        method: "POST",
        headers,
      });

      if (res.data) {
        setSelectedSuggestion(res.data);
        setIsAIModalOpen(true);
      }
    } catch {
      // Handled
    } finally {
      setIsAILoading(false);
    }
  }

  async function handleAISuggestionReviewed() {
    if (selectedSuggestion && selectedSuggestion.capability === "EPIC_FEATURE_GEN") {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        await apiClient(`/projects/${projectId}/ai/suggestions/${selectedSuggestion.id}/accept-epics-features`, {
          method: "POST",
          headers,
        });
      } catch {
        // Handled
      }
    }
    fetchPlanningData();
  }

  // =========================================================================
  // 3. EPICS CRUD
  // =========================================================================
  async function handleCreateEpic(e: React.FormEvent) {
    e.preventDefault();
    setEpicError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Epic>(`/projects/${projectId}/epics`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          key: epicKey,
          title: epicTitle,
          description: epicDesc || null,
        }),
      });

      if (res.data) {
        setIsCreateEpicOpen(false);
        resetEpicForm();
        fetchPlanningData();
      } else {
        setEpicError(res.error || "Gagal membuat Epic.");
      }
    } catch {
      setEpicError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEditEpicModal(epic: Epic) {
    setEditingEpicId(epic.id);
    setEditEpicKey(epic.key);
    setEditEpicTitle(epic.title);
    setEditEpicDesc(epic.description || "");
    setEditEpicError(null);
    setIsEditEpicOpen(true);
  }

  async function handleUpdateEpic(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEpicId) return;
    setEditEpicError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Epic>(`/projects/${projectId}/epics/${editingEpicId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          key: editEpicKey,
          title: editEpicTitle,
          description: editEpicDesc || null,
        }),
      });

      if (res.data) {
        setIsEditEpicOpen(false);
        fetchPlanningData();
      } else {
        setEditEpicError(res.error || "Gagal memperbarui Epic.");
      }
    } catch {
      setEditEpicError("Terjadi kesalahan saat menyimpan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteEpic(epicId: string, epicTitle: string) {
    if (!confirm(`Hapus Modul Epic "${epicTitle}"? Semua sub-fitur di bawahnya akan kehilangan kaitan modul.`)) return;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      await apiClient(`/projects/${projectId}/epics/${epicId}`, {
        method: "DELETE",
        headers,
      });
      fetchPlanningData();
    } catch {
      alert("Gagal menghapus Epic.");
    }
  }

  // =========================================================================
  // 4. FEATURES CRUD
  // =========================================================================
  async function handleCreateFeature(e: React.FormEvent) {
    e.preventDefault();
    setFeatError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Feature>(`/projects/${projectId}/features`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          key: featKey,
          title: featTitle,
          description: featDesc || null,
          epic_id: featEpicId || null,
          requirement_id: featReqId || null,
        }),
      });

      if (res.data) {
        setIsCreateFeatureOpen(false);
        resetFeatForm();
        fetchPlanningData();
      } else {
        setFeatError(res.error || "Gagal membuat Feature.");
      }
    } catch {
      setFeatError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEditFeatureModal(feat: Feature) {
    setEditingFeatureId(feat.id);
    setEditFeatKey(feat.key);
    setEditFeatTitle(feat.title);
    setEditFeatDesc(feat.description || "");
    setEditFeatEpicId(feat.epic_id || "");
    setEditFeatReqId(feat.requirement_id || "");
    setEditFeatError(null);
    setIsEditFeatureOpen(true);
  }

  async function handleUpdateFeature(e: React.FormEvent) {
    e.preventDefault();
    if (!editingFeatureId) return;
    setEditFeatError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Feature>(`/projects/${projectId}/features/${editingFeatureId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          key: editFeatKey,
          title: editFeatTitle,
          description: editFeatDesc || null,
          epic_id: editFeatEpicId || null,
          requirement_id: editFeatReqId || null,
        }),
      });

      if (res.data) {
        setIsEditFeatureOpen(false);
        fetchPlanningData();
      } else {
        setEditFeatError(res.error || "Gagal memperbarui Feature.");
      }
    } catch {
      setEditFeatError("Terjadi kesalahan saat menyimpan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteFeature(featId: string, featTitle: string) {
    if (!confirm(`Hapus Fitur "${featTitle}"?`)) return;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      await apiClient(`/projects/${projectId}/features/${featId}`, {
        method: "DELETE",
        headers,
      });
      fetchPlanningData();
    } catch {
      alert("Gagal menghapus Feature.");
    }
  }

  function resetEpicForm() {
    setEpicKey(`EPIC-${(epics.length + 1).toString().padStart(2, "0")}`);
    setEpicTitle("");
    setEpicDesc("");
    setEpicError(null);
  }

  function resetFeatForm(prefilledEpicId?: string) {
    setFeatKey(`FEAT-${(features.length + 1).toString().padStart(2, "0")}`);
    setFeatTitle("");
    setFeatDesc("");
    setFeatEpicId(prefilledEpicId || epics[0]?.id || "");
    setFeatReqId("");
    setFeatError(null);
  }

  return (
    <div className="space-y-6">
      {/* Header with AI & Manual Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Perencanaan Hirarki (Epics & Features)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Susun dokumen PRD, petakan modul Epics & Features resmi, dan siapkan deliverable serah terima proyek.
          </p>
        </div>

        {/* Action Buttons: Unified Responsive Row */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
          <Link
            href={`/projects/${projectId}/prd`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            <span>Buka Dokumen PRD</span>
          </Link>

          <button
            type="button"
            disabled={isAILoading}
            onClick={handleAIExtractEpics}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>{isAILoading ? "Memetakan..." : "Ekstraksi Epics"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetEpicForm();
              setIsCreateEpicOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>Tambah Epic</span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetFeatForm();
              setIsCreateFeatureOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Feature</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Modul Epics</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{epics.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Sub-Fitur</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{features.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Requirements Terhubung</span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {features.filter((f) => f.requirement_id).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Status Baseline</span>
          <p className="text-xs font-bold text-emerald-700 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>SIAP DIEKSEKUSI</span>
          </p>
        </div>
      </div>

      {/* Epics & Features Breakdown List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">Memuat struktur perencanaan...</div>
      ) : epics.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 mx-auto flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Belum ada Modul (Epic) Terdaftar</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Klik tombol <strong>&quot;Ekstraksi Epics & Features&quot;</strong> di atas untuk memetakan modul proyek secara instan, atau buat secara manual.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {epics.map((epic) => {
            const epicFeatures = features.filter((f) => f.epic_id === epic.id);

            return (
              <div
                key={epic.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-all"
              >
                {/* Epic Header */}
                <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 border border-blue-200 shadow-2xs shrink-0 whitespace-nowrap">
                      {epic.key}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 leading-snug">{epic.title}</h3>
                      {epic.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{epic.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 whitespace-nowrap self-end sm:self-auto">
                    <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shrink-0 whitespace-nowrap">
                      {epicFeatures.length} Fitur
                    </span>
                    <button
                      type="button"
                      onClick={() => openEditEpicModal(epic)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors text-xs font-medium inline-flex items-center gap-1 shrink-0 whitespace-nowrap"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEpic(epic.id, epic.title)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors text-xs font-medium inline-flex items-center gap-1 shrink-0 whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetFeatForm(epic.id);
                        setIsCreateFeatureOpen(true);
                      }}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 transition-colors inline-flex items-center gap-1 shrink-0 whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Fitur</span>
                    </button>
                  </div>
                </div>

                {/* Features Under This Epic */}
                <div className="p-4 space-y-2.5 bg-white">
                  {epicFeatures.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      Belum ada sub-fitur di bawah modul ini. Klik &quot;+ Fitur&quot; untuk menambahkan.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {epicFeatures.map((feat) => {
                        const linkedReq = requirements.find((r) => r.id === feat.requirement_id);

                        return (
                          <div
                            key={feat.id}
                            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:border-blue-200 hover:shadow-2xs transition-all space-y-2 flex flex-col justify-between"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="font-mono text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0 whitespace-nowrap">
                                    {feat.key}
                                  </span>
                                  <h4 className="text-xs font-bold text-slate-900 leading-snug truncate">
                                    {feat.title}
                                  </h4>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => openEditFeatureModal(feat)}
                                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                                    title="Edit Fitur"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteFeature(feat.id, feat.title)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                                    title="Hapus Fitur"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {feat.description && (
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  {feat.description}
                                </p>
                              )}
                            </div>

                            {linkedReq && (
                              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-blue-700">
                                <FileText className="w-3 h-3 text-blue-500 shrink-0" />
                                <span className="font-mono font-bold">{linkedReq.key}:</span>
                                <span className="truncate">{linkedReq.title}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. PRD VIEWER & LIVE EDITOR MODAL                                         */}
      {/* ========================================================================= */}
      {/* 2. AI SUGGESTION REVIEW MODAL (EPICS & FEATURES HUMAN APPROVAL GATE)       */}
      {/* ========================================================================= */}
      <AISuggestionReviewModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        suggestion={selectedSuggestion}
        onReviewed={handleAISuggestionReviewed}
      />

      {/* ========================================================================= */}
      {/* 3. CREATE & EDIT EPIC MODALS                                              */}
      {/* ========================================================================= */}
      {isCreateEpicOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Tambah Epic Baru</h3>
              <button
                type="button"
                onClick={() => setIsCreateEpicOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {epicError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{epicError}</span>
              </div>
            )}

            <form onSubmit={handleCreateEpic} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key *</label>
                  <input
                    type="text"
                    required
                    value={epicKey}
                    onChange={(e) => setEpicKey(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Epic *</label>
                  <input
                    type="text"
                    required
                    value={epicTitle}
                    onChange={(e) => setEpicTitle(e.target.value)}
                    placeholder="Contoh: Modul Pembayaran"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Modul</label>
                <textarea
                  rows={3}
                  value={epicDesc}
                  onChange={(e) => setEpicDesc(e.target.value)}
                  placeholder="Ringkasan cakupan kerja modul ini..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateEpicOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Epic"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditEpicOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Edit Modul Epic</h3>
              <button
                type="button"
                onClick={() => setIsEditEpicOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editEpicError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{editEpicError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateEpic} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key *</label>
                  <input
                    type="text"
                    required
                    value={editEpicKey}
                    onChange={(e) => setEditEpicKey(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Epic *</label>
                  <input
                    type="text"
                    required
                    value={editEpicTitle}
                    onChange={(e) => setEditEpicTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Modul</label>
                <textarea
                  rows={3}
                  value={editEpicDesc}
                  onChange={(e) => setEditEpicDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditEpicOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CREATE & EDIT FEATURE MODALS                                           */}
      {/* ========================================================================= */}
      {isCreateFeatureOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Tambah Feature Baru</h3>
              <button
                type="button"
                onClick={() => setIsCreateFeatureOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {featError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{featError}</span>
              </div>
            )}

            <form onSubmit={handleCreateFeature} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key *</label>
                  <input
                    type="text"
                    required
                    value={featKey}
                    onChange={(e) => setFeatKey(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Feature *</label>
                  <input
                    type="text"
                    required
                    value={featTitle}
                    onChange={(e) => setFeatTitle(e.target.value)}
                    placeholder="Contoh: Pembayaran QRIS"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Epic Induk</label>
                <select
                  value={featEpicId}
                  onChange={(e) => setFeatEpicId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Tanpa Epic</option>
                  {epics.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.key}: {e.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tautkan ke Requirement</label>
                <select
                  value={featReqId}
                  onChange={(e) => setFeatReqId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Tanpa Kaitan Requirement</option>
                  {requirements.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.key}: {r.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Teknis</label>
                <textarea
                  rows={2}
                  value={featDesc}
                  onChange={(e) => setFeatDesc(e.target.value)}
                  placeholder="Keterangan fungsional kapabilitas feature..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateFeatureOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Feature"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditFeatureOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Edit Feature</h3>
              <button
                type="button"
                onClick={() => setIsEditFeatureOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editFeatError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{editFeatError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateFeature} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key *</label>
                  <input
                    type="text"
                    required
                    value={editFeatKey}
                    onChange={(e) => setEditFeatKey(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Feature *</label>
                  <input
                    type="text"
                    required
                    value={editFeatTitle}
                    onChange={(e) => setEditFeatTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Epic Induk</label>
                <select
                  value={editFeatEpicId}
                  onChange={(e) => setEditFeatEpicId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Tanpa Epic</option>
                  {epics.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.key}: {e.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tautkan ke Requirement</label>
                <select
                  value={editFeatReqId}
                  onChange={(e) => setEditFeatReqId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Tanpa Kaitan Requirement</option>
                  {requirements.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.key}: {r.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Teknis</label>
                <textarea
                  rows={2}
                  value={editFeatDesc}
                  onChange={(e) => setEditFeatDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditFeatureOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
