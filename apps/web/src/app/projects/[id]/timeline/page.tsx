"use client";

import React, { useEffect, useState, use } from "react";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
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
  estimated_hours: number | null;
  blocker_reason: string | null;
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

  // Edit Milestone Modal
  const [isEditMlsOpen, setIsEditMlsOpen] = useState(false);
  const [editingMlsId, setEditingMlsId] = useState<string | null>(null);
  const [editMlsKey, setEditMlsKey] = useState("");
  const [editMlsTitle, setEditMlsTitle] = useState("");
  const [editMlsTargetDate, setEditMlsTargetDate] = useState("");
  const [editMlsDesc, setEditMlsDesc] = useState("");
  const [editMlsError, setEditMlsError] = useState<string | null>(null);

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

  async function handleUpdateMilestoneStatus(mlsId: string, targetStatus: string) {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await apiClient(`/projects/${projectId}/milestones/${mlsId}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({ target_status: targetStatus }),
      });
      fetchTimelineData();
    } catch {
      // Ignored
    }
  }

  async function handleDeleteMilestone(mlsId: string, mlsTitle: string) {
    if (!confirm(`Hapus milestone "${mlsTitle}"?`)) return;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await apiClient(`/projects/${projectId}/milestones/${mlsId}`, {
        method: "DELETE",
        headers,
      });
      fetchTimelineData();
    } catch {
      // Ignored
    }
  }

  function openEditMlsModal(mls: Milestone) {
    setEditingMlsId(mls.id);
    setEditMlsKey(mls.key);
    setEditMlsTitle(mls.title);
    setEditMlsTargetDate(mls.target_date);
    setEditMlsDesc(mls.description || "");
    setEditMlsError(null);
    setIsEditMlsOpen(true);
  }

  async function handleUpdateMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMlsId) return;
    setEditMlsError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Milestone>(`/projects/${projectId}/milestones/${editingMlsId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          key: editMlsKey,
          title: editMlsTitle,
          target_date: editMlsTargetDate,
          description: editMlsDesc || null,
        }),
      });

      if (res.data) {
        setIsEditMlsOpen(false);
        fetchTimelineData();
      } else {
        setEditMlsError(res.error || "Gagal memperbarui milestone.");
      }
    } catch {
      setEditMlsError("Terjadi kesalahan jaringan.");
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
      {/* Sub-Tab Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        {/* Segmented Sub-Tab Control */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "timeline"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Timeline & Milestone ({milestones.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dependencies")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "dependencies"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>Task Dependencies ({dependencies.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("team")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "team"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Alokasi Tim & Workload ({members.length})</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === "timeline" && (
            <button
              type="button"
              onClick={() => {
                resetMlsForm();
                setIsCreateMlsOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Anggota Tim</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: TIMELINE & MILESTONES */}
      {activeTab === "timeline" && (
        <div className="space-y-5">
          {/* Milestones Horizontal Tracker */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Gate Milestone Pengiriman</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tonggak capaian utama per fase proyek. Perbarui status menjadi &quot;Tercapai&quot; saat fase selesai.
                </p>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                {milestones.filter((m) => m.status === "ACHIEVED").length} / {milestones.length} Tercapai
              </span>
            </div>

            {milestones.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                <MilestoneIcon className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs text-slate-500 font-medium">Belum ada milestone yang dibuat untuk proyek ini.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Klik tombol <strong>&quot;+ Tambah Milestone&quot;</strong> di pojok kanan atas untuk membuat target fase pertama.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {milestones.map((mls) => {
                  const conf = milestoneStatusConfigs[mls.status] || {
                    label: mls.status,
                    color: "bg-slate-100 text-slate-700 border-slate-200",
                  };
                  return (
                    <div key={mls.id} className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs space-y-2.5 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 shrink-0">
                            {mls.key}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => openEditMlsModal(mls)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                              title="Edit Milestone"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMilestone(mls.id, mls.title)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                              title="Hapus Milestone"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <h4 className="font-bold text-xs text-slate-900 leading-snug">{mls.title}</h4>
                        {mls.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{mls.description}</p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                          <span>Target: <strong>{mls.target_date}</strong></span>
                        </p>

                        {/* Interactive Status Selector */}
                        <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-50">
                          <span className="text-[10px] font-semibold text-slate-400">Status:</span>
                          <select
                            value={mls.status}
                            onChange={(e) => handleUpdateMilestoneStatus(mls.id, e.target.value)}
                            className={`text-[10px] font-bold rounded-lg px-2 py-1 border transition-colors ${conf.color}`}
                          >
                            <option value="PLANNED">Direncanakan</option>
                            <option value="ACHIEVED">✅ Tercapai (Achieved)</option>
                            <option value="MISSED">⚠️ Terlewat (Missed)</option>
                            <option value="CANCELLED">❌ Dibatalkan</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Scheduled Tasks Timeline View */}
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
                  <div key={task.id} className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                          {task.key}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 truncate">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span>PIC: <strong className="text-slate-700">{task.assignee_name || "Unassigned"}</strong></span>
                        <span>Status: <strong className="text-slate-700">{task.status}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className={task.start_date ? "font-medium text-slate-800" : "text-slate-400"}>
                          {task.start_date ? `Mulai: ${task.start_date}` : "Mulai Fleksibel"}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className={task.due_date ? "font-bold text-cyan-800 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200" : "text-slate-400"}>
                          {task.due_date ? `Tenggat: ${task.due_date}` : "Tenggat Fleksibel"}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
              {members.map((mem) => {
                const assignedTasks = tasks.filter((t) => t.assignee_name === mem.name);
                const activeTasks = assignedTasks.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED");
                const doneTasks = assignedTasks.filter((t) => t.status === "DONE");
                const totalEstDays = assignedTasks.reduce((acc, t) => acc + (t.estimated_hours || 0), 0);
                const capacityDays = (mem.capacity_hours_per_week || 40) / 8;
                const workloadRatio = capacityDays > 0 ? Math.round((totalEstDays / capacityDays) * 100) : 0;
                const progressPercent = assignedTasks.length > 0 ? Math.round((doneTasks.length / assignedTasks.length) * 100) : 0;
                const blockedTasks = assignedTasks.filter((t) => t.status === "BLOCKED");

                const isOverload = workloadRatio > 100;
                const isOptimal = workloadRatio >= 60 && workloadRatio <= 100;

                return (
                  <div key={mem.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex flex-col space-y-3.5">
                    {/* 1. Header: Profile, Role & Delete */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-800 font-bold text-sm flex items-center justify-center border border-cyan-200 shrink-0">
                          {mem.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 leading-tight">{mem.name}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 inline-block mt-0.5">
                            {mem.role}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteMember(mem.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Hapus Anggota Tim"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 2. Workload Status Tag */}
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[11px] text-slate-500 font-medium">Beban Kerja:</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        assignedTasks.length === 0
                          ? "bg-slate-50 text-slate-600 border-slate-200"
                          : isOverload
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : isOptimal
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>
                        {assignedTasks.length === 0
                          ? "⚪ Bebas / Tersedia"
                          : isOverload
                          ? `🔴 Overload (${workloadRatio}%)`
                          : isOptimal
                          ? `🟢 Optimal (${workloadRatio}%)`
                          : `🔵 Ringan (${workloadRatio}%)`}
                      </span>
                    </div>

                    {/* 3. Metrics Cards */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                        <span className="text-[10px] text-slate-400 block font-semibold">Tugas Aktif</span>
                        <span className="font-bold text-slate-900 text-sm mt-0.5 block">{activeTasks.length} Task</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                        <span className="text-[10px] text-slate-400 block font-semibold">Total Beban</span>
                        <span className="font-bold text-cyan-800 text-sm mt-0.5 block">{totalEstDays} Hari</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                        <span className="text-[10px] text-slate-400 block font-semibold">Kapasitas</span>
                        <span className="font-bold text-slate-700 text-sm mt-0.5 block">{capacityDays} Hari/mgg</span>
                      </div>
                    </div>

                    {/* 4. Task Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Progress Tugas</span>
                        <span className="font-bold text-slate-800">{doneTasks.length}/{assignedTasks.length} Selesai ({progressPercent}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-600 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>

                    {/* 5. Blocker Alert */}
                    {blockedTasks.length > 0 && (
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span><strong>{blockedTasks.length} Task</strong> sedang ter-blocker!</span>
                      </div>
                    )}

                    {/* 6. Assigned Tasks List (Displays 5 items cleanly, scrolls if > 5) */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Rincian Tugas ({assignedTasks.length}):
                        </span>
                        {assignedTasks.length > 5 && (
                          <span className="text-[9px] text-cyan-600 font-semibold bg-cyan-50 px-1.5 py-0.2 rounded">
                            Scroll untuk melihat semua
                          </span>
                        )}
                      </div>

                      {assignedTasks.length === 0 ? (
                        <div className="p-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
                          <p className="text-[11px] text-slate-400 italic">Belum ada tugas yang ditugaskan ke personil ini.</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-[245px] overflow-y-auto pr-1">
                          {assignedTasks.map((t) => {
                            const isDone = t.status === "DONE";
                            const isBlocked = t.status === "BLOCKED";

                            return (
                              <div
                                key={t.id}
                                className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 transition-colors ${
                                  isBlocked
                                    ? "bg-rose-50/50 border-rose-200"
                                    : isDone
                                    ? "bg-emerald-50/40 border-emerald-200 text-slate-500"
                                    : "bg-slate-50 border-slate-200 hover:bg-slate-100/70"
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-white text-slate-700 border border-slate-200 shrink-0">
                                      {t.key}
                                    </span>
                                    <span className={`text-[11px] font-medium truncate ${isDone ? "line-through text-slate-400" : "text-slate-800"}`}>
                                      {t.title}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    {t.due_date ? `Deadline: ${t.due_date}` : "Deadline Fleksibel"} • {t.estimated_hours != null ? `${t.estimated_hours} Hari` : "0 Hari"}
                                  </div>
                                </div>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                  isDone
                                    ? "bg-emerald-100 text-emerald-800"
                                    : isBlocked
                                    ? "bg-rose-100 text-rose-800"
                                    : t.status === "IN_PROGRESS"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-200 text-slate-700"
                                }`}>
                                  {t.status}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
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

      {/* Edit Milestone Modal */}
      {isEditMlsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Edit Gate Milestone</h3>
              <button
                type="button"
                onClick={() => setIsEditMlsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editMlsError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{editMlsError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateMilestone} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key *</label>
                  <input
                    type="text"
                    required
                    value={editMlsKey}
                    onChange={(e) => setEditMlsKey(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Milestone *</label>
                  <input
                    type="text"
                    required
                    value={editMlsTitle}
                    onChange={(e) => setEditMlsTitle(e.target.value)}
                    placeholder="Contoh: Selesai UAT & Demo Klien"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Tanggal Penyelesaian *</label>
                <input
                  type="date"
                  required
                  value={editMlsTargetDate}
                  onChange={(e) => setEditMlsTargetDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Scope Capaian</label>
                <textarea
                  rows={2}
                  value={editMlsDesc}
                  onChange={(e) => setEditMlsDesc(e.target.value)}
                  placeholder="Kriteria apa saja yang menandakan gate ini selesai..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditMlsOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
