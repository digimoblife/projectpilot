"use client";

import React, { useEffect, useState, use } from "react";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
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
import { MarkdownViewer } from "@/components/ui/markdown-viewer";

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

export interface CommunicationMeetingsViewProps {
  projectId: string;
  embedded?: boolean;
}

export function CommunicationMeetingsView({
  projectId,
  embedded = false,
}: CommunicationMeetingsViewProps) {
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

  // AI MoM Generation Modal States
  const [isAIGenModalOpen, setIsAIGenModalOpen] = useState(false);
  const [aiRawText, setAiRawText] = useState("");
  const [aiTitle, setAiTitle] = useState("");
  const [aiMeetingType, setAiMeetingType] = useState("WEEKLY_SYNC");
  const [aiMeetingDate, setAiMeetingDate] = useState(new Date().toISOString().slice(0, 16));
  const [aiAttendeesRaw, setAiAttendeesRaw] = useState("");
  const [aiGenError, setAiGenError] = useState<string | null>(null);
  const [isGeneratingMoM, setIsGeneratingMoM] = useState(false);

  const SAMPLE_MEETING_NOTES = `Rapat sinkronisasi mingguan Tim ProjectHub dengan Stakeholder Klien.
Hadir: Budi (Project Manager), Siti (Lead Frontend), Joko (Backend Architect), Pak Hartono (Client Sponsor), Ibu Dina (PIC Bisnis).

Poin Diskusi:
1. Progress sprint berjalan lancar di 75%, fitur Workspace dan Notulensi Rapat sudah masuk tahap review.
2. Integrasi payment gateway terkendala: Klien belum menyerahkan sandbox API key dan webhook secret.
3. Klien meminta penyesuaian alur approval di menu Notulensi: Action items hasil rumusan AI jangan langsung otomatis jadi task Kanban, melainkan harus ditawarkan terlebih dahulu untuk disetujui PM/Lead.
4. Tim sepakat target rilis staging dimundurkan 2 hari menunggu kredensial dari Ibu Dina.

Tindak Lanjut / Action Items:
- Joko menyiapkan endpoint callback webhook payment gateway selambatnya hari Jumat
- Siti merapikan form notulensi rapat dengan opsi AI generation dan approval konversi task
- Ibu Dina mengirimkan API key sandbox payment gateway paling lambat besok sore
- Budi mengupdate timeline project dan mengabari stakeholder`;

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

  async function handleGenerateAIMoM(e: React.FormEvent) {
    e.preventDefault();
    if (!aiRawText.trim()) {
      setAiGenError("Teks catatan rapat / transkrip wajib diisi.");
      return;
    }
    setAiGenError(null);
    setIsGeneratingMoM(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Meeting>(`/projects/${projectId}/meetings/generate-ai`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          raw_text: aiRawText,
          title: aiTitle.trim() || undefined,
          meeting_type: aiMeetingType,
          meeting_date: aiMeetingDate ? new Date(aiMeetingDate).toISOString() : new Date().toISOString(),
          attendees_raw: aiAttendeesRaw.trim() || undefined,
        }),
      });

      if (res.data) {
        setIsAIGenModalOpen(false);
        setAiRawText("");
        setAiTitle("");
        setAiAttendeesRaw("");
        await fetchData();
        setSelectedMeeting(res.data);
      } else {
        setAiGenError(res.error || "Gagal menyusun notulen dengan AI.");
      }
    } catch (err: any) {
      setAiGenError(err?.message || "Terjadi kesalahan sistem saat menyusun notulen dengan AI.");
    } finally {
      setIsGeneratingMoM(false);
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

  function handleDownloadMinutes(meetingToDownload?: Meeting) {
    const m = meetingToDownload || selectedMeeting;
    if (!m) return;

    const typeConfig = meetingTypeConfigs[m.meeting_type] || { label: m.meeting_type };
    const statusConfig = meetingStatusConfigs[m.status] || { label: m.status };
    const occurredDate = new Date(m.occurred_at).toLocaleString("id-ID");

    const participantsList =
      m.participants && m.participants.length > 0
        ? m.participants
            .map((p) => `- ${p.display_name_snapshot} (${p.role_snapshot || p.participant_type})`)
            .join("\n")
        : "- Tidak ada data kehadiran peserta tercatat.";

    const actionItemsList =
      m.action_items && m.action_items.length > 0
        ? m.action_items
            .map((a, idx) => {
              const owner = a.owner_name ? ` (PIC: ${a.owner_name})` : "";
              const due = a.due_date ? ` [Tenggat: ${new Date(a.due_date).toLocaleDateString("id-ID")}]` : "";
              const status = ` - Status: ${a.status}`;
              return `${idx + 1}. **${a.title}**${owner}${due}${status}${a.description ? `\n   ${a.description}` : ""}`;
            })
            .join("\n")
        : "- Tidak ada action item khusus.";

    const content = `# Notulensi Rapat: ${m.title}

**Kode Rapat:** ${m.meeting_key}
**Jenis Rapat:** ${typeConfig.label}
**Waktu Pelaksanaan:** ${occurredDate}
**Status:** ${statusConfig.label}

---

${m.summary ? `## 🌟 Ringkasan Eksekutif\n${m.summary}\n\n---\n\n` : ""}## 👥 Daftar Kehadiran Peserta
${participantsList}

---

## 📝 Catatan Diskusi & Notula
${m.notes || "Tidak ada catatan tertulis."}

---

## ✅ Tindak Lanjut & Action Items
${actionItemsList}

${m.transcript ? `\n---\n\n## 🎙️ Transkrip Rapat\n${m.transcript}\n` : ""}
---
*Dokumen resmi notulensi ProjectHub Governance • Dicetak/diunduh pada ${new Date().toLocaleString("id-ID")}*
`;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${m.meeting_key}_${m.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.md`;
    link.click();
    URL.revokeObjectURL(url);
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
            feature_id: targetEntity === "TASK" && selectedFeatureId ? selectedFeatureId : null,
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
      {/* Top Header & Actions (Hide standard header if embedded in Workspace) */}
      {!embedded && (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Manajemen Rapat & Notulen</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dokumentasikan jalannya diskusi, daftar hadir peserta, transkrip, dan tindak lanjut (Action Items).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAiGenError(null);
              setIsAIGenModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs active:scale-[0.98] transition-all shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-200" />
            <span>Generate MoM</span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetCreateForm();
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-2xs active:scale-[0.98] transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>Catat Manual</span>
          </button>
        </div>
      </div>
      )}

      {/* Embedded Action Button Toolbar */}
      {embedded && (
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Notulensi Rapat Proyek</h3>
            <p className="text-xs text-slate-500">
              Riwayat diskusi rapat, kehadiran peserta, ringkasan AI, dan pelacakan action item.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setAiGenError(null);
                setIsAIGenModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs active:scale-[0.98] transition-all shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-200" />
              <span>Generate MoM</span>
            </button>

            <button
              type="button"
              onClick={() => {
                resetCreateForm();
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-2xs active:scale-[0.98] transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-3 h-3 text-slate-500" />
              <span>Manual</span>
            </button>
          </div>
        </div>
      )}

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
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0 whitespace-nowrap">
                        {m.meeting_key}
                      </span>
                      <span className={`inline-flex items-center whitespace-nowrap shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeCfg.color}`}>
                        {typeCfg.label}
                      </span>
                    </div>

                    <span className={`inline-flex items-center whitespace-nowrap shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
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
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 shrink-0 whitespace-nowrap">
                      {selectedMeeting.meeting_key}
                    </span>
                    <span
                      className={`inline-flex items-center whitespace-nowrap shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
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

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownloadMinutes(selectedMeeting)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    title="Unduh Notulensi Rapat (.md)"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Unduh (.md)</span>
                  </button>

                  <button
                    type="button"
                    disabled={isAILoading}
                    onClick={() => handleAIMeetingAnalysis(selectedMeeting)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>{isAILoading ? "Menganalisis..." : "Analisa Dokumen"}</span>
                  </button>

                  {selectedMeeting.status !== "FINALIZED" && (
                    <button
                      type="button"
                      onClick={() => handleFinalizeMeeting(selectedMeeting)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
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
                    <span>Ringkasan Eksekutif Rapat:</span>
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 block">Catatan Diskusi / Notulensi Rapat:</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleDownloadMinutes(selectedMeeting)}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-purple-700 font-medium transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh .md</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(selectedMeeting.notes || "")}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Catatan</span>
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200">
                  {selectedMeeting.notes ? (
                    <MarkdownViewer
                      content={selectedMeeting.notes}
                      showPrintButton={false}
                      showCopyButton={false}
                    />
                  ) : (
                    <p className="text-xs text-slate-400 italic">Tidak ada catatan tertulis.</p>
                  )}
                </div>
              </div>

              {/* Action Items List */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Tindak Lanjut / Action Items ({selectedMeeting.action_items.length})
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Rekomendasi tindak lanjut hasil rapat. Anda dapat memilih untuk mengonversinya menjadi Task Kanban atau Issue teknis.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsActionModalOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-medium rounded-lg shadow-xs transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Aksi Manual</span>
                  </button>
                </div>

                {selectedMeeting.action_items.length === 0 ? (
                  <div className="p-5 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    Belum ada action item pada rapat ini.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedMeeting.action_items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="text-xs font-bold text-slate-900">{item.title}</span>
                            {item.status === "CONVERTED" ? (
                              <span className="inline-flex items-center whitespace-nowrap shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✓ Terkonversi: {item.converted_entity_type}
                              </span>
                            ) : (
                              <span className="inline-flex items-center whitespace-nowrap shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                Belum dikonversi
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-slate-600 line-clamp-2">{item.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-0.5">
                            <span>PIC: <strong className="text-slate-700">{item.owner_name || "Belum ditugaskan"}</strong></span>
                            {item.due_date && (
                              <span>Target: {new Date(item.due_date).toLocaleDateString("id-ID")}</span>
                            )}
                          </div>
                        </div>

                        {item.status !== "CONVERTED" && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedActionForConvert(item);
                                setTargetEntity("TASK");
                                setConvertError(null);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
                              title="Konversi menjadi Task di Kanban & Timeline"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Jadikan Task Kanban</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedActionForConvert(item);
                                setTargetEntity("ISSUE");
                                setConvertError(null);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                              title="Konversi menjadi Issue / Kendala Teknis"
                            >
                              <span>Jadikan Issue</span>
                            </button>
                          </div>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hubungkan ke Feature <span className="text-slate-400 font-normal">(opsional)</span>
                  </label>
                  <select
                    value={selectedFeatureId}
                    onChange={(e) => setSelectedFeatureId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    <option value="">-- Tanpa Feature (Umum) --</option>
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

      {/* AI MOM GENERATION MODAL */}
      {isAIGenModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Susun Notulensi Rapat dengan AI (Project MoM)</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Tempelkan catatan mentah atau transkrip meeting. AI akan merumuskan ringkasan formal, daftar hadir, dan rekomendasi action item untuk proyek ini.
                </p>
              </div>
              <button
                type="button"
                disabled={isGeneratingMoM}
                onClick={() => setIsAIGenModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {aiGenError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{aiGenError}</span>
              </div>
            )}

            <form onSubmit={handleGenerateAIMoM} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Catatan Mentah / Transkrip Suara Rapat *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAiRawText(SAMPLE_MEETING_NOTES);
                      if (!aiTitle) setAiTitle("Sprint Review & Handover Diskusi");
                      if (!aiAttendeesRaw) setAiAttendeesRaw("Budi (PM), Siti (Frontend), Joko (Backend), Pak Hartono (Client), Ibu Dina (PIC)");
                    }}
                    className="text-[11px] text-purple-600 hover:text-purple-700 font-medium cursor-pointer"
                  >
                    Gunakan Contoh Catatan
                  </button>
                </div>
                <textarea
                  rows={6}
                  required
                  disabled={isGeneratingMoM}
                  value={aiRawText}
                  onChange={(e) => setAiRawText(e.target.value)}
                  placeholder="Tempel catatan singkat, transkrip rekaman, atau poin-poin diskusi rapat di sini..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-hidden leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Judul Rapat <span className="text-slate-400 font-normal">(opsional)</span>
                  </label>
                  <input
                    type="text"
                    disabled={isGeneratingMoM}
                    value={aiTitle}
                    onChange={(e) => setAiTitle(e.target.value)}
                    placeholder="Otomatis dirumuskan AI jika kosong"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Rapat</label>
                  <select
                    disabled={isGeneratingMoM}
                    value={aiMeetingType}
                    onChange={(e) => setAiMeetingType(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-hidden"
                  >
                    {Object.keys(meetingTypeConfigs).map((k) => (
                      <option key={k} value={k}>
                        {meetingTypeConfigs[k].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Waktu Pelaksanaan Rapat</label>
                  <input
                    type="datetime-local"
                    disabled={isGeneratingMoM}
                    value={aiMeetingDate}
                    onChange={(e) => setAiMeetingDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Peserta Rapat <span className="text-slate-400 font-normal">(opsional)</span>
                  </label>
                  <input
                    type="text"
                    disabled={isGeneratingMoM}
                    value={aiAttendeesRaw}
                    onChange={(e) => setAiAttendeesRaw(e.target.value)}
                    placeholder="Contoh: Budi (PM), Siti (Dev), Klien"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl text-xs text-purple-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Human Approval Gate:</strong> Action items yang dirumuskan AI tidak akan otomatis masuk ke Kanban. Anda dapat mereview dan memilih tombol <em>&quot;Jadikan Task Kanban&quot;</em> atau <em>&quot;Jadikan Issue&quot;</em> kapan pun diperlukan.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isGeneratingMoM}
                  onClick={() => setIsAIGenModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingMoM}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingMoM ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Gemini sedang menyusun notulensi...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-purple-200" />
                      <span>Generate MoM</span>
                    </>
                  )}
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
