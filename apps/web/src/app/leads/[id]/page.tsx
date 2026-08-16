"use client";

import React, { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  History,
  Image as ImageIcon,
  Link2,
  Mail,
  MapPin,
  MessageSquare,
  Paperclip,
  Phone,
  Plus,
  Radio,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
  User,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export interface ClientReference {
  id: string;
  type: "TEXT" | "LINK" | "IMAGE";
  title: string;
  content: string;
}

interface Client {
  id: string;
  name: string;
  company_name: string;
  industry: string | null;
  website: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  notes: string | null;
}

interface LeadDetail {
  id: string;
  name: string;
  company_name: string;
  client_id: string | null;
  owner_id: string;
  status: string;
  client_pic_name: string | null;
  client_pic_email: string | null;
  client_pic_phone: string | null;
  project_type: string | null;
  source: string | null;
  opportunity_description: string | null;
  brief_notes: string | null;
  loss_reason: string | null;
  client_references: ClientReference[] | null;
  converted_project_id: string | null;
  created_at: string;
  updated_at: string;
  client?: Client | null;
  owner?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

const statusConfigs: Record<
  string,
  { label: string; color: string; stepIndex: number; description: string }
> = {
  NEW: {
    label: "Baru (New)",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    stepIndex: 1,
    description: "Lead baru dicatat, siap untuk dihubungi pertama kali.",
  },
  CONTACTED: {
    label: "Dihubungi",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    stepIndex: 2,
    description: "Kontak awal sudah dilakukan, langkah berikutnya jadwalkan brief.",
  },
  BRIEF_SCHEDULED: {
    label: "Brief Terjadwal",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    stepIndex: 3,
    description: "Meeting brief telah dijadwalkan bersama PIC klien.",
  },
  QUALIFIED: {
    label: "Terkualifikasi",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    stepIndex: 4,
    description: "Kebutuhan terverifikasi dan siap dikonversi menjadi proyek resmi.",
  },
  CONVERTED: {
    label: "Terkonversi ke Proyek",
    color: "bg-teal-50 text-teal-700 border-teal-200",
    stepIndex: 5,
    description: "Lead telah resmi menjadi Proyek aktif di tahap Discovery.",
  },
  NOT_QUALIFIED: {
    label: "Tidak Kualifikasi",
    color: "bg-slate-100 text-slate-700 border-slate-200",
    stepIndex: -1,
    description: "Lead ditutup karena tidak sesuai kriteria.",
  },
  LOST: {
    label: "Lost (Batal)",
    color: "bg-rose-50 text-rose-700 border-rose-200",
    stepIndex: -1,
    description: "Lead dibatalkan oleh klien atau memilih solusi lain.",
  },
};

const pipelineSteps = [
  { id: "NEW", label: "1. Baru", shortLabel: "Baru" },
  { id: "CONTACTED", label: "2. Dihubungi", shortLabel: "Kontak" },
  { id: "BRIEF_SCHEDULED", label: "3. Brief Terjadwal", shortLabel: "Brief" },
  { id: "QUALIFIED", label: "4. Terkualifikasi", shortLabel: "Kualifikasi" },
  { id: "CONVERTED", label: "5. Proyek Aktif", shortLabel: "Proyek" },
];

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const leadId = resolvedParams.id;
  const router = useRouter();
  const { token } = useAuth();

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [activeModal, setActiveModal] = useState<
    "CONTACT" | "BRIEF" | "QUALIFY" | "CONVERT" | "LOST" | "ADD_REF" | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form states for Next Action Modals
  // 1. Contact Form
  const [contactDate, setContactDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [contactMedia, setContactMedia] = useState("WhatsApp");
  const [contactNotes, setContactNotes] = useState("");

  // 2. Brief Schedule Form
  const [briefDate, setBriefDate] = useState("");
  const [briefTime, setBriefTime] = useState("10:00");
  const [briefLocation, setBriefLocation] = useState("Google Meet");
  const [briefAgenda, setBriefAgenda] = useState("");

  // 3. Qualification Form
  const [qualifySummary, setQualifySummary] = useState("");

  // 4. Convert Form
  const [projectCode, setProjectCode] = useState("");
  const [projectName, setProjectName] = useState("");
  const [targetCompletionDate, setTargetCompletionDate] = useState("");

  // 5. Lost Form
  const [lossReason, setLossReason] = useState("");

  // 6. Add Reference Form
  const [refType, setRefType] = useState<"TEXT" | "LINK" | "IMAGE">("LINK");
  const [refTitle, setRefTitle] = useState("");
  const [refContent, setRefContent] = useState("");
  const [refImagePreview, setRefImagePreview] = useState<string | null>(null);

  // 7. Custom Note Form in Riwayat
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [customNoteText, setCustomNoteText] = useState("");

  // Lightbox Image Preview
  const [zoomImage, setZoomImage] = useState<{
    url: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    fetchLeadDetail();
  }, [leadId, token]);

  async function fetchLeadDetail() {
    setIsLoading(true);
    setError(null);
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    const res = await apiClient<LeadDetail>(`/leads/${leadId}`, { headers });
    if (res.data) {
      setLead(res.data);
      if (!projectCode) {
        const cleanName = res.data.company_name
          .replace(/^(PT|CV|PT\.)\s+/i, "")
          .substring(0, 4)
          .toUpperCase()
          .replace(/[^A-Z]/g, "PRJ");
        setProjectCode(`${cleanName || "PRJ"}-${new Date().getFullYear()}`);
      }
      if (!projectName) {
        setProjectName(res.data.name);
      }
    } else {
      setError(res.error || "Lead tidak ditemukan.");
    }
    setIsLoading(false);
  }

  // Parse structured data filled across each pipeline stage from brief_notes
  const stageData = useMemo(() => {
    const data: {
      contact?: { date: string; media: string; notes: string };
      brief?: { date: string; time: string; location: string; agenda: string };
      qualify?: { summary: string };
      customNotes: Array<{ title: string; content: string }>;
    } = {
      customNotes: [],
    };

    if (!lead?.brief_notes) return data;

    const blocks = lead.brief_notes
      .split(/\n\n+/)
      .map((b) => b.trim())
      .filter(Boolean);

    for (const block of blocks) {
      if (block.startsWith("[Kontak")) {
        const headerEnd = block.indexOf("]");
        const header = block.substring(1, headerEnd); // e.g. "Kontak 2026-08-16 via WhatsApp"
        const content = block.substring(headerEnd + 1).trim();

        const match = header.match(/Kontak\s+(.*?)\s+via\s+(.*)/i);
        data.contact = {
          date: match ? match[1] : "",
          media: match ? match[2] : "Komunikasi Langsung",
          notes: content,
        };
      } else if (block.startsWith("[Jadwal Brief")) {
        const headerEnd = block.indexOf("]");
        const header = block.substring(1, headerEnd); // e.g. "Jadwal Brief: 2026-08-20 pukul 10:00 WIB"
        const content = block.substring(headerEnd + 1).trim();

        const match = header.match(/Jadwal Brief:\s*(.*?)\s*pukul\s*(.*?)(?:\s*WIB)?$/i);
        const locationMatch = content.match(/Lokasi\/Tautan:\s*(.*?)(?:\n|$)/i);
        const agendaMatch = content.match(/Agenda:\s*([\s\S]*)$/i);

        data.brief = {
          date: match ? match[1] : "",
          time: match ? match[2] : "",
          location: locationMatch ? locationMatch[1].trim() : content,
          agenda: agendaMatch ? agendaMatch[1].trim() : "",
        };
      } else if (block.startsWith("[Hasil Kualifikasi")) {
        const headerEnd = block.indexOf("]");
        const content = block.substring(headerEnd + 1).trim();
        data.qualify = {
          summary: content,
        };
      } else if (block.startsWith("[Catatan")) {
        const headerEnd = block.indexOf("]");
        const header = block.substring(1, headerEnd);
        const content = block.substring(headerEnd + 1).trim();
        data.customNotes.push({
          title: header,
          content,
        });
      } else {
        data.customNotes.push({
          title: "Catatan Presales",
          content: block,
        });
      }
    }

    return data;
  }, [lead?.brief_notes]);

  // Step 1: Log Initial Contact (NEW -> CONTACTED)
  async function handleSubmitContact(e: React.FormEvent) {
    e.preventDefault();
    if (!lead) return;
    setIsSubmitting(true);
    setModalError(null);
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    const contactEntry = `[Kontak ${contactDate} via ${contactMedia}]\n${contactNotes}`;
    const updatedBrief = lead.brief_notes
      ? `${lead.brief_notes}\n\n${contactEntry}`
      : contactEntry;

    try {
      const statusRes = await apiClient<LeadDetail>(`/leads/${lead.id}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({ target_status: "CONTACTED" }),
      });

      if (!statusRes.data) {
        setModalError(statusRes.error || "Gagal memperbarui status.");
        setIsSubmitting(false);
        return;
      }

      await apiClient<LeadDetail>(`/leads/${lead.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ brief_notes: updatedBrief }),
      });

      setActiveModal(null);
      setContactNotes("");
      fetchLeadDetail();
    } catch {
      setModalError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Step 2: Schedule Discovery Brief (CONTACTED -> BRIEF_SCHEDULED)
  async function handleSubmitBriefSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!lead) return;
    setIsSubmitting(true);
    setModalError(null);
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    const scheduleEntry = `[Jadwal Brief: ${briefDate} pukul ${briefTime} WIB]\nLokasi/Tautan: ${briefLocation}${
      briefAgenda ? `\nAgenda: ${briefAgenda}` : ""
    }`;
    const updatedBrief = lead.brief_notes
      ? `${lead.brief_notes}\n\n${scheduleEntry}`
      : scheduleEntry;

    try {
      const statusRes = await apiClient<LeadDetail>(`/leads/${lead.id}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({ target_status: "BRIEF_SCHEDULED" }),
      });

      if (!statusRes.data) {
        setModalError(statusRes.error || "Gagal memperbarui status.");
        setIsSubmitting(false);
        return;
      }

      await apiClient<LeadDetail>(`/leads/${lead.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ brief_notes: updatedBrief }),
      });

      setActiveModal(null);
      setBriefAgenda("");
      fetchLeadDetail();
    } catch {
      setModalError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Step 3: Qualify Lead (BRIEF_SCHEDULED -> QUALIFIED)
  async function handleSubmitQualify(e: React.FormEvent) {
    e.preventDefault();
    if (!lead) return;
    setIsSubmitting(true);
    setModalError(null);
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    const qualifyEntry = `[Hasil Kualifikasi Scope]\n${qualifySummary}`;
    const updatedBrief = lead.brief_notes
      ? `${lead.brief_notes}\n\n${qualifyEntry}`
      : qualifyEntry;

    try {
      const statusRes = await apiClient<LeadDetail>(`/leads/${lead.id}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({ target_status: "QUALIFIED" }),
      });

      if (!statusRes.data) {
        setModalError(statusRes.error || "Gagal memperbarui status.");
        setIsSubmitting(false);
        return;
      }

      await apiClient<LeadDetail>(`/leads/${lead.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ brief_notes: updatedBrief }),
      });

      setActiveModal(null);
      setQualifySummary("");
      fetchLeadDetail();
    } catch {
      setModalError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Step 4: Convert to Project
  async function handleSubmitConvert(e: React.FormEvent) {
    e.preventDefault();
    if (!lead) return;
    setIsSubmitting(true);
    setModalError(null);
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    try {
      const res = await apiClient<{ id: string; code: string; name: string }>(
        `/leads/${lead.id}/convert`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            project_code: projectCode.trim().toUpperCase(),
            project_name: projectName.trim(),
            target_completion_date: targetCompletionDate || null,
          }),
        }
      );

      if (res.data) {
        setActiveModal(null);
        router.push(`/projects/${res.data.id}`);
      } else {
        setModalError(res.error || "Gagal mengonversi lead ke proyek.");
      }
    } catch {
      setModalError("Terjadi kesalahan saat konversi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Step 5: Mark as Lost
  async function handleSubmitLost(e: React.FormEvent) {
    e.preventDefault();
    if (!lead) return;
    setIsSubmitting(true);
    setModalError(null);
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    try {
      const res = await apiClient<LeadDetail>(`/leads/${lead.id}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          target_status: "LOST",
          loss_reason: lossReason.trim() || null,
        }),
      });

      if (res.data) {
        setActiveModal(null);
        setLossReason("");
        fetchLeadDetail();
      } else {
        setModalError(res.error || "Gagal membatalkan lead.");
      }
    } catch {
      setModalError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Step 6: Add Reference
  async function handleAddReference(e: React.FormEvent) {
    e.preventDefault();
    if (!lead || !refTitle.trim()) return;
    const contentToSave =
      refType === "IMAGE" ? refImagePreview || "" : refContent.trim();
    if (!contentToSave) return;

    setIsSubmitting(true);
    setModalError(null);
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    const newRef: ClientReference = {
      id: "ref-" + Date.now(),
      type: refType,
      title: refTitle.trim(),
      content: contentToSave,
    };

    const currentRefs = lead.client_references || [];
    const updatedRefs = [...currentRefs, newRef];

    try {
      const res = await apiClient<LeadDetail>(`/leads/${lead.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ client_references: updatedRefs }),
      });

      if (res.data) {
        setActiveModal(null);
        setRefTitle("");
        setRefContent("");
        setRefImagePreview(null);
        fetchLeadDetail();
      } else {
        setModalError(res.error || "Gagal menyimpan referensi.");
      }
    } catch {
      setModalError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Step 7: Add Custom History Note
  async function handleAddCustomNote(e: React.FormEvent) {
    e.preventDefault();
    if (!lead || !customNoteText.trim()) return;
    setIsSubmitting(true);

    const nowStr = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const entry = `[Catatan ${nowStr}]\n${customNoteText.trim()}`;
    const updatedBrief = lead.brief_notes
      ? `${lead.brief_notes}\n\n${entry}`
      : entry;

    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    try {
      const res = await apiClient<LeadDetail>(`/leads/${lead.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ brief_notes: updatedBrief }),
      });

      if (res.data) {
        setIsAddingNote(false);
        setCustomNoteText("");
        fetchLeadDetail();
      }
    } catch {
      alert("Gagal menambahkan catatan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Delete Reference
  async function handleDeleteReference(refId: string) {
    if (!lead) return;
    const currentRefs = lead.client_references || [];
    const updatedRefs = currentRefs.filter((r) => r.id !== refId);

    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    const res = await apiClient<LeadDetail>(`/leads/${lead.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ client_references: updatedRefs }),
    });

    if (res.data) {
      fetchLeadDetail();
    }
  }

  function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("Ukuran gambar maksimal 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setRefImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center text-slate-500 text-sm">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-sky-600 rounded-full animate-spin mx-auto mb-3" />
        Memuat detail lead...
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg">Lead Tidak Ditemukan</h3>
          <p className="text-xs text-slate-500">{error || "Data tidak ditemukan."}</p>
          <Link
            href="/leads"
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg text-xs font-semibold hover:bg-sky-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar Leads</span>
          </Link>
        </div>
      </div>
    );
  }

  const currentConfig = statusConfigs[lead.status] || {
    label: lead.status,
    color: "bg-slate-100 text-slate-700 border-slate-200",
    stepIndex: 1,
    description: "",
  };

  const isConverted = lead.status === "CONVERTED";
  const isTerminal = ["CONVERTED", "NOT_QUALIFIED", "LOST"].includes(lead.status);
  const currentStepNum = currentConfig.stepIndex;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top Breadcrumb & Nav */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link
            href="/leads"
            className="hover:text-slate-800 font-medium inline-flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Leads Pipeline</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="font-semibold text-slate-900 truncate max-w-xs sm:max-w-md">
            {lead.name}
          </span>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${currentConfig.color}`}
          >
            {currentConfig.label}
          </span>
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-sky-600 tracking-wide uppercase">
              {lead.project_type || "Peluang Proyek"}
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {lead.name}
            </h1>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-medium">{lead.company_name}</span>
            </div>
          </div>

          {/* Primary Action Button according to current step */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {lead.status === "NEW" && (
              <button
                type="button"
                onClick={() => setActiveModal("CONTACT")}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>Catat Kontak Pertama</span>
              </button>
            )}

            {lead.status === "CONTACTED" && (
              <button
                type="button"
                onClick={() => setActiveModal("BRIEF")}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                <Calendar className="w-4 h-4" />
                <span>Jadwalkan Discovery Brief</span>
              </button>
            )}

            {lead.status === "BRIEF_SCHEDULED" && (
              <button
                type="button"
                onClick={() => setActiveModal("QUALIFY")}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Kualifikasi Scope Kebutuhan</span>
              </button>
            )}

            {lead.status === "QUALIFIED" && (
              <button
                type="button"
                onClick={() => setActiveModal("CONVERT")}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Konversi ke Proyek Resmi</span>
              </button>
            )}

            {isConverted && lead.converted_project_id && (
              <Link
                href={`/projects/${lead.converted_project_id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                <span>Buka Workspace Proyek</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            {!isTerminal && (
              <button
                type="button"
                onClick={() => setActiveModal("LOST")}
                className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-colors"
              >
                Tandai Batal / Lost
              </button>
            )}
          </div>
        </div>

        {/* Visual Pipeline Stepper */}
        {!["NOT_QUALIFIED", "LOST"].includes(lead.status) && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {pipelineSteps.map((step, idx) => {
                const stepNum = idx + 1;
                const isPassed = currentStepNum > stepNum;
                const isCurrent = currentStepNum === stepNum;

                return (
                  <div
                    key={step.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isCurrent
                        ? "bg-sky-50/80 border-sky-300 ring-2 ring-sky-500/20"
                        : isPassed
                        ? "bg-emerald-50/40 border-emerald-200 text-slate-700"
                        : "bg-slate-50/60 border-slate-200 text-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Tahap {stepNum}
                      </span>
                      {isPassed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : isCurrent ? (
                        <div className="w-2 h-2 rounded-full bg-sky-600 animate-pulse" />
                      ) : null}
                    </div>
                    <span
                      className={`text-xs font-bold block ${
                        isCurrent
                          ? "text-sky-900"
                          : isPassed
                          ? "text-slate-800"
                          : "text-slate-400"
                      }`}
                    >
                      {step.shortLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Grid Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (Main Workspace - 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Referensi dari Klien */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Referensi dari Klien ({lead.client_references?.length || 0})
                </h2>
              </div>
              {!isTerminal && (
                <button
                  type="button"
                  onClick={() => setActiveModal("ADD_REF")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg border border-sky-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Referensi</span>
                </button>
              )}
            </div>

            {lead.client_references && lead.client_references.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {lead.client_references.map((ref) => (
                  <div
                    key={ref.id}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between gap-3 min-w-0 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {ref.type === "LINK" ? (
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                            <Link2 className="w-3.5 h-3.5" />
                          </div>
                        ) : ref.type === "IMAGE" ? (
                          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span className="font-semibold text-xs text-slate-800 truncate">
                          {ref.title}
                        </span>
                      </div>

                      {!isTerminal && (
                        <button
                          type="button"
                          onClick={() => handleDeleteReference(ref.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors shrink-0"
                          title="Hapus referensi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Content Preview */}
                    {ref.type === "IMAGE" && (
                      <div className="w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ref.content}
                          alt={ref.title}
                          onClick={() =>
                            setZoomImage({ url: ref.content, title: ref.title })
                          }
                          className="w-full h-36 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Klik gambar untuk memperbesar
                        </span>
                      </div>
                    )}

                    {ref.type === "LINK" && (
                      <div className="w-full min-w-0">
                        <a
                          href={ref.content}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 font-medium bg-white px-3 py-2 rounded-lg border border-slate-200 hover:border-sky-300 w-full min-w-0 transition-colors shadow-2xs group"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0 text-sky-500 group-hover:text-sky-600" />
                          <span className="truncate flex-1 min-w-0">{ref.content}</span>
                        </a>
                      </div>
                    )}

                    {ref.type === "TEXT" && (
                      <div className="w-full bg-white p-3 rounded-lg border border-slate-200">
                        <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed break-words">
                          {ref.content}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Paperclip className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">
                  Belum ada referensi (link, teks, atau gambar) dari klien.
                </p>
              </div>
            )}
          </div>

          {/* Section 2: RIWAYAT ALUR PROSES (Sequential Pipeline History & Completed Form Inputs) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-sky-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    Riwayat Alur Proses
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  Perjalanan alur lead beserta data dan form input yang telah diisi pada tiap tahapan.
                </p>
              </div>

              {!isTerminal && (
                <button
                  type="button"
                  onClick={() => setIsAddingNote(!isAddingNote)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg border border-sky-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Catatan Tambahan</span>
                </button>
              )}
            </div>

            {/* Quick Add Custom Note Form */}
            {isAddingNote && (
              <form
                onSubmit={handleAddCustomNote}
                className="p-4 bg-sky-50/60 rounded-xl border border-sky-200 space-y-2.5"
              >
                <span className="text-xs font-semibold text-slate-800 block">
                  Tulis Catatan Riwayat Tambahan
                </span>
                <textarea
                  rows={2}
                  required
                  value={customNoteText}
                  onChange={(e) => setCustomNoteText(e.target.value)}
                  placeholder="Tulis catatan follow-up, tanggapan klien, atau hasil diskusi internal..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNote(false);
                      setCustomNoteText("");
                    }}
                    className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!customNoteText.trim() || isSubmitting}
                    className="px-3 py-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
                  >
                    {isSubmitting ? "Menyimpan..." : "Simpan Catatan"}
                  </button>
                </div>
              </form>
            )}

            {/* Sequential History Cards Container */}
            <div className="space-y-4">
              {/* TAHAP 1: LEAD BARU (NEW) */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                      1
                    </span>
                    <span className="font-bold text-sm text-slate-900">
                      Pencatatan Lead Baru
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Selesai</span>
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">
                      Tanggal Dibuat
                    </span>
                    <span className="font-semibold text-slate-800">
                      {new Date(lead.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">
                      Sumber Lead
                    </span>
                    <span className="font-semibold text-slate-800">
                      {lead.source || "Tidak disebutkan"}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block text-[11px] font-medium mb-0.5">
                      Deskripsi Peluang Awal
                    </span>
                    <p className="text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
                      {lead.opportunity_description || "Tidak ada deskripsi awal."}
                    </p>
                  </div>
                </div>
              </div>

              {/* TAHAP 2: KONTAK PERTAMA KLIEN (CONTACTED) */}
              <div
                className={`p-4 rounded-xl border transition-all space-y-3 ${
                  currentStepNum >= 2
                    ? "border-emerald-200 bg-emerald-50/20"
                    : currentStepNum === 1
                    ? "border-sky-300 bg-sky-50/30 ring-1 ring-sky-400/30"
                    : "border-slate-200 bg-slate-50/50 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center ${
                        currentStepNum >= 2
                          ? "bg-emerald-600 text-white"
                          : currentStepNum === 1
                          ? "bg-sky-600 text-white"
                          : "bg-slate-300 text-slate-700"
                      }`}
                    >
                      2
                    </span>
                    <span className="font-bold text-sm text-slate-900">
                      Kontak Pertama Klien
                    </span>
                  </div>

                  {currentStepNum >= 2 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Selesai</span>
                    </span>
                  ) : currentStepNum === 1 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-100 px-2.5 py-0.5 rounded-full animate-pulse">
                      <Clock className="w-3 h-3" />
                      <span>Tahap Saat Ini</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium">
                      Belum Dimulai
                    </span>
                  )}
                </div>

                {stageData.contact ? (
                  <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 space-y-2.5 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-b border-slate-100 pb-2">
                      <div>
                        <span className="text-slate-400 block text-[11px] font-medium">
                          Tanggal Kontak
                        </span>
                        <span className="font-semibold text-slate-800">
                          {stageData.contact.date || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px] font-medium">
                          Media Komunikasi
                        </span>
                        <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block">
                          {stageData.contact.media}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] font-medium mb-1">
                        Catatan Hasil Percakapan
                      </span>
                      <p className="text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
                        {stageData.contact.notes}
                      </p>
                    </div>
                  </div>
                ) : currentStepNum === 1 ? (
                  <div className="p-3 bg-white rounded-lg border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-slate-600">
                      Belum ada catatan kontak. Lakukan kontak awal dengan klien dan catat hasilnya.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveModal("CONTACT")}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-lg transition-colors shrink-0"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Catat Kontak Sekarang</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Tahap kontak awal belum dilakukan.
                  </p>
                )}
              </div>

              {/* TAHAP 3: DISCOVERY BRIEF TERJADWAL (BRIEF_SCHEDULED) */}
              <div
                className={`p-4 rounded-xl border transition-all space-y-3 ${
                  currentStepNum >= 3
                    ? "border-emerald-200 bg-emerald-50/20"
                    : currentStepNum === 2
                    ? "border-purple-300 bg-purple-50/30 ring-1 ring-purple-400/30"
                    : "border-slate-200 bg-slate-50/50 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center ${
                        currentStepNum >= 3
                          ? "bg-emerald-600 text-white"
                          : currentStepNum === 2
                          ? "bg-purple-600 text-white"
                          : "bg-slate-300 text-slate-700"
                      }`}
                    >
                      3
                    </span>
                    <span className="font-bold text-sm text-slate-900">
                      Pertemuan Discovery Brief
                    </span>
                  </div>

                  {currentStepNum >= 3 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{currentStepNum === 3 ? "Terjadwal" : "Selesai"}</span>
                    </span>
                  ) : currentStepNum === 2 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full animate-pulse">
                      <Clock className="w-3 h-3" />
                      <span>Tahap Saat Ini</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium">
                      Belum Dimulai
                    </span>
                  )}
                </div>

                {stageData.brief ? (
                  <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 space-y-2.5 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-b border-slate-100 pb-2">
                      <div>
                        <span className="text-slate-400 block text-[11px] font-medium">
                          Waktu Meeting
                        </span>
                        <span className="font-semibold text-slate-800">
                          {stageData.brief.date} {stageData.brief.time && `pukul ${stageData.brief.time} WIB`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px] font-medium">
                          Lokasi / Tautan Meeting
                        </span>
                        {stageData.brief.location.startsWith("http") ? (
                          <a
                            href={stageData.brief.location}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-sky-600 hover:underline inline-flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate">{stageData.brief.location}</span>
                          </a>
                        ) : (
                          <span className="font-semibold text-slate-800">
                            {stageData.brief.location}
                          </span>
                        )}
                      </div>
                    </div>

                    {stageData.brief.agenda && (
                      <div>
                        <span className="text-slate-400 block text-[11px] font-medium mb-1">
                          Agenda / Catatan Persiapan
                        </span>
                        <p className="text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
                          {stageData.brief.agenda}
                        </p>
                      </div>
                    )}
                  </div>
                ) : currentStepNum === 2 ? (
                  <div className="p-3 bg-white rounded-lg border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-slate-600">
                      Kontak awal telah selesai. Jadwalkan discovery brief bersama PIC klien.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveModal("BRIEF")}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg transition-colors shrink-0"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Jadwalkan Brief Sekarang</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Jadwal discovery brief belum diatur.
                  </p>
                )}
              </div>

              {/* TAHAP 4: KUALIFIKASI SCOPE (QUALIFIED) */}
              <div
                className={`p-4 rounded-xl border transition-all space-y-3 ${
                  currentStepNum >= 4
                    ? "border-emerald-200 bg-emerald-50/20"
                    : currentStepNum === 3
                    ? "border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-400/30"
                    : "border-slate-200 bg-slate-50/50 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center ${
                        currentStepNum >= 4
                          ? "bg-emerald-600 text-white"
                          : currentStepNum === 3
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-300 text-slate-700"
                      }`}
                    >
                      4
                    </span>
                    <span className="font-bold text-sm text-slate-900">
                      Kualifikasi Scope Kebutuhan
                    </span>
                  </div>

                  {currentStepNum >= 4 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Selesai Terkualifikasi</span>
                    </span>
                  ) : currentStepNum === 3 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full animate-pulse">
                      <Clock className="w-3 h-3" />
                      <span>Tahap Saat Ini</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium">
                      Belum Dimulai
                    </span>
                  )}
                </div>

                {stageData.qualify ? (
                  <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 space-y-1.5 text-xs">
                    <span className="text-slate-400 block text-[11px] font-medium">
                      Ringkasan Kesiapan & Scope Teknis yang Disepakati
                    </span>
                    <p className="text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
                      {stageData.qualify.summary}
                    </p>
                  </div>
                ) : currentStepNum === 3 ? (
                  <div className="p-3 bg-white rounded-lg border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-slate-600">
                      Meeting brief selesai? Masukkan hasil kualifikasi kebutuhan untuk menyelesaikan tahap presales.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveModal("QUALIFY")}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors shrink-0"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Kualifikasi Scope Sekarang</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Kualifikasi scope belum dilakukan.
                  </p>
                )}
              </div>

              {/* TAHAP 5: KONVERSI KE PROYEK RESMI (CONVERTED) */}
              <div
                className={`p-4 rounded-xl border transition-all space-y-3 ${
                  isConverted
                    ? "border-teal-300 bg-teal-50/30"
                    : currentStepNum === 4
                    ? "border-teal-300 bg-teal-50/20 ring-1 ring-teal-400/30"
                    : "border-slate-200 bg-slate-50/50 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center ${
                        isConverted
                          ? "bg-teal-600 text-white"
                          : currentStepNum === 4
                          ? "bg-teal-600 text-white"
                          : "bg-slate-300 text-slate-700"
                      }`}
                    >
                      5
                    </span>
                    <span className="font-bold text-sm text-slate-900">
                      Konversi ke Proyek Resmi
                    </span>
                  </div>

                  {isConverted ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-100 px-2.5 py-0.5 rounded-full">
                      <Sparkles className="w-3 h-3" />
                      <span>Proyek Aktif</span>
                    </span>
                  ) : currentStepNum === 4 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-100 px-2.5 py-0.5 rounded-full animate-pulse">
                      <Clock className="w-3 h-3" />
                      <span>Siap Konversi</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium">
                      Belum Dimulai
                    </span>
                  )}
                </div>

                {isConverted && lead.converted_project_id ? (
                  <div className="bg-white p-3.5 rounded-lg border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] font-medium">
                        Workspace Proyek Resmi
                      </span>
                      <span className="font-bold text-slate-900">
                        {lead.name}
                      </span>
                    </div>
                    <Link
                      href={`/projects/${lead.converted_project_id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-2xs shrink-0"
                    >
                      <span>Buka Workspace Proyek</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : currentStepNum === 4 ? (
                  <div className="p-3 bg-white rounded-lg border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-slate-600">
                      Lead sudah terkualifikasi. Konversi sekarang untuk membuat workspace proyek baru di tahap Discovery.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveModal("CONVERT")}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg transition-colors shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Konversi ke Proyek Sekarang</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Menunggu kualifikasi selesai sebelum dapat dikonversi menjadi proyek resmi.
                  </p>
                )}
              </div>

              {/* JIKA LOST/BATAL */}
              {lead.status === "LOST" && (
                <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/50 space-y-2">
                  <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                    <XCircle className="w-4 h-4" />
                    <span>Lead Dibatalkan (Lost)</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-rose-200 text-xs text-rose-900 space-y-1">
                    <span className="font-semibold text-slate-500 block text-[11px]">
                      Alasan Pembatalan:
                    </span>
                    <p>{lead.loss_reason || "Tidak ada alasan pembatalan tertulis."}</p>
                  </div>
                </div>
              )}

              {/* SECTION CATATAN TAMBAHAN (Jika ada custom notes) */}
              {stageData.customNotes.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-2.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                    Catatan Tambahan Presales ({stageData.customNotes.length})
                  </span>
                  <div className="space-y-2">
                    {stageData.customNotes.map((cn, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1"
                      >
                        <span className="font-bold text-slate-800 block">
                          {cn.title}
                        </span>
                        <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                          {cn.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Sidebar Information - 1 col) */}
        <div className="space-y-6">
          {/* Client & PIC Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
              Informasi Klien & PIC
            </h3>

            <div className="space-y-3">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">
                  Perusahaan Klien
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {lead.company_name}
                </span>
                {lead.client?.industry && (
                  <span className="text-xs text-slate-500 block">
                    {lead.client.industry}
                  </span>
                )}
              </div>

              {lead.client?.website && (
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">
                    Website
                  </span>
                  <a
                    href={
                      lead.client.website.startsWith("http")
                        ? lead.client.website
                        : `https://${lead.client.website}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-sky-600 hover:underline inline-flex items-center gap-1"
                  >
                    <Globe className="w-3 h-3" />
                    <span>{lead.client.website}</span>
                  </a>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-xs font-semibold text-slate-800 block">
                  Kontak PIC
                </span>
                {lead.client_pic_name && (
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium">{lead.client_pic_name}</span>
                  </div>
                )}
                {lead.client_pic_email && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a
                      href={`mailto:${lead.client_pic_email}`}
                      className="hover:text-sky-600 truncate"
                    >
                      {lead.client_pic_email}
                    </a>
                  </div>
                )}
                {lead.client_pic_phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a
                      href={`https://wa.me/${lead.client_pic_phone.replace(
                        /[^0-9]/g,
                        ""
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-emerald-600 truncate font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                    >
                      {lead.client_pic_phone} (Chat WA)
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lead Metadata Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
              Metadata Peluang
            </h3>

            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Sumber Peluang:</span>
              <span className="font-semibold text-slate-800">
                {lead.source || "-"}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Penanggung Jawab (PM):</span>
              <span className="font-semibold text-slate-800">
                {lead.owner?.full_name || "Antigravity PM"}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Tanggal Dibuat:</span>
              <span className="font-semibold text-slate-800">
                {new Date(lead.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-400">Terakhir Diperbarui:</span>
              <span className="font-semibold text-slate-800">
                {new Date(lead.updated_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ACTION MODALS */}
      {/* ========================================================================= */}

      {/* Modal 1: Catat Kontak Pertama */}
      {activeModal === "CONTACT" && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  Catat Kontak Klien
                </h3>
                <p className="text-xs text-slate-500">
                  Perbarui status lead menjadi <strong>Dihubungi (CONTACTED)</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmitContact} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Kontak *
                  </label>
                  <input
                    type="date"
                    required
                    value={contactDate}
                    onChange={(e) => setContactDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Media Komunikasi *
                  </label>
                  <select
                    value={contactMedia}
                    onChange={(e) => setContactMedia(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Telepon Langsung">Telepon Langsung</option>
                    <option value="Email">Email</option>
                    <option value="Meeting Tatap Muka">Meeting Tatap Muka</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Hasil Percakapan *
                </label>
                <textarea
                  rows={3}
                  required
                  value={contactNotes}
                  onChange={(e) => setContactNotes(e.target.value)}
                  placeholder="Contoh: Sudah telp PIC Budi Santoso, klien tertarik dan minta dijadwalkan discovery brief minggu ini..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !contactNotes.trim()}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan & Tandai Dihubungi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Jadwalkan Brief */}
      {activeModal === "BRIEF" && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  Jadwalkan Discovery Brief
                </h3>
                <p className="text-xs text-slate-500">
                  Atur jadwal meeting bersama klien untuk pengumpulan kebutuhan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmitBriefSchedule} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Meeting *
                  </label>
                  <input
                    type="date"
                    required
                    value={briefDate}
                    onChange={(e) => setBriefDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jam (WIB) *
                  </label>
                  <input
                    type="time"
                    required
                    value={briefTime}
                    onChange={(e) => setBriefTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lokasi / Tautan Meeting *
                </label>
                <input
                  type="text"
                  required
                  value={briefLocation}
                  onChange={(e) => setBriefLocation(e.target.value)}
                  placeholder="Google Meet / Zoom URL / Kantor Klien Lt. 5"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Agenda / Catatan Persiapan
                </label>
                <textarea
                  rows={2}
                  value={briefAgenda}
                  onChange={(e) => setBriefAgenda(e.target.value)}
                  placeholder="Kebutuhan arsitektur, demo flow, atau kuesioner awal..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !briefDate || !briefLocation}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Jadwal Brief"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Kualifikasi Scope */}
      {activeModal === "QUALIFY" && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  Kualifikasi Scope Kebutuhan Proyek
                </h3>
                <p className="text-xs text-slate-500">
                  Tandai lead sebagai <strong>Terkualifikasi (QUALIFIED)</strong> dan siap dikonversi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmitQualify} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ringkasan Kesiapan & Scope Teknis *
                </label>
                <textarea
                  rows={4}
                  required
                  value={qualifySummary}
                  onChange={(e) => setQualifySummary(e.target.value)}
                  placeholder="Contoh: Scope disepakati 6 modul utama, timeline delivery 3 bulan, resource tim tersedia 4 backend + 3 frontend + 1 QA..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !qualifySummary.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors"
                >
                  {isSubmitting ? "Menyimpan..." : "Tandai Terkualifikasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Konversi ke Proyek */}
      {activeModal === "CONVERT" && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-1.5">
                  <Sparkles className="w-5 h-5 text-teal-600" />
                  Konversi Lead ke Proyek
                </h3>
                <p className="text-xs text-slate-500">
                  Sistem akan membuat workspace proyek resmi di tahap Discovery.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmitConvert} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode Proyek (Project Code) *
                </label>
                <input
                  type="text"
                  required
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
                  placeholder="PRJ-2026"
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Proyek Resmi *
                </label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Tanggal Selesai (Opsional)
                </label>
                <input
                  type="date"
                  value={targetCompletionDate}
                  onChange={(e) => setTargetCompletionDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !projectCode || !projectName}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors"
                >
                  {isSubmitting ? "Memproses..." : "Konversi & Buka Proyek"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Mark as Lost */}
      {activeModal === "LOST" && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg text-rose-600">
                  Batalkan Lead (Lost)
                </h3>
                <p className="text-xs text-slate-500">
                  Lead akan ditandai batal dan diarsipkan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmitLost} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Pembatalan / Kehilangan Lead *
                </label>
                <textarea
                  rows={3}
                  required
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value)}
                  placeholder="Contoh: Klien menunda inisiatif ke tahun depan / Memilih vendor lain..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !lossReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors"
                >
                  {isSubmitting ? "Menyimpan..." : "Konfirmasi Batal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 6: Tambah Referensi Baru */}
      {activeModal === "ADD_REF" && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  Tambah Referensi Klien
                </h3>
                <p className="text-xs text-slate-500">
                  Lampirkan link acuan, catatan spesifikasi, atau gambar screenshot.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddReference} className="space-y-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setRefType("LINK");
                    setRefImagePreview(null);
                  }}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    refType === "LINK"
                      ? "bg-sky-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  🔗 Tautan URL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRefType("TEXT");
                    setRefImagePreview(null);
                  }}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    refType === "TEXT"
                      ? "bg-sky-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  📝 Catatan Teks
                </button>
                <button
                  type="button"
                  onClick={() => setRefType("IMAGE")}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    refType === "IMAGE"
                      ? "bg-sky-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  🖼️ Upload Gambar
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Referensi *
                </label>
                <input
                  type="text"
                  required
                  value={refTitle}
                  onChange={(e) => setRefTitle(e.target.value)}
                  placeholder="Contoh: Figma Wireframe v1 / Contoh Web Acuan"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              {refType === "LINK" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    URL Tautan *
                  </label>
                  <input
                    type="url"
                    required
                    value={refContent}
                    onChange={(e) => setRefContent(e.target.value)}
                    placeholder="https://figma.com/... atau https://contoh-web.com"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              )}

              {refType === "TEXT" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Isi Catatan / Spesifikasi *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={refContent}
                    onChange={(e) => setRefContent(e.target.value)}
                    placeholder="Catatan detail spesifikasi atau acuan teknis dari klien..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              )}

              {refType === "IMAGE" && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih File Gambar (Maks 3MB) *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                  />
                  {refImagePreview && (
                    <div className="relative inline-block mt-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={refImagePreview}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg border border-slate-200 shadow-2xs"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !refTitle.trim() ||
                    (refType === "IMAGE" ? !refImagePreview : !refContent.trim())
                  }
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Referensi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Image Preview Modal */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-800 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900 truncate">
                {zoomImage.title}
              </span>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-auto flex items-center justify-center max-h-[75vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={zoomImage.url}
                alt={zoomImage.title}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
