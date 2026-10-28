import type { PlatformId, TrendAdapter, TrendItem } from "./types";

const DEFAULT_TTL_MS = 30 * 60 * 1000;

interface CacheEntry {
  items: TrendItem[];
  updatedAt: number;
}

export interface CacheLoadResult extends CacheEntry {
  stale: boolean;
  error?: string;
}

interface LoadOptions {
  force?: boolean;
  now?: number;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "未知上游错误";
}

export class TrendCache {
  private readonly entries = new Map<PlatformId, CacheEntry>();
  private readonly inFlight = new Map<
    PlatformId,
    Promise<CacheLoadResult>
  >();

  constructor(private readonly ttlMs = DEFAULT_TTL_MS) {}

  async load(
    adapter: TrendAdapter,
    options: LoadOptions = {},
  ): Promise<CacheLoadResult> {
    const now = options.now ?? Date.now();
    const cached = this.entries.get(adapter.id);

    if (
      !options.force &&
      cached &&
      now - cached.updatedAt < this.ttlMs
    ) {
      return { ...cached, stale: false };
    }

    const pending = this.inFlight.get(adapter.id);
    if (pending) {
      return pending;
    }

    const request = adapter
      .fetch()
      .then((items) => {
        const entry = { items, updatedAt: now };
        this.entries.set(adapter.id, entry);
        return { ...entry, stale: false };
      })
      .catch((error: unknown) => {
        if (cached) {
          return {
            ...cached,
            stale: true,
            error: errorMessage(error),
          };
        }
        throw error;
      })
      .finally(() => {
        this.inFlight.delete(adapter.id);
      });

    this.inFlight.set(adapter.id, request);
    return request;
  }
}
