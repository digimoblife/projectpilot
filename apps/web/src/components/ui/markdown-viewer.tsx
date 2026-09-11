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
    const docEl = printableRef.current;
    if (!docEl) return;

    // Create a hidden, isolated iframe to print strictly the formatted document content
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const contentHtml = docEl.innerHTML;
    const docTitle = title || "Dokumen Resmi ProjectPilot";

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${docTitle}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 20mm 15mm 20mm 15mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.6;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h1 {
      font-size: 18pt;
      font-weight: 800;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 12pt;
      padding-bottom: 6pt;
      border-bottom: 2px solid #e2e8f0;
      line-height: 1.25;
    }
    h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #0f172a;
      margin-top: 14pt;
      margin-bottom: 6pt;
      padding-bottom: 3pt;
      border-bottom: 1px solid #f1f5f9;
      page-break-after: avoid;
      break-after: avoid;
    }
    h3 {
      font-size: 11.5pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 10pt;
      margin-bottom: 4pt;
      page-break-after: avoid;
      break-after: avoid;
    }
    h4 {
      font-size: 10.5pt;
      font-weight: 700;
      color: #334155;
      margin-top: 8pt;
      margin-bottom: 3pt;
    }
    p {
      margin-top: 0;
      margin-bottom: 8pt;
      color: #334155;
    }
    ul, ol {
      margin-top: 0;
      margin-bottom: 8pt;
      padding-left: 20px;
    }
    li {
      margin-bottom: 3pt;
      color: #334155;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8pt;
      margin-bottom: 12pt;
      font-size: 9.5pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    th {
      background-color: #f1f5f9 !important;
      color: #0f172a;
      font-weight: 700;
      text-align: left;
      padding: 6pt 8pt;
      border: 1px solid #cbd5e1;
    }
    td {
      padding: 5pt 8pt;
      border: 1px solid #cbd5e1;
      color: #334155;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    blockquote {
      margin: 8pt 0;
      padding: 6pt 12pt;
      background-color: #f8fafc;
      border-left: 4px solid #0f172a;
      color: #475569;
      font-style: italic;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 9pt;
      background-color: #f1f5f9;
      padding: 1pt 3pt;
      border-radius: 3px;
      border: 1px solid #e2e8f0;
    }
    pre {
      background-color: #0f172a !important;
      color: #f8fafc !important;
      padding: 10pt;
      border-radius: 6px;
      font-size: 8.5pt;
      overflow: hidden;
      white-space: pre-wrap;
      word-break: break-all;
      page-break-inside: avoid;
      break-inside: avoid;
      margin: 8pt 0;
    }
    pre code {
      background: transparent !important;
      border: none !important;
      color: inherit !important;
      padding: 0;
    }
    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 12pt 0;
    }
    strong {
      color: #0f172a;
      font-weight: 700;
    }
    input[type="checkbox"] {
      margin-right: 4pt;
    }
  </style>
</head>
<body>
  ${contentHtml}
</body>
</html>`);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 250);
  }

  return (
    <div className={`relative flex flex-col bg-white rounded-2xl ${className}`}>
      {/* Top action toolbar (hidden on print) */}
      {(showPrintButton || showCopyButton) && (
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 print:hidden">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {title ? title : "Format Dokumen Resmi"}
          </span>

          <div className="flex items-center gap-1.5">
            {showCopyButton && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
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
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded-xl shadow-xs active:scale-[0.98] transition-all cursor-pointer"
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
