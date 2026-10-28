const DEFAULT_TIMEOUT_MS = 10_000;

const DEFAULT_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "zh-CN,zh;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
};

interface FetchOptions {
  referer?: string;
  timeoutMs?: number;
}

async function request(url: string, options: FetchOptions): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        ...DEFAULT_HEADERS,
        ...(options.referer ? { Referer: options.referer } : {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`上游请求失败 (${response.status})`);
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("上游请求超时");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchJson(
  url: string,
  options: FetchOptions = {},
): Promise<unknown> {
  return (await request(url, options)).json();
}

export async function fetchText(
  url: string,
  options: FetchOptions = {},
): Promise<string> {
  return (await request(url, options)).text();
}
