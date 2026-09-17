"use client";

import React, { use } from "react";
import { WorkWBSView } from "@/components/work/WorkWBSView";

export default function ProjectPlanningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);

  return <WorkWBSView projectId={projectId} />;
}
