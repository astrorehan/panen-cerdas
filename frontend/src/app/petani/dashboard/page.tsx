export default function PetaniDashboardStub() {
  return (
    <div className="space-y-6">
      <div className="meta-row">
        <span className="h-px w-12 bg-ink" />
        <span>§ Pasal — Dasbor Petani (placeholder)</span>
      </div>
      <h1
        className="font-display italic leading-[0.95] text-ink"
        style={{
          fontSize: "clamp(2rem, 3vw + 1rem, 4rem)",
          fontVariationSettings: '"opsz" 96, "SOFT" 50',
        }}
      >
        Dasbor petani akan terbit di Pasal IV.
      </h1>
      <p className="max-w-prose font-display text-[15px] leading-relaxed text-ink-soft">
        Halaman ini menjadi pintu masuk untuk petani: ringkasan lahan,
        cuaca harian, dan tombol cepat ke formulir prediksi panen.
        Konten dikerjakan pada Phase 4.
      </p>
    </div>
  );
}
