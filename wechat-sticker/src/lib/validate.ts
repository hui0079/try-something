export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/bmp",
]);

export const MIN_IMAGE_BYTES = 5 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PROMPT_LENGTH = 200;
export const MAX_CAPTION_LENGTH = 8;
export const MAX_PACK_SIZE = 8;
export const STICKER_SIZE = 240;

export type ImageValidation =
  | { ok: true }
  | { ok: false; message: string };

export function validateImageFile(file: {
  type: string;
  size: number;
}): ImageValidation {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { ok: false, message: "仅支持 JPG / PNG / WEBP / BMP" };
  }
  if (file.size < MIN_IMAGE_BYTES) {
    return { ok: false, message: "图片太小，请换一张更清晰的图" };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: "图片不能超过 5MB" };
  }
  return { ok: true };
}

export function validatePrompt(prompt: string): ImageValidation {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return { ok: false, message: "请填写角色描述" };
  }
  if (trimmed.length > MAX_PROMPT_LENGTH) {
    return {
      ok: false,
      message: `角色描述不能超过 ${MAX_PROMPT_LENGTH} 字`,
    };
  }
  return { ok: true };
}

export function sanitizeCaptions(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  if (raw.length === 0 || raw.length > MAX_PACK_SIZE) {
    return null;
  }
  const captions: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") {
      return null;
    }
    const text = item.trim();
    if (!text || text.length > MAX_CAPTION_LENGTH) {
      return null;
    }
    captions.push(text);
  }
  return captions;
}
