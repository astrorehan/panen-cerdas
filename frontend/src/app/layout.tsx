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
      <head>
        {/* Apply saved accessibility prefs before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;if(localStorage.getItem('panen.a11y.contrast')==='1')d.classList.add('a11y-contrast');var f=localStorage.getItem('panen.a11y.font');if(f==='lg')d.classList.add('a11y-large-text');else if(f==='sm')d.classList.add('a11y-small-text');}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${sans.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
