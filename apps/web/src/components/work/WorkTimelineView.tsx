"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Clock,
  GitMerge,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface Task {
  id: string;
  key: string;
  title: string;
  status: string;
  priority: string;
  estimated_hours: number | null;
  start_date: string | null;
  due_date: string | null;
  assignee_name: string | null;
}

interface TaskDependency {
  id: string;
  predecessor_task_id: string;
  successor_task_id: string;
  dependency_type: string;
}

export interface WorkTimelineViewProps {
  projectId: string;
  embedded?: boolean;
}

export function WorkTimelineView({
  projectId,
  embedded = false,
}: WorkTimelineViewProps) {
  const { token } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<"schedule" | "dependencies">("schedule");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Dependency Modal
  const [isCreateDepOpen, setIsCreateDepOpen] = useState(false);
  const [predTaskId, setPredTaskId] = useState("");
  const [succTaskId, setSuccTaskId] = useState("");
  const [depError, setDepError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTimelineData();
  }, [projectId, token]);

  async function fetchTimelineData() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const [tasksRes, depsRes] = await Promise.all([
        apiClient<Task[]>(`/projects/${projectId}/tasks`, { headers }),
        apiClient<TaskDependency[]>(`/projects/${projectId}/task-dependencies`, { headers }),
      ]);
      if (tasksRes.data) setTasks(tasksRes.data);
      if (depsRes.data) setDependencies(depsRes.data);
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateDependency(e: React.FormEvent) {
    e.preventDefault();
    if (predTaskId === succTaskId) {
      setDepError("Predecessor dan Successor tidak boleh merupakan task yang sama.");
      return;
    }
    setDepError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<TaskDependency>(`/projects/${projectId}/task-dependencies`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          predecessor_task_id: predTaskId,
          successor_task_id: succTaskId,
          dependency_type: "FINISH_TO_START",
        }),
      });

      if (res.data) {
        setIsCreateDepOpen(false);
        fetchTimelineData();
      } else {
        setDepError(res.error || "Gagal menautkan dependensi.");
      }
    } catch {
      setDepError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteDependency(depId: string) {
    if (!confirm("Hapus dependensi tugas ini?")) return;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await apiClient(`/projects/${projectId}/task-dependencies/${depId}`, {
        method: "DELETE",
        headers,
      });
      fetchTimelineData();
    } catch {
      // Ignored
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Timeline & Jadwal Pengerjaan</span>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
              {tasks.length} Task Terjadwal
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Visualisasi jadwal tugas, rentang pengerjaan start-to-due, dan grafik dependensi teknis.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sub-view switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs">
            <button
              type="button"
              onClick={() => setActiveSubTab("schedule")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeSubTab === "schedule" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Jadwal Tugas</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("dependencies")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeSubTab === "dependencies" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>Dependensi ({dependencies.length})</span>
            </button>
          </div>

          {activeSubTab === "dependencies" && (
            <button
              type="button"
              onClick={() => {
                setPredTaskId(tasks[0]?.id || "");
                setSuccTaskId(tasks[1]?.id || "");
                setDepError(null);
                setIsCreateDepOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs active:scale-[0.98] transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tautkan Dependensi</span>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-400">Memuat data timeline...</div>
      ) : activeSubTab === "schedule" ? (
        /* SCHEDULE VIEW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Jadwal Tugas Pengiriman (Timeline Schedule)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rentang tanggal kerja dan batas tenggat (deadline) untuk setiap task teknis proyek.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">Belum ada tugas yang terdaftar.</div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                        {task.key}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 truncate">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>
                        PIC: <strong className="text-slate-700">{task.assignee_name || "Unassigned"}</strong>
                      </span>
                      <span>
                        Status: <strong className="text-slate-700">{task.status}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className={task.start_date ? "font-medium text-slate-800" : "text-slate-400"}>
                        {task.start_date ? `Mulai: ${task.start_date}` : "Mulai Fleksibel"}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span
                        className={
                          task.due_date
                            ? "font-bold text-cyan-800 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200"
                            : "text-slate-400"
                        }
                      >
                        {task.due_date ? `Tenggat: ${task.due_date}` : "Tenggat Fleksibel"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* DEPENDENCIES VIEW */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">Pemetaan Dependensi Antar Tugas (Acyclic Graph)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Menghubungkan tugas prasyarat (Predecessor) ke tugas penerus (Successor) untuk mencegah blocker di timeline.
            </p>
          </div>

          {dependencies.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <GitMerge className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-900">Belum ada dependensi tugas</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Gunakan tombol &quot;Tautkan Dependensi&quot; untuk menghubungkan alur tugas yang bergantung satu sama lain.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Tugas Prasyarat (Predecessor)</th>
                    <th className="py-3 px-4">Tipe Hubungan</th>
                    <th className="py-3 px-4">Tugas Penerus (Successor)</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dependencies.map((dep) => {
                    const pred = tasks.find((t) => t.id === dep.predecessor_task_id);
                    const succ = tasks.find((t) => t.id === dep.successor_task_id);

                    return (
                      <tr key={dep.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {pred ? `${pred.key}: ${pred.title}` : "Task"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {dep.dependency_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {succ ? `${succ.key}: ${succ.title}` : "Task"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteDependency(dep.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Dependency Modal */}
      {isCreateDepOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Tautkan Dependensi Tugas</h3>
              <button
                type="button"
                onClick={() => setIsCreateDepOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {depError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{depError}</span>
              </div>
            )}

            <form onSubmit={handleCreateDependency} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tugas Prasyarat (Predecessor) *
                </label>
                <select
                  value={predTaskId}
                  onChange={(e) => setPredTaskId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.key}: {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tugas Penerus (Successor) *
                </label>
                <select
                  value={succTaskId}
                  onChange={(e) => setSuccTaskId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.key}: {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateDepOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Memvalidasi..." : "Tautkan Dependensi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
