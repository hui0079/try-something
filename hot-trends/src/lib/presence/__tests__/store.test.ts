import { describe, expect, it } from "vitest";

import { PresenceStore } from "../store";

const morning = Date.parse("2026-09-24T08:00:00+08:00");
const oneMinute = 60_000;

describe("PresenceStore", () => {
  it("counts a visitor as online and as today's visit", () => {
    const store = new PresenceStore();

    expect(store.touch("11111111-1111-4111-8111-111111111111", morning)).toEqual({
      online: 1,
      today: 1,
    });
  });

  it("does not count the same visitor twice and drops stale sessions", () => {
    const store = new PresenceStore();
    const first = "11111111-1111-4111-8111-111111111111";
    const second = "22222222-2222-4222-8222-222222222222";

    store.touch(first, morning);
    store.touch(second, morning - oneMinute - 1);

    expect(store.touch(first, morning)).toEqual({
      online: 1,
      today: 2,
    });
  });

  it("starts a new daily count after Shanghai midnight", () => {
    const store = new PresenceStore();
    const visitor = "11111111-1111-4111-8111-111111111111";

    store.touch(visitor, Date.parse("2026-09-23T23:30:00+08:00"));

    expect(
      store.touch(
        "33333333-3333-4333-8333-333333333333",
        Date.parse("2026-09-24T00:10:00+08:00"),
      ),
    ).toEqual({
      online: 1,
      today: 1,
    });
  });
});
