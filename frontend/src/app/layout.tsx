import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Masthead } from "@/components/masthead";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  style: ["normal", "italic"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PanenCerdas — Buletin Prediksi Panen",
  description:
    "Buletin prediksi hasil panen berbasis citra satelit Sentinel-2, data cuaca, dan ML — surplus dan defisit pangan per kecamatan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${fraunces.variable} ${sans.variable} ${mono.variable} min-h-screen font-sans text-ink`}
      >
        <Masthead />
        <Navbar />
        <main className="container py-10">{children}</main>
        <footer className="border-t border-rule">
          <div className="container flex flex-wrap items-center justify-between gap-3 py-6 font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
            <span>§ PanenCerdas · Buletin Edisi 01 · 2026</span>
            <span>UNITY Competition #14 · UNY 2026</span>
            <span>8°S · 107°E · Jawa Barat</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
