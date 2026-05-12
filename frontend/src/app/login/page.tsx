"use client";

import { useRouter } from "next/navigation";
import { setRole, type Role } from "@/lib/auth";

const ROLES: Array<{
  role: Role;
  numeral: string;
  title: string;
  italicTail: string;
  blurb: string;
  hint: string;
}> = [
  {
    role: "petani",
    numeral: "I",
    title: "Saya",
    italicTail: "Petani",
    blurb:
      "Catat lahan, masukkan kondisi cuaca dan hama, lalu terima prediksi panen dengan rekomendasi tindakan.",
    hint: "Akses cepat — prediksi per lahan",
  },
  {
    role: "pemerintah",
    numeral: "II",
    title: "Saya",
    italicTail: "Pemerintah",
    blurb:
      "Pantau agregasi prediksi panen lintas kecamatan, status pangan, dan tren historis berbasis BPS + Sentinel-2.",
    hint: "Buletin eksekutif — peta + KPI",
  },
];

export default function LoginPage() {
  const router = useRouter();

  function pick(role: Role) {
    setRole(role);
    router.push(`/${role}/dashboard`);
  }

  return (
    <div className="space-y-10">
      <section>
        <div className="meta-row">
          <span className="h-px w-12 bg-ink" />
          <span>§ Pasal 0 — Masuk Buletin</span>
        </div>
        <h1
          className="mt-6 font-display leading-[0.9] text-ink"
          style={{
            fontSize: "clamp(2.4rem, 5vw + 0.4rem, 5rem)",
            fontVariationSettings: '"opsz" 144, "SOFT" 30',
          }}
        >
          Pilih peran Anda
          <br />
          <span className="italic text-moss">untuk memulai.</span>
        </h1>
        <p className="mt-5 max-w-prose font-display text-[17px] leading-relaxed text-ink-soft">
          PanenCerdas melayani dua audiens. Pilih jalur yang sesuai —
          peran disimpan di peramban Anda dan dapat diganti kapan saja
          melalui menu logout.
        </p>
      </section>

      <section className="rule-h" />

      <section className="grid gap-6 md:grid-cols-2">
        {ROLES.map((r) => (
          <button
            key={r.role}
            type="button"
            onClick={() => pick(r.role)}
            className="group relative flex flex-col items-start gap-5 border border-ink/20 bg-paper-deep/40 p-7 text-left transition-all hover:border-ink hover:bg-paper-deep focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink md:p-9"
          >
            <div className="flex w-full items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
                Pasal {r.numeral}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint transition-colors group-hover:text-ink">
                {r.hint}
              </span>
            </div>

            <h2
              className="font-display text-ink"
              style={{
                fontSize: "clamp(2rem, 3.2vw + 0.4rem, 3.4rem)",
                fontVariationSettings: '"opsz" 96, "SOFT" 40',
                lineHeight: 0.95,
              }}
            >
              {r.title}{" "}
              <span className="italic text-moss-deep">{r.italicTail}</span>
            </h2>

            <p className="max-w-prose font-display text-[15px] leading-relaxed text-ink-soft">
              {r.blurb}
            </p>

            <div className="mt-1 flex items-center gap-3 font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint transition-colors group-hover:text-ink">
              <span className="h-px w-6 bg-ink/40 transition-all group-hover:w-12 group-hover:bg-ink" />
              <span>Masuk sebagai {r.italicTail.toLowerCase()}</span>
            </div>
          </button>
        ))}
      </section>

      <section className="border-t border-rule pt-6 font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
        Peran dibaca dari penyimpanan peramban (localStorage). Tidak ada
        kata sandi pada MVP ini — sesuai spesifikasi UNITY #14 UNY 2026.
      </section>
    </div>
  );
}
