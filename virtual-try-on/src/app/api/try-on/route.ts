import { NextResponse } from "next/server";

import { asTryOnFile, runTryOn, TryOnError } from "@/lib/tryOn";

export const maxDuration = 180;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const result = await runTryOn({
      apiKey: process.env.DASHSCOPE_API_KEY ?? "",
      person: asTryOnFile(form.get("person"), "人物照"),
      garment: asTryOnFile(form.get("garment"), "衣物照"),
      garmentType: String(form.get("garmentType") ?? ""),
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof TryOnError ? error.status : 502;
    const message =
      error instanceof Error ? error.message : "试衣失败，请稍后重试";
    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
