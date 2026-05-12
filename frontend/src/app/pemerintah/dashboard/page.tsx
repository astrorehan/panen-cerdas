export default function PemerintahDashboardStub() {
  return (
    <div className="space-y-6">
      <div className="meta-row">
        <span className="h-px w-12 bg-ink" />
        <span>§ Pasal — Dasbor Pemerintah (placeholder)</span>
      </div>
      <h1
        className="font-display italic leading-[0.95] text-ink"
        style={{
          fontSize: "clamp(2rem, 3vw + 1rem, 4rem)",
          fontVariationSettings: '"opsz" 96, "SOFT" 50',
        }}
      >
        Dasbor pemerintah pindah dari "/" pada Phase 5.
      </h1>
      <p className="max-w-prose font-display text-[15px] leading-relaxed text-ink-soft">
        Saat ini buletin eksekutif masih berada di rute "/". Phase 5
        memindahkan KPI strip, tren, peta choropleth, dan detail
        kecamatan ke bawah /pemerintah.
      </p>
    </div>
  );
}
