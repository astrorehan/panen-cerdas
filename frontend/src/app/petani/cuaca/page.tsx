"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Cloud,
  CloudDrizzle,
  CloudRain,
  Droplets,
  Loader2,
  MapPin,
  Sun,
  Thermometer,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SkeletonLoader } from "@/components/skeleton-loader";
import { api, apiPath } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { getPetaniId } from "@/lib/auth";
import type { LahanItem, WeatherCuaca, WeatherResponse } from "@/types";

const CUACA_META: Record<WeatherCuaca, { label: string; icon: LucideIcon; tint: string }> = {
  cerah: { label: "Cerah", icon: Sun, tint: "bg-amber/15 text-amber" },
  berawan: { label: "Berawan", icon: Cloud, tint: "bg-muted text-muted-foreground" },
  "hujan-ringan": {
    label: "Hujan ringan",
    icon: CloudDrizzle,
    tint: "bg-primary-soft text-primary",
  },
  "hujan-lebat": { label: "Hujan lebat", icon: CloudRain, tint: "bg-clay/15 text-clay" },
};

// Fallback centroid DI Yogyakarta - dipakai kalau petani belum punya lahan
// dengan koordinat (mode GPS) tersimpan.
const FALLBACK_LAT = -7.855;
const FALLBACK_LON = 110.42;
const FALLBACK_LABEL = "DI Yogyakarta (default)";

type LahanWithCoords = LahanItem & { last_lat: number; last_lon: number };

export default function CuacaPage() {
  const petaniId = useMemo(() => getPetaniId(), []);
  const { data: lahanRes } = useApi(
    apiPath.lahanList(petaniId),
    () => api.lahan.list(petaniId),
  );
  const lahanList = lahanRes?.items ?? null;

  const lahanWithCoords = useMemo<LahanWithCoords[]>(
    () =>
      (lahanList ?? []).filter(
        (l): l is LahanWithCoords => l.last_lat != null && l.last_lon != null,
      ),
    [lahanList],
  );

  const defaultLahanId = lahanWithCoords[0]?.lahan_id ?? "";
  const [selectedLahanId, setSelectedLahanId] = useState<string>("");

  // Pre-select lahan terbaru yang punya koordinat, sekali saja ketika data lahan masuk
  useEffect(() => {
    if (!selectedLahanId && defaultLahanId) setSelectedLahanId(defaultLahanId);
  }, [defaultLahanId, selectedLahanId]);

  const selectedLahan = useMemo<LahanWithCoords | null>(
    () => lahanWithCoords.find((l) => l.lahan_id === selectedLahanId) ?? null,
    [lahanWithCoords, selectedLahanId],
  );

  const target = selectedLahan
    ? { lat: selectedLahan.last_lat, lon: selectedLahan.last_lon, label: selectedLahan.lahan_id }
    : { lat: FALLBACK_LAT, lon: FALLBACK_LON, label: FALLBACK_LABEL };

  const { data, loading, error } = useApi<WeatherResponse>(
    apiPath.weatherRecent(target.lat, target.lon, 7),
    () => api.weather.recent(target.lat, target.lon, 7),
  );

  return (
    <div className="container space-y-8 py-8 md:py-12">
      <header>
        <div className="eyebrow">
          <CloudRain className="h-3 w-3" />
          Cuaca 7 Hari Terakhir
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Ringkasan cuaca {target.label}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Data harian dari NASA POWER untuk koordinat lahan terpilih. Pakai
          untuk evaluasi kondisi tanam minggu lalu dan rencanakan irigasi,
          pemupukan, atau penyemprotan minggu depan.
        </p>
      </header>

      {/* Lahan picker */}
      {lahanList !== null && (
        <LahanPicker
          options={lahanWithCoords}
          totalLahan={lahanList.length}
          selectedId={selectedLahanId}
          onChange={setSelectedLahanId}
        />
      )}

      {loading && !data && <SkeletonLoader label="Mengambil data NASA POWER..." />}

      {error && !data && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/8 p-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-destructive">
              Gagal memuat cuaca
            </div>
            <p className="mt-0.5 text-sm text-foreground">
              {error}. Pastikan ml_service dan backend-express berjalan.
            </p>
          </div>
        </div>
      )}

      {data && data.items.length > 0 && <WeatherView data={data} />}

      {data && data.items.length === 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber/30 bg-amber/10 p-5">
          <Loader2 className="h-5 w-5 shrink-0 text-amber" />
          <p className="text-sm text-foreground">
            NASA POWER belum mengembalikan data untuk koordinat ini. Coba
            beberapa menit lagi - server mungkin sedang sibuk.
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-muted/40 p-5">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Catatan sumber
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Suhu, curah hujan, dan radiasi matahari diambil real-time dari{" "}
          <a
            href="https://power.larc.nasa.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            NASA POWER
          </a>
          . Data sains agroklimatologi gratis dengan lag 3-7 hari. Versi
          berikutnya menambahkan prakiraan 7-hari ke depan dari BMKG.
        </p>
      </section>
    </div>
  );
}

