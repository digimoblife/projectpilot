"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, Printer } from "lucide-react";

interface MarkdownViewerProps {
  content: string;
  className?: string;
  title?: string;
  showPrintButton?: boolean;
  showCopyButton?: boolean;
}

export function MarkdownViewer({
  content,
  className = "",
  title,
  showPrintButton = true,
  showCopyButton = true,
}: MarkdownViewerProps) {
  const [copied, setCopied] = useState(false);
  const printableRef = React.useRef<HTMLDivElement>(null);

  function handleCopy() {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    const originalTitle = document.title;
    if (title) {
      document.title = title;
    }

    const docEl = printableRef.current;
    if (docEl) {
      docEl.classList.add("print-target-active");
    }
    document.body.classList.add("printing-markdown-doc");

    const cleanup = () => {
      document.body.classList.remove("printing-markdown-doc");
      if (docEl) {
        docEl.classList.remove("print-target-active");
      }
      if (title) {
        document.title = originalTitle;
      }
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);
    window.print();
    setTimeout(cleanup, 2000);
  }

  return (
    <div className={`relative flex flex-col bg-white rounded-xl ${className}`}>
      {/* Top action toolbar (hidden on print) */}
      {(showPrintButton || showCopyButton) && (
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 print:hidden">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {title ? title : "Format Dokumen Resmi"}
          </span>

          <div className="flex items-center gap-1.5">
            {showCopyButton && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                title="Salin isi dokumen teks"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            )}

            {showPrintButton && (
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg shadow-2xs transition-colors"
                title="Cetak atau simpan sebagai PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak / PDF</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Rendered Markdown Document Container */}
      <div ref={printableRef} id="printable-markdown-document" className="markdown-document text-slate-800">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-4 mb-3 pb-2 border-b border-slate-200 tracking-tight">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-5 mb-2.5 pb-1 border-b border-slate-100 flex items-center gap-2">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-sm sm:text-base font-bold text-slate-800 mt-4 mb-2">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-xs sm:text-sm font-bold text-slate-800 mt-3 mb-1.5">
                {children}
              </h4>
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
              <li className="leading-relaxed pl-0.5">
                {children}
              </li>
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
              <blockquote className="p-3 my-3 bg-purple-50/50 border-l-4 border-purple-500 rounded-r-xl text-xs sm:text-sm text-slate-700 italic">
                {children}
              </blockquote>
            ),
            hr: () => (
              <hr className="my-4 border-slate-200" />
            ),
            strong: ({ children }) => (
              <strong className="font-bold text-slate-900">{children}</strong>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-800 underline font-medium"
              >
                {children}
              </a>
            ),
            code: ({ className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || "");
              const isInline = !match && !String(children).includes("\n");
              if (isInline) {
                return (
                  <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-purple-700 border border-slate-200 font-medium">
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
            input: ({ checked, ...props }) => {
              if (props.type === "checkbox") {
                return (
                  <input
                    type="checkbox"
                    readOnly
                    checked={checked}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 mr-2 h-3.5 w-3.5 inline align-middle cursor-default pointer-events-none"
                  />
                );
              }
              return <input {...props} />;
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
