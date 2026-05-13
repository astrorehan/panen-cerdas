import Link from "next/link";
import { Sprout, Github, Mail, MapPin } from "lucide-react";

const LINKS = {
  produk: [
    { label: "Fitur", href: "/#features" },
    { label: "Dashboard Preview", href: "/#preview" },
    { label: "Harga", href: "/#harga" },
    { label: "FAQ", href: "/#faq" },
  ],
  perusahaan: [
    { label: "Tentang", href: "/tentang" },
    { label: "Hubungi Kami", href: "/hubungi-kami" },
    { label: "GitHub", href: "https://github.com/astrorehan/panen-cerdas" },
  ],
  data: [
    { label: "NASA POWER", href: "https://power.larc.nasa.gov/" },
    { label: "Sentinel-2", href: "https://sentinels.copernicus.eu/" },
    { label: "BMKG", href: "https://www.bmkg.go.id/" },
    { label: "BPS", href: "https://www.bps.go.id/" },
  ],
};

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-background">
      <div className="container py-14">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sprout className="h-5 w-5" />
              </span>
              <span className="text-base font-semibold tracking-tight">
                Panen Cerdas
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Platform pertanian cerdas berbasis AI untuk prediksi panen,
              analisis cuaca, dan rekomendasi tindakan bagi petani Indonesia.
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              Jawa Barat, Indonesia
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
              Produk
            </div>
            <ul className="space-y-2 text-sm">
              {LINKS.produk.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
              Perusahaan
            </div>
            <ul className="space-y-2 text-sm">
              {LINKS.perusahaan.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
              Sumber Data
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {LINKS.data.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-center gap-3">
              <Link
                href="https://github.com/astrorehan/panen-cerdas"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
              >
                <Github className="h-4 w-4" />
              </Link>
              <Link
                href="mailto:mraihansurya1@gmail.com"
                aria-label="Email"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
              >
                <Mail className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <div>
            &copy; {new Date().getFullYear()} Panen Cerdas. Dibuat untuk
            UNITY Competition #14 - UNY 2026.
          </div>
          <div className="flex items-center gap-4">
            <span>v0.1.0 - MVP</span>
            <span>Padi - Jawa Barat</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
