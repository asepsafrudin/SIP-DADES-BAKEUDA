import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SIP-DADES BAKEUDA | Kabupaten Purbalingga",
  description:
    "Sistem Informasi Pengelolaan Dana Desa dan Bantuan Keuangan — Badan Keuangan Daerah Kabupaten Purbalingga Tahun Anggaran 2026",
  keywords: [
    "SIP-DADES",
    "Dana Desa",
    "BAKEUDA",
    "Purbalingga",
    "ADD",
    "BKK",
    "BHPR",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
