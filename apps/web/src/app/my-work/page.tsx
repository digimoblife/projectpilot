"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  FolderKanban,
  Search,
  ShieldAlert,
  Sparkles,
  Tag,
  User,
  Users,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface MyWorkTask {
  id: string;
  project_id: string;
  project_code: string;
  project_name: string;
  key: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assignee_name: string | null;
  blocker_reason: string | null;
}

const statusConfigs: Record<string, { label: string; color: string }> = {
  BACKLOG: { label: "Backlog", color: "bg-slate-100 text-slate-700 border-slate-200" },
  READY: { label: "Ready", color: "bg-blue-50 text-blue-700 border-blue-200" },
  IN_PROGRESS: { label: "In Progress", color: "bg-amber-50 text-amber-700 border-amber-200" },
  IN_REVIEW: { label: "In Review", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  QA: { label: "QA Testing", color: "bg-purple-50 text-purple-700 border-purple-200" },
  BLOCKED: { label: "Blocked", color: "bg-rose-50 text-rose-700 border-rose-200" },
  DONE: { label: "Done", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const priorityColors: Record<string, string> = {
  CRITICAL: "text-rose-700 bg-rose-50 border-rose-200",
  HIGH: "text-orange-700 bg-orange-50 border-orange-200",
  MEDIUM: "text-blue-700 bg-blue-50 border-blue-200",
  LOW: "text-slate-600 bg-slate-100 border-slate-200",
};

export default function MyWorkPage() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<MyWorkTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchMyWork();
  }, [token]);

  async function fetchMyWork() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<MyWorkTask[]>("/my-work", { headers });
      if (res.data) {
        setTasks(res.data);
      }
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  }

  const activeCount = tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "READY").length;
  const blockedCount = tasks.filter((t) => t.status === "BLOCKED").length;
  const doneCount = tasks.filter((t) => t.status === "DONE").length;

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.project_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "ALL" || t.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tugas Saya (My Work)</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pusat agregasi personal seluruh tugas pengiriman lintas proyek yang ditugaskan kepada Anda.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Tugas</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{tasks.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Sedang Dikerjakan</span>
          <p className="text-xl font-bold text-amber-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Terblokir (Blocked)</span>
          <p className="text-xl font-bold text-rose-600 mt-1">{blockedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Selesai (Done)</span>
          <p className="text-xl font-bold text-emerald-600 mt-1">{doneCount}</p>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama tugas, proyek, atau key..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {["ALL", "IN_PROGRESS", "READY", "BLOCKED", "QA", "DONE"].map((st) => {
            const isSelected = selectedStatus === st;
            const label = st === "ALL" ? "Semua Status" : statusConfigs[st]?.label || st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cross-Project Tasks List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-500">Memuat tugas personal...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FolderKanban className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-900">Tidak ada tugas aktif</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Semua tugas yang ditugaskan kepada Anda akan muncul otomatis pada dashboard ini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const statusConf = statusConfigs[task.status] || {
              label: task.status,
              color: "bg-slate-100 text-slate-700 border-slate-200",
            };

            return (
              <div
                key={task.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {task.key}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      [{task.project_code}] {task.project_name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusConf.color}`}
                    >
                      {statusConf.label}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        priorityColors[task.priority] || "bg-slate-50 text-slate-600"
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900">{task.title}</h3>

                  {task.blocker_reason && (
                    <div className="p-2 rounded bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>Blocker: {task.blocker_reason}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Tenggat: {task.due_date || "Fleksibel"}</span>
                  </div>

                  <Link
                    href={`/projects/${task.project_id}/tasks`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg border border-sky-200 transition-colors"
                  >
                    <span>Buka Task</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
