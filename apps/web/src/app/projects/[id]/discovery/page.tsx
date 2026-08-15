"use client";

import React, { useEffect, useState, use } from "react";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit3,
  FileEdit,
  FileText,
  Filter,
  HelpCircle,
  MessageSquare,
  Plus,
  Save,
  Search,
  Send,
  Sparkles,
  Tag,
  User,
  Users,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { AISuggestionReviewModal, AISuggestionItem } from "@/components/ai/AISuggestionReviewModal";

interface ClientAnswer {
  id: string;
  answer_text: string;
  respondent_name: string | null;
  respondent_role: string | null;
  source: string | null;
  answered_at: string;
}

interface DiscoveryQuestion {
  id: string;
  category: string;
  question: string;
  rationale: string | null;
  priority: string | null;
  status: string;
  parent_question_id: string | null;
  order_index: number;
  answers: ClientAnswer[];
  created_at: string;
}

interface ProjectBrief {
  id?: string;
  objective: string;
  business_context: string | null;
  intended_users: string | null;
  expected_functionality: string | null;
  constraints: string | null;
  known_integrations: string | null;
  raw_content: string | null;
}

const categoryLabels: Record<string, string> = {
  ALL: "Semua Kategori",
  BUSINESS: "Business & Value",
  FUNCTIONAL: "Functional Features",
  NON_FUNCTIONAL: "Non-Functional / SLA",
  TECHNICAL: "Technical Architecture",
  UX: "UX & Interface",
  DATA: "Data & Migration",
  INTEGRATION: "Third-party Integration",
  SECURITY: "Security & Compliance",
  PERMISSION: "Permission & Roles",
  REPORTING: "Reporting & Export",
  DEPLOYMENT: "Deployment & Infra",
  MAINTENANCE: "Maintenance & Support",
  OPERATIONAL: "Operational Workflow",
};

