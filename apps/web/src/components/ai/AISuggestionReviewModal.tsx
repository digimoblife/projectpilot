"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BadgeAlert,
  Check,
  CheckCircle2,
  ChevronRight,
  Code2,
  Edit3,
  ExternalLink,
  FileCheck2,
  FileQuestion,
  FileText,
  HelpCircle,
  Info,
  Layers,
  ListOrdered,
  Plus,
  Scale,
  Sparkles,
  Tag,
  X,
  XCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export interface AISuggestionItem {
  id: string;
  project_id: string;
  capability: string;
  title: string;
  suggested_data: any;
  evidence_sources: any;
  status: "GENERATED" | "ACCEPTED" | "EDITED" | "REJECTED";
  created_at: string;
}

interface AISuggestionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: AISuggestionItem | null;
  onReviewed: () => void;
}

const categoryDisplayNames: Record<string, { label: string; bg: string; text: string }> = {
  TECHNICAL_ARCHITECTURE: { label: "Arsitektur Teknis", bg: "bg-blue-50", text: "text-blue-700" },
  TECHNICAL: { label: "Teknis", bg: "bg-blue-50", text: "text-blue-700" },
  PAYMENT_INTEGRATION: { label: "Integrasi Payment", bg: "bg-emerald-50", text: "text-emerald-700" },
  INTEGRATIONS_APIS: { label: "Integrasi API & Sistem", bg: "bg-indigo-50", text: "text-indigo-700" },
  INTEGRATION: { label: "Integrasi", bg: "bg-indigo-50", text: "text-indigo-700" },
  SECURITY_COMPLIANCE: { label: "Keamanan & Kepatuhan", bg: "bg-rose-50", text: "text-rose-700" },
  SECURITY: { label: "Keamanan", bg: "bg-rose-50", text: "text-rose-700" },
  BUSINESS_GOALS: { label: "Tujuan Bisnis", bg: "bg-amber-50", text: "text-amber-700" },
  BUSINESS: { label: "Bisnis", bg: "bg-amber-50", text: "text-amber-700" },
  USER_PERSONAS: { label: "Pengguna & UI/UX", bg: "bg-purple-50", text: "text-purple-700" },
  UX: { label: "UI/UX", bg: "bg-purple-50", text: "text-purple-700" },
  FUNCTIONAL_SCOPE: { label: "Scope Fungsional", bg: "bg-sky-50", text: "text-sky-700" },
  FUNCTIONAL: { label: "Fungsional", bg: "bg-sky-50", text: "text-sky-700" },
  CORE_FEATURE: { label: "Fitur Utama", bg: "bg-sky-50", text: "text-sky-700" },
  NON_FUNCTIONAL_REQUIREMENTS: { label: "Non-Fungsional", bg: "bg-slate-100", text: "text-slate-700" },
  PERFORMANCE: { label: "Performa & SLA", bg: "bg-orange-50", text: "text-orange-700" },
  DATA_MIGRATION: { label: "Migrasi Data", bg: "bg-teal-50", text: "text-teal-700" },
  DATA: { label: "Data", bg: "bg-teal-50", text: "text-teal-700" },
  TIMELINE_BUDGET: { label: "Operasional & Jadwal", bg: "bg-cyan-50", text: "text-cyan-700" },
  DESIGN_BRANDING: { label: "Desain & Branding", bg: "bg-pink-50", text: "text-pink-700" },
  RISKS_ASSUMPTIONS: { label: "Risiko & Asumsi", bg: "bg-amber-50", text: "text-amber-700" },
  SUCCESS_METRICS: { label: "Metrik Keberhasilan", bg: "bg-emerald-50", text: "text-emerald-700" },
};

function formatCategory(catKey?: string) {
  if (!catKey) return { label: "Umum", bg: "bg-slate-100", text: "text-slate-700" };
  return categoryDisplayNames[catKey] || {
    label: catKey.replace(/_/g, " "),
    bg: "bg-blue-50",
    text: "text-blue-700",
  };
}

