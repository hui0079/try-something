export const DECISION_GAP_MS = 5 * 60 * 1000;
export const DECISION_TIMEOUT_MS = 4 * 60 * 1000;

export function planDecision(input: {
  sessionOpen: boolean;
  quotesStale: boolean;
  inFlight: boolean;
  hasApiKey: boolean;
  nowMs: number;
  lastStartedAt: number | null;
}): "start" | "wait" | "cancel" {
  if (!input.sessionOpen || input.quotesStale) {
    return input.inFlight ? "cancel" : "wait";
  }
  if (input.inFlight || !input.hasApiKey) return "wait";
  if (input.lastStartedAt !== null && input.nowMs - input.lastStartedAt < DECISION_GAP_MS) {
    return "wait";
  }
  return "start";
}
