"use client";

import React, { useEffect, useState, use } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileCheck2,
  FileCode,
  FileText,
  Key,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  User,
  Users,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface HandoverItem {
  id: string;
  handover_id: string;
  item_type: string;
  title: string;
  description: string | null;
  required: boolean;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "WAIVED" | "NOT_APPLICABLE" | "BLOCKED";
  related_document_id: string | null;
  waiver_reason: string | null;
  completed_at: string | null;
  completed_by_user_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface Handover {
  id: string;
  project_id: string;
  status: "NOT_STARTED" | "IN_PREPARATION" | "READY_FOR_REVIEW" | "AWAITING_CLIENT_ACCEPTANCE" | "COMPLETED" | "BLOCKED" | "CANCELLED";
  started_at: string | null;
  ready_for_review_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: HandoverItem[];
}

interface GateStatus {
  is_eligible: boolean;
  reasons: string[];
  completed_count: number;
  required_count: number;
  total_count: number;
}

const handoverStatusConfigs = {
  NOT_STARTED: { label: "Belum Dimulai", color: "bg-slate-100 text-slate-700 border-slate-300" },
  IN_PREPARATION: { label: "Persiapan Serah Terima", color: "bg-blue-50 text-blue-700 border-blue-200" },
  READY_FOR_REVIEW: { label: "Siap Review Internal", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  AWAITING_CLIENT_ACCEPTANCE: { label: "Menunggu Sign-Off Klien", color: "bg-amber-50 text-amber-700 border-amber-200" },
  COMPLETED: { label: "Proyek Selesai (Completed)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  BLOCKED: { label: "Tertahan (Blocked)", color: "bg-rose-50 text-rose-700 border-rose-200" },
  CANCELLED: { label: "Dibatalkan", color: "bg-slate-100 text-slate-500 border-slate-200" },
};

const itemStatusConfigs = {
  PENDING: { label: "Pending", color: "bg-slate-100 text-slate-600 border-slate-200" },
  IN_PROGRESS: { label: "Proses", color: "bg-blue-50 text-blue-600 border-blue-200" },
  COMPLETED: { label: "Selesai", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  WAIVED: { label: "Di-waive", color: "bg-purple-50 text-purple-700 border-purple-200" },
  NOT_APPLICABLE: { label: "N/A", color: "bg-slate-50 text-slate-400 border-slate-200" },
  BLOCKED: { label: "Blocked", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

export default function ProjectHandoverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { token } = useAuth();

  const [handover, setHandover] = useState<Handover | null>(null);
  const [gateStatus, setGateStatus] = useState<GateStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Waiver Modal
  const [isWaiverModalOpen, setIsWaiverModalOpen] = useState(false);
  const [selectedItemForWaiver, setSelectedItemForWaiver] = useState<HandoverItem | null>(null);
  const [waiverReason, setWaiverReason] = useState("");
  const [waiverError, setWaiverError] = useState<string | null>(null);

  // Add Item Modal
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemRequired, setNewItemRequired] = useState(true);

  // Complete Confirmation Modal
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  useEffect(() => {
    fetchHandoverData();
  }, [projectId, token]);

  async function fetchHandoverData() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [hoRes, gateRes] = await Promise.all([
        apiClient<Handover>(`/projects/${projectId}/handover`, { headers }),
        apiClient<GateStatus>(`/projects/${projectId}/handover/gate-status`, { headers }),
      ]);

      if (hoRes.data) {
        setHandover(hoRes.data);
      }
      if (gateRes.data) {
        setGateStatus(gateRes.data);
      }
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdateHandoverStatus(targetStatus: string, notes?: string) {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Handover>(`/projects/${projectId}/handover/status`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ target_status: targetStatus, notes: notes || null }),
      });

      if (res.data) {
        fetchHandoverData();
      }
    } catch {
      // Handled
    }
  }

  async function handleUpdateItemStatus(itemId: string, newStatus: string, reason?: string) {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<HandoverItem>(`/projects/${projectId}/handover/items/${itemId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          status: newStatus,
          waiver_reason: reason || null,
        }),
      });

      if (res.data) {
        setIsWaiverModalOpen(false);
        setWaiverReason("");
        fetchHandoverData();
      }
    } catch {
      // Handled
    }
  }

  async function handleAddCustomItem(e: React.FormEvent) {
    e.preventDefault();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<HandoverItem>(`/projects/${projectId}/handover/items`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: newItemTitle,
          description: newItemDescription || null,
          required: newItemRequired,
          item_type: "CUSTOM",
        }),
      });

      if (res.data) {
        setIsAddItemModalOpen(false);
        setNewItemTitle("");
        setNewItemDescription("");
        setNewItemRequired(true);
        fetchHandoverData();
      }
    } catch {
      // Handled
    }
  }

  async function handleCompleteHandover() {
    setCompleteError(null);
    setIsCompleting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Handover>(`/projects/${projectId}/handover/complete`, {
        method: "POST",
        headers,
      });

      if (res.data) {
        setIsCompleteModalOpen(false);
        fetchHandoverData();
      } else {
        setCompleteError(res.error || "Gagal menyelesaikan proyek. Periksa completion gate.");
      }
    } catch {
      setCompleteError("Terjadi kesalahan sistem saat memfinalisasi penutupan proyek.");
    } finally {
      setIsCompleting(false);
    }
  }

  if (isLoading || !handover) {
    return (
      <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
        Memuat ruang kerja serah terima (Handover)...
      </div>
    );
  }

  const isCompleted = handover.status === "COMPLETED";
  const progressPercent = gateStatus && gateStatus.total_count > 0
    ? Math.round((gateStatus.completed_count / gateStatus.total_count) * 100)
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Serah Terima & Penutupan Proyek</h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                handoverStatusConfigs[handover.status]?.color
              }`}
            >
              {handoverStatusConfigs[handover.status]?.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Verifikasi kelayakan delivery, persetujuan UAT klien, serah terima kredensial, dan penutupan resmi proyek.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isCompleted && (
            <>
              {handover.status === "NOT_STARTED" && (
                <button
                  type="button"
                  onClick={() => handleUpdateHandoverStatus("IN_PREPARATION")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  🚀 Mulai Persiapan Serah Terima
                </button>
              )}

              {handover.status === "IN_PREPARATION" && (
                <button
                  type="button"
                  onClick={() => handleUpdateHandoverStatus("READY_FOR_REVIEW")}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  📋 Kirim Siap Review Internal
                </button>
              )}

              {handover.status === "READY_FOR_REVIEW" && (
                <button
                  type="button"
                  onClick={() => handleUpdateHandoverStatus("AWAITING_CLIENT_ACCEPTANCE")}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  🤝 Minta Konfirmasi Sign-Off Klien
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsCompleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                <Award className="w-4 h-4 text-emerald-200" />
                <span>Selesaikan & Tutup Proyek</span>
              </button>
            </>
          )}

          {isCompleted && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              <span>Proyek Selesai Resmi</span>
            </div>
          )}
        </div>
      </div>

      {/* Completion Banner if Closed */}
      {isCompleted && (
        <div className="p-5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl text-white shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-300" />
              <h3 className="text-base font-bold">Proyek Telah Berhasil Diserahterimakan!</h3>
            </div>
            <p className="text-xs text-emerald-100">
              Seluruh item wajib dan persetujuan klien telah terpenuhi. Dokumen, repositori, dan kredensial telah diserahkan.
            </p>
          </div>
          <span className="text-xs font-mono bg-white/20 px-3 py-1.5 rounded-lg font-semibold">
            Tanggal Selesai: {handover.completed_at ? new Date(handover.completed_at).toLocaleDateString("id-ID") : "Hari ini"}
          </span>
        </div>
      )}

      {/* Gating Status & Progress Metrics Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Progress Bar Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Kemajuan Checklist:</span>
            <span className="text-emerald-600 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            {gateStatus?.completed_count || 0} dari {gateStatus?.total_count || 0} item telah terselesaikan / di-waive.
          </p>
        </div>

        {/* Completion Gate Eligibility */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 md:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Status Kelayakan Gerbang Penutupan (Completion Gate):</span>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                gateStatus?.is_eligible
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {gateStatus?.is_eligible ? "✅ SIAP DISELESAIKAN" : "⚠️ BELUM MEMENUHI SYARAT"}
            </span>
          </div>

          {gateStatus && gateStatus.reasons.length > 0 ? (
            <div className="space-y-1">
              {gateStatus.reasons.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-rose-600">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Semua syarat kelayakan mandatory telah terpenuhi dan tidak ada blocker aktif yang menghalangi.
            </p>
          )}
        </div>
      </div>

      {/* Checklist Header & Actions */}
      <div className="flex items-center justify-between pt-2">
        <h3 className="text-sm font-bold text-slate-900">Daftar Item Serah Terima (Handover Checklist)</h3>

        {!isCompleted && (
          <button
            type="button"
            onClick={() => setIsAddItemModalOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-xl transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>Tambah Item Kustom</span>
          </button>
        )}
      </div>

      {/* Checklist Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="divide-y divide-slate-100">
          {handover.items.map((item) => {
            const statusCfg = itemStatusConfigs[item.status] || itemStatusConfigs.PENDING;

            return (
              <div
                key={item.id}
                className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                        item.required
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {item.required ? "Wajib" : "Opsional"}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                    <span className={`text-[10px] font-semibold px-2 py-0.2 rounded border ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
                  )}

                  {item.status === "WAIVED" && item.waiver_reason && (
                    <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg text-[11px] text-purple-800">
                      <span className="font-bold">Alasan Waiver: </span>
                      {item.waiver_reason}
                    </div>
                  )}

                  {item.completed_at && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>Diselesaikan pada {new Date(item.completed_at).toLocaleDateString("id-ID")}</span>
                    </div>
                  )}
                </div>

                {!isCompleted && (
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {item.status !== "COMPLETED" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateItemStatus(item.id, "COMPLETED")}
                        className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                      >
                        Selesaikan
                      </button>
                    )}

                    {item.status !== "WAIVED" && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedItemForWaiver(item);
                          setWaiverReason("");
                          setWaiverError(null);
                          setIsWaiverModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
                      >
                        Waive
                      </button>
                    )}

                    {item.status !== "PENDING" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateItemStatus(item.id, "PENDING")}
                        className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 rounded-lg"
                        title="Kembalikan status"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* WAIVER MODAL */}
      {isWaiverModalOpen && selectedItemForWaiver && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Pengecualian Item (Waiver)</h3>
              <button
                type="button"
                onClick={() => setIsWaiverModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Pengecualian item <span className="font-bold text-slate-900">&quot;{selectedItemForWaiver.title}&quot;</span> membutuhkan justifikasi alasan tertulis yang dapat dipertanggungjawabkan dalam audit delivery.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Alasan / Justifikasi Waiver *</label>
              <textarea
                rows={3}
                required
                value={waiverReason}
                onChange={(e) => setWaiverReason(e.target.value)}
                placeholder="Contoh: Klien mengelola deployment production sendiri dengan tim internal mereka."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-900"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsWaiverModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!waiverReason.trim()}
                onClick={() => handleUpdateItemStatus(selectedItemForWaiver.id, "WAIVED", waiverReason)}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                Simpan Waiver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOM ITEM MODAL */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Tambah Item Serah Terima Kustom</h3>
              <button
                type="button"
                onClick={() => setIsAddItemModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Item Serah Terima *</label>
                <input
                  type="text"
                  required
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="Contoh: Serah Terima Lisensi SSL & Domain"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Kriteria</label>
                <textarea
                  rows={2}
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder="Penjelasan deliverable yang harus dipenuhi..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="reqCheck"
                  checked={newItemRequired}
                  onChange={(e) => setNewItemRequired(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="reqCheck" className="text-xs text-slate-700">
                  Item ini bersifat wajib (wajib diselesaikan / di-waive sebelum proyek dapat ditutup)
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
                >
                  Tambah Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETE PROJECT CONFIRMATION MODAL */}
      {isCompleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 border-b border-slate-100 pb-3">
              <Award className="w-5 h-5" />
              <h3 className="font-bold text-slate-900 text-sm">Konfirmasi Finalisasi & Penutupan Proyek</h3>
            </div>

            {completeError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {completeError}
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed">
              Tindakan ini akan mengesahkan bahwa seluruh serah terima teknis, dokumen, dan persetujuan klien telah selesai. Status siklus hidup proyek akan ditransisikan secara resmi menjadi <span className="font-bold text-emerald-700">COMPLETED</span>.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCompleteModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isCompleting || !gateStatus?.is_eligible}
                onClick={handleCompleteHandover}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {isCompleting ? "Memproses..." : "Sahkan & Tutup Proyek"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
