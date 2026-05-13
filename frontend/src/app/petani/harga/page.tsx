import { Coins, TrendingDown, TrendingUp } from "lucide-react";

type Komoditas = "padi" | "jagung" | "kedelai" | "singkong";

const HARGA: Array<{
  komoditas: Komoditas;
  label: string;
  unit_local: string;
  price_idr_per_kg: number;
  delta_pct: number;
  pasar: string;
  catatan: string;
}> = [
  {
    komoditas: "padi",
    label: "Padi (GKP)",
    unit_local: "Gabah Kering Panen",
    price_idr_per_kg: 5800,
    delta_pct: 2.1,
    pasar: "Bulog Jawa Barat",
    catatan: "Tren naik tipis menjelang masa panen utama.",
  },
  {
    komoditas: "jagung",
    label: "Jagung Pipilan",
    unit_local: "Kadar air 14%",
    price_idr_per_kg: 5300,
    delta_pct: -1.4,
    pasar: "Pasar Induk Cipinang",
    catatan: "Pasokan impor melemahkan harga lokal pekan ini.",
  },
  {
    komoditas: "kedelai",
    label: "Kedelai Lokal",
    unit_local: "Kualitas A",
    price_idr_per_kg: 11200,
    delta_pct: 0.3,
    pasar: "Asosiasi Tahu Tempe Bandung",
    catatan: "Permintaan stabil dari produsen tahu rumahan.",
  },
  {
    komoditas: "singkong",
    label: "Singkong Segar",
    unit_local: "Umur 8 bulan ke atas",
    price_idr_per_kg: 1850,
    delta_pct: 4.7,
    pasar: "Pengepul Garut",
    catatan: "Naik signifikan karena permintaan tepung tapioka industri.",
  },
];

function formatIdr(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

export default function HargaPage() {
  return (
    <div className="container space-y-8 py-8 md:py-12">
      <header>
        <div className="eyebrow">
          <Coins className="h-3 w-3" />
          Harga Komoditas
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Harga pasaran untuk pekan ini
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Harga acuan mingguan dari pasar utama. Bandingkan dengan harga jual
          lokal Anda untuk memutuskan kapan melepas hasil panen.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        {HARGA.map((h) => {
          const up = h.delta_pct >= 0;
          return (
            <article
              key={h.komoditas}
              className="rounded-2xl border border-border bg-surface p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">
                    {h.label}
                  </h3>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {h.unit_local}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    up
                      ? "bg-primary-soft text-primary"
                      : "bg-destructive/12 text-destructive"
                  }`}
                >
                  {up ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {up ? "+" : ""}
                  {h.delta_pct.toFixed(1)}%
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-xs text-muted-foreground">Rp</span>
                <span className="text-4xl font-semibold tracking-tight">
                  {formatIdr(h.price_idr_per_kg)}
                </span>
                <span className="text-sm text-muted-foreground">/kg</span>
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Pasar acuan
                </div>
                <div className="mt-1 text-sm font-medium">{h.pasar}</div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {h.catatan}
                </p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-2xl border border-border bg-muted/40 p-5">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Catatan sumber
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Data harga di atas adalah contoh statis untuk MVP. Versi berikutnya
          akan menyambungkan API Panel Harga Pangan Nasional (PIHPS) dan
          Bulog untuk pembaruan harian otomatis.
        </p>
      </section>
    </div>
  );
}
