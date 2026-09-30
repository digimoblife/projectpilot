"use client";

import React, { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import { ScrumDailyLogView } from "@/components/scrum/ScrumDailyLogView";
import { ScrumWeeklyReportView } from "@/components/scrum/ScrumWeeklyReportView";

type ScrumTab = "daily" | "weekly";

function ScrumWorkspaceContent({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as ScrumTab | null;
  const activeTab: ScrumTab =
    tabParam && ["daily", "weekly"].includes(tabParam) ? tabParam : "daily";

  return (
    <div className="space-y-6">
      <div className="min-h-[400px]">
        {activeTab === "daily" && <ScrumDailyLogView projectId={projectId} />}
        {activeTab === "weekly" && (
          <ScrumWeeklyReportView projectId={projectId} />
        )}
      </div>
    </div>
  );
}

export default function ProjectScrumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-400">
          Memuat Scrum Log...
        </div>
      }
    >
      <ScrumWorkspaceContent projectId={projectId} />
    </Suspense>
  );
}
