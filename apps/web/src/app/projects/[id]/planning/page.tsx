"use client";

import React, { useEffect, useState, use } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Edit3,
  FileText,
  FolderTree,
  Layers,
  Plus,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface Requirement {
  id: string;
  key: string;
  title: string;
}

interface Feature {
  id: string;
  key: string;
  title: string;
  description: string | null;
  status: string;
  epic_id: string | null;
  requirement_id: string | null;
}

interface Epic {
  id: string;
  key: string;
  title: string;
  description: string | null;
  status: string;
}

export default function ProjectPlanningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { token } = useAuth();

  const [epics, setEpics] = useState<Epic[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Epic Modal
  const [isCreateEpicOpen, setIsCreateEpicOpen] = useState(false);
  const [epicKey, setEpicKey] = useState("");
  const [epicTitle, setEpicTitle] = useState("");
  const [epicDesc, setEpicDesc] = useState("");
  const [epicError, setEpicError] = useState<string | null>(null);

  // Create Feature Modal
  const [isCreateFeatureOpen, setIsCreateFeatureOpen] = useState(false);
  const [featKey, setFeatKey] = useState("");
  const [featTitle, setFeatTitle] = useState("");
  const [featDesc, setFeatDesc] = useState("");
  const [featEpicId, setFeatEpicId] = useState<string>("");
  const [featReqId, setFeatReqId] = useState<string>("");
  const [featError, setFeatError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPlanningData();
  }, [projectId, token]);

  async function fetchPlanningData() {
    setIsLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [epicsRes, featsRes, reqsRes] = await Promise.all([
        apiClient<Epic[]>(`/projects/${projectId}/epics`, { headers }),
        apiClient<Feature[]>(`/projects/${projectId}/features`, { headers }),
        apiClient<Requirement[]>(`/projects/${projectId}/requirements`, { headers }),
      ]);

      if (epicsRes.data) setEpics(epicsRes.data);
      if (featsRes.data) setFeatures(featsRes.data);
      if (reqsRes.data) setRequirements(reqsRes.data);
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateEpic(e: React.FormEvent) {
    e.preventDefault();
    setEpicError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Epic>(`/projects/${projectId}/epics`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          key: epicKey,
          title: epicTitle,
          description: epicDesc || null,
        }),
      });

      if (res.data) {
        setIsCreateEpicOpen(false);
        resetEpicForm();
        fetchPlanningData();
      } else {
        setEpicError(res.error || "Gagal membuat Epic.");
      }
    } catch {
      setEpicError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateFeature(e: React.FormEvent) {
    e.preventDefault();
    setFeatError(null);
    setIsSubmitting(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await apiClient<Feature>(`/projects/${projectId}/features`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          key: featKey,
          title: featTitle,
          description: featDesc || null,
          epic_id: featEpicId || null,
          requirement_id: featReqId || null,
        }),
      });

      if (res.data) {
        setIsCreateFeatureOpen(false);
        resetFeatForm();
        fetchPlanningData();
      } else {
        setFeatError(res.error || "Gagal membuat Feature.");
      }
    } catch {
      setFeatError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetEpicForm() {
    setEpicKey(`EPC-${epics.length + 1}`.padStart(7, "0"));
    setEpicTitle("");
    setEpicDesc("");
    setEpicError(null);
  }

  function resetFeatForm() {
    setFeatKey(`FEAT-${features.length + 1}`.padStart(8, "0"));
    setFeatTitle("");
    setFeatDesc("");
    setFeatEpicId(epics[0]?.id || "");
    setFeatReqId("");
    setFeatError(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Perencanaan Hirarki (Epic & Feature)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Struktur breakdown deliverable proyek dari inisiatif besar (Epic) hingga kapabilitas teknis (Feature).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              resetEpicForm();
              setIsCreateEpicOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Epic</span>
          </button>
          <button
            type="button"
            onClick={() => {
              resetFeatForm();
              setIsCreateFeatureOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Feature</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Epics</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{epics.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Features</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{features.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Requirements Terhubung</span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {features.filter((f) => f.requirement_id).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Status Perencanaan</span>
          <p className="text-xs font-bold text-emerald-700 mt-2">TERSTRUKTUR</p>
        </div>
      </div>

      {/* Epics & Features Breakdown */}
      {epics.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-900">Belum ada Epic</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Mulai dengan membuat Epic untuk mengelompokkan deliverable utama proyek Anda.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {epics.map((epic) => {
            const epicFeatures = features.filter((f) => f.epic_id === epic.id);

            return (
              <div key={epic.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                      {epic.key}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900">{epic.title}</h3>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {epicFeatures.length} Feature Terhubung
                  </span>
                </div>

                {epic.description && (
                  <div className="px-5 py-2.5 text-xs text-slate-600 bg-white border-b border-slate-100">
                    {epic.description}
                  </div>
                )}

                {/* Features Inside Epic */}
                <div className="p-4 space-y-2.5 bg-white">
                  {epicFeatures.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2 text-center">
                      Belum ada feature di bawah Epic ini. Klik &quot;Tambah Feature&quot; untuk mengaitkannya.
                    </p>
                  ) : (
                    epicFeatures.map((feat) => {
                      const linkedReq = requirements.find((r) => r.id === feat.requirement_id);

                      return (
                        <div
                          key={feat.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-semibold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                {feat.key}
                              </span>
                              <h4 className="text-xs font-semibold text-slate-900">{feat.title}</h4>
                            </div>
                            {feat.description && (
                              <p className="text-xs text-slate-500 line-clamp-1">{feat.description}</p>
                            )}
                          </div>

                          {linkedReq && (
                            <div className="flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shrink-0">
                              <FileText className="w-3 h-3" />
                              <span>Req: {linkedReq.key}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Epic Modal */}
      {isCreateEpicOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Tambah Epic Baru</h3>
              <button
                type="button"
                onClick={() => setIsCreateEpicOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {epicError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{epicError}</span>
              </div>
            )}

            <form onSubmit={handleCreateEpic} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key *</label>
                  <input
                    type="text"
                    required
                    value={epicKey}
                    onChange={(e) => setEpicKey(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Epic *</label>
                  <input
                    type="text"
                    required
                    value={epicTitle}
                    onChange={(e) => setEpicTitle(e.target.value)}
                    placeholder="Contoh: Modul Pembayaran & Integrasi"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Inisiatif</label>
                <textarea
                  rows={3}
                  value={epicDesc}
                  onChange={(e) => setEpicDesc(e.target.value)}
                  placeholder="Ringkasan cakupan kerja modul ini..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateEpicOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Epic"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Feature Modal */}
      {isCreateFeatureOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Tambah Feature Baru</h3>
              <button
                type="button"
                onClick={() => setIsCreateFeatureOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {featError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{featError}</span>
              </div>
            )}

            <form onSubmit={handleCreateFeature} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key *</label>
                  <input
                    type="text"
                    required
                    value={featKey}
                    onChange={(e) => setFeatKey(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Feature *</label>
                  <input
                    type="text"
                    required
                    value={featTitle}
                    onChange={(e) => setFeatTitle(e.target.value)}
                    placeholder="Contoh: QRIS Dynamic Payment Gateway"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Epic Induk</label>
                <select
                  value={featEpicId}
                  onChange={(e) => setFeatEpicId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Tanpa Epic</option>
                  {epics.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.key}: {e.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tautkan ke Requirement</label>
                <select
                  value={featReqId}
                  onChange={(e) => setFeatReqId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Tanpa Kaitan Requirement</option>
                  {requirements.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.key}: {r.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Teknis</label>
                <textarea
                  rows={2}
                  value={featDesc}
                  onChange={(e) => setFeatDesc(e.target.value)}
                  placeholder="Keterangan fungsional kapabilitas feature..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateFeatureOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Feature"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
