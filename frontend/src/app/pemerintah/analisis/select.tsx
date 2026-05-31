"use client";

import { useRouter } from "next/navigation";
import { CustomSelect } from "@/components/ui/select-custom";

type SelectOption = { id: string; kabupaten: string; kecamatan?: string };

type Props = {
  options: SelectOption[];
  currentId?: string;
  mode?: "kecamatan" | "province";
  commodity?: string;
};

export function KecamatanSelect({ options, currentId, mode = "kecamatan", commodity }: Props) {
  const router = useRouter();
  const isProvince = mode === "province";
  return (
    <CustomSelect
      id="kec-select"
      label={isProvince ? "Pilih Provinsi" : "Pilih Kecamatan"}
      value={currentId ?? ""}
      onChange={(e) => router.push(`/pemerintah/analisis?id=${e.target.value}${commodity ? `&commodity=${commodity}` : ""}`)}
      wrapperClassName="min-w-[200px]"
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
    </CustomSelect>
  );
}
