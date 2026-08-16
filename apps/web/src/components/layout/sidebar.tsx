"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  Compass,
  FileText,
  Files,
  FolderKanban,
  LayoutDashboard,
  Users,
} from "lucide-react";

const navigationItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, label: "Buka PM Control Center" },
  { name: "Leads", href: "/leads", icon: Users, label: "Buka Pipeline Leads" },
  { name: "Projects", href: "/projects", icon: FolderKanban, label: "Buka Daftar Proyek" },
  { name: "My Work", href: "/my-work", icon: CheckSquare, label: "Buka Task Saya" },
  { name: "Reports", href: "/reports", icon: FileText, label: "Buka Repositori Laporan" },
  { name: "Documents", href: "/documents", icon: Files, label: "Buka Repositori Dokumen" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Navigasi Sidebar Desktop"
      className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50 bg-white border-r border-slate-200"
    >
      <div className="flex items-center px-4 h-16 border-b border-slate-200">
        <Link href="/dashboard" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Project Hub"
            className="h-9 w-auto object-contain max-w-[200px]"
          />
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Menu Utama">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}`));
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-label={item.label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 ${
                isActive
                  ? "bg-sky-50 text-sky-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-sky-600" : "text-slate-400"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-700">ProjectPilot AI</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Evidence-grounded engine aktif dan terlindungi.
          </p>
        </div>
      </div>
    </aside>
  );
}
