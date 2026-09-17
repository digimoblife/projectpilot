"use client";

import React, { use } from "react";
import { WorkBoardView } from "@/components/work/WorkBoardView";

export default function ProjectTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);

  return <WorkBoardView projectId={projectId} />;
}
