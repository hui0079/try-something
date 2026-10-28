import { NextResponse } from "next/server";

import { trendAdapters } from "@/lib/trends/adapters";
import { TrendCache } from "@/lib/trends/cache";
import { aggregateTrends } from "@/lib/trends/service";

export const dynamic = "force-dynamic";

const cache = new TrendCache();

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const force = searchParams.get("refresh") === "1";
  const platform = searchParams.get("platform");
  const selectedAdapters = platform
    ? trendAdapters.filter((adapter) => adapter.id === platform)
    : trendAdapters;
  const result = await aggregateTrends(selectedAdapters, cache, { force });

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
