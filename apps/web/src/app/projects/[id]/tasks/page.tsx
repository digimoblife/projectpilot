"use client";

import React, { useEffect, useState, use } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Kanban,
  LayoutList,
  List,
  MoreVertical,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface Epic {
  id: string;
  key: string;
  title: string;
}

interface Task {
  id: string;
  key: string;
  title: string;
  description: string | null;
  status: "BACKLOG" | "READY" | "IN_PROGRESS" | "IN_REVIEW" | "QA" | "BLOCKED" | "DONE" | "CANCELLED";
  priority: string;
  estimated_hours: number | null;
  actual_hours: number | null;
  assignee_name: string | null;
  due_date: string | null;
  blocker_reason: string | null;
  epic_id: string | null;
  order_index: number;
  created_at: string;
}

const columns: { key: Task["status"]; label: string; headerColor: string; dot: string }[] = [
  { key: "BACKLOG", label: "Backlog", headerColor: "text-slate-700 bg-slate-100", dot: "bg-slate-400" },
  { key: "READY", label: "Ready", headerColor: "text-blue-700 bg-blue-50", dot: "bg-blue-500" },
  { key: "IN_PROGRESS", label: "In Progress", headerColor: "text-amber-700 bg-amber-50", dot: "bg-amber-500" },
  { key: "IN_REVIEW", label: "In Review", headerColor: "text-indigo-700 bg-indigo-50", dot: "bg-indigo-500" },
  { key: "QA", label: "QA Testing", headerColor: "text-purple-700 bg-purple-50", dot: "bg-purple-500" },
  { key: "BLOCKED", label: "Blocked", headerColor: "text-rose-700 bg-rose-50", dot: "bg-rose-500" },
  { key: "DONE", label: "Done", headerColor: "text-emerald-700 bg-emerald-50", dot: "bg-emerald-500" },
];

const priorityColors: Record<string, string> = {
  CRITICAL: "text-rose-700 bg-rose-50 border-rose-200",
  HIGH: "text-orange-700 bg-orange-50 border-orange-200",
  MEDIUM: "text-blue-700 bg-blue-50 border-blue-200",
  LOW: "text-slate-600 bg-slate-100 border-slate-200",
};

