const DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/api/v1";

export const DEFAULT_T2I_MODEL = "wanx2.1-t2i-turbo";
export const DEFAULT_REF_MODEL = "wanx-v1";

export type FetchLike = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export type ImageProviderConfig = {
  apiKey: string;
  t2iModel?: string;
  refModel?: string;
  fetchImpl?: FetchLike;
};

export function mapDashScopeError(code?: string, message?: string): string {
  const combined = `${code ?? ""} ${message ?? ""}`.toLowerCase();
  if (
    combined.includes("model not exist") ||
    combined.includes("model does not exist") ||
    combined.includes("model can not be found")
  ) {
    return "模型不存在或未开通：北京地域请用 wanx2.1-i2v-turbo，并在百炼模型广场开通图生视频";
  }
  switch (code) {
    case "InvalidApiKey":
      return "API Key 无效，请检查北京地域的 DASHSCOPE_API_KEY";
    case "InvalidParameter":
      return message?.trim() || "参数无效，请调整描述或参考图后重试";
    case "Throttling.RateQuota":
    case "Throttling":
      return "调用过于频繁，请稍后再试";
    case "DataInspectionFailed":
      return "内容未通过审核，请换一个描述再试";
    default:
      return message?.trim() || "出图失败，请稍后重试";
  }
}

export function buildStickerPrompt(userPrompt: string): string {
  const base = userPrompt.trim();
  return `${base}，微信表情包角色定妆，可爱卡通贴纸风格，单一角色居中，纯白色背景，无文字，无水印，简洁干净`;
}

export const NEGATIVE_PROMPT =
  "文字, 字幕, 水印, 复杂背景, 多人, 低清晰度, 畸形, 多余肢体";

type UploadPolicy = {
  upload_dir: string;
  upload_host: string;
  oss_access_key_id: string;
  signature: string;
  policy: string;
  x_oss_object_acl: string;
  x_oss_forbid_overwrite: string;
};

export async function uploadTempFile(
  apiKey: string,
  file: { name: string; type: string; bytes: Uint8Array },
  model: string,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  const policyResponse = await fetchImpl(
    `${DASHSCOPE_BASE}/uploads?action=getPolicy&model=${encodeURIComponent(model)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    },
  );
  const policyJson = (await policyResponse.json()) as {
    data?: UploadPolicy;
    message?: string;
    code?: string;
  };
  if (!policyResponse.ok || !policyJson.data) {
    throw new Error(
      mapDashScopeError(policyJson.code, policyJson.message) ||
        "上传凭证获取失败",
    );
  }

  const policy = policyJson.data;
  const key = `${policy.upload_dir}/${file.name}`;
  const form = new FormData();
  form.set("OSSAccessKeyId", policy.oss_access_key_id);
  form.set("Signature", policy.signature);
  form.set("policy", policy.policy);
  form.set("x-oss-object-acl", policy.x_oss_object_acl);
  form.set("x-oss-forbid-overwrite", policy.x_oss_forbid_overwrite);
  form.set("key", key);
  form.set("success_action_status", "200");
  form.set(
    "file",
    new Blob([Buffer.from(file.bytes)], { type: file.type }),
    file.name,
  );

  const uploadResponse = await fetchImpl(policy.upload_host, {
    method: "POST",
    body: form,
  });
  if (!uploadResponse.ok) {
    throw new Error("参考图上传失败");
  }

  return `oss://${key}`;
}

export function buildTextToImagePayload(
  prompt: string,
  model: string,
  options: { negativePrompt?: string; seed?: number } = {},
): Record<string, unknown> {
  const parameters: Record<string, unknown> = {
    size: "1024*1024",
    n: 1,
    prompt_extend: true,
    watermark: false,
  };
  if (typeof options.seed === "number") {
    parameters.seed = options.seed;
  }
  return {
    model,
    input: {
      prompt,
      negative_prompt: options.negativePrompt ?? NEGATIVE_PROMPT,
    },
    parameters,
  };
}

export function buildRefImagePayload(
  prompt: string,
  refImg: string,
  model: string,
  options: {
    refStrength?: number;
    refMode?: "repaint" | "refonly";
    negativePrompt?: string;
  } = {},
): Record<string, unknown> {
  return {
    model,
    input: {
      prompt,
      negative_prompt: options.negativePrompt ?? NEGATIVE_PROMPT,
      ref_img: refImg,
    },
    parameters: {
      size: "1024*1024",
      n: 1,
      // refonly：主要参考风格/外观；repaint：更强内容约束。表情变体用 refonly 更易换姿势。
      ref_mode: options.refMode ?? "repaint",
      // Lower strength → more pose freedom; higher → stronger identity lock.
      ref_strength: options.refStrength ?? 0.7,
      style: "<auto>",
    },
  };
}

export async function createImageTask(
  apiKey: string,
  payload: Record<string, unknown>,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  const response = await fetchImpl(
    `${DASHSCOPE_BASE}/services/aigc/text2image/image-synthesis`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
        "X-DashScope-OssResourceResolve": "enable",
      },
      body: JSON.stringify(payload),
    },
  );
  const json = (await response.json()) as {
    output?: { task_id?: string };
    code?: string;
    message?: string;
  };
  if (!response.ok || !json.output?.task_id) {
    throw new Error(mapDashScopeError(json.code, json.message));
  }
  return json.output.task_id;
}

