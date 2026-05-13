import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

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
        <Navbar />
        <main className="min-h-[calc(100vh-64px)]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
