"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Layers,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { SkeletonMetricsGrid } from "@/components/ui/skeleton-loader";
import { EmptyState } from "@/components/ui/empty-state";

interface AttentionItem {
  id: string;
  project_id: string;
  project_name: string;
  project_code: string;
  category: "OVERDUE_TASK" | "ACTIVE_BLOCKER" | "CLIENT_DEPENDENCY" | "HIGH_ISSUE";
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  due_date: string | null;
  target_url: string;
}

interface ProjectHealthMetrics {
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  blocked_tasks: number;
  active_blockers: number;
  pending_client_dependencies: number;
  overdue_client_dependencies: number;
  unresolved_issues: number;
  critical_issues: number;
  high_issues: number;
  pending_discovery_questions: number;
  pending_action_items: number;
}

interface ProjectHealthCard {
  project_id: string;
  project_name: string;
  project_code: string;
  health_status: "HEALTHY" | "WATCH" | "AT_RISK" | "CRITICAL";
  health_score: number;
  progress_percentage: number;
  metrics: ProjectHealthMetrics;
  health_evidence: string[];
  rules_version: string;
  evaluated_at: string;
}

interface DashboardOverview {
  total_projects: number;
  overdue_tasks_count: number;
  active_blockers_count: number;
  pending_dependencies_count: number;
  unresolved_high_issues_count: number;
  attention_items: AttentionItem[];
  project_health_cards: ProjectHealthCard[];
  rules_version: string;
}

interface AIPMBriefing {
  morning_headline?: string;
  critical_hotspots?: string[];
  key_actions_today?: string[];
  overall_readiness?: string;
  executive_summary?: string;
  top_priorities?: string[];
}

const healthStatusConfigs = {
  HEALTHY: {
    label: "Sehat",
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    description: "Semua deliverable, dependensi, dan timeline berjalan sesuai rencana.",
  },
  WATCH: {
    label: "Perhatian",
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    description: "Perlu perhatian ringan untuk mencegah eskalasi blocker.",
  },
  AT_RISK: {
    label: "Beresiko",
    bg: "bg-orange-50 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
    description: "Terdapat keterlambatan tugas atau isu berprioritas tinggi.",
  },
  CRITICAL: {
    label: "Kritis",
    bg: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
    description: "Terdapat blocker aktif atau akumulasi overdue yang mengancam rilis.",
  },
};

const categoryConfigs = {
  OVERDUE_TASK: { label: "Tugas Terlambat", icon: Clock, color: "text-rose-600 bg-rose-50 border-rose-200" },
  ACTIVE_BLOCKER: { label: "Blocker Aktif", icon: AlertTriangle, color: "text-amber-600 bg-amber-50 border-amber-200" },
  CLIENT_DEPENDENCY: { label: "Menunggu Klien", icon: ShieldAlert, color: "text-sky-600 bg-sky-50 border-sky-200" },
  HIGH_ISSUE: { label: "Isu Prioritas Tinggi", icon: AlertCircle, color: "text-purple-600 bg-purple-50 border-purple-200" },
};

