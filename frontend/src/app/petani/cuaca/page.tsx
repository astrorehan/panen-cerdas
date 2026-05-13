import {
  Cloud,
  CloudDrizzle,
  CloudRain,
  Droplets,
  Sun,
  Thermometer,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";

type Cuaca = "cerah" | "berawan" | "hujan-ringan" | "hujan-lebat";

const FORECAST: Array<{
  hari: string;
  tanggal: string;
  cuaca: Cuaca;
  suhu_min: number;
  suhu_max: number;
  hujan_mm: number;
  radiasi_w_m2: number;
  catatan: string;
}> = [
  {
    hari: "Senin",
    tanggal: "12 Mei",
    cuaca: "cerah",
    suhu_min: 23,
    suhu_max: 31,
    hujan_mm: 0,
    radiasi_w_m2: 240,
    catatan: "Cocok untuk pemupukan pagi.",
  },
  {
    hari: "Selasa",
    tanggal: "13 Mei",
    cuaca: "berawan",
    suhu_min: 23,
    suhu_max: 29,
    hujan_mm: 2,
    radiasi_w_m2: 195,
    catatan: "Awan tebal, fotosintesis berkurang sedikit.",
  },
  {
    hari: "Rabu",
    tanggal: "14 Mei",
    cuaca: "hujan-ringan",
    suhu_min: 22,
    suhu_max: 27,
    hujan_mm: 12,
    radiasi_w_m2: 150,
    catatan: "Tunda pemupukan, hujan ringan sore hari.",
  },
  {
    hari: "Kamis",
    tanggal: "15 Mei",
    cuaca: "hujan-lebat",
    suhu_min: 22,
    suhu_max: 26,
    hujan_mm: 35,
    radiasi_w_m2: 110,
    catatan: "Periksa drainase, potensi genangan di petak rendah.",
  },
  {
    hari: "Jumat",
    tanggal: "16 Mei",
    cuaca: "hujan-ringan",
    suhu_min: 22,
    suhu_max: 28,
    hujan_mm: 8,
    radiasi_w_m2: 170,
    catatan: "Cuaca membaik, panen mendung tetap aman.",
  },
  {
    hari: "Sabtu",
    tanggal: "17 Mei",
    cuaca: "berawan",
    suhu_min: 23,
    suhu_max: 30,
    hujan_mm: 1,
    radiasi_w_m2: 210,
    catatan: "Hari baik untuk penyemprotan hama pagi.",
  },
  {
    hari: "Minggu",
    tanggal: "18 Mei",
    cuaca: "cerah",
    suhu_min: 24,
    suhu_max: 32,
    hujan_mm: 0,
    radiasi_w_m2: 245,
    catatan: "Radiasi tinggi, pastikan irigasi cukup.",
  },
];

const CUACA_META: Record<Cuaca, { label: string; icon: LucideIcon; tint: string }> = {
  cerah: { label: "Cerah", icon: Sun, tint: "bg-amber/15 text-amber" },
  berawan: { label: "Berawan", icon: Cloud, tint: "bg-muted text-muted-foreground" },
  "hujan-ringan": {
    label: "Hujan ringan",
    icon: CloudDrizzle,
    tint: "bg-primary-soft text-primary",
  },
  "hujan-lebat": { label: "Hujan lebat", icon: CloudRain, tint: "bg-clay/15 text-clay" },
};

export default function CuacaPage() {
  const totalRain = FORECAST.reduce((acc, f) => acc + f.hujan_mm, 0);
  const avgMax = (
    FORECAST.reduce((acc, f) => acc + f.suhu_max, 0) / FORECAST.length
  ).toFixed(1);
  const sunny = FORECAST.filter((f) => f.cuaca === "cerah").length;

  return (
    <div className="container space-y-8 py-8 md:py-12">
      <header>
        <div className="eyebrow">
          <CloudRain className="h-3 w-3" />
          Prakiraan Cuaca
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Tujuh hari ke depan, Cikajang
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Prakiraan harian untuk merencanakan irigasi, pemupukan, penyemprotan
          hama, dan penjadwalan panen.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat
          icon={Droplets}
          label="Total Hujan"
          value={`${totalRain}`}
          unit="mm / 7 hari"
        />
        <Stat
          icon={Thermometer}
          label="Suhu Maks. Rata-rata"
          value={avgMax}
          unit="C"
        />
        <Stat
          icon={Sun}
          label="Hari Cerah"
          value={`${sunny}`}
          unit="dari 7 hari"
          accent
        />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Detail harian</h2>
        </div>
        <div className="grid gap-2.5">
          {FORECAST.map((f, i) => {
            const meta = CUACA_META[f.cuaca];
            const Icon = meta.icon;
            return (
              <article
                key={f.tanggal}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-5 rounded-2xl border border-border bg-surface p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated md:p-5"
              >
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${meta.tint}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {meta.label}
                  </span>
                </div>
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Hari ke-{i + 1} - {f.hari}, {f.tanggal}
                  </div>
                  <div className="mt-1 text-xl font-semibold tracking-tight">
                    {f.suhu_min} - {f.suhu_max} C
                  </div>
                  <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
                    {f.catatan}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <Mini label="Hujan" value={`${f.hujan_mm} mm`} />
                  <Mini label="Radiasi" value={`${f.radiasi_w_m2} W/m`} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-muted/40 p-5">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Catatan sumber
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Prakiraan ini adalah data contoh statis. Versi berikutnya akan
          memakai NASA POWER (radiasi + suhu historis) dan BMKG (hujan +
          prakiraan 7-hari) ber-geolokasi GPS petani.
        </p>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  unit,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  accent?: boolean;
}) {
  return (
    <Card
      className={`flex items-center gap-4 p-5 ${
        accent
          ? "border-primary/25 bg-gradient-to-br from-primary to-primary-deep text-primary-foreground"
          : ""
      }`}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${
          accent ? "bg-primary-foreground/10" : "bg-primary-soft text-primary"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div
          className={`text-xs font-medium uppercase tracking-wider ${
            accent ? "text-primary-foreground/80" : "text-muted-foreground"
          }`}
        >
          {label}
        </div>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold tracking-tight">{value}</span>
          <span
            className={`text-xs ${
              accent ? "text-primary-foreground/80" : "text-muted-foreground"
            }`}
          >
            {unit}
          </span>
        </div>
      </div>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-xs text-muted-foreground">
      <span>{label}: </span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
