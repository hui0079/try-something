import JSZip from "jszip";

export async function buildStickerZip(
  files: { filename: string; buffer: Buffer }[],
): Promise<Buffer> {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.filename, file.buffer);
  }
  const content = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return Buffer.from(content);
}
