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
    unit_local: "Umur ≥ 8 bulan",
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
    <div className="space-y-10">
      <section>
        <div className="meta-row">
          <span className="h-px w-12 bg-ink" />
          <span>§ Pasal IV — Harga Komoditas</span>
        </div>
        <h1
          className="mt-5 font-display leading-[0.9] text-ink"
          style={{
            fontSize: "clamp(2.2rem, 5vw + 0.4rem, 4.5rem)",
            fontVariationSettings: '"opsz" 144, "SOFT" 30',
          }}
        >
          Harga pasaran
          <br />
          <span className="italic text-moss">untuk pekan ini.</span>
        </h1>
        <p className="mt-5 max-w-prose font-display text-[16px] leading-relaxed text-ink-soft">
          Harga acuan mingguan dari pasar utama. Bandingkan dengan harga
          jual lokal Anda untuk memutuskan kapan melepas hasil panen.
        </p>
      </section>

      <section className="overflow-x-auto border border-ink/20 bg-paper-deep/40">
        <table className="w-full min-w-[680px] border-collapse">
          <thead>
            <tr className="border-b border-ink/20 text-left">
              <Th>Komoditas</Th>
              <Th>Pasar Acuan</Th>
              <Th className="text-right">Harga / kg</Th>
              <Th className="text-right">Δ 7-hari</Th>
            </tr>
          </thead>
          <tbody>
            {HARGA.map((h) => {
              const up = h.delta_pct >= 0;
              return (
                <tr
                  key={h.komoditas}
                  className="border-b border-rule align-top last:border-b-0"
                >
                  <td className="px-4 py-4">
                    <div
                      className="font-display text-xl italic text-ink"
                      style={{ fontVariationSettings: '"opsz" 36, "SOFT" 50' }}
                    >
                      {h.label}
                    </div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
                      {h.unit_local}
                    </div>
                    <p className="mt-2 max-w-prose font-display text-[13px] leading-relaxed text-ink-soft">
                      {h.catatan}
                    </p>
                  </td>
                  <td className="px-4 py-4 align-top font-mono text-[11px] uppercase tracking-smallcaps text-ink">
                    {h.pasar}
                  </td>
                  <td className="px-4 py-4 text-right align-top">
                    <div
                      className="font-display leading-none text-ink"
                      style={{
                        fontSize: "clamp(1.4rem, 2vw + 0.4rem, 2rem)",
                        fontVariationSettings: '"opsz" 72, "SOFT" 30',
                      }}
                    >
                      Rp {formatIdr(h.price_idr_per_kg)}
                    </div>
                    <div className="mt-1 font-mono text-[9px] uppercase tracking-smallcaps text-ink-faint">
                      per kilogram
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right align-top">
                    <span
                      className={`inline-flex items-baseline gap-1 border px-2 py-1 font-mono text-[11px] ${
                        up
                          ? "border-[#2A3D2F]/30 bg-[#2A3D2F]/10 text-[#2A3D2F]"
                          : "border-[#A8442C]/30 bg-[#A8442C]/10 text-[#A8442C]"
                      }`}
                    >
                      <span>{up ? "▲" : "▼"}</span>
                      <span>
                        {up ? "+" : ""}
                        {h.delta_pct.toFixed(1)}%
                      </span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="border border-ink/15 bg-paper-deep/40 px-6 py-5">
        <div className="meta-row">
          <span>§ Catatan Sumber</span>
        </div>
        <p className="mt-3 max-w-prose font-display text-[14px] leading-relaxed text-ink-soft">
          Data harga di atas adalah contoh statis untuk MVP UNITY #14.
          Phase 7 akan menyambungkan API Panel Harga Pangan Nasional (PIHPS)
          dan Bulog untuk pembaruan harian otomatis.
        </p>
      </section>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint ${className}`}
    >
      {children}
    </th>
  );
}
