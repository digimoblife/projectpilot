"use client";

import React, { useState } from "react";
import {
  ExternalLink,
  GitBranch,
  Globe,
  Info,
  Layers,
  Link2,
  Plus,
  ShieldCheck,
} from "lucide-react";

interface ResourcesLinksViewProps {
  projectId: string;
}

const linkCategories = [
  { id: "all", label: "Semua Tautan (0)" },
  { id: "design", label: "Desain (Figma / Miro)" },
  { id: "repo", label: "Repository (GitHub / GitLab)" },
  { id: "environments", label: "Environment (Staging / Prod)" },
  { id: "docs", label: "Dokumentasi Eksternal" },
];

export function ResourcesLinksView({ projectId }: ResourcesLinksViewProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showInfoModal, setShowInfoModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Category Filter & Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {linkCategories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowInfoModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
            title="Informasi Tautan Referensi"
          >
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>Info Kapabilitas</span>
          </button>

          <button
            type="button"
            onClick={() => setShowInfoModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-black transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-300" />
            <span>Tambah Tautan</span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-md font-mono">
              Segera Hadir
            </span>
          </button>
        </div>
      </div>

      {/* Empty State Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-xs text-center">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 shadow-xs">
            <Link2 className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-900">
              Belum Ada Tautan Referensi
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tautan ke repository kode sumber, papan desain Figma, environment staging/produksi, atau portal dokumentasi eksternal akan tercatat di sini agar seluruh tim dapat mengakses ekosistem proyek secara terpusat.
            </p>
          </div>

          {/* Supported Link Categories Overview */}
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Layers className="w-3.5 h-3.5 text-purple-500" />
                <span>Desain & UI/UX</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Tautan Figma prototype, design system file, board Miro, atau wireframe rujukan.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <GitBranch className="w-3.5 h-3.5 text-blue-500" />
                <span>Development & Code</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Repository GitHub/GitLab, pull request penting, atau tracking CI/CD pipeline.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Globe className="w-3.5 h-3.5 text-emerald-500" />
                <span>Environments</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                URL Staging untuk UAT klien, URL Production untuk rilis langsung, serta dashboard monitoring.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Modal / Architecture Clarification */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-800" />
                <h4 className="text-sm font-bold text-slate-900">
                  Arsitektur Tautan Referensi
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="font-semibold text-slate-800">
                  Tautan Eksternal vs Sumber Dokumen
                </span>
                <p className="text-[11px] text-slate-500">
                  Tautan referensi merupakan pointer ke sistem eksternal (Figma, GitHub, Staging). Tautan ini tidak menghasilkan entitas GeneratedDocument dan murni berfungsi sebagai indeks referensi tim.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="font-semibold text-slate-800">
                  Konsistensi Tanpa Data Palsu
                </span>
                <p className="text-[11px] text-slate-500">
                  Sesuai prinsip arsitektur ProjectHub, daftar tautan tidak disimulasikan dengan URL palsu sebelum API penyimpanan tautan resmi diaktifkan.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInfoModal(false)}
              className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-black cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
