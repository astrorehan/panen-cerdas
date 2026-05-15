import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowRight, Bell, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AlertPage() {
  const list = await api.predictions.list().catch(() => null);
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

  const flagged = list.items
    .filter((it) => it.status === "waspada" || it.status === "defisit")
    .sort((a, b) => a.surplus_pct - b.surplus_pct);

  const counts = {
    defisit: list.items.filter((it) => it.status === "defisit").length,
    waspada: list.items.filter((it) => it.status === "waspada").length,
    aman: list.items.filter(
      (it) => it.status === "surplus" || it.status === "cukup",
    ).length,
  };

  return (
    <div className="container space-y-8 py-8 md:py-12">
      {/* Header */}
      <header>
        <div className="eyebrow">
          <Bell className="h-3 w-3" />
          Alert Pangan
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Kecamatan rawan untuk diintervensi
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Lembar ini menyaring prediksi {list.commodity} {list.season} di{" "}
          {list.province} dan mengangkat kecamatan berstatus waspada dan
          defisit - sesuai ambang surplus 10%. Diurutkan dari yang paling
          defisit di atas.
        </p>
      </header>

      {/* Stats */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Stat icon={AlertCircle} label="Defisit" value={counts.defisit} tone="destructive" />
        <Stat icon={AlertTriangle} label="Waspada" value={counts.waspada} tone="amber" />
        <Stat icon={CheckCircle2} label="Surplus / Cukup" value={counts.aman} tone="primary" />
      </section>

      {flagged.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="mt-4 text-lg font-semibold tracking-tight">
            Tidak ada kecamatan rawan untuk pekan ini.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Semua wilayah berada di atas ambang aman.
          </p>
        </Card>
      ) : (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              Daftar Intervensi
            </h2>
            <span className="text-xs text-muted-foreground">
              {flagged.length} kecamatan
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
                    Kec. {item.kecamatan} - Kab. {item.kabupaten}
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
                  href={`/pemerintah/analisis?id=${item.id}`}
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
          Lembar ini dimaksudkan untuk menjadi pintu kerja harian pengambil
          keputusan - daftar pendek, terurut, dengan jalan pintas ke detail
          kecamatan. Versi berikutnya akan menambahkan kanal notifikasi
          (email + WhatsApp Bot) saat status berubah.
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
}: {
  icon: typeof AlertCircle;
  label: string;
  value: number;
  tone: "destructive" | "amber" | "primary";
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
          <span className="text-xs text-muted-foreground">kecamatan</span>
        </div>
      </div>
    </Card>
  );
}
