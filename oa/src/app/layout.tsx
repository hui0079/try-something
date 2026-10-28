import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "企业 OA",
  description: "请假、报销和统一待办",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
