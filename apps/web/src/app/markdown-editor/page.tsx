"use client";

import React, { useEffect, useState } from "react";
import { FolderOpen, Sparkles, SquarePen } from "lucide-react";
import { MarkdownEditorWorkspace } from "@/components/markdown-editor/MarkdownEditorWorkspace";
import { SavedDocumentsList } from "@/components/markdown-editor/SavedDocumentsList";
import {
  deleteDocument,
  getActiveDocumentId,
  getAllDocuments,
  saveDocument,
  setActiveDocumentId,
} from "@/components/markdown-editor/storage";
import { SavedMarkdownDoc } from "@/components/markdown-editor/types";

export default function MarkdownEditorPage() {
  const [activeTab, setActiveTab] = useState<"EDITOR" | "SAVED_DOCS">("EDITOR");
  const [documents, setDocuments] = useState<SavedMarkdownDoc[]>([]);
  const [activeDoc, setActiveDoc] = useState<SavedMarkdownDoc | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load documents on mount
  useEffect(() => {
    const loadedDocs = getAllDocuments();
    setDocuments(loadedDocs);

    const savedActiveId = getActiveDocumentId();
    const foundDoc = loadedDocs.find((d) => d.id === savedActiveId) || loadedDocs[0] || null;
    setActiveDoc(foundDoc);
    setIsInitialized(true);
  }, []);

  const handleSaveDoc = (data: { id: string; title: string; content: string }) => {
    const result = saveDocument(data);
    if (result.success && result.data) {
      const refreshed = getAllDocuments();
      setDocuments(refreshed);
      setActiveDoc(result.data);
    }
    return result;
  };

  const handleCreateNewDoc = () => {
    const res = saveDocument({
      title: "Dokumen Baru",
      content: "# Dokumen Baru\n\nMulai tulis catatan Anda di sini...\n",
    });
    if (res.success && res.data) {
      const refreshed = getAllDocuments();
      setDocuments(refreshed);
      setActiveDoc(res.data);
      setActiveTab("EDITOR");
    } else {
      alert(res.errorMessage || "Gagal membuat dokumen baru di penyimpanan lokal.");
    }
  };

  const handleSelectDoc = (doc: SavedMarkdownDoc) => {
    setActiveDocumentId(doc.id);
    setActiveDoc(doc);
    setActiveTab("EDITOR");
  };

  const handleDeleteDoc = (id: string) => {
    const res = deleteDocument(id);
    if (!res.success) {
      alert(res.errorMessage || "Gagal menghapus dokumen dari penyimpanan lokal.");
      return;
    }
    const refreshed = getAllDocuments();
    setDocuments(refreshed);
    if (activeDoc?.id === id) {
      setActiveDoc(refreshed[0] || null);
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Markdown Editor & Exporter</span>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 uppercase tracking-wider">
              Tool
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tulis format Markdown dengan pratinjau real-time, simpan catatan di browser, serta ekspor ke file .md atau cetak PDF resmi.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("EDITOR")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "EDITOR"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <SquarePen className="w-3.5 h-3.5 text-purple-600" />
            <span>Editor & Pratinjau</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("SAVED_DOCS")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "SAVED_DOCS"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 text-sky-600" />
            <span>Dokumen Tersimpan</span>
            {documents.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono">
                {documents.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area based on Tab */}
      {activeTab === "EDITOR" && activeDoc ? (
        <MarkdownEditorWorkspace
          currentDoc={activeDoc}
          onSaveCurrentDoc={handleSaveDoc}
          onCreateNewDoc={handleCreateNewDoc}
          onOpenSavedList={() => setActiveTab("SAVED_DOCS")}
          savedCount={documents.length}
        />
      ) : activeTab === "EDITOR" && !activeDoc ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
          <SquarePen className="w-10 h-10 text-slate-400 mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Belum Ada Dokumen Aktif</h3>
            <p className="text-xs text-slate-500 mt-1">Buat dokumen baru untuk mulai menulis teks Markdown.</p>
          </div>
          <button
            type="button"
            onClick={handleCreateNewDoc}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs"
          >
            + Buat Dokumen Baru
          </button>
        </div>
      ) : (
        <SavedDocumentsList
          documents={documents}
          onSelectDocument={handleSelectDoc}
          onDeleteDocument={handleDeleteDoc}
          onCreateNewDoc={handleCreateNewDoc}
        />
      )}
    </div>
  );
}
