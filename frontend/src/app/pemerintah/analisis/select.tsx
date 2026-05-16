"use client";

import { useRouter } from "next/navigation";
import type { KecamatanPrediction } from "@/types";

type Props = {
  options: KecamatanPrediction[];
  currentId?: string;
  mode?: "kecamatan" | "province";
};

export function KecamatanSelect({ options, currentId, mode = "kecamatan" }: Props) {
  const router = useRouter();
  const isProvince = mode === "province";
  return (
    <label className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm shadow-sm">
      <span className="text-xs font-medium text-muted-foreground">Pilih</span>
      <select
        className="bg-transparent text-sm font-medium text-foreground focus:outline-none"
        value={currentId ?? ""}
        onChange={(e) => router.push(`/pemerintah/analisis?id=${e.target.value}`)}
      >
        <option value="" disabled>
          -
        </option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {isProvince
              ? o.kabupaten
              : `${o.kecamatan} - Kab. ${o.kabupaten}`}
          </option>
        ))}
      </select>
    </label>
  );
}
