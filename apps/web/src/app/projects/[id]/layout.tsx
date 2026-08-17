"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Compass,
  FileCheck2,
  FileText,
  Files,
  FolderKanban,
  HelpCircle,
  Layers,
  LayoutList,
  MessageSquare,
  Milestone,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface ProjectDetail {
  id: string;
  code: string;
  name: string;
  description: string | null;
  lifecycle_stage: string;
  health: string;
  start_date: string | null;
  target_completion_date: string | null;
  client: { name: string; company_name: string } | null;
}

interface EvidenceCitation {
  key: string;
  type: string;
  title: string;
  route: string;
}

interface QAMessage {
  question: string;
  answer: string;
  citations: EvidenceCitation[];
  timestamp: string;
}

interface ProjectQAResponse {
  project_id: string;
  question: string;
  answer: string;
  citations: EvidenceCitation[];
  evidence_count: number;
}

const lifecycleStages = [
  { key: "DISCOVERY", label: "Discovery" },
  { key: "REQUIREMENT_DEFINITION", label: "Requirements" },
  { key: "PLANNING", label: "Planning" },
  { key: "AWAITING_CLIENT_APPROVAL", label: "Menunggu Persetujuan" },
  { key: "ACTIVE_DELIVERY", label: "Delivery Aktif" },
  { key: "HANDOVER", label: "Handover" },
  { key: "COMPLETED", label: "Completed" },
];

