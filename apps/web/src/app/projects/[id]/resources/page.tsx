"use client";

import React, { Suspense, use } from "react";
import { ResourcesWorkspaceView } from "@/components/resources/ResourcesWorkspaceView";

export default function ProjectResourcesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);

  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat workspace resources...</div>}>
      <ResourcesWorkspaceView projectId={projectId} />
    </Suspense>
  );
}
