"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Plus,
  Search,
  Calendar,
  Building2,
  ArrowRight,
  Sparkles,
  X,
  AlertCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface Client {
  id: string;
  name: string;
  company_name: string;
}

interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  lifecycle_stage: string;
  health: string;
  start_date: string | null;
  target_completion_date: string | null;
  client: Client | null;
  created_at: string;
}

const stageLabels: Record<string, { label: string; color: string }> = {
  DISCOVERY: { label: "Discovery", color: "bg-purple-50 text-purple-700 border-purple-200" },
  REQUIREMENT_DEFINITION: { label: "Requirements", color: "bg-blue-50 text-blue-700 border-blue-200" },
  PLANNING: { label: "Planning", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  AWAITING_CLIENT_APPROVAL: { label: "Menunggu Approval", color: "bg-amber-50 text-amber-700 border-amber-200" },
  ACTIVE_DELIVERY: { label: "Active Delivery", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  HANDOVER: { label: "Handover", color: "bg-teal-50 text-teal-700 border-teal-200" },
  COMPLETED: { label: "Selesai", color: "bg-slate-100 text-slate-700 border-slate-200" },
  ON_HOLD: { label: "On Hold", color: "bg-orange-50 text-orange-700 border-orange-200" },
  CANCELLED: { label: "Dibatalkan", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

const healthLabels: Record<string, { label: string; dot: string; text: string }> = {
  HEALTHY: { label: "Sehat", dot: "bg-emerald-500", text: "text-emerald-700" },
  WATCH: { label: "Perhatian", dot: "bg-amber-500", text: "text-amber-700" },
  AT_RISK: { label: "Beresiko", dot: "bg-orange-500", text: "text-orange-700" },
  CRITICAL: { label: "Kritis", dot: "bg-rose-500", text: "text-rose-700" },
};

export default function ProjectsPage() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Client quick creation toggle
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientCompany, setNewClientCompany] = useState("");

  useEffect(() => {
    fetchProjectsAndClients();
  }, [token]);

  async function fetchProjectsAndClients() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const [projRes, clientRes] = await Promise.all([
      apiClient<Project[]>("/projects", { headers }),
      apiClient<Client[]>("/clients", { headers }),
    ]);

    if (projRes.data) setProjects(projRes.data);
    if (clientRes.data) {
      setClients(clientRes.data);
      if (clientRes.data.length > 0) {
        setClientId(clientRes.data[0].id);
      }
    }
    setIsLoading(false);
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      let finalClientId = clientId;

      // Quick create client if chosen
      if (isNewClient) {
        if (!newClientName || !newClientCompany) {
          setFormError("Nama dan nama PT klien wajib diisi.");
          setIsSubmitting(false);
          return;
        }
        const createClientRes = await apiClient<Client>("/clients", {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: newClientName,
            company_name: newClientCompany,
          }),
        });

        if (!createClientRes.data) {
          setFormError(createClientRes.error || "Gagal membuat klien baru.");
          setIsSubmitting(false);
          return;
        }
        finalClientId = createClientRes.data.id;
      }

      if (!finalClientId) {
        setFormError("Pilih atau tambahkan klien terlebih dahulu.");
        setIsSubmitting(false);
        return;
      }

      const res = await apiClient<Project>("/projects", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name,
          code,
          description: description || null,
          client_id: finalClientId,
          start_date: startDate || null,
          target_completion_date: targetDate || null,
        }),
      });

      if (res.data) {
        setIsCreateModalOpen(false);
        resetForm();
        fetchProjectsAndClients();
      } else {
        setFormError(res.error || "Gagal membuat proyek.");
      }
    } catch {
      setFormError("Terjadi kesalahan sistem saat membuat proyek.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setName("");
    setCode("");
    setDescription("");
    setStartDate("");
    setTargetDate("");
    setIsNewClient(false);
    setNewClientName("");
    setNewClientCompany("");
    setFormError(null);
  }

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.client?.name && p.client.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStage = selectedStage === "ALL" || p.lifecycle_stage === selectedStage;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Daftar Proyek</h1>
          <p className="text-sm text-slate-500 mt-1">
            Workspace operasional terpadu dari discovery, requirements, delivery, hingga handover.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Proyek Baru</span>
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan kode, nama proyek, atau klien..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {["ALL", "DISCOVERY", "REQUIREMENT_DEFINITION", "PLANNING", "ACTIVE_DELIVERY", "HANDOVER", "COMPLETED"].map((stage) => {
            const isSelected = selectedStage === stage;
            const label = stage === "ALL" ? "Semua Tahap" : stageLabels[stage]?.label || stage;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setSelectedStage(stage)}
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

      {/* Project Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-sm text-slate-500">Memuat daftar proyek...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Belum ada proyek yang sesuai</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Klik tombol &quot;Buat Proyek Baru&quot; di atas untuk memulai siklus hidup proyek pertama Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => {
            const stageConfig = stageLabels[project.lifecycle_stage] || {
              label: project.lifecycle_stage,
              color: "bg-slate-100 text-slate-700 border-slate-200",
            };
            const healthConfig = healthLabels[project.health] || {
              label: project.health,
              dot: "bg-emerald-500",
              text: "text-emerald-700",
            };

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group bg-white rounded-xl border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {project.code}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${stageConfig.color}`}
                    >
                      {stageConfig.label}
                    </span>
                  </div>

                  <h2 className="font-semibold text-slate-900 group-hover:text-sky-600 transition-colors text-base line-clamp-1">
                    {project.name}
                  </h2>

                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[32px]">
                    {project.description || "Tidak ada deskripsi proyek."}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium truncate">
                        {project.client?.name || "Klien Internal"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Target: {project.target_completion_date || "Belum ditentukan"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${healthConfig.dot}`} />
                        <span className={`font-medium ${healthConfig.text}`}>
                          {healthConfig.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end text-xs font-medium text-sky-600 group-hover:translate-x-0.5 transition-transform">
                  <span>Buka Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Buat Proyek Baru</h3>
                <p className="text-xs text-slate-500">
                  Proyek akan dimulai otomatis pada tahapan awal <span className="font-semibold text-purple-700">Discovery</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetForm();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Proyek *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="PRJ-001"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-slate-50 text-slate-800"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Proyek *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Mobile Banking 2.0"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-slate-50 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi & Tujuan</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ringkasan objektif bisnis dan ruang lingkup awal..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-slate-50 text-slate-800"
                />
              </div>

              {/* Client Selection */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800">Klien Proyek *</label>
                  <button
                    type="button"
                    onClick={() => setIsNewClient(!isNewClient)}
                    className="text-xs text-sky-600 hover:text-sky-700 font-medium"
                  >
                    {isNewClient ? "Pilih Klien Yang Ada" : "+ Tambah Klien Baru"}
                  </button>
                </div>

                {isNewClient ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <input
                        type="text"
                        required
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="Nama Brand Klien (e.g. Maju Bank)"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        required
                        value={newClientCompany}
                        onChange={(e) => setNewClientCompany(e.target.value)}
                        placeholder="Nama PT Resmi (e.g. PT Maju Bersama)"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                ) : (
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  >
                    {clients.length === 0 && <option value="">Belum ada klien, pilih + Tambah Klien</option>}
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.company_name})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Selesai</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm rounded-lg shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSubmitting ? "Menyimpan..." : "Buat Proyek"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
