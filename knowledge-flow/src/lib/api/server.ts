import "server-only";

import { cookies } from "next/headers";
import { apiBaseUrl } from "./config";

export async function apiFetch(path: string, init?: RequestInit) {
  const cookieHeader = (await cookies()).toString();
  const headers = new Headers(init?.headers);
  if (cookieHeader) headers.set("cookie", cookieHeader);
  headers.set("accept", "application/json");

  return fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}
