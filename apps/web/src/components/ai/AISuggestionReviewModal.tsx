"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Layers,
  Sparkles,
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

  React.useEffect(() => {
    if (suggestion) {
      setEditedDataText(JSON.stringify(suggestion.suggested_data, null, 2));
      setReviewNotes("");
      setIsEditing(false);
      setError(null);
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

      if (res.data) {
        onReviewed();
        onClose();
      } else {
        setError(res.error || "Gagal menyimpan review saran AI.");
      }
    } catch {
      setError("Terjadi kesalahan sistem saat memproses review.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 my-8">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                  {suggestion.capability}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Perlu Persetujuan PM
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-base mt-0.5">{suggestion.title}</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Evidence Sources Box */}
        {suggestion.evidence_sources && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
            <span className="font-bold text-[10px] uppercase text-slate-400 block tracking-wider">
              Sumber Bukti Proyek (Evidence Grounding):
            </span>
            <p className="text-slate-600 line-clamp-3 text-[11px] font-mono bg-white p-2 rounded border border-slate-200">
              {typeof suggestion.evidence_sources === "string"
                ? suggestion.evidence_sources
                : JSON.stringify(suggestion.evidence_sources, null, 2)}
            </p>
          </div>
        )}

        {/* Suggested Data Content / Editor */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800">
              {isEditing ? "Mode Edit Data AI" : "Hasil Generasi AI (Bahasa Indonesia):"}
            </span>
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs font-semibold text-purple-700 hover:text-purple-800 flex items-center gap-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? "Batalkan Edit" : "Edit Konten"}</span>
            </button>
          </div>

          {isEditing ? (
            <textarea
              rows={8}
              value={editedDataText}
              onChange={(e) => setEditedDataText(e.target.value)}
              className="w-full p-3 font-mono text-xs border border-purple-200 rounded-xl bg-purple-50/30 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          ) : (
            <div className="max-h-60 overflow-y-auto p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              {typeof suggestion.suggested_data === "object" ? (
                <pre className="font-sans text-xs text-slate-800 whitespace-pre-wrap">
                  {JSON.stringify(suggestion.suggested_data, null, 2)}
                </pre>
              ) : (
                <p className="text-slate-800">{suggestion.suggested_data}</p>
              )}
            </div>
          )}
        </div>

        {/* Review Notes */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Catatan Review (Opsional):
          </label>
          <input
            type="text"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Alasan penerimaan / penolakan saran AI ini..."
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
          />
        </div>

        {/* Human Approval Gate Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
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
              className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Tutup
            </button>

            {isEditing ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleReview("EDITED")}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? "Menyimpan..." : "Simpan Editan & Terima"}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleReview("ACCEPTED")}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? "Menyetujui..." : "Setujui & Terapkan"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
