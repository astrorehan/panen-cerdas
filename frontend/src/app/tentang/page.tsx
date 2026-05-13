import {
  Calendar,
  CheckCircle2,
  Circle,
  Cpu,
  Database,
  Globe,
  Loader2,
  Satellite,
  Sparkles,
  Target,
} from "lucide-react";
import { Card } from "@/components/ui/card";

export default function TentangPage() {
  return (
    <div className="container space-y-16 py-12 md:py-20">
      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <div className="eyebrow mx-auto">
          <Sparkles className="h-3 w-3" />
          Manifesto
        </div>
        <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-balance md:text-5xl">
          Mengapa kami membangun{" "}
          <span className="text-primary">Panen Cerdas</span>
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
          Data panen di Indonesia masih dikumpulkan dengan tangan - lambat,
          bias, dan rentan manipulasi. Panen Cerdas mengukur panen{" "}
          <em>sebelum</em> panen menggunakan citra satelit yang sudah
          tersedia gratis, agar pemerintah dan petani tidak lagi bereaksi
          setelah harga jatuh.
        </p>
      </section>

      {/* Problem grid */}
      <section>
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow">Masalah</div>
          <h2 className="mt-5 h-section">Tiga lubang besar di data pangan</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Issue
            numeral="01"
            title="Manual dan terlambat"
            body="Penyuluh lapangan masih mencatat produksi pakai kertas. Pemerintah baru tahu surplus 4-6 bulan setelah panen - sudah terlambat."
          />
          <Issue
            numeral="02"
            title="Level provinsi"
            body="Statistik resmi berhenti di provinsi. Petani di Bantul atau Kulon Progo tidak punya sinyal harga yang relevan untuk lahan mereka sendiri."
          />
          <Issue
            numeral="03"
            title="Impor reaktif"
            body="Keputusan impor beras, jagung, kedelai diambil setelah harga sudah anjlok. Kerugian akumulatif: triliunan rupiah per tahun."
          />
        </div>
      </section>

      {/* Method */}
      <section className="grid gap-10 lg:grid-cols-[1fr_2fr]">
        <header>
          <div className="eyebrow">
            <Target className="h-3 w-3" />
            Metodologi
          </div>
          <h2 className="mt-5 h-section">Lima langkah, satu hipotesis</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Time-based split (train 2018-2022, test 2023-2024). Tidak ada
            random split - itu kebocoran data.
          </p>
        </header>
        <ol className="space-y-3">
          {[
            {
              title: "NDVI per kecamatan",
              body: "Ekstraksi indeks vegetasi Sentinel-2 L2A bulanan via Google Earth Engine, dengan masking awan SCL.",
            },
            {
              title: "Cuaca terintegrasi",
              body: "Curah hujan, suhu, kelembapan dari ERA5-Land - diagregasi ke level kecamatan.",
            },
            {
              title: "Lag features",
              body: "NDVI T-3 / T-2 / T-1, curah hujan kumulatif growing season, lag yield tahun sebelumnya.",
            },
            {
              title: "RandomForest ensemble",
              body: "Training 2018-2022, test 2023-2024.",
            },
            {
              title: "Surplus / defisit",
              body: "Yield prediksi x luas panen - konsumsi kabupaten = surplus atau defisit per wilayah.",
            },
          ].map((s, i) => (
            <li
              key={s.title}
              className="flex gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                {i + 1}
              </div>
              <div>
                <h3 className="text-base font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Stack */}
      <section>
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow">
            <Cpu className="h-3 w-3" />
            Tech Stack
          </div>
          <h2 className="mt-5 h-section">Bahan baku</h2>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STACK.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="p-5">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                  {s.label}
                </div>
                <div className="mt-2 text-sm font-medium text-foreground">
                  {s.value}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Roadmap */}
      <section>
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow">
            <Calendar className="h-3 w-3" />
            Roadmap
          </div>
          <h2 className="mt-5 h-section">Empat hari menuju UNITY</h2>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Day n="01" status="done" title="Foundation" body="Pivot Next.js + FastAPI, scaffold, dummy demo." />
          <Day n="02" status="done" title="Pipeline + Model" body="NASA POWER - BPS - RandomForest 9 komoditas." />
          <Day n="03" status="now" title="Bind & Polish" body="Real data ke peta + detail. Filter & ekspor." />
          <Day n="04" status="next" title="Deploy + Pitch" body="Vercel + Railway. Demo video. Pitch deck." />
        </div>
      </section>

      <div className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
        Tim Panen Cerdas - DI Yogyakarta - UNITY Competition 14 - UNY 2026
      </div>
    </div>
  );
}

const STACK = [
  { icon: Globe, label: "Frontend", value: "Next.js 14 + Tailwind + react-leaflet + Recharts" },
  { icon: Cpu, label: "Backend", value: "FastAPI - Python 3.12 - Pydantic" },
  { icon: Sparkles, label: "ML", value: "RandomForest (scikit-learn)" },
  { icon: Satellite, label: "Citra", value: "Sentinel-2 L2A via Google Earth Engine" },
  { icon: Globe, label: "Cuaca", value: "NASA POWER - BMKG" },
  { icon: Database, label: "Truth", value: "BPS - Produksi padi 2018-2024" },
];

function Issue({
  numeral,
  title,
  body,
}: {
  numeral: string;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-6 shadow-card">
      <div className="text-3xl font-semibold tracking-tight text-clay">
        {numeral}
      </div>
      <h3 className="mt-3 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </article>
  );
}

function Day({
  n,
  title,
  body,
  status,
}: {
  n: string;
  title: string;
  body: string;
  status: "done" | "now" | "next";
}) {
  const Icon =
    status === "done" ? CheckCircle2 : status === "now" ? Loader2 : Circle;
  const tone =
    status === "done"
      ? "bg-primary-soft text-primary"
      : status === "now"
        ? "bg-amber/15 text-amber"
        : "bg-muted text-muted-foreground";
  return (
    <article className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Day {n}
        </span>
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full ${tone}`}
        >
          <Icon
            className={`h-3.5 w-3.5 ${status === "now" ? "animate-spin" : ""}`}
          />
        </span>
      </div>
      <h3 className="mt-3 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </article>
  );
}
