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
  Sparkles,
  Users,
} from "lucide-react";

const navigationItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, label: "Buka PM Control Center" },
  { name: "Leads", href: "/leads", icon: Users, label: "Buka Pipeline Leads" },
  { name: "Projects", href: "/projects", icon: FolderKanban, label: "Buka Daftar Proyek" },
  { name: "My Work", href: "/my-work", icon: CheckSquare, label: "Buka Task Saya" },
  { name: "MoM Generator", href: "/mom", icon: Sparkles, label: "Buka MoM Generator" },
  { name: "Reports", href: "/reports", icon: FileText, label: "Buka Repositori Laporan" },
  { name: "Documents", href: "/documents", icon: Files, label: "Buka Repositori Dokumen" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Navigasi Sidebar Desktop"
      className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50 bg-[var(--ph-bg-nav)] border-r border-[var(--ph-border-soft)]"
    >
      <div className="flex items-center px-4 h-16 border-b border-[var(--ph-border-soft)] shrink-0">
        <Link href="/dashboard" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Project Hub"
            className="h-9 w-auto object-contain max-w-[200px]"
          />
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Menu Utama">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}`));
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-label={item.label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] focus:outline-hidden focus:ring-2 focus:ring-[var(--ph-primary)]/20 ${
                isActive
                  ? "bg-[var(--ph-primary)] text-white shadow-xs font-semibold"
                  : "text-[var(--ph-text-secondary)] hover:bg-[var(--ph-surface-hover)] hover:text-[var(--ph-text)]"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[var(--ph-text-placeholder)]"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[var(--ph-border-soft)]">
        <p className="text-[11px] font-medium text-[var(--ph-text-muted)] text-center tracking-wide">
          ProjectHub
        </p>
      </div>
    </aside>
  );
}
