import { NextResponse } from "next/server";

import { deskView } from "@/lib/desk/runtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const book = new URL(request.url).searchParams.get("book");
  const parsed = book ? Number(book) : undefined;
  try {
    const view = await deskView(Number.isInteger(parsed) ? parsed : undefined);
    return NextResponse.json(view, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取失败";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