export default function DashboardPage() {
  const { token, user } = useAuth();

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");

  // AI Daily PM Briefing Modal
  const [isAIBriefingOpen, setIsAIBriefingOpen] = useState(false);
  const [aiBriefing, setAiBriefing] = useState<AIPMBriefing | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);

  useEffect(() => {
    fetchOverview();
  }, [token]);

  async function fetchOverview() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<DashboardOverview>("/dashboard/overview", { headers });
      if (res.data) {
        setOverview(res.data);
      }
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerateAIBriefing() {
    setIsAILoading(true);
    setIsAIBriefingOpen(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<{ summary_data: AIPMBriefing }>("/dashboard/ai-summary", {
        method: "POST",
        headers,
      });
      if (res.data) {
        setAiBriefing(res.data.summary_data);
      }
    } catch {
      // Handled
    } finally {
      setIsAILoading(false);
    }
  }

  const filteredAttentionItems = overview?.attention_items.filter((item) => {
    if (selectedCategoryFilter === "ALL") return true;
    return item.category === selectedCategoryFilter;
  }) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">PM Control Center</h1>
          <p className="text-xs text-slate-500 mt-1">
            Pusat kendali operasional harian, deteksi dini risiko delivery, dan kesehatan portfolio proyek.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchOverview}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleGenerateAIBriefing}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Sparkles className="w-4 h-4 text-purple-200" />
            <span>✨ AI Morning Briefing</span>
          </button>
        </div>
      </div>

      {/* 4 Attention Required KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setSelectedCategoryFilter("OVERDUE_TASK")}
          className={`p-4 bg-white rounded-2xl border transition-all cursor-pointer hover:shadow-xs ${
            selectedCategoryFilter === "OVERDUE_TASK" ? "border-rose-500 ring-2 ring-rose-500/10" : "border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">Tugas Terlambat</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {overview?.overdue_tasks_count || 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Melewati estimasi due date</p>
        </div>

        <div
          onClick={() => setSelectedCategoryFilter("ACTIVE_BLOCKER")}
          className={`p-4 bg-white rounded-2xl border transition-all cursor-pointer hover:shadow-xs ${
            selectedCategoryFilter === "ACTIVE_BLOCKER" ? "border-amber-500 ring-2 ring-amber-500/10" : "border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">Blocker Aktif</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {overview?.active_blockers_count || 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Menahan deliverable tim</p>
        </div>

        <div
          onClick={() => setSelectedCategoryFilter("CLIENT_DEPENDENCY")}
          className={`p-4 bg-white rounded-2xl border transition-all cursor-pointer hover:shadow-xs ${
            selectedCategoryFilter === "CLIENT_DEPENDENCY" ? "border-sky-500 ring-2 ring-sky-500/10" : "border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-700">Menunggu Klien</span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-200">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {overview?.pending_dependencies_count || 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Akses, data, atau approval</p>
        </div>

        <div
          onClick={() => setSelectedCategoryFilter("HIGH_ISSUE")}
          className={`p-4 bg-white rounded-2xl border transition-all cursor-pointer hover:shadow-xs ${
            selectedCategoryFilter === "HIGH_ISSUE" ? "border-purple-500 ring-2 ring-purple-500/10" : "border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700">Isu Prioritas Tinggi</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-200">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {overview?.unresolved_high_issues_count || 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Severity High / Critical terbuka</p>
        </div>
      </div>

      {/* Main Grid: Attention Action Feed & Project Health Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Urgent Attention Feed (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Pusat Perhatian Segera (Attention Feed)</h3>
              <span className="text-xs text-slate-500 font-medium">
                {filteredAttentionItems.length} hal memerlukan tindakan hari ini
              </span>
            </div>

            {selectedCategoryFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter("ALL")}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md"
              >
                Reset Filter
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400 my-auto animate-pulse space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto" />
              <div className="h-4 bg-slate-100 rounded w-3/4 mx-auto" />
              <div className="h-4 bg-slate-100 rounded w-2/3 mx-auto" />
            </div>
          ) : filteredAttentionItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-2 my-auto bg-slate-50/50 rounded-xl border border-slate-100">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-semibold text-slate-800">Semua Terkendali</p>
              <p className="text-slate-500 text-[11px]">Tidak ada attention item mendesak pada filter ini.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1 flex-1">
              {filteredAttentionItems.map((item) => {
                const catCfg = categoryConfigs[item.category] || categoryConfigs.OVERDUE_TASK;
                const Icon = catCfg.icon;

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-colors flex items-start justify-between gap-3 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                          {item.project_code}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${catCfg.color}`}>
                          {catCfg.label}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 leading-snug">{item.title}</h4>
                      {item.due_date && (
                        <span className="text-[10px] text-slate-500 block">
                          Target: {new Date(item.due_date).toLocaleDateString("id-ID")}
                        </span>
                      )}
                    </div>

                    <Link
                      href={item.target_url}
                      className="p-1.5 text-slate-400 group-hover:text-blue-600 bg-white rounded-lg border border-slate-200 shrink-0 transition-colors shadow-2xs"
                      title="Buka di Workspace"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Active Project Health Portfolio Cards (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Portfolio Proyek & Status Kesehatan</h3>
              <span className="text-xs text-slate-500 font-medium">
                {overview?.project_health_cards.length || 0} Proyek Terpantau
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400 my-auto">
              Mengevaluasi kesehatan proyek...
            </div>
          ) : overview?.project_health_cards.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 my-auto">
              Belum ada proyek aktif.
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-1 flex-1">
              {overview?.project_health_cards.map((p) => {
                const statusCfg = healthStatusConfigs[p.health_status] || healthStatusConfigs.HEALTHY;
                const isEvidenceExpanded = expandedEvidenceId === p.project_id;

                return (
                  <div
                    key={p.project_id}
                    className="bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/90 p-4 space-y-3.5 transition-colors"
                  >
                    {/* Top Row: Title, Code, Health Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs font-bold text-slate-500">{p.project_code}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${statusCfg.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                            {statusCfg.label} ({p.health_score}/100)
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{p.project_name}</h4>
                      </div>

                      <Link
                        href={`/projects/${p.project_id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 hover:border-blue-200 transition-colors shrink-0 shadow-2xs"
                      >
                        <span>Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Penyelesaian Deliverables</span>
                        <span className="font-bold text-slate-800">{p.progress_percentage}% ({p.metrics.completed_tasks}/{p.metrics.total_tasks} Selesai)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            p.health_status === "CRITICAL"
                              ? "bg-rose-500"
                              : p.health_status === "AT_RISK"
                              ? "bg-orange-500"
                              : p.health_status === "WATCH"
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${p.progress_percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Metric Pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200/60 text-center">
                      <div className="p-2 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                        <span className="text-[10px] text-slate-500 block">Overdue</span>
                        <span className={`text-xs font-bold ${p.metrics.overdue_tasks > 0 ? "text-rose-600" : "text-slate-800"}`}>
                          {p.metrics.overdue_tasks}
                        </span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                        <span className="text-[10px] text-slate-500 block">Blockers</span>
                        <span className={`text-xs font-bold ${p.metrics.active_blockers > 0 ? "text-amber-600" : "text-slate-800"}`}>
                          {p.metrics.active_blockers}
                        </span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                        <span className="text-[10px] text-slate-500 block">Klien Pending</span>
                        <span className="text-xs font-bold text-slate-800">{p.metrics.pending_client_dependencies}</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                        <span className="text-[10px] text-slate-500 block">Isu Terbuka</span>
                        <span className="text-xs font-bold text-slate-800">{p.metrics.unresolved_issues}</span>
                      </div>
                    </div>

                    {/* Deterministic Health Evidence Drawer */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setExpandedEvidenceId(isEvidenceExpanded ? null : p.project_id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                      >
                        <span>Bukti Evaluasi Kesehatan ({p.health_evidence.length})</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isEvidenceExpanded ? "rotate-180" : ""}`} />
                      </button>

                      {isEvidenceExpanded && (
                        <div className="mt-2 p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5 animate-fadeIn">
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">
                            Dasar Penentuan Status (Aturan {p.rules_version}):
                          </span>
                          <ul className="text-slate-700 list-disc list-inside space-y-1">
                            {p.health_evidence.map((ev, idx) => (
                              <li key={idx} className="leading-snug">{ev}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* AI DAILY PM MORNING BRIEFING MODAL */}
      {isAIBriefingOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">AI Portfolio Daily Morning Briefing</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAIBriefingOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isAILoading ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-600 mx-auto" />
                <p>Gemini sedang mensintesis sinyal operasional deterministik seluruh proyek...</p>
              </div>
            ) : aiBriefing ? (
              <div className="space-y-4 text-xs text-slate-800">
                {aiBriefing.morning_headline && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                    <span className="text-[10px] font-bold uppercase text-purple-700 block mb-1">Headline Utama:</span>
                    <p className="font-semibold text-purple-950 leading-relaxed">{aiBriefing.morning_headline}</p>
                  </div>
                )}

                {aiBriefing.critical_hotspots && aiBriefing.critical_hotspots.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-900 block text-xs">Fokus Perhatian Kritis:</span>
                    <ul className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-900 list-disc list-inside space-y-1">
                      {aiBriefing.critical_hotspots.map((hotspot, idx) => (
                        <li key={idx}>{hotspot}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiBriefing.key_actions_today && aiBriefing.key_actions_today.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-900 block text-xs">Prioritas Tindakan Hari Ini:</span>
                    <ul className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 list-disc list-inside space-y-1">
                      {aiBriefing.key_actions_today.map((action, idx) => (
                        <li key={idx}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiBriefing.overall_readiness && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Kesiapan & Stabilitas Delivery:
                    </span>
                    <p className="text-slate-700">{aiBriefing.overall_readiness}</p>
                  </div>
                )}
              </div>
            ) : null}

            <div className="pt-2 flex items-center justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAIBriefingOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs"
              >
                Tutup Briefing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
