import { api } from "@/lib/api";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AlertPage() {
  const list = await api.predictions.list().catch(() => null);
  if (!list) {
    return (
      <div className="border border-ink/20 bg-paper-deep p-10 text-center font-display italic text-ink">
        Backend tidak terhubung — jalankan ml_service + Express gateway.
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
    <div className="space-y-10">
      <section>
        <div className="meta-row">
          <span className="h-px w-12 bg-ink" />
          <span>§ Pasal IV — Lembar Peringatan</span>
        </div>
        <h1
          className="mt-5 font-display leading-[0.9] text-ink"
          style={{
            fontSize: "clamp(2.2rem, 5vw + 0.4rem, 4.5rem)",
            fontVariationSettings: '"opsz" 144, "SOFT" 30',
          }}
        >
          Kecamatan rawan
          <br />
          <span className="italic text-moss">untuk diintervensi.</span>
        </h1>
        <p className="mt-5 max-w-prose font-display text-[16px] leading-relaxed text-ink-soft">
          Lembar ini menyaring prediksi {list.commodity} {list.season} di{" "}
          {list.province} dan mengangkat kecamatan berstatus{" "}
          <em>waspada</em> dan <em>defisit</em> — sesuai ambang surplus
          ±10%. Urutkan dari yang paling defisit di atas.
        </p>
      </section>

      <section className="grid divide-y divide-rule sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Stat
          label="Defisit"
          value={`${counts.defisit}`}
          unit="kecamatan"
          color="#A8442C"
        />
        <Stat
          label="Waspada"
          value={`${counts.waspada}`}
          unit="kecamatan"
          color="#D4933A"
        />
        <Stat
          label="Surplus / Cukup"
          value={`${counts.aman}`}
          unit="kecamatan"
        />
      </section>

      {flagged.length === 0 ? (
        <section className="border border-ink/20 bg-paper-deep/40 px-6 py-8 text-center">
          <p className="font-display text-xl italic text-ink">
            Tidak ada kecamatan rawan untuk pekan ini.
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
            Semua wilayah berada di atas ambang aman.
          </p>
        </section>
      ) : (
        <section className="space-y-3">
          <div className="meta-row">
            <span>§ IV.1 — Daftar Intervensi</span>
          </div>
          <div className="grid gap-3">
            {flagged.map((item, i) => (
              <article
                key={item.id}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-5 border border-ink/15 bg-paper-deep/40 px-5 py-4"
                style={{
                  borderLeftColor: STATUS_COLOR[item.status],
                  borderLeftWidth: 6,
                }}
              >
                <div className="text-center">
                  <div className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
                    Prioritas
                  </div>
                  <div
                    className="font-display text-3xl italic leading-none text-ink"
                    style={{ fontVariationSettings: '"opsz" 72, "SOFT" 40' }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
                    Kec. {item.kecamatan} · Kab. {item.kabupaten}
                  </div>
                  <h2
                    className="mt-1 font-display text-xl italic text-ink"
                    style={{
                      color: STATUS_COLOR[item.status],
                      fontVariationSettings: '"opsz" 36, "SOFT" 50',
                    }}
                  >
                    Status {STATUS_LABEL[item.status]} ·{" "}
                    {item.surplus_pct > 0 ? "+" : ""}
                    {item.surplus_pct.toFixed(1)}%
                  </h2>
                  <p className="mt-1 max-w-prose font-display text-[13px] leading-relaxed text-ink-soft">
                    Prediksi {item.yield_pred_ton_per_ha.toFixed(2)} ton/ha ·
                    Total {Math.round(item.produksi_pred_ton).toLocaleString("id-ID")}{" "}
                    ton dari {item.luas_panen_ha.toLocaleString("id-ID")} ha.
                  </p>
                </div>
                <div className="text-right font-mono text-[10px] uppercase tracking-smallcaps">
                  <a
                    href={`/pemerintah/analisis?id=${item.id}`}
                    className="border border-ink/30 px-3 py-1.5 text-ink transition-colors hover:bg-ink hover:text-paper"
                  >
                    Lihat Analisis →
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="border border-ink/15 bg-paper-deep/40 px-6 py-5">
        <div className="meta-row">
          <span>§ Catatan Operasional</span>
        </div>
        <p className="mt-3 max-w-prose font-display text-[14px] leading-relaxed text-ink-soft">
          Lembar ini dimaksudkan untuk menjadi pintu kerja harian
          pengambil keputusan — daftar pendek, terurut, dengan jalan
          pintas ke detail kecamatan. Phase 7 akan menambahkan kanal
          notifikasi (email + WhatsApp Bot) saat status berubah.
        </p>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color?: string;
}) {
  return (
    <div className="px-5 py-5">
      <div className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
        {label}
      </div>
      <div
        className="mt-1 font-display leading-none"
        style={{
          color: color ?? undefined,
          fontSize: "clamp(1.8rem, 2.5vw + 0.6rem, 2.6rem)",
          fontVariationSettings: '"opsz" 96, "SOFT" 30',
        }}
      >
        {value}
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
        {unit}
      </div>
    </div>
  );
}
