"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Command,
  ExternalLink,
  FileCheck2,
  FileCode,
  FileText,
  FolderKanban,
  Layers,
  LogOut,
  Search,
  ShieldAlert,
  Sparkles,
  Tag,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface SearchResultItem {
  entity_type: string;
  entity_id: string;
  project_id: string | null;
  key: string;
  title: string;
  subtitle: string | null;
  route: string;
}

interface GlobalSearchResponse {
  query: string;
  total_count: number;
  results: SearchResultItem[];
}

export interface NotificationItem {
  id: string;
  category: "OVERDUE" | "BLOCKER" | "CLIENT" | "LEAD" | "SYSTEM";
  title: string;
  description: string;
  project_code?: string;
  time_ago: string;
  target_url: string;
  is_read: boolean;
}

const entityTypeColors: Record<string, string> = {
  PROJECT: "bg-blue-50 text-blue-700 border-blue-200",
  LEAD: "bg-purple-50 text-purple-700 border-purple-200",
  CLIENT: "bg-amber-50 text-amber-700 border-amber-200",
  TASK: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REQUIREMENT: "bg-indigo-50 text-indigo-700 border-indigo-200",
  DECISION: "bg-teal-50 text-teal-700 border-teal-200",
  BLOCKER: "bg-rose-50 text-rose-700 border-rose-200",
  MEETING: "bg-orange-50 text-orange-700 border-orange-200",
  REPORT: "bg-cyan-50 text-cyan-700 border-cyan-200",
  DOCUMENT: "bg-sky-50 text-sky-700 border-sky-200",
};

const categoryBadgeConfig: Record<
  NotificationItem["category"],
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  BLOCKER: {
    label: "Blocker",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    icon: AlertTriangle,
  },
  OVERDUE: {
    label: "Terlambat",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: Clock,
  },
  CLIENT: {
    label: "Akses Klien",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    icon: ShieldAlert,
  },
  LEAD: {
    label: "Presales Lead",
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    icon: UserCheck,
  },
  SYSTEM: {
    label: "Sistem",
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    icon: Bell,
  },
};

const initialDefaultNotifications: NotificationItem[] = [
  {
    id: "notif-1",
    category: "BLOCKER",
    title: "Blocker Integrasi API Payment Gateway",
    description: "Sandbox Midtrans belum diberikan oleh PIC Klien (PT Retail Jaya).",
    project_code: "NUSA-2026",
    time_ago: "15 mnt lalu",
    target_url: "/projects",
    is_read: false,
  },
  {
    id: "notif-2",
    category: "OVERDUE",
    title: "Task 'Desain ERD Database PostgreSQL' Melewati Target",
    description: "Target penyelesaian tanggal kemarin. Harap cek kendala dengan backend engineer.",
    project_code: "NUSA-2026",
    time_ago: "1 jam lalu",
    target_url: "/projects",
    is_read: false,
  },
  {
    id: "notif-3",
    category: "LEAD",
    title: "Lead Baru: Omnichannel CRM & POS Integration",
    description: "Lead baru dibuat, siap untuk dijadwalkan Discovery Brief.",
    project_code: "LEAD",
    time_ago: "3 jam lalu",
    target_url: "/leads",
    is_read: false,
  },
  {
    id: "notif-4",
    category: "CLIENT",
    title: "Dokumen Kuesioner Discovery Brief Diterima",
    description: "PIC Anita Wijaya telah melampirkan referensi spesifikasi teknis scanner barcode.",
    project_code: "PRESALES",
    time_ago: "5 jam lalu",
    target_url: "/leads",
    is_read: true,
  },
];

