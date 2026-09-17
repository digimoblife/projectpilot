"use client";

import React, { use } from "react";
import { CommunicationReportsView } from "@/components/communication/CommunicationReportsView";

export default function ProjectReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);

  return <CommunicationReportsView projectId={projectId} />;
}
