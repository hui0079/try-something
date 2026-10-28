import { removeNearWhiteBackground } from "./compose-sticker";
import { generateCharacterImage } from "./image-provider";
import { validateImageFile, validatePrompt } from "./validate";

export class CharacterError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CharacterError";
    this.status = status;
  }
}

export async function runCharacterGeneration(input: {
  apiKey: string;
  prompt: string;
  reference?: File | null;
  t2iModel?: string;
  refModel?: string;
}): Promise<{ imageBase64: string; mimeType: string }> {
  const promptCheck = validatePrompt(input.prompt);
  if (!promptCheck.ok) {
    throw new CharacterError(promptCheck.message);
  }

  let reference:
    | { name: string; type: string; bytes: Uint8Array }
    | undefined;

  if (input.reference) {
    const check = validateImageFile(input.reference);
    if (!check.ok) {
      throw new CharacterError(check.message);
    }
    const bytes = new Uint8Array(await input.reference.arrayBuffer());
    reference = {
      name: extensionName(input.reference.name, input.reference.type),
      type: input.reference.type || "image/jpeg",
      bytes,
    };
  }

  try {
    const raw = await generateCharacterImage(
      {
        apiKey: input.apiKey,
        t2iModel: input.t2iModel,
        refModel: input.refModel,
      },
      { prompt: input.prompt, reference },
    );
    const cutout = await removeNearWhiteBackground(raw);
    const imageBase64 = cutout.toString("base64");
    return {
      imageBase64: `data:image/png;base64,${imageBase64}`,
      mimeType: "image/png",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "出图失败，请稍后重试";
    const status = message.includes("未配置") ? 500 : 502;
    throw new CharacterError(message, status);
  }
}

function extensionName(name: string, type: string): string {
  if (name && /\.[a-z0-9]+$/i.test(name)) {
    return name.replace(/[^\w.\-]+/g, "_");
  }
  const map: Record<string, string> = {
    "image/jpeg": "ref.jpg",
    "image/jpg": "ref.jpg",
    "image/png": "ref.png",
    "image/webp": "ref.webp",
    "image/bmp": "ref.bmp",
  };
  return map[type] ?? "ref.jpg";
}
