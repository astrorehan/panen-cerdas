"use client";

import { useMemo, useState } from "react";
import { Sparkles, MapPin, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResultCard } from "@/components/result-card";
import { FeedbackForm } from "@/components/feedback-form";
import { SkeletonLoader } from "@/components/skeleton-loader";
import { cn } from "@/lib/utils";
import type { CropType, PredictResponse } from "@/types";

const CROPS: Array<{ id: CropType; label: string; subtitle: string }> = [
  { id: "padi", label: "Padi", subtitle: "± 110 hari" },
  { id: "jagung", label: "Jagung", subtitle: "± 100 hari" },
  { id: "kedelai", label: "Kedelai", subtitle: "± 85 hari" },
  { id: "ubi_jalar", label: "Ubi Jalar", subtitle: "± 120 hari" },
  { id: "ubi_kayu", label: "Singkong", subtitle: "± 270 hari" },
  { id: "cabe_besar", label: "Cabe Besar", subtitle: "± 90 hari" },
  { id: "cabe_rawit", label: "Cabe Rawit", subtitle: "± 75 hari" },
  { id: "bawang_merah", label: "Bawang Merah", subtitle: "± 65 hari" },
  { id: "bawang_putih", label: "Bawang Putih", subtitle: "± 100 hari" },
];

const VARIETIES: Record<CropType, string[]> = {
  padi: ["Lokal", "IR64", "Ciherang", "Inpari32", "Memberamo"],
  jagung: ["Lokal", "NK7328", "Pioneer36", "Bisi18"],
  kedelai: ["Lokal", "Anjasmoro", "Dena1", "Grobogan"],
  ubi_jalar: ["Lokal", "Cilembu", "Papua Solossa", "Sukuh"],
  ubi_kayu: ["Lokal", "UJ5", "Adira1", "Malang6"],
  cabe_besar: ["Lokal", "Lado", "Tit Super", "Gada"],
  cabe_rawit: ["Lokal", "Pelita", "Dewata", "Ori"],
  bawang_merah: ["Lokal", "Bima Brebes", "Tajuk", "Katumi"],
  bawang_putih: ["Lokal", "Lumbu Hijau", "Tawangmangu", "Kesuma"],
};

const PESTS: Array<{ value: number; label: string; hint: string }> = [
  { value: 0.0, label: "Tidak ada", hint: "Lahan bersih, tidak ada serangan" },
  { value: 0.3, label: "Rendah", hint: "Beberapa daun tertular, < 10%" },
  { value: 0.6, label: "Sedang", hint: "Tersebar di petak, 10-30%" },
  { value: 0.9, label: "Tinggi", hint: "Serangan masif, > 30%" },
];

type ClimateMode = "default" | "gps" | "manual";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; result: PredictResponse }
  | { kind: "error"; message: string };

