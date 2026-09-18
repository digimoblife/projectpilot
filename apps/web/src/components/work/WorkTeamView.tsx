"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Clock,
  Plus,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface ProjectMember {
  id: string;
  name: string;
  email: string | null;
  role: string;
  capacity_hours_per_week: number;
}

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

const roleConfigs: Record<string, { label: string; color: string }> = {
  TECH_LEAD: { label: "Tech Lead", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  DEVELOPER: { label: "Developer", color: "bg-blue-50 text-blue-700 border-blue-200" },
  QA_ENGINEER: { label: "QA Engineer", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  UI_UX_DESIGNER: { label: "UI/UX Designer", color: "bg-purple-50 text-purple-700 border-purple-200" },
  DEVOPS: { label: "DevOps / SRE", color: "bg-amber-50 text-amber-700 border-amber-200" },
  PRODUCT_MANAGER: { label: "Product Manager", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

export interface WorkTeamViewProps {
  projectId: string;
  embedded?: boolean;
}

export function WorkTeamView({
  projectId,
  embedded = false,
}: WorkTeamViewProps) {
  const { token } = useAuth();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Member Modal
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("DEVELOPER");
  const [memberHours, setMemberHours] = useState("40");
  const [memberError, setMemberError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTeamData();
  }, [projectId, token]);

  async function fetchTeamData() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const [memsRes, tasksRes] = await Promise.all([
        apiClient<ProjectMember[]>(`/projects/${projectId}/members`, { headers }),
        apiClient<Task[]>(`/projects/${projectId}/tasks`, { headers }),
      ]);
      if (memsRes.data) setMembers(memsRes.data);
      if (tasksRes.data) setTasks(tasksRes.data);
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  }

  function resetMemberForm() {
    setMemberName("");
    setMemberEmail("");
    setMemberRole("DEVELOPER");
    setMemberHours("40");
    setMemberError(null);
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
          capacity_hours_per_week: parseInt(memberHours, 10) || 40,
        }),
      });

      if (res.data) {
        setIsAddMemberOpen(false);
        resetMemberForm();
        fetchTeamData();
      } else {
        setMemberError(res.error || "Gagal menambahkan anggota tim.");
      }
    } catch {
      setMemberError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteMember(memberId: string, name?: string) {
    const label = name ? `"${name}"` : "anggota tim ini";
    if (!confirm(`Hapus ${label} dari tim proyek?`)) return;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await apiClient(`/projects/${projectId}/members/${memberId}`, {
        method: "DELETE",
        headers,
      });
      fetchTeamData();
    } catch {
      // Ignored
    }
  }

  const totalCapacity = members.reduce((sum, m) => sum + (m.capacity_hours_per_week || 40), 0);
  const assignedTasksCount = tasks.filter((t) => t.assignee_name).length;

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Tim & Kapasitas Kerja (Team & Capacity)</span>
            <span className="inline-flex items-center whitespace-nowrap shrink-0 text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
              {members.length} Anggota
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen alokasi personel proyek, pembagian peran teknis, dan pemantauan kapasitas jam kerja mingguan.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetMemberForm();
            setIsAddMemberOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs active:scale-[0.98] transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Anggota Tim</span>
        </button>
      </div>

      {/* Team KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Personel Tim</span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">{members.length} Orang</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Kapasitas Total Mingguan</span>
          <span className="text-xl font-bold text-blue-700 mt-1 block">{totalCapacity} Jam / Minggu</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Tugas Ditugaskan</span>
          <span className="text-xl font-bold text-emerald-700 mt-1 block">
            {assignedTasksCount} dari {tasks.length} Task
          </span>
        </div>
      </div>

      {/* Members Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-400">Memuat data tim proyek...</div>
      ) : members.length === 0 ? (
        <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
          <Users className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
          <p className="text-xs text-slate-500 font-medium">Belum ada anggota tim yang didaftarkan pada proyek ini.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Klik tombol <strong>&quot;+ Tambah Anggota Tim&quot;</strong> di atas untuk mendaftarkan personel.
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
            const roleConf = roleConfigs[mem.role] || {
              label: mem.role,
              color: "bg-slate-100 text-slate-700 border-slate-200",
            };

            return (
              <div
                key={mem.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex flex-col space-y-3.5"
              >
                {/* 1. Header: Profile, Role & Delete */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-800 font-bold text-sm flex items-center justify-center border border-cyan-200 shrink-0">
                      {mem.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 leading-tight">{mem.name}</h4>
                      <span className={`inline-flex items-center whitespace-nowrap shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border mt-0.5 ${roleConf.color}`}>
                        {roleConf.label}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteMember(mem.id, mem.name)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                    title="Hapus Anggota Tim"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* 2. Workload Status Tag */}
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[11px] text-slate-500 font-medium">Beban Kerja:</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      assignedTasks.length === 0
                        ? "bg-slate-50 text-slate-600 border-slate-200"
                        : isOverload
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : isOptimal
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
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
                    <span className="font-bold text-cyan-800 text-sm mt-0.5 block">{totalEstDays} Jam</span>
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
                    <span className="font-bold text-slate-800">
                      {doneTasks.length}/{assignedTasks.length} Selesai ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-600 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* 5. Blocker Alert */}
                {blockedTasks.length > 0 && (
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>
                      <strong>{blockedTasks.length} Task</strong> sedang ter-blocker!
                    </span>
                  </div>
                )}

                {/* 6. Assigned Tasks List (scrolls if > 5) */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Rincian Tugas ({assignedTasks.length}):
                    </span>
                    {assignedTasks.length > 5 && (
                      <span className="text-[9px] text-cyan-600 font-semibold bg-cyan-50 px-1.5 py-0.5 rounded">
                        Scroll ke bawah
                      </span>
                    )}
                  </div>

                  {assignedTasks.length === 0 ? (
                    <div className="p-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
                      <p className="text-[11px] text-slate-400 italic">
                        Belum ada tugas yang ditugaskan ke personel ini.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
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
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 shrink-0">
                                  {t.key}
                                </span>
                                <span
                                  className={`text-[11px] font-medium truncate ${
                                    isDone ? "line-through text-slate-400" : "text-slate-800"
                                  }`}
                                >
                                  {t.title}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {t.due_date ? `Deadline: ${t.due_date}` : "Deadline Fleksibel"} •{" "}
                                {t.estimated_hours != null ? `${t.estimated_hours} Jam` : "0 Jam"}
                              </div>
                            </div>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                isDone
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isBlocked
                                  ? "bg-rose-100 text-rose-800"
                                  : t.status === "IN_PROGRESS"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
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

      {/* Add Member Modal */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Tambah Anggota Tim Proyek</h3>
              </div>
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
                  autoFocus
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Personel (Opsional)</label>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="budi@company.com"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Peran (Role) *</label>
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
                    <option value="PRODUCT_MANAGER">Product Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kapasitas Jam/Minggu</label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={memberHours}
                    onChange={(e) => setMemberHours(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
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
                  disabled={isSubmitting || !memberName.trim()}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Anggota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
