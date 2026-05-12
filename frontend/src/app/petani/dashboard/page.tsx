import Link from "next/link";

const QUICK_LINKS = [
  {
    href: "/petani/prediksi",
    numeral: "II",
    title: "Mulai Prediksi",
    blurb:
      "Isi kondisi lahan dan terima prediksi panen + rekomendasi tindakan dari model ML.",
    cta: "Buka formulir →",
  },
  {
    href: "/petani/lahan",
    numeral: "III",
    title: "Lahan Saya",
    blurb:
      "Catatan lahan yang sudah didaftarkan, status tanam, dan riwayat prediksi per lahan.",
    cta: "Lihat lahan →",
  },
  {
    href: "/petani/harga",
    numeral: "IV",
    title: "Harga Komoditas",
    blurb:
      "Harga pasaran mingguan untuk padi, jagung, kedelai, dan singkong dari pasar acuan.",
    cta: "Lihat harga →",
  },
  {
    href: "/petani/cuaca",
    numeral: "V",
    title: "Prakiraan Cuaca",
    blurb:
      "Cuaca harian 7 hari ke depan untuk merencanakan irigasi, pemupukan, dan panen.",
    cta: "Lihat cuaca →",
  },
];

export default function PetaniDashboardPage() {
  return (
    <div className="space-y-10">
      <section>
        <div className="meta-row">
          <span className="h-px w-12 bg-ink" />
          <span>§ Pasal I — Dasbor Petani</span>
        </div>
        <h1
          className="mt-5 font-display leading-[0.9] text-ink"
          style={{
            fontSize: "clamp(2.4rem, 5vw + 0.4rem, 5rem)",
            fontVariationSettings: '"opsz" 144, "SOFT" 30',
          }}
        >
          Selamat datang,
          <br />
          <span className="italic text-moss">mari rencanakan panen.</span>
        </h1>
        <p className="mt-5 max-w-prose font-display text-[17px] leading-relaxed text-ink-soft">
          Dasbor ini menyatukan formulir prediksi, daftar lahan, harga
          komoditas, dan prakiraan cuaca dalam satu lembar — semuanya
          ditujukan untuk membantu keputusan tanam-panen Anda.
        </p>
      </section>

      <div className="rule-h" />

      <section>
        <div className="meta-row">
          <span>§ I.1 — Pintasan</span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {QUICK_LINKS.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="group relative flex flex-col gap-3 border border-ink/20 bg-paper-deep/40 p-6 transition-all hover:border-ink hover:bg-paper-deep"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
                  Pasal {q.numeral}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint transition-colors group-hover:text-ink">
                  {q.cta}
                </span>
              </div>
              <h2
                className="font-display text-2xl italic text-ink"
                style={{ fontVariationSettings: '"opsz" 48, "SOFT" 40' }}
              >
                {q.title}
              </h2>
              <p className="max-w-prose font-display text-[14px] leading-relaxed text-ink-soft">
                {q.blurb}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border border-ink/15 bg-paper-deep/40 px-6 py-5">
        <div className="meta-row">
          <span>§ Catatan Redaksi</span>
        </div>
        <p className="mt-3 max-w-prose font-display text-[14px] leading-relaxed text-ink-soft">
          Lahan, harga, dan cuaca masih memakai data contoh (mock) untuk
          MVP UNITY #14. Phase 7 akan menyambungkan NASA POWER (cuaca),
          GEE NDVI (satelit), dan model XGBoost terlatih ulang dari
          umpan balik di <code className="rounded-sm bg-paper-edge px-1 py-0.5 font-mono text-[12px] text-ink">data/feedback.jsonl</code>.
        </p>
      </section>
    </div>
  );
}
