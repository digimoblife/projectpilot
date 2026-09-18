"use client";

import React, { Suspense, useEffect, useState, use } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  BookOpen,
  Bot,
  Bug,
  Building2,
  Calendar,
  Check,
  Compass,
  FileCheck2,
  FileText,
  Files,
  FolderTree,
  Hourglass,
  Layers,
  LayoutList,
  Link2,
  MessageSquare,
  Milestone as MilestoneIcon,
  PauseCircle,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface ProjectDetail {
  id: string;
  code: string;
  name: string;
  lifecycle_stage: string;
  health: string;
  health_status?: string;
  client?: {
    id: string;
    name: string;
    company_name: string;
  } | null;
  target_completion_date?: string | null;
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
  { key: "REQUIREMENT_DEFINITION", label: "Requirements Definition" },
  { key: "PLANNING", label: "Planning" },
  { key: "AWAITING_CLIENT_APPROVAL", label: "In Progress" },
  { key: "ACTIVE_DELIVERY", label: "Client Review" },
  { key: "HANDOVER", label: "Handover" },
  { key: "COMPLETED", label: "Completed" },
];

interface NavigationSubRoute {
  name: string;
  href: string;
  sublabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  tabKey?: string;
}

interface NavigationPillar {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exactMatchOnly?: boolean;
  subRoutes: NavigationSubRoute[];
}

