"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CheckSquare,
  ChevronRight,
  FileText,
  Files,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const primaryItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, label: "Buka Dashboard" },
    { name: "Leads", href: "/leads", icon: Users, label: "Buka Pipeline Leads" },
    { name: "Projects", href: "/projects", icon: FolderKanban, label: "Buka Proyek" },
    { name: "My Work", href: "/my-work", icon: CheckSquare, label: "Buka Tugas Saya" },
  ];

  const secondaryItems = [
    {
      name: "Laporan Portfolio",
      desc: "Arsip laporan mingguan & bulanan",
      href: "/reports",
      icon: FileText,
    },
    {
      name: "Dokumentasi Proyek",
      desc: "FSD, User Guide & Admin Runbook",
      href: "/documents",
      icon: Files,
    },
  ];

  const isMoreActive = pathname.startsWith("/reports") || pathname.startsWith("/documents");

  function handleLogout() {
    setIsDrawerOpen(false);
    logout();
    router.replace("/login");
  }

  return (
    <>
      <nav
        aria-label="Navigasi Utama Mobile"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 py-1.5 flex justify-around items-center shadow-lg pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        {primaryItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              aria-label={item.label}
              className={`flex flex-col items-center justify-center min-w-[54px] min-h-[46px] px-2 rounded-xl text-[10px] font-medium transition-all focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 active:scale-95 ${
                isActive
                  ? "text-sky-600 font-bold bg-sky-50"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-sky-600" : "text-slate-400"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* More / Menu Button */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Buka Menu Lainnya"
          className={`flex flex-col items-center justify-center min-w-[54px] min-h-[46px] px-2 rounded-xl text-[10px] font-medium transition-all focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 active:scale-95 ${
            isMoreActive || isDrawerOpen
              ? "text-sky-600 font-bold bg-sky-50"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Menu className={`w-5 h-5 mb-0.5 ${isMoreActive || isDrawerOpen ? "text-sky-600" : "text-slate-400"}`} />
          <span>Menu</span>
        </button>
      </nav>

      {/* MOBILE MORE DRAWER SHEET */}
      {isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end justify-center animate-fadeIn">
          <div className="bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl w-full max-h-[85vh] overflow-y-auto p-5 space-y-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs border border-sky-200">
                  {user?.full_name?.slice(0, 2).toUpperCase() || "PM"}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{user?.full_name || "Project Lead"}</p>
                  <p className="text-[10px] text-slate-500">{user?.role || "PROJECT_MANAGER"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                Modul Tambahan
              </span>

              {secondaryItems.map((s) => {
                const Icon = s.icon;
                const isSubActive = pathname.startsWith(s.href);

                return (
                  <Link
                    key={s.name}
                    href={s.href}
                    onClick={() => setIsDrawerOpen(false)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isSubActive
                        ? "bg-sky-50 text-sky-900 border-sky-200 shadow-2xs font-semibold"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl border ${isSubActive ? "bg-sky-600 text-white border-sky-600" : "bg-white text-slate-600 border-slate-200"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">{s.name}</p>
                        <p className="text-[10px] text-slate-500">{s.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                );
              })}
            </div>

            {/* AI Status Card */}
            <div className="p-3.5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl text-white space-y-1.5 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-xs font-bold">ProjectPilot AI</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-slate-300 leading-relaxed">
                Evidence-grounded engine aktif &amp; terlindungi Human Approval Gate.
              </p>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 p-3 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-2xl border border-rose-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar dari Akun</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
