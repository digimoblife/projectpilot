"use client";

import React, { useEffect, useState, use } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  FileCheck,
  FileText,
  Filter,
  History,
  Layers,
  Link as LinkIcon,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { AISuggestionReviewModal, AISuggestionItem } from "@/components/ai/AISuggestionReviewModal";

interface Requirement {
  id: string;
  key: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  version: number;
  superseded_by_id: string | null;
  supersedes_id: string | null;
  source_type: string;
  source_id: string | null;
  acceptance_criteria: string | null;
  rationale: string | null;
  created_at: string;
}

interface Decision {
  id: string;
  key: string;
  title: string;
  context: string;
  decision: string;
  rationale: string | null;
  implications: string | null;
  status: string;
  decided_by: string | null;
  decided_at: string;
}

const reqStatusConfigs: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-700 border-slate-200" },
  NEEDS_CLARIFICATION: { label: "Perlu Klarifikasi", color: "bg-amber-50 text-amber-700 border-amber-200" },
  CONFIRMED: { label: "Terkonfirmasi", color: "bg-blue-50 text-blue-700 border-blue-200" },
  APPROVED: { label: "Disetujui (Approved)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Ditolak", color: "bg-rose-50 text-rose-700 border-rose-200" },
  SUPERSEDED: { label: "Digantikan (Superseded)", color: "bg-purple-50 text-purple-700 border-purple-200" },
};

