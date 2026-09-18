export type ResourceType = "FILE" | "LINK" | "DELIVERABLE";
export type ResourceStatus = "ACTIVE" | "ARCHIVED";
export type DeliverableStatus = "DRAFT" | "SUBMITTED" | "ACCEPTED" | "REJECTED";
export type LinkCategory =
  | "FIGMA"
  | "GITHUB"
  | "DOCS"
  | "DRIVE"
  | "STAGING"
  | "PRODUCTION"
  | "OTHER";

export interface RelatedResourceBrief {
  id: string;
  resource_type: ResourceType;
  name: string;
  file_name: string | null;
  url: string | null;
  mime_type?: string | null;
  file_size_bytes?: number | null;
}

export interface ProjectResource {
  id: string;
  project_id: string;
  resource_type: ResourceType;
  name: string;
  description: string | null;
  status: ResourceStatus;

  // File fields
  file_name: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  storage_key: string | null;
  checksum_sha256: string | null;

  // Link fields
  url: string | null;
  link_category: string | null;

  // Deliverable fields
  deliverable_version: string | null;
  delivery_date: string | null;
  deliverable_status: DeliverableStatus | null;
  related_resource_id: string | null;
  related_resource?: RelatedResourceBrief | null;

  // Audit
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  archived_by_user_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const DANGEROUS_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".sh", ".bin", ".msi", ".com",
  ".php", ".py", ".js", ".vbs", ".scr", ".jar", ".app", ".dmg", ".apk"
];

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return "-";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export async function downloadResourceFile(
  projectId: string,
  resourceId: string,
  fileName: string
): Promise<{ success: boolean; error?: string }> {
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
      let errMsg = `Gagal mengunduh berkas (status ${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson.detail) {
          errMsg =
            typeof errJson.detail === "string"
              ? errJson.detail
              : JSON.stringify(errJson.detail);
        }
      } catch {
        // use fallback message
      }
      return { success: false, error: errMsg };
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName || "resource-file";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mengunduh berkas.",
    };
  }
}
