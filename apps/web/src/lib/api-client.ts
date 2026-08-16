export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

interface FastApiErrorPayload {
  detail?: unknown;
  message?: unknown;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || "/api/v1";

const TOKEN_STORAGE_KEY = "projecthub_access_token";

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // Avoid double-prefixing callers that already pass /api/v1.
  if (
    normalizedPath === API_BASE_URL ||
    normalizedPath.startsWith(`${API_BASE_URL}/`)
  ) {
    return normalizedPath;
  }

  return `${API_BASE_URL}${normalizedPath}`;
}

function extractErrorMessage(
  payload: FastApiErrorPayload | null,
  fallback: string,
): string {
  if (!payload) {
    return fallback;
  }

  if (typeof payload.detail === "string") {
    return payload.detail;
  }

  if (Array.isArray(payload.detail)) {
    const messages = payload.detail
      .map((item) => {
        if (
          item &&
          typeof item === "object" &&
          "msg" in item &&
          typeof (item as { msg?: unknown }).msg === "string"
        ) {
          return (item as { msg: string }).msg;
        }

        return null;
      })
      .filter((value): value is string => Boolean(value));

    if (messages.length > 0) {
      return messages.join(", ");
    }
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  return fallback;
}

export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");

  // Authentication is centralized here so every browser-side API call
  // consistently carries the current production session.
  //
  // Explicit Authorization headers still take precedence. This keeps
  // callers such as auth session restoration fully compatible.
  if (
    !headers.has("Authorization") &&
    typeof window !== "undefined"
  ) {
    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);

    if (storedToken) {
      headers.set("Authorization", `Bearer ${storedToken}`);
    }
  }

  if (
    options.body != null &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(buildUrl(path), {
      ...options,
      headers,
    });

    if (response.status === 204) {
      if (response.ok) {
        return {
          data: null,
          error: null,
          status: response.status,
        };
      }

      return {
        data: null,
        error: `Request gagal dengan status ${response.status}.`,
        status: response.status,
      };
    }

    const contentType = response.headers.get("content-type") || "";

    let payload: unknown = null;

    if (contentType.includes("application/json")) {
      payload = await response.json();
    } else {
      const text = await response.text();
      payload = text || null;
    }

    if (!response.ok) {
      /*
       * If an authenticated browser session is rejected, invalidate the
       * local session immediately. AuthProvider listens for this event
       * and the AppShell will return the user to /login.
       *
       * Do not do this for the login endpoint itself: an incorrect
       * password is not an expired application session.
       */
      if (
        response.status === 401 &&
        typeof window !== "undefined" &&
        !buildUrl(path).endsWith("/auth/login")
      ) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.dispatchEvent(new Event("projecthub:unauthorized"));
      }

      const errorPayload =
        payload && typeof payload === "object"
          ? (payload as FastApiErrorPayload)
          : null;

      const fallback =
        typeof payload === "string" && payload.trim()
          ? payload
          : `Request gagal dengan status ${response.status}.`;

      return {
        data: null,
        error: extractErrorMessage(errorPayload, fallback),
        status: response.status,
      };
    }

    return {
      data: payload as T,
      error: null,
      status: response.status,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Tidak dapat terhubung ke server.";

    return {
      data: null,
      error: message,
      status: 0,
    };
  }
}
