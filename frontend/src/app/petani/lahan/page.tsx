import Link from "next/link";
import { ArrowRight, Layers, MapPin, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CropType } from "@/types";

type LahanStatus = "tumbuh" | "panen-segera" | "kosong";

const LAHAN: Array<{
  id: string;
  nama: string;
  lokasi: string;
  luas_ha: number;
  komoditas: CropType | null;
  varietas: string | null;
  status: LahanStatus;
  catatan: string;
}> = [
  {
    id: "L01",
    nama: "Petak Utara",
    lokasi: "Cikajang, Bandung",
    luas_ha: 1.5,
    komoditas: "padi",
    varietas: "Ciherang",
    status: "tumbuh",
    catatan: "Tanam 24 Feb 2026, perkiraan panen awal Juni.",
  },
  {
    id: "L02",
    nama: "Petak Tepi Sungai",
    lokasi: "Cikajang, Bandung",
    luas_ha: 0.6,
    komoditas: "jagung",
    varietas: "NK7328",
    status: "panen-segera",
    catatan: "Sudah 92 hari, NDVI menurun - siap dipanen pekan depan.",
  },
  {
    id: "L03",
    nama: "Petak Belakang Rumah",
    lokasi: "Cikajang, Bandung",
    luas_ha: 0.3,
    komoditas: null,
    varietas: null,
    status: "kosong",
    catatan: "Belum ditanam musim ini. Lihat /prediksi untuk simulasi.",
  },
];

const STATUS_STYLE: Record<LahanStatus, { label: string; chip: string }> = {
  tumbuh: { label: "Sedang Tumbuh", chip: "bg-primary-soft text-primary" },
  "panen-segera": { label: "Panen Segera", chip: "bg-amber/15 text-amber" },
  kosong: { label: "Kosong", chip: "bg-muted text-muted-foreground" },
};

export default function LahanPage() {
  const totalHa = LAHAN.reduce((acc, l) => acc + l.luas_ha, 0);
  const aktif = LAHAN.filter((l) => l.status !== "kosong").length;

  return (
    <div className="container space-y-8 py-8 md:py-12">
      <header>
        <div className="eyebrow">
          <Layers className="h-3 w-3" />
          Lahan Saya
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Catatan lahan yang Anda kelola
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Setiap petak terdaftar memiliki komoditas, luas, status, dan
          catatan terakhir. Data ini akan tersinkron dengan pengiriman
          formulir prediksi.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total Lahan" value={`${LAHAN.length}`} unit="petak" />
        <StatCard label="Total Luas" value={totalHa.toFixed(2)} unit="hektar" />
        <StatCard label="Aktif Bertanam" value={`${aktif}`} unit="petak" accent />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Daftar petak</h2>
          <span className="text-xs text-muted-foreground">
            {LAHAN.length} lahan
          </span>
        </div>
        <div className="grid gap-3">
          {LAHAN.map((l) => {
            const s = STATUS_STYLE[l.status];
            return (
              <article
                key={l.id}
                className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card"
              >
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      Lahan #{l.id} - {l.lokasi}
                    </div>
                    <h3 className="mt-1.5 text-xl font-semibold tracking-tight">
                      {l.nama}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${s.chip}`}
                  >
                    <Sprout className="h-3 w-3" />
                    {s.label}
                  </span>
                </header>
                <div className="grid grid-cols-3 divide-x divide-border">
                  <Cell label="Komoditas" value={l.komoditas ?? "-"} />
                  <Cell label="Varietas" value={l.varietas ?? "-"} />
                  <Cell label="Luas" value={`${l.luas_ha.toFixed(2)} ha`} />
                </div>
                <p className="border-t border-border bg-muted/30 px-5 py-3.5 text-sm leading-relaxed text-muted-foreground">
                  {l.catatan}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-muted/40 p-5">
        <p className="max-w-md text-sm text-muted-foreground">
          Lahan baru akan otomatis tercatat setelah simulasi prediksi pertama
          dikirim.
        </p>
        <Button asChild>
          <Link href="/petani/prediksi">
            Simulasi lahan baru
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>
    </div>
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
    <Card
      className={`p-5 ${accent ? "border-primary/25 bg-gradient-to-br from-primary to-primary-deep text-primary-foreground" : ""}`}
    >
      <div
        className={`text-xs font-medium uppercase tracking-wider ${accent ? "text-primary-foreground/80" : "text-muted-foreground"}`}
      >
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tracking-tight">{value}</span>
        <span
          className={`text-sm ${accent ? "text-primary-foreground/80" : "text-muted-foreground"}`}
        >
          {unit}
        </span>
      </div>
    </Card>
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
