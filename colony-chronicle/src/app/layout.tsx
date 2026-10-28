import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "聚落编年史",
  description: "一个文字沙盒：你是这片土地的气候与命运，不是村长。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
