import { CharacterError, runCharacterGeneration } from "@/lib/character";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const prompt = String(form.get("prompt") ?? "");
    const reference = form.get("reference");
    const file =
      reference instanceof File && reference.size > 0 ? reference : null;

    const result = await runCharacterGeneration({
      apiKey: process.env.DASHSCOPE_API_KEY ?? "",
      prompt,
      reference: file,
      t2iModel: process.env.IMAGE_T2I_MODEL,
      refModel: process.env.IMAGE_REF_MODEL,
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof CharacterError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json(
      { error: "出图失败，请稍后重试" },
      { status: 500 },
    );
  }
}
