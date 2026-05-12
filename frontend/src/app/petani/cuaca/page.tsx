type Cuaca = "cerah" | "berawan" | "hujan-ringan" | "hujan-lebat";

const FORECAST: Array<{
  hari: string;
  tanggal: string;
  cuaca: Cuaca;
  suhu_min: number;
  suhu_max: number;
  hujan_mm: number;
  radiasi_w_m2: number;
  catatan: string;
}> = [
  {
    hari: "Senin",
    tanggal: "12 Mei",
    cuaca: "cerah",
    suhu_min: 23,
    suhu_max: 31,
    hujan_mm: 0,
    radiasi_w_m2: 240,
    catatan: "Cocok untuk pemupukan pagi.",
  },
  {
    hari: "Selasa",
    tanggal: "13 Mei",
    cuaca: "berawan",
    suhu_min: 23,
    suhu_max: 29,
    hujan_mm: 2,
    radiasi_w_m2: 195,
    catatan: "Awan tebal, fotosintesis berkurang sedikit.",
  },
  {
    hari: "Rabu",
    tanggal: "14 Mei",
    cuaca: "hujan-ringan",
    suhu_min: 22,
    suhu_max: 27,
    hujan_mm: 12,
    radiasi_w_m2: 150,
    catatan: "Tunda pemupukan, hujan ringan sore hari.",
  },
  {
    hari: "Kamis",
    tanggal: "15 Mei",
    cuaca: "hujan-lebat",
    suhu_min: 22,
    suhu_max: 26,
    hujan_mm: 35,
    radiasi_w_m2: 110,
    catatan: "Periksa drainase, potensi genangan di petak rendah.",
  },
  {
    hari: "Jumat",
    tanggal: "16 Mei",
    cuaca: "hujan-ringan",
    suhu_min: 22,
    suhu_max: 28,
    hujan_mm: 8,
    radiasi_w_m2: 170,
    catatan: "Cuaca membaik, panen mendung tetap aman.",
  },
  {
    hari: "Sabtu",
    tanggal: "17 Mei",
    cuaca: "berawan",
    suhu_min: 23,
    suhu_max: 30,
    hujan_mm: 1,
    radiasi_w_m2: 210,
    catatan: "Hari baik untuk penyemprotan hama pagi.",
  },
  {
    hari: "Minggu",
    tanggal: "18 Mei",
    cuaca: "cerah",
    suhu_min: 24,
    suhu_max: 32,
    hujan_mm: 0,
    radiasi_w_m2: 245,
    catatan: "Radiasi tinggi, pastikan irigasi cukup.",
  },
];

const CUACA_LABEL: Record<Cuaca, string> = {
  cerah: "Cerah",
  berawan: "Berawan",
  "hujan-ringan": "Hujan Ringan",
  "hujan-lebat": "Hujan Lebat",
};

const CUACA_SYMBOL: Record<Cuaca, string> = {
  cerah: "○",
  berawan: "◐",
  "hujan-ringan": "▒",
  "hujan-lebat": "█",
};

export default function CuacaPage() {
  const totalRain = FORECAST.reduce((acc, f) => acc + f.hujan_mm, 0);
  const avgMax = (
    FORECAST.reduce((acc, f) => acc + f.suhu_max, 0) / FORECAST.length
  ).toFixed(1);

  return (
    <div className="space-y-10">
      <section>
        <div className="meta-row">
          <span className="h-px w-12 bg-ink" />
          <span>§ Pasal V — Prakiraan Cuaca</span>
        </div>
        <h1
          className="mt-5 font-display leading-[0.9] text-ink"
          style={{
            fontSize: "clamp(2.2rem, 5vw + 0.4rem, 4.5rem)",
            fontVariationSettings: '"opsz" 144, "SOFT" 30',
          }}
        >
          Tujuh hari ke depan,
          <br />
          <span className="italic text-moss">Cikajang, Bandung.</span>
        </h1>
        <p className="mt-5 max-w-prose font-display text-[16px] leading-relaxed text-ink-soft">
          Prakiraan harian untuk merencanakan irigasi, pemupukan,
          penyemprotan hama, dan penjadwalan panen. Sumber final akan
          memakai NASA POWER + BMKG pada Phase 7.
        </p>
      </section>

      <section className="grid divide-y divide-rule sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Stat label="Total Hujan 7-hari" value={`${totalRain}`} unit="mm" />
        <Stat label="Suhu Maks. Rata-rata" value={avgMax} unit="°C" />
        <Stat
          label="Hari Cerah"
          value={`${FORECAST.filter((f) => f.cuaca === "cerah").length}`}
          unit="dari 7 hari"
          accent
        />
      </section>

      <section className="space-y-3">
        <div className="meta-row">
          <span>§ V.1 — Detail Harian</span>
        </div>
        <div className="grid gap-3">
          {FORECAST.map((f, i) => (
            <article
              key={f.tanggal}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-6 border border-ink/15 bg-paper-deep/40 px-5 py-4"
            >
              <div className="text-center">
                <div
                  className="font-display text-[2.4rem] leading-none text-ink"
                  aria-hidden
                >
                  {CUACA_SYMBOL[f.cuaca]}
                </div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-smallcaps text-ink-faint">
                  {CUACA_LABEL[f.cuaca]}
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
                  Hari ke-{i + 1} · {f.hari}, {f.tanggal}
                </div>
                <div
                  className="mt-1 font-display text-xl italic text-ink"
                  style={{ fontVariationSettings: '"opsz" 36, "SOFT" 50' }}
                >
                  {f.suhu_min}° – {f.suhu_max}°C
                </div>
                <p className="mt-1 max-w-prose font-display text-[13px] leading-relaxed text-ink-soft">
                  {f.catatan}
                </p>
              </div>
              <div className="text-right">
                <Mini label="Hujan" value={`${f.hujan_mm} mm`} />
                <Mini label="Radiasi" value={`${f.radiasi_w_m2} W/m²`} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border border-ink/15 bg-paper-deep/40 px-6 py-5">
        <div className="meta-row">
          <span>§ Catatan Sumber</span>
        </div>
        <p className="mt-3 max-w-prose font-display text-[14px] leading-relaxed text-ink-soft">
          Prakiraan ini adalah data contoh statis. Phase 7 akan memakai
          NASA POWER (radiasi + suhu historis) dan BMKG (hujan + prakiraan
          7-hari) ber-geolokasi GPS petani.
        </p>
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

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
      <span>{label}: </span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