export function AISuggestionReviewModal({
  isOpen,
  onClose,
  suggestion,
  onReviewed,
}: AISuggestionReviewModalProps) {
  const { token } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedDataText, setEditedDataText] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdClarificationIndices, setCreatedClarificationIndices] = useState<number[]>([]);

  React.useEffect(() => {
    if (suggestion) {
      setEditedDataText(JSON.stringify(suggestion.suggested_data, null, 2));
      setReviewNotes("");
      setIsEditing(false);
      setError(null);
      setCreatedClarificationIndices([]);
    }
  }, [suggestion]);

  if (!isOpen || !suggestion) return null;

  async function handleReview(action: "ACCEPTED" | "EDITED" | "REJECTED") {
    setError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    let payloadEditedData = null;
    if (action === "EDITED") {
      try {
        payloadEditedData = JSON.parse(editedDataText);
      } catch {
        setError("Format JSON hasil editan tidak valid.");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      // 1. Mark review status
      const res = await apiClient(
        `/projects/${suggestion?.project_id}/ai/suggestions/${suggestion?.id}/review`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            action,
            edited_data: payloadEditedData,
            review_notes: reviewNotes || null,
          }),
        }
      );

      if (!res.data) {
        setError(res.error || "Gagal menyimpan review saran AI.");
        setIsSubmitting(false);
        return;
      }

      // 2. If ACCEPTED or EDITED, also apply the transactional acceptance into project entities
      if (action === "ACCEPTED" || action === "EDITED") {
        if (suggestion?.capability === "DISCOVERY_QUESTION_GEN") {
          const acceptRes = await apiClient(
            `/projects/${suggestion.project_id}/ai/suggestions/${suggestion.id}/accept-questions`,
            {
              method: "POST",
              headers,
            }
          );
          if (acceptRes.error) {
            console.warn("Auto-apply questions warning:", acceptRes.error);
          }
        } else if (suggestion?.capability === "REQUIREMENT_EXTRACTION") {
          const acceptRes = await apiClient(
            `/projects/${suggestion.project_id}/ai/suggestions/${suggestion.id}/accept-requirements`,
            {
              method: "POST",
              headers,
            }
          );
          if (acceptRes.error) {
            console.warn("Auto-apply requirements warning:", acceptRes.error);
          }
        }
      }

      onReviewed();
      onClose();
    } catch {
      setError("Terjadi kesalahan sistem saat memproses review.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Extract clean evidence preview text
  const cleanEvidenceText = (() => {
    if (!suggestion.evidence_sources) return null;
    if (typeof suggestion.evidence_sources === "string") return suggestion.evidence_sources;
    if (suggestion.evidence_sources.evidence_preview) return suggestion.evidence_sources.evidence_preview;
    return JSON.stringify(suggestion.evidence_sources);
  })();

  // Extract questions, requirements, epics, or tasks array for friendly rendering
  const suggestedData = suggestion.suggested_data || {};
  const questionsList = Array.isArray(suggestedData)
    ? suggestedData
    : suggestedData.discovery_questions || suggestedData.questions || [];
  const requirementsList = Array.isArray(suggestedData)
    ? suggestedData
    : suggestedData.requirements || suggestedData.candidate_requirements || [];
  const contradictionsList = Array.isArray(suggestedData)
    ? suggestedData
    : suggestedData.contradictions || [];
  const epicsList = Array.isArray(suggestedData)
    ? suggestedData
    : suggestedData.epics || [];
  const tasksList = Array.isArray(suggestedData)
    ? suggestedData
    : suggestedData.tasks || [];

  const isQuestionsMode =
    suggestion.capability === "DISCOVERY_QUESTION_GEN" ||
    (questionsList.length > 0 && !requirementsList.length && !epicsList.length && !tasksList.length);
  const isRequirementsMode =
    suggestion.capability === "REQUIREMENT_EXTRACTION" ||
    (requirementsList.length > 0 && !questionsList.length && !epicsList.length && !tasksList.length);
  const isContradictionsMode =
    suggestion.capability === "CONTRADICTION_DETECTION" || contradictionsList.length > 0;
  const isEpicsMode =
    suggestion.capability === "EPIC_FEATURE_GEN" || epicsList.length > 0;
  const isTasksMode =
    suggestion.capability === "TASK_BREAKDOWN_GEN" || tasksList.length > 0;

  async function handleCreateClarificationQuestion(c: any, idx: number) {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const res = await apiClient(`/projects/${suggestion?.project_id}/discovery-questions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          category: "OPERATIONAL",
          question: c.recommended_resolution,
          rationale: `Resolusi kontradiksi: "${c.title}" (Pernyataan A: ${c.statement_a} vs Pernyataan B: ${c.statement_b})`,
          priority: "HIGH",
        }),
      });
      if (res.data) {
        setCreatedClarificationIndices((prev) => [...prev, idx]);
      }
    } catch {
      // Handled
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 space-y-4 my-8 max-h-[90vh] flex flex-col animate-fadeIn">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  {isContradictionsMode ? "Peringatan Audit & Kontradiksi" : "Rekomendasi AI Terverifikasi"}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Perlu Ditinjau PM
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-base mt-0.5">{suggestion.title}</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Clean Evidence Grounding Box */}
          {cleanEvidenceText && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px]">
                <Info className="w-3.5 h-3.5 text-sky-600" />
                <span>Dasar Bukti Proyek (Evidence Grounding):</span>
              </div>
              <p className="text-slate-600 text-xs bg-white p-3 rounded-lg border border-slate-200 leading-relaxed max-h-24 overflow-y-auto whitespace-pre-line">
                {cleanEvidenceText}
              </p>
            </div>
          )}

          {/* Suggested Data View / Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-800">
                  {isEditing
                    ? "Mode Edit Data JSON"
                    : isContradictionsMode
                    ? "Daftar Temuan Konflik Spesifikasi:"
                    : "Daftar Rekomendasi Hasil AI:"}
                </span>
                {!isEditing && (
                  <span className="text-[11px] text-slate-500">
                    ({isQuestionsMode
                      ? `${questionsList.length} pertanyaan`
                      : isRequirementsMode
                      ? `${requirementsList.length} requirement`
                      : isContradictionsMode
                      ? `${contradictionsList.length} konflik terdeteksi`
                      : "Detail"})
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs font-semibold text-purple-700 hover:text-purple-800 flex items-center gap-1 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? "Tampilan Rapi" : "Edit Konten"}</span>
              </button>
            </div>

            {isEditing ? (
              <textarea
                rows={10}
                value={editedDataText}
                onChange={(e) => setEditedDataText(e.target.value)}
                className="w-full p-3 font-mono text-xs border border-purple-200 rounded-xl bg-purple-50/30 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 leading-relaxed"
              />
            ) : isQuestionsMode && questionsList.length > 0 ? (
              /* ========================================================================= */
              /* HUMAN-FRIENDLY DISCOVERY QUESTIONS CARDS                                  */
              /* ========================================================================= */
              <div className="space-y-3">
                {questionsList.map((q: any, idx: number) => {
                  const catCfg = formatCategory(q.category);
                  return (
                    <div
                      key={idx}
                      className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow space-y-2.5"
                    >
                      {/* Top Meta */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center border border-slate-200">
                            #{idx + 1}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${catCfg.bg} ${catCfg.text}`}>
                            {catCfg.label}
                          </span>
                        </div>
                        {q.evidence_quality && (
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                            Evidence: {q.evidence_quality}
                          </span>
                        )}
                      </div>

                      {/* Question Text */}
                      <div className="space-y-1">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                          {q.question}
                        </h4>
                        {q.context && (
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-600 leading-relaxed">
                            <span className="font-semibold text-slate-700">Tujuan Pertanyaan: </span>
                            {q.context}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : isRequirementsMode && requirementsList.length > 0 ? (
              /* ========================================================================= */
              /* HUMAN-FRIENDLY REQUIREMENTS CARDS                                         */
              /* ========================================================================= */
              <div className="space-y-3">
                {requirementsList.map((r: any, idx: number) => {
                  const catCfg = formatCategory(r.category);
                  const isHigh = ["CRITICAL", "HIGH"].includes(r.priority);
                  return (
                    <div
                      key={idx}
                      className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-500">
                            REQ-AI-{(idx + 1).toString().padStart(3, "0")}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${catCfg.bg} ${catCfg.text}`}>
                            {catCfg.label}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isHigh
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {r.priority || "MEDIUM"}
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">{r.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{r.description}</p>

                      {r.acceptance_criteria && Array.isArray(r.acceptance_criteria) && (
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">
                            Kriteria Keberhasilan (Acceptance Criteria):
                          </span>
                          <ul className="text-xs text-slate-700 list-disc list-inside space-y-0.5">
                            {r.acceptance_criteria.map((crit: string, cIdx: number) => (
                              <li key={cIdx}>{crit}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : isContradictionsMode && contradictionsList.length > 0 ? (
              /* ========================================================================= */
              /* HUMAN-FRIENDLY CONTRADICTION CARDS                                        */
              /* ========================================================================= */
              <div className="space-y-3">
                {contradictionsList.map((c: any, idx: number) => {
                  const isClarificationAdded = createdClarificationIndices.includes(idx);
                  return (
                    <div
                      key={idx}
                      className="p-4 bg-amber-50/40 rounded-xl border border-amber-200 space-y-3 text-xs"
                    >
                      <div className="flex items-center gap-2 font-bold text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>{c.title}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="font-bold text-[10px] text-slate-400 block mb-1">Pernyataan A:</span>
                          <p className="text-slate-700 leading-relaxed">{c.statement_a}</p>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="font-bold text-[10px] text-slate-400 block mb-1">
                            Pernyataan B (Konflik):
                          </span>
                          <p className="text-slate-700 leading-relaxed">{c.statement_b}</p>
                        </div>
                      </div>

                      {c.impact && (
                        <div className="p-2 bg-amber-100/60 rounded-lg text-amber-900 text-[11px]">
                          <span className="font-semibold">Dampak Teknis: </span>
                          <span>{c.impact}</span>
                        </div>
                      )}

                      {c.recommended_resolution && (
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-2">
                          <div>
                            <span className="font-bold text-[11px] block text-emerald-800">
                              Saran Pertanyaan Klarifikasi ke Klien:
                            </span>
                            <p className="text-xs text-slate-700 mt-0.5">&quot;{c.recommended_resolution}&quot;</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCreateClarificationQuestion(c, idx)}
                            disabled={isClarificationAdded}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:bg-emerald-800 disabled:opacity-80"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>
                              {isClarificationAdded
                                ? "✓ Pertanyaan Ditambahkan ke Papan Discovery"
                                : "Jadikan Pertanyaan Discovery"}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : isEpicsMode && epicsList.length > 0 ? (
              /* ========================================================================= */
              /* HUMAN-FRIENDLY EPICS & FEATURES CARDS                                     */
              /* ========================================================================= */
              <div className="space-y-4">
                {epicsList.map((epic: any, eIdx: number) => (
                  <div
                    key={eIdx}
                    className="p-4 bg-white rounded-xl border border-blue-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                          {epic.key || `EPIC-${(eIdx + 1).toString().padStart(2, "0")}`}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{epic.title}</h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        {epic.features?.length || 0} Sub-Fitur
                      </span>
                    </div>

                    {epic.description && (
                      <p className="text-xs text-slate-600 leading-relaxed">{epic.description}</p>
                    )}

                    {/* Features List */}
                    {epic.features && epic.features.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                          Daftar Sub-Fitur:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {epic.features.map((feat: any, fIdx: number) => (
                            <div
                              key={fIdx}
                              className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] font-bold text-slate-500">
                                  {feat.key || `FEAT-${(fIdx + 1).toString().padStart(2, "0")}`}
                                </span>
                                <span className="text-xs font-semibold text-slate-900">
                                  {feat.title}
                                </span>
                              </div>
                              {feat.description && (
                                <p className="text-[11px] text-slate-500 leading-snug">
                                  {feat.description}
                                </p>
                              )}
                              {feat.requirement_key && (
                                <span className="text-[9px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                  Trace: {feat.requirement_key}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : isTasksMode && tasksList.length > 0 ? (
              /* ========================================================================= */
              /* HUMAN-FRIENDLY TASKS CARDS                                                */
              /* ========================================================================= */
              <div className="space-y-3">
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                  <span>⏱️ <strong>Estimasi Waktu Pengerjaan:</strong> Default 0 Hari (Diinput manual oleh PM).</span>
                  <span className="font-bold text-blue-700">{tasksList.length} Task Disiapkan</span>
                </div>

                <div className="space-y-2.5">
                  {tasksList.map((task: any, tIdx: number) => {
                    const isCritical = task.priority === "CRITICAL" || task.priority === "HIGH";
                    return (
                      <div
                        key={tIdx}
                        className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-500">
                              {task.key || `TASK-${(tIdx + 1).toString().padStart(3, "0")}`}
                            </span>
                            {task.suggested_role && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                {task.suggested_role}
                              </span>
                            )}
                            {task.epic_key && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {task.epic_key}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                isCritical
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {task.priority || "MEDIUM"}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-slate-900">{task.title}</h4>
                          {task.description && (
                            <p className="text-[11px] text-slate-500 leading-snug">
                              {task.description}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0 text-[11px] text-slate-400 font-mono">
                          Est: 0 Hari
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Generic Clean Fallback */
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs leading-relaxed space-y-2">
                <pre className="font-sans text-xs text-slate-800 whitespace-pre-wrap">
                  {typeof suggestion.suggested_data === "object"
                    ? JSON.stringify(suggestion.suggested_data, null, 2)
                    : suggestion.suggested_data}
                </pre>
              </div>
            )}
          </div>

          {/* Review Notes Input */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Catatan Review PM (Opsional):
            </label>
            <input
              type="text"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Alasan persetujuan atau catatan implementasi..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        </div>

        {/* Human Approval Gate Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleReview("REJECTED")}
            className="w-full sm:w-auto px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl border border-rose-200 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            <span>Tolak Saran</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Tutup
            </button>

            {isEditing ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleReview("EDITED")}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? "Menyimpan..." : "Simpan Editan & Terima"}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleReview("ACCEPTED")}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? "Menyimpan..."
                    : isContradictionsMode
                    ? "Tandai Telah Ditinjau"
                    : "Setujui & Terapkan"}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
