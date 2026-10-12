import type { SavedMarkdownDoc } from "./types";

export const STORAGE_KEY = "projectpilot_markdown_docs";
export const ACTIVE_DOC_ID_KEY = "projectpilot_active_markdown_doc_id";
export const CORRUPTED_BACKUP_PREFIX = "projectpilot_markdown_docs_corrupted_";

export type StorageErrorCode =
  | "QUOTA_EXCEEDED"
  | "SECURITY_ERROR"
  | "STORAGE_CORRUPTED"
  | "UNAVAILABLE"
  | "UNKNOWN";

export interface StorageResult<T = SavedMarkdownDoc> {
  success: boolean;
  data?: T;
  error?: StorageErrorCode;
  errorMessage?: string;
}

export const SAMPLE_MARKDOWN = `# Dokumentasi Spesifikasi Proyek

## 1. Ringkasan Eksekutif
Dokumen ini disusun untuk mencatat **arsip kebutuhan fungsional** dan alur teknis proyek. Editor ini mendukung format teks standar *GitHub Flavored Markdown (GFM)*, tabel, blok kode dengan pewarnaan sintaks, serta ekspor langsung ke format dokumen cetak **A4 PDF** resmi.

---

## 2. Cakupan Fitur Utama
Berikut adalah rincian modul yang direncanakan:
- [x] Desain wireframe & arsitektur sistem
- [x] Setup database & migrasi skema
- [ ] Implementasi integrasi payment gateway
- [ ] Pengujian performa & audit keamanan (UAT)

### Target Milestone & Timeline
| No | Modul / Deliverable | Status | PIC | Target Rilis |
|---|---|---|---|---|
| 1 | Inisialisasi Auth & Role | Selesai | Cahyo | 15 Okt 2026 |
| 2 | Dashboard PM Control | Sedang Dikerjakan | Tim Web | 25 Okt 2026 |
| 3 | Integrasi MoM Generator | Selesai | Tim AI | 02 Nov 2026 |

---

## 3. Catatan Teknis & Arsitektur

> **Catatan Penting:**  
> Seluruh dokumen yang ditulis tersimpan secara privat di peramban Anda. Anda dapat mengunduh dokumen kapan saja sebagai file \`.md\` atau mencetaknya ke format \`.pdf\`.

\`\`\`typescript
// Contoh fungsi kalkulasi pembagian tugas
interface TaskAssignment {
  taskId: string;
  assignee: string;
  isOverdue: boolean;
}

function evaluateTask(task: TaskAssignment): string {
  if (task.isOverdue) {
    return \`Tugas \${task.taskId} memerlukan eskalasi segera!\`;
  }
  return \`Tugas \${task.taskId} berjalan sesuai jadwal.\`;
}
\`\`\`

---

## 4. Langkah Selanjutnya
1. Lakukan verifikasi kebutuhan bersama pemangku kepentingan (*stakeholders*).
2. Simpan atau unduh dokumen ini sebagai arsip resmi proyek.
`;

export function countWords(text: string): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function getStorageInstance(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Memeriksa apakah data di storage terkorupsi (bukan JSON valid atau bukan array).
 */
export function checkStorageIntegrity(): { corrupted: boolean; securityError?: boolean; raw?: string } {
  const storage = getStorageInstance();
  if (!storage) return { corrupted: false };

  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch (err: any) {
    if (err?.name === "SecurityError" || err?.code === 18) {
      return { corrupted: false, securityError: true };
    }
    return { corrupted: false };
  }

  if (!raw || raw.trim() === "") return { corrupted: false };

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { corrupted: true, raw };
    return { corrupted: false };
  } catch {
    return { corrupted: true, raw };
  }
}

export function getAllDocuments(): SavedMarkdownDoc[] {
  const storage = getStorageInstance();
  if (!storage) return [];

  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch (err) {
    console.warn("Gagal mengakses localStorage:", err);
    return [];
  }

  // Jika penyimpanan benar-benar kosong, inisialisasi dokumen selamat datang awal
  if (raw === null || raw.trim() === "") {
    const initialDoc: SavedMarkdownDoc = {
      id: "doc-welcome-01",
      title: "Dokumen Spesifikasi Proyek",
      content: SAMPLE_MARKDOWN,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      wordCount: countWords(SAMPLE_MARKDOWN),
    };
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify([initialDoc]));
      storage.setItem(ACTIVE_DOC_ID_KEY, initialDoc.id);
    } catch (err) {
      console.warn("Gagal menyimpan seed dokumen ke localStorage:", err);
    }
    return [initialDoc];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("Data di localStorage bukan berupa array.");
    }
    return parsed.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (err) {
    console.error("Data dokumen localStorage terdeteksi korup:", err);
    // Karantina data korup ke key backup agar konten teks draf pengguna tidak hilang
    try {
      const backupKey = `${CORRUPTED_BACKUP_PREFIX}${Date.now()}`;
      storage.setItem(backupKey, raw);
      console.warn(`Pencadangan data terkorupsi dibuat di: ${backupKey}`);
    } catch {}
    return [];
  }
}

export function getDocumentById(id: string): SavedMarkdownDoc | null {
  const docs = getAllDocuments();
  return docs.find((d) => d.id === id) || null;
}