const statusConfigs: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-700 border-slate-200" },
  READY: { label: "Siap Dikirim", color: "bg-blue-50 text-blue-700 border-blue-200" },
  SENT: { label: "Terkirim ke Klien", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  ANSWERED: { label: "Dijawab Klien", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  NEEDS_FOLLOW_UP: { label: "Perlu Follow-Up", color: "bg-amber-50 text-amber-700 border-amber-200" },
  CLOSED: { label: "Selesai (Closed)", color: "bg-teal-50 text-teal-700 border-teal-200" },
};

export default function ProjectDiscoveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<"brief" | "questions">("brief");
  const [isLoading, setIsLoading] = useState(true);

  // Brief state
  const [brief, setBrief] = useState<ProjectBrief>({
    objective: "",
    business_context: "",
    intended_users: "",
    expected_functionality: "",
    constraints: "",
    known_integrations: "",
    raw_content: "",
  });
  const [briefSaveSuccess, setBriefSaveSuccess] = useState(false);
  const [briefSaveError, setBriefSaveError] = useState<string | null>(null);
  const [isSavingBrief, setIsSavingBrief] = useState(false);

  // Questions state
  const [questions, setQuestions] = useState<DiscoveryQuestion[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Question Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newQuestionCategory, setNewQuestionCategory] = useState("FUNCTIONAL");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionRationale, setNewQuestionRationale] = useState("");
  const [newQuestionPriority, setNewQuestionPriority] = useState("MEDIUM");
  const [parentQuestionId, setParentQuestionId] = useState<string | null>(null);
  const [createQuestionError, setCreateQuestionError] = useState<string | null>(null);

  // Record Answer Modal
  const [selectedQuestionForAnswer, setSelectedQuestionForAnswer] = useState<DiscoveryQuestion | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [respondentName, setRespondentName] = useState("");
  const [respondentRole, setRespondentRole] = useState("");
  const [answerSource, setAnswerSource] = useState("Discovery Meeting");
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Intelligence State
  const [selectedSuggestion, setSelectedSuggestion] = useState<AISuggestionItem | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);

  useEffect(() => {
    fetchBriefAndQuestions();
  }, [projectId, token]);

  async function handleAIBriefAnalysis() {
    setIsAILoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const res = await apiClient<AISuggestionItem>(`/projects/${projectId}/ai/analyze-brief`, {
        method: "POST",
        headers,
      });
      if (res.data) {
        setSelectedSuggestion(res.data);
        setIsAIModalOpen(true);
      }
    } catch {
      // Handled gracefully
    } finally {
      setIsAILoading(false);
    }
  }

  async function handleAIGenerateQuestions() {
    setIsAILoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const res = await apiClient<AISuggestionItem>(`/projects/${projectId}/ai/generate-questions`, {
        method: "POST",
        headers,
      });
      if (res.data) {
        setSelectedSuggestion(res.data);
        setIsAIModalOpen(true);
      }
    } catch {
      // Handled gracefully
    } finally {
      setIsAILoading(false);
    }
  }

  async function handleAISuggestionReviewed() {
    // If questions suggestion was approved, apply and refresh discovery list
    if (selectedSuggestion && selectedSuggestion.capability === "DISCOVERY_QUESTION_GEN") {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        await apiClient(`/projects/${projectId}/ai/suggestions/${selectedSuggestion.id}/accept-questions`, {
          method: "POST",
          headers,
        });
      } catch {
        // Handled
      }
    }
    fetchBriefAndQuestions();
  }

  async function fetchBriefAndQuestions() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [briefRes, qRes] = await Promise.all([
        apiClient<ProjectBrief>(`/projects/${projectId}/brief`, { headers }),
        apiClient<DiscoveryQuestion[]>(`/projects/${projectId}/discovery-questions`, { headers }),
      ]);

      if (briefRes.data) {
        setBrief(briefRes.data);
      }
      if (qRes.data) {
        setQuestions(qRes.data);
      }
    } catch {
      // Ignored if brief doesn't exist yet
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveBrief(e: React.FormEvent) {
    e.preventDefault();
    setBriefSaveError(null);
    setBriefSaveSuccess(false);
    setIsSavingBrief(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<ProjectBrief>(`/projects/${projectId}/brief`, {
        method: "PUT",
        headers,
        body: JSON.stringify(brief),
      });

      if (res.data) {
        setBrief(res.data);
        setBriefSaveSuccess(true);
        setTimeout(() => setBriefSaveSuccess(false), 3000);
      } else {
        setBriefSaveError(res.error || "Gagal menyimpan Project Brief.");
      }
    } catch {
      setBriefSaveError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSavingBrief(false);
    }
  }

  async function handleCreateQuestion(e: React.FormEvent) {
    e.preventDefault();
    setCreateQuestionError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<DiscoveryQuestion>(`/projects/${projectId}/discovery-questions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          category: newQuestionCategory,
          question: newQuestionText,
          rationale: newQuestionRationale || null,
          priority: newQuestionPriority,
          parent_question_id: parentQuestionId,
        }),
      });

      if (res.data) {
        setIsCreateModalOpen(false);
        resetCreateQuestionForm();
        fetchBriefAndQuestions();
      } else {
        setCreateQuestionError(res.error || "Gagal membuat pertanyaan.");
      }
    } catch {
      setCreateQuestionError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateQuestionStatus(questionId: string, targetStatus: string) {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await apiClient(`/projects/${projectId}/discovery-questions/${questionId}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({ target_status: targetStatus }),
      });
      fetchBriefAndQuestions();
    } catch {
      // Handle error
    }
  }

  async function handleRecordAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedQuestionForAnswer) return;
    setAnswerError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient(
        `/projects/${projectId}/discovery-questions/${selectedQuestionForAnswer.id}/answers`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            answer_text: answerText,
            respondent_name: respondentName || null,
            respondent_role: respondentRole || null,
            source: answerSource || null,
          }),
        }
      );

      if (res.data) {
        setSelectedQuestionForAnswer(null);
        setAnswerText("");
        setRespondentName("");
        setRespondentRole("");
        fetchBriefAndQuestions();
      } else {
        setAnswerError(res.error || "Gagal mencatat jawaban.");
      }
    } catch {
      setAnswerError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetCreateQuestionForm() {
    setNewQuestionCategory("FUNCTIONAL");
    setNewQuestionText("");
    setNewQuestionRationale("");
    setNewQuestionPriority("MEDIUM");
    setParentQuestionId(null);
    setCreateQuestionError(null);
  }

  function openFollowUpModal(parentQuestion: DiscoveryQuestion) {
    setParentQuestionId(parentQuestion.id);
    setNewQuestionCategory(parentQuestion.category);
    setNewQuestionPriority("HIGH");
    setNewQuestionText("");
    setNewQuestionRationale(`Follow-up pertanyaan: "${parentQuestion.question}"`);
    setIsCreateModalOpen(true);
  }

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.rationale && q.rationale.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "ALL" || q.category === selectedCategory;
    const matchesStatus = selectedStatus === "ALL" || q.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Sub-Tab Navigation Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("brief")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === "brief"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>1. Project Brief & Scope Awal</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("questions")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === "questions"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>2. Discovery Questions & Answers ({questions.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "brief" && (
            <button
              type="button"
              disabled={isAILoading}
              onClick={handleAIBriefAnalysis}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>{isAILoading ? "Menganalisis..." : "✨ AI Analisa Brief"}</span>
            </button>
          )}

          {activeTab === "questions" && (
            <>
              <button
                type="button"
                disabled={isAILoading}
                onClick={handleAIGenerateQuestions}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>{isAILoading ? "Menghasilkan..." : "✨ AI Rekomendasi Pertanyaan"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  resetCreateQuestionForm();
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Pertanyaan</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: PROJECT BRIEF */}
      {activeTab === "brief" && (
        <form onSubmit={handleSaveBrief} className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Project Brief & Kebutuhan Inti</h2>
              <p className="text-xs text-slate-500">
                Fondasi awal penentuan ruang lingkup, arsitektur, dan kriteria keberhasilan proyek.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSavingBrief}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingBrief ? "Menyimpan..." : "Simpan Project Brief"}</span>
            </button>
          </div>

          {briefSaveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Project Brief berhasil diperbarui.</span>
            </div>
          )}

          {briefSaveError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>{briefSaveError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Objective */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2 shadow-xs">
              <label className="block text-xs font-bold text-slate-800">
                Objektif Bisnis Utama (Objective) *
              </label>
              <textarea
                rows={3}
                required
                value={brief.objective}
                onChange={(e) => setBrief({ ...brief, objective: e.target.value })}
                placeholder="Tujuan strategis dan hasil yang diharapkan oleh bisnis/klien..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            {/* Business Context */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2 shadow-xs">
              <label className="block text-xs font-bold text-slate-800">Konteks Bisnis & Latar Belakang</label>
              <textarea
                rows={3}
                value={brief.business_context || ""}
                onChange={(e) => setBrief({ ...brief, business_context: e.target.value })}
                placeholder="Latar belakang masalah, kondisi sistem eksisting, atau pemicu proyek..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            {/* Expected Functionality */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2 shadow-xs">
              <label className="block text-xs font-bold text-slate-800">Fitur & Fungsionalitas Utama</label>
              <textarea
                rows={4}
                value={brief.expected_functionality || ""}
                onChange={(e) => setBrief({ ...brief, expected_functionality: e.target.value })}
                placeholder="Daftar kemampuan sistem atau modul utama yang harus ada..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            {/* Target Users */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2 shadow-xs">
              <label className="block text-xs font-bold text-slate-800">Target Pengguna (Intended Users)</label>
              <textarea
                rows={4}
                value={brief.intended_users || ""}
                onChange={(e) => setBrief({ ...brief, intended_users: e.target.value })}
                placeholder="Persona pengguna, peran (admin, nasabah, staf), dan perkiraan volume..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            {/* Constraints */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2 shadow-xs">
              <label className="block text-xs font-bold text-slate-800">Batasan & Regulasi (Constraints)</label>
              <textarea
                rows={3}
                value={brief.constraints || ""}
                onChange={(e) => setBrief({ ...brief, constraints: e.target.value })}
                placeholder="Batasan teknologi, kepatuhan audit regulasi, timeline deadline..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            {/* Integrations */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2 shadow-xs">
              <label className="block text-xs font-bold text-slate-800">Integrasi Pihak Ketiga</label>
              <textarea
                rows={3}
                value={brief.known_integrations || ""}
                onChange={(e) => setBrief({ ...brief, known_integrations: e.target.value })}
                placeholder="Sistem eksternal, Payment Gateway, SMS OTP, Core Banking, dll..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Raw Content Notes */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2 shadow-xs">
            <label className="block text-xs font-bold text-slate-800">Catatan & Lampiran Mentah (Raw Notes)</label>
            <textarea
              rows={4}
              value={brief.raw_content || ""}
              onChange={(e) => setBrief({ ...brief, raw_content: e.target.value })}
              placeholder="Salinan mentah notulen rapat kick-off atau kutipan dokumen klien..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono"
            />
          </div>
        </form>
      )}

      {/* TAB 2: DISCOVERY QUESTIONS & ANSWERS */}
      {activeTab === "questions" && (
        <div className="space-y-4">
          {/* Filters & Categories */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari pertanyaan discovery atau rasional..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {["ALL", "DRAFT", "READY", "SENT", "ANSWERED", "NEEDS_FOLLOW_UP", "CLOSED"].map((st) => {
                  const isSelected = selectedStatus === st;
                  const label = st === "ALL" ? "Semua Status" : statusConfigs[st]?.label || st;
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
                })}
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1">
              <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-1">Kategori:</span>
              {Object.entries(categoryLabels).map(([catKey, catName]) => {
                const isSelected = selectedCategory === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setSelectedCategory(catKey)}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                      isSelected
                        ? "bg-purple-100 text-purple-800 border border-purple-300 font-semibold"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                    }`}
                  >
                    {catName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question List Grid */}
          {filteredQuestions.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Belum ada pertanyaan discovery</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Gunakan tombol &quot;Tambah Pertanyaan&quot; untuk mengajukan pertanyaan klarifikasi ke klien.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((q, idx) => {
                const statusConf = statusConfigs[q.status] || {
                  label: q.status,
                  color: "bg-slate-100 text-slate-700 border-slate-200",
                };

                return (
                  <div
                    key={q.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-purple-200 transition-all space-y-3.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          {categoryLabels[q.category] || q.category}
                        </span>
                        {q.priority && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            P: {q.priority}
                          </span>
                        )}
                        {q.parent_question_id && (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Follow-Up
                          </span>
                        )}
                      </div>

                      {/* Status Selector */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusConf.color}`}
                        >
                          {statusConf.label}
                        </span>
                        <select
                          value={q.status}
                          onChange={(e) => handleUpdateQuestionStatus(q.id, e.target.value)}
                          className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1"
                        >
                          {Object.entries(statusConfigs).map(([val, conf]) => (
                            <option key={val} value={val}>
                              {conf.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 leading-snug">
                        {idx + 1}. {q.question}
                      </h4>
                      {q.rationale && (
                        <p className="text-xs text-slate-500 mt-1 italic">
                          Rasional: &quot;{q.rationale}&quot;
                        </p>
                      )}
                    </div>

                    {/* Answers Section */}
                    {q.answers && q.answers.length > 0 && (
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 space-y-2">
                        <span className="text-[11px] font-bold text-slate-600 block">
                          Jawaban Klien ({q.answers.length}):
                        </span>
                        {q.answers.map((ans) => (
                          <div key={ans.id} className="text-xs space-y-1 bg-white p-2.5 rounded border border-slate-100">
                            <p className="text-slate-800 font-medium">{ans.answer_text}</p>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400">
                              <span>Oleh: {ans.respondent_name || "PIC Klien"} ({ans.respondent_role || "-"})</span>
                              <span>Sumber: {ans.source || "Meeting"}</span>
                              <span>{new Date(ans.answered_at).toLocaleDateString("id-ID")}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openFollowUpModal(q)}
                        className="text-xs text-purple-700 hover:text-purple-900 font-medium flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Buat Follow-Up</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedQuestionForAnswer(q)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg border border-purple-200 transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Catat Jawaban Klien</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Question Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {parentQuestionId ? "Buat Pertanyaan Follow-Up" : "Tambah Pertanyaan Discovery"}
                </h3>
                <p className="text-xs text-slate-500">Ajukan pertanyaan klarifikasi terstruktur.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createQuestionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{createQuestionError}</span>
              </div>
            )}

            <form onSubmit={handleCreateQuestion} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori *</label>
                  <select
                    value={newQuestionCategory}
                    onChange={(e) => setNewQuestionCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {Object.entries(categoryLabels)
                      .filter(([k]) => k !== "ALL")
                      .map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prioritas</label>
                  <select
                    value={newQuestionPriority}
                    onChange={(e) => setNewQuestionPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="HIGH">High (Kritikal)</option>
                    <option value="MEDIUM">Medium (Standar)</option>
                    <option value="LOW">Low (Opsional)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Teks Pertanyaan *</label>
                <textarea
                  rows={3}
                  required
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="Tuliskan pertanyaan spesifik dan eksplisit untuk klien..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rasional Pertanyaan</label>
                <textarea
                  rows={2}
                  value={newQuestionRationale}
                  onChange={(e) => setNewQuestionRationale(e.target.value)}
                  placeholder="Mengapa pertanyaan ini penting dan dampaknya terhadap arsitektur/scope..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
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
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Pertanyaan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Answer Modal */}
      {selectedQuestionForAnswer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Catat Jawaban Klien</h3>
                <p className="text-xs text-slate-500">Merekam jawaban klarifikasi dari stakeholder.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQuestionForAnswer(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800">
              <span className="font-semibold block text-slate-500 text-[10px] uppercase">Pertanyaan:</span>
              <p className="mt-0.5">{selectedQuestionForAnswer.question}</p>
            </div>

            {answerError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{answerError}</span>
              </div>
            )}

            <form onSubmit={handleRecordAnswer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Isi Jawaban Klien *</label>
                <textarea
                  rows={4}
                  required
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Tuliskan keputusan atau jawaban faktual yang diberikan klien..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Responden</label>
                  <input
                    type="text"
                    value={respondentName}
                    onChange={(e) => setRespondentName(e.target.value)}
                    placeholder="Nama PIC (e.g. Pak Budi)"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Peran / Jabatan</label>
                  <input
                    type="text"
                    value={respondentRole}
                    onChange={(e) => setRespondentRole(e.target.value)}
                    placeholder="Contoh: Lead Architect"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sumber Jawaban</label>
                <input
                  type="text"
                  value={answerSource}
                  onChange={(e) => setAnswerSource(e.target.value)}
                  placeholder="Discovery Meeting / Email / WhatsApp"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedQuestionForAnswer(null)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan & Set Jawaban"}
                </button>
              </div>
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
