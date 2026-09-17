"use client";

import React, { Suspense, use } from "react";
import { PRDWorkspaceView } from "@/components/prd/PRDWorkspaceView";

export default function ProjectPRDPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);

  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat workspace PRD...</div>}>
      <PRDWorkspaceView projectId={projectId} />
    </Suspense>
  );
}