const decStatusConfigs: Record<string, { label: string; color: string }> = {
  PROPOSED: { label: "Diusulkan", color: "bg-slate-100 text-slate-700 border-slate-200" },
  ACCEPTED: { label: "Diterima", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  SUPERSEDED: { label: "Digantikan", color: "bg-purple-50 text-purple-700 border-purple-200" },
  REVOKED: { label: "Dibatalkan", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

export default function ProjectRequirementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<"requirements" | "decisions">("requirements");
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Requirement Filters
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Requirement Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [key, setKey] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("FUNCTIONAL");
  const [priority, setPriority] = useState("MEDIUM");
  const [sourceType, setSourceType] = useState("CLIENT_ANSWER");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [rationale, setRationale] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Supersede Modal
  const [selectedReqForSupersede, setSelectedReqForSupersede] = useState<Requirement | null>(null);
  const [supTitle, setSupTitle] = useState("");
  const [supDesc, setSupDesc] = useState("");
  const [supCriteria, setSupCriteria] = useState("");
  const [supRationale, setSupRationale] = useState("");
  const [supError, setSupError] = useState<string | null>(null);

  // Create Decision Modal
  const [isDecModalOpen, setIsDecModalOpen] = useState(false);
  const [decKey, setDecKey] = useState("");
  const [decTitle, setDecTitle] = useState("");
  const [decContext, setDecContext] = useState("");
  const [decDecision, setDecDecision] = useState("");
  const [decRationale, setDecRationale] = useState("");
  const [decImplications, setDecImplications] = useState("");
  const [decError, setDecError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Intelligence States
  const [selectedSuggestion, setSelectedSuggestion] = useState<AISuggestionItem | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);

  // Project Q&A Drawer States
  const [isQAModalOpen, setIsQAModalOpen] = useState(false);
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaAnswer, setQaAnswer] = useState<string | null>(null);
  const [qaCitations, setQaCitations] = useState<string[]>([]);
  const [isQALoading, setIsQALoading] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [projectId, token]);

  async function handleAIExtractRequirements() {
    setIsAILoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const res = await apiClient<AISuggestionItem>(`/projects/${projectId}/ai/extract-requirements`, {
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

  async function handleAIDetectContradictions() {
    setIsAILoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const res = await apiClient<AISuggestionItem>(`/projects/${projectId}/ai/detect-contradictions`, {
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
    if (selectedSuggestion && selectedSuggestion.capability === "REQUIREMENT_EXTRACTION") {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        await apiClient(`/projects/${projectId}/ai/suggestions/${selectedSuggestion.id}/accept-requirements`, {
          method: "POST",
          headers,
        });
      } catch {
        // Handled
      }
    }
    fetchData();
  }

  async function handleAskAI(e: React.FormEvent) {
    e.preventDefault();
    if (!qaQuestion.trim()) return;
    setIsQALoading(true);
    setQaError(null);
    setQaAnswer(null);
    setQaCitations([]);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<{ answer: string; citations?: string[] }>(`/projects/${projectId}/ai/qa`, {
        method: "POST",
        headers,
        body: JSON.stringify({ question: qaQuestion }),
      });
      if (res.data) {
        setQaAnswer(res.data.answer);
        setQaCitations(res.data.citations || []);
      } else {
        setQaError(res.error || "Gagal mendapatkan jawaban dari AI.");
      }
    } catch {
      setQaError("Terjadi kesalahan sistem saat menghubungi AI.");
    } finally {
      setIsQALoading(false);
    }
  }

  async function fetchData() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [reqRes, decRes] = await Promise.all([
        apiClient<Requirement[]>(`/projects/${projectId}/requirements`, { headers }),
        apiClient<Decision[]>(`/projects/${projectId}/decisions`, { headers }),
      ]);

      if (reqRes.data) setRequirements(reqRes.data);
      if (decRes.data) setDecisions(decRes.data);
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateRequirement(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Requirement>(`/projects/${projectId}/requirements`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          key,
          title,
          description,
          category,
          priority,
          source_type: sourceType,
          acceptance_criteria: acceptanceCriteria || null,
          rationale: rationale || null,
        }),
      });

      if (res.data) {
        setIsCreateModalOpen(false);
        resetCreateForm();
        fetchData();
      } else {
        setCreateError(res.error || "Gagal membuat requirement.");
      }
    } catch {
      setCreateError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateReqStatus(reqId: string, targetStatus: string) {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await apiClient(`/projects/${projectId}/requirements/${reqId}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({ target_status: targetStatus }),
      });
      fetchData();
    } catch {
      // Handle error
    }
  }

  async function handleSupersedeRequirement(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReqForSupersede) return;
    setSupError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Requirement>(
        `/projects/${projectId}/requirements/${selectedReqForSupersede.id}/supersede`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            title: supTitle,
            description: supDesc,
            acceptance_criteria: supCriteria || null,
            rationale: supRationale || null,
          }),
        }
      );

      if (res.data) {
        setSelectedReqForSupersede(null);
        fetchData();
      } else {
        setSupError(res.error || "Gagal merevisi requirement.");
      }
    } catch {
      setSupError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateDecision(e: React.FormEvent) {
    e.preventDefault();
    setDecError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Decision>(`/projects/${projectId}/decisions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          key: decKey,
          title: decTitle,
          context: decContext,
          decision: decDecision,
          rationale: decRationale || null,
          implications: decImplications || null,
        }),
      });

      if (res.data) {
        setIsDecModalOpen(false);
        resetDecForm();
        fetchData();
      } else {
        setDecError(res.error || "Gagal mencatat keputusan.");
      }
    } catch {
      setDecError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetCreateForm() {
    setKey(`REQ-${requirements.length + 1}`.padStart(7, "0"));
    setTitle("");
    setDescription("");
    setCategory("FUNCTIONAL");
    setPriority("MEDIUM");
    setSourceType("CLIENT_ANSWER");
    setAcceptanceCriteria("");
    setRationale("");
    setCreateError(null);
  }

  function resetDecForm() {
    setDecKey(`DEC-${decisions.length + 1}`.padStart(7, "0"));
    setDecTitle("");
    setDecContext("");
    setDecDecision("");
    setDecRationale("");
    setDecImplications("");
    setDecError(null);
  }

  function openSupersedeModal(req: Requirement) {
    setSelectedReqForSupersede(req);
    setSupTitle(req.title);
    setSupDesc(req.description);
    setSupCriteria(req.acceptance_criteria || "");
    setSupRationale(req.rationale || "");
    setSupError(null);
  }

  const filteredRequirements = requirements.filter((r) => {
    const matchesSearch =
      r.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "ALL" || r.status === selectedStatus;
    const matchesCategory = selectedCategory === "ALL" || r.category === selectedCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Tab Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        {/* Segmented Sub-Tab Control (Constrained horizontal scroll on mobile) */}
        <div className="w-full sm:w-auto overflow-x-auto scrollbar-none max-w-full pb-1 sm:pb-0">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-max">
            <button
              type="button"
              onClick={() => setActiveTab("requirements")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "requirements"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Katalog Requirement ({requirements.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("decisions")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "decisions"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Decision Log ({decisions.length})</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
          {activeTab === "requirements" && (
            <>
              <button
                type="button"
                disabled={isAILoading}
                onClick={handleAIExtractRequirements}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-2xs transition-colors disabled:opacity-50 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>{isAILoading ? "Mengekstrak..." : "AI Ekstraksi Requirement"}</span>
              </button>

              <button
                type="button"
                disabled={isAILoading}
                onClick={handleAIDetectContradictions}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-2xs transition-colors disabled:opacity-50 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Deteksi Kontradiksi</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  resetCreateForm();
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Requirement</span>
              </button>
            </>
          )}

          {activeTab === "decisions" && (
            <button
              type="button"
              onClick={() => {
                resetDecForm();
                setIsDecModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Keputusan</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: REQUIREMENTS */}
      {activeTab === "requirements" && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari berdasarkan kunci (REQ-001), judul, atau deskripsi..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {["ALL", "DRAFT", "NEEDS_CLARIFICATION", "CONFIRMED", "APPROVED", "SUPERSEDED", "REJECTED"].map(
                  (st) => {
                    const isSelected = selectedStatus === st;
                    const label = st === "ALL" ? "Semua Status" : reqStatusConfigs[st]?.label || st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setSelectedStatus(st)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                          isSelected
                            ? "bg-slate-900 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>

          {/* Requirement Cards */}
          {filteredRequirements.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Belum ada requirement</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Katalog requirement mendefinisikan fungsionalitas resmi yang dapat dilacak ke temuan discovery.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequirements.map((req) => {
                const statusConf = reqStatusConfigs[req.status] || {
                  label: req.status,
                  color: "bg-slate-100 text-slate-700 border-slate-200",
                };
                const isApproved = req.status === "APPROVED";
                const isSuperseded = req.status === "SUPERSEDED";

                return (
                  <div
                    key={req.id}
                    className={`bg-white rounded-xl border p-5 shadow-xs transition-all space-y-3.5 ${
                      isSuperseded
                        ? "opacity-60 bg-slate-50/50 border-slate-200"
                        : "hover:border-blue-300 border-slate-200"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                          {req.key}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          v{req.version}
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          {req.category}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">
                          P: {req.priority}
                        </span>
                      </div>

                      {/* Status Selector */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusConf.color}`}
                        >
                          {statusConf.label}
                        </span>

                        {!isApproved && !isSuperseded && (
                          <select
                            value={req.status}
                            onChange={(e) => handleUpdateReqStatus(req.id, e.target.value)}
                            className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1"
                          >
                            {Object.entries(reqStatusConfigs)
                              .filter(([val]) => val !== "SUPERSEDED")
                              .map(([val, conf]) => (
                                <option key={val} value={val}>
                                  {conf.label}
                                </option>
                              ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{req.title}</h3>
                      <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">{req.description}</p>
                    </div>

                    {/* Criteria & Traceability */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                      {req.acceptance_criteria && (
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Kriteria Penerimaan (AC):</span>
                          <p className="text-slate-700 text-[11px]">{req.acceptance_criteria}</p>
                        </div>
                      )}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                          <LinkIcon className="w-3 h-3 text-slate-400" />
                          <span>Ketertelusuran Bukti (Traceability):</span>
                        </span>
                        <p className="text-slate-700 text-[11px]">
                          Sumber: <span className="font-semibold">{req.source_type}</span>
                        </p>
                      </div>
                    </div>

                    {/* Supersede Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        {isSuperseded ? "Requirement ini telah digantikan oleh versi baru." : "Versi aktif"}
                      </span>

                      {isApproved && (
                        <button
                          type="button"
                          onClick={() => openSupersedeModal(req)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-lg border border-purple-200 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Revisi & Supersede (Buat v{req.version + 1})</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DECISIONS (ADR) */}
      {activeTab === "decisions" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">Log Keputusan Arsitektur & Bisnis (ADR)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Mendokumentasikan konteks, keputusan yang diambil, alasan, serta implikasi teknis/operasional.
            </p>
          </div>

          {decisions.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-900">Belum ada keputusan tercatat</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Gunakan tombol &quot;Catat Keputusan&quot; untuk mendokumentasikan keputusan strategis proyek.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {decisions.map((dec) => {
                const conf = decStatusConfigs[dec.status] || {
                  label: dec.status,
                  color: "bg-slate-100 text-slate-700 border-slate-200",
                };

                return (
                  <div key={dec.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {dec.key}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{dec.title}</h4>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${conf.color}`}>
                        {conf.label}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-700">
                      <div>
                        <span className="font-bold text-slate-500 text-[10px] uppercase block">Konteks & Masalah:</span>
                        <p className="mt-0.5">{dec.context}</p>
                      </div>
                      <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                        <span className="font-bold text-blue-900 text-[10px] uppercase block">Keputusan:</span>
                        <p className="text-blue-950 font-medium mt-0.5">{dec.decision}</p>
                      </div>
                      {dec.rationale && (
                        <div>
                          <span className="font-bold text-slate-500 text-[10px] uppercase block">Alasan / Rationale:</span>
                          <p className="mt-0.5 italic">&quot;{dec.rationale}&quot;</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Diputuskan oleh: {dec.decided_by || "PM & Klien"}</span>
                      <span>{new Date(dec.decided_at).toLocaleDateString("id-ID")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Requirement Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Tambah Requirement Baru</h3>
                <p className="text-xs text-slate-500">Definisikan spesifikasi kebutuhan proyek.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRequirement} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key *</label>
                  <input
                    type="text"
                    required
                    value={key}
                    onChange={(e) => setKey(e.target.value.toUpperCase())}
                    placeholder="REQ-001"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Requirement *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Modul Notifikasi Transaksi Push"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Spesifikasi *</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan kebutuhan fungsional secara terperinci..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="FUNCTIONAL">Functional</option>
                    <option value="NON_FUNCTIONAL">Non-Functional</option>
                    <option value="TECHNICAL">Technical</option>
                    <option value="INTEGRATION">Integration</option>
                    <option value="SECURITY">Security</option>
                    <option value="UX">UX</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prioritas</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipe Sumber</label>
                  <select
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="CLIENT_ANSWER">Jawaban Klien</option>
                    <option value="BRIEF">Project Brief</option>
                    <option value="DISCOVERY_QUESTION">Discovery Question</option>
                    <option value="MEETING">Meeting</option>
                    <option value="MANUAL_PM">Manual PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kriteria Penerimaan (Acceptance Criteria)</label>
                <textarea
                  rows={2}
                  value={acceptanceCriteria}
                  onChange={(e) => setAcceptanceCriteria(e.target.value)}
                  placeholder="Kondisi pengujian yang harus terpenuhi untuk verifikasi selesai..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Requirement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supersede Modal */}
      {selectedReqForSupersede && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Revisi Requirement (Supersede)</h3>
                <p className="text-xs text-slate-500">
                  Membuat versi {selectedReqForSupersede.version + 1} dari {selectedReqForSupersede.key}. Versi lama akan ditandai <span className="font-semibold text-purple-700">SUPERSEDED</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReqForSupersede(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {supError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{supError}</span>
              </div>
            )}

            <form onSubmit={handleSupersedeRequirement} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Revisi *</label>
                <input
                  type="text"
                  required
                  value={supTitle}
                  onChange={(e) => setSupTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Spesifikasi Revisi *</label>
                <textarea
                  rows={4}
                  required
                  value={supDesc}
                  onChange={(e) => setSupDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kriteria Penerimaan Baru</label>
                <textarea
                  rows={2}
                  value={supCriteria}
                  onChange={(e) => setSupCriteria(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedReqForSupersede(null)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Memproses..." : `Terbitkan Versi ${selectedReqForSupersede.version + 1}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Decision Modal */}
      {isDecModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Catat Keputusan Strategis (ADR)</h3>
                <p className="text-xs text-slate-500">Mendokumentasikan keputusan arsitektur atau scope proyek.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDecModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {decError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{decError}</span>
              </div>
            )}

            <form onSubmit={handleCreateDecision} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key *</label>
                  <input
                    type="text"
                    required
                    value={decKey}
                    onChange={(e) => setDecKey(e.target.value.toUpperCase())}
                    placeholder="DEC-001"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Keputusan *</label>
                  <input
                    type="text"
                    required
                    value={decTitle}
                    onChange={(e) => setDecTitle(e.target.value)}
                    placeholder="Contoh: Pemilihan Provider Payment Gateway"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Konteks & Latar Belakang *</label>
                <textarea
                  rows={2}
                  required
                  value={decContext}
                  onChange={(e) => setDecContext(e.target.value)}
                  placeholder="Kondisi atau masalah yang memicu kebutuhan keputusan..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keputusan yang Diambil *</label>
                <textarea
                  rows={2}
                  required
                  value={decDecision}
                  onChange={(e) => setDecDecision(e.target.value)}
                  placeholder="Keputusan final yang disepakati bersama..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan / Rationale</label>
                <textarea
                  rows={2}
                  value={decRationale}
                  onChange={(e) => setDecRationale(e.target.value)}
                  placeholder="Pertimbangan teknis, biaya, atau kepatuhan..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDecModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Keputusan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Q&A Modal */}
      {isQAModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Tanya AI (Project Copilot)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQAModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAskAI} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pertanyaan Anda seputar proyek:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={qaQuestion}
                    onChange={(e) => setQaQuestion(e.target.value)}
                    placeholder="e.g. Apa target rilis MVP dan integrasi payment apa saja?"
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                  <button
                    type="submit"
                    disabled={isQALoading}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors disabled:opacity-50"
                  >
                    {isQALoading ? "Menjawab..." : "Kirim"}
                  </button>
                </div>
              </div>

              {qaError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                  {qaError}
                </div>
              )}

              {qaAnswer && (
                <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-xl space-y-2">
                  <span className="font-bold text-[10px] uppercase text-purple-700 block tracking-wider">
                    Jawaban Berdasarkan Bukti Proyek:
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">{qaAnswer}</p>

                  {qaCitations.length > 0 && (
                    <div className="pt-2 border-t border-purple-200/60">
                      <span className="text-[10px] font-semibold text-slate-500 block mb-1">
                        Sumber Rujukan (Citations):
                      </span>
                      <ul className="text-[11px] text-purple-800 list-disc list-inside space-y-0.5">
                        {qaCitations.map((cit, idx) => (
                          <li key={idx}>{cit}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* AI Suggestion Review Modal */}
      <AISuggestionReviewModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        suggestion={selectedSuggestion}
        onReviewed={handleAISuggestionReviewed}
      />
    </div>
  );
}