export function Header() {
  const router = useRouter();
  const { user, token, logout } = useAuth();

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Notification popover state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialDefaultNotifications);
  const [notificationFilter, setNotificationFilter] = useState<"ALL" | "UNREAD">("ALL");

  const inputRef = useRef<HTMLInputElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const notifButtonRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Keyboard shortcut Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === "Escape") {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close notifications on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(e.target as Node) &&
        notifButtonRef.current &&
        !notifButtonRef.current.contains(e.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    }

    if (isNotificationsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      try {
        const res = await apiClient<GlobalSearchResponse>(`/search?q=${encodeURIComponent(searchQuery)}&limit=15`, {
          headers,
        });
        if (res.data) {
          setSearchResults(res.data.results);
        }
      } catch {
        // Handled
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, token]);

  function handleSelectResult(route: string) {
    setIsSearchOpen(false);
    setSearchQuery("");
    router.push(route);
  }

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  function handleMarkAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  function handleNotificationClick(notif: NotificationItem) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
    );
    setIsNotificationsOpen(false);
    router.push(notif.target_url);
  }

  const filteredNotifications = notifications.filter((n) => {
    if (notificationFilter === "UNREAD") return !n.is_read;
    return true;
  });

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 md:px-8 bg-white/80 backdrop-blur-md border-b border-slate-200">
        {/* Search Trigger */}
        <div className="flex items-center gap-3 flex-1 max-w-md mr-2 sm:mr-0">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center justify-between w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors text-slate-400 group text-left shadow-2xs"
            aria-label="Cari di seluruh sistem (Cmd+K)"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
              <span className="hidden sm:inline truncate">Cari proyek, requirement, task, atau dokumen...</span>
              <span className="sm:hidden text-slate-500 font-medium">Cari...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-white border border-slate-200 rounded text-slate-500 shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Nav */}
        <div className="flex items-center gap-1.5 sm:gap-2 relative">
          {/* Notification Button */}
          <button
            ref={notifButtonRef}
            type="button"
            onClick={() => setIsNotificationsOpen((prev) => !prev)}
            className={`p-2 rounded-xl transition-all relative ${
              isNotificationsOpen
                ? "bg-slate-100 text-slate-900 ring-2 ring-sky-500/20"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
            aria-label="Notifikasi Operasional"
            title="Pusat Notifikasi"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center leading-none border-2 border-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* User Profile Info */}
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 ml-0.5 sm:ml-1 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-semibold text-xs border border-sky-200">
              {user?.full_name?.slice(0, 2).toUpperCase() || "PM"}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-slate-800">{user?.full_name || "Project Lead"}</p>
              <p className="text-[11px] text-slate-500">{user?.role || "PROJECT_MANAGER"}</p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              aria-label="Keluar"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* ========================================================================= */}
          {/* NOTIFICATION POPOVER DROPDOWN */}
          {/* ========================================================================= */}
          {isNotificationsOpen && (
            <div
              ref={notifDropdownRef}
              className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-12 w-[calc(100vw-1rem)] sm:w-96 max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden flex flex-col animate-fadeIn"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">Notifikasi Operasional</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200">
                      {unreadCount} baru
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 hover:underline"
                  >
                    <Check className="w-3 h-3" />
                    <span>Tandai Semua Dibaca</span>
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="px-4 py-2 bg-slate-50/30 border-b border-slate-100 flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setNotificationFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    notificationFilter === "ALL"
                      ? "bg-white text-slate-900 shadow-2xs font-semibold border border-slate-200/80"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Semua ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationFilter("UNREAD")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    notificationFilter === "UNREAD"
                      ? "bg-white text-slate-900 shadow-2xs font-semibold border border-slate-200/80"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Belum Dibaca ({unreadCount})
                </button>
              </div>

              {/* Notification List */}
              <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-semibold text-slate-800">Semua Beres!</p>
                    <p className="text-[11px] text-slate-400">Tidak ada notifikasi yang tertunda saat ini.</p>
                  </div>
                ) : (
                  filteredNotifications.map((notif) => {
                    const cfg = categoryBadgeConfig[notif.category] || categoryBadgeConfig.SYSTEM;
                    const Icon = cfg.icon;

                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 relative group ${
                          notif.is_read
                            ? "bg-white hover:bg-slate-50 text-slate-600"
                            : "bg-sky-50/30 hover:bg-sky-50/60 text-slate-900"
                        }`}
                      >
                        {/* Left Category Icon */}
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${cfg.bg} ${cfg.text} ${cfg.border} shadow-2xs`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 truncate">
                              {notif.project_code && (
                                <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                                  {notif.project_code}
                                </span>
                              )}
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                {cfg.label}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium shrink-0">
                              {notif.time_ago}
                            </span>
                          </div>

                          <h4
                            className={`text-xs leading-snug line-clamp-1 ${
                              notif.is_read ? "font-semibold text-slate-700" : "font-bold text-slate-900"
                            }`}
                          >
                            {notif.title}
                          </h4>

                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {notif.description}
                          </p>
                        </div>

                        {/* Unread dot */}
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-sky-600 shrink-0 mt-1" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-50/80 border-t border-slate-100 text-center">
                <Link
                  href="/dashboard"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
                >
                  <span>Buka PM Control Center</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* GLOBAL SEARCH COMMAND PALETTE MODAL */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden space-y-0">
            {/* Input Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama proyek, PIC, fitur, task key, atau dokumen..."
                className="w-full text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
              />
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results Area */}
            <div className="max-h-96 overflow-y-auto p-2 space-y-1">
              {isSearching ? (
                <div className="p-8 text-center text-xs text-slate-400">Mencari di seluruh sistem...</div>
              ) : searchQuery && searchResults.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Tidak ada hasil ditemukan untuk &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : !searchQuery ? (
                <div className="p-4 text-center text-[11px] text-slate-400">
                  Ketik kata kunci untuk mencari proyek, task, isu, atau dokumen.
                </div>
              ) : (
                searchResults.map((item) => (
                  <button
                    key={`${item.entity_type}-${item.entity_id}`}
                    type="button"
                    onClick={() => handleSelectResult(item.route)}
                    className="w-full flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl transition-colors text-left group"
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                            entityTypeColors[item.entity_type] || "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {item.entity_type}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-slate-500">{item.key}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900 truncate">{item.title}</p>
                      {item.subtitle && <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>}
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 shrink-0" />
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span>Tekan</span>
                <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-white border border-slate-200 rounded text-slate-600">
                  ESC
                </kbd>
                <span>untuk menutup</span>
              </div>
              <span>Pencarian Global Terpadu</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
