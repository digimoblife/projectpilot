"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  Mail,
  Phone,
  Plus,
  Search,
  Sparkles,
  Tag,
  User,
  Users,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface Lead {
  id: string;
  name: string;
  company_name: string;
  status: string;
  client_pic_name: string | null;
  client_pic_email: string | null;
  client_pic_phone: string | null;
  project_type: string | null;
  source: string | null;
  opportunity_description: string | null;
  estimated_budget_note: string | null;
  loss_reason: string | null;
  brief_notes: string | null;
  converted_project_id: string | null;
  created_at: string;
}

const statusConfigs: Record<string, { label: string; color: string; badge: string }> = {
  NEW: { label: "Baru (New)", color: "bg-blue-50 text-blue-700 border-blue-200", badge: "bg-blue-500" },
  CONTACTED: { label: "Dihubungi", color: "bg-indigo-50 text-indigo-700 border-indigo-200", badge: "bg-indigo-500" },
  BRIEF_SCHEDULED: { label: "Brief Terjadwal", color: "bg-purple-50 text-purple-700 border-purple-200", badge: "bg-purple-500" },
  QUALIFIED: { label: "Terkualifikasi", color: "bg-emerald-50 text-emerald-700 border-emerald-200", badge: "bg-emerald-500" },
  NOT_QUALIFIED: { label: "Tidak Kualifikasi", color: "bg-slate-100 text-slate-700 border-slate-200", badge: "bg-slate-400" },
  CONVERTED: { label: "Terkonversi", color: "bg-teal-50 text-teal-700 border-teal-200", badge: "bg-teal-500" },
  LOST: { label: "Lost (Batal)", color: "bg-rose-50 text-rose-700 border-rose-200", badge: "bg-rose-500" },
};

