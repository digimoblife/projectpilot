"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  MoreHorizontal,
  FileText,
} from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();

  const items = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Projects", href: "/projects", icon: FolderKanban },
    { name: "My Work", href: "/my-work", icon: CheckSquare },
    { name: "Reports", href: "/reports", icon: FileText },
    { name: "Leads", href: "/leads", icon: MoreHorizontal },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 px-2 py-1.5 flex justify-around items-center">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
              isActive ? "text-sky-600 font-semibold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
