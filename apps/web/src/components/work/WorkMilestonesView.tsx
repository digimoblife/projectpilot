"use client";

import React, { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Edit3,
  Flag,
  Milestone as MilestoneIcon,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface Milestone {
  id: string;
  key: string;
  title: string;
  description: string | null;
  target_date: string;
  actual_date: string | null;
  status: "PLANNED" | "ACHIEVED" | "MISSED" | "CANCELLED";
}

const milestoneStatusConfigs: Record<string, { label: string; color: string }> = {
  PLANNED: { label: "Direncanakan", color: "bg-blue-50 text-blue-700 border-blue-200" },
  ACHIEVED: { label: "Tercapai (Achieved)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  MISSED: { label: "Terlewat (Missed)", color: "bg-rose-50 text-rose-700 border-rose-200" },
  CANCELLED: { label: "Dibatalkan", color: "bg-slate-100 text-slate-500 border-slate-200" },
};

export interface WorkMilestonesViewProps {
  projectId: string;
  embedded?: boolean;
}

export function WorkMilestonesView({
  projectId,
  embedded = false,
}: WorkMilestonesViewProps) {
  const { token } = useAuth();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Milestone Modal
  const [isCreateMlsOpen, setIsCreateMlsOpen] = useState(false);
  const [mlsKey, setMlsKey] = useState("");
  const [mlsTitle, setMlsTitle] = useState("");
  const [mlsTargetDate, setMlsTargetDate] = useState("");
  const [mlsDesc, setMlsDesc] = useState("");
  const [mlsError, setMlsError] = useState<string | null>(null);

  // Edit Milestone Modal
  const [isEditMlsOpen, setIsEditMlsOpen] = useState(false);
  const [editingMlsId, setEditingMlsId] = useState<string | null>(null);
  const [editMlsKey, setEditMlsKey] = useState("");
  const [editMlsTitle, setEditMlsTitle] = useState("");
  const [editMlsTargetDate, setEditMlsTargetDate] = useState("");
  const [editMlsDesc, setEditMlsDesc] = useState("");
  const [editMlsError, setEditMlsError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMilestones();
  }, [projectId, token]);

  async function fetchMilestones() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const res = await apiClient<Milestone[]>(`/projects/${projectId}/milestones`, { headers });
      if (res.data) setMilestones(res.data);
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  }

  function resetMlsForm() {
    const nextNum = milestones.length + 1;
    setMlsKey(`MLS-${nextNum < 10 ? "0" + nextNum : nextNum}`);
    setMlsTitle("");
    setMlsTargetDate("");
    setMlsDesc("");
    setMlsError(null);
  }

  async function handleCreateMilestone(e: React.FormEvent) {
    e.preventDefault();
    setMlsError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Milestone>(`/projects/${projectId}/milestones`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          key: mlsKey,
          title: mlsTitle,
          target_date: mlsTargetDate,
          description: mlsDesc || null,
        }),
      });

      if (res.data) {
        setIsCreateMlsOpen(false);
        resetMlsForm();
        fetchMilestones();
      } else {
        setMlsError(res.error || "Gagal membuat Milestone.");
      }
    } catch {
      setMlsError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateMilestoneStatus(mlsId: string, targetStatus: string) {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await apiClient(`/projects/${projectId}/milestones/${mlsId}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({ target_status: targetStatus }),
      });
      fetchMilestones();
    } catch {
      // Ignored
    }
  }

  async function handleDeleteMilestone(mlsId: string, mlsTitle: string) {
    if (!confirm(`Hapus milestone "${mlsTitle}"?`)) return;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await apiClient(`/projects/${projectId}/milestones/${mlsId}`, {
        method: "DELETE",
        headers,
      });
      fetchMilestones();
    } catch {
      // Ignored
    }
  }

  function openEditMlsModal(mls: Milestone) {
    setEditingMlsId(mls.id);
    setEditMlsKey(mls.key);
    setEditMlsTitle(mls.title);
    setEditMlsTargetDate(mls.target_date);
    setEditMlsDesc(mls.description || "");
    setEditMlsError(null);
    setIsEditMlsOpen(true);
  }

  async function handleUpdateMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMlsId) return;
    setEditMlsError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Milestone>(`/projects/${projectId}/milestones/${editingMlsId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          key: editMlsKey,
          title: editMlsTitle,
          target_date: editMlsTargetDate,
          description: editMlsDesc || null,
        }),
      });

      if (res.data) {
        setIsEditMlsOpen(false);
        fetchMilestones();
      } else {
        setEditMlsError(res.error || "Gagal memperbarui milestone.");
      }
    } catch {
      setEditMlsError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const achievedCount = milestones.filter((m) => m.status === "ACHIEVED").length;
  const plannedCount = milestones.filter((m) => m.status === "PLANNED").length;
  const missedCount = milestones.filter((m) => m.status === "MISSED").length;

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Milestones Proyek</span>
            <span className="inline-flex items-center whitespace-nowrap shrink-0 text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
              {milestones.length} Total
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tonggak capaian utama per fase proyek. Perbarui status menjadi &quot;Tercapai&quot; saat fase selesai.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetMlsForm();
            setIsCreateMlsOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs active:scale-[0.98] transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Milestone</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Milestones</span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">{milestones.length}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700 block">Tercapai (Achieved)</span>
          <span className="text-xl font-bold text-emerald-700 mt-1 block">{achievedCount}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs">
          <span className="text-[11px] font-semibold text-blue-700 block">Direncanakan (Planned)</span>
          <span className="text-xl font-bold text-blue-700 mt-1 block">{plannedCount}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-700 block">Terlewat (Missed)</span>
          <span className="text-xl font-bold text-rose-700 mt-1 block">{missedCount}</span>
        </div>
      </div>

      {/* Milestones Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-400">Memuat data milestone...</div>
      ) : milestones.length === 0 ? (
        <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
          <MilestoneIcon className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
          <p className="text-xs text-slate-500 font-medium">Belum ada milestone yang dibuat untuk proyek ini.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Klik tombol <strong>&quot;+ Tambah Milestone&quot;</strong> di pojok kanan atas untuk membuat target fase pertama.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {milestones.map((mls) => {
            const conf = milestoneStatusConfigs[mls.status] || {
              label: mls.status,
              color: "bg-slate-100 text-slate-700 border-slate-200",
            };
            return (
              <div
                key={mls.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 shrink-0">
                      {mls.key}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditMlsModal(mls)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                        title="Edit Milestone"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMilestone(mls.id, mls.title)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                        title="Hapus Milestone"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-bold text-xs text-slate-900 leading-snug">{mls.title}</h4>
                  {mls.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed">{mls.description}</p>
                  )}
                </div>

                <div className="pt-2.5 border-t border-slate-100 space-y-2">
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                    <span>
                      Target: <strong>{mls.target_date}</strong>
                    </span>
                  </p>

                  {/* Interactive Status Selector */}
                  <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-50">
                    <span className="text-[10px] font-semibold text-slate-400">Status:</span>
                    <select
                      value={mls.status}
                      onChange={(e) => handleUpdateMilestoneStatus(mls.id, e.target.value)}
                      className={`text-[10px] font-semibold rounded px-1.5 py-0.5 border cursor-pointer ${conf.color}`}
                    >
                      <option value="PLANNED">Direncanakan</option>
                      <option value="ACHIEVED">Tercapai</option>
                      <option value="MISSED">Terlewat</option>
                      <option value="CANCELLED">Dibatalkan</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Milestone Modal */}
      {isCreateMlsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-cyan-600" />
                <h3 className="font-bold text-slate-900 text-base">Tambah Milestone Proyek</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateMlsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {mlsError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {mlsError}
              </div>
            )}

            <form onSubmit={handleCreateMilestone} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key *</label>
                  <input
                    type="text"
                    required
                    value={mlsKey}
                    onChange={(e) => setMlsKey(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Milestone *</label>
                  <input
                    type="text"
                    required
                    value={mlsTitle}
                    onChange={(e) => setMlsTitle(e.target.value)}
                    placeholder="Contoh: UAT Klien Selesai"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Tanggal *</label>
                <input
                  type="date"
                  required
                  value={mlsTargetDate}
                  onChange={(e) => setMlsTargetDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Milestone</label>
                <textarea
                  rows={2}
                  value={mlsDesc}
                  onChange={(e) => setMlsDesc(e.target.value)}
                  placeholder="Kriteria penentu tercapainya milestone ini..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateMlsOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Milestone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Milestone Modal */}
      {isEditMlsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-600" />
                <h3 className="font-bold text-slate-900 text-base">Edit Milestone Proyek</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditMlsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editMlsError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {editMlsError}
              </div>
            )}

            <form onSubmit={handleUpdateMilestone} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key *</label>
                  <input
                    type="text"
                    required
                    value={editMlsKey}
                    onChange={(e) => setEditMlsKey(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Milestone *</label>
                  <input
                    type="text"
                    required
                    value={editMlsTitle}
                    onChange={(e) => setEditMlsTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Tanggal *</label>
                <input
                  type="date"
                  required
                  value={editMlsTargetDate}
                  onChange={(e) => setEditMlsTargetDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Milestone</label>
                <textarea
                  rows={2}
                  value={editMlsDesc}
                  onChange={(e) => setEditMlsDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditMlsOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan Perubahan..." : "Perbarui Milestone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