function Tier2SubTabsContent({
  activePillar,
  pathname,
}: {
  activePillar: NavigationPillar;
  pathname: string;
}) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  return (
    <div className="p-2 sm:p-2.5 bg-white overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-1.5 pb-0.5 scrollbar-none">
        {activePillar.subRoutes.map((sub) => {
          let isSubActive = false;

          if (sub.tabKey) {
            if (activePillar.id === "work") {
              isSubActive = currentTab ? currentTab === sub.tabKey : sub.tabKey === "board";
            } else if (activePillar.id === "communication") {
              isSubActive = currentTab ? currentTab === sub.tabKey : sub.tabKey === "meetings";
            } else if (activePillar.id === "resources") {
              if (currentTab === "deliverables") {
                isSubActive = sub.tabKey === "files";
              } else {
                isSubActive = currentTab ? currentTab === sub.tabKey : sub.tabKey === "files";
              }
            } else if (activePillar.id === "issues") {
              isSubActive = currentTab ? currentTab === sub.tabKey : sub.tabKey === "issues";
            } else {
              isSubActive = currentTab === sub.tabKey;
            }
          } else {
            isSubActive = pathname.startsWith(sub.href);
          }

          const SubIcon = sub.icon;

          return (
            <Link
              key={sub.name}
              href={sub.href}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer active:scale-[0.98] ${
                isSubActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
              }`}
            >
              <SubIcon className={`w-4 h-4 ${isSubActive ? "text-white" : "text-slate-500"}`} />
              <div className="flex flex-col items-start leading-tight">
                <span>{sub.name}</span>
                {sub.sublabel && (
                  <span className={`text-[10px] font-normal ${isSubActive ? "text-slate-300" : "text-slate-400"}`}>
                    {sub.sublabel}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

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
  const isSpecialState = project?.lifecycle_stage === "ON_HOLD" || project?.lifecycle_stage === "CANCELLED";
  const safeIndex = currentStageIndex >= 0 ? currentStageIndex : 0;
  const progressPercent = Math.round(((safeIndex + 1) / lifecycleStages.length) * 100);

  // =========================================================================
  // 8 ARCHITECTURAL PILLARS (Clean, No-Scroll Navigation)
  // =========================================================================
  const navigationPillars: NavigationPillar[] = [
    {
      id: "overview",
      name: "Overview",
      href: `/projects/${id}`,
      icon: LayoutList,
      exactMatchOnly: true,
      subRoutes: [],
    },
    {
      id: "discovery-scope",
      name: "Discovery & Scope",
      href: `/projects/${id}/discovery`,
      icon: Compass,
      subRoutes: [
        { name: "Brief & Discovery", href: `/projects/${id}/discovery`, sublabel: "Kuesioner & Brief", icon: Compass },
        { name: "Requirements & ADR", href: `/projects/${id}/requirements`, sublabel: "Spesifikasi & Keputusan", icon: FileText },
        { name: "Scope Baseline", href: `/projects/${id}/scope`, sublabel: "Batasan & Perubahan", icon: Layers },
      ],
    },
    {
      id: "prd",
      name: "PRD",
      href: `/projects/${id}/prd`,
      icon: BookOpen,
      subRoutes: [],
    },
    {
      id: "work",
      name: "Work",
      href: `/projects/${id}/work`,
      icon: Sliders,
      subRoutes: [
        { name: "Board", href: `/projects/${id}/work?tab=board`, sublabel: "Kanban & Tasks", icon: Sliders, tabKey: "board" },
        { name: "Timeline", href: `/projects/${id}/work?tab=timeline`, sublabel: "Jadwal & Dependensi", icon: Calendar, tabKey: "timeline" },
        { name: "Milestones", href: `/projects/${id}/work?tab=milestones`, sublabel: "Gate Pengiriman", icon: MilestoneIcon, tabKey: "milestones" },
        { name: "Team & Capacity", href: `/projects/${id}/work?tab=team`, sublabel: "Alokasi Personel", icon: Users, tabKey: "team" },
      ],
    },
    {
      id: "issues",
      name: "Issues",
      href: `/projects/${id}/issues`,
      icon: ShieldAlert,
      subRoutes: [
        { name: "Log Issue", href: `/projects/${id}/issues?tab=issues`, sublabel: "Pelacak Isu Teknis", icon: Bug, tabKey: "issues" },
        { name: "Active Blockers", href: `/projects/${id}/issues?tab=blockers`, sublabel: "Eskalasi & Hambatan", icon: ShieldAlert, tabKey: "blockers" },
        { name: "Waiting Matrix", href: `/projects/${id}/issues?tab=client_deps`, sublabel: "Ketergantungan Klien", icon: Hourglass, tabKey: "client_deps" },
      ],
    },
    {
      id: "communication",
      name: "Communication",
      href: `/projects/${id}/communication`,
      icon: MessageSquare,
      subRoutes: [
        { name: "Notulensi Rapat", href: `/projects/${id}/communication?tab=meetings`, sublabel: "Catatan & Action Items", icon: MessageSquare, tabKey: "meetings" },
        { name: "Laporan Status", href: `/projects/${id}/communication?tab=reports`, sublabel: "Mingguan & Bulanan", icon: FileCheck2, tabKey: "reports" },
      ],
    },
    {
      id: "resources",
      name: "Resources",
      href: `/projects/${id}/resources`,
      icon: Files,
      subRoutes: [
        { name: "Berkas Proyek", href: `/projects/${id}/resources?tab=files`, sublabel: "PDF, Dokumen & Aset", icon: Files, tabKey: "files" },
        { name: "Tautan Referensi", href: `/projects/${id}/resources?tab=links`, sublabel: "Figma, Git & Deployment", icon: Link2, tabKey: "links" },
      ],
    },
    {
      id: "delivery",
      name: "Delivery",
      href: `/projects/${id}/handover`,
      icon: ShieldCheck,
      subRoutes: [],
    },
  ];

  // Determine active pillar based on current URL pathname
  const activePillar = navigationPillars.find((pillar) => {
    if (pillar.id === "overview") {
      return pathname === `/projects/${id}`;
    }
    if (pillar.id === "discovery-scope") {
      return (
        pathname.startsWith(`/projects/${id}/discovery`) ||
        pathname.startsWith(`/projects/${id}/requirements`) ||
        pathname.startsWith(`/projects/${id}/scope`)
      );
    }
    if (pillar.id === "prd") {
      return pathname.startsWith(`/projects/${id}/prd`);
    }
    if (pillar.id === "work") {
      return (
        pathname.startsWith(`/projects/${id}/work`) ||
        pathname.startsWith(`/projects/${id}/tasks`) ||
        pathname.startsWith(`/projects/${id}/timeline`) ||
        pathname.startsWith(`/projects/${id}/planning`)
      );
    }
    if (pillar.id === "issues") {
      return pathname.startsWith(`/projects/${id}/issues`);
    }
    if (pillar.id === "communication") {
      return (
        pathname.startsWith(`/projects/${id}/communication`) ||
        pathname.startsWith(`/projects/${id}/meetings`) ||
        pathname.startsWith(`/projects/${id}/reports`)
      );
    }
    if (pillar.id === "resources") {
      return pathname.startsWith(`/projects/${id}/resources`);
    }
    if (pillar.id === "delivery") {
      return (
        pathname.startsWith(`/projects/${id}/delivery`) ||
        pathname.startsWith(`/projects/${id}/handover`)
      );
    }
    return pillar.subRoutes.some((sub) => pathname.startsWith(sub.href));
  });

  return (
    <div className="space-y-3 sm:space-y-3.5 max-w-full min-w-0 overflow-x-clip">
      {/* Back Link & Project Top Bar */}
      <div className="flex flex-col gap-2">
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
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                  {project?.code || "PRJ-..."}
                </span>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {project?.name || "Memuat Proyek..."}
                </h1>
                <div
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold border ${currentHealth.bg} ${currentHealth.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${currentHealth.dot}`} />
                  <span>{currentHealth.label}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 text-xs text-slate-500 pt-0.5">
                {project?.client && (
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{project.client.company_name || project.client.name}</span>
                  </div>
                )}
                {project?.target_completion_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Target Selesai: {new Date(project.target_completion_date).toLocaleDateString("id-ID")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Floating Q&A Button Trigger */}
            <button
              type="button"
              onClick={() => setIsQADrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer shrink-0 self-start md:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
              <span>Tanya Asisten (Project Q&A)</span>
            </button>
          </div>

          {/* Project Lifecycle Progress Pipeline */}
          <div className="pt-3 border-t border-slate-100">
            {isSpecialState ? (
              project?.lifecycle_stage === "ON_HOLD" ? (
                <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs">
                  <div className="flex items-center gap-2.5 text-amber-900 font-semibold">
                    <PauseCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span>Proyek Sedang Ditahan (On Hold)</span>
                      <p className="text-[11px] font-normal text-amber-700 mt-0.5">
                        Aktivitas pengerjaan dijeda sementara. Anda dapat melanjutkan tahapan melalui menu Transisi Tahapan.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-100/80 text-amber-800 rounded-lg font-bold text-[10px] border border-amber-300 shrink-0">
                    ON HOLD
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-rose-50/90 border border-rose-200/90 rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs">
                  <div className="flex items-center gap-2.5 text-rose-900 font-semibold">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <span>Proyek Dibatalkan (Cancelled)</span>
                      <p className="text-[11px] font-normal text-rose-700 mt-0.5">
                        Proyek ini telah ditutup atau dibatalkan secara resmi.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-rose-100/80 text-rose-800 rounded-lg font-bold text-[10px] border border-rose-300 shrink-0">
                    CANCELLED
                  </span>
                </div>
              )
            ) : (
              <div className="space-y-3">
                {/* Status Header Bar */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Tahapan
                    </span>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-semibold text-xs shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{lifecycleStages[safeIndex]?.label || "Discovery"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                    <span className="font-semibold text-slate-700">{progressPercent}%</span>
                    <span>•</span>
                    <span>Langkah {safeIndex + 1} dari {lifecycleStages.length}</span>
                  </div>
                </div>

                {/* Mobile View: Compact Progress Bar */}
                <div className="md:hidden space-y-1.5">
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-slate-900 rounded-full transition-all duration-500 shadow-2xs"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Mulai: Discovery</span>
                    <span>Target: Completed</span>
                  </div>
                </div>

                {/* Desktop View: Interactive Connected Stepper Track */}
                <div className="hidden md:block">
                  <div className="grid grid-cols-7 gap-0 relative">
                    {lifecycleStages.map((stage, idx) => {
                      const isPast = safeIndex > idx;
                      const isCurrent = safeIndex === idx;

                      return (
                        <div key={stage.key} className="relative flex flex-col items-center group">
                          {/* Connector line left */}
                          {idx > 0 && (
                            <div
                              className={`absolute top-3 right-1/2 left-0 h-0.5 transition-colors duration-300 ${
                                isPast || isCurrent ? "bg-emerald-500" : "bg-slate-200"
                              }`}
                            />
                          )}

                          {/* Connector line right */}
                          {idx < lifecycleStages.length - 1 && (
                            <div
                              className={`absolute top-3 left-1/2 right-0 h-0.5 transition-colors duration-300 ${
                                isPast ? "bg-emerald-500" : "bg-slate-200"
                              }`}
                            />
                          )}

                          {/* Node Icon Circle */}
                          <div className="relative z-10">
                            {isPast ? (
                              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs transition-transform duration-200 group-hover:scale-110">
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              </div>
                            ) : isCurrent ? (
                              <div className="relative flex items-center justify-center">
                                <span className="absolute -inset-1 rounded-full bg-blue-500/25 animate-ping" />
                                <div className="relative w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shadow-xs ring-2 ring-blue-500/80 ring-offset-2 ring-offset-white">
                                  {idx + 1}
                                </div>
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-white text-slate-400 border border-slate-200 flex items-center justify-center text-[10px] font-semibold transition-colors group-hover:border-slate-300 group-hover:text-slate-600">
                                {idx + 1}
                              </div>
                            )}
                          </div>

                          {/* Step Label & Subtitle */}
                          <div className="mt-2 flex flex-col items-center text-center px-1">
                            <span
                              className={`text-[11px] leading-tight transition-colors ${
                                isCurrent
                                  ? "text-slate-900 font-bold"
                                  : isPast
                                  ? "text-slate-700 font-semibold"
                                  : "text-slate-400 font-medium"
                              }`}
                            >
                              {stage.label}
                            </span>
                            <span
                              className={`text-[9px] mt-0.5 tracking-tight font-medium ${
                                isCurrent
                                  ? "text-blue-600 font-bold"
                                  : isPast
                                  ? "text-emerald-600"
                                  : "text-slate-400"
                              }`}
                            >
                              {isCurrent ? "Sedang Aktif" : isPast ? "Selesai" : "Akan Datang"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 2-TIER CLEAN NAVIGATION CONTAINER                                       */}
      {/* ======================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Tier 1: Main Category Pillars (Scrollable on mobile, responsive grid on desktop) */}
        <div className="flex items-center overflow-x-auto lg:grid lg:grid-cols-4 xl:grid-cols-8 border-b border-slate-100 bg-slate-50/50 p-1.5 gap-1 scrollbar-none">
          {navigationPillars.map((pillar) => {
            const isPillarActive = activePillar?.id === pillar.id;
            const Icon = pillar.icon;

            return (
              <Link
                key={pillar.id}
                href={pillar.href}
                className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 lg:shrink whitespace-nowrap active:scale-[0.98] ${
                  isPillarActive
                    ? "bg-white text-slate-900 shadow-xs border border-slate-300 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isPillarActive ? "text-slate-900" : "text-slate-400"}`} />
                <span>{pillar.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Tier 2: Contextual Sub-Tabs (Rendered when category has sub-modules) */}
        {activePillar && activePillar.subRoutes.length > 0 && (
          <Suspense fallback={<div className="h-12 bg-white" />}>
            <Tier2SubTabsContent activePillar={activePillar} pathname={pathname} />
          </Suspense>
        )}
      </div>

      {/* Main Workspace Tab Content */}
      <div className="min-w-0 max-w-full">{children}</div>

      {/* GROUNDED PROJECT Q&A SLIDE-OVER DRAWER */}
      {isQADrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between border-l border-slate-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-900 text-white rounded-lg">
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
                  <Sparkles className="w-8 h-8 text-slate-400 mx-auto" />
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
                        <div className="bg-slate-900 text-white rounded-2xl rounded-br-xs px-3.5 py-2 text-xs max-w-[85%] shadow-2xs">
                          {msg.question}
                          <span className="block text-[9px] text-slate-300 text-right mt-0.5">{msg.timestamp}</span>
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
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-900 hover:bg-slate-100 transition-colors font-mono font-medium"
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
                        <Sparkles className="w-3.5 h-3.5 animate-spin text-slate-900" />
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
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-slate-900"
                />
                <button
                  type="submit"
                  disabled={!questionInput.trim() || isAsking}
                  className="p-2 bg-slate-900 hover:bg-black text-white rounded-xl shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
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
