"use client";

import React from "react";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  FileCode,
  Quote,
  Table as TableIcon,
  Link as LinkIcon,
  Minus,
} from "lucide-react";

interface EditorToolbarProps {
  onInsert: (prefix: string, suffix?: string, defaultPlaceholder?: string) => void;
}

export function EditorToolbar({ onInsert }: EditorToolbarProps) {
  const tools = [
    {
      group: "Text Style",
      items: [
        {
          label: "Tebal (Bold)",
          icon: Bold,
          action: () => onInsert("**", "**", "teks tebal"),
        },
        {
          label: "Miring (Italic)",
          icon: Italic,
          action: () => onInsert("*", "*", "teks miring"),
        },
      ],
    },
    {
      group: "Headings",
      items: [
        {
          label: "Heading 1",
          icon: Heading1,
          action: () => onInsert("# ", "", "Judul Utama"),
        },
        {
          label: "Heading 2",
          icon: Heading2,
          action: () => onInsert("## ", "", "Sub Judul"),
        },
        {
          label: "Heading 3",
          icon: Heading3,
          action: () => onInsert("### ", "", "Poin Pembahasan"),
        },
      ],
    },
    {
      group: "Lists",
      items: [
        {
          label: "Daftar Poin (Bullet List)",
          icon: List,
          action: () => onInsert("- ", "", "Item daftar"),
        },
        {
          label: "Daftar Nomor (Numbered List)",
          icon: ListOrdered,
          action: () => onInsert("1. ", "", "Langkah pertama"),
        },
        {
          label: "Tugas Checklist (Task)",
          icon: CheckSquare,
          action: () => onInsert("- [ ] ", "", "Tugas yang harus diselesaikan"),
        },
      ],
    },
    {
      group: "Blocks & Structure",
      items: [
        {
          label: "Kutipan (Blockquote)",
          icon: Quote,
          action: () => onInsert("> ", "", "Catatan atau kutipan penting"),
        },
        {
          label: "Kode Baris (Inline Code)",
          icon: Code,
          action: () => onInsert("`", "`", "kode_variabel"),
        },
        {
          label: "Blok Kode (Code Block)",
          icon: FileCode,
          action: () => onInsert("```typescript\n", "\n```", "// Tulis kode di sini"),
        },
        {
          label: "Tautan (Link)",
          icon: LinkIcon,
          action: () => onInsert("[", "](https://example.com)", "Nama Tautan"),
        },
        {
          label: "Tabel Data",
          icon: TableIcon,
          action: () =>
            onInsert(
              "\n| Kolom 1 | Kolom 2 | Kolom 3 |\n|---|---|---|\n| Data A | Data B | Data C |\n| Data D | Data E | Data F |\n",
              "",
              ""
            ),
        },
        {
          label: "Garis Pembatas (Divider)",
          icon: Minus,
          action: () => onInsert("\n---\n\n", "", ""),
        },
      ],
    },
  ];

  return (
    <div className="flex items-center gap-1 p-1.5 bg-slate-50 border-b border-slate-200 overflow-x-auto shrink-0 select-none">
      {tools.map((group, groupIdx) => (
        <React.Fragment key={group.group}>
          {groupIdx > 0 && <div className="h-4 w-px bg-slate-200 mx-1 shrink-0" />}
          <div className="flex items-center gap-0.5 shrink-0">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  title={item.label}
                  aria-label={item.label}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 active:scale-95 transition-all focus:outline-hidden focus:ring-1 focus:ring-slate-900/10 cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
