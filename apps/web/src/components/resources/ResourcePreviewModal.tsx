"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Download,
  FileText,
  FileImage,
  AlertCircle,
  Loader2,
  ExternalLink,
  Eye,
  FileCode,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ProjectResource, formatBytes, formatDate } from "./types";
import {
  getPreviewFormat,
  fetchAuthenticatedBlob,
  fetchAuthenticatedText,
  PreviewFormat,
} from "./resourcePreview";

export interface PreviewableResourceItem {
  id: string;
  name: string;
  file_name?: string | null;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  created_at?: string | null;
}

interface ResourcePreviewModalProps {
  projectId: string;
  resource: PreviewableResourceItem;
  onClose: () => void;
  onDownload: (resource: PreviewableResourceItem) => void | Promise<void>;
}

export function ResourcePreviewModal({
  projectId,
  resource,
  onClose,
  onDownload,
}: ResourcePreviewModalProps) {
  const [format, setFormat] = useState<PreviewFormat>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [markdownText, setMarkdownText] = useState<string | null>(null);

  useEffect(() => {
    const fmt = getPreviewFormat(resource.file_name, resource.mime_type);
    setFormat(fmt);
    setIsLoading(true);
    setError(null);

    let active = true;
    let localBlobUrl: string | null = null;

    async function loadContent() {
      if (!fmt) {
        setError("Format berkas ini tidak mendukung preview.");
        setIsLoading(false);
        return;
      }

      if (fmt === "markdown") {
        const res = await fetchAuthenticatedText(projectId, resource.id);
        if (!active) return;
        if (res.error) {
          setError(res.error);
        } else {
          setMarkdownText(res.text);
        }
        setIsLoading(false);
      } else {
        // image or pdf
        const res = await fetchAuthenticatedBlob(projectId, resource.id);
        if (!active) return;
        if (res.error) {
          setError(res.error);
        } else if (res.blob) {
          localBlobUrl = URL.createObjectURL(res.blob);
          setBlobUrl(localBlobUrl);
        }
        setIsLoading(false);
      }
    }

    loadContent();

    return () => {
      active = false;
      if (localBlobUrl) {
        URL.revokeObjectURL(localBlobUrl);
      }
    };
  }, [projectId, resource]);

  const renderFormatBadge = () => {
    switch (format) {
      case "image":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-[10px] font-semibold">
            <FileImage className="w-3 h-3 text-indigo-600" />
            <span>Gambar</span>
          </span>
        );
      case "pdf":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/60 text-[10px] font-semibold">
            <FileText className="w-3 h-3 text-rose-600" />
            <span>Dokumen PDF</span>
          </span>
        );
      case "markdown":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60 text-[10px] font-semibold">
            <FileCode className="w-3 h-3 text-purple-600" />
            <span>Markdown</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
              <Eye className="w-4 h-4 text-slate-700" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 truncate" title={resource.name}>
                  {resource.name}
                </h3>
                {renderFormatBadge()}
              </div>
              <p className="text-[11px] font-mono text-slate-400 truncate" title={resource.file_name || ""}>
                {resource.file_name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shrink-0"
            title="Tutup Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 min-h-[350px] flex flex-col justify-center">
          {/* Loading State */}
          {isLoading && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-slate-500 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Memuat preview berkas...</p>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="max-w-md mx-auto p-6 bg-white rounded-2xl border border-rose-200 text-center shadow-xs space-y-3 my-auto">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">Preview Tidak Dapat Dimuat</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Anda tetap dapat mengunduh berkas ini untuk membukanya di aplikasi yang sesuai.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => onDownload(resource)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-black transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Berkas</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}

          {/* Image Preview */}
          {!isLoading && !error && format === "image" && blobUrl && (
            <div className="flex items-center justify-center p-2 my-auto">
              <img
                src={blobUrl}
                alt={resource.file_name || resource.name}
                className="max-h-[68vh] max-w-full object-contain rounded-xl border border-slate-200/80 shadow-md bg-white"
              />
            </div>
          )}

          {/* PDF Preview */}
          {!isLoading && !error && format === "pdf" && blobUrl && (
            <div className="w-full h-full min-h-[550px] sm:min-h-[650px] flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <iframe
                src={blobUrl}
                title={resource.file_name || resource.name}
                className="w-full h-full min-h-[550px] sm:min-h-[650px] border-0"
              />
            </div>
          )}

          {/* Markdown Preview */}
          {!isLoading && !error && format === "markdown" && markdownText !== null && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-3xl mx-auto w-full text-slate-800 text-xs sm:text-sm leading-relaxed overflow-x-hidden">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-4 mb-3 pb-2 border-b border-slate-200 tracking-tight">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-5 mb-2.5 pb-1 border-b border-slate-100">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm sm:text-base font-bold text-slate-800 mt-4 mb-2">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-3">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-outside ml-5 space-y-1 mb-3 text-xs sm:text-sm text-slate-700">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-outside ml-5 space-y-1 mb-3 text-xs sm:text-sm text-slate-700">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed pl-0.5">{children}</li>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3 rounded-xl border border-slate-200 shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                      {children}
                    </thead>
                  ),
                  th: ({ children }) => (
                    <th className="px-3 py-2 font-semibold text-slate-700 border-r last:border-r-0 border-slate-200">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-2 border-t border-r last:border-r-0 border-slate-200 text-slate-700">
                      {children}
                    </td>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="p-3 my-3 bg-slate-50 border-l-4 border-slate-400 rounded-r-xl text-xs text-slate-700 italic">
                      {children}
                    </blockquote>
                  ),
                  hr: () => <hr className="my-4 border-slate-200" />,
                  a: ({ href, children }) => {
                    const isSafe =
                      href &&
                      (href.startsWith("http://") ||
                        href.startsWith("https://") ||
                        href.startsWith("#") ||
                        href.startsWith("mailto:"));
                    if (!isSafe) {
                      return <span className="text-slate-500 underline">{children}</span>;
                    }
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 underline font-medium inline-flex items-center gap-0.5"
                      >
                        <span>{children}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                      </a>
                    );
                  },
                  code: ({ className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || "");
                    const isInline = !match && !String(children).includes("\n");
                    if (isInline) {
                      return (
                        <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-800 border border-slate-200 font-medium">
                          {children}
                        </code>
                      );
                    }
                    return (
                      <pre className="p-3.5 my-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
                        <code {...props} className={className}>
                          {children}
                        </code>
                      </pre>
                    );
                  },
                }}
              >
                {markdownText}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 px-4 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex items-center gap-3 text-slate-500 text-[11px]">
            <span className="font-semibold text-slate-700">
              {formatBytes(resource.file_size_bytes)}
            </span>
            {resource.created_at && (
              <>
                <span>•</span>
                <span>Diunggah: {formatDate(resource.created_at)}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDownload(resource)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              <span>Unduh Berkas</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