export default function PrediksiPage() {
  const [cropType, setCropType] = useState<CropType>("padi");
  const [landAreaHa, setLandAreaHa] = useState("1.0");
  const [variety, setVariety] = useState<string>("Ciherang");
  const [pestPressure, setPestPressure] = useState<number>(0.0);

  const [climateMode, setClimateMode] = useState<ClimateMode>("default");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [rainfall, setRainfall] = useState("");
  const [temperature, setTemperature] = useState("");
  const [solar, setSolar] = useState("");
  const [ndvi, setNdvi] = useState("");

  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const varietyOptions = useMemo(() => VARIETIES[cropType], [cropType]);

  function pickCrop(c: CropType) {
    setCropType(c);
    if (!VARIETIES[c].includes(variety)) {
      setVariety(VARIETIES[c][1] ?? VARIETIES[c][0]);
    }
  }

  function useGeolocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      alert("Geolokasi tidak tersedia di peramban ini.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(5));
        setLon(pos.coords.longitude.toFixed(5));
      },
      (err) => alert(`Gagal mengambil lokasi: ${err.message}`),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "loading" });
    try {
      const body = {
        crop_type: cropType,
        land_area_ha: Number(landAreaHa),
        pest_pressure: pestPressure,
        variety,
        ...(climateMode === "gps" && lat && lon
          ? { lat: Number(lat), lon: Number(lon) }
          : {}),
        ...(climateMode === "manual"
          ? {
              ...(rainfall ? { rainfall_mm: Number(rainfall) } : {}),
              ...(temperature ? { temperature_c: Number(temperature) } : {}),
              ...(solar ? { solar_radiation: Number(solar) } : {}),
            }
          : {}),
        ...(ndvi ? { ndvi: Number(ndvi) } : {}),
      };
      const result = await api.ml.predict(body);
      setStatus({ kind: "ok", result });
      if (typeof window !== "undefined") {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      }
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Gagal memanggil ML service.",
      });
    }
  }

  return (
    <div className="container py-8 md:py-12">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <header className="mb-10">
          <div className="eyebrow">
            <Sparkles className="h-3 w-3" />
            Prediksi Panen
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Isi kondisi lahan, biarkan AI menjawab
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Formulir di bawah dikirim ke model XGBoost untuk menghitung
            perkiraan hari panen, hasil per hektar, total produksi, dan
            rekomendasi tindakan.
          </p>
        </header>

        <form onSubmit={submit} className="space-y-6">
          {/* Step 1 — crop + land */}
          <FormCard
            step={1}
            title="Komoditas dan lahan"
            description="Pilih jenis tanaman dan luas lahan Anda."
          >
            <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {CROPS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pickCrop(c.id)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all",
                    cropType === c.id
                      ? "border-primary bg-primary-soft shadow-card"
                      : "border-border bg-surface hover:border-primary/30 hover:bg-primary-soft/40",
                  )}
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {c.subtitle}
                  </span>
                  <span
                    className={cn(
                      "text-lg font-semibold tracking-tight",
                      cropType === c.id ? "text-primary" : "text-foreground",
                    )}
                  >
                    {c.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="land-area">
                  Luas lahan <span className="text-muted-foreground">(hektar)</span>
                </Label>
                <Input
                  id="land-area"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={landAreaHa}
                  onChange={(e) => setLandAreaHa(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="variety">
                  Varietas{" "}
                  <span className="text-muted-foreground">({varietyOptions.length} opsi)</span>
                </Label>
                <select
                  id="variety"
                  value={variety}
                  onChange={(e) => setVariety(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                >
                  {varietyOptions.map((v) => (
                    <option key={v} value={v}>
                      {v}
                      {v === "Lokal" ? " - varietas lokal" : " - unggul"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </FormCard>

          {/* Step 2 — pests */}
          <FormCard
            step={2}
            title="Tekanan hama"
            description="Seberapa parah serangan hama saat ini?"
          >
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {PESTS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPestPressure(p.value)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all",
                    pestPressure === p.value
                      ? "border-primary bg-primary-soft shadow-card"
                      : "border-border bg-surface hover:border-primary/30 hover:bg-primary-soft/40",
                  )}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {p.value.toFixed(1)}
                  </span>
                  <span
                    className={cn(
                      "text-base font-semibold tracking-tight",
                      pestPressure === p.value ? "text-primary" : "text-foreground",
                    )}
                  >
                    {p.label}
                  </span>
                  <span className="text-xs leading-snug text-muted-foreground">
                    {p.hint}
                  </span>
                </button>
              ))}
            </div>
          </FormCard>

          {/* Step 3 — climate */}
          <FormCard
            step={3}
            title="Sumber iklim dan vegetasi"
            description="Bagaimana kami mendapatkan data cuaca?"
          >
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "default", label: "Asumsi default" },
                  { id: "gps", label: "GPS - NASA POWER" },
                  { id: "manual", label: "Manual" },
                ] as Array<{ id: ClimateMode; label: string }>
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setClimateMode(m.id)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition-all",
                    climateMode === m.id
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-surface text-foreground hover:border-primary/30",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {climateMode === "default" && (
              <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                Tanpa data tambahan, model memakai asumsi tropis Jawa Barat -
                curah hujan 150 mm, suhu 27 C, radiasi 200 W/m. Keyakinan akan
                lebih rendah dibanding mode lain.
              </div>
            )}

            {climateMode === "gps" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lat">Lintang (lat)</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="-6.95"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lon">Bujur (lon)</Label>
                  <Input
                    id="lon"
                    type="number"
                    step="any"
                    value={lon}
                    onChange={(e) => setLon(e.target.value)}
                    placeholder="107.55"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={useGeolocation}
                  className="sm:col-span-2"
                >
                  <MapPin className="h-4 w-4" />
                  Gunakan lokasi peramban
                </Button>
              </div>
            )}

            {climateMode === "manual" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="rain">
                    Curah hujan{" "}
                    <span className="text-muted-foreground">(mm/minggu)</span>
                  </Label>
                  <Input
                    id="rain"
                    type="number"
                    min={0}
                    step={1}
                    value={rainfall}
                    onChange={(e) => setRainfall(e.target.value)}
                    placeholder="150"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temp">
                    Suhu rata-rata <span className="text-muted-foreground">(C)</span>
                  </Label>
                  <Input
                    id="temp"
                    type="number"
                    step={0.1}
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="27.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="solar">
                    Radiasi <span className="text-muted-foreground">(W/m)</span>
                  </Label>
                  <Input
                    id="solar"
                    type="number"
                    min={0}
                    step={1}
                    value={solar}
                    onChange={(e) => setSolar(e.target.value)}
                    placeholder="200"
                  />
                </div>
              </div>
            )}

            <div className="mt-5 space-y-2">
              <Label htmlFor="ndvi">
                NDVI manual <span className="text-muted-foreground">(opsional, 0-1)</span>
              </Label>
              <Input
                id="ndvi"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={ndvi}
                onChange={(e) => setNdvi(e.target.value)}
                placeholder="0.65"
              />
              <p className="text-xs text-muted-foreground">
                Kosongkan untuk memakai estimasi GEE atau asumsi default.
              </p>
            </div>
          </FormCard>

          {/* Submit */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card">
            <p className="max-w-md text-xs text-muted-foreground">
              Pengiriman akan memanggil POST /api/predict via Express -
              ml_service. Hasil dicatat ke data/predictions.jsonl.
            </p>
            <Button type="submit" size="lg" disabled={status.kind === "loading"}>
              {status.kind === "loading" ? "Menghitung..." : "Kirim ke Model"}
            </Button>
          </div>
        </form>

        {/* Result */}
        <div className="mt-10 space-y-6">
          {status.kind === "loading" && (
            <SkeletonLoader label="Memanggil ML service..." />
          )}

          {status.kind === "error" && (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/8 p-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-destructive">
                  Gagal memprediksi
                </div>
                <p className="mt-0.5 text-sm text-foreground">{status.message}</p>
              </div>
            </div>
          )}

          {status.kind === "ok" && (
            <>
              <ResultCard
                result={status.result}
                cropType={cropType}
                landAreaHa={Number(landAreaHa)}
              />
              <FeedbackForm predictionLogId={status.result.prediction_log_id} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FormCard({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-surface p-6 shadow-card md:p-8">
      <header className="mb-5 flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
          {step}
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}
