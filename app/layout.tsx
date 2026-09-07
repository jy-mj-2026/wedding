import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { weddingData } from "@/data/wedding";
import "./globals.css";

const metadataBaseUrl = "https://jy-mj-2026.github.io";
const siteUrl = "https://jy-mj-2026.github.io/wedding/";
const socialImageUrl = "https://jy-mj-2026.github.io/wedding/images/og/wedding-og.jpg";
const socialTitle = "최종윤 · 장민정 결혼합니다";
const socialDescription = "2026.12.19. 토요일 오전 11시 | 성균관컨벤션웨딩홀";

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),
  title: socialTitle,
  description: socialDescription,
  openGraph: {
    title: socialTitle,
    description: socialDescription,
    url: siteUrl,
    siteName: "JY · MJ Wedding",
    type: "website",
    locale: "ko_KR",
    images: [
      {
        url: socialImageUrl,
        width: 1513,
        height: 795,
        alt: `${weddingData.groomName} · ${weddingData.brideName} 모바일 청첩장`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: socialTitle,
    description: socialDescription,
    images: [socialImageUrl],
  },
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
