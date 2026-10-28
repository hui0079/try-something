import { describe, expect, it } from "vitest";

import {
  EXPRESSION_NEGATIVE_PROMPT,
  buildExpressionPrompt,
  buildMotionPrompt,
  expressionActionForCaption,
  seedFromCharacterPrompt,
} from "./expression-prompts";

describe("expression-prompts", () => {
  it("maps known captions to concrete actions", () => {
    expect(expressionActionForCaption("无语")).toContain("摊开");
    expect(expressionActionForCaption("加油")).toContain("双拳");
  });

  it("falls back for custom captions", () => {
    expect(expressionActionForCaption("摸鱼")).toContain("摸鱼");
  });

  it("locks character description then requires expression", () => {
    const prompt = buildExpressionPrompt(
      "哈哈哈",
      "橘色小猫穿蓝色卫衣",
    );
    expect(prompt).toContain("橘色小猫穿蓝色卫衣");
    expect(prompt).toContain("捧腹大笑");
    expect(prompt).toContain("纯白色背景");
  });

  it("builds a looping motion prompt that demands a new pose and white background", () => {
    const prompt = buildMotionPrompt("好的");
    expect(prompt).toContain("姿势必须和首帧明显不同");
    expect(prompt).toContain("大拇指");
    expect(prompt).toContain("纯白亮底");
  });

  it("negative prompt discourages static standing", () => {
    expect(EXPRESSION_NEGATIVE_PROMPT).toContain("双手自然下垂静止站着");
  });

  it("derives a stable seed from character prompt", () => {
    expect(seedFromCharacterPrompt("猫")).toBe(seedFromCharacterPrompt("猫"));
    expect(seedFromCharacterPrompt("猫")).not.toBe(
      seedFromCharacterPrompt("狗"),
    );
  });
});