export function saveDocument(data: {
  id?: string;
  title: string;
  content: string;
}): StorageResult<SavedMarkdownDoc> {
  const storage = getStorageInstance();
  if (!storage) {
    return {
      success: false,
      error: "UNAVAILABLE",
      errorMessage: "Penyimpanan lokal peramban (localStorage) tidak tersedia.",
    };
  }

  // Perlindungan terhadap penimpaan diam-diam jika data sebelumnya terkorupsi atau akses ditolak
  const integrity = checkStorageIntegrity();
  if (integrity.securityError) {
    return {
      success: false,
      error: "SECURITY_ERROR",
      errorMessage: "Akses penyimpanan ditolak oleh kebijakan keamanan atau mode private peramban.",
    };
  }

  if (integrity.corrupted) {
    const backupKey = `${CORRUPTED_BACKUP_PREFIX}${Date.now()}`;
    try {
      if (integrity.raw) storage.setItem(backupKey, integrity.raw);
    } catch {}
    return {
      success: false,
      error: "STORAGE_CORRUPTED",
      errorMessage:
        "Data dokumen di peramban terdeteksi rusak (corrupted JSON). Penimpaan otomatis dicegah untuk melindungi data Anda (backup telah diamankan).",
    };
  }

  const docs = getAllDocuments();
  const now = new Date().toISOString();
  const wordCount = countWords(data.content);
  const title = data.title.trim() || "Dokumen Tanpa Judul";

  let targetDoc: SavedMarkdownDoc;
  let nextDocs: SavedMarkdownDoc[];

  if (data.id) {
    const index = docs.findIndex((d) => d.id === data.id);
    if (index !== -1) {
      targetDoc = {
        ...docs[index],
        title,
        content: data.content,
        updatedAt: now,
        wordCount,
      };
      nextDocs = [...docs];
      nextDocs[index] = targetDoc;
    } else {
      targetDoc = {
        id: data.id,
        title,
        content: data.content,
        createdAt: now,
        updatedAt: now,
        wordCount,
      };
      nextDocs = [targetDoc, ...docs];
    }
  } else {
    targetDoc = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title,
      content: data.content,
      createdAt: now,
      updatedAt: now,
      wordCount,
    };
    nextDocs = [targetDoc, ...docs];
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(nextDocs));
    storage.setItem(ACTIVE_DOC_ID_KEY, targetDoc.id);
    return {
      success: true,
      data: targetDoc,
    };
  } catch (err: any) {
    let errorCode: StorageErrorCode = "UNKNOWN";
    let errorMessage = "Gagal menyimpan dokumen ke penyimpanan browser.";

    const errName = err?.name || "";
    const errCode = err?.code;

    if (
      errName === "QuotaExceededError" ||
      errName === "NS_ERROR_DOM_QUOTA_REACHED" ||
      errCode === 22 ||
      errCode === 1014
    ) {
      errorCode = "QUOTA_EXCEEDED";
      errorMessage =
        "Kapasitas penyimpanan browser (localStorage) penuh. Silakan hapus dokumen yang tidak diperlukan.";
    } else if (errName === "SecurityError" || errCode === 18) {
      errorCode = "SECURITY_ERROR";
      errorMessage =
        "Akses penyimpanan ditolak oleh kebijakan keamanan atau mode private peramban.";
    } else if (err?.message) {
      errorMessage = err.message;
    }

    return {
      success: false,
      error: errorCode,
      errorMessage,
    };
  }
}

export function deleteDocument(id: string): StorageResult<boolean> {
  const storage = getStorageInstance();
  if (!storage) {
    return {
      success: false,
      error: "UNAVAILABLE",
      errorMessage: "Penyimpanan browser tidak tersedia.",
    };
  }

  const integrity = checkStorageIntegrity();
  if (integrity.securityError) {
    return {
      success: false,
      error: "SECURITY_ERROR",
      errorMessage: "Akses penyimpanan ditolak oleh kebijakan keamanan peramban.",
    };
  }

  if (integrity.corrupted) {
    return {
      success: false,
      error: "STORAGE_CORRUPTED",
      errorMessage: "Penyimpanan terdeteksi rusak. Operasi hapus dibatalkan.",
    };
  }

  try {
    const docs = getAllDocuments();
    const filtered = docs.filter((d) => d.id !== id);
    storage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    const activeId = storage.getItem(ACTIVE_DOC_ID_KEY);
    if (activeId === id) {
      if (filtered.length > 0) {
        storage.setItem(ACTIVE_DOC_ID_KEY, filtered[0].id);
      } else {
        storage.removeItem(ACTIVE_DOC_ID_KEY);
      }
    }
    return { success: true, data: true };
  } catch (err: any) {
    return {
      success: false,
      error: "UNKNOWN",
      errorMessage: err?.message || "Gagal menghapus dokumen.",
    };
  }
}

export function getActiveDocumentId(): string | null {
  const storage = getStorageInstance();
  if (!storage) return null;
  try {
    return storage.getItem(ACTIVE_DOC_ID_KEY);
  } catch {
    return null;
  }
}

export function setActiveDocumentId(id: string): boolean {
  const storage = getStorageInstance();
  if (!storage) return false;
  try {
    storage.setItem(ACTIVE_DOC_ID_KEY, id);
    return true;
  } catch {
    return false;
  }
}
