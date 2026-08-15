"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
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
  ShieldAlert,
  Sliders,
  Users,
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

const lifecycleStages = [
  { key: "DISCOVERY", label: "Discovery" },
  { key: "REQUIREMENT_DEFINITION", label: "Requirements" },
  { key: "PLANNING", label: "Planning" },
  { key: "AWAITING_CLIENT_APPROVAL", label: "Approval" },
  { key: "ACTIVE_DELIVERY", label: "Active Delivery" },
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

  useEffect(() => {
    fetchProject();
  }, [id, token]);

  async function fetchProject() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await apiClient<ProjectDetail>(`/projects/${id}`, { headers });
    if (res.data) {
      setProject(res.data);
    }
    setIsLoading(false);
  }

  const navTabs = [
    { name: "Overview", href: `/projects/${id}`, icon: Compass },
    { name: "Discovery", href: `/projects/${id}/discovery`, icon: HelpCircle },
    { name: "Requirements", href: `/projects/${id}/requirements`, icon: FileText },
    { name: "Scope", href: `/projects/${id}/scope`, icon: Sliders },
    { name: "Planning", href: `/projects/${id}/planning`, icon: Layers },
    { name: "Tasks", href: `/projects/${id}/tasks`, icon: LayoutList },
    { name: "Timeline", href: `/projects/${id}/timeline`, icon: Milestone },
    { name: "Meetings", href: `/projects/${id}/meetings`, icon: MessageSquare },
    { name: "Issues & Risks", href: `/projects/${id}/issues`, icon: ShieldAlert },
    { name: "Reports", href: `/projects/${id}/reports`, icon: FileCheck2 },
    { name: "Documents", href: `/projects/${id}/documents`, icon: Files },
    { name: "Handover", href: `/projects/${id}/handover`, icon: Users },
  ];

  const currentStageIndex = lifecycleStages.findIndex((s) => s.key === project?.lifecycle_stage);

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Daftar Proyek</span>
        </Link>
      </div>

      {/* Project Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
                {project?.code || "PRJ"}
              </span>
              <span className="text-xs font-medium text-slate-500">
                {project?.client?.name} ({project?.client?.company_name})
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {project?.name || (isLoading ? "Memuat Proyek..." : "Proyek")}
            </h1>
            <p className="text-xs text-slate-500 max-w-2xl">
              {project?.description || "Workspace operasional terpusat ProjectPilot."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Target: {project?.target_completion_date || "Fleksibel"}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-emerald-700">Health: {project?.health || "HEALTHY"}</span>
            </div>
          </div>
        </div>

        {/* Lifecycle Progression Tracker */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Siklus Hidup Proyek</span>
            <span className="text-sky-700 font-medium">
              Tahap Aktif: {lifecycleStages.find((s) => s.key === project?.lifecycle_stage)?.label || project?.lifecycle_stage}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
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

      {/* 12-Tab Subnavigation */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-1.5 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {navTabs.map((tab) => {
            const isExactMatch = pathname === tab.href;
            const isSubMatch = tab.name !== "Overview" && pathname.startsWith(tab.href);
            const isActive = isExactMatch || isSubMatch;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-sky-50 text-sky-700 font-semibold shadow-2xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-sky-600" : "text-slate-400"}`} />
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Workspace Tab Content */}
      <div>{children}</div>
    </div>
  );
}
