import { NextResponse } from "next/server";

import { deskView, resetAccount } from "@/lib/desk/runtime";

export const dynamic = "force-dynamic";

export async function POST() {
  resetAccount();
  return NextResponse.json(await deskView(), { headers: { "Cache-Control": "no-store" } });
}