export default function ProjectWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const { token } = useAuth();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Q&A Drawer State
  const [isQADrawerOpen, setIsQADrawerOpen] = useState(false);
  const [questionInput, setQuestionInput] = useState("");
  const [qaMessages, setQaMessages] = useState<QAMessage[]>([]);
  const [isAsking, setIsAsking] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [id, token]);

  async function fetchProject() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<ProjectDetail>(`/projects/${id}`, { headers });
      if (res.data) {
        setProject(res.data);
      }
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAskQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!questionInput.trim() || isAsking) return;

    const q = questionInput.trim();
    setQuestionInput("");
    setIsAsking(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<ProjectQAResponse>(`/projects/${id}/qa`, {
        method: "POST",
        headers,
        body: JSON.stringify({ question: q }),
      });

      if (res.data) {
        setQaMessages((prev) => [
          ...prev,
          {
            question: q,
            answer: res.data!.answer,
            citations: res.data!.citations,
            timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch {
      setQaMessages((prev) => [
        ...prev,
        {
          question: q,
          answer: "Maaf, terjadi kendala saat menghubungkan ke asisten AI. Silakan periksa koneksi dan coba ajukan pertanyaan kembali.",
          citations: [],
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  }

  const healthColors: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    HEALTHY: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500", label: "Sehat" },
    WATCH: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", dot: "bg-amber-500", label: "Perhatian" },
    AT_RISK: { bg: "bg-orange-50 border-orange-200", text: "text-orange-700", dot: "bg-orange-500", label: "Beresiko" },
    CRITICAL: { bg: "bg-rose-50 border-rose-200", text: "text-rose-700", dot: "bg-rose-500", label: "Kritis" },
  };

  const currentHealth = project ? healthColors[project.health] || healthColors.HEALTHY : healthColors.HEALTHY;
  const currentStageIndex = project ? lifecycleStages.findIndex((s) => s.key === project.lifecycle_stage) : 0;

  // =========================================================================
  // 6 MAIN WORKFLOW PILLARS (Clean, No-Scroll Navigation)
  // =========================================================================
  const navigationPillars = [
    {
      id: "overview",
      name: "Overview",
      href: `/projects/${id}`,
      icon: LayoutList,
      exactMatchOnly: true,
      subRoutes: [],
    },
    {
      id: "scope",
      name: "Scope & Specs",
      href: `/projects/${id}/discovery`,
      icon: Compass,
      subRoutes: [
        { name: "Discovery & PRD", href: `/projects/${id}/discovery`, icon: Compass },
        { name: "Requirements & ADR", href: `/projects/${id}/requirements`, icon: FileText },
        { name: "Scope Baseline", href: `/projects/${id}/scope`, icon: Layers },
      ],
    },
    {
      id: "planning",
      name: "Planning & Team",
      href: `/projects/${id}/timeline`,
      icon: Milestone,
      subRoutes: [
        { name: "Alokasi Tim & Workload", href: `/projects/${id}/timeline`, icon: Users },
        { name: "Epics & Features", href: `/projects/${id}/planning`, icon: FolderKanban },
      ],
    },
    {
      id: "execution",
      name: "Execution",
      href: `/projects/${id}/tasks`,
      icon: Sliders,
      subRoutes: [
        { name: "Kanban & Tasks", href: `/projects/${id}/tasks`, icon: Sliders },
        { name: "Issues & Risks", href: `/projects/${id}/issues`, icon: ShieldAlert },
      ],
    },
    {
      id: "governance",
      name: "Governance",
      href: `/projects/${id}/meetings`,
      icon: Users,
      subRoutes: [
        { name: "Notulensi Rapat", href: `/projects/${id}/meetings`, icon: MessageSquare },
        { name: "Laporan & Status", href: `/projects/${id}/reports`, icon: FileCheck2 },
      ],
    },
    {
      id: "delivery",
      name: "Delivery & Closing",
      href: `/projects/${id}/documents`,
      icon: ShieldCheck,
      subRoutes: [
        { name: "Dokumen Final", href: `/projects/${id}/documents`, icon: Files },
        { name: "Handover Checklist", href: `/projects/${id}/handover`, icon: ShieldCheck },
      ],
    },
  ];

  // Determine active pillar based on current URL pathname
  const activePillar = navigationPillars.find((pillar) => {
    if (pillar.id === "overview") {
      return pathname === `/projects/${id}`;
    }
    return pillar.subRoutes.some((sub) => pathname.startsWith(sub.href));
  }) || navigationPillars[0];

  return (
    <div className="space-y-4">
      {/* Back Link & Project Top Bar */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Daftar Proyek</span>
          </Link>
        </div>

        {/* Project Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                  {project?.code || "PRJ-..."}
                </span>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {project?.name || "Memuat Proyek..."}
                </h1>
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentHealth.bg} ${currentHealth.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${currentHealth.dot}`} />
                  <span>{currentHealth.label}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                {project?.client && (
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{project.client.company_name || project.client.name}</span>
                  </div>
                )}
                {project?.target_completion_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Target Selesai: {new Date(project.target_completion_date).toLocaleDateString("id-ID")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Floating Q&A Button Trigger */}
            <button
              type="button"
              onClick={() => setIsQADrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4 text-sky-200" />
              <span>Tanya AI Asisten (Project Q&A)</span>
            </button>
          </div>

          {/* Project Lifecycle Progress Bar */}
          <div className="pt-2 border-t border-slate-100">
            {/* Mobile View: Compact Stage Indicator */}
            <div className="sm:hidden space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-medium">
                  Tahap {currentStageIndex + 1} dari {lifecycleStages.length}
                </span>
                <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/60 text-[10px]">
                  {lifecycleStages[currentStageIndex]?.label || "Discovery"}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-600 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStageIndex + 1) / lifecycleStages.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Desktop View: Full 7-Column Grid */}
            <div className="hidden sm:grid grid-cols-7 gap-1">
              {lifecycleStages.map((stage, idx) => {
                const isPast = currentStageIndex > idx;
                const isCurrent = currentStageIndex === idx;

                return (
                  <div key={stage.key} className="flex flex-col items-center gap-1">
                    <div
                      className={`h-2 w-full rounded-full transition-colors ${
                        isCurrent
                          ? "bg-sky-600 shadow-xs"
                          : isPast
                          ? "bg-emerald-500"
                          : "bg-slate-200"
                      }`}
                    />
                    <span
                      className={`text-[10px] text-center font-medium line-clamp-1 ${
                        isCurrent
                          ? "text-sky-700 font-bold"
                          : isPast
                          ? "text-slate-700"
                          : "text-slate-400"
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 2-TIER CLEAN NAVIGATION CONTAINER                                       */}
      {/* ======================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Tier 1: Main Category Pillars (Scrollable on mobile, grid on desktop) */}
        <div className="flex items-center overflow-x-auto lg:grid lg:grid-cols-6 border-b border-slate-100 bg-slate-50/50 p-1.5 gap-1 scrollbar-none">
          {navigationPillars.map((pillar) => {
            const isPillarActive = activePillar.id === pillar.id;
            const Icon = pillar.icon;

            return (
              <Link
                key={pillar.id}
                href={pillar.href}
                className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 lg:shrink whitespace-nowrap ${
                  isPillarActive
                    ? "bg-white text-sky-700 shadow-xs border border-slate-200/80 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isPillarActive ? "text-sky-600" : "text-slate-400"}`} />
                <span>{pillar.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Tier 2: Contextual Sub-Tabs (Rendered when category has sub-modules) */}
        {activePillar.subRoutes.length > 0 && (
          <div className="px-3 sm:px-4 py-2 bg-white flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-0.5">
              Sub-Modul:
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {activePillar.subRoutes.map((sub, sIdx) => {
                const isSubActive = pathname.startsWith(sub.href);
                const SubIcon = sub.icon;

                return (
                  <Link
                    key={sub.name}
                    href={sub.href}
                    className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 whitespace-nowrap ${
                      isSubActive
                        ? "bg-sky-50 text-sky-700 font-semibold border border-sky-200/80 shadow-2xs"
                        : "text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 ${
                      isSubActive ? "bg-sky-600 text-white" : "bg-slate-200 text-slate-600"
                    }`}>
                      {sIdx + 1}
                    </span>
                    <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isSubActive ? "text-sky-600" : "text-slate-400"}`} />
                    <span>{sub.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Workspace Tab Content */}
      <div>{children}</div>

      {/* GROUNDED PROJECT Q&A SLIDE-OVER DRAWER */}
      {isQADrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between border-l border-slate-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-sky-100 text-sky-700 rounded-lg">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">AI Project Q&A Assistant</h3>
                  <p className="text-[10px] text-slate-500">Tergrounded pada data {project?.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQADrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {qaMessages.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <Sparkles className="w-8 h-8 text-sky-400 mx-auto" />
                  <h4 className="text-xs font-bold text-slate-800">Ajukan Pertanyaan tentang Proyek</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    AI Asisten akan menjawab pertanyaan berdasarkan data resmi requirements, tasks, decisions (ADR), blocker, dan meeting notes.
                  </p>
                  <div className="space-y-1.5 pt-2 text-left">
                    <button
                      type="button"
                      onClick={() => setQuestionInput("Apa saja blocker utama yang sedang aktif saat ini?")}
                      className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] text-slate-700"
                    >
                      💡 Apa saja blocker utama yang sedang aktif saat ini?
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuestionInput("Bagaimana keputusan arsitektur (ADR) terkait integrasi backend?")}
                      className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] text-slate-700"
                    >
                      💡 Bagaimana keputusan arsitektur (ADR) terkait integrasi backend?
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {qaMessages.map((msg, idx) => (
                    <div key={idx} className="space-y-2">
                      {/* User Question */}
                      <div className="flex justify-end">
                        <div className="bg-sky-600 text-white rounded-2xl rounded-br-xs px-3.5 py-2 text-xs max-w-[85%] shadow-2xs">
                          {msg.question}
                          <span className="block text-[9px] text-sky-200 text-right mt-0.5">{msg.timestamp}</span>
                        </div>
                      </div>

                      {/* AI Grounded Answer */}
                      <div className="flex justify-start">
                        <div className="bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl rounded-bl-xs p-3.5 text-xs max-w-[95%] space-y-2 shadow-2xs">
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.answer}</p>

                          {/* Citation Chips */}
                          {msg.citations.length > 0 && (
                            <div className="pt-2 border-t border-slate-200/80 space-y-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                Rujukan Bukti Proyek:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {msg.citations.map((c, cIdx) => (
                                  <Link
                                    key={cIdx}
                                    href={c.route}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-sky-700 hover:bg-sky-50 transition-colors font-mono"
                                  >
                                    <span className="font-bold">[{c.key}]</span>
                                    <span className="font-sans line-clamp-1">{c.title}</span>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isAsking && (
                    <div className="flex justify-start">
                      <div className="bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl rounded-bl-xs p-3 text-xs flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 animate-spin text-sky-500" />
                        <span>Menganalisis bukti proyek...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleAskQuestion} className="p-3 border-t border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  placeholder="Ketik pertanyaan tentang proyek..."
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-900"
                />
                <button
                  type="submit"
                  disabled={!questionInput.trim() || isAsking}
                  className="p-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-50"
                  aria-label="Kirim"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
