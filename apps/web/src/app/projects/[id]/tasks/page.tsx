"use client";

import React, { useEffect, useState, use } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Filter,
  Kanban,
  LayoutList,
  List,
  ListFilter,
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
import {
  AISuggestionItem,
  AISuggestionReviewModal,
} from "@/components/ai/AISuggestionReviewModal";

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
  start_date: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  assignee_name: string | null;
  blocker_reason: string | null;
  epic_id: string | null;
  order_index: number;
  created_at: string;
}

const columns: { key: Task["status"]; label: string; headerColor: string; dot: string }[] = [
  { key: "BACKLOG", label: "Backlog", headerColor: "text-slate-700 bg-slate-100", dot: "bg-slate-400" },
  { key: "IN_PROGRESS", label: "In Progress", headerColor: "text-amber-700 bg-amber-50", dot: "bg-amber-500" },
  { key: "IN_REVIEW", label: "In Review", headerColor: "text-indigo-700 bg-indigo-50", dot: "bg-indigo-500" },
  { key: "BLOCKED", label: "Blocked", headerColor: "text-rose-700 bg-rose-50", dot: "bg-rose-500" },
  { key: "DONE", label: "Done", headerColor: "text-emerald-700 bg-emerald-50", dot: "bg-emerald-500" },
];

const priorityColors: Record<string, string> = {
  CRITICAL: "text-rose-700 bg-rose-50 border-rose-200",
  HIGH: "text-orange-700 bg-orange-50 border-orange-200",
  MEDIUM: "text-blue-700 bg-blue-50 border-blue-200",
  LOW: "text-slate-600 bg-slate-100 border-slate-200",
};

