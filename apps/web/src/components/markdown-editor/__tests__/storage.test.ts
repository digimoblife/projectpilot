import test from "node:test";
import assert from "node:assert/strict";

// Mock minimal browser globals for testing
class MockLocalStorage implements Storage {
  private store: Map<string, string> = new Map();
  public shouldThrowQuota = false;
  public shouldThrowSecurity = false;

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    if (this.shouldThrowSecurity) {
      const err = new Error("The operation is insecure.");
      err.name = "SecurityError";
      throw err;
    }
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    if (this.shouldThrowSecurity) {
      const err = new Error("The operation is insecure.");
      err.name = "SecurityError";
      throw err;
    }
    if (this.shouldThrowQuota) {
      const err = new Error("Quota exceeded");
      err.name = "QuotaExceededError";
      // @ts-expect-error code for DOMException
      err.code = 22;
      throw err;
    }
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }
}

const mockStorage = new MockLocalStorage();

// Setup global window and localStorage
(global as any).window = {
  localStorage: mockStorage,
};
(global as any).localStorage = mockStorage;

import {
  getAllDocuments,
  saveDocument,
  deleteDocument,
  checkStorageIntegrity,
  STORAGE_KEY,
  CORRUPTED_BACKUP_PREFIX,
  countWords,
} from "../storage.ts";
import { downloadMarkdownFile } from "../export-utils.ts";

test("countWords counts space-separated words accurately", () => {
  assert.equal(countWords(""), 0);
  assert.equal(countWords("   "), 0);
  assert.equal(countWords("Halo dunia"), 2);
  assert.equal(countWords("Satu   dua   tiga\n\nempat"), 4);
});

test("getAllDocuments seeds initial document when storage is empty", () => {
  mockStorage.clear();
  const docs = getAllDocuments();
  assert.equal(docs.length, 1);
  assert.equal(docs[0].id, "doc-welcome-01");
  assert.ok(docs[0].content.includes("Dokumentasi Spesifikasi Proyek"));
});

test("saveDocument creates and updates documents with word counts", () => {
  mockStorage.clear();
  const res = saveDocument({
    title: "Catatan Sprint 1",
    content: "Pembahasan fitur pembayaran QRIS dinamis.",
  });
  assert.equal(res.success, true);
  assert.ok(res.data);
  assert.equal(res.data.title, "Catatan Sprint 1");
  assert.equal(res.data.wordCount, 5);

  // Update same document
  const updateRes = saveDocument({
    id: res.data.id,
    title: "Catatan Sprint 1 - Revisi",
    content: "Pembahasan fitur pembayaran QRIS dinamis dan refund.",
  });
  assert.equal(updateRes.success, true);
  assert.ok(updateRes.data);
  assert.equal(updateRes.data.title, "Catatan Sprint 1 - Revisi");
  assert.equal(updateRes.data.wordCount, 7);
});

test("protects existing documents from silent overwrite when stored JSON is corrupted", () => {
  mockStorage.clear();
  // Simulate corrupted JSON in localStorage
  const corruptedRaw = '{"corrupted": [unclosed json string';
  mockStorage.setItem(STORAGE_KEY, corruptedRaw);

  // Check integrity detector
  const integrity = checkStorageIntegrity();
  assert.equal(integrity.corrupted, true);
  assert.equal(integrity.raw, corruptedRaw);

  // getAllDocuments should quarantine corrupted data and return empty without destroying raw data
  const docs = getAllDocuments();
  assert.equal(docs.length, 0);

  // Check that corrupted backup was created
  let foundBackup = false;
  for (let i = 0; i < mockStorage.length; i++) {
    const key = mockStorage.key(i);
    if (key && key.startsWith(CORRUPTED_BACKUP_PREFIX)) {
      foundBackup = true;
      assert.equal(mockStorage.getItem(key), corruptedRaw);
      break;
    }
  }
  assert.equal(foundBackup, true);

  // saveDocument MUST REFUSE silent overwrite while corrupted
  const saveRes = saveDocument({
    title: "Dokumen Baru Mencoba Menimpa",
    content: "Isi teks baru.",
  });
  assert.equal(saveRes.success, false);
  assert.equal(saveRes.error, "STORAGE_CORRUPTED");
  assert.ok(saveRes.errorMessage?.includes("terdeteksi rusak"));
});

test("handles QuotaExceededError explicitly and returns descriptive error", () => {
  mockStorage.clear();
  mockStorage.shouldThrowQuota = true;

  try {
    const res = saveDocument({
      title: "Dokumen Melebihi Kuota",
      content: "Isi teks besar...",
    });
    assert.equal(res.success, false);
    assert.equal(res.error, "QUOTA_EXCEEDED");
    assert.ok(res.errorMessage?.includes("penyimpanan browser (localStorage) penuh"));
  } finally {
    mockStorage.shouldThrowQuota = false;
  }
});

test("handles SecurityError explicitly and returns descriptive error", () => {
  mockStorage.clear();
  mockStorage.shouldThrowSecurity = true;

  try {
    const res = saveDocument({
      title: "Dokumen Mode Pribadi",
      content: "Isi teks...",
    });
    assert.equal(res.success, false);
    assert.equal(res.error, "SECURITY_ERROR");
    assert.ok(res.errorMessage?.includes("kebijakan keamanan"));
  } finally {
    mockStorage.shouldThrowSecurity = false;
  }
});

test("deleteDocument removes document and updates active document", () => {
  mockStorage.clear();
  const doc1 = saveDocument({ id: "custom-doc-1", title: "Doc 1", content: "Content 1" }).data!;
  const doc2 = saveDocument({ id: "custom-doc-2", title: "Doc 2", content: "Content 2" }).data!;

  const delRes = deleteDocument(doc1.id);
  assert.equal(delRes.success, true);

  const docs = getAllDocuments();
  assert.equal(docs.some((d) => d.id === doc1.id), false);
  assert.equal(docs.some((d) => d.id === doc2.id), true);
});

test("downloadMarkdownFile handles DOM download and cleans up URL safely", () => {
  let createdUrl = "";
  let revokedUrl = "";
  let appendedChild: any = null;
  let clicked = false;
  let removedChild: any = null;

  (global as any).URL = {
    createObjectURL: (blob: any) => {
      createdUrl = "blob://test-url";
      return createdUrl;
    },
    revokeObjectURL: (url: string) => {
      revokedUrl = url;
    },
  };

  (global as any).document = {
    body: {
      appendChild: (el: any) => {
        appendedChild = el;
      },
      removeChild: (el: any) => {
        removedChild = el;
      },
    },
    createElement: (tag: string) => {
      return {
        tag,
        href: "",
        download: "",
        click: () => {
          clicked = true;
        },
      };
    },
  };

  const ok = downloadMarkdownFile("Rencana Proyek 2026", "# Rencana Proyek");
  assert.equal(ok, true);
  assert.equal(clicked, true);
  assert.equal(appendedChild?.download, "Rencana_Proyek_2026.md");
  assert.equal(removedChild, appendedChild);

  // Verify revokeObjectURL after timeout
  setTimeout(() => {
    assert.equal(revokedUrl, createdUrl);
  }, 1100);
});
