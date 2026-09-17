"use client";

import React, { use } from "react";
import { CommunicationMeetingsView } from "@/components/communication/CommunicationMeetingsView";

export default function ProjectMeetingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);

  return <CommunicationMeetingsView projectId={projectId} />;
}
