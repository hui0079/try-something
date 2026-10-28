import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "试衣间",
  description: "上传人物照和衣物照，生成虚拟试衣效果。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
