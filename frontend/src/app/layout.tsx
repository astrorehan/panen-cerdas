import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "PanenCerdas — Prediksi Hasil Panen Nasional",
  description:
    "Platform prediksi hasil panen berbasis citra satelit Sentinel-2, data cuaca, dan ML untuk surplus/defisit pangan per kecamatan.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="container py-6">{children}</main>
        <footer className="border-t bg-white">
          <div className="container py-4 text-sm text-muted-foreground">
            PanenCerdas - UNITY Competition #14 UNY 2026
          </div>
        </footer>
      </body>
    </html>
  );
}
