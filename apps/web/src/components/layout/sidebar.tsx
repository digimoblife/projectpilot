"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckSquare,
  FileText,
  Files,
  Compass,
} from "lucide-react";

const navigationItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "My Work", href: "/my-work", icon: CheckSquare },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Documents", href: "/documents", icon: Files },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50 bg-white border-r border-slate-200">
      <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-200">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sky-600 text-white shadow-sm">
          <Compass className="w-5 h-5" />
        </div>
        <div>
          <span className="font-semibold text-slate-900 tracking-tight text-lg block">ProjectPilot</span>
          <span className="text-[11px] text-slate-500 font-medium block -mt-0.5">PM Operating Hub</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sky-50 text-sky-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-sky-600" : "text-slate-400"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Model AI Aktif</span>
            <span className="font-mono text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">Ready</span>
          </div>
          <p className="text-xs font-semibold text-slate-800">Gemini 3.5 Flash-Lite</p>
        </div>
      </div>
    </aside>
  );
}
