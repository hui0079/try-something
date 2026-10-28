import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { INFLUENCE_CAP } from "@/lib/sim/tick";
import { createWorld } from "@/lib/sim/world";

import { ColonyView } from "./colony-view";

/** What the player starts with, read from the engine rather than hardcoded. */
const START_INFLUENCE = createWorld("影响力").world.influence;

function panel(title: string): HTMLElement {
  const heading = screen.getByRole("heading", { name: title });
  const section = heading.closest("section");
  if (!section) throw new Error(`没有找到「${title}」面板`);
  return section;
}

function influence(points: number): string {
  return `影响力 ${points} / ${INFLUENCE_CAP}`;
}

describe("ColonyView", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("opens on day one of the founding year", () => {
    render(<ColonyView />);
    expect(screen.getByText("1 年 春 1 日")).toBeInTheDocument();
    expect(within(panel("地土")).getByText("河湾")).toBeInTheDocument();
    expect(within(panel("编年史")).getByRole("heading", { name: "第 1 年" })).toBeInTheDocument();
  });

  it("advances time and writes new days into the chronicle", async () => {
    const user = userEvent.setup();
    render(<ColonyView />);
    await user.click(screen.getByRole("button", { name: "推进 10 天" }));
    expect(screen.getByText("1 年 春 11 日")).toBeInTheDocument();
    expect(within(panel("编年史")).getByRole("heading", { name: "第 1 年" })).toBeInTheDocument();
  });

  it("speeds auto-play up one notch per click and wraps back to the start", async () => {
    const user = userEvent.setup();
    render(<ColonyView />);
    const speed = () => screen.getByRole("button", { name: /速度/ });
    expect(speed()).toHaveTextContent("速度 1×");
    await user.click(speed());
    expect(speed()).toHaveTextContent("速度 2×");
    await user.click(speed());
    expect(speed()).toHaveTextContent("速度 4×");
    await user.click(speed());
    expect(speed()).toHaveTextContent("速度 8×");
    await user.click(speed());
    expect(speed()).toHaveTextContent("速度 1×");
  });

  it("can skip a whole year at a time", async () => {
    const user = userEvent.setup();
    render(<ColonyView />);
    await user.click(screen.getByRole("button", { name: "推进 1 年" }));
    expect(screen.getByText("2 年 春 1 日")).toBeInTheDocument();
    const chronicle = panel("编年史");
    expect(within(chronicle).getByRole("heading", { name: "第 1 年" })).toBeInTheDocument();
    expect(within(chronicle).getByText(/第 1 年终/)).toBeInTheDocument();
  });

  it("spends influence on a world-wide intervention straight away", async () => {
    const user = userEvent.setup();
    render(<ColonyView />);
    expect(screen.getByText(influence(START_INFLUENCE))).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /降雨/ }));
    expect(screen.getByText(influence(START_INFLUENCE - 6))).toBeInTheDocument();
    expect(within(panel("编年史")).getByText(/雨/)).toBeInTheDocument();
  });

  it("draws the place you click in the center", async () => {
    const user = userEvent.setup();
    render(<ColonyView />);
    await user.click(within(panel("地土")).getByRole("button", { name: /南坡/ }));
    expect(screen.getByRole("img", { name: /南坡的景象/ })).toBeInTheDocument();
  });

  it("asks for targets before applying an intervention that needs them", async () => {
    const user = userEvent.setup();
    render(<ColonyView />);
    await user.click(screen.getByRole("button", { name: /放生鹿群/ }));
    expect(screen.getByText("放生鹿群：还要选 1 处")).toBeInTheDocument();
    await user.click(within(panel("地土")).getByRole("button", { name: /橡树林/ }));
    expect(screen.queryByText(/还要选/)).not.toBeInTheDocument();
    expect(screen.getByText(influence(START_INFLUENCE - 10))).toBeInTheDocument();
  });

  it("takes both targets even when they are picked in one go", async () => {
    const user = userEvent.setup();
    render(<ColonyView />);
    await user.click(screen.getByRole("button", { name: /开掘水渠/ }));
    const cards = within(panel("地土")).getAllByRole("button");
    // Fired back to back on purpose: this used to drop the first pick.
    await Promise.all([user.click(cards[0]), user.click(cards[1])]);
    expect(screen.queryByText(/还要选/)).not.toBeInTheDocument();
    expect(screen.getByText(influence(START_INFLUENCE - 18))).toBeInTheDocument();
    // Both ends of the canal know about it, which is the proof both picks landed.
    expect(within(panel("地土")).getAllByText(/渠通/)).toHaveLength(2);
  });

  it("stops offering interventions the player can no longer pay for", async () => {
    const user = userEvent.setup();
    render(<ColonyView />);
    // Rain costs 6, so three spells leave too little for a fourth.
    for (let i = 0; i < 3; i += 1) {
      await user.click(screen.getByRole("button", { name: /降雨/ }));
    }
    expect(screen.getByText(influence(START_INFLUENCE - 18))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /降雨/ })).toBeDisabled();
  });

  it("filters the chronicle down to one place", async () => {
    const user = userEvent.setup();
    render(<ColonyView />);
    await user.click(screen.getByRole("button", { name: "推进 1 季" }));
    const feed = panel("编年史");
    const everywhere = within(feed).getAllByRole("listitem").length;
    await user.click(within(feed).getByRole("button", { name: "圣泉" }));
    expect(within(feed).queryAllByRole("listitem").length).toBeLessThan(everywhere);
    await user.click(within(feed).getByRole("button", { name: "全境" }));
    expect(within(feed).getAllByRole("listitem")).toHaveLength(everywhere);
  });

  it("opens a villager's life page from the roster and comes back", async () => {
    const user = userEvent.setup();
    render(<ColonyView />);
    await user.click(within(panel("居民")).getAllByRole("button")[0]);
    expect(screen.getByRole("heading", { name: "生平", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("性情")).toBeInTheDocument();
    expect(screen.getByText("饱食")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "返回名录" }));
    expect(screen.getByRole("heading", { name: "居民" })).toBeInTheDocument();
  });

  it("starts a fresh world from a typed seed", async () => {
    const user = userEvent.setup();
    render(<ColonyView />);
    await user.click(screen.getByRole("button", { name: "推进 1 季" }));
    await user.type(screen.getByLabelText("世界种子"), "另一个世界");
    await user.click(screen.getByRole("button", { name: "新世界" }));
    expect(screen.getByText("1 年 春 1 日")).toBeInTheDocument();
    expect(screen.getByTitle("世界种子").textContent).toBe("另一个世界");
  });

  it("keeps the same seed producing the same opening chronicle", () => {
    const first = render(<ColonyView />);
    const opening = within(panel("编年史")).getAllByRole("listitem").map((li) => li.textContent);
    first.unmount();
    render(<ColonyView />);
    const again = within(panel("编年史")).getAllByRole("listitem").map((li) => li.textContent);
    expect(again).toEqual(opening);
  });
});
