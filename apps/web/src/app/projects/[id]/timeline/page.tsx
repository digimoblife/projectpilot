"use client";

import React, { useState, use } from "react";
import { Calendar, Milestone as MilestoneIcon, Users } from "lucide-react";
import { WorkTimelineView } from "@/components/work/WorkTimelineView";
import { WorkMilestonesView } from "@/components/work/WorkMilestonesView";
import { WorkTeamView } from "@/components/work/WorkTeamView";

type TimelineTab = "timeline" | "milestones" | "team";

export default function ProjectTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [activeTab, setActiveTab] = useState<TimelineTab>("timeline");

  return (
    <div className="space-y-6">
      {/* Compatibility Sub-Navigation */}
      <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 w-fit text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("timeline")}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "timeline" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Timeline & Jadwal</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("milestones")}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "milestones" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <MilestoneIcon className="w-3.5 h-3.5" />
          <span>Milestones</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("team")}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "team" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Alokasi Tim & Workload</span>
        </button>
      </div>

      {activeTab === "timeline" && <WorkTimelineView projectId={projectId} />}
      {activeTab === "milestones" && <WorkMilestonesView projectId={projectId} />}
      {activeTab === "team" && <WorkTeamView projectId={projectId} />}
    </div>
  );
}
