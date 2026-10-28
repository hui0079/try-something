import { apiBaseUrl } from "./config";

type ErrorBody = { error?: { message?: string } };

export async function clientJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set("content-type", "application/json");
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ErrorBody | null;
    throw new Error(body?.error?.message ?? "请求失败");
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function clientUpload<T>(path: string, file: File): Promise<T> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    body,
    credentials: "include",
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ErrorBody | null;
    throw new Error(payload?.error?.message ?? "上传失败");
  }
  return (await response.json()) as T;
}
