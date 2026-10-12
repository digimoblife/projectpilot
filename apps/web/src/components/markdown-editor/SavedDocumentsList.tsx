"use client";

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Download,
  Edit3,
  FilePlus,
  FileText,
  Files,
  Search,
  Trash2,
} from "lucide-react";
import { SavedMarkdownDoc } from "./types";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";

interface SavedDocumentsListProps {
  documents: SavedMarkdownDoc[];
  onSelectDocument: (doc: SavedMarkdownDoc) => void;
  onDeleteDocument: (id: string) => void;
  onCreateNewDoc: () => void;
}

export function SavedDocumentsList({
  documents,
  onSelectDocument,
  onDeleteDocument,
  onCreateNewDoc,
}: SavedDocumentsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [docToDelete, setDocToDelete] = useState<SavedMarkdownDoc | null>(null);

  const filteredDocs = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    return doc.title.toLowerCase().includes(q) || doc.content.toLowerCase().includes(q);
  });

  const handleDownloadMd = (doc: SavedMarkdownDoc, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanFileName = (doc.title.trim() || "dokumen-markdown").replace(/[^a-zA-Z0-9_-]/g, "_");
    const blob = new Blob([doc.content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${cleanFileName}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmDelete = () => {
    if (docToDelete) {
      onDeleteDocument(docToDelete.id);
      setDocToDelete(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Search & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul dokumen atau kata kunci di dalam teks..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
          />
        </div>

        <button
          type="button"
          onClick={onCreateNewDoc}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs active:scale-[0.98] transition-all cursor-pointer shrink-0"
        >
          <FilePlus className="w-4 h-4" />
          <span>+ Buat Dokumen Baru</span>
        </button>
      </div>

      {/* Document Grid / List */}
      {filteredDocs.length === 0 ? (
        <EmptyState
          icon={Files}
          title={searchQuery ? "Tidak Ada Dokumen yang Cocok" : "Belum Ada Dokumen Tersimpan"}
          description={
            searchQuery
              ? `Tidak ditemukan dokumen dengan kata kunci "${searchQuery}".`
              : "Mulai tulis catatan atau spesifikasi pertama Anda di tab Editor untuk menyimpannya di sini."
          }
          actionLabel="+ Tulis Dokumen Baru"
          onAction={onCreateNewDoc}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            // Snippet of first non-heading text
            const snippet = doc.content
              .replace(/^[#*-].*$/gm, "")
              .replace(/\n+/g, " ")
              .trim()
              .slice(0, 140);

            const updatedDate = new Date(doc.updatedAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className="group relative bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200 hover:border-purple-300 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer"
              >
                <div className="space-y-3">
                  {/* Top card metadata */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
                        <FileText className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors line-clamp-1">
                        {doc.title || "Dokumen Tanpa Judul"}
                      </h3>
                    </div>

                    <span className="font-mono text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 shrink-0">
                      .md
                    </span>
                  </div>

                  {/* Content snippet */}
                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                    {snippet || "*Tidak ada cuplikan teks*"}
                  </p>
                </div>

                {/* Footer metadata & actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{updatedDate}</span>
                    <span>•</span>
                    <span>{doc.wordCount} kata</span>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => handleDownloadMd(doc, e)}
                      title="Unduh file .md"
                      className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDocToDelete(doc);
                      }}
                      title="Hapus dokumen"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      <ConfirmDeleteModal
        isOpen={!!docToDelete}
        title="Hapus Dokumen Markdown?"
        description={
          <>
            Apakah Anda yakin ingin menghapus dokumen{" "}
            <strong className="text-slate-900">&quot;{docToDelete?.title}&quot;</strong>? Dokumen ini
            akan dihapus dari penyimpanan browser Anda.
          </>
        }
        isLoading={false}
        onConfirm={handleConfirmDelete}
        onClose={() => setDocToDelete(null)}
      />
    </div>
  );
}
