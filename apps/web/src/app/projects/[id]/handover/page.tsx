import { ShieldCheck } from "lucide-react";

export default function ProjectHandoverTab() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
      <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 mx-auto flex items-center justify-center">
        <ShieldCheck className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">Checklist Serah Terima (Handover & Completion Gate)</h3>
      <p className="text-xs text-slate-500 max-w-md mx-auto">
        Verifikasi deployment produksi, approval UAT klien, dan kelengkapan dokumen sebelum menandai proyek selesai (Phase 14).
      </p>
    </div>
  );
}
