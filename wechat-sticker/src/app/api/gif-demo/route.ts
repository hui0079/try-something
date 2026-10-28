import { GifDemoError, runGifDemo } from "@/lib/gif-demo";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      characterBase64?: string;
    };

    const result = await runGifDemo({
      apiKey: process.env.DASHSCOPE_API_KEY ?? "",
      characterBase64: body.characterBase64 ?? "",
      i2vModel: process.env.IMAGE_I2V_MODEL,
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof GifDemoError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json(
      { error: "动图生成失败，请稍后重试" },
      { status: 500 },
    );
  }
}
