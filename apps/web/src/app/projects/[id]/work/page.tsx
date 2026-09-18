"use client";

import React, { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";

import { WorkBoardView } from "@/components/work/WorkBoardView";
import { WorkTimelineView } from "@/components/work/WorkTimelineView";
import { WorkMilestonesView } from "@/components/work/WorkMilestonesView";
import { WorkWBSView } from "@/components/work/WorkWBSView";
import { WorkTeamView } from "@/components/work/WorkTeamView";

type WorkTab = "board" | "timeline" | "milestones" | "team";

function WorkWorkspaceContent({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab") as WorkTab | null;
  const activeTab: WorkTab =
    tabParam && ["board", "timeline", "milestones", "team"].includes(tabParam)
      ? tabParam
      : "board";

  return (
    <div className="space-y-6">
      {/* Active Sub-domain Workspace Surface */}
      <div className="min-h-[400px]">
        {activeTab === "board" && (
          <WorkBoardView projectId={projectId} embedded={true} />
        )}
        {activeTab === "timeline" && (
          <WorkTimelineView projectId={projectId} embedded={true} />
        )}
        {activeTab === "milestones" && (
          <WorkMilestonesView projectId={projectId} embedded={true} />
        )}
        {activeTab === "team" && (
          <WorkTeamView projectId={projectId} embedded={true} />
        )}
      </div>
    </div>
  );
}

export default function ProjectWorkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);

  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat workspace Work...</div>}>
      <WorkWorkspaceContent projectId={projectId} />
    </Suspense>
  );
}
