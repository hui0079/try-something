import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { ThemeToggle } from "../ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  });

  it("switches between dark and light themes and persists the choice", async () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button", {
      name: "切换白天或黑夜模式",
    });

    await userEvent.click(button);

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(window.localStorage.getItem("hot-trends-theme")).toBe("dark");

    await userEvent.click(button);

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(window.localStorage.getItem("hot-trends-theme")).toBe("light");
  });
});
