import { ProjectResource } from "./types";

export type PreviewFormat = "image" | "pdf" | "markdown" | null;

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];
const IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

const PDF_EXTENSIONS = [".pdf"];
const PDF_MIMES = ["application/pdf"];

const MARKDOWN_EXTENSIONS = [".md", ".markdown"];
const MARKDOWN_MIMES = ["text/markdown", "text/x-markdown"];

export function isImagePreview(fileName?: string | null, mimeType?: string | null): boolean {
  const fn = (fileName || "").toLowerCase();
  const m = (mimeType || "").toLowerCase();

  if (IMAGE_EXTENSIONS.some((ext) => fn.endsWith(ext))) return true;
  if (IMAGE_MIMES.some((mime) => m.includes(mime))) return true;
  return false;
}

export function isPdfPreview(fileName?: string | null, mimeType?: string | null): boolean {
  const fn = (fileName || "").toLowerCase();
  const m = (mimeType || "").toLowerCase();

  if (PDF_EXTENSIONS.some((ext) => fn.endsWith(ext))) return true;
  if (PDF_MIMES.some((mime) => m.includes(mime))) return true;
  return false;
}

export function isMarkdownPreview(fileName?: string | null, mimeType?: string | null): boolean {
  const fn = (fileName || "").toLowerCase();
  const m = (mimeType || "").toLowerCase();

  if (MARKDOWN_EXTENSIONS.some((ext) => fn.endsWith(ext))) return true;
  if (MARKDOWN_MIMES.some((mime) => m.includes(mime))) return true;
  return false;
}

export function getPreviewFormat(fileName?: string | null, mimeType?: string | null): PreviewFormat {
  if (isImagePreview(fileName, mimeType)) return "image";
  if (isPdfPreview(fileName, mimeType)) return "pdf";
  if (isMarkdownPreview(fileName, mimeType)) return "markdown";
  return null;
}

export function isPreviewable(fileName?: string | null, mimeType?: string | null): boolean {
  return getPreviewFormat(fileName, mimeType) !== null;
}

export function isResourcePreviewable(resource: ProjectResource): boolean {
  return isPreviewable(resource.file_name, resource.mime_type);
}

export async function fetchAuthenticatedBlob(
  projectId: string,
  resourceId: string
): Promise<{ blob: Blob | null; error: string | null }> {
  try {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("projecthub_access_token")
        : null;

    const apiBase =
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || "/api/v1";
    const downloadUrl = `${apiBase}/projects/${projectId}/resources/${resourceId}/download`.replace(
      "/api/v1/api/v1",
      "/api/v1"
    );

    const response = await fetch(downloadUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      let errMsg = `Gagal memuat preview berkas (status ${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson.detail) {
          errMsg =
            typeof errJson.detail === "string"
              ? errJson.detail
              : JSON.stringify(errJson.detail);
        }
      } catch {
        // fallback
      }
      return { blob: null, error: errMsg };
    }

    const blob = await response.blob();
    return { blob, error: null };
  } catch (err) {
    return {
      blob: null,
      error: err instanceof Error ? err.message : "Gagal memuat berkas.",
    };
  }
}

export async function fetchAuthenticatedText(
  projectId: string,
  resourceId: string
): Promise<{ text: string | null; error: string | null }> {
  try {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("projecthub_access_token")
        : null;

    const apiBase =
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || "/api/v1";
    const downloadUrl = `${apiBase}/projects/${projectId}/resources/${resourceId}/download`.replace(
      "/api/v1/api/v1",
      "/api/v1"
    );

    const response = await fetch(downloadUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      let errMsg = `Gagal memuat preview berkas (status ${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson.detail) {
          errMsg =
            typeof errJson.detail === "string"
              ? errJson.detail
              : JSON.stringify(errJson.detail);
        }
      } catch {
        // fallback
      }
      return { text: null, error: errMsg };
    }

    const text = await response.text();
    return { text, error: null };
  } catch (err) {
    return {
      text: null,
      error: err instanceof Error ? err.message : "Gagal memuat berkas.",
    };
  }
}
