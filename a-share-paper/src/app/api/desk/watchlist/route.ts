import { NextResponse } from "next/server";

import { deskView, replaceWatchlist } from "@/lib/desk/runtime";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { codes?: string };
  const result = replaceWatchlist((body.codes ?? "").split(/[\s,，]+/));
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(await deskView(), { headers: { "Cache-Control": "no-store" } });
}
