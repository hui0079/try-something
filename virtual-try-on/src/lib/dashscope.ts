import type { GarmentType } from "./validate";

const DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/api/v1";
const MODEL = "aitryon";

export type FetchLike = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

type TryOnInput = {
  person_image_url: string;
  top_garment_url?: string;
  bottom_garment_url?: string;
};

export type TryOnPayload = {
  model: string;
  input: TryOnInput;
  parameters: {
    resolution: number;
    restore_face: boolean;
  };
};

export function buildTryOnPayload(
  personUrl: string,
  garmentUrl: string,
  garmentType: GarmentType,
): TryOnPayload {
  const input: TryOnInput =
    garmentType === "bottom"
      ? {
          person_image_url: personUrl,
          bottom_garment_url: garmentUrl,
        }
      : {
          person_image_url: personUrl,
          top_garment_url: garmentUrl,
        };

  return {
    model: MODEL,
    input,
    parameters: {
      resolution: -1,
      restore_face: true,
    },
  };
}

export function mapDashScopeError(code?: string, message?: string): string {
  switch (code) {
    case "InvalidPerson":
      return "人物照需要是单人正面全身照";
    case "InvalidGarment":
      return "缺少可用的衣物图";
    case "InvalidInputLength":
      return "图片尺寸或大小不符合要求（5KB–5MB，边长 150–4096）";
    case "InvalidURL":
      return "图片地址无效，请换一张 JPG/PNG/WEBP/BMP 再试";
    case "InvalidApiKey":
      return "API Key 无效，请检查北京地域的 DASHSCOPE_API_KEY";
    default:
      return message?.trim() || "试衣失败，请稍后重试";
  }
}

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
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  const policyResponse = await fetchImpl(
    `${DASHSCOPE_BASE}/uploads?action=getPolicy&model=${MODEL}`,
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
    new Blob([file.bytes], { type: file.type }),
    file.name,
  );

  const uploadResponse = await fetchImpl(policy.upload_host, {
    method: "POST",
    body: form,
  });
  if (!uploadResponse.ok) {
    throw new Error("图片上传到临时存储失败");
  }

  return `oss://${key}`;
}

export async function createTryOnTask(
  apiKey: string,
  personUrl: string,
  garmentUrl: string,
  garmentType: GarmentType,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  const response = await fetchImpl(
    `${DASHSCOPE_BASE}/services/aigc/image2image/image-synthesis/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
        "X-DashScope-OssResourceResolve": "enable",
      },
      body: JSON.stringify(buildTryOnPayload(personUrl, garmentUrl, garmentType)),
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

export async function pollTryOnTask(
  apiKey: string,
  taskId: string,
  options: PollOptions = {},
): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const intervalMs = options.intervalMs ?? 4000;
  const maxAttempts = options.maxAttempts ?? 40;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetchImpl(`${DASHSCOPE_BASE}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const json = (await response.json()) as {
      output?: {
        task_status?: string;
        image_url?: string;
        code?: string;
        message?: string;
      };
      code?: string;
      message?: string;
    };
    const status = json.output?.task_status;

    if (status === "SUCCEEDED" && json.output?.image_url) {
      return json.output.image_url;
    }
    if (status === "FAILED" || status === "CANCELED" || status === "UNKNOWN") {
      throw new Error(
        mapDashScopeError(json.output?.code ?? json.code, json.output?.message ?? json.message),
      );
    }
    if (!response.ok) {
      throw new Error(mapDashScopeError(json.code, json.message));
    }

    await sleep(intervalMs);
  }

  throw new Error("试衣超时，请稍后重试");
}

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
