"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { ResourcesFilesView } from "./ResourcesFilesView";
import { ResourcesLinksView } from "./ResourcesLinksView";
import { ResourcesDeliverablesView } from "./ResourcesDeliverablesView";

export type ResourceTab = "files" | "links";

export interface ResourcesWorkspaceViewProps {
  projectId: string;
}

export function ResourcesWorkspaceView({ projectId }: ResourcesWorkspaceViewProps) {
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab: ResourceTab = tabParam === "links" ? "links" : "files";
  const isLegacyDeliverablesTab = tabParam === "deliverables";

  return (
    <div className="space-y-6">
      {/* Sub-domain Tab Surface */}
      <div className="min-h-[400px]">
        {isLegacyDeliverablesTab ? (
          <ResourcesDeliverablesView projectId={projectId} />
        ) : activeTab === "links" ? (
          <ResourcesLinksView projectId={projectId} />
        ) : (
          <ResourcesFilesView projectId={projectId} />
        )}
      </div>
    </div>
  );
}