export default function ProjectTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { token } = useAuth();

  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEpicFilter, setSelectedEpicFilter] = useState("ALL");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState("ALL");

  // Quick Add
  const [quickTitle, setQuickTitle] = useState("");

  // Full Task Modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskKey, setTaskKey] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskEstHours, setTaskEstHours] = useState("");
  const [taskEpicId, setTaskEpicId] = useState("");
  const [taskModalError, setTaskModalError] = useState<string | null>(null);

  // Blocker Modal
  const [selectedTaskForBlock, setSelectedTaskForBlock] = useState<Task | null>(null);
  const [blockerReasonInput, setBlockerReasonInput] = useState("");
  const [blockerError, setBlockerError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTasksAndEpics();
  }, [projectId, token]);

  async function fetchTasksAndEpics() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [tasksRes, epicsRes] = await Promise.all([
        apiClient<Task[]>(`/projects/${projectId}/tasks`, { headers }),
        apiClient<Epic[]>(`/projects/${projectId}/epics`, { headers }),
      ]);

      if (tasksRes.data) setTasks(tasksRes.data);
      if (epicsRes.data) setEpics(epicsRes.data);
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const nextKey = `TSK-${tasks.length + 1}`.padStart(7, "0");
    try {
      const res = await apiClient<Task>(`/projects/${projectId}/tasks`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          key: nextKey,
          title: quickTitle,
          status: "BACKLOG",
          priority: "MEDIUM",
        }),
      });

      if (res.data) {
        setQuickTitle("");
        fetchTasksAndEpics();
      }
    } catch {
      // Handle error
    }
  }

  async function handleCreateFullTask(e: React.FormEvent) {
    e.preventDefault();
    setTaskModalError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Task>(`/projects/${projectId}/tasks`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          key: taskKey,
          title: taskTitle,
          description: taskDesc || null,
          priority: taskPriority,
          assignee_name: taskAssignee || null,
          due_date: taskDueDate || null,
          estimated_hours: taskEstHours ? parseFloat(taskEstHours) : null,
          epic_id: taskEpicId || null,
          status: "BACKLOG",
        }),
      });

      if (res.data) {
        setIsTaskModalOpen(false);
        resetTaskModalForm();
        fetchTasksAndEpics();
      } else {
        setTaskModalError(res.error || "Gagal membuat task.");
      }
    } catch {
      setTaskModalError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(task: Task, targetStatus: Task["status"]) {
    if (targetStatus === "BLOCKED") {
      setSelectedTaskForBlock(task);
      setBlockerReasonInput("");
      setBlockerError(null);
      return;
    }

    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await apiClient(`/projects/${projectId}/tasks/${task.id}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({ target_status: targetStatus }),
      });
      fetchTasksAndEpics();
    } catch {
      // Handle error
    }
  }

  async function handleConfirmBlocker(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTaskForBlock) return;
    if (!blockerReasonInput.trim()) {
      setBlockerError("Alasan blocker wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient(`/projects/${projectId}/tasks/${selectedTaskForBlock.id}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          target_status: "BLOCKED",
          blocker_reason: blockerReasonInput,
        }),
      });

      if (res.data) {
        setSelectedTaskForBlock(null);
        fetchTasksAndEpics();
      } else {
        setBlockerError(res.error || "Gagal mengubah status menjadi BLOCKED.");
      }
    } catch {
      setBlockerError("Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteTask(taskId: string) {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await apiClient(`/projects/${projectId}/tasks/${taskId}`, {
        method: "DELETE",
        headers,
      });
      fetchTasksAndEpics();
    } catch {
      // Handle error
    }
  }

  function resetTaskModalForm() {
    setTaskKey(`TSK-${tasks.length + 1}`.padStart(7, "0"));
    setTaskTitle("");
    setTaskDesc("");
    setTaskPriority("MEDIUM");
    setTaskAssignee("");
    setTaskDueDate("");
    setTaskEstHours("");
    setTaskEpicId("");
    setTaskModalError(null);
  }

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.assignee_name && t.assignee_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesEpic = selectedEpicFilter === "ALL" || t.epic_id === selectedEpicFilter;
    const matchesPriority = selectedPriorityFilter === "ALL" || t.priority === selectedPriorityFilter;
    return matchesSearch && matchesEpic && matchesPriority;
  });

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Delivery Tasks & Kanban Board</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen eksekusi delivery terpadu dengan status kanonikal dan validasi blocker ketat.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === "kanban"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              resetTaskModalForm();
              setIsTaskModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Task Lengkap</span>
          </button>
        </div>
      </div>

      {/* Quick Add Bar & Filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="+ Tambah task cepat ke Backlog (tekan Enter)..."
            className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg shrink-0"
          >
            Tambah
          </button>
        </form>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2 border-t border-slate-100">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari task, assignee, atau key..."
              className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedEpicFilter}
              onChange={(e) => setSelectedEpicFilter(e.target.value)}
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="ALL">Semua Epic</option>
              {epics.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.key}: {e.title}
                </option>
              ))}
            </select>

            <select
              value={selectedPriorityFilter}
              onChange={(e) => setSelectedPriorityFilter(e.target.value)}
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="ALL">Semua Prioritas</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* VIEW 1: KANBAN BOARD */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 overflow-x-auto pb-4 items-start min-w-[1050px] md:min-w-0">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.key);

            return (
              <div
                key={col.key}
                className="bg-slate-100/70 rounded-xl p-2.5 border border-slate-200/80 flex flex-col min-h-[450px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <span className="font-bold text-xs text-slate-800">{col.label}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded-full border border-slate-200">
                    {colTasks.length}
                  </span>
                </div>

                {/* Task Cards Column */}
                <div className="space-y-2 flex-1">
                  {colTasks.map((task) => {
                    const isBlocked = task.status === "BLOCKED";
                    const isDone = task.status === "DONE";

                    return (
                      <div
                        key={task.id}
                        className={`bg-white rounded-lg p-3 border shadow-2xs hover:shadow-xs transition-all space-y-2 ${
                          isBlocked
                            ? "border-rose-300 bg-rose-50/20"
                            : isDone
                            ? "border-emerald-200 bg-emerald-50/10"
                            : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {task.key}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              priorityColors[task.priority] || "bg-slate-50 text-slate-600"
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        <h4 className="text-xs font-semibold text-slate-900 leading-tight">
                          {task.title}
                        </h4>

                        {task.blocker_reason && (
                          <div className="p-1.5 rounded bg-rose-50 border border-rose-200 text-[10px] text-rose-700 flex items-start gap-1">
                            <ShieldAlert className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{task.blocker_reason}</span>
                          </div>
                        )}

                        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                          <span>{task.assignee_name || "Unassigned"}</span>
                          {task.due_date && <span>{task.due_date}</span>}
                        </div>

                        {/* Explicit Status Selector (Mobile & Desktop Accessible) */}
                        <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-1">
                          <span className="text-[9px] font-bold text-slate-400">Pindah:</span>
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task, e.target.value as any)}
                            className="text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-medium"
                          >
                            {columns.map((c) => (
                              <option key={c.key} value={c.key}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: TASK LIST TABLE */}
      {viewMode === "table" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4">Key</th>
                <th className="py-3 px-4">Judul Task</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Prioritas</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada task yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{task.key}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{task.title}</td>
                    <td className="py-3 px-4">
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task, e.target.value as any)}
                        className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1"
                      >
                        {columns.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          priorityColors[task.priority] || "bg-slate-50 text-slate-600"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{task.assignee_name || "-"}</td>
                    <td className="py-3 px-4 text-slate-500">{task.due_date || "-"}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Full Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Buat Task Pengiriman Lengkap</h3>
                <p className="text-xs text-slate-500">Menentukan spesifikasi tugas, estimasi, dan PIC.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {taskModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{taskModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateFullTask} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key *</label>
                  <input
                    type="text"
                    required
                    value={taskKey}
                    onChange={(e) => setTaskKey(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Task *</label>
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Contoh: Implementasi Unit Test Payment"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Epic Induk</label>
                <select
                  value={taskEpicId}
                  onChange={(e) => setTaskEpicId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Tanpa Epic</option>
                  {epics.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.key}: {e.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Tugas</label>
                <textarea
                  rows={3}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Langkah pengerjaan atau detail teknis..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prioritas</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assignee</label>
                  <input
                    type="text"
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    placeholder="Nama PIC"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estimasi (Jam)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={taskEstHours}
                    onChange={(e) => setTaskEstHours(e.target.value)}
                    placeholder="8.0"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Tenggat (Due Date)</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blocker Reason Prompt Modal */}
      {selectedTaskForBlock && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Alasan Blocker Diperlukan</h3>
                  <p className="text-xs text-slate-500">{selectedTaskForBlock.key}: {selectedTaskForBlock.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskForBlock(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {blockerError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{blockerError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmBlocker} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Apa kendala / dependensi yang menghalangi task ini? *
                </label>
                <textarea
                  rows={3}
                  required
                  value={blockerReasonInput}
                  onChange={(e) => setBlockerReasonInput(e.target.value)}
                  placeholder="Contoh: Menunggu approval skema database dari tim IT Bank..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedTaskForBlock(null)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Set Status BLOCKED"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
