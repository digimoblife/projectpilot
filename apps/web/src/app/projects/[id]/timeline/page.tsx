"use client";

import React, { useEffect, useState, use } from "react";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Flag,
  GitCommit,
  GitMerge,
  Layers,
  Milestone as MilestoneIcon,
  Plus,
  ShieldAlert,
  Trash2,
  User,
  Users,
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
  start_date: string | null;
  due_date: string | null;
  assignee_name: string | null;
}

interface Milestone {
  id: string;
  key: string;
  title: string;
  description: string | null;
  target_date: string;
  actual_date: string | null;
  status: "PLANNED" | "ACHIEVED" | "MISSED" | "CANCELLED";
}

interface TaskDependency {
  id: string;
  predecessor_task_id: string;
  successor_task_id: string;
  dependency_type: string;
}

interface ProjectMember {
  id: string;
  name: string;
  email: string | null;
  role: string;
  capacity_hours_per_week: number;
}

const milestoneStatusConfigs: Record<string, { label: string; color: string }> = {
  PLANNED: { label: "Direncanakan", color: "bg-blue-50 text-blue-700 border-blue-200" },
  ACHIEVED: { label: "Tercapai (Achieved)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  MISSED: { label: "Terlewat (Missed)", color: "bg-rose-50 text-rose-700 border-rose-200" },
  CANCELLED: { label: "Dibatalkan", color: "bg-slate-100 text-slate-500 border-slate-200" },
};

export default function ProjectTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<"timeline" | "dependencies" | "team">("timeline");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Milestone Modal
  const [isCreateMlsOpen, setIsCreateMlsOpen] = useState(false);
  const [mlsKey, setMlsKey] = useState("");
  const [mlsTitle, setMlsTitle] = useState("");
  const [mlsTargetDate, setMlsTargetDate] = useState("");
  const [mlsDesc, setMlsDesc] = useState("");
  const [mlsError, setMlsError] = useState<string | null>(null);

  // Create Dependency Modal
  const [isCreateDepOpen, setIsCreateDepOpen] = useState(false);
  const [predTaskId, setPredTaskId] = useState("");
  const [succTaskId, setSuccTaskId] = useState("");
  const [depError, setDepError] = useState<string | null>(null);

  // Add Member Modal
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("DEVELOPER");
  const [memberHours, setMemberHours] = useState("40");
  const [memberError, setMemberError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTimelineData();
  }, [projectId, token]);

  async function fetchTimelineData() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [tasksRes, mlsRes, depsRes, memsRes] = await Promise.all([
        apiClient<Task[]>(`/projects/${projectId}/tasks`, { headers }),
        apiClient<Milestone[]>(`/projects/${projectId}/milestones`, { headers }),
        apiClient<TaskDependency[]>(`/projects/${projectId}/task-dependencies`, { headers }),
        apiClient<ProjectMember[]>(`/projects/${projectId}/members`, { headers }),
      ]);

      if (tasksRes.data) setTasks(tasksRes.data);
      if (mlsRes.data) setMilestones(mlsRes.data);
      if (depsRes.data) setDependencies(depsRes.data);
      if (memsRes.data) setMembers(memsRes.data);
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateMilestone(e: React.FormEvent) {
    e.preventDefault();
    setMlsError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Milestone>(`/projects/${projectId}/milestones`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          key: mlsKey,
          title: mlsTitle,
          target_date: mlsTargetDate,
          description: mlsDesc || null,
        }),
      });

      if (res.data) {
        setIsCreateMlsOpen(false);
        resetMlsForm();
        fetchTimelineData();
      } else {
        setMlsError(res.error || "Gagal membuat Milestone.");
      }
    } catch {
      setMlsError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
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
      setDepError("Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteDependency(depId: string) {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await apiClient(`/projects/${projectId}/task-dependencies/${depId}`, {
        method: "DELETE",
        headers,
      });
      fetchTimelineData();
    } catch {
      // Handle error
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setMemberError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<ProjectMember>(`/projects/${projectId}/members`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: memberName,
          email: memberEmail || null,
          role: memberRole,
          capacity_hours_per_week: memberHours ? parseFloat(memberHours) : 40.0,
        }),
      });

      if (res.data) {
        setIsAddMemberOpen(false);
        resetMemberForm();
        fetchTimelineData();
      } else {
        setMemberError(res.error || "Gagal menambahkan anggota tim.");
      }
    } catch {
      setMemberError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteMember(memberId: string) {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await apiClient(`/projects/${projectId}/members/${memberId}`, {
        method: "DELETE",
        headers,
      });
      fetchTimelineData();
    } catch {
      // Handle error
    }
  }

  function resetMlsForm() {
    setMlsKey(`MLS-${milestones.length + 1}`.padStart(7, "0"));
    setMlsTitle("");
    setMlsTargetDate("");
    setMlsDesc("");
    setMlsError(null);
  }

  function resetMemberForm() {
    setMemberName("");
    setMemberEmail("");
    setMemberRole("DEVELOPER");
    setMemberHours("40");
    setMemberError(null);
  }

  return (
    <div className="space-y-6">
      {/* Sub-Tab Navigation Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === "timeline"
                ? "bg-cyan-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>1. Timeline & Milestone ({milestones.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dependencies")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === "dependencies"
                ? "bg-cyan-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>2. Task Dependencies ({dependencies.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("team")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === "team"
                ? "bg-cyan-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>3. Alokasi Tim & Workload ({members.length})</span>
          </button>
        </div>

        {activeTab === "timeline" && (
          <button
            type="button"
            onClick={() => {
              resetMlsForm();
              setIsCreateMlsOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Milestone</span>
          </button>
        )}

        {activeTab === "dependencies" && (
          <button
            type="button"
            onClick={() => {
              setPredTaskId(tasks[0]?.id || "");
              setSuccTaskId(tasks[1]?.id || "");
              setDepError(null);
              setIsCreateDepOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tautkan Dependensi</span>
          </button>
        )}

        {activeTab === "team" && (
          <button
            type="button"
            onClick={() => {
              resetMemberForm();
              setIsAddMemberOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Anggota Tim</span>
          </button>
        )}
      </div>

      {/* TAB 1: TIMELINE & MILESTONES */}
      {activeTab === "timeline" && (
        <div className="space-y-5">
          {/* Milestones Horizontal Tracker */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Gate Milestone Pengiriman</h3>
            {milestones.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">Belum ada milestone yang dibuat untuk proyek ini.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {milestones.map((mls) => {
                  const conf = milestoneStatusConfigs[mls.status] || {
                    label: mls.status,
                    color: "bg-slate-100 text-slate-700 border-slate-200",
                  };
                  return (
                    <div key={mls.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-cyan-800 border border-slate-200">
                          {mls.key}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${conf.color}`}>
                          {conf.label}
                        </span>
                      </div>
                      <h4 className="font-semibold text-xs text-slate-900 line-clamp-1">{mls.title}</h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Target: {mls.target_date}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Scheduled Tasks Timeline View */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Jadwal Tugas Pengiriman (Timeline Schedule)</h3>
            </div>

            <div className="divide-y divide-slate-100">
              {tasks.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">Belum ada tugas yang terdaftar.</div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="p-4 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-700">{task.key}</span>
                        <span className="text-xs font-semibold text-slate-900">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span>PIC: {task.assignee_name || "Unassigned"}</span>
                        <span>Status: <strong className="text-slate-700">{task.status}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {task.start_date || "Mulai Fleksibel"} $\rightarrow$ {task.due_date || "Tenggat Fleksibel"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TASK DEPENDENCIES */}
      {activeTab === "dependencies" && (
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
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

      {/* TAB 3: TEAM ALLOCATION & WORKLOAD */}
      {activeTab === "team" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">Matriks Alokasi & Beban Kerja Tim</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pemantauan tugas aktif, kapasitas jam mingguan, dan potensi kelebihan beban anggota tim.
            </p>
          </div>

          {members.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-900">Belum ada anggota tim</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Gunakan tombol &quot;Tambah Anggota Tim&quot; untuk mendaftarkan staf developer, QA, atau designer proyek ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((mem) => {
                const assignedTasks = tasks.filter((t) => t.assignee_name === mem.name);
                const activeTasks = assignedTasks.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED");

                return (
                  <div key={mem.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-800 font-bold text-xs flex items-center justify-center">
                          {mem.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900">{mem.name}</h4>
                          <p className="text-[11px] text-slate-500">{mem.role}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteMember(mem.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-semibold">Tugas Aktif</span>
                        <span className="font-bold text-slate-900 text-sm">{activeTasks.length} Task</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-semibold">Kapasitas</span>
                        <span className="font-bold text-slate-900 text-sm">{mem.capacity_hours_per_week}h/mgg</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Milestone Modal */}
      {isCreateMlsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Tambah Milestone Proyek</h3>
              <button
                type="button"
                onClick={() => setIsCreateMlsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {mlsError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{mlsError}</span>
              </div>
            )}

            <form onSubmit={handleCreateMilestone} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key *</label>
                  <input
                    type="text"
                    required
                    value={mlsKey}
                    onChange={(e) => setMlsKey(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Milestone *</label>
                  <input
                    type="text"
                    required
                    value={mlsTitle}
                    onChange={(e) => setMlsTitle(e.target.value)}
                    placeholder="Contoh: UAT Klien Selesai"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Tanggal *</label>
                <input
                  type="date"
                  required
                  value={mlsTargetDate}
                  onChange={(e) => setMlsTargetDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Milestone</label>
                <textarea
                  rows={2}
                  value={mlsDesc}
                  onChange={(e) => setMlsDesc(e.target.value)}
                  placeholder="Kriteria penentu tercapainya milestone ini..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateMlsOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Milestone"}
                </button>
              </div>
            </form>
          </div>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tugas Prasyarat (Predecessor) *</label>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tugas Penerus (Successor) *</label>
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
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Memvalidasi..." : "Tautkan Dependensi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Tambah Anggota Tim Proyek</h3>
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {memberError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{memberError}</span>
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Contoh: Rian Anggara"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="rian@projectpilot.id"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Peran Tim</label>
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="TECH_LEAD">Tech Lead</option>
                    <option value="DEVELOPER">Developer</option>
                    <option value="QA_ENGINEER">QA Engineer</option>
                    <option value="UI_UX_DESIGNER">UI/UX Designer</option>
                    <option value="DEVOPS">DevOps / SRE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kapasitas (Jam/Mgg)</label>
                  <input
                    type="number"
                    value={memberHours}
                    onChange={(e) => setMemberHours(e.target.value)}
                    placeholder="40"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Anggota Tim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