type PollOptions = {
  fetchImpl?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
  intervalMs?: number;
  maxAttempts?: number;
};

export async function pollImageTask(
  apiKey: string,
  taskId: string,
  options: PollOptions = {},
): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const intervalMs = options.intervalMs ?? 3000;
  const maxAttempts = options.maxAttempts ?? 40;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetchImpl(`${DASHSCOPE_BASE}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const json = (await response.json()) as {
      output?: {
        task_status?: string;
        results?: { url?: string; code?: string; message?: string }[];
        code?: string;
        message?: string;
      };
      code?: string;
      message?: string;
    };
    const status = json.output?.task_status;

    if (status === "SUCCEEDED") {
      const url = json.output?.results?.find((r) => r.url)?.url;
      if (url) {
        return url;
      }
      throw new Error("出图成功但未返回图片地址");
    }
    if (status === "FAILED" || status === "CANCELED" || status === "UNKNOWN") {
      const resultError = json.output?.results?.find((r) => r.code || r.message);
      throw new Error(
        mapDashScopeError(
          resultError?.code ?? json.output?.code ?? json.code,
          resultError?.message ?? json.output?.message ?? json.message,
        ),
      );
    }
    if (!response.ok) {
      throw new Error(mapDashScopeError(json.code, json.message));
    }

    await sleep(intervalMs);
  }

  throw new Error("出图超时，请稍后重试");
}

export async function downloadImageBytes(
  url: string,
  fetchImpl: FetchLike = fetch,
): Promise<Buffer> {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error("下载生成图片失败");
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export type GenerateCharacterInput = {
  prompt: string;
  reference?: { name: string; type: string; bytes: Uint8Array };
};

/**
 * Generate a sticker-style character portrait via DashScope Wanxiang.
 * Returns raw image bytes (usually PNG/JPEG from the CDN).
 */
export async function generateCharacterImage(
  config: ImageProviderConfig,
  input: GenerateCharacterInput,
): Promise<Buffer> {
  const apiKey = config.apiKey.trim();
  if (!apiKey) {
    throw new Error(
      "未配置 DASHSCOPE_API_KEY，请在 .env.local 中填写北京地域的 Key",
    );
  }

  const fetchImpl = config.fetchImpl ?? fetch;
  const prompt = buildStickerPrompt(input.prompt);
  const t2iModel = config.t2iModel ?? DEFAULT_T2I_MODEL;
  const refModel = config.refModel ?? DEFAULT_REF_MODEL;

  let payload: Record<string, unknown>;
  if (input.reference) {
    const refUrl = await uploadTempFile(
      apiKey,
      input.reference,
      refModel,
      fetchImpl,
    );
    payload = buildRefImagePayload(prompt, refUrl, refModel);
  } else {
    payload = buildTextToImagePayload(prompt, t2iModel);
  }

  const taskId = await createImageTask(apiKey, payload, fetchImpl);
  const imageUrl = await pollImageTask(apiKey, taskId, { fetchImpl });
  return downloadImageBytes(imageUrl, fetchImpl);
}

export type GenerateExpressionInput = {
  /** Full prompt already including character lock + expression. */
  prompt: string;
  negativePrompt?: string;
  /** Shared seed across a pack for more consistent look. */
  seed?: number;
};

/**
 * Generate one expression/pose variant via text-to-image.
 * Identity comes from the character description in the prompt (not ref_img),
 * so pose can change freely without the strength tug-of-war.
 */
export async function generateExpressionImage(
  config: ImageProviderConfig,
  input: GenerateExpressionInput,
): Promise<Buffer> {
  const apiKey = config.apiKey.trim();
  if (!apiKey) {
    throw new Error(
      "未配置 DASHSCOPE_API_KEY，请在 .env.local 中填写北京地域的 Key",
    );
  }

  const fetchImpl = config.fetchImpl ?? fetch;
  const t2iModel = config.t2iModel ?? DEFAULT_T2I_MODEL;
  const payload = buildTextToImagePayload(input.prompt, t2iModel, {
    negativePrompt: input.negativePrompt,
    seed: input.seed,
  });
  const taskId = await createImageTask(apiKey, payload, fetchImpl);
  const imageUrl = await pollImageTask(apiKey, taskId, { fetchImpl });
  return downloadImageBytes(imageUrl, fetchImpl);
}

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
