"use client";

import React, { useEffect, useState, use } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  FileEdit,
  GitPullRequest,
  HelpCircle,
  Layers,
  MoveRight,
  Plus,
  ShieldAlert,
  Sliders,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface ScopeItem {
  id: string;
  title: string;
  description: string | null;
  scope_type: "IN_SCOPE" | "OUT_OF_SCOPE" | "UNDECIDED";
  rationale: string | null;
  created_at: string;
}

interface ScopeChange {
  id: string;
  key: string;
  title: string;
  description: string;
  reason: string;
  impact_summary: string | null;
  status: string;
  requested_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

const changeStatusConfigs: Record<string, { label: string; color: string }> = {
  IDENTIFIED: { label: "Teridentifikasi", color: "bg-slate-100 text-slate-700 border-slate-200" },
  UNDER_EVALUATION: { label: "Evaluasi Dampak", color: "bg-amber-50 text-amber-700 border-amber-200" },
  SUBMITTED: { label: "Diajukan ke Klien", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  CLIENT_APPROVED: { label: "Disetujui Klien", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Ditolak", color: "bg-rose-50 text-rose-700 border-rose-200" },
  IMPLEMENTED: { label: "Telah Diterapkan", color: "bg-teal-50 text-teal-700 border-teal-200" },
  CANCELLED: { label: "Dibatalkan", color: "bg-slate-100 text-slate-500 border-slate-200" },
};

export default function ProjectScopePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<"baseline" | "changes">("baseline");
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([]);
  const [scopeChanges, setScopeChanges] = useState<ScopeChange[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Scope Item Modal
  const [isCreateItemModalOpen, setIsCreateItemModalOpen] = useState(false);
  const [itemTitle, setItemTitle] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemType, setItemType] = useState<"IN_SCOPE" | "OUT_OF_SCOPE" | "UNDECIDED">("IN_SCOPE");
  const [itemRationale, setItemRationale] = useState("");
  const [itemError, setItemError] = useState<string | null>(null);

  // Create Scope Change Modal
  const [isCreateCrModalOpen, setIsCreateCrModalOpen] = useState(false);
  const [crKey, setCrKey] = useState("");
  const [crTitle, setCrTitle] = useState("");
  const [crDesc, setCrDesc] = useState("");
  const [crReason, setCrReason] = useState("");
  const [crImpact, setCrImpact] = useState("");
  const [crError, setCrError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchScopeData();
  }, [projectId, token]);

  async function fetchScopeData() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [itemRes, crRes] = await Promise.all([
        apiClient<ScopeItem[]>(`/projects/${projectId}/scope-items`, { headers }),
        apiClient<ScopeChange[]>(`/projects/${projectId}/scope-changes`, { headers }),
      ]);

      if (itemRes.data) setScopeItems(itemRes.data);
      if (crRes.data) setScopeChanges(crRes.data);
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateScopeItem(e: React.FormEvent) {
    e.preventDefault();
    setItemError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<ScopeItem>(`/projects/${projectId}/scope-items`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: itemTitle,
          description: itemDesc || null,
          scope_type: itemType,
          rationale: itemRationale || null,
        }),
      });

      if (res.data) {
        setIsCreateItemModalOpen(false);
        resetItemForm();
        fetchScopeData();
      } else {
        setItemError(res.error || "Gagal menambahkan item scope.");
      }
    } catch {
      setItemError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMoveScopeType(itemId: string, newType: "IN_SCOPE" | "OUT_OF_SCOPE" | "UNDECIDED") {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await apiClient(`/projects/${projectId}/scope-items/${itemId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ scope_type: newType }),
      });
      fetchScopeData();
    } catch {
      // Handle error
    }
  }

  async function handleDeleteScopeItem(itemId: string) {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await apiClient(`/projects/${projectId}/scope-items/${itemId}`, {
        method: "DELETE",
        headers,
      });
      fetchScopeData();
    } catch {
      // Handle error
    }
  }

  async function handleCreateScopeChange(e: React.FormEvent) {
    e.preventDefault();
    setCrError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<ScopeChange>(`/projects/${projectId}/scope-changes`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          key: crKey,
          title: crTitle,
          description: crDesc,
          reason: crReason,
          impact_summary: crImpact || null,
        }),
      });

      if (res.data) {
        setIsCreateCrModalOpen(false);
        resetCrForm();
        fetchScopeData();
      } else {
        setCrError(res.error || "Gagal mengajukan Change Request.");
      }
    } catch {
      setCrError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateCrStatus(crId: string, targetStatus: string) {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await apiClient(`/projects/${projectId}/scope-changes/${crId}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          target_status: targetStatus,
          approved_by: targetStatus === "CLIENT_APPROVED" ? "Stakeholder Klien" : null,
        }),
      });
      fetchScopeData();
    } catch {
      // Handle error
    }
  }

  function resetItemForm() {
    setItemTitle("");
    setItemDesc("");
    setItemType("IN_SCOPE");
    setItemRationale("");
    setItemError(null);
  }

  function resetCrForm() {
    setCrKey(`CR-${scopeChanges.length + 1}`.padStart(6, "0"));
    setCrTitle("");
    setCrDesc("");
    setCrReason("");
    setCrImpact("");
    setCrError(null);
  }

  const inScopeItems = scopeItems.filter((i) => i.scope_type === "IN_SCOPE");
  const outScopeItems = scopeItems.filter((i) => i.scope_type === "OUT_OF_SCOPE");
  const undecidedItems = scopeItems.filter((i) => i.scope_type === "UNDECIDED");

  return (
    <div className="space-y-6">
      {/* Sub-Tab Navigation Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("baseline")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === "baseline"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>1. Baseline In-Scope vs Out-of-Scope ({scopeItems.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("changes")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === "changes"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <GitPullRequest className="w-3.5 h-3.5" />
            <span>2. Scope Change Requests / CR ({scopeChanges.length})</span>
          </button>
        </div>

        {activeTab === "baseline" ? (
          <button
            type="button"
            onClick={() => {
              resetItemForm();
              setIsCreateItemModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Item Scope</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              resetCrForm();
              setIsCreateCrModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajukan Change Request</span>
          </button>
        )}
      </div>

      {/* TAB 1: SCOPE BASELINE BOARD */}
      {activeTab === "baseline" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* IN-SCOPE COLUMN */}
            <div className="bg-emerald-50/50 rounded-2xl border border-emerald-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-emerald-950 text-sm">IN-SCOPE (Komitmen Pengiriman)</h3>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                  {inScopeItems.length} Item
                </span>
              </div>
              <p className="text-xs text-emerald-800">
                Fitur dan deliverable resmi yang masuk dalam kesepakatan timeline dan budget saat ini.
              </p>

              {inScopeItems.length === 0 ? (
                <div className="p-8 text-center bg-white/60 rounded-xl border border-emerald-100 text-xs text-slate-400">
                  Belum ada item in-scope yang terdaftar.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {inScopeItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl border border-emerald-100 p-3.5 shadow-2xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-xs text-slate-900">{item.title}</h4>
                        <button
                          type="button"
                          onClick={() => handleDeleteScopeItem(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-600">{item.description}</p>
                      )}
                      {item.rationale && (
                        <p className="text-[11px] text-slate-400 italic">Rasional: &quot;{item.rationale}&quot;</p>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleMoveScopeType(item.id, "OUT_OF_SCOPE")}
                          className="text-[10px] font-semibold text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-colors"
                        >
                          Pindah ke Out-of-Scope $\rightarrow$
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* OUT-OF-SCOPE COLUMN */}
            <div className="bg-rose-50/50 rounded-2xl border border-rose-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <h3 className="font-bold text-rose-950 text-sm">OUT-OF-SCOPE (Eksklusi / Fase Berikutnya)</h3>
                </div>
                <span className="text-xs font-bold text-rose-700 bg-white px-2 py-0.5 rounded-full border border-rose-200">
                  {outScopeItems.length} Item
                </span>
              </div>
              <p className="text-xs text-rose-800">
                Fitur yang secara eksplisit tidak dikerjakan pada rilis ini untuk mencegah scope creep.
              </p>

              {outScopeItems.length === 0 ? (
                <div className="p-8 text-center bg-white/60 rounded-xl border border-rose-100 text-xs text-slate-400">
                  Belum ada item out-of-scope yang didokumentasikan.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {outScopeItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl border border-rose-100 p-3.5 shadow-2xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-xs text-slate-900">{item.title}</h4>
                        <button
                          type="button"
                          onClick={() => handleDeleteScopeItem(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-600">{item.description}</p>
                      )}
                      {item.rationale && (
                        <p className="text-[11px] text-slate-400 italic">Alasan: &quot;{item.rationale}&quot;</p>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-start gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleMoveScopeType(item.id, "IN_SCOPE")}
                          className="text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded transition-colors"
                        >
                          $\leftarrow$ Pindah ke In-Scope
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SCOPE CHANGE REQUESTS */}
      {activeTab === "changes" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">Manajemen Perubahan Ruang Lingkup (Scope Changes)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Setiap deviasi dari baseline in-scope harus melalui evaluasi dampak teknis/jadwal dan persetujuan formal.
            </p>
          </div>

          {scopeChanges.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <GitPullRequest className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-900">Belum ada Scope Change Request (CR)</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Gunakan tombol &quot;Ajukan Change Request&quot; jika terdapat permintaan fitur baru di luar baseline.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {scopeChanges.map((cr) => {
                const conf = changeStatusConfigs[cr.status] || {
                  label: cr.status,
                  color: "bg-slate-100 text-slate-700 border-slate-200",
                };

                return (
                  <div key={cr.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                          {cr.key}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{cr.title}</h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${conf.color}`}>
                          {conf.label}
                        </span>
                        <select
                          value={cr.status}
                          onChange={(e) => handleUpdateCrStatus(cr.id, e.target.value)}
                          className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1"
                        >
                          {Object.entries(changeStatusConfigs).map(([val, c]) => (
                            <option key={val} value={val}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-700">
                      <div>
                        <span className="font-bold text-slate-500 text-[10px] uppercase block">Deskripsi Permintaan:</span>
                        <p className="mt-0.5">{cr.description}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-500 text-[10px] uppercase block">Alasan Bisnis:</span>
                        <p className="mt-0.5">{cr.reason}</p>
                      </div>
                      {cr.impact_summary && (
                        <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/80">
                          <span className="font-bold text-amber-900 text-[10px] uppercase block">Estimasi Dampak Jadwal & Biaya:</span>
                          <p className="text-amber-950 font-medium mt-0.5">{cr.impact_summary}</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Diajukan oleh: {cr.requested_by || "PM"}</span>
                      {cr.approved_by && (
                        <span className="text-emerald-700 font-semibold">Disetujui oleh: {cr.approved_by}</span>
                      )}
                      <span>{new Date(cr.created_at).toLocaleDateString("id-ID")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Scope Item Modal */}
      {isCreateItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Tambah Item Scope</h3>
              <button
                type="button"
                onClick={() => setIsCreateItemModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {itemError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{itemError}</span>
              </div>
            )}

            <form onSubmit={handleCreateScopeItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Deliverable / Item *</label>
                <input
                  type="text"
                  required
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="Contoh: Modul Notifikasi SMS OTP"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Klasifikasi Scope *</label>
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="IN_SCOPE">IN-SCOPE (Komitmen Pengiriman)</option>
                  <option value="OUT_OF_SCOPE">OUT-OF-SCOPE (Eksklusi / Fase Berikutnya)</option>
                  <option value="UNDECIDED">UNDECIDED (Masih Didiskusikan)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Tambahan</label>
                <textarea
                  rows={2}
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  placeholder="Rincian singkat batasan deliverable..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateItemModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Scope Change (CR) Modal */}
      {isCreateCrModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Ajukan Change Request (CR)</h3>
                <p className="text-xs text-slate-500">Mendokumentasikan usulan perubahan ruang lingkup.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateCrModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {crError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{crError}</span>
              </div>
            )}

            <form onSubmit={handleCreateScopeChange} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key *</label>
                  <input
                    type="text"
                    required
                    value={crKey}
                    onChange={(e) => setCrKey(e.target.value.toUpperCase())}
                    placeholder="CR-001"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Perubahan *</label>
                  <input
                    type="text"
                    required
                    value={crTitle}
                    onChange={(e) => setCrTitle(e.target.value)}
                    placeholder="Contoh: Penambahan Fitur Export PDF Laporan"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Perubahan *</label>
                <textarea
                  rows={3}
                  required
                  value={crDesc}
                  onChange={(e) => setCrDesc(e.target.value)}
                  placeholder="Jelaskan apa yang diminta untuk diubah atau ditambah..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan Bisnis / Justifikasi *</label>
                <textarea
                  rows={2}
                  required
                  value={crReason}
                  onChange={(e) => setCrReason(e.target.value)}
                  placeholder="Mengapa perubahan ini diperlukan oleh stakeholder..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Estimasi Dampak Jadwal & Biaya</label>
                <textarea
                  rows={2}
                  value={crImpact}
                  onChange={(e) => setCrImpact(e.target.value)}
                  placeholder="Contoh: +5 hari kerja sprint, tidak ada tambahan biaya server."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateCrModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Mengajukan..." : "Ajukan Change Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
