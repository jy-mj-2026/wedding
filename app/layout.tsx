import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { weddingData } from "@/data/wedding";
import "./globals.css";

export const metadata: Metadata = {
  title: `${weddingData.groomName} & ${weddingData.brideName} | 모바일 청첩장`,
  description: `${weddingData.groomName}과 ${weddingData.brideName}의 결혼식에 초대합니다.`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#05080d",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
