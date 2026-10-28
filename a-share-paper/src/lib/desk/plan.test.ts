import { describe, expect, it } from "vitest";

import { DECISION_GAP_MS, planDecision } from "@/lib/desk/plan";

describe("planDecision", () => {
  it("does not start a child while the market is closed", () => {
    expect(
      planDecision({
        sessionOpen: false,
        quotesStale: false,
        inFlight: false,
        hasApiKey: true,
        nowMs: 0,
        lastStartedAt: null,
      }),
    ).toBe("wait");
  });

  it("cancels an in-flight run when quotes go stale", () => {
    expect(
      planDecision({
        sessionOpen: true,
        quotesStale: true,
        inFlight: true,
        hasApiKey: true,
        nowMs: 0,
        lastStartedAt: 0,
      }),
    ).toBe("cancel");
  });

  it("waits out the five minute gap and then starts", () => {
    expect(
      planDecision({
        sessionOpen: true,
        quotesStale: false,
        inFlight: false,
        hasApiKey: true,
        nowMs: DECISION_GAP_MS - 1,
        lastStartedAt: 0,
      }),
    ).toBe("wait");
    expect(
      planDecision({
        sessionOpen: true,
        quotesStale: false,
        inFlight: false,
        hasApiKey: true,
        nowMs: DECISION_GAP_MS,
        lastStartedAt: 0,
      }),
    ).toBe("start");
  });
});
