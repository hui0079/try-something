import { PackError, runPackExport } from "@/lib/pack";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      stickers?: unknown;
    };

    const zip = await runPackExport({
      stickers: body.stickers,
    });

    return new Response(new Uint8Array(zip), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="stickers.zip"',
      },
    });
  } catch (error) {
    if (error instanceof PackError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json(
      { error: "打包失败，请稍后重试" },
      { status: 500 },
    );
  }
}
