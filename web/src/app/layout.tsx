import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  // только origin: пути ниже уже содержат basePath (демо под подпутём)
  metadataBase: new URL(new URL(process.env.SITE_URL ?? "http://localhost:3000").origin),
  title: {
    default: "BETONPOLI — материалы и оборудование для промышленного пола",
    template: "%s | betonpoli.ru",
  },
  description:
    "Полимерные полы, сухие смеси, топпинги, оборудование и расходные материалы. Расчёт расхода и готовые системы пола.",
  openGraph: { siteName: "betonpoli.ru", locale: "ru_RU", type: "website", images: [`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/brand/og.png`] },
  ...(process.env.DEMO_MODE === "1" && { robots: { index: false, follow: false } }),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${plexMono.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
