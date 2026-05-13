import Link from "next/link";
import {
  ArrowRight,
  Sprout,
  CloudRain,
  Coins,
  Layers,
  Sparkles,
  TrendingUp,
  Bot,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const QUICK_LINKS = [
  {
    href: "/petani/prediksi",
    icon: Sparkles,
    title: "Mulai Prediksi",
    blurb:
      "Isi kondisi lahan dan terima prediksi panen + rekomendasi tindakan dari model ML.",
    cta: "Buka formulir",
    primary: true,
  },
  {
    href: "/petani/lahan",
    icon: Layers,
    title: "Lahan Saya",
    blurb:
      "Catatan lahan yang sudah didaftarkan, status tanam, dan riwayat prediksi per lahan.",
    cta: "Lihat lahan",
  },
  {
    href: "/petani/harga",
    icon: Coins,
    title: "Harga Komoditas",
    blurb:
      "Harga pasaran mingguan untuk 9 komoditas pangan dan hortikultura dari pasar acuan.",
    cta: "Lihat harga",
  },
  {
    href: "/petani/cuaca",
    icon: CloudRain,
    title: "Prakiraan Cuaca",
    blurb:
      "Cuaca harian 7 hari ke depan untuk merencanakan irigasi, pemupukan, dan panen.",
    cta: "Lihat cuaca",
  },
];

const STATS = [
  { icon: Sprout, label: "Lahan aktif", value: "3", unit: "lahan" },
  { icon: TrendingUp, label: "Prediksi terakhir", value: "6.2", unit: "ton/ha" },
  { icon: CloudRain, label: "Hujan 7 hari", value: "18.6", unit: "mm/hari" },
];

export default function PetaniDashboardPage() {
  return (
    <div className="container py-8 md:py-12">
      <div className="grid gap-8">
        {/* Welcome */}
        <section className="rounded-3xl border border-border bg-gradient-to-br from-primary-soft via-surface to-amber/10 p-7 md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-xl">
              <div className="eyebrow">Dashboard Petani</div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                Selamat datang, mari rencanakan panen.
              </h1>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                Pantau lahan, terima prediksi panen, dan rekomendasi AI - semua
                dalam satu dashboard.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/petani/prediksi"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-card transition-all hover:bg-primary-deep hover:shadow-elevated"
                >
                  Buka prediksi
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/petani/cuaca"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:border-primary/30 hover:text-primary"
                >
                  Cek cuaca
                </Link>
              </div>
            </div>
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-elevated md:h-24 md:w-24">
              <Bot className="h-10 w-10 md:h-12 md:w-12" />
            </div>
          </div>
        </section>

        {/* Quick stats */}
        <section className="grid gap-3 sm:grid-cols-3">
          {STATS.map(({ icon: Icon, label, value, unit }) => (
            <Card key={label} className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {label}
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tracking-tight">{value}</span>
                <span className="text-sm text-muted-foreground">{unit}</span>
              </div>
            </Card>
          ))}
        </section>

        {/* Quick links */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Pintasan</h2>
            <span className="text-xs text-muted-foreground">
              4 menu utama
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {QUICK_LINKS.map(({ href, icon: Icon, title, blurb, cta, primary }) => (
              <Link
                key={href}
                href={href}
                className={`group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-surface p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated ${primary ? "border-primary/25 ring-1 ring-primary/10" : "border-border hover:border-primary/20"}`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${primary ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary group-hover:bg-primary group-hover:text-primary-foreground"}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
                    {cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {blurb}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Note */}
        <section className="rounded-2xl border border-border bg-muted/40 p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Catatan
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Data lahan, harga, dan cuaca beberapa menu masih memakai contoh
            (mock) untuk MVP. Prediksi sudah memanggil model XGBoost terlatih
            dan data NASA POWER live.
          </p>
        </section>
      </div>
    </div>
  );
}
