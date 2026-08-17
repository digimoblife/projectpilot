"use client";

import React, { useEffect, useState, use } from "react";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  FileText,
  Filter,
  Layers,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Tag,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { AISuggestionReviewModal, AISuggestionItem } from "@/components/ai/AISuggestionReviewModal";

interface MeetingParticipant {
  id: string;
  participant_type: "INTERNAL" | "CLIENT" | "EXTERNAL";
  display_name_snapshot: string;
  role_snapshot: string | null;
}

interface ActionItem {
  id: string;
  title: string;
  description: string | null;
  status: "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED" | "CONVERTED";
  owner_name: string | null;
  due_date: string | null;
  converted_entity_type: string | null;
  converted_entity_id: string | null;
}

interface Meeting {
  id: string;
  meeting_key: string;
  title: string;
  meeting_type: string;
  scheduled_at: string | null;
  occurred_at: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "FINALIZED";
  notes: string | null;
  transcript: string | null;
  summary: string | null;
  finalized_at: string | null;
  created_at: string;
  participants: MeetingParticipant[];
  action_items: ActionItem[];
}

interface Feature {
  id: string;
  key: string;
  title: string;
}

const meetingTypeConfigs: Record<string, { label: string; color: string }> = {
  KICKOFF: { label: "Kickoff Meeting", color: "bg-purple-50 text-purple-700 border-purple-200" },
  DISCOVERY: { label: "Discovery Workshop", color: "bg-blue-50 text-blue-700 border-blue-200" },
  WEEKLY_SYNC: { label: "Weekly Sync", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  SPRINT_PLANNING: { label: "Sprint Planning", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  SPRINT_REVIEW: { label: "Sprint Review & Demo", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  AD_HOC: { label: "Ad-hoc Alignment", color: "bg-slate-100 text-slate-700 border-slate-200" },
  CLIENT_REVIEW: { label: "Client Steering", color: "bg-amber-50 text-amber-700 border-amber-200" },
  HANDOVER: { label: "Handover Rapat", color: "bg-teal-50 text-teal-700 border-teal-200" },
};

const meetingStatusConfigs: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: "Terjadwal", color: "bg-blue-50 text-blue-700 border-blue-200" },
  COMPLETED: { label: "Selesai (Completed)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  FINALIZED: { label: "Telah Difinalisasi", color: "bg-purple-50 text-purple-700 border-purple-200" },
  CANCELLED: { label: "Dibatalkan", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

export default function ProjectMeetingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { token } = useAuth();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Create Meeting Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("WEEKLY_SYNC");
  const [newOccurredAt, setNewOccurredAt] = useState(new Date().toISOString().slice(0, 16));
  const [newNotes, setNewNotes] = useState("");
  const [newTranscript, setNewTranscript] = useState("");
  const [newParticipants, setNewParticipants] = useState<
    { participant_type: "INTERNAL" | "CLIENT" | "EXTERNAL"; display_name_snapshot: string; role_snapshot: string }[]
  >([{ participant_type: "INTERNAL", display_name_snapshot: "PM Lead", role_snapshot: "Project Manager" }]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Action Item Creation Modal
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionTitle, setActionTitle] = useState("");
  const [actionDesc, setActionDesc] = useState("");
  const [actionOwner, setActionOwner] = useState("");
  const [actionDueDate, setActionDueDate] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  // Convert Action Item Modal
  const [selectedActionForConvert, setSelectedActionForConvert] = useState<ActionItem | null>(null);
  const [targetEntity, setTargetEntity] = useState<"TASK" | "CLIENT_DEPENDENCY" | "ISSUE">("TASK");
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>("");
  const [convertError, setConvertError] = useState<string | null>(null);

  // AI Meeting Analysis States
  const [selectedSuggestion, setSelectedSuggestion] = useState<AISuggestionItem | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [projectId, token]);

  async function fetchData() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [mtgRes, featRes] = await Promise.all([
        apiClient<Meeting[]>(`/projects/${projectId}/meetings`, { headers }),
        apiClient<Feature[]>(`/projects/${projectId}/features`, { headers }),
      ]);

      if (mtgRes.data) {
        setMeetings(mtgRes.data);
        if (selectedMeeting) {
          const updated = mtgRes.data.find((m) => m.id === selectedMeeting.id);
          if (updated) setSelectedMeeting(updated);
        }
      }
      if (featRes.data) {
        setFeatures(featRes.data);
        if (featRes.data.length > 0 && !selectedFeatureId) {
          setSelectedFeatureId(featRes.data[0].id);
        }
      }
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateMeeting(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Meeting>(`/projects/${projectId}/meetings`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: newTitle,
          meeting_type: newType,
          occurred_at: newOccurredAt ? new Date(newOccurredAt).toISOString() : new Date().toISOString(),
          notes: newNotes || null,
          transcript: newTranscript || null,
          participants: newParticipants.filter((p) => p.display_name_snapshot.trim() !== ""),
        }),
      });

      if (res.data) {
        setIsCreateModalOpen(false);
        resetCreateForm();
        fetchData();
        setSelectedMeeting(res.data);
      } else {
        setCreateError(res.error || "Gagal mencatat notulen rapat.");
      }
    } catch {
      setCreateError("Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddActionItem(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMeeting) return;
    setActionError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<ActionItem>(`/projects/${projectId}/meetings/${selectedMeeting.id}/action-items`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: actionTitle,
          description: actionDesc || null,
          owner_name: actionOwner || null,
          due_date: actionDueDate ? new Date(actionDueDate).toISOString() : null,
        }),
      });

      if (res.data) {
        setIsActionModalOpen(false);
        setActionTitle("");
        setActionDesc("");
        setActionOwner("");
        setActionDueDate("");
        fetchData();
      } else {
        setActionError(res.error || "Gagal menambahkan action item.");
      }
    } catch {
      setActionError("Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConvertActionItem(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMeeting || !selectedActionForConvert) return;
    setConvertError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<ActionItem>(
        `/projects/${projectId}/meetings/${selectedMeeting.id}/action-items/${selectedActionForConvert.id}/convert`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            target_entity: targetEntity,
            feature_id: targetEntity === "TASK" ? selectedFeatureId : null,
          }),
        }
      );

      if (res.data) {
        setSelectedActionForConvert(null);
        fetchData();
      } else {
        setConvertError(res.error || "Gagal mengonversi action item.");
      }
    } catch {
      setConvertError("Terjadi kesalahan sistem saat konversi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAIMeetingAnalysis(meeting: Meeting) {
    setIsAILoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<AISuggestionItem>(`/projects/${projectId}/meetings/${meeting.id}/analyze-ai`, {
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

  async function handleFinalizeMeeting(meeting: Meeting) {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await apiClient(`/projects/${projectId}/meetings/${meeting.id}/finalize`, {
        method: "POST",
        headers,
      });
      fetchData();
    } catch {
      // Handled
    }
  }

  function resetCreateForm() {
    setNewTitle("");
    setNewType("WEEKLY_SYNC");
    setNewNotes("");
    setNewTranscript("");
    setNewParticipants([{ participant_type: "INTERNAL", display_name_snapshot: "PM Lead", role_snapshot: "Project Manager" }]);
    setCreateError(null);
  }

  function addParticipantRow() {
    setNewParticipants([
      ...newParticipants,
      { participant_type: "CLIENT", display_name_snapshot: "", role_snapshot: "" },
    ]);
  }

  function removeParticipantRow(idx: number) {
    setNewParticipants(newParticipants.filter((_, i) => i !== idx));
  }

  const filteredMeetings = meetings.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.meeting_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.notes && m.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = selectedType === "ALL" || m.meeting_type === selectedType;
    const matchesStatus = selectedStatus === "ALL" || m.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Manajemen Rapat & Notulen</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dokumentasikan jalannya diskusi, daftar hadir peserta, transkrip, dan tindak lanjut (Action Items).
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetCreateForm();
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Notulen Rapat Baru</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul, kode MTG, atau isi notulen..."
            className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
          >
            <option value="ALL">Semua Jenis Rapat</option>
            {Object.keys(meetingTypeConfigs).map((t) => (
              <option key={t} value={t}>
                {meetingTypeConfigs[t].label}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
          >
            <option value="ALL">Semua Status</option>
            {Object.keys(meetingStatusConfigs).map((s) => (
              <option key={s} value={s}>
                {meetingStatusConfigs[s].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Meeting Cards & Detail Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Meeting Cards List */}
        <div className="lg:col-span-5 space-y-3">
          {isLoading ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
              Memuat data rapat...
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p>Belum ada notulen rapat yang tercatat.</p>
            </div>
          ) : (
            filteredMeetings.map((m) => {
              const typeCfg = meetingTypeConfigs[m.meeting_type] || meetingTypeConfigs.WEEKLY_SYNC;
              const statusCfg = meetingStatusConfigs[m.status] || meetingStatusConfigs.COMPLETED;
              const isSelected = selectedMeeting?.id === m.id;

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMeeting(m)}
                  className={`p-4 bg-white rounded-xl border cursor-pointer transition-all hover:shadow-xs ${
                    isSelected
                      ? "border-purple-500 ring-2 ring-purple-500/10"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {m.meeting_key}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeCfg.color}`}>
                        {typeCfg.label}
                      </span>
                    </div>

                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-xs line-clamp-1">{m.title}</h3>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(m.occurred_at).toLocaleDateString("id-ID")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{m.participants.length} Peserta</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{m.action_items.length} Action Items</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Selected Meeting Detail Pane */}
        <div className="lg:col-span-7">
          {selectedMeeting ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5 shadow-xs">
              {/* Meeting Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                      {selectedMeeting.meeting_key}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        meetingTypeConfigs[selectedMeeting.meeting_type]?.color
                      }`}
                    >
                      {meetingTypeConfigs[selectedMeeting.meeting_type]?.label}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900">{selectedMeeting.title}</h2>
                  <span className="text-xs text-slate-500">
                    Dilaksanakan pada: {new Date(selectedMeeting.occurred_at).toLocaleString("id-ID")}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isAILoading}
                    onClick={() => handleAIMeetingAnalysis(selectedMeeting)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>{isAILoading ? "Menganalisis..." : "✨ AI Analisa Rapat"}</span>
                  </button>

                  {selectedMeeting.status !== "FINALIZED" && (
                    <button
                      type="button"
                      onClick={() => handleFinalizeMeeting(selectedMeeting)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                    >
                      Finalisasi
                    </button>
                  )}
                </div>
              </div>

              {/* AI Executive Summary (If Available) */}
              {selectedMeeting.summary && (
                <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-purple-800 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>Ringkasan Eksekutif Rapat (AI Copilot):</span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed">{selectedMeeting.summary}</p>
                </div>
              )}

              {/* Attendees Box */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-900 block">Daftar Kehadiran Peserta:</span>
                <div className="flex flex-wrap gap-2">
                  {selectedMeeting.participants.map((p) => (
                    <div
                      key={p.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800">{p.display_name_snapshot}</span>
                      <span className="text-[10px] text-slate-500">
                        ({p.role_snapshot || p.participant_type})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Meeting Notes */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-900 block">Catatan Diskusi / Notula:</span>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {selectedMeeting.notes || "Tidak ada catatan tertulis."}
                </div>
              </div>

              {/* Action Items List */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Tindak Lanjut / Action Items ({selectedMeeting.action_items.length})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Tugas atau ketergantungan yang dapat dikonversi langsung menjadi Task / Blocker.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsActionModalOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Aksi</span>
                  </button>
                </div>

                {selectedMeeting.action_items.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    Belum ada action item pada rapat ini.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedMeeting.action_items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{item.title}</span>
                            {item.status === "CONVERTED" && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Terkonversi: {item.converted_entity_type}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-slate-600 line-clamp-1">{item.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-0.5">
                            <span>PIC: {item.owner_name || "Belum ditugaskan"}</span>
                            {item.due_date && (
                              <span>Target: {new Date(item.due_date).toLocaleDateString("id-ID")}</span>
                            )}
                          </div>
                        </div>

                        {item.status !== "CONVERTED" && (
                          <button
                            type="button"
                            onClick={() => setSelectedActionForConvert(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                          >
                            <span>Konversi</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p>Pilih salah satu notulen rapat di sebelah kiri untuk melihat detail dan action item.</p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE MEETING MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Catat Notulen Rapat Baru</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateMeeting} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul / Topik Rapat *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Kickoff & Technical Architecture Sync"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Rapat *</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    {Object.keys(meetingTypeConfigs).map((t) => (
                      <option key={t} value={t}>
                        {meetingTypeConfigs[t].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Waktu Pelaksanaan *</label>
                  <input
                    type="datetime-local"
                    value={newOccurredAt}
                    onChange={(e) => setNewOccurredAt(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              {/* Participants Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">Daftar Hadir Peserta:</label>
                  <button
                    type="button"
                    onClick={addParticipantRow}
                    className="text-xs text-purple-700 font-semibold hover:text-purple-800"
                  >
                    + Tambah Peserta
                  </button>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {newParticipants.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={p.participant_type}
                        onChange={(e) => {
                          const updated = [...newParticipants];
                          updated[idx].participant_type = e.target.value as any;
                          setNewParticipants(updated);
                        }}
                        className="text-xs px-2 py-1 bg-white border border-slate-200 rounded-md"
                      >
                        <option value="INTERNAL">Internal</option>
                        <option value="CLIENT">Client</option>
                        <option value="EXTERNAL">Vendor/External</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Nama Peserta"
                        value={p.display_name_snapshot}
                        onChange={(e) => {
                          const updated = [...newParticipants];
                          updated[idx].display_name_snapshot = e.target.value;
                          setNewParticipants(updated);
                        }}
                        className="flex-1 text-xs px-2 py-1 bg-white border border-slate-200 rounded-md"
                      />
                      <input
                        type="text"
                        placeholder="Peran (e.g. Lead Dev)"
                        value={p.role_snapshot}
                        onChange={(e) => {
                          const updated = [...newParticipants];
                          updated[idx].role_snapshot = e.target.value;
                          setNewParticipants(updated);
                        }}
                        className="w-28 text-xs px-2 py-1 bg-white border border-slate-200 rounded-md"
                      />
                      {newParticipants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeParticipantRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Notula *</label>
                <textarea
                  rows={4}
                  required
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Poin-poin kesepakatan, argumen arsitektur, dan ringkasan jalannya rapat..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transkrip Audio / Raw Transcript (Opsional):
                </label>
                <textarea
                  rows={3}
                  value={newTranscript}
                  onChange={(e) => setNewTranscript(e.target.value)}
                  placeholder="Salin transkrip suara / hasil recording rapat di sini untuk analisis AI mendalam..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Notulen Rapat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ACTION ITEM MODAL */}
      {isActionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Tambah Action Item Rapat</h3>
              <button
                type="button"
                onClick={() => setIsActionModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {actionError}
              </div>
            )}

            <form onSubmit={handleAddActionItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Tindak Lanjut *</label>
                <input
                  type="text"
                  required
                  value={actionTitle}
                  onChange={(e) => setActionTitle(e.target.value)}
                  placeholder="Contoh: Minta staging API key ke vendor"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Tambahan</label>
                <textarea
                  rows={2}
                  value={actionDesc}
                  onChange={(e) => setActionDesc(e.target.value)}
                  placeholder="Detail instruksi atau kontak PIC..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PIC / Penanggung Jawab</label>
                  <input
                    type="text"
                    value={actionOwner}
                    onChange={(e) => setActionOwner(e.target.value)}
                    placeholder="Nama PIC"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Selesai</label>
                  <input
                    type="date"
                    value={actionDueDate}
                    onChange={(e) => setActionDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsActionModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Tambahkan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONVERT ACTION ITEM MODAL */}
      {selectedActionForConvert && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Konversi Action Item</h3>
              <button
                type="button"
                onClick={() => setSelectedActionForConvert(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {convertError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {convertError}
              </div>
            )}

            <form onSubmit={handleConvertActionItem} className="space-y-3.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-800 block mb-0.5">{selectedActionForConvert.title}</span>
                <p className="text-slate-600 text-[11px]">{selectedActionForConvert.description || "Tanpa deskripsi."}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Entitas Konversi *</label>
                <select
                  value={targetEntity}
                  onChange={(e) => setTargetEntity(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                >
                  <option value="TASK">Task (Papan Kanban & Timeline)</option>
                  <option value="CLIENT_DEPENDENCY">Client Dependency (Matriks Ketergantungan Klien)</option>
                  <option value="ISSUE">Issue (Log Kendala / Isu Teknis)</option>
                </select>
              </div>

              {targetEntity === "TASK" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hubungkan ke Feature *</label>
                  <select
                    required
                    value={selectedFeatureId}
                    onChange={(e) => setSelectedFeatureId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    {features.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.key} - {f.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedActionForConvert(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Mengonversi..." : "Konfirmasi Konversi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI SUGGESTION REVIEW MODAL */}
      <AISuggestionReviewModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        suggestion={selectedSuggestion}
        onReviewed={fetchData}
      />
    </div>
  );
}
