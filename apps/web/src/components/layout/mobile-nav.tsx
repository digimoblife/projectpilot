"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  FileText,
  FolderKanban,
  LayoutDashboard,
  MoreHorizontal,
} from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();

  const items = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, label: "Buka Dashboard" },
    { name: "Projects", href: "/projects", icon: FolderKanban, label: "Buka Proyek" },
    { name: "My Work", href: "/my-work", icon: CheckSquare, label: "Buka Tugas Saya" },
    { name: "Reports", href: "/reports", icon: FileText, label: "Buka Laporan" },
    { name: "Leads", href: "/leads", icon: MoreHorizontal, label: "Buka Pipeline Leads" },
  ];

  return (
    <nav
      aria-label="Navigasi Utama Mobile"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 flex justify-around items-center shadow-lg pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.name}
            href={item.href}
            aria-label={item.label}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2 rounded-xl text-[10px] font-medium transition-all focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 active:scale-95 ${
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
    </nav>
  );
}
