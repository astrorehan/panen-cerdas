"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  History,
  MapPin,
  Sprout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkeletonLoader } from "@/components/skeleton-loader";
import { FeedbackForm } from "@/components/feedback-form";
import { api } from "@/lib/api";
import { getPetaniId } from "@/lib/auth";
import type {
  PredictionHistoryItem,
  PredictionHistoryResponse,
  RiskLevel,
} from "@/types";

const RISK_STYLE: Record<RiskLevel, { label: string; chip: string }> = {
  low:    { label: "Risiko Rendah", chip: "bg-primary-soft text-primary" },
  medium: { label: "Risiko Sedang", chip: "bg-amber/15 text-amber" },
  high:   { label: "Risiko Tinggi", chip: "bg-destructive/10 text-destructive" },
};

function formatCrop(c: string | null | undefined): string {
  if (!c) return "-";
  return c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day:   "2-digit",
      month: "short",
      year:  "numeric",
    });
  } catch {
    return iso;
  }
}

function estimatedHarvestDate(createdIso: string, days: number): string {
  try {
    const d = new Date(createdIso);
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString("id-ID", {
      day:   "2-digit",
      month: "short",
      year:  "numeric",
    });
  } catch {
    return "-";
  }
}

export default function RiwayatPrediksiPage() {
  const [data, setData] = useState<PredictionHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openFeedbackId, setOpenFeedbackId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const petaniId = getPetaniId();
    api.predictions
      .history(petaniId, undefined, 100)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err: Error) => {
        setError(err.message || "Gagal memuat riwayat prediksi");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const items = data?.items ?? [];
  const totalFeedback = items.filter((i) => i.feedback_given).length;
  const totalPending  = items.length - totalFeedback;

  return (
    <div className="container space-y-8 py-8 md:py-12">
      <header>
        <div className="eyebrow">
          <History className="h-3 w-3" />
          Riwayat Prediksi
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Prediksi Anda dan kapan harus beri feedback
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Setiap prediksi tersimpan otomatis. Beri umpan balik realisasi panen
          <strong> setelah panen aktual</strong> agar model belajar dari data
          lapangan Anda.
        </p>
      </header>

      {loading && <SkeletonLoader label="Memuat riwayat prediksi..." />}

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/8 p-5 text-sm text-destructive">
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Total Prediksi"   value={`${items.length}`} unit="entry" />
            <StatCard label="Sudah Feedback"   value={`${totalFeedback}`} unit="entry" />
            <StatCard label="Menunggu Feedback" value={`${totalPending}`} unit="entry" accent />
          </section>

          {items.length === 0 ? (
            <EmptyState />
          ) : (
            <section className="grid gap-3">
              {items.map((item) => (
                <PredictionCard
                  key={item.id}
                  item={item}
                  open={openFeedbackId === item.id}
                  onToggle={() =>
                    setOpenFeedbackId(openFeedbackId === item.id ? null : item.id)
                  }
                  onSubmitted={() => {
                    setOpenFeedbackId(null);
                    load();
                  }}
                />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function PredictionCard({
  item,
  open,
  onToggle,
  onSubmitted,
}: {
  item: PredictionHistoryItem;
  open: boolean;
  onToggle: () => void;
  onSubmitted: () => void;
}) {
  const risk = RISK_STYLE[item.pred_risk_level];
  const harvestDate = estimatedHarvestDate(item.created_at, item.pred_harvest_days);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            {formatDate(item.created_at)}
            <span className="text-muted-foreground/60">·</span>
            Prediksi #{item.id}
          </div>
          <h3 className="mt-1.5 flex items-center gap-2 text-xl font-semibold tracking-tight">
            {formatCrop(item.crop_type)}
            {item.lahan_id && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {item.lahan_id}
              </span>
            )}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Estimasi panen <strong>{harvestDate}</strong>
            {" "}({item.pred_harvest_days} hari setelah tanam) · luas{" "}
            {item.land_area_ha.toFixed(2)} ha
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${risk.chip}`}
        >
          <Sprout className="h-3 w-3" />
          {risk.label}
        </span>
      </header>

      <div className="grid grid-cols-2 divide-x divide-border md:grid-cols-4">
        <Cell label="Yield/ha" value={`${item.pred_yield_ton_per_ha.toFixed(2)} t/ha`} />
        <Cell
          label="Total"
          value={`${(item.pred_yield_ton_per_ha * item.land_area_ha).toFixed(2)} ton`}
        />
        <Cell label="Confidence" value={`${(item.confidence * 100).toFixed(0)}%`} />
        <Cell label="Sumber" value={item.model_source === "ml_model" ? "ML model" : "Fallback"} />
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-3">
        {item.feedback_given ? (
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <CheckCircle2 className="h-4 w-4" />
            Feedback realisasi panen sudah dikirim
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Sudah panen? Bantu kalibrasi model dengan kirim realisasi panen Anda.
            </p>
            <Button variant={open ? "outline" : "default"} size="sm" onClick={onToggle}>
              {open ? "Tutup form" : "Beri Feedback Panen"}
            </Button>
          </>
        )}
      </footer>

      {open && !item.feedback_given && (
        <div className="border-t border-border p-5">
          <FeedbackForm
            predictionLogId={item.id}
            landAreaHa={item.land_area_ha}
            onSuccess={onSubmitted}
          />
        </div>
      )}
    </article>
  );
}

function StatCard({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-card ${
        accent
          ? "border-primary/25 bg-gradient-to-br from-primary to-primary-deep text-primary-foreground"
          : "border-border bg-surface"
      }`}
    >
      <div
        className={`text-xs font-medium uppercase tracking-wider ${
          accent ? "text-primary-foreground/80" : "text-muted-foreground"
        }`}
      >
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tracking-tight">{value}</span>
        <span
          className={`text-sm ${
            accent ? "text-primary-foreground/80" : "text-muted-foreground"
          }`}
        >
          {unit}
        </span>
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-4">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-muted/30 p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <History className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight">
        Belum ada prediksi
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Riwayat ini akan terisi otomatis tiap kali Anda mengirim formulir
        prediksi panen.
      </p>
      <Button asChild className="mt-5">
        <Link href="/petani/prediksi">
          Buka formulir prediksi
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
