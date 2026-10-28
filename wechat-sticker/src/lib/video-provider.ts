import {
  type FetchLike,
  mapDashScopeError,
} from "./image-provider";

const DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/api/v1";

export const DEFAULT_I2V_MODEL = "wanx2.1-i2v-turbo";

export const GIF_DEMO_MOTION_PROMPT =
  "只保留首帧角色的脸型和服装。大幅度点头并挥手，姿势和首帧明显不同。背景必须是均匀的纯白亮底，像摄影棚白墙，不要暗角和阴影。无文字无水印";

export const GIF_DEMO_NEGATIVE_PROMPT =
  "黑色背景, 暗背景, 灰色背景, 夜景, 暗角, 大面积阴影, 文字, 字幕, 水印, 镜头猛烈晃动, 人物变形, 多人";

export type VideoProviderConfig = {
  apiKey: string;
  i2vModel?: string;
  fetchImpl?: FetchLike;
};

export function buildImageToVideoPayload(
  imgUrl: string,
  prompt: string,
  model: string,
  options: { duration?: number; resolution?: string; negativePrompt?: string } = {},
): Record<string, unknown> {
  return {
    model,
    input: {
      prompt,
      negative_prompt: options.negativePrompt ?? GIF_DEMO_NEGATIVE_PROMPT,
      img_url: imgUrl,
    },
    parameters: {
      duration: options.duration ?? 3,
      resolution: options.resolution ?? "480P",
      prompt_extend: false,
      watermark: false,
    },
  };
}

export async function createVideoTask(
  apiKey: string,
  payload: Record<string, unknown>,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  const response = await fetchImpl(
    `${DASHSCOPE_BASE}/services/aigc/video-generation/video-synthesis`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
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
    throw new Error(
      mapDashScopeError(json.code, json.message) || "视频任务创建失败",
    );
  }
  return json.output.task_id;
}

type PollOptions = {
  fetchImpl?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
  intervalMs?: number;
  maxAttempts?: number;
};

export async function pollVideoTask(
  apiKey: string,
  taskId: string,
  options: PollOptions = {},
): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const intervalMs = options.intervalMs ?? 5000;
  const maxAttempts = options.maxAttempts ?? 60;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetchImpl(`${DASHSCOPE_BASE}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const json = (await response.json()) as {
      output?: {
        task_status?: string;
        video_url?: string;
        code?: string;
        message?: string;
      };
      code?: string;
      message?: string;
    };
    const status = json.output?.task_status;

    if (status === "SUCCEEDED") {
      if (json.output?.video_url) {
        return json.output.video_url;
      }
      throw new Error("视频生成成功但未返回地址");
    }
    if (status === "FAILED" || status === "CANCELED" || status === "UNKNOWN") {
      throw new Error(
        mapDashScopeError(
          json.output?.code ?? json.code,
          json.output?.message ?? json.message,
        ) || "视频生成失败",
      );
    }
    if (!response.ok) {
      throw new Error(mapDashScopeError(json.code, json.message));
    }

    await sleep(intervalMs);
  }

  throw new Error("视频生成超时，请稍后重试");
}

export async function downloadVideoBytes(
  url: string,
  fetchImpl: FetchLike = fetch,
): Promise<Buffer> {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error("下载生成视频失败");
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function generateImageToVideo(
  config: VideoProviderConfig,
  input: {
    imgUrl: string;
    prompt?: string;
    duration?: number;
    resolution?: string;
    negativePrompt?: string;
  },
): Promise<Buffer> {
  const apiKey = config.apiKey.trim();
  if (!apiKey) {
    throw new Error(
      "未配置 DASHSCOPE_API_KEY，请在 .env.local 中填写北京地域的 Key",
    );
  }

  const fetchImpl = config.fetchImpl ?? fetch;
  const model = config.i2vModel ?? DEFAULT_I2V_MODEL;
  const payload = buildImageToVideoPayload(
    input.imgUrl,
    input.prompt ?? GIF_DEMO_MOTION_PROMPT,
    model,
    {
      duration: input.duration,
      resolution: input.resolution,
      negativePrompt: input.negativePrompt,
    },
  );
  const taskId = await createVideoTask(apiKey, payload, fetchImpl);
  const videoUrl = await pollVideoTask(apiKey, taskId, { fetchImpl });
  return downloadVideoBytes(videoUrl, fetchImpl);
}

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
