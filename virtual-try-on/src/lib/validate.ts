export type GarmentType = "top" | "bottom" | "dress";

export type ImageValidation =
  | { ok: true }
  | { ok: false; error: string };

const MIN_BYTES = 5 * 1024;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/bmp",
  "image/heic",
]);

export function validateImageFile(file: { type: string; size: number }): ImageValidation {
  if (!ALLOWED_TYPES.has(file.type.toLowerCase())) {
    return { ok: false, error: "仅支持 JPG、PNG、WEBP、BMP 图片" };
  }
  if (file.size < MIN_BYTES || file.size > MAX_BYTES) {
    return { ok: false, error: "图片需介于 5KB 和 5MB 之间" };
  }
  return { ok: true };
}

export function parseGarmentType(value: string): GarmentType | null {
  if (value === "top" || value === "bottom" || value === "dress") {
    return value;
  }
  return null;
}
