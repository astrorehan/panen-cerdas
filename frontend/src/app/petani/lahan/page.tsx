import Link from "next/link";
import { Button } from "@/components/ui/button";

type LahanStatus = "tumbuh" | "panen-segera" | "kosong";

const LAHAN: Array<{
  id: string;
  nama: string;
  lokasi: string;
  luas_ha: number;
  komoditas: "padi" | "jagung" | "kedelai" | "singkong" | null;
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
    catatan: "Sudah 92 hari, NDVI menurun — siap dipanen pekan depan.",
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

const STATUS_STYLE: Record<LahanStatus, { label: string; dot: string; bg: string }> = {
  tumbuh: { label: "Sedang Tumbuh", dot: "bg-[#87A07D]", bg: "bg-[#87A07D]/15" },
  "panen-segera": {
    label: "Panen Segera",
    dot: "bg-[#D4933A]",
    bg: "bg-[#D4933A]/15",
  },
  kosong: { label: "Kosong", dot: "bg-ink/40", bg: "bg-paper-edge" },
};

export default function LahanPage() {
  const totalHa = LAHAN.reduce((acc, l) => acc + l.luas_ha, 0);
  const aktif = LAHAN.filter((l) => l.status !== "kosong").length;

  return (
    <div className="space-y-10">
      <section>
        <div className="meta-row">
          <span className="h-px w-12 bg-ink" />
          <span>§ Pasal III — Lahan Saya</span>
        </div>
        <h1
          className="mt-5 font-display leading-[0.9] text-ink"
          style={{
            fontSize: "clamp(2.2rem, 5vw + 0.4rem, 4.5rem)",
            fontVariationSettings: '"opsz" 144, "SOFT" 30',
          }}
        >
          Catatan lahan
          <br />
          <span className="italic text-moss">yang Anda kelola.</span>
        </h1>
        <p className="mt-5 max-w-prose font-display text-[16px] leading-relaxed text-ink-soft">
          Setiap petak terdaftar memiliki komoditas, luas, status, dan
          catatan terakhir. Data ini akan tersinkron dengan pengiriman
          formulir prediksi pada Phase 7.
        </p>
      </section>

      <section className="grid divide-y divide-rule sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Stat label="Total Lahan" value={`${LAHAN.length}`} unit="petak" />
        <Stat label="Total Luas" value={totalHa.toFixed(2)} unit="hektar" />
        <Stat label="Aktif Bertanam" value={`${aktif}`} unit="petak" accent />
      </section>

      <section className="space-y-4">
        <div className="meta-row">
          <span>§ III.1 — Daftar Petak</span>
        </div>
        <div className="grid gap-4">
          {LAHAN.map((l) => {
            const s = STATUS_STYLE[l.status];
            return (
              <article
                key={l.id}
                className="border border-ink/20 bg-paper-deep/40"
              >
                <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule px-5 py-3">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
                      Lahan № {l.id} — {l.lokasi}
                    </div>
                    <h2
                      className="mt-1 font-display text-xl italic text-ink"
                      style={{ fontVariationSettings: '"opsz" 36, "SOFT" 50' }}
                    >
                      {l.nama}
                    </h2>
                  </div>
                  <div
                    className={`flex items-center gap-2 border border-ink/15 px-3 py-1 ${s.bg}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                    <span className="font-mono text-[10px] uppercase tracking-smallcaps text-ink">
                      {s.label}
                    </span>
                  </div>
                </header>
                <div className="grid divide-y divide-rule sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  <Cell
                    label="Komoditas"
                    value={l.komoditas ? l.komoditas : "—"}
                  />
                  <Cell
                    label="Varietas"
                    value={l.varietas ?? "—"}
                  />
                  <Cell label="Luas" value={`${l.luas_ha.toFixed(2)} ha`} />
                </div>
                <p className="border-t border-rule px-5 py-3 font-display text-[14px] italic leading-relaxed text-ink-soft">
                  {l.catatan}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6">
        <p className="max-w-prose font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
          Lahan baru akan otomatis tercatat setelah simulasi prediksi pertama
          dikirim — fitur final Phase 7.
        </p>
        <Button asChild>
          <Link href="/petani/prediksi">Simulasi lahan baru →</Link>
        </Button>
      </section>
    </div>
  );
}

function Stat({
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
    <div className={`px-5 py-5 ${accent ? "bg-ink text-paper" : ""}`}>
      <div
        className={`font-mono text-[10px] uppercase tracking-smallcaps ${
          accent ? "text-paper/60" : "text-ink-faint"
        }`}
      >
        {label}
      </div>
      <div
        className={`mt-1 font-display leading-none ${accent ? "text-paper" : "text-ink"}`}
        style={{
          fontSize: "clamp(1.8rem, 2.5vw + 0.6rem, 2.6rem)",
          fontVariationSettings: '"opsz" 96, "SOFT" 30',
        }}
      >
        {value}
      </div>
      <div
        className={`mt-1 font-mono text-[10px] uppercase tracking-smallcaps ${
          accent ? "text-paper/60" : "text-ink-faint"
        }`}
      >
        {unit}
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-3">
      <div className="font-mono text-[9px] uppercase tracking-smallcaps text-ink-faint">
        {label}
      </div>
      <div
        className="mt-1 font-display text-base italic text-ink"
        style={{ fontVariationSettings: '"opsz" 36, "SOFT" 40' }}
      >
        {value}
      </div>
    </div>
  );
}