function LahanPicker({
  options,
  totalLahan,
  selectedId,
  onChange,
}: {
  options: LahanWithCoords[];
  totalLahan: number;
  selectedId: string;
  onChange: (id: string) => void;
}) {
  if (options.length === 0) {
    return (
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber/15 text-amber">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold tracking-tight">
              Belum ada lahan dengan koordinat
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {totalLahan === 0
                ? "Anda belum punya lahan tersimpan. "
                : `Anda punya ${totalLahan} lahan, tapi belum ada yang dikirim dengan mode GPS. `}
              Saat menyimulasikan prediksi, pilih mode{" "}
              <strong>GPS - NASA POWER</strong> agar koordinat lahan tersimpan
              dan halaman ini menampilkan cuaca untuk lahan itu. Untuk sekarang,
              kami pakai koordinat default DI Yogyakarta.
            </p>
            <Link
              href="/petani/prediksi"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              Buka formulir prediksi
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="space-y-2">
        <Label htmlFor="lahan-cuaca">Lahan</Label>
        <select
          id="lahan-cuaca"
          value={selectedId}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          {options.map((l) => (
            <option key={l.lahan_id} value={l.lahan_id}>
              {l.lahan_id} ({l.last_lat.toFixed(3)}, {l.last_lon.toFixed(3)})
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Menampilkan {options.length} dari {totalLahan} lahan yang punya
          koordinat (mode GPS).
        </p>
      </div>
    </Card>
  );
}

function WeatherView({ data }: { data: WeatherResponse }) {
  const totalRain = data.items.reduce((acc, f) => acc + f.hujan_mm, 0);
  const tempMaxValues = data.items
    .map((f) => f.suhu_max)
    .filter((v): v is number => v !== null);
  const avgMax = tempMaxValues.length
    ? (tempMaxValues.reduce((a, b) => a + b, 0) / tempMaxValues.length).toFixed(1)
    : "-";
  const sunny = data.items.filter((f) => f.cuaca === "cerah").length;

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-3">
        <Stat
          icon={Droplets}
          label="Total Hujan"
          value={`${totalRain.toFixed(1)}`}
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
          unit={`dari ${data.items.length} hari`}
          accent
        />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Detail harian</h2>
          <span className="font-mono text-[10px] uppercase tracking-smallcaps text-muted-foreground">
            {data.lat.toFixed(3)}, {data.lon.toFixed(3)}
          </span>
        </div>
        <div className="grid gap-2.5">
          {data.items.map((f, i) => {
            const meta = CUACA_META[f.cuaca];
            const Icon = meta.icon;
            return (
              <article
                key={f.date}
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
                    {f.suhu_min !== null && f.suhu_max !== null
                      ? `${f.suhu_min} - ${f.suhu_max} C`
                      : f.suhu_mean !== null
                        ? `${f.suhu_mean} C`
                        : "Suhu n/a"}
                  </div>
                  <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
                    {f.catatan}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <Mini label="Hujan" value={`${f.hujan_mm} mm`} />
                  <Mini
                    label="Radiasi"
                    value={
                      f.radiasi_w_m2 !== null ? `${f.radiasi_w_m2} W/m^2` : "n/a"
                    }
                  />
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
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
