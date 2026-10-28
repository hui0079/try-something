import { NextResponse } from "next/server";

import { isVisitorId, presenceStore } from "@/lib/presence/store";
import { isRecord } from "@/lib/trends/format";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    payload = undefined;
  }

  const visitorId = isRecord(payload) ? payload.visitorId : undefined;
  if (!isVisitorId(visitorId)) {
    return NextResponse.json(
      { error: "无效访客" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(presenceStore.touch(visitorId, Date.now()), {
    headers: { "Cache-Control": "no-store" },
  });
}
