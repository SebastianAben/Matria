import type { ApiResponse } from "@matria/shared";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: isFormData
      ? { ...(init.headers ?? {}) }
      : {
          "content-type": "application/json",
          ...(init.headers ?? {})
        }
  });
  return (await response.json()) as ApiResponse<T>;
}
