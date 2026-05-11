import { SectionRule } from "@/components/section-rule";

export default function TentangPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <SectionRule
        numeral="04"
        eyebrow="Manifesto"
        title="Mengapa kami membangun ini"
        caption="UNITY Competition № 14 — UNY 2026 · Software Development"
      />

      {/* Lead */}
      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        <p className="border-l border-ink pl-5 font-mono text-[11px] uppercase tracking-smallcaps text-ink-faint">
          Pembuka
        </p>
        <p
          className="font-display text-2xl italic leading-snug text-ink"
          style={{ fontVariationSettings: '"opsz" 60, "SOFT" 50' }}
        >
          Data panen di Indonesia masih dikumpulkan dengan tangan — lambat, bias, dan rentan
          manipulasi. PanenCerdas mengukur panen <em>sebelum</em> panen menggunakan citra
          satelit yang sudah tersedia gratis, agar pemerintah dan petani tidak lagi
          bereaksi setelah harga jatuh.
        </p>
      </div>

      <div className="rule-h" />

      {/* Problem grid */}
      <section className="grid gap-10 md:grid-cols-3">
        <Issue
          numeral="i"
          title="Manual & terlambat"
          body="Penyuluh lapangan masih mencatat produksi pakai kertas. Pemerintah baru tahu surplus 4–6 bulan setelah panen — sudah terlambat."
        />
        <Issue
          numeral="ii"
          title="Level provinsi"
          body="Statistik resmi berhenti di provinsi. Petani di Garut atau Pangandaran tidak punya sinyal harga yang relevan untuk lahan mereka sendiri."
        />
        <Issue
          numeral="iii"
          title="Impor reaktif"
          body="Keputusan impor beras, jagung, kedelai diambil setelah harga sudah anjlok. Kerugian akumulatif: triliunan rupiah per tahun."
        />
      </section>

      <div className="rule-h" />

      {/* Method */}
      <section className="grid gap-8 md:grid-cols-[1fr_2fr]">
        <header>
          <div className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
            § Metodologi
          </div>
          <h3
            className="mt-2 font-display text-3xl italic leading-tight text-ink"
            style={{ fontVariationSettings: '"opsz" 72, "SOFT" 50' }}
          >
            Lima langkah, satu hipotesis
          </h3>
        </header>
        <ol className="space-y-5">
          <Step n={1} title="NDVI per kecamatan" body="Ekstraksi indeks vegetasi Sentinel-2 L2A bulanan via Google Earth Engine, dengan masking awan SCL." />
          <Step n={2} title="Cuaca terintegrasi" body="Curah hujan, suhu, kelembapan dari ERA5-Land — diagregasi ke level kecamatan." />
          <Step n={3} title="Lag features" body="NDVI T-3 / T-2 / T-1, curah hujan kumulatif growing season, lag yield tahun sebelumnya." />
          <Step n={4} title="XGBoost time-split" body="Training 2018-2022, test 2023-2024. Tidak ada random split — itu kebocoran data." />
          <Step n={5} title="Surplus / defisit" body="Yield prediksi × luas panen − konsumsi kabupaten = surplus atau defisit per wilayah." />
        </ol>
      </section>

      <div className="rule-h" />

      {/* Stack */}
      <section className="grid gap-6 md:grid-cols-2">
        <header>
          <div className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
            § Tech Stack
          </div>
          <h3
            className="mt-2 font-display text-3xl italic leading-tight text-ink"
            style={{ fontVariationSettings: '"opsz" 72, "SOFT" 50' }}
          >
            Bahan baku
          </h3>
        </header>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StackRow label="Frontend" value="Next.js 14 + Tailwind + react-leaflet + Recharts" />
          <StackRow label="Backend" value="FastAPI · Python 3.12 · Pydantic" />
          <StackRow label="ML" value="XGBoost · scikit-learn" />
          <StackRow label="Citra" value="Sentinel-2 L2A via Google Earth Engine" />
          <StackRow label="Cuaca" value="ERA5-Land · BMKG" />
          <StackRow label="Truth" value="BPS — Produksi padi 2018–2024" />
        </dl>
      </section>

      <div className="rule-h" />

      {/* Roadmap */}
      <section>
        <header>
          <div className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
            § Roadmap
          </div>
          <h3
            className="mt-2 font-display text-3xl italic leading-tight text-ink"
            style={{ fontVariationSettings: '"opsz" 72, "SOFT" 50' }}
          >
            Empat hari menuju UNITY
          </h3>
        </header>
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Day n="01" status="done" title="Foundation" body="Pivot Next.js + FastAPI, scaffold, dummy demo." />
          <Day n="02" status="now" title="Pipeline + Model" body="GEE NDVI · BMKG · BPS · XGBoost baseline." />
          <Day n="03" status="next" title="Bind & Polish" body="Real data ke peta + detail. Filter & ekspor PDF." />
          <Day n="04" status="next" title="Deploy + Pitch" body="Vercel + Railway. Demo video. Pitch deck." />
        </ul>
      </section>

      <div className="border-t border-ink pt-6 font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
        Tim PanenCerdas · 8°S · 107°E · 11 Mei 2026 · Edisi 01 dari 04
      </div>
    </div>
  );
}

function Issue({ numeral, title, body }: { numeral: string; title: string; body: string }) {
  return (
    <article className="relative pl-8">
      <span className="absolute left-0 top-1 font-display text-3xl italic text-saffron">
        {numeral}
      </span>
      <h4
        className="font-display text-xl italic leading-tight text-ink"
        style={{ fontVariationSettings: '"opsz" 36, "SOFT" 50' }}
      >
        {title}
      </h4>
      <p className="mt-2 font-display text-[15px] leading-relaxed text-ink-soft">{body}</p>
    </article>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="grid grid-cols-[auto_1fr] items-baseline gap-4">
      <span className="font-mono text-[11px] tracking-cap text-ink-faint">
        0{n}
      </span>
      <div>
        <h4
          className="font-display text-lg italic leading-tight text-ink"
          style={{ fontVariationSettings: '"opsz" 30, "SOFT" 50' }}
        >
          {title}
        </h4>
        <p className="mt-1 font-display text-[15px] leading-relaxed text-ink-soft">{body}</p>
      </div>
    </li>
  );
}

function StackRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-l border-rule pl-3">
      <dt className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
        {label}
      </dt>
      <dd className="font-display text-[15px] italic text-ink">{value}</dd>
    </div>
  );
}

function Day({
  n,
  title,
  body,
  status,
}: {
  n: string;
  title: string;
  body: string;
  status: "done" | "now" | "next";
}) {
  const dot =
    status === "done"
      ? "bg-moss"
      : status === "now"
        ? "bg-saffron"
        : "bg-rule";
  return (
    <article className="border border-ink/15 bg-paper-deep p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
          Day {n}
        </span>
        <span className={`h-2 w-2 rounded-full ${dot}`} />
      </div>
      <h4
        className="mt-2 font-display text-lg italic text-ink"
        style={{ fontVariationSettings: '"opsz" 30, "SOFT" 50' }}
      >
        {title}
      </h4>
      <p className="mt-1 font-display text-[13px] leading-snug text-ink-soft">{body}</p>
    </article>
  );
}
