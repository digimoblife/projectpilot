"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Command,
  FileCheck2,
  FileCode,
  FileText,
  FolderKanban,
  Layers,
  Search,
  Sparkles,
  User,
  LogOut,
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

export function Header() {
  const router = useRouter();
  const { user, token, logout } = useAuth();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === "Escape") {
        setIsSearchOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 md:px-8 bg-white/80 backdrop-blur-md border-b border-slate-200">
        {/* Search Trigger */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center justify-between w-full pl-3 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors text-slate-400 group text-left"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
              <span>Cari proyek, requirement, task, atau dokumen...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-white border border-slate-200 rounded text-slate-500 shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Nav */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors relative"
            aria-label="Notifikasi"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full" />
          </button>

          <div className="flex items-center gap-3 pl-3 ml-1 border-l border-slate-200">
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
        </div>
      </header>

      {/* GLOBAL SEARCH COMMAND PALETTE MODAL */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden space-y-0">
            {/* Input Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik kata kunci untuk mencari di seluruh proyek..."
                className="w-full text-xs text-slate-900 placeholder-slate-400 bg-transparent focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-slate-100 text-slate-500 rounded border border-slate-200">
                ESC
              </kbd>
            </div>

            {/* Results List */}
            <div className="max-h-96 overflow-y-auto p-2">
              {isSearching ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Mencari di seluruh repositori proyek...
                </div>
              ) : searchQuery && searchResults.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Tidak ditemukan hasil untuk &quot;<span className="font-semibold">{searchQuery}</span>&quot;.
                </div>
              ) : !searchQuery ? (
                <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                  <Command className="w-5 h-5 mx-auto text-slate-300" />
                  <p>Cari kode tugas (TSK-001), requirement (REQ-001), proyek, atau dokumen.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((item, idx) => {
                    const colorClass = entityTypeColors[item.entity_type] || "bg-slate-100 text-slate-700 border-slate-200";

                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectResult(item.route)}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${colorClass}`}>
                            {item.entity_type}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-1">
                              <span className="font-mono text-slate-500 mr-1">{item.key}</span>
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className="text-[10px] text-slate-400">{item.subtitle}</p>
                            )}
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-sans">
              <span>{searchResults.length} hasil ditemukan</span>
              <span>Tekan ESC untuk menutup</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
