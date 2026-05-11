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
    <select
      className="h-10 rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      value={currentId ?? ""}
      onChange={(e) => router.push(`/detail?id=${e.target.value}`)}
    >
      <option value="" disabled>
        Pilih kecamatan...
      </option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.kecamatan} (Kab. {o.kabupaten})
        </option>
      ))}
    </select>
  );
}
