"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { ResourcesFilesView } from "./ResourcesFilesView";
import { ResourcesLinksView } from "./ResourcesLinksView";
import { ResourcesDeliverablesView } from "./ResourcesDeliverablesView";

export type ResourceTab = "files" | "links" | "deliverables";

export interface ResourcesWorkspaceViewProps {
  projectId: string;
}

export function ResourcesWorkspaceView({ projectId }: ResourcesWorkspaceViewProps) {
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab") as ResourceTab | null;
  const activeTab: ResourceTab =
    tabParam && ["files", "links", "deliverables"].includes(tabParam)
      ? tabParam
      : "files";

  return (
    <div className="space-y-6">
      {/* Scope Boundary Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <p className="text-xs text-slate-500">
          Pusat penyimpanan berkas pendukung, tautan referensi eksternal, dan arsip deliverable resmi proyek.
        </p>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium self-start sm:self-auto shrink-0">
          <ShieldCheck className="w-4 h-4 text-slate-500" />
          <span className="text-[11px]">Organizer & Arsip Statis (Non-DMS)</span>
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
