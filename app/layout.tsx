import type { Metadata } from "next";
import { Instrument_Serif, DM_Sans } from "next/font/google";
import { Providers } from "@/app/providers";
import "./globals.css";

const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-serif" });
const sans = DM_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "KinderX — Türkiye'nin #1 Anaokulu Yönetim Platformu",
  description:
    "Yoklama, aktivite takibi, veli iletişimi ve aidat yönetimi. Öğretmenler için tasarlandı, veliler için sevindi.",
  keywords: "anaokulu yönetim, okul takip, veli iletişim, yoklama sistemi, kinderx",
  openGraph: {
    title: "KinderX — Anaokulu Yönetim Platformu",
    description: "Türkiye'nin #1 anaokulu yönetim platformu",
    url: "https://kinderx.app",
    siteName: "KinderX",
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KinderX",
    description: "Türkiye'nin #1 anaokulu yönetim platformu",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${serif.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--text)] transition-colors">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
