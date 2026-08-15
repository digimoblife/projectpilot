"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  FileCheck2,
  FileText,
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

interface PortfolioReportItem {
  id: string;
  project_id: string;
  project_name: string;
  project_code: string;
  report_key: string;
  report_type: "WEEKLY_INTERNAL" | "WEEKLY_CLIENT" | "MONTHLY_INTERNAL" | "MONTHLY_CLIENT";
  reporting_period_start: string;
  reporting_period_end: string;
  status: "DRAFT" | "UNDER_REVIEW" | "FINAL" | "SUPERSEDED";
  version: number;
  title: string;
  summary: string | null;
  created_at: string;
  finalized_at: string | null;
}

const reportTypeConfigs = {
  WEEKLY_INTERNAL: { label: "Mingguan Internal", color: "bg-blue-50 text-blue-700 border-blue-200" },
  WEEKLY_CLIENT: { label: "Mingguan Klien", color: "bg-purple-50 text-purple-700 border-purple-200" },
  MONTHLY_INTERNAL: { label: "Bulanan Internal", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  MONTHLY_CLIENT: { label: "Bulanan Klien", color: "bg-teal-50 text-teal-700 border-teal-200" },
};

const reportStatusConfigs = {
  DRAFT: { label: "Draft", color: "bg-amber-50 text-amber-700 border-amber-200" },
  UNDER_REVIEW: { label: "Under Review", color: "bg-blue-50 text-blue-700 border-blue-200" },
  FINAL: { label: "Final (Resmi)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  SUPERSEDED: { label: "Superseded", color: "bg-slate-100 text-slate-500 border-slate-200" },
};

export default function ReportsPage() {
  const { token } = useAuth();
  const [reports, setReports] = useState<PortfolioReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  useEffect(() => {
    fetchPortfolioReports();
  }, [token]);

  async function fetchPortfolioReports() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<PortfolioReportItem[]>("/reports", { headers });
      if (res.data) {
        setReports(res.data);
      }
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  }

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.report_key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "ALL" || r.report_type === selectedType;
    const matchesStatus = selectedStatus === "ALL" || r.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Repositori Laporan Portfolio</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Audit & Governance
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Arsip terpusat seluruh laporan mingguan dan bulanan internal & klien berbasis bukti pengiriman faktual.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchPortfolioReports}
          disabled={isLoading}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 w-fit"
          title="Muat ulang"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2 w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul laporan, proyek, atau kode REP..."
            className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
          >
            <option value="ALL">Semua Jenis Laporan</option>
            {Object.keys(reportTypeConfigs).map((k) => (
              <option key={k} value={k}>
                {reportTypeConfigs[k as keyof typeof reportTypeConfigs].label}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
          >
            <option value="ALL">Semua Status</option>
            {Object.keys(reportStatusConfigs).map((k) => (
              <option key={k} value={k}>
                {reportStatusConfigs[k as keyof typeof reportStatusConfigs].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports Table / Card Grid */}
      {isLoading ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
          Memuat seluruh arsip laporan...
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-2">
          <FileText className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">Belum Ada Laporan</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Laporan mingguan atau bulanan yang digenerate di workspace masing-masing proyek akan terarsip otomatis di sini.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Laporan & Kode</th>
                  <th className="px-4 py-3">Proyek</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">Periode</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredReports.map((r) => {
                  const typeCfg = reportTypeConfigs[r.report_type] || reportTypeConfigs.WEEKLY_INTERNAL;
                  const statusCfg = reportStatusConfigs[r.status] || reportStatusConfigs.DRAFT;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {r.report_key} v{r.version}
                          </span>
                          <span className="line-clamp-1">{r.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="font-mono text-[10px] font-bold text-slate-400 mr-1">{r.project_code}</span>
                        <span>{r.project_name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${typeCfg.color}`}>
                          {typeCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-500">
                        {new Date(r.reporting_period_start).toLocaleDateString("id-ID")} - {new Date(r.reporting_period_end).toLocaleDateString("id-ID")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/projects/${r.project_id}/reports`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
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
