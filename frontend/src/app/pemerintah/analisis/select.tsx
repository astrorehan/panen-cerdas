"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CustomSelect } from "@/components/ui/select-custom";

type SelectOption = { id: string; kabupaten: string };

type Props = {
  options: SelectOption[];
  currentId?: string;
  mode?: "kabupaten" | "province";
  commodity?: string;
};

export function KabupatenSelect({ options, currentId, mode = "kabupaten", commodity }: Props) {
  const router = useRouter();
  const isProvince = mode === "province";

  const selectOptions = useMemo(() => {
    return options.map((o) => ({
      value: o.id,
      label: o.kabupaten,
    }));
  }, [options]);

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
