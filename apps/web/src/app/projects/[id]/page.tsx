"use client";

import React, { useEffect, useState, use } from "react";
import {
  AlertCircle,
  Building2,
  Calendar,
  Clock,
  Compass,
  FileEdit,
  History,
  MoveRight,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface Activity {
  id: string;
  event_type: string;
  description: string;
  event_metadata: Record<string, any>;
  created_at: string;
  actor?: { full_name: string; role: string };
}

interface ProjectDetail {
  id: string;
  code: string;
  name: string;
  description: string | null;
  lifecycle_stage: string;
  health: string;
  start_date: string | null;
  target_completion_date: string | null;
  created_at: string;
  client: {
    id: string;
    name: string;
    company_name: string;
    industry: string | null;
    primary_contact_name: string | null;
    primary_contact_email: string | null;
  } | null;
  owner: { full_name: string; email: string } | null;
  activities: Activity[];
}

const stageOptions = [
  { value: "DISCOVERY", label: "Discovery" },
  { value: "REQUIREMENT_DEFINITION", label: "Requirements Definition" },
  { value: "PLANNING", label: "Planning" },
  { value: "AWAITING_CLIENT_APPROVAL", label: "Awaiting Client Approval" },
  { value: "ACTIVE_DELIVERY", label: "Active Delivery" },
  { value: "HANDOVER", label: "Handover" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { token } = useAuth();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Transition state
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [targetStage, setTargetStage] = useState("");
  const [transitionReason, setTransitionReason] = useState("");
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [id, token]);

  async function fetchProject() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await apiClient<ProjectDetail>(`/projects/${id}`, { headers });
    if (res.data) {
      setProject(res.data);
      setTargetStage(res.data.lifecycle_stage);
    }
    setIsLoading(false);
  }

  async function handleTransition(e: React.FormEvent) {
    e.preventDefault();
    setTransitionError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<ProjectDetail>(`/projects/${id}/transition`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          target_stage: targetStage,
          reason: transitionReason || null,
        }),
      });

      if (res.data) {
        setIsTransitionModalOpen(false);
        setTransitionReason("");
        fetchProject();
      } else {
        setTransitionError(res.error || "Gagal mengubah tahapan proyek.");
      }
    } catch {
      setTransitionError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-slate-500">Memuat detail overview proyek...</div>;
  }

  if (!project) {
    return (
      <div className="p-8 text-center text-sm text-rose-500 bg-white rounded-xl border border-rose-200">
        Proyek tidak ditemukan atau telah dihapus.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Client & PIC */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Klien & Stakeholder</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900">{project.client?.name}</h4>
            <p className="text-xs text-slate-500">{project.client?.company_name}</p>
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
            <p>
              <span className="text-slate-400">Kontak Utama:</span>{" "}
              <span className="font-medium text-slate-700">{project.client?.primary_contact_name || "Belum ada PIC"}</span>
            </p>
            <p>
              <span className="text-slate-400">Email:</span>{" "}
              <span className="font-medium text-slate-700">{project.client?.primary_contact_email || "-"}</span>
            </p>
          </div>
        </div>

        {/* Project Governance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tata Kelola & PM</span>
            <User className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900">{project.owner?.full_name || "Project Manager"}</h4>
            <p className="text-xs text-slate-500">{project.owner?.email || "Email owner belum tersedia"}</p>
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
            <p>
              <span className="text-slate-400">Tgl Dibuat:</span>{" "}
              <span className="font-medium text-slate-700">{new Date(project.created_at).toLocaleDateString("id-ID")}</span>
            </p>
            <p>
              <span className="text-slate-400">Status Kesehatan:</span>{" "}
              <span className="font-semibold text-emerald-700">{project.health}</span>
            </p>
          </div>
        </div>

        {/* Lifecycle Control */}
        <div className="bg-white rounded-xl border border-sky-200/80 p-5 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">Tahapan Aktif</span>
              <Compass className="w-4 h-4 text-sky-600" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mt-2">{project.lifecycle_stage}</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Transisi tahapan dikontrol ketat sesuai Workflow State Machine.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsTransitionModalOpen(true)}
            className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
          >
            <MoveRight className="w-3.5 h-3.5" />
            <span>Ubah / Majukan Tahapan Proyek</span>
          </button>
        </div>
      </div>

      {/* Activity Timeline Feed */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900">Jejak Aktivitas & Audit Log (Activity Events)</h3>
          </div>
          <span className="text-xs text-slate-400">{project.activities?.length || 0} Event Tercatat</span>
        </div>

        {(!project.activities || project.activities.length === 0) ? (
          <p className="text-xs text-slate-500 py-4 text-center">Belum ada aktivitas tercatat pada proyek ini.</p>
        ) : (
          <div className="space-y-3">
            {project.activities.map((act) => (
              <div key={act.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  PM
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900">{act.event_type}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(act.created_at).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{act.description}</p>
                  {act.event_metadata?.reason && (
                    <p className="text-[11px] text-slate-500 italic mt-1 bg-white p-2 rounded border border-slate-200">
                      Alasan: &quot;{act.event_metadata.reason}&quot;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transition Modal */}
      {isTransitionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Transisi Tahapan Proyek</h3>
              <button
                type="button"
                onClick={() => setIsTransitionModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Tahap saat ini: <span className="font-bold text-slate-800">{project.lifecycle_stage}</span>.
              Sistem akan memvalidasi apakah transisi tujuan diizinkan oleh State Machine.
            </p>

            {transitionError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{transitionError}</span>
              </div>
            )}

            <form onSubmit={handleTransition} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tahap Tujuan *</label>
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                >
                  {stageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.value})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan / Catatan Transisi</label>
                <textarea
                  rows={2}
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                  placeholder="Opsional: Keterangan approval atau pertimbangan transisi..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTransitionModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Memvalidasi..." : "Eksekusi Transisi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
