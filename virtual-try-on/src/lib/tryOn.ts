import {
  createTryOnTask,
  pollTryOnTask,
  uploadTempFile,
} from "./dashscope";
import { parseGarmentType, validateImageFile } from "./validate";

export class TryOnError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TryOnError";
    this.status = status;
  }
}

type UploadFn = typeof uploadTempFile;
type CreateTaskFn = typeof createTryOnTask;
type PollFn = typeof pollTryOnTask;

export async function runTryOn(input: {
  apiKey: string;
  person: File;
  garment: File;
  garmentType: string;
  upload?: UploadFn;
  createTask?: CreateTaskFn;
  poll?: PollFn;
}): Promise<{ imageUrl: string }> {
  const apiKey = input.apiKey.trim();
  if (!apiKey) {
    throw new TryOnError(
      "未配置 DASHSCOPE_API_KEY，请在 .env.local 中填写北京地域的 Key",
      503,
    );
  }

  const garmentType = parseGarmentType(input.garmentType);
  if (!garmentType) {
    throw new TryOnError("请选择衣物类型：上衣、下装或连衣裙", 400);
  }

  const personCheck = validateImageFile(input.person);
  if (!personCheck.ok) {
    throw new TryOnError(`人物照：${personCheck.error}`, 400);
  }
  const garmentCheck = validateImageFile(input.garment);
  if (!garmentCheck.ok) {
    throw new TryOnError(`衣物照：${garmentCheck.error}`, 400);
  }

  const upload = input.upload ?? uploadTempFile;
  const createTask = input.createTask ?? createTryOnTask;
  const poll = input.poll ?? pollTryOnTask;

  const personUrl = await upload(apiKey, await toUpload(input.person, "person"));
  const garmentUrl = await upload(
    apiKey,
    await toUpload(input.garment, "garment"),
  );
  const taskId = await createTask(apiKey, personUrl, garmentUrl, garmentType);
  const imageUrl = await poll(apiKey, taskId);
  return { imageUrl };
}

export function asTryOnFile(value: FormDataEntryValue | null, label: string): File {
  if (value instanceof File && value.size > 0) {
    return value;
  }
  throw new TryOnError(`请上传${label}`, 400);
}

async function toUpload(file: File, prefix: string) {
  const bytes = await readFileBytes(file);
  const ext = extensionFor(file.type, file.name);
  return {
    name: `${prefix}-${Date.now()}${ext}`,
    type: file.type || "image/jpeg",
    bytes,
  };
}

async function readFileBytes(file: File): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === "function") {
    return new Uint8Array(await file.arrayBuffer());
  }
  if (typeof FileReader !== "undefined") {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(new Uint8Array(reader.result as ArrayBuffer));
      };
      reader.onerror = () => reject(new Error("无法读取图片内容"));
      reader.readAsArrayBuffer(file);
    });
  }
  throw new Error("无法读取图片内容");
}

function extensionFor(type: string, name: string) {
  const fromName = name.match(/\.\w+$/)?.[0];
  if (fromName) {
    return fromName.toLowerCase();
  }
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/bmp": ".bmp",
    "image/heic": ".heic",
  };
  return map[type] ?? ".jpg";
}
