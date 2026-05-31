"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, ArrowRight, Bell, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SkeletonLoader } from "@/components/skeleton-loader";
import { api, apiPath } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/utils";
import { getUserProvince } from "@/lib/auth";
import type { CropType, Province } from "@/types";
import { CustomSelect } from "@/components/ui/select-custom";

const COMMODITIES: Array<{ id: CropType; label: string }> = [
  { id: "padi",         label: "Padi" },
  { id: "jagung",       label: "Jagung" },
  { id: "kedelai",      label: "Kedelai" },
  { id: "ubi_jalar",    label: "Ubi Jalar" },
  { id: "ubi_kayu",     label: "Singkong" },
  { id: "cabe_besar",   label: "Cabe Besar" },
  { id: "cabe_rawit",   label: "Cabe Rawit" },
  { id: "bawang_merah", label: "Bawang Merah" },
  { id: "bawang_putih", label: "Bawang Putih" },
];

export default function AlertPage() {
  const [provinceKey, setProvinceKey] = useState<string>(() => getUserProvince());
  const [commodity, setCommodity]     = useState<CropType>("padi");

  const { data: provincesRes } = useApi(
    apiPath.regionsProvinces(),
    () => api.regions.provinces(),
  );

  const provinces = useMemo<Province[]>(
    () => [
      {
        id: "ALL",
        code: "00",
        name: "Indonesia (Nasional)",
        capital: "—",
        region: "Nasional",
        lat: -2.5,
        lon: 117.5,
      },
      ...(provincesRes?.items ?? []),
    ],
    [provincesRes],
  );
  const provinceOptions = useMemo(() => {
    return provinces.map((p) => ({
      value: p.id === "ALL" ? "ALL" : p.name,
      label: p.name + (p.region !== "Nasional" ? ` (${p.region})` : ""),
    }));
  }, [provinces]);

  const commodityOptions = useMemo(() => {
    return COMMODITIES.map((c) => ({
      value: c.id,
      label: c.label,
    }));
  }, []);
  const { data: list, loading } = useApi(
    apiPath.predictionsList(provinceKey, commodity),
    () => api.predictions.list(provinceKey, commodity),
  );

  const flagged = useMemo(
    () =>
      (list?.items ?? [])
        .filter((it) => it.status === "waspada" || it.status === "defisit")
        .sort((a, b) => a.surplus_pct - b.surplus_pct),
    [list],
  );

  const counts = useMemo(() => {
    const items = list?.items ?? [];
    return {
      defisit: items.filter((it) => it.status === "defisit").length,
      waspada: items.filter((it) => it.status === "waspada").length,
      aman: items.filter((it) => it.status === "surplus" || it.status === "cukup").length,
    };
  }, [list]);

  const isNational = provinceKey === "ALL";

  if (loading && !list) {
    return (
      <div className="container py-12">
        <SkeletonLoader label="Memuat alert pangan..." />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="container py-12">
        <div className="mx-auto max-w-md rounded-3xl border border-destructive/30 bg-destructive/8 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-xl font-semibold tracking-tight">
            Backend tidak terhubung
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Jalankan ml_service + Express gateway.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container space-y-8 py-8 md:py-12">
      {/* Header */}
      <header>
        <div className="eyebrow">
          <Bell className="h-3 w-3" />
          Alert Pangan
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Wilayah rawan untuk diintervensi
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Lembar ini menyaring prediksi komoditas <span className="font-semibold text-foreground">{list.commodity}</span> di{" "}
          <span className="font-semibold text-foreground">{list.province}</span> dan mengangkat daerah berstatus waspada dan
          defisit — sesuai ambang surplus 10%. Diurutkan dari yang paling
          defisit.
        </p>
      </header>

      {/* Filter bar */}
      <section className="grid gap-4 rounded-3xl border border-border bg-surface/40 p-4 shadow-card sm:grid-cols-2 backdrop-blur-sm">
        <CustomSelect
          id="province"
          label="Wilayah Pemantauan"
          value={provinceKey}
          onChange={(val) => setProvinceKey(val)}
          options={provinceOptions}
        />

        <CustomSelect
          id="commodity"
          label="Komoditas"
          value={commodity}
          onChange={(val) => setCommodity(val as CropType)}
          options={commodityOptions}
        />
      </section>

      {/* Stats */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Stat icon={AlertCircle} label="Defisit" value={counts.defisit} tone="destructive" isNational={isNational} />
        <Stat icon={AlertTriangle} label="Waspada" value={counts.waspada} tone="amber" isNational={isNational} />
        <Stat icon={CheckCircle2} label="Surplus / Cukup" value={counts.aman} tone="primary" isNational={isNational} />
      </section>

      {flagged.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="mt-4 text-lg font-semibold tracking-tight">
            Tidak ada wilayah rawan untuk komoditas ini.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Semua daerah berada di atas ambang aman.
          </p>
        </Card>
      ) : (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              Daftar Intervensi Prioritas
            </h2>
            <span className="text-xs text-muted-foreground">
              {flagged.length} {isNational ? "provinsi" : "kecamatan"}
            </span>
          </div>
          <div className="grid gap-3">
            {flagged.map((item, i) => (
              <article
                key={item.id}
                className="group relative grid grid-cols-[auto_1fr_auto] items-center gap-5 overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <div
                  className="absolute left-0 top-0 h-full w-1.5"
                  style={{ background: STATUS_COLOR[item.status] }}
                />
                <div className="ml-3 text-center">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Prioritas
                  </div>
                  <div className="text-2xl font-semibold tracking-tight">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {item.kecamatan ? `Kec. ${item.kecamatan} - ` : ""}Kab. {item.kabupaten}
                  </div>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight">
                    <span style={{ color: STATUS_COLOR[item.status] }}>
                      Status {STATUS_LABEL[item.status]}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      ({item.surplus_pct > 0 ? "+" : ""}
                      {item.surplus_pct.toFixed(1)}%)
                    </span>
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Prediksi {item.yield_pred_ton_per_ha.toFixed(2)} ton/ha -
                    Total {Math.round(item.produksi_pred_ton).toLocaleString("id-ID")} ton
                    dari {item.luas_panen_ha.toLocaleString("id-ID")} ha.
                  </p>
                </div>
                <Link
                  href={`/pemerintah/analisis?id=${item.id}&commodity=${commodity}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
                >
                  Analisis
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-muted/40 p-5">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Catatan Operasional
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Lembar EWS (Early Warning System) ini disesuaikan otomatis dengan wilayah penugasan instansi Anda secara default. Daftar pendek ini terurut dinamis untuk membantu penanganan kerawanan pangan lokal secara cepat.
        </p>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
  isNational,
}: {
  icon: typeof AlertCircle;
  label: string;
  value: number;
  tone: "destructive" | "amber" | "primary";
  isNational: boolean;
}) {
  const toneClasses = {
    destructive: "bg-destructive/12 text-destructive",
    amber: "bg-amber/15 text-amber",
    primary: "bg-primary-soft text-primary",
  } as const;
  return (
    <Card className="flex items-center gap-4 p-5">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${toneClasses[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold tracking-tight">{value}</span>
          <span className="text-xs text-muted-foreground">{isNational ? "provinsi" : "kecamatan"}</span>
        </div>
      </div>
    </Card>
  );
}
