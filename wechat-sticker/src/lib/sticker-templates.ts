export type StickerTemplate = {
  id: string;
  caption: string;
  /** Accent circle behind the character */
  accent: string;
  textFill: string;
  textStroke: string;
};

/** Default WeChat-style caption pack (8 stickers). */
export const DEFAULT_TEMPLATES: StickerTemplate[] = [
  {
    id: "ok",
    caption: "好的",
    accent: "#FFE8A3",
    textFill: "#1C1915",
    textStroke: "#FFFFFF",
  },
  {
    id: "no",
    caption: "不行",
    accent: "#FFC9C9",
    textFill: "#1C1915",
    textStroke: "#FFFFFF",
  },
  {
    id: "speechless",
    caption: "无语",
    accent: "#D9E2FF",
    textFill: "#1C1915",
    textStroke: "#FFFFFF",
  },
  {
    id: "fight",
    caption: "加油",
    accent: "#C8F0D8",
    textFill: "#1C1915",
    textStroke: "#FFFFFF",
  },
  {
    id: "cry",
    caption: "哭哭",
    accent: "#D6F0FF",
    textFill: "#1C1915",
    textStroke: "#FFFFFF",
  },
  {
    id: "love",
    caption: "爱你",
    accent: "#FFD6E8",
    textFill: "#1C1915",
    textStroke: "#FFFFFF",
  },
  {
    id: "busy",
    caption: "在忙",
    accent: "#E8E0FF",
    textFill: "#1C1915",
    textStroke: "#FFFFFF",
  },
  {
    id: "lol",
    caption: "哈哈哈",
    accent: "#FFE0B8",
    textFill: "#1C1915",
    textStroke: "#FFFFFF",
  },
];

export function templatesFromCaptions(
  captions: string[],
  base: StickerTemplate[] = DEFAULT_TEMPLATES,
): StickerTemplate[] {
  return captions.map((caption, index) => {
    const style = base[index % base.length];
    return {
      ...style,
      id: `${style.id}-${index}`,
      caption,
    };
  });
}

export function defaultCaptions(): string[] {
  return DEFAULT_TEMPLATES.map((t) => t.caption);
}
