"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  FileCheck2,
  FileEdit,
  FolderKanban,
  History,
  Milestone as MilestoneIcon,
  MoveRight,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface Activity {
  id: string;
  event_type: string;
  description: string;
  event_metadata: Record<string, any>;
  created_at: string;
  actor?: { full_name: string; role: string };
}

interface ProjectDetail {
  id: string;
  code: string;
  name: string;
  description: string | null;
  lifecycle_stage: string;
  health: string;
  start_date: string | null;
  target_completion_date: string | null;
  created_at: string;
  client: {
    id: string;
    name: string;
    company_name: string;
    industry: string | null;
    primary_contact_name: string | null;
    primary_contact_email: string | null;
  } | null;
  owner: { full_name: string; email: string } | null;
  activities: Activity[];
}

interface Task {
  id: string;
  key: string;
  title: string;
  status: string;
  priority: string;
  estimated_hours: number | null;
  assignee_name: string | null;
  blocker_reason: string | null;
  due_date: string | null;
  epic_id: string | null;
}

interface MilestoneItem {
  id: string;
  name: string;
  description: string | null;
  due_date: string;
  status: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  capacity_hours_per_week: number;
}

interface EpicItem {
  id: string;
  key: string;
  title: string;
  status: string;
}

const stageOptions = [
  { value: "DISCOVERY", label: "Discovery" },
  { value: "REQUIREMENT_DEFINITION", label: "Requirements Definition" },
  { value: "PLANNING", label: "Planning" },
  { value: "AWAITING_CLIENT_APPROVAL", label: "In Progress" },
  { value: "ACTIVE_DELIVERY", label: "Client Review" },
  { value: "HANDOVER", label: "Handover" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { token } = useAuth();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [epics, setEpics] = useState<EpicItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination for Activity Events (5 items per page)
  const [activityPage, setActivityPage] = useState(1);
  const ACTIVITIES_PER_PAGE = 5;

  // Transition state
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [targetStage, setTargetStage] = useState("");
  const [transitionReason, setTransitionReason] = useState("");
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAllProjectData();
  }, [id, token]);

  async function fetchAllProjectData() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [projRes, taskRes, mileRes, memRes, epicRes] = await Promise.all([
        apiClient<ProjectDetail>(`/projects/${id}`, { headers }),
        apiClient<Task[]>(`/projects/${id}/tasks`, { headers }),
        apiClient<MilestoneItem[]>(`/projects/${id}/milestones`, { headers }),
        apiClient<TeamMember[]>(`/projects/${id}/members`, { headers }),
        apiClient<EpicItem[]>(`/projects/${id}/epics`, { headers }),
      ]);

      if (projRes.data) {
        setProject(projRes.data);
        setTargetStage(projRes.data.lifecycle_stage);
      }
      if (taskRes.data) setTasks(taskRes.data);
      if (mileRes.data) setMilestones(mileRes.data);
      if (memRes.data) setMembers(memRes.data);
      if (epicRes.data) setEpics(epicRes.data);
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTransition(e: React.FormEvent) {
    e.preventDefault();
    setTransitionError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<ProjectDetail>(`/projects/${id}/transition`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          target_stage: targetStage,
          reason: transitionReason || null,
        }),
      });

      if (res.data) {
        setIsTransitionModalOpen(false);
        setTransitionReason("");
        fetchAllProjectData();
      } else {
        setTransitionError(res.error || "Gagal mengubah tahapan proyek.");
      }
    } catch {
      setTransitionError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium text-slate-500">Menyiapkan data kokpit proyek...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center text-sm text-rose-500 bg-white rounded-xl border border-rose-200">
        Proyek tidak ditemukan atau telah dihapus.
      </div>
    );
  }

  // Calculated Metrics
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "DONE");
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS");
  const blockedTasks = tasks.filter((t) => t.status === "BLOCKED");
  const taskProgressPercent = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;
  const totalEstDays = tasks.reduce((acc, t) => acc + (t.estimated_hours || 0), 0);

  const totalMilestones = milestones.length;
  const achievedMilestones = milestones.filter((m) => m.status === "ACHIEVED");
  const milestoneProgressPercent = totalMilestones > 0 ? Math.round((achievedMilestones.length / totalMilestones) * 100) : 0;

  // Activities Pagination
  const allActivities = project.activities || [];
  const totalActivities = allActivities.length;
  const totalPages = Math.ceil(totalActivities / ACTIVITIES_PER_PAGE) || 1;
  const startIndex = (activityPage - 1) * ACTIVITIES_PER_PAGE;
  const currentActivities = allActivities.slice(startIndex, startIndex + ACTIVITIES_PER_PAGE);

  return (
    <div className="space-y-5">
      {/* ======================================================================= */}
      {/* 1. TOP PULSE METRICS BAR (4 Kartu Metrik Kunci)                         */}
      {/* ======================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Task Progress */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Progress Tugas</span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <Sliders className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">{taskProgressPercent}%</span>
            <span className="text-xs text-slate-500 font-medium">{doneTasks.length} / {totalTasks} Selesai</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-sky-600 rounded-full transition-all duration-500" style={{ width: `${taskProgressPercent}%` }} />
          </div>
        </div>

        {/* Metric 2: Total Workload */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Beban Kerja</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-indigo-900 tracking-tight">{totalEstDays} Hari</span>
            <span className="text-xs text-slate-500 font-medium">{inProgressTasks.length} Task Aktif</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Dikerjakan oleh</span>
            <strong className="text-slate-700">{members.length} personil tim</strong>
          </div>
        </div>

        {/* Metric 3: Blocker Alert Status */}
        <div className={`p-4 rounded-2xl border shadow-2xs space-y-2 ${
          blockedTasks.length > 0
            ? "bg-rose-50/70 border-rose-200 text-rose-900"
            : "bg-emerald-50/70 border-emerald-200 text-emerald-900"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${blockedTasks.length > 0 ? "text-rose-700" : "text-emerald-700"}`}>
              Status Blocker
            </span>
            <div className={`p-1.5 rounded-lg ${blockedTasks.length > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
              {blockedTasks.length > 0 ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight">
              {blockedTasks.length > 0 ? `${blockedTasks.length} Terhambat` : "0 Blocker"}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              blockedTasks.length > 0 ? "bg-rose-200/80 text-rose-800" : "bg-emerald-200/80 text-emerald-800"
            }`}>
              {blockedTasks.length > 0 ? "Perlu Tindakan" : "Lancar"}
            </span>
          </div>
          <p className="text-[11px] opacity-80 line-clamp-1">
            {blockedTasks.length > 0 ? "Ada kendala teknis yang menghambat tim." : "Tidak ada tiket task yang terblokir saat ini."}
          </p>
        </div>

        {/* Metric 4: Milestones Progress */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Milestones Rilis</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <MilestoneIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">{achievedMilestones.length} / {totalMilestones}</span>
            <span className="text-xs text-amber-700 font-semibold">{milestoneProgressPercent}% Target</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${milestoneProgressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 2. AI EXECUTIVE PULSE & HEALTH SUMMARY                                  */}
      {/* ======================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-4 sm:p-5 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/30 shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-300">Executive Summary & AI Pulse</span>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-sky-400/20 text-sky-200 border border-sky-400/30 font-semibold">
                Live Status
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              {blockedTasks.length > 0
                ? `Proyek berstatus ${project.health}. Terdeteksi ${blockedTasks.length} task yang sedang ter-blocker dan memerlukan eskalasi segera dari Project Manager.`
                : taskProgressPercent >= 100
                ? `Luar biasa! Seluruh ${totalTasks} tugas teknis telah selesai dikerjakan. Proyek siap untuk tahapan validasi dan serah terima akhir.`
                : `Proyek berjalan aktif dengan ${doneTasks.length} dari ${totalTasks} tugas rampung (${taskProgressPercent}%). Sebanyak ${inProgressTasks.length} tugas sedang dikerjakan secara paralel oleh ${members.length} personil tim.`}
            </p>
          </div>
        </div>
        <Link
          href={`/projects/${id}/tasks`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
        >
          <span>Buka Kanban Board</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ======================================================================= */}
      {/* 3. 2-COLUMN OPERATIONAL COCKPIT                                         */}
      {/* ======================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT COLUMN: ACTION ITEMS & ROADMAP (2 COLS) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Active Blockers Widget */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className={`w-4 h-4 ${blockedTasks.length > 0 ? "text-rose-500" : "text-emerald-500"}`} />
                <h3 className="text-sm font-bold text-slate-900">Pusat Perhatian & Kendala Aktif (Blockers)</h3>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                blockedTasks.length > 0 ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}>
                {blockedTasks.length} Terblokir
              </span>
            </div>

            {blockedTasks.length === 0 ? (
              <div className="py-5 text-center rounded-xl bg-emerald-50/40 border border-dashed border-emerald-200/80 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                <h4 className="text-xs font-bold text-emerald-900">Alur Pengerjaan Lancar</h4>
                <p className="text-[11px] text-emerald-700">Tidak ada kendala blocker aktif yang dilaporkan tim.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {blockedTasks.map((t) => (
                  <div key={t.id} className="p-3 rounded-xl bg-rose-50/60 border border-rose-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-rose-800 border border-rose-200">
                          {t.key}
                        </span>
                        <span className="font-semibold text-slate-900">{t.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">PIC: {t.assignee_name || "Unassigned"}</span>
                    </div>
                    {t.blocker_reason && (
                      <p className="text-[11px] text-rose-800 bg-white/80 p-2 rounded-lg border border-rose-100 italic">
                        Kendala: &quot;{t.blocker_reason}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Milestones Radar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MilestoneIcon className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Target Rilis & Milestone Terdekat</h3>
              </div>
              <Link href={`/projects/${id}/timeline`} className="text-xs text-sky-600 hover:underline font-semibold">
                Lihat Jadwal Lengkap &rarr;
              </Link>
            </div>

            {milestones.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center italic">Belum ada milestone yang dijadwalkan.</p>
            ) : (
              <div className="space-y-2.5">
                {milestones.slice(0, 4).map((m) => {
                  const isAchieved = m.status === "ACHIEVED";
                  const isMissed = m.status === "MISSED";

                  return (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${
                          isAchieved ? "bg-emerald-500" : isMissed ? "bg-rose-500" : "bg-amber-500"
                        }`} />
                        <div>
                          <h4 className={`font-semibold ${isAchieved ? "line-through text-slate-400" : "text-slate-900"}`}>
                            {m.name}
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            Deadline: {new Date(m.due_date).toLocaleDateString("id-ID")}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isAchieved
                          ? "bg-emerald-100 text-emerald-800"
                          : isMissed
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {m.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Epics / Module Decomposition Progress */}
          {epics.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-bold text-slate-900">Kemajuan per Modul (Epics WBS)</h3>
                </div>
                <Link href={`/projects/${id}/planning`} className="text-xs text-sky-600 hover:underline font-semibold">
                  Detail Epics &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {epics.map((epic) => {
                  const epicTasks = tasks.filter((t) => t.epic_id === epic.id);
                  const epicDone = epicTasks.filter((t) => t.status === "DONE");
                  const epicPct = epicTasks.length > 0 ? Math.round((epicDone.length / epicTasks.length) * 100) : 0;

                  return (
                    <div key={epic.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-white text-indigo-700 border border-indigo-200">
                          {epic.key}
                        </span>
                        <span className="text-[11px] font-bold text-slate-700">{epicPct}%</span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 truncate">{epic.title}</h4>
                      <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${epicPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: TEAM & STAKEHOLDERS (1 COL) */}
        <div className="space-y-5">
          {/* Team Roster Snapshot */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">Tim Proyek ({members.length})</h3>
              </div>
              <Link href={`/projects/${id}/timeline`} className="text-xs text-sky-600 hover:underline font-semibold">
                Kelola Tim &rarr;
              </Link>
            </div>

            {members.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center italic">Belum ada anggota tim terdaftar.</p>
            ) : (
              <div className="space-y-2">
                {members.map((mem) => {
                  const memberTasks = tasks.filter((t) => t.assignee_name === mem.name && t.status !== "DONE" && t.status !== "CANCELLED");
                  const totalMemberDays = tasks
                    .filter((t) => t.assignee_name === mem.name)
                    .reduce((acc, t) => acc + (t.estimated_hours || 0), 0);

                  return (
                    <div key={mem.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center shrink-0">
                          {mem.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 leading-tight">{mem.name}</h4>
                          <span className="text-[10px] text-slate-400">{mem.role}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-bold text-slate-800 block">{memberTasks.length} Task</span>
                        <span className="text-[10px] text-slate-400">{totalMemberDays} Hari</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Client & PIC Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Klien & Stakeholder</span>
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">{project.client?.name}</h4>
              <p className="text-xs text-slate-500">{project.client?.company_name}</p>
            </div>
            <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
              <p>
                <span className="text-slate-400">PIC Utama:</span>{" "}
                <span className="font-medium text-slate-700">{project.client?.primary_contact_name || "Belum ada PIC"}</span>
              </p>
              <p>
                <span className="text-slate-400">Email:</span>{" "}
                <span className="font-medium text-slate-700">{project.client?.primary_contact_email || "-"}</span>
              </p>
            </div>
          </div>

          {/* Lifecycle & Stage Control Card */}
          <div className="bg-white rounded-2xl border border-sky-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">Tahapan Aktif</span>
              <Compass className="w-4 h-4 text-sky-600" />
            </div>
            <h4 className="text-base font-bold text-slate-900">
              {stageOptions.find((s) => s.value === project.lifecycle_stage)?.label || project.lifecycle_stage}
            </h4>
            <p className="text-[11px] text-slate-500">
              Transisi dikontrol ketat sesuai aturan alur kerja State Machine.
            </p>
            <button
              type="button"
              onClick={() => setIsTransitionModalOpen(true)}
              className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <MoveRight className="w-3.5 h-3.5" />
              <span>Ubah / Majukan Tahapan</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 4. ACTIVITY TIMELINE FEED (PAGINATED 10 ITEMS)                          */}
      {/* ======================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900">Jejak Aktivitas & Audit Log (Activity Events)</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Total {totalActivities} Event Tercatat
          </span>
        </div>

        {totalActivities === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">Belum ada aktivitas tercatat pada proyek ini.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2.5">
              {currentActivities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/60 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    PM
                  </div>
                  <div className="flex-1 space-y-0.5 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-900">{act.event_type}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(act.created_at).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{act.description}</p>
                    {act.event_metadata?.reason && (
                      <p className="text-[11px] text-slate-500 italic mt-1 bg-white p-2 rounded border border-slate-200">
                        Alasan: &quot;{act.event_metadata.reason}&quot;
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap text-xs">
                <span className="text-slate-500 text-[11px]">
                  Menampilkan <strong>{startIndex + 1}</strong> - <strong>{Math.min(startIndex + ACTIVITIES_PER_PAGE, totalActivities)}</strong> dari <strong>{totalActivities}</strong> aktivitas
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={activityPage === 1}
                    onClick={() => setActivityPage((prev) => Math.max(prev - 1, 1))}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setActivityPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                          activityPage === pageNum
                            ? "bg-sky-600 text-white shadow-2xs"
                            : "text-slate-600 hover:bg-slate-100 border border-transparent"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={activityPage === totalPages}
                    onClick={() => setActivityPage((prev) => Math.min(prev + 1, totalPages))}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Halaman Selanjutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================================= */}
      {/* 5. TRANSITION STAGE MODAL                                               */}
      {/* ======================================================================= */}
      {isTransitionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Transisi Tahapan Proyek</h3>
              <button
                type="button"
                onClick={() => setIsTransitionModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Tahap saat ini:{" "}
              <span className="font-bold text-slate-800">
                {stageOptions.find((s) => s.value === project.lifecycle_stage)?.label || project.lifecycle_stage}
              </span>
              . Sistem akan memvalidasi apakah transisi tujuan diizinkan oleh State Machine.
            </p>

            {transitionError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{transitionError}</span>
              </div>
            )}

            <form onSubmit={handleTransition} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tahap Tujuan *</label>
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                >
                  {stageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan / Catatan Transisi</label>
                <textarea
                  rows={2}
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                  placeholder="Opsional: Keterangan approval atau pertimbangan transisi..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTransitionModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Memvalidasi..." : "Eksekusi Transisi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
