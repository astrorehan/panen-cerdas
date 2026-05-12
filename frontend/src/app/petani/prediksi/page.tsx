"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ResultCard } from "@/components/result-card";
import { FeedbackForm } from "@/components/feedback-form";
import { SkeletonLoader } from "@/components/skeleton-loader";
import { cn } from "@/lib/utils";
import type { CropType, PredictResponse } from "@/types";

const CROPS: Array<{ id: CropType; label: string; subtitle: string }> = [
  { id: "padi", label: "Padi", subtitle: "± 105 hari" },
  { id: "jagung", label: "Jagung", subtitle: "± 100 hari" },
  { id: "kedelai", label: "Kedelai", subtitle: "± 85 hari" },
  { id: "singkong", label: "Singkong", subtitle: "± 240 hari" },
];

// Aligned with IMPROVED_VARIETIES in ml_service/api/ml.py.
const VARIETIES: Record<CropType, string[]> = {
  padi: ["Lokal", "IR64", "Ciherang", "Inpari32", "Memberamo"],
  jagung: ["Lokal", "NK7328", "Pioneer36", "Bisi18"],
  kedelai: ["Lokal", "Anjasmoro", "Dena1", "Grobogan"],
  singkong: ["Lokal", "UJ3", "Adira1", "Malang6"],
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

  // Keep variety valid when crop changes
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
    <div className="space-y-10">
      {/* Hero */}
      <section>
        <div className="meta-row">
          <span className="h-px w-12 bg-ink" />
          <span>§ Pasal II — Prediksi Panen per Lahan</span>
        </div>
        <h1
          className="mt-5 font-display leading-[0.9] text-ink"
          style={{
            fontSize: "clamp(2.2rem, 5vw + 0.4rem, 5rem)",
            fontVariationSettings: '"opsz" 144, "SOFT" 30',
          }}
        >
          Isi kondisi lahan,
          <br />
          <span className="italic text-moss">model menjawab.</span>
        </h1>
        <p className="mt-5 max-w-prose font-display text-[16px] leading-relaxed text-ink-soft">
          Formulir di bawah dikirim ke ML service untuk menghitung perkiraan
          hari ke panen, hasil per hektar, total produksi, dan rekomendasi
          tindakan. Hasil tersimpan agar dapat diumpan-balikkan setelah panen
          aktual.
        </p>
      </section>

      <div className="rule-h" />

      {/* Form */}
      <form onSubmit={submit} className="space-y-10">
        {/* §1 Komoditas + Lahan */}
        <Section
          numeral="II.1"
          eyebrow="Komoditas + Lahan"
          title="Pilih tanaman."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CROPS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pickCrop(c.id)}
                className={cn(
                  "flex flex-col items-start gap-1 border px-4 py-3 text-left transition-colors",
                  cropType === c.id
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/20 bg-paper hover:border-ink",
                )}
              >
                <span
                  className={cn(
                    "font-mono text-[9px] uppercase tracking-smallcaps",
                    cropType === c.id ? "text-paper/60" : "text-ink-faint",
                  )}
                >
                  {c.subtitle}
                </span>
                <span
                  className={cn(
                    "font-display text-xl italic",
                    cropType === c.id ? "text-paper" : "text-ink",
                  )}
                  style={{ fontVariationSettings: '"opsz" 48, "SOFT" 40' }}
                >
                  {c.label}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field
              label="Luas lahan"
              unit="hektar"
              inputProps={{
                type: "number",
                min: 0.01,
                step: 0.01,
                value: landAreaHa,
                onChange: (e) => setLandAreaHa(e.target.value),
                required: true,
              }}
            />
            <label className="flex flex-col gap-1.5">
              <span className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
                <span>Varietas</span>
                <span>{varietyOptions.length} opsi</span>
              </span>
              <select
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                className="border border-ink/20 bg-paper px-3 py-2 font-sans text-[14px] text-ink focus:border-ink focus:outline-none"
              >
                {varietyOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                    {v === "Lokal" ? " · varietas lokal" : " · unggul"}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Section>

        {/* §2 Hama */}
        <Section
          numeral="II.2"
          eyebrow="Tekanan Hama"
          title="Seberapa parah serangannya?"
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {PESTS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPestPressure(p.value)}
                className={cn(
                  "flex flex-col items-start gap-1 border px-4 py-3 text-left transition-colors",
                  pestPressure === p.value
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/20 bg-paper hover:border-ink",
                )}
              >
                <span
                  className={cn(
                    "font-mono text-[9px] uppercase tracking-smallcaps",
                    pestPressure === p.value
                      ? "text-paper/60"
                      : "text-ink-faint",
                  )}
                >
                  pest_pressure = {p.value.toFixed(1)}
                </span>
                <span
                  className={cn(
                    "font-display text-lg italic leading-tight",
                    pestPressure === p.value ? "text-paper" : "text-ink",
                  )}
                  style={{ fontVariationSettings: '"opsz" 36, "SOFT" 40' }}
                >
                  {p.label}
                </span>
                <span
                  className={cn(
                    "text-[12px] leading-snug",
                    pestPressure === p.value ? "text-paper/70" : "text-ink-soft",
                  )}
                >
                  {p.hint}
                </span>
              </button>
            ))}
          </div>
        </Section>

        {/* §3 Iklim */}
        <Section
          numeral="II.3"
          eyebrow="Sumber Iklim + Vegetasi"
          title="Bagaimana kami mendapatkan data cuaca?"
        >
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "default", label: "Asumsi Default" },
                { id: "gps", label: "GPS — Estimasi NASA POWER" },
                { id: "manual", label: "Manual — Saya Punya Data" },
              ] as Array<{ id: ClimateMode; label: string }>
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setClimateMode(m.id)}
                className={cn(
                  "border px-4 py-2 font-mono text-[10px] uppercase tracking-smallcaps transition-colors",
                  climateMode === m.id
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/20 bg-paper text-ink hover:border-ink",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {climateMode === "default" && (
            <p className="mt-4 max-w-prose border-l border-rule pl-4 font-display text-[14px] italic leading-relaxed text-ink-soft">
              Tanpa data tambahan, model memakai asumsi tropis Jawa Barat —
              curah hujan 150 mm, suhu 27 °C, radiasi 200 W/m². Keyakinan
              akan lebih rendah dibanding mode lain.
            </p>
          )}

          {climateMode === "gps" && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="Lintang (lat)"
                unit="°S"
                inputProps={{
                  type: "number",
                  step: "any",
                  value: lat,
                  onChange: (e) => setLat(e.target.value),
                  placeholder: "-6.95",
                }}
              />
              <Field
                label="Bujur (lon)"
                unit="°E"
                inputProps={{
                  type: "number",
                  step: "any",
                  value: lon,
                  onChange: (e) => setLon(e.target.value),
                  placeholder: "107.55",
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={useGeolocation}
                className="sm:col-span-2 self-start"
              >
                Gunakan lokasi peramban
              </Button>
            </div>
          )}

          {climateMode === "manual" && (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field
                label="Curah hujan"
                unit="mm / minggu"
                inputProps={{
                  type: "number",
                  min: 0,
                  step: 1,
                  value: rainfall,
                  onChange: (e) => setRainfall(e.target.value),
                  placeholder: "150",
                }}
              />
              <Field
                label="Suhu rata-rata"
                unit="°C"
                inputProps={{
                  type: "number",
                  step: 0.1,
                  value: temperature,
                  onChange: (e) => setTemperature(e.target.value),
                  placeholder: "27.0",
                }}
              />
              <Field
                label="Radiasi matahari"
                unit="W / m²"
                inputProps={{
                  type: "number",
                  min: 0,
                  step: 1,
                  value: solar,
                  onChange: (e) => setSolar(e.target.value),
                  placeholder: "200",
                }}
              />
            </div>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto]">
            <Field
              label="NDVI manual (opsional)"
              unit="0.0 — 1.0"
              inputProps={{
                type: "number",
                min: 0,
                max: 1,
                step: 0.01,
                value: ndvi,
                onChange: (e) => setNdvi(e.target.value),
                placeholder: "0.65",
              }}
            />
            <p className="self-end max-w-xs border-l border-rule pl-3 font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
              Kosongkan untuk memakai estimasi GEE / asumsi default.
            </p>
          </div>
        </Section>

        <div className="rule-h" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-prose font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
            Pengiriman akan memanggil POST /api/predict via Express → ml_service.
            Hasil dicatat ke data/predictions.jsonl.
          </p>
          <Button type="submit" size="lg" disabled={status.kind === "loading"}>
            {status.kind === "loading" ? "Menghitung..." : "Kirim ke Model"}
          </Button>
        </div>
      </form>

      {/* Result */}
      {status.kind === "loading" && (
        <SkeletonLoader label="Memanggil ML service..." />
      )}

      {status.kind === "error" && (
        <div className="border-l-4 border-[#A8442C] bg-[#A8442C]/10 px-5 py-4">
          <div className="font-mono text-[10px] uppercase tracking-smallcaps text-[#A8442C]">
            Gagal memprediksi
          </div>
          <p className="mt-1 font-display text-[15px] italic leading-snug text-ink">
            {status.message}
          </p>
        </div>
      )}

      {status.kind === "ok" && (
        <div className="space-y-6">
          <ResultCard
            result={status.result}
            cropType={cropType}
            landAreaHa={Number(landAreaHa)}
          />
          <FeedbackForm predictionLogId={status.result.prediction_log_id} />
        </div>
      )}
    </div>
  );
}

function Section({
  numeral,
  eyebrow,
  title,
  children,
}: {
  numeral: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="meta-row">
        <span>§ {numeral} — {eyebrow}</span>
      </div>
      <h2
        className="mt-2 font-display italic text-ink"
        style={{
          fontSize: "clamp(1.6rem, 2.4vw + 0.4rem, 2.4rem)",
          fontVariationSettings: '"opsz" 48, "SOFT" 40',
          lineHeight: 1.05,
        }}
      >
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  unit,
  inputProps,
}: {
  label: string;
  unit?: string;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
        <span>{label}</span>
        {unit && <span>{unit}</span>}
      </span>
      <input
        {...inputProps}
        className="border border-ink/20 bg-paper px-3 py-2 font-sans text-[14px] text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
      />
    </label>
  );
}
