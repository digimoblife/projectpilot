"use client";

import React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Archive,
  Files,
  Link2,
  ShieldCheck,
} from "lucide-react";
import { ResourcesFilesView } from "./ResourcesFilesView";
import { ResourcesLinksView } from "./ResourcesLinksView";
import { ResourcesDeliverablesView } from "./ResourcesDeliverablesView";

export type ResourceTab = "files" | "links" | "deliverables";

interface TabConfig {
  key: ResourceTab;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: TabConfig[] = [
  { key: "files", label: "Berkas Proyek", sublabel: "PDF, Dokumen & Aset", icon: Files },
  { key: "links", label: "Tautan Referensi", sublabel: "Figma, Git & Deployment", icon: Link2 },
  { key: "deliverables", label: "Arsip Deliverable", sublabel: "Artefak Ekspor & Rilis", icon: Archive },
];

export interface ResourcesWorkspaceViewProps {
  projectId: string;
}

export function ResourcesWorkspaceView({ projectId }: ResourcesWorkspaceViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab") as ResourceTab | null;
  const activeTab: ResourceTab =
    tabParam && ["files", "links", "deliverables"].includes(tabParam)
      ? tabParam
      : "files";

  function handleTabChange(tab: ResourceTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      {/* Workspace Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-900 text-white uppercase tracking-wider">
                Workspace
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Resources & Arsip Proyek
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Pusat penyimpanan berkas pendukung, tautan referensi eksternal, dan arsip deliverable resmi proyek.
            </p>
          </div>

          {/* Architectural Boundary Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium self-start md:self-auto shrink-0">
            <ShieldCheck className="w-4 h-4 text-slate-500" />
            <span className="text-[11px]">Organizer & Arsip Statis (Non-DMS)</span>
          </div>
        </div>

        {/* Workspace Sub-domain Navigation Tabs */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                  <div className="flex flex-col items-start leading-tight">
                    <span>{tab.label}</span>
                    <span className={`text-[10px] font-normal ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                      {tab.sublabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sub-domain Tab Surface */}
      <div className="min-h-[400px]">
        {activeTab === "files" && <ResourcesFilesView projectId={projectId} />}
        {activeTab === "links" && <ResourcesLinksView projectId={projectId} />}
        {activeTab === "deliverables" && <ResourcesDeliverablesView projectId={projectId} />}
      </div>
    </div>
  );
}
