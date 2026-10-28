"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api/server";

export async function logout() {
  await apiFetch("/api/auth/logout", { method: "POST" });
  redirect("/login");
}
