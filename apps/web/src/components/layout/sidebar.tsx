"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Files,
  FolderKanban,
  LayoutDashboard,
  Sparkles,
  Users,
} from "lucide-react";
import { useSidebar } from "@/components/layout/sidebar-context";

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
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <aside
      aria-label="Navigasi Sidebar Desktop"
      className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-50 bg-[var(--ph-bg-nav)] border-r border-[var(--ph-border-soft)] transition-[width] duration-200 ease-in-out ${
        isCollapsed ? "w-[96px]" : "w-64"
      }`}
    >
      {/* Sidebar Header */}
      {isCollapsed ? (
        <div className="flex items-center justify-between px-3 h-16 border-b border-[var(--ph-border-soft)] shrink-0 gap-3">
          <Link
            href="/dashboard"
            className="flex items-center justify-center shrink-0 transition-transform hover:scale-105"
            title="ProjectHub Dashboard"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-icon.png"
              alt="ProjectHub"
              className="w-7 h-7 object-contain"
            />
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Perluas Menu Samping (Cmd+B)"
            title="Perluas Menu Samping (Cmd+B)"
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-[var(--ph-border-soft)] bg-[var(--ph-surface)] text-[var(--ph-text-muted)] hover:text-[var(--ph-text)] hover:bg-[var(--ph-surface-hover)] shadow-2xs transition-colors shrink-0 focus:outline-hidden focus:ring-2 focus:ring-[var(--ph-primary)]/20"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 h-16 border-b border-[var(--ph-border-soft)] shrink-0">
          <Link href="/dashboard" className="flex items-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="ProjectHub"
              className="h-[43px] w-auto object-contain max-w-[170px]"
            />
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Ciutkan Menu Samping (Cmd+B)"
            title="Ciutkan Menu Samping (Cmd+B)"
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-[var(--ph-border-soft)] bg-[var(--ph-surface)] text-[var(--ph-text-muted)] hover:text-[var(--ph-text)] hover:bg-[var(--ph-surface-hover)] shadow-2xs transition-colors shrink-0 focus:outline-hidden focus:ring-2 focus:ring-[var(--ph-primary)]/20"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Items */}
      <nav
        className={`flex-1 px-3 py-4 space-y-1.5 ${
          isCollapsed ? "overflow-visible" : "overflow-y-auto"
        }`}
        aria-label="Menu Utama"
      >
        {navigationItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(`${item.href}`));
          const Icon = item.icon;

          if (isCollapsed) {
            return (
              <div key={item.name} className="relative group flex justify-center">
                <Link
                  href={item.href}
                  aria-label={item.label}
                  className={`flex items-center justify-center w-11 h-11 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] focus:outline-hidden focus:ring-2 focus:ring-[var(--ph-primary)]/20 ${
                    isActive
                      ? "bg-[var(--ph-primary)] text-white shadow-xs"
                      : "text-[var(--ph-text-secondary)] hover:bg-[var(--ph-surface-hover)] hover:text-[var(--ph-text)]"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? "text-white" : "text-[var(--ph-text-secondary)]"
                    }`}
                  />
                  <span className="sr-only">{item.name}</span>
                </Link>

                {/* Floating Tooltip */}
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center px-2.5 py-1 text-xs font-medium text-white bg-[var(--ph-neutral-800)] rounded-md shadow-md whitespace-nowrap z-50 pointer-events-none transition-opacity">
                  {item.name}
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              aria-label={item.label}
              className={`flex items-center gap-3 px-3.5 h-11 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] focus:outline-hidden focus:ring-2 focus:ring-[var(--ph-primary)]/20 ${
                isActive
                  ? "bg-[var(--ph-primary)] text-white shadow-xs font-semibold"
                  : "text-[var(--ph-text-secondary)] hover:bg-[var(--ph-surface-hover)] hover:text-[var(--ph-text)]"
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? "text-white" : "text-[var(--ph-text-secondary)]"
                }`}
              />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[var(--ph-border-soft)] shrink-0">
          <p className="text-[11px] font-medium text-[var(--ph-text-muted)] text-center tracking-wide">
            ProjectHub
          </p>
        </div>
      )}
    </aside>
  );
}
