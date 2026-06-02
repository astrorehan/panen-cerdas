"use client";

import { useMemo } from "react";
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

  const selectOptions = useMemo(() => {
    const mapped = options.map((o) => ({
      value: o.id,
      label:
        !isProvince && o.kecamatan && o.kecamatan !== o.kabupaten
          ? `${o.kecamatan} - Kab. ${o.kabupaten}`
          : o.kabupaten,
    }));
    return [{ value: "", label: "-" }, ...mapped];
  }, [options, isProvince]);

  return (
    <CustomSelect
      id="kec-select"
      label={isProvince ? "Pilih Provinsi" : "Pilih Kabupaten/Kota"}
      value={currentId ?? ""}
      onChange={(val) => router.push(`/pemerintah/analisis?id=${val}${commodity ? `&commodity=${commodity}` : ""}`)}
      wrapperClassName="min-w-[200px]"
      options={selectOptions}
    />
  );
}
