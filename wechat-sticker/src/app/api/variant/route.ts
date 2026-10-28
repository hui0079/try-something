import { VariantError, runExpressionVariant } from "@/lib/variant";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      characterBase64?: string;
      caption?: string;
      index?: number;
    };

    const result = await runExpressionVariant({
      apiKey: process.env.DASHSCOPE_API_KEY ?? "",
      characterBase64: body.characterBase64 ?? "",
      caption: body.caption ?? "",
      index: typeof body.index === "number" ? body.index : 0,
      i2vModel: process.env.IMAGE_I2V_MODEL,
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof VariantError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json(
      { error: "表情动图生成失败，请稍后重试" },
      { status: 500 },
    );
  }
}
