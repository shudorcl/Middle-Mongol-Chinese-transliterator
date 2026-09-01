import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "中古蒙漢音譯器",
  description: "基于中古蒙漢對音表试行版 3-18v 的罗马字与英文近似音译工具。",
  openGraph: {
    title: "中古蒙漢音譯器",
    description: "逐音节查表、改选候选译字，并浏览完整对音表与特殊译字。",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans">
      <body>{children}</body>
    </html>
  );
}
