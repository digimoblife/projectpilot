"use client";

import React, { useEffect, useState, use } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bug,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Hourglass,
  Layers,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface Issue {
  id: string;
  key: string;
  title: string;
  description: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "IN_INVESTIGATION" | "RESOLVED" | "CLOSED" | "WONT_FIX";
  source_risk_id: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface Risk {
  id: string;
  key: string;
  title: string;
  description: string | null;
  probability: "LOW" | "MEDIUM" | "HIGH";
  impact: "LOW" | "MEDIUM" | "HIGH";
  mitigation_plan: string | null;
  status: "IDENTIFIED" | "MONITORED" | "MATERIALIZED" | "MITIGATED" | "CLOSED";
  materialized_issue_id: string | null;
  created_at: string;
}

interface Blocker {
  id: string;
  key: string;
  title: string;
  description: string | null;
  blocker_type: string;
  status: "ACTIVE" | "RESOLVED" | "ESCALATED";
  task_id: string | null;
  resolution_notes: string | null;
  created_at: string;
}

interface ClientDependency {
  id: string;
  key: string;
  title: string;
  description: string | null;
  dependency_type: string;
  status: "REQUESTED" | "IN_PROGRESS" | "PROVIDED" | "OVERDUE" | "CANCELLED";
  requested_date: string;
  expected_date: string;
  provided_date: string | null;
  impact_summary: string | null;
  waiting_days: number;
  is_overdue: boolean;
}

const severityColors: Record<string, string> = {
  CRITICAL: "bg-rose-100 text-rose-800 border-rose-300",
  HIGH: "bg-orange-100 text-orange-800 border-orange-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  LOW: "bg-blue-100 text-blue-800 border-blue-300",
};

const issueStatusConfigs: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Terbuka", color: "bg-rose-50 text-rose-700 border-rose-200" },
  IN_INVESTIGATION: { label: "Investigasi", color: "bg-amber-50 text-amber-700 border-amber-200" },
  RESOLVED: { label: "Selesai (Resolved)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CLOSED: { label: "Ditutup", color: "bg-slate-100 text-slate-600 border-slate-200" },
  WONT_FIX: { label: "Tidak Diperbaiki", color: "bg-slate-100 text-slate-500 border-slate-200" },
};

const riskStatusConfigs: Record<string, { label: string; color: string }> = {
  IDENTIFIED: { label: "Teridentifikasi", color: "bg-blue-50 text-blue-700 border-blue-200" },
  MONITORED: { label: "Dipantau", color: "bg-amber-50 text-amber-700 border-amber-200" },
  MATERIALIZED: { label: "Termaterialisasi (Issue)", color: "bg-rose-100 text-rose-800 border-rose-300 font-bold" },
  MITIGATED: { label: "Telah Dimitigasi", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CLOSED: { label: "Selesai / Ditutup", color: "bg-slate-100 text-slate-500 border-slate-200" },
};

export default function ProjectIssuesRisksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<"issues" | "risks" | "blockers" | "client_deps">("issues");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [clientDeps, setClientDeps] = useState<ClientDependency[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issueKey, setIssueKey] = useState("");
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDesc, setIssueDesc] = useState("");
  const [issueSeverity, setIssueSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");

  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [riskKey, setRiskKey] = useState("");
  const [riskTitle, setRiskTitle] = useState("");
  const [riskDesc, setRiskDesc] = useState("");
  const [riskProb, setRiskProb] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [riskImpact, setRiskImpact] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [riskMitigation, setRiskMitigation] = useState("");

  const [isClientDepModalOpen, setIsClientDepModalOpen] = useState(false);
  const [cdpKey, setCdpKey] = useState("");
  const [cdpTitle, setCdpTitle] = useState("");
  const [cdpType, setCdpType] = useState("CREDENTIALS");
  const [cdpReqDate, setCdpReqDate] = useState("");
  const [cdpExpDate, setCdpExpDate] = useState("");
  const [cdpImpact, setCdpImpact] = useState("");

  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchIssuesRisksData();
  }, [projectId, token]);

  async function fetchIssuesRisksData() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [issRes, rskRes, blkRes, cdpRes] = await Promise.all([
        apiClient<Issue[]>(`/projects/${projectId}/issues`, { headers }),
        apiClient<Risk[]>(`/projects/${projectId}/risks`, { headers }),
        apiClient<Blocker[]>(`/projects/${projectId}/blockers`, { headers }),
        apiClient<ClientDependency[]>(`/projects/${projectId}/client-dependencies`, { headers }),
      ]);

      if (issRes.data) setIssues(issRes.data);
      if (rskRes.data) setRisks(rskRes.data);
      if (blkRes.data) setBlockers(blkRes.data);
      if (cdpRes.data) setClientDeps(cdpRes.data);
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateIssue(e: React.FormEvent) {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Issue>(`/projects/${projectId}/issues`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          key: issueKey,
          title: issueTitle,
          description: issueDesc || null,
          severity: issueSeverity,
        }),
      });

      if (res.data) {
        setIsIssueModalOpen(false);
        fetchIssuesRisksData();
      } else {
        setModalError(res.error || "Gagal membuat issue.");
      }
    } catch {
      setModalError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateRisk(e: React.FormEvent) {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Risk>(`/projects/${projectId}/risks`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          key: riskKey,
          title: riskTitle,
          description: riskDesc || null,
          probability: riskProb,
          impact: riskImpact,
          mitigation_plan: riskMitigation || null,
        }),
      });

      if (res.data) {
        setIsRiskModalOpen(false);
        fetchIssuesRisksData();
      } else {
        setModalError(res.error || "Gagal membuat risiko.");
      }
    } catch {
      setModalError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMaterializeRisk(riskId: string) {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await apiClient(`/projects/${projectId}/risks/${riskId}/materialize`, {
        method: "POST",
        headers,
      });
      fetchIssuesRisksData();
      setActiveTab("issues");
    } catch {
      // Handle error
    }
  }

  async function handleCreateClientDep(e: React.FormEvent) {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<ClientDependency>(`/projects/${projectId}/client-dependencies`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          key: cdpKey,
          title: cdpTitle,
          dependency_type: cdpType,
          requested_date: cdpReqDate,
          expected_date: cdpExpDate,
          impact_summary: cdpImpact || null,
        }),
      });

      if (res.data) {
        setIsClientDepModalOpen(false);
        fetchIssuesRisksData();
      } else {
        setModalError(res.error || "Gagal membuat dependensi klien.");
      }
    } catch {
      setModalError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateIssueStatus(issueId: string, targetStatus: string) {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await apiClient(`/projects/${projectId}/issues/${issueId}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({ target_status: targetStatus }),
      });
      fetchIssuesRisksData();
    } catch {
      // Handle error
    }
  }

  async function handleMarkClientDepProvided(depId: string) {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await apiClient(`/projects/${projectId}/client-dependencies/${depId}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({ target_status: "PROVIDED" }),
      });
      fetchIssuesRisksData();
    } catch {
      // Handle error
    }
  }

  return (
    <div className="space-y-6">
      {/* Sub-Tab Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        {/* Segmented Sub-Tab Control (Constrained horizontal scroll on mobile) */}
        <div className="w-full sm:w-auto overflow-x-auto scrollbar-none max-w-full pb-1 sm:pb-0">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-max">
            <button
              type="button"
              onClick={() => setActiveTab("issues")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "issues"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Bug className="w-3.5 h-3.5" />
              <span>Log Issue ({issues.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("risks")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "risks"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Matriks Risiko ({risks.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("blockers")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "blockers"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Active Blockers ({blockers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("client_deps")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "client_deps"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Hourglass className="w-3.5 h-3.5" />
              <span>Waiting Matrix ({clientDeps.length})</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
          {activeTab === "issues" && (
            <button
              type="button"
              onClick={() => {
                setIssueKey(`ISS-${issues.length + 1}`.padStart(7, "0"));
                setIssueTitle("");
                setIssueDesc("");
                setIssueSeverity("MEDIUM");
                setModalError(null);
                setIsIssueModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Lapor Issue</span>
            </button>
          )}

          {activeTab === "risks" && (
            <button
              type="button"
              onClick={() => {
                setRiskKey(`RSK-${risks.length + 1}`.padStart(7, "0"));
                setRiskTitle("");
                setRiskDesc("");
                setRiskProb("MEDIUM");
                setRiskImpact("MEDIUM");
                setRiskMitigation("");
                setModalError(null);
                setIsRiskModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Identifikasi Risiko</span>
            </button>
          )}

          {activeTab === "client_deps" && (
            <button
              type="button"
              onClick={() => {
                setCdpKey(`CDP-${clientDeps.length + 1}`.padStart(7, "0"));
                setCdpTitle("");
                setCdpType("CREDENTIALS");
                setCdpReqDate(new Date().toISOString().split("T")[0]);
                setCdpExpDate(new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]);
                setCdpImpact("");
                setModalError(null);
                setIsClientDepModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajukan Dependensi Klien</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: ISSUES LOG */}
      {activeTab === "issues" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">Daftar Kendala & Bug Aktif (Issue Tracking)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Mencatat masalah operasional/teknis yang sedang berlangsung yang membutuhkan perbaikan dan investigasi.
            </p>
          </div>

          {issues.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-900">Tidak ada issue aktif</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Semua sistem dan operasional pengiriman saat ini berjalan lancar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => {
                const conf = issueStatusConfigs[issue.status] || {
                  label: issue.status,
                  color: "bg-slate-100 text-slate-600 border-slate-200",
                };

                return (
                  <div key={issue.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {issue.key}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${severityColors[issue.severity]}`}>
                          {issue.severity}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{issue.title}</h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${conf.color}`}>
                          {conf.label}
                        </span>
                        <select
                          value={issue.status}
                          onChange={(e) => handleUpdateIssueStatus(issue.id, e.target.value)}
                          className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1"
                        >
                          {Object.entries(issueStatusConfigs).map(([val, c]) => (
                            <option key={val} value={val}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {issue.description && (
                      <p className="text-xs text-slate-600">{issue.description}</p>
                    )}

                    {issue.resolution_notes && (
                      <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                        <strong>Catatan Solusi:</strong> {issue.resolution_notes}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Dilaporkan: {new Date(issue.created_at).toLocaleDateString("id-ID")}</span>
                      {issue.source_risk_id && (
                        <span className="text-amber-700 font-semibold">Berasal dari Materialisasi Risiko</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RISKS REGISTRY & MATRIX */}
      {activeTab === "risks" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">Manajemen Risiko & Rencana Mitigasi (Risk Register)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Antisipasi potensi kegagalan delivery sebelum menjadi issue. Risiko dapat dimaterialisasi secara otomatis menjadi Issue.
            </p>
          </div>

          {risks.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-900">Belum ada risiko terdaftar</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Gunakan tombol &quot;Identifikasi Risiko&quot; untuk mencatat potensi hambatan di masa depan.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {risks.map((risk) => {
                const conf = riskStatusConfigs[risk.status] || {
                  label: risk.status,
                  color: "bg-slate-100 text-slate-600 border-slate-200",
                };

                return (
                  <div key={risk.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {risk.key}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${conf.color}`}>
                            {conf.label}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{risk.title}</h4>
                      </div>

                      {risk.status !== "MATERIALIZED" && (
                        <button
                          type="button"
                          onClick={() => handleMaterializeRisk(risk.id)}
                          className="text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded border border-rose-200 transition-colors shrink-0"
                        >
                          Materialize $\rightarrow$ Issue
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-semibold">Probabilitas</span>
                        <span className="font-bold text-slate-800">{risk.probability}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-semibold">Dampak (Impact)</span>
                        <span className="font-bold text-slate-800">{risk.impact}</span>
                      </div>
                    </div>

                    {risk.mitigation_plan && (
                      <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200/80 text-xs text-blue-900">
                        <strong className="block text-[10px] uppercase font-bold text-blue-700">Rencana Mitigasi:</strong>
                        <p className="mt-0.5">{risk.mitigation_plan}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BLOCKERS */}
      {activeTab === "blockers" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">Daftar Roadblock & Blocker Aktif</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Blocker yang menghalangi eksekusi tugas pengiriman secara langsung.
            </p>
          </div>

          {blockers.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-900">Tidak ada blocker</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Semua tugas delivery berjalan tanpa hambatan kritis.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {blockers.map((blk) => (
                <div key={blk.id} className="bg-white rounded-xl border border-rose-200 p-4 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                        {blk.key}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{blk.title}</h4>
                    </div>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      {blk.status}
                    </span>
                  </div>
                  {blk.description && <p className="text-xs text-slate-600">{blk.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CLIENT DEPENDENCIES (WAITING MATRIX) */}
      {activeTab === "client_deps" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">Matriks Dependensi & Kebutuhan Klien (Waiting Matrix)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Melacak durasi penantian (waiting duration) atas aset, kredensial, atau persetujuan yang dibutuhkan dari pihak klien.
            </p>
          </div>

          {clientDeps.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Hourglass className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-900">Belum ada dependensi klien</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Gunakan tombol &quot;Ajukan Dependensi Klien&quot; untuk mencatat permintaan data/akses ke klien.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Key</th>
                    <th className="py-3 px-4">Item Kebutuhan</th>
                    <th className="py-3 px-4">Tipe</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Lama Menunggu</th>
                    <th className="py-3 px-4">Target Serah</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientDeps.map((dep) => {
                    const isProvided = dep.status === "PROVIDED";

                    return (
                      <tr key={dep.id} className={`hover:bg-slate-50/70 ${dep.is_overdue ? "bg-rose-50/30" : ""}`}>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">{dep.key}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{dep.title}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {dep.dependency_type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {isProvided ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Diterima ({dep.provided_date})
                            </span>
                          ) : dep.is_overdue ? (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              Terlambat (Overdue)
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              Menunggu Klien
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900">{dep.waiting_days} hari</span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{dep.expected_date}</td>
                        <td className="py-3 px-4 text-right">
                          {!isProvided && (
                            <button
                              type="button"
                              onClick={() => handleMarkClientDepProvided(dep.id)}
                              className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-200"
                            >
                              Tandai Diterima
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Issue Modal */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Lapor Issue / Kendala Baru</h3>
              <button
                type="button"
                onClick={() => setIsIssueModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateIssue} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key *</label>
                  <input
                    type="text"
                    required
                    value={issueKey}
                    onChange={(e) => setIssueKey(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Issue *</label>
                  <input
                    type="text"
                    required
                    value={issueTitle}
                    onChange={(e) => setIssueTitle(e.target.value)}
                    placeholder="Contoh: Error 500 API Gateway"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Severity *</label>
                <select
                  value={issueSeverity}
                  onChange={(e) => setIssueSeverity(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="CRITICAL">Critical (Sistem Down / Fatal)</option>
                  <option value="HIGH">High (Fitur Utama Terganggu)</option>
                  <option value="MEDIUM">Medium (Kendala Fungsionalitas)</option>
                  <option value="LOW">Low (Minor / Kosmetik)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Detail</label>
                <textarea
                  rows={3}
                  value={issueDesc}
                  onChange={(e) => setIssueDesc(e.target.value)}
                  placeholder="Langkah reproduksi atau dampak teknis..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Issue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Risk Modal */}
      {isRiskModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Identifikasi Risiko Proyek</h3>
              <button
                type="button"
                onClick={() => setIsRiskModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRisk} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key *</label>
                  <input
                    type="text"
                    required
                    value={riskKey}
                    onChange={(e) => setRiskKey(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Risiko *</label>
                  <input
                    type="text"
                    required
                    value={riskTitle}
                    onChange={(e) => setRiskTitle(e.target.value)}
                    placeholder="Contoh: Keterlambatan Integrasi Pihak ke-3"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Probabilitas</label>
                  <select
                    value={riskProb}
                    onChange={(e) => setRiskProb(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dampak (Impact)</label>
                  <select
                    value={riskImpact}
                    onChange={(e) => setRiskImpact(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rencana Mitigasi</label>
                <textarea
                  rows={2}
                  value={riskMitigation}
                  onChange={(e) => setRiskMitigation(e.target.value)}
                  placeholder="Langkah preventif atau alternatif solusi..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRiskModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Risiko"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Client Dep Modal */}
      {isClientDepModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Ajukan Kebutuhan dari Klien</h3>
              <button
                type="button"
                onClick={() => setIsClientDepModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClientDep} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key *</label>
                  <input
                    type="text"
                    required
                    value={cdpKey}
                    onChange={(e) => setCdpKey(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Item Kebutuhan *</label>
                  <input
                    type="text"
                    required
                    value={cdpTitle}
                    onChange={(e) => setCdpTitle(e.target.value)}
                    placeholder="Contoh: Kredensial API Payment Gateway"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipe Kebutuhan</label>
                <select
                  value={cdpType}
                  onChange={(e) => setCdpType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="CREDENTIALS">Kredensial / Akun Akses</option>
                  <option value="API_ACCESS">Dokumentasi & Endpoint API</option>
                  <option value="CONTENT_ASSETS">Aset Desain / Copywriting</option>
                  <option value="APPROVAL_SIGN_OFF">Persetujuan Formal / Sign-off</option>
                  <option value="ENVIRONMENT">Server Staging / Lingkungan Hosting</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Diajukan *</label>
                  <input
                    type="date"
                    required
                    value={cdpReqDate}
                    onChange={(e) => setCdpReqDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Penyerahan *</label>
                  <input
                    type="date"
                    required
                    value={cdpExpDate}
                    onChange={(e) => setCdpExpDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsClientDepModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Dependensi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
