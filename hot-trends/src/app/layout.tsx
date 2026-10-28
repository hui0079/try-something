import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const themeInitScript = `
  (() => {
    let theme = "light";
    try {
      const saved = localStorage.getItem("hot-trends-theme");
      theme =
        saved === "light" || saved === "dark"
          ? saved
          : matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    } catch {
      theme = matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  })();
`;

export const metadata: Metadata = {
  title: "热浪 · 多平台实时热榜",
  description:
    "聚合知乎、微博、哔哩哔哩、百度、抖音、虎扑、今日头条和小红书实时热榜。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
