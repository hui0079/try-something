import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "微信表情包生成器",
  description: "AI 定妆角色，模板批量合成微信规格静态表情包。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
