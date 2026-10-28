import { TrendCache } from "./cache";
import type {
  PlatformResult,
  TrendAdapter,
  TrendsResponse,
} from "./types";

interface AggregateOptions {
  force?: boolean;
  now?: number;
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "未知上游错误";
  return message.slice(0, 120);
}

export async function aggregateTrends(
  adapters: TrendAdapter[],
  cache: TrendCache,
  options: AggregateOptions = {},
): Promise<TrendsResponse> {
  const now = options.now ?? Date.now();
  const settled = await Promise.allSettled(
    adapters.map((adapter) =>
      cache.load(adapter, { force: options.force, now }),
    ),
  );

  const platforms: PlatformResult[] = settled.map((result, index) => {
    const adapter = adapters[index];
    if (result.status === "rejected") {
      return {
        platform: adapter.id,
        name: adapter.name,
        status: "unavailable",
        items: [],
        error: safeError(result.reason),
      };
    }

    return {
      platform: adapter.id,
      name: adapter.name,
      status: result.value.stale ? "stale" : "ok",
      items: result.value.items,
      updatedAt: new Date(result.value.updatedAt).toISOString(),
      ...(result.value.error ? { error: result.value.error } : {}),
    };
  });

  return {
    platforms,
    updatedAt: new Date(now).toISOString(),
  };
}
