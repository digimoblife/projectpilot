import { SavedMarkdownDoc } from "./types";

const STORAGE_KEY = "projectpilot_markdown_docs";
const ACTIVE_DOC_ID_KEY = "projectpilot_active_markdown_doc_id";

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

export function getAllDocuments(): SavedMarkdownDoc[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed default document if empty
      const initialDoc: SavedMarkdownDoc = {
        id: "doc-welcome-01",
        title: "Dokumen Spesifikasi Proyek",
        content: SAMPLE_MARKDOWN,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        wordCount: countWords(SAMPLE_MARKDOWN),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify([initialDoc]));
      localStorage.setItem(ACTIVE_DOC_ID_KEY, initialDoc.id);
      return [initialDoc];
    }
    const parsed: SavedMarkdownDoc[] = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      : [];
  } catch {
    return [];
  }
}

export function getDocumentById(id: string): SavedMarkdownDoc | null {
  const docs = getAllDocuments();
  return docs.find((d) => d.id === id) || null;
}

export function saveDocument(data: { id?: string; title: string; content: string }): SavedMarkdownDoc {
  if (typeof window === "undefined") {
    return {
      id: data.id || `doc-${Date.now()}`,
      title: data.title || "Dokumen Tanpa Judul",
      content: data.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      wordCount: countWords(data.content),
    };
  }

  const docs = getAllDocuments();
  const now = new Date().toISOString();
  const wordCount = countWords(data.content);
  const title = data.title.trim() || "Dokumen Tanpa Judul";

  if (data.id) {
    const index = docs.findIndex((d) => d.id === data.id);
    if (index !== -1) {
      const updated: SavedMarkdownDoc = {
        ...docs[index],
        title,
        content: data.content,
        updatedAt: now,
        wordCount,
      };
      docs[index] = updated;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
      localStorage.setItem(ACTIVE_DOC_ID_KEY, updated.id);
      return updated;
    }
  }

  // Create new document
  const newDoc: SavedMarkdownDoc = {
    id: data.id || `doc-${Date.now()}`,
    title,
    content: data.content,
    createdAt: now,
    updatedAt: now,
    wordCount,
  };

  const newDocs = [newDoc, ...docs.filter((d) => d.id !== newDoc.id)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newDocs));
  localStorage.setItem(ACTIVE_DOC_ID_KEY, newDoc.id);
  return newDoc;
}

export function deleteDocument(id: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const docs = getAllDocuments();
    const filtered = docs.filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    const activeId = localStorage.getItem(ACTIVE_DOC_ID_KEY);
    if (activeId === id) {
      if (filtered.length > 0) {
        localStorage.setItem(ACTIVE_DOC_ID_KEY, filtered[0].id);
      } else {
        localStorage.removeItem(ACTIVE_DOC_ID_KEY);
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function getActiveDocumentId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_DOC_ID_KEY);
}

export function setActiveDocumentId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_DOC_ID_KEY, id);
}