interface TeamMember {
  id: string;
  name: string;
  role: string;
  capacity_hours_per_week: number;
}

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
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEpicFilter, setSelectedEpicFilter] = useState("ALL");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState("ALL");

  // AI Task Breakdown States
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<AISuggestionItem | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);

  // Quick Add
  const [quickTitle, setQuickTitle] = useState("");

  // Full Task Create Modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskKey, setTaskKey] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskStartDate, setTaskStartDate] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskEstHours, setTaskEstHours] = useState("0");
  const [taskEpicId, setTaskEpicId] = useState("");
  const [taskModalError, setTaskModalError] = useState<string | null>(null);

  // Edit Task Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskKey, setEditTaskKey] = useState("");
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDesc, setEditTaskDesc] = useState("");
  const [editTaskPriority, setEditTaskPriority] = useState("MEDIUM");
  const [editTaskAssignee, setEditTaskAssignee] = useState("");
  const [editTaskStartDate, setEditTaskStartDate] = useState("");
  const [editTaskDueDate, setEditTaskDueDate] = useState("");
  const [editTaskEstHours, setEditTaskEstHours] = useState("0");
  const [editTaskEpicId, setEditFeatEpicId] = useState("");
  const [editTaskError, setEditTaskError] = useState<string | null>(null);

  // Blocker Modal
  const [selectedTaskForBlock, setSelectedTaskForBlock] = useState<Task | null>(null);
  const [blockerReasonInput, setBlockerReasonInput] = useState("");
  const [blockerError, setBlockerError] = useState<string | null>(null);

  // Quick Add Member Inline States
  const [isQuickAddMemberOpen, setIsQuickAddMemberOpen] = useState(false);
  const [quickMemberName, setQuickMemberName] = useState("");
  const [quickMemberRole, setQuickMemberRole] = useState("DEVELOPER");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [quickMemberTarget, setQuickMemberTarget] = useState<"create" | "edit">("create");

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleInlineAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!quickMemberName.trim()) return;
    setIsAddingMember(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<TeamMember>(`/projects/${projectId}/members`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: quickMemberName.trim(),
          role: quickMemberRole,
          capacity_hours_per_week: 40.0,
        }),
      });

      if (res.data) {
        const newMember = res.data;
        setMembers((prev) => [...prev, newMember]);
        if (quickMemberTarget === "create") {
          setTaskAssignee(newMember.name);
        } else {
          setEditTaskAssignee(newMember.name);
        }
        setQuickMemberName("");
        setIsQuickAddMemberOpen(false);
      }
    } catch {
      // Handled
    } finally {
      setIsAddingMember(false);
    }
  }

  function calculateDaysDifference(startStr: string, dueStr: string): number | null {
    if (!startStr || !dueStr) return null;
    const start = new Date(startStr);
    const due = new Date(dueStr);
    if (isNaN(start.getTime()) || isNaN(due.getTime())) return null;
    const diffMs = due.getTime() - start.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1; // Inklusif hari pengerjaan (misal 17 s/d 18 = 2 hari)
    return diffDays > 0 ? diffDays : 0;
  }

  useEffect(() => {
    fetchTasksAndEpics();
  }, [projectId, token]);

  async function fetchTasksAndEpics() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [tasksRes, epicsRes, membersRes] = await Promise.all([
        apiClient<Task[]>(`/projects/${projectId}/tasks`, { headers }),
        apiClient<Epic[]>(`/projects/${projectId}/epics`, { headers }),
        apiClient<TeamMember[]>(`/projects/${projectId}/members`, { headers }),
      ]);

      if (tasksRes.data) setTasks(tasksRes.data);
      if (epicsRes.data) setEpics(epicsRes.data);
      if (membersRes.data) setMembers(membersRes.data);
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  }

  // =========================================================================
  // 1. AI TASK AUTO-BREAKDOWN (WBS)
  // =========================================================================
  async function handleAIBreakdownTasks() {
    setIsAILoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<AISuggestionItem>(`/projects/${projectId}/ai/generate-tasks`, {
        method: "POST",
        headers,
      });

      if (res.data) {
        setSelectedSuggestion(res.data);
        setIsAIModalOpen(true);
      }
    } catch {
      // Handled
    } finally {
      setIsAILoading(false);
    }
  }

  async function handleAISuggestionReviewed() {
    if (selectedSuggestion && selectedSuggestion.capability === "TASK_BREAKDOWN_GEN") {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        await apiClient(`/projects/${projectId}/ai/suggestions/${selectedSuggestion.id}/accept-tasks`, {
          method: "POST",
          headers,
        });
      } catch {
        // Handled
      }
    }
    fetchTasksAndEpics();
  }

  // =========================================================================
  // 2. QUICK ADD & CREATE TASK
  // =========================================================================
  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const nextKey = `TSK-${(tasks.length + 1).toString().padStart(3, "0")}`;
    try {
      const res = await apiClient<Task>(`/projects/${projectId}/tasks`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          key: nextKey,
          title: quickTitle,
          status: "BACKLOG",
          priority: "MEDIUM",
          estimated_hours: 0.0,
        }),
      });

      if (res.data) {
        setQuickTitle("");
        fetchTasksAndEpics();
      }
    } catch {
      // Handled
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
          start_date: taskStartDate || null,
          due_date: taskDueDate || null,
          estimated_hours: taskEstHours ? parseFloat(taskEstHours) : 0.0,
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

  // =========================================================================
  // 3. EDIT TASK
  // =========================================================================
  function openEditTaskModal(task: Task) {
    setEditingTaskId(task.id);
    setEditTaskKey(task.key);
    setEditTaskTitle(task.title);
    setEditTaskDesc(task.description || "");
    setEditTaskPriority(task.priority || "MEDIUM");
    setEditTaskAssignee(task.assignee_name || "");
    setEditTaskStartDate(task.start_date || "");
    setEditTaskDueDate(task.due_date || "");
    setEditTaskEstHours(task.estimated_hours?.toString() || "0");
    setEditFeatEpicId(task.epic_id || "");
    setEditTaskError(null);
    setIsEditModalOpen(true);
  }

  async function handleUpdateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTaskId) return;
    setEditTaskError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Task>(`/projects/${projectId}/tasks/${editingTaskId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          key: editTaskKey,
          title: editTaskTitle,
          description: editTaskDesc || null,
          priority: editTaskPriority,
          assignee_name: editTaskAssignee || null,
          start_date: editTaskStartDate || null,
          due_date: editTaskDueDate || null,
          estimated_hours: editTaskEstHours ? parseFloat(editTaskEstHours) : 0.0,
          epic_id: editTaskEpicId || null,
        }),
      });

      if (res.data) {
        setIsEditModalOpen(false);
        fetchTasksAndEpics();
      } else {
        setEditTaskError(res.error || "Gagal memperbarui task.");
      }
    } catch {
      setEditTaskError("Terjadi kesalahan sistem saat menyimpan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // =========================================================================
  // 4. STATUS & BLOCKER TRANSITIONS
  // =========================================================================
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
      // Handled
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

  async function handleDeleteTask(taskId: string, taskTitle?: string) {
    if (!confirm(`Hapus task "${taskTitle || taskId}"?`)) return;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await apiClient(`/projects/${projectId}/tasks/${taskId}`, {
        method: "DELETE",
        headers,
      });
      fetchTasksAndEpics();
    } catch {
      alert("Gagal menghapus task.");
    }
  }

  function resetTaskModalForm() {
    setTaskKey(`TSK-${(tasks.length + 1).toString().padStart(3, "0")}`);
    setTaskTitle("");
    setTaskDesc("");
    setTaskPriority("MEDIUM");
    setTaskAssignee("");
    setTaskStartDate("");
    setTaskDueDate("");
    setTaskEstHours("0");
    setTaskEpicId(epics[0]?.id || "");
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
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        {/* Left Title & Status Count */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Kanban & Tasks</span>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
              {tasks.length} Total Task
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen tiket pengerjaan teknis, pelacakan status kanban, dan penugasan developer.
          </p>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
          {/* View Mode Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === "kanban" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Papan</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === "table" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Tabel</span>
            </button>
          </div>

          <button
            type="button"
            disabled={isAILoading}
            onClick={handleAIBreakdownTasks}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-2xs transition-colors disabled:opacity-50 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>{isAILoading ? "Menyiapkan..." : "AI Breakdown"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetTaskModalForm();
              setIsTaskModalOpen(true);
            }}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Task</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: KANBAN BOARD */}
      {viewMode === "kanban" && (
        <div className="w-full max-w-full overflow-x-auto pb-4">
          <div className="flex md:grid md:grid-cols-5 gap-3.5 items-start min-w-[1100px] md:min-w-0">
            {columns.map((col) => {
              const colTasks = filteredTasks.filter((t) => t.status === col.key);

              return (
                <div
                  key={col.key}
                  className="w-[260px] md:w-auto shrink-0 md:shrink bg-slate-100/70 rounded-xl p-2.5 border border-slate-200/80 flex flex-col min-h-[450px]"
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
                <div className="space-y-2.5 flex-1">
                  {colTasks.map((task) => {
                    const isBlocked = task.status === "BLOCKED";
                    const isDone = task.status === "DONE";

                    return (
                      <div
                        key={task.id}
                        className={`bg-white rounded-xl p-3 border shadow-2xs hover:shadow-xs transition-all space-y-2 group ${
                          isBlocked
                            ? "border-rose-300 bg-rose-50/20"
                            : isDone
                            ? "border-emerald-200 bg-emerald-50/10"
                            : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 min-w-0">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0 whitespace-nowrap">
                            {task.key}
                          </span>
                          <div className="flex items-center gap-1 shrink-0 whitespace-nowrap">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 whitespace-nowrap ${
                                priorityColors[task.priority] || "bg-slate-50 text-slate-600"
                              }`}
                            >
                              {task.priority}
                            </span>
                            <button
                              type="button"
                              onClick={() => openEditTaskModal(task)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                              title="Edit Task"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id, task.title)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                              title="Hapus Task"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          {task.title}
                        </h4>

                        {task.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {task.blocker_reason && (
                          <div className="p-1.5 rounded bg-rose-50 border border-rose-200 text-[10px] text-rose-700 flex items-start gap-1">
                            <ShieldAlert className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{task.blocker_reason}</span>
                          </div>
                        )}

                        {/* Polished Kanban Card Footer */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                          <div className="flex items-center gap-1.5 min-w-0 text-slate-600">
                            <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 text-[9px] font-bold border border-slate-200">
                              {task.assignee_name ? task.assignee_name.charAt(0).toUpperCase() : <User className="w-3 h-3 text-slate-400" />}
                            </div>
                            <span className="truncate text-[11px] font-medium text-slate-700">
                              {task.assignee_name || "Belum ditugaskan"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {task.estimated_hours != null && (
                              <span className="font-mono text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {task.estimated_hours}h
                              </span>
                            )}
                            <select
                              value={task.status}
                              onChange={(e) => handleStatusChange(task, e.target.value as any)}
                              className="text-[10px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer"
                              title="Ubah Status"
                            >
                              {columns.map((c) => (
                                <option key={c.key} value={c.key}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          </div>
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
                <th className="py-3 px-4">Estimasi Hari</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-700">{t.key}</td>
                  <td className="py-2.5 px-4 font-medium text-slate-900">{t.title}</td>
                  <td className="py-2.5 px-4">
                    <select
                      value={t.status}
                      onChange={(e) => handleStatusChange(t, e.target.value as any)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-0.5"
                    >
                      {columns.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${priorityColors[t.priority]}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">
                    {t.estimated_hours != null ? `${t.estimated_hours} Hari` : "0 Hari"}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">{t.assignee_name || "-"}</td>
                  <td className="py-2.5 px-4 text-slate-500">{t.due_date || "-"}</td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditTaskModal(t)}
                        className="text-slate-600 hover:text-blue-600 px-2 py-1 rounded hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(t.id, t.title)}
                        className="text-rose-600 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. AI SUGGESTION REVIEW MODAL (TASK BREAKDOWN APPROVAL GATE)              */}
      {/* ========================================================================= */}
      <AISuggestionReviewModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        suggestion={selectedSuggestion}
        onReviewed={handleAISuggestionReviewed}
      />

      {/* ========================================================================= */}
      {/* 2. CREATE TASK MODAL                                                      */}
      {/* ========================================================================= */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Tambah Task Teknis Baru</h3>
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

            <form onSubmit={handleCreateFullTask} className="space-y-3">
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
                    placeholder="Contoh: Slicing UI Form Kontak"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Assignee</label>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickMemberTarget("create");
                        setIsQuickAddMemberOpen(true);
                      }}
                      className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Anggota Baru</span>
                    </button>
                  </div>
                  <select
                    value={taskAssignee}
                    onChange={(e) => {
                      if (e.target.value === "__NEW_MEMBER__") {
                        setQuickMemberTarget("create");
                        setIsQuickAddMemberOpen(true);
                      } else {
                        setTaskAssignee(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="">-- Belum Ditugaskan (Unassigned) --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                    {taskAssignee && !members.some((m) => m.name === taskAssignee) && (
                      <option value={taskAssignee}>{taskAssignee} (Lainnya)</option>
                    )}
                    <option value="__NEW_MEMBER__" className="text-blue-600 font-semibold bg-blue-50">
                      ➕ Tambah Anggota Baru...
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    <span>Estimasi Hari</span>
                    <span className="text-[10px] text-slate-400 font-normal ml-1">(Otomatis/Manual)</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={taskEstHours}
                    onChange={(e) => setTaskEstHours(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Mulai (Start Date)</label>
                  <input
                    type="date"
                    value={taskStartDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setTaskStartDate(newStart);
                      const days = calculateDaysDifference(newStart, taskDueDate);
                      if (days !== null) setTaskEstHours(days.toString());
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tenggat Selesai (Due Date)</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => {
                      const newDue = e.target.value;
                      setTaskDueDate(newDue);
                      const days = calculateDaysDifference(taskStartDate, newDue);
                      if (days !== null) setTaskEstHours(days.toString());
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Teknis</label>
                <textarea
                  rows={2}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Keterangan teknis tugas..."
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EDIT TASK MODAL                                                        */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Edit Task Teknis</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editTaskError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{editTaskError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateTask} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key *</label>
                  <input
                    type="text"
                    required
                    value={editTaskKey}
                    onChange={(e) => setEditTaskKey(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Task *</label>
                  <input
                    type="text"
                    required
                    value={editTaskTitle}
                    onChange={(e) => setEditTaskTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prioritas</label>
                  <select
                    value={editTaskPriority}
                    onChange={(e) => setEditTaskPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Epic Induk</label>
                  <select
                    value={editTaskEpicId}
                    onChange={(e) => setEditFeatEpicId(e.target.value)}
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Assignee</label>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickMemberTarget("edit");
                        setIsQuickAddMemberOpen(true);
                      }}
                      className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Anggota Baru</span>
                    </button>
                  </div>
                  <select
                    value={editTaskAssignee}
                    onChange={(e) => {
                      if (e.target.value === "__NEW_MEMBER__") {
                        setQuickMemberTarget("edit");
                        setIsQuickAddMemberOpen(true);
                      } else {
                        setEditTaskAssignee(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="">-- Belum Ditugaskan (Unassigned) --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                    {editTaskAssignee && !members.some((m) => m.name === editTaskAssignee) && (
                      <option value={editTaskAssignee}>{editTaskAssignee} (Lainnya)</option>
                    )}
                    <option value="__NEW_MEMBER__" className="text-blue-600 font-semibold bg-blue-50">
                      ➕ Tambah Anggota Baru...
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    <span>Estimasi Hari</span>
                    <span className="text-[10px] text-slate-400 font-normal ml-1">(Otomatis/Manual)</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={editTaskEstHours}
                    onChange={(e) => setEditTaskEstHours(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Mulai (Start Date)</label>
                  <input
                    type="date"
                    value={editTaskStartDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setEditTaskStartDate(newStart);
                      const days = calculateDaysDifference(newStart, editTaskDueDate);
                      if (days !== null) setEditTaskEstHours(days.toString());
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tenggat Selesai (Due Date)</label>
                  <input
                    type="date"
                    value={editTaskDueDate}
                    onChange={(e) => {
                      const newDue = e.target.value;
                      setEditTaskDueDate(newDue);
                      const days = calculateDaysDifference(editTaskStartDate, newDue);
                      if (days !== null) setEditTaskEstHours(days.toString());
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Teknis</label>
                <textarea
                  rows={2}
                  value={editTaskDesc}
                  onChange={(e) => setEditTaskDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. QUICK ADD MEMBER INLINE MINI-MODAL                                    */}
      {/* ========================================================================= */}
      {isQuickAddMemberOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <User className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Tambah Anggota Tim Cepat</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddMemberOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Anggota baru akan langsung terdaftar di proyek dan otomatis terpilih sebagai Assignee task ini.
            </p>

            <form onSubmit={handleInlineAddMember} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickMemberName}
                  onChange={(e) => setQuickMemberName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Peran / Role</label>
                <select
                  value={quickMemberRole}
                  onChange={(e) => setQuickMemberRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="DEVELOPER">Developer</option>
                  <option value="UI_UX_DESIGNER">UI/UX Designer</option>
                  <option value="QA_ENGINEER">QA Engineer</option>
                  <option value="TECH_LEAD">Tech Lead</option>
                  <option value="DEVOPS">DevOps</option>
                  <option value="PRODUCT_MANAGER">Product Manager</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickAddMemberOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAddingMember || !quickMemberName.trim()}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isAddingMember ? "Menyimpan..." : "Simpan & Pilih"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. BLOCKER REASON MODAL                                                   */}
      {/* ========================================================================= */}
      {selectedTaskForBlock && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-bold text-slate-900 text-base">Tandai Task Terhambat (Blocked)</h3>
            </div>

            <p className="text-xs text-slate-600">
              Sistem mengharuskan alasan eksplisit mengapa task <strong>{selectedTaskForBlock.key}</strong> ini terhambat agar tim dapat segera membantu.
            </p>

            {blockerError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {blockerError}
              </div>
            )}

            <form onSubmit={handleConfirmBlocker} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan / Kendala Blocker *
                </label>
                <textarea
                  rows={3}
                  required
                  value={blockerReasonInput}
                  onChange={(e) => setBlockerReasonInput(e.target.value)}
                  placeholder="Contoh: Menunggu kredensial API sandbox dari pihak vendor payment gateway..."
                  className="w-full px-3 py-2 text-xs border border-rose-200 rounded-lg bg-rose-50/30 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
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
                  {isSubmitting ? "Menyimpan..." : "Konfirmasi Status Blocked"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
