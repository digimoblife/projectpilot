"use client";

import React, { useState } from "react";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileText,
  Info,
  PackageCheck,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface ResourcesDeliverablesViewProps {
  projectId: string;
}

export function ResourcesDeliverablesView({ projectId }: ResourcesDeliverablesViewProps) {
  const [showBoundaryModal, setShowBoundaryModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Domain Boundary Notice Banner */}
      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg shrink-0 mt-0.5 sm:mt-0">
            <PackageCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-indigo-950 block sm:inline">
              Arsip Deliverable Resmi (Formal Deliverables Archive)
            </span>
            <span className="text-indigo-800 sm:ml-1">
              — Ruang khusus untuk artefak rilis akhir yang diekspor secara eksplisit oleh tim proyek.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowBoundaryModal(true)}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-900 bg-white border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-xl shadow-2xs transition-all shrink-0 cursor-pointer"
        >
          <Info className="w-3.5 h-3.5 text-indigo-600" />
          <span>Lihat Batasan Arsitektur</span>
        </button>
      </div>

      {/* Empty State Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-xs text-center">
        <div className="max-w-xl mx-auto space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 shadow-xs">
            <Archive className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-900">
              Belum Ada Artefak Deliverable yang Diarsipkan
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Arsip deliverable resmi memuat berkas atau paket rilis yang telah diekspor secara eksplisit (seperti <span className="font-mono font-medium text-slate-700">PRD_Final.pdf</span>, <span className="font-mono font-medium text-slate-700">Handover_Package.zip</span>, atau dokumen persetujuan formal).
            </p>
          </div>

          {/* Explicit Export Lifecycle Blueprint */}
          <div className="pt-2 text-left bg-slate-50 border border-slate-200/70 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-900">
                Alur Ekspor Opsional: Dokumen Asli vs Artefak Arsip
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px]">
                  <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>GeneratedDocument</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Dokumen terstruktur (PRD, FSD, SOP) tetap hidup dan berstatus resmi di workspace asalnya dengan audit trail lengkap.
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px]">
                  <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Aksi Ekspor Eksplisit</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Pengguna menginisiasi ekspor atau arsip secara sengaja. Dokumen <span className="font-semibold text-slate-700">TIDAK</span> otomatis disalin ke arsip.
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px]">
                  <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">3</span>
                  <span>ProjectResource Salinan</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Salinan artefak statis (PDF/ZIP) tercatat di sini sebagai catatan historis tanpa menggantikan dokumen aslinya.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Architecture & Boundary Details Modal */}
      {showBoundaryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-800" />
                <h4 className="text-sm font-bold text-slate-900">
                  Prinsip Batasan Domain Deliverable
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowBoundaryModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  GeneratedDocument ≠ ProjectResource
                </span>
                <p className="text-[11px] text-slate-500">
                  GeneratedDocument (PRD, Dokumen FSD, Laporan) memiliki lifecycle, riwayat revisi, sitasi bukti (evidence), dan kemampuan AI. Dokumen ini tidak boleh digantikan oleh entitas Resource.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Tidak Ada Otomatisasi Tersembunyi
                </span>
                <p className="text-[11px] text-slate-500">
                  Perubahan status dokumen menjadi FINAL di PRD tidak akan otomatis menambahkan berkas ke dalam Arsip Deliverable. Semua arsip dihasilkan melalui aksi eksplisit pengguna.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Pemisahan dengan Domain Delivery & Handover
                </span>
                <p className="text-[11px] text-slate-500">
                  Arsip Deliverable menyimpan artefak statis, sedangkan pilar Delivery bertanggung jawab atas Handover Checklist dan Completion Gate penutupan proyek.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowBoundaryModal(false)}
              className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-black cursor-pointer"
            >
              Saya Memahami Batasan Ini
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
