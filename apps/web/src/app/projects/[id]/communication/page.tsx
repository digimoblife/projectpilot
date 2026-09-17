"use client";

import React, { Suspense, use } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { FileCheck2, MessageSquare } from "lucide-react";
import { CommunicationMeetingsView } from "@/components/communication/CommunicationMeetingsView";
import { CommunicationReportsView } from "@/components/communication/CommunicationReportsView";

type CommTab = "meetings" | "reports";

interface TabConfig {
  key: CommTab;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: TabConfig[] = [
  { key: "meetings", label: "Notulensi Rapat", sublabel: "Catatan & Action Items", icon: MessageSquare },
  { key: "reports", label: "Laporan Status", sublabel: "Mingguan & Bulanan", icon: FileCheck2 },
];

function CommunicationWorkspaceContent({ projectId }: { projectId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab") as CommTab | null;
  const activeTab: CommTab =
    tabParam && ["meetings", "reports"].includes(tabParam)
      ? tabParam
      : "meetings";

  function handleTabChange(tab: CommTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      {/* Workspace Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-900 text-white uppercase tracking-wider">
                Workspace
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Communication & Governance
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Pusat komunikasi resmi proyek: Dokumentasi notulensi rapat, daftar kehadiran, pelacakan action item, dan laporan kemajuan proyek.
            </p>
          </div>
        </div>

        {/* Workspace Sub-domain Navigation Tabs */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                  <div className="flex flex-col items-start leading-tight">
                    <span>{tab.label}</span>
                    <span className={`text-[10px] font-normal ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                      {tab.sublabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

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
