"use client";

import { useRouter } from "next/navigation";
import type { KecamatanPrediction } from "@/types";

type Props = {
  options: KecamatanPrediction[];
  currentId?: string;
};

export function KecamatanSelect({ options, currentId }: Props) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 border border-ink bg-paper px-3 py-2 font-mono text-[11px] uppercase tracking-smallcaps text-ink-faint">
      <span>Pilih</span>
      <select
        className="bg-transparent text-ink focus:outline-none"
        value={currentId ?? ""}
        onChange={(e) => router.push(`/pemerintah/analisis?id=${e.target.value}`)}
      >
        <option value="" disabled>
          —
        </option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.kecamatan} · Kab. {o.kabupaten}
          </option>
        ))}
      </select>
    </label>
  );
}
