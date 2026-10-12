"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Columns2,
  Download,
  Eye,
  FileDown,
  FilePlus,
  FileText,
  FolderOpen,
  PenLine,
  Printer,
  Sparkles,
  Upload,
} from "lucide-react";
import { EditorToolbar } from "./EditorToolbar";
import { SavedMarkdownDoc, ViewMode } from "./types";
import { countWords, SAMPLE_MARKDOWN } from "./storage";
import { MarkdownViewer } from "@/components/ui/markdown-viewer";

interface MarkdownEditorWorkspaceProps {
  currentDoc: SavedMarkdownDoc;
  onSaveCurrentDoc: (doc: { id: string; title: string; content: string }) => void;
  onCreateNewDoc: () => void;
  onOpenSavedList: () => void;
  savedCount: number;
}

export function MarkdownEditorWorkspace({
  currentDoc,
  onSaveCurrentDoc,
  onCreateNewDoc,
  onOpenSavedList,
  savedCount,
}: MarkdownEditorWorkspaceProps) {
  const [title, setTitle] = useState(currentDoc.title);
  const [content, setContent] = useState(currentDoc.content);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [saveStatus, setSaveStatus] = useState<"SAVED" | "SAVING">("SAVED");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal state when currentDoc changes externally (e.g. from switching doc)
  useEffect(() => {
    setTitle(currentDoc.title);
    setContent(currentDoc.content);
    setSaveStatus("SAVED");
  }, [currentDoc.id]);

  // Debounced auto-save
  const triggerAutoSave = (newTitle: string, newContent: string) => {
    setSaveStatus("SAVING");
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      onSaveCurrentDoc({
        id: currentDoc.id,
        title: newTitle,
        content: newContent,
      });
      setSaveStatus("SAVED");
    }, 500);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    triggerAutoSave(newTitle, content);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    triggerAutoSave(title, newContent);
  };

  // Insert markdown tag at cursor
  const handleInsertTag = (prefix: string, suffix = "", defaultPlaceholder = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;

    const selectedText = currentText.substring(start, end) || defaultPlaceholder;
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newContent =
      currentText.substring(0, start) + replacement + currentText.substring(end);

    setContent(newContent);
    triggerAutoSave(title, newContent);

    // Reposition cursor
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Download .md file
  const handleDownloadMarkdown = () => {
    const cleanFileName = (title.trim() || "dokumen-markdown").replace(/[^a-zA-Z0-9_-]/g, "_");
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${cleanFileName}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import .md file
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (typeof text === "string") {
        const fileTitle = file.name.replace(/\.md$/i, "");
        setTitle(fileTitle);
        setContent(text);
        onSaveCurrentDoc({
          id: currentDoc.id,
          title: fileTitle,
          content: text,
        });
        setSaveStatus("SAVED");
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = "";
  };

  // Load sample template
  const handleLoadSample = () => {
    if (content.trim() && content !== SAMPLE_MARKDOWN) {
      if (!confirm("Ganti isi editor dengan contoh template? Dokumen saat ini akan ditimpa.")) {
        return;
      }
    }
    setTitle("Dokumen Spesifikasi Proyek");
    setContent(SAMPLE_MARKDOWN);
    onSaveCurrentDoc({
      id: currentDoc.id,
      title: "Dokumen Spesifikasi Proyek",
      content: SAMPLE_MARKDOWN,
    });
    setSaveStatus("SAVED");
  };

  const wordCount = countWords(content);
  const charCount = content.length;

  return (
    <div className="flex flex-col space-y-4">
      {/* Top Workspace Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Document Title & Save Status */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
            <FileText className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Ketik judul dokumen di sini..."
              className="w-full text-sm font-bold text-slate-900 bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-purple-600 focus:ring-0 px-0 py-0.5 transition-colors placeholder:text-slate-400"
            />
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
              <span className="font-mono text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                .md
              </span>
              <span>•</span>
              <span className={saveStatus === "SAVING" ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>
                {saveStatus === "SAVING" ? "Menyimpan otomatis..." : "Tersimpan di browser"}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions & View Switcher */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === "split"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Split View (Editor & Pratinjau berdampingan)"
            >
              <Columns2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("editor")}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === "editor"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Hanya Teks Editor"
            >
              <PenLine className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === "preview"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Hanya Pratinjau Dokumen"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* New Document Button */}
          <button
            type="button"
            onClick={onCreateNewDoc}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl active:scale-[0.98] transition-all shadow-2xs cursor-pointer"
            title="Mulai lembar dokumen baru"
          >
            <FilePlus className="w-3.5 h-3.5 text-purple-600" />
            <span>Baru</span>
          </button>

          {/* Open Saved Documents */}
          <button
            type="button"
            onClick={onOpenSavedList}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl active:scale-[0.98] transition-all shadow-2xs cursor-pointer"
            title="Buka repositori dokumen tersimpan"
          >
            <FolderOpen className="w-3.5 h-3.5 text-sky-600" />
            <span>Dokumen ({savedCount})</span>
          </button>

          {/* Import file button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".md,.markdown,.txt"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl active:scale-[0.98] transition-all shadow-2xs cursor-pointer"
            title="Impor file .md dari komputer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Impor</span>
          </button>

          {/* Download .md */}
          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs active:scale-[0.98] transition-all cursor-pointer"
            title="Unduh isi editor sebagai file .md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh .md</span>
          </button>
        </div>
      </div>

      {/* Editor & Preview Workspace Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch min-h-[640px]">
        {/* Left Panel: Markdown Editor */}
        {(viewMode === "split" || viewMode === "editor") && (
          <div
            className={`flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden ${
              viewMode === "editor" ? "lg:col-span-12" : "lg:col-span-6"
            }`}
          >
            {/* Quick Insert Toolbar */}
            <EditorToolbar onInsert={handleInsertTag} />

            {/* Textarea Area */}
            <div className="relative flex-1 flex flex-col p-3">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                placeholder="Mulai ketik dokumen Markdown di sini..."
                className="w-full flex-1 p-2 text-xs sm:text-sm font-mono leading-relaxed bg-transparent border-0 resize-none focus:outline-none focus:ring-0 text-slate-900 placeholder:text-slate-400 min-h-[500px]"
                spellCheck={false}
              />
            </div>

            {/* Editor Footer Status Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500">
              <div className="flex items-center gap-3">
                <span>{wordCount} kata</span>
                <span>•</span>
                <span>{charCount} karakter</span>
              </div>
              <button
                type="button"
                onClick={handleLoadSample}
                className="inline-flex items-center gap-1 text-[11px] text-purple-600 hover:text-purple-700 hover:underline font-medium cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Muat Contoh Format</span>
              </button>
            </div>
          </div>
        )}

        {/* Right Panel: Live Preview & PDF Printing */}
        {(viewMode === "split" || viewMode === "preview") && (
          <div
            className={`flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden p-5 ${
              viewMode === "preview" ? "lg:col-span-12" : "lg:col-span-6"
            }`}
          >
            <MarkdownViewer
              content={content || "*Dokumen kosong. Mulai ketik di editor sebelah kiri.*"}
              title={title}
              showPrintButton={true}
              showCopyButton={true}
              className="flex-1"
            />
          </div>
        )}
      </div>
    </div>
  );
}
