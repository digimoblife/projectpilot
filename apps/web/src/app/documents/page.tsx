"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  FileCode,
  FileSpreadsheet,
  FileText,
  Files,
  Filter,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { SkeletonTable } from "@/components/ui/skeleton-loader";
import { EmptyState } from "@/components/ui/empty-state";

interface PortfolioDocumentItem {
  id: string;
  project_id: string;
  project_name: string;
  project_code: string;
  document_key: string;
  document_type: "FSD" | "USER_GUIDE" | "ADMIN_GUIDE" | "TECHNICAL_DOCUMENTATION" | "USER_DOCUMENTATION" | "DESIGN_DOCUMENTATION";
  title: string;
  status: "DRAFT" | "UNDER_REVIEW" | "FINAL" | "SUPERSEDED";
  version: number;
  summary: string | null;
  created_at: string;
  finalized_at: string | null;
}

const docTypeConfigs = {
  FSD: { label: "FSD (Functional Spec)", color: "bg-slate-900 text-white border-slate-900 font-medium" },
  USER_GUIDE: { label: "User Manual", color: "bg-slate-100 text-slate-800 border-slate-300 font-medium" },
  ADMIN_GUIDE: { label: "Admin & Ops Guide", color: "bg-slate-100 text-slate-800 border-slate-300 font-medium" },
  TECHNICAL_DOCUMENTATION: { label: "Technical Runbook", color: "bg-slate-900 text-white border-slate-900 font-medium" },
  USER_DOCUMENTATION: { label: "User Docs", color: "bg-slate-100 text-slate-800 border-slate-300 font-medium" },
  DESIGN_DOCUMENTATION: { label: "Design Docs", color: "bg-slate-100 text-slate-800 border-slate-300 font-medium" },
};

const docStatusConfigs = {
  DRAFT: { label: "Draft", color: "bg-amber-50 text-amber-800 border-amber-200 font-medium" },
  UNDER_REVIEW: { label: "Under Review", color: "bg-slate-100 text-slate-800 border-slate-300 font-medium" },
  FINAL: { label: "Final (Resmi)", color: "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold" },
  SUPERSEDED: { label: "Superseded", color: "bg-slate-100 text-slate-500 border-slate-200 font-normal" },
};

export default function DocumentsPage() {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<PortfolioDocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  useEffect(() => {
    fetchPortfolioDocuments();
  }, [token]);

  async function fetchPortfolioDocuments() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<PortfolioDocumentItem[]>("/documents", { headers });
      if (res.data) {
        setDocuments(res.data);
      }
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  }

  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.document_key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "ALL" || d.document_type === selectedType;
    const matchesStatus = selectedStatus === "ALL" || d.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Repositori Dokumentasi Proyek</h1>
          <p className="text-xs text-slate-500 mt-1">
            Arsip dokumen FSD, User Guide, Admin Guide, dan Technical Architecture Runbook dari seluruh proyek.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchPortfolioDocuments}
          disabled={isLoading}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 w-fit active:scale-[0.98]"
          title="Muat ulang"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul dokumen, proyek, atau kode DOC..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
          >
            <option value="ALL">Semua Jenis Dokumen</option>
            {Object.keys(docTypeConfigs).map((k) => (
              <option key={k} value={k}>
                {docTypeConfigs[k as keyof typeof docTypeConfigs].label}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
          >
            <option value="ALL">Semua Status</option>
            {Object.keys(docStatusConfigs).map((k) => (
              <option key={k} value={k}>
                {docStatusConfigs[k as keyof typeof docStatusConfigs].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Table */}
      {isLoading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : filteredDocs.length === 0 ? (
        <EmptyState
          icon={Files}
          title="Belum Ada Dokumen Terdaftar"
          description="Dokumen spesifikasi atau manual pengguna yang digenerate di workspace masing-masing proyek akan terarsip otomatis di sini."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[750px]">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Dokumen & Kode</th>
                  <th className="px-4 py-3">Proyek</th>
                  <th className="px-4 py-3">Jenis Dokumen</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tanggal Dibuat</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredDocs.map((d) => {
                  const typeCfg = docTypeConfigs[d.document_type] || docTypeConfigs.FSD;
                  const statusCfg = docStatusConfigs[d.status] || docStatusConfigs.DRAFT;

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                            {d.document_key} v{d.version}
                          </span>
                          <span className="line-clamp-1">{d.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="font-mono text-[10px] font-bold text-slate-500 mr-1">{d.project_code}</span>
                        <span className="font-medium text-slate-800">{d.project_name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${typeCfg.color}`}>
                          {typeCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-500 font-medium">
                        {new Date(d.created_at).toLocaleDateString("id-ID")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/projects/${d.project_id}/documents`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 hover:text-black bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 active:scale-[0.98] transition-all"
                        >
                          <span>Buka</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
