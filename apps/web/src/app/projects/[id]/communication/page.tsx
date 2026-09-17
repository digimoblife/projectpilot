"use client";

import React, { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import { CommunicationMeetingsView } from "@/components/communication/CommunicationMeetingsView";
import { CommunicationReportsView } from "@/components/communication/CommunicationReportsView";

type CommTab = "meetings" | "reports";

function CommunicationWorkspaceContent({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab") as CommTab | null;
  const activeTab: CommTab =
    tabParam && ["meetings", "reports"].includes(tabParam)
      ? tabParam
      : "meetings";

  return (
    <div className="space-y-6">
      {/* Active Sub-domain Workspace Surface */}
      <div className="min-h-[400px]">
        {activeTab === "meetings" && (
          <CommunicationMeetingsView projectId={projectId} embedded={true} />
        )}
        {activeTab === "reports" && (
          <CommunicationReportsView projectId={projectId} embedded={true} />
        )}
      </div>
    </div>
  );
}

export default function ProjectCommunicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);

  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat workspace Communication...</div>}>
      <CommunicationWorkspaceContent projectId={projectId} />
    </Suspense>
  );
}
