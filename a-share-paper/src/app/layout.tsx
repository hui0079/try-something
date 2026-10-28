import type { Metadata } from "next";

import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "A股模拟看盘",
  description: "用 Cursor 编程助手做 A 股模拟交易，并记录历史收益。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