export default function LeadsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Create Lead Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [picName, setPicName] = useState("");
  const [picEmail, setPicEmail] = useState("");
  const [picPhone, setPicPhone] = useState("");
  const [projectType, setProjectType] = useState("Web & Mobile Application");
  const [source, setSource] = useState("Direct Inbound");
  const [description, setDescription] = useState("");
  const [briefNotes, setBriefNotes] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status & Convert Modal
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [lossReason, setLossReason] = useState("");
  const [statusError, setStatusError] = useState<string | null>(null);

  // Conversion Form
  const [projectCode, setProjectCode] = useState("");
  const [projectName, setProjectName] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [convertError, setConvertError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
  }, [token]);

  async function fetchLeads() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await apiClient<Lead[]>("/leads", { headers });
    if (res.data) {
      setLeads(res.data);
    }
    setIsLoading(false);
  }

  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Lead>("/leads", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name,
          company_name: companyName,
          client_pic_name: picName || null,
          client_pic_email: picEmail || null,
          client_pic_phone: picPhone || null,
          project_type: projectType,
          source: source,
          opportunity_description: description || null,
          brief_notes: briefNotes || null,
        }),
      });

      if (res.data) {
        setIsCreateModalOpen(false);
        resetCreateForm();
        fetchLeads();
      } else {
        setCreateError(res.error || "Gagal membuat lead.");
      }
    } catch {
      setCreateError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLead) return;
    setStatusError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Lead>(`/leads/${selectedLead.id}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          target_status: newStatus,
          loss_reason: newStatus === "LOST" ? lossReason : null,
        }),
      });

      if (res.data) {
        setIsStatusModalOpen(false);
        setSelectedLead(null);
        fetchLeads();
      } else {
        setStatusError(res.error || "Gagal memperbarui status.");
      }
    } catch {
      setStatusError("Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConvertLead(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLead) return;
    setConvertError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<{ id: string; code: string; name: string }>(
        `/leads/${selectedLead.id}/convert`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            project_code: projectCode,
            project_name: projectName,
            target_completion_date: targetDate || null,
          }),
        }
      );

      if (res.data) {
        setIsConvertModalOpen(false);
        router.push(`/projects/${res.data.id}`);
      } else {
        setConvertError(res.error || "Gagal mengonversi lead ke proyek.");
      }
    } catch {
      setConvertError("Terjadi kesalahan saat konversi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetCreateForm() {
    setName("");
    setCompanyName("");
    setPicName("");
    setPicEmail("");
    setPicPhone("");
    setDescription("");
    setBriefNotes("");
    setCreateError(null);
  }

  function openConvertModal(lead: Lead) {
    setSelectedLead(lead);
    setProjectCode(`PRJ-${lead.name.substring(0, 3).toUpperCase()}-01`);
    setProjectName(lead.name);
    setTargetDate("");
    setConvertError(null);
    setIsConvertModalOpen(true);
  }

  function openStatusModal(lead: Lead) {
    setSelectedLead(lead);
    setNewStatus(lead.status);
    setLossReason(lead.loss_reason || "");
    setStatusError(null);
    setIsStatusModalOpen(true);
  }

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.client_pic_name && l.client_pic_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = selectedStatus === "ALL" || l.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manajemen Lead & Prospek</h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola peluang proyek pra-delivery dari kontak awal, brief, kualifikasi, hingga konversi ke proyek.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Lead Baru</span>
        </button>
      </div>

      {/* Filters & Pipeline Tabs */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari lead berdasarkan nama peluang, perusahaan, atau PIC..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {["ALL", "NEW", "CONTACTED", "BRIEF_SCHEDULED", "QUALIFIED", "CONVERTED", "LOST"].map((st) => {
            const isSelected = selectedStatus === st;
            const label = st === "ALL" ? "Semua" : statusConfigs[st]?.label || st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Leads Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-sm text-slate-500">Memuat data lead...</div>
      ) : filteredLeads.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Belum ada data Lead</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Klik tombol &quot;Tambah Lead Baru&quot; di atas untuk mencatat peluang proyek yang masuk.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLeads.map((lead) => {
            const config = statusConfigs[lead.status] || {
              label: lead.status,
              color: "bg-slate-100 text-slate-700 border-slate-200",
              badge: "bg-slate-400",
            };

            const isConverted = lead.status === "CONVERTED";
            const canConvert = ["QUALIFIED", "BRIEF_SCHEDULED", "CONTACTED"].includes(lead.status);

            return (
              <div
                key={lead.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs transition-all p-5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-slate-400">
                      {lead.project_type || "Proyek"}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${config.color}`}
                    >
                      {config.label}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-base line-clamp-1">{lead.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium truncate">{lead.company_name}</span>
                    </div>
                  </div>

                  {lead.opportunity_description && (
                    <p className="text-xs text-slate-500 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {lead.opportunity_description}
                    </p>
                  )}

                  {/* PIC & Source */}
                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                    {lead.client_pic_name && (
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{lead.client_pic_name}</span>
                      </div>
                    )}
                    {lead.client_pic_email && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{lead.client_pic_email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openStatusModal(lead)}
                    className="text-xs text-slate-600 hover:text-slate-900 font-medium px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                  >
                    Kelola Status
                  </button>

                  {isConverted && lead.converted_project_id ? (
                    <Link
                      href={`/projects/${lead.converted_project_id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition-colors"
                    >
                      <span>Lihat Proyek</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  ) : canConvert ? (
                    <button
                      type="button"
                      onClick={() => openConvertModal(lead)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 px-3 py-1 rounded-lg transition-colors shadow-2xs"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Konversi ke Proyek</span>
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Lead Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Tambah Lead Baru</h3>
                <p className="text-xs text-slate-500">Catat peluang proyek baru dari klien potensial.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetCreateForm();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateLead} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Peluang / Proyek *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: E-Commerce Mobile App"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Perusahaan Klien *</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="PT Retail Sukses Mandiri"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
              </div>

              {/* PIC Info */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <span className="text-xs font-semibold text-slate-800 block">Informasi PIC Klien</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={picName}
                    onChange={(e) => setPicName(e.target.value)}
                    placeholder="Nama PIC"
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                  <input
                    type="email"
                    value={picEmail}
                    onChange={(e) => setPicEmail(e.target.value)}
                    placeholder="Email PIC"
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                  <input
                    type="text"
                    value={picPhone}
                    onChange={(e) => setPicPhone(e.target.value)}
                    placeholder="No. Telp / WA"
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipe Proyek</label>
                  <input
                    type="text"
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    placeholder="Web App / Mobile / Integrasi"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sumber Peluang</label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="Direct Inbound / Referral"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Kebutuhan</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ringkasan kebutuhan awal dari klien..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Brief Awal</label>
                <textarea
                  rows={2}
                  value={briefNotes}
                  onChange={(e) => setBriefNotes(e.target.value)}
                  placeholder="Catatan diskusi atau kriteria khusus dari klien..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetCreateForm();
                  }}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Status Modal */}
      {isStatusModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Kelola Status Lead</h3>
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Lead: <span className="font-semibold text-slate-800">{selectedLead.name}</span> ({selectedLead.company_name}).
            </p>

            {statusError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{statusError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateStatus} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status Tujuan</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                >
                  {Object.entries(statusConfigs).map(([val, conf]) => (
                    <option key={val} value={val}>
                      {conf.label}
                    </option>
                  ))}
                </select>
              </div>

              {newStatus === "LOST" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan Batal / Lost *</label>
                  <textarea
                    rows={2}
                    required
                    value={lossReason}
                    onChange={(e) => setLossReason(e.target.value)}
                    placeholder="Tulis alasan pembatalan atau penolakan..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Update Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Project Review Modal */}
      {isConvertModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-sky-100 text-sky-700">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Konversi Lead ke Proyek Aktif</h3>
                  <p className="text-xs text-slate-500">Atomic Conversion: Lead $\rightarrow$ Client & Project</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConvertModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-sky-50/70 border border-sky-100 rounded-xl text-xs text-sky-900 space-y-1">
              <p className="font-semibold">Informasi yang akan dibawa otomatis:</p>
              <ul className="list-disc list-inside space-y-0.5 text-sky-800 text-[11px]">
                <li>Entitas Klien & Stakeholder utama ({selectedLead.company_name})</li>
                <li>Tahap awal proyek langsung berada di <strong>Discovery</strong></li>
                <li>Seluruh deskripsi dan catatan brief awal akan ditautkan</li>
                <li>Status lead ini akan diupdate menjadi <strong>CONVERTED</strong></li>
              </ul>
            </div>

            {convertError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{convertError}</span>
              </div>
            )}

            <form onSubmit={handleConvertLead} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Proyek *</label>
                  <input
                    type="text"
                    required
                    value={projectCode}
                    onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
                    placeholder="PRJ-001"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Proyek *</label>
                  <input
                    type="text"
                    required
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Nama Proyek"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Selesai Proyek</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsConvertModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Mengonversi..." : "Konversi & Buka Workspace"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
