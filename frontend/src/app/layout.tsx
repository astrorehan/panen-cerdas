import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutWrapper } from "@/components/layout-wrapper";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Panen Cerdas — Pertanian Cerdas dengan AI",
  description:
    "Platform pertanian cerdas berbasis AI untuk prediksi panen, analisis cuaca, monitoring irigasi, dan rekomendasi tindakan — dirancang untuk petani Indonesia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${sans.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
