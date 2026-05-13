"use client";

import Link from "next/link";
import { Check, Wheat, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RolePickerDialog } from "@/components/role-picker-dialog";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    name: "Petani",
    icon: Wheat,
    price: "Gratis",
    priceLabel: "selamanya",
    description: "Untuk petani individu dan kelompok tani kecil.",
    features: [
      "Prediksi panen padi per lahan",
      "Cuaca 7 hari (NASA POWER)",
      "Asisten AI Bahasa Indonesia",
      "Harga komoditas mingguan",
      "Hingga 5 lahan terdaftar",
    ],
    cta: "Mulai Gratis",
    highlight: false,
  },
  {
    name: "Pemerintah",
    icon: Building2,
    price: "Hubungi Kami",
    priceLabel: "custom enterprise",
    description: "Untuk dinas pertanian dan pemerintah daerah.",
    features: [
      "Semua fitur Petani",
      "Peta produksi pangan choropleth",
      "Alert defisit otomatis",
      "Analitik antar-kecamatan",
      "API & integrasi data BPS",
      "Onboarding & support khusus",
    ],
    cta: "Jadwalkan Demo",
    highlight: true,
  },
];

export function Pricing() {
  return (
    <section id="harga" className="container scroll-mt-24 py-20 md:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow">Harga</div>
        <h2 className="mt-5 h-section text-balance">
          Mulai gratis. Skalakan saat siap.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Selama tahap MVP hackathon, akses Petani sepenuhnya gratis. Tier
          Pemerintah dibuka melalui pilot project.
        </p>
      </div>

      <div className="mt-14 grid gap-5 md:grid-cols-2">
        {TIERS.map(({ name, icon: Icon, price, priceLabel, description, features, cta, highlight }) => (
          <div
            key={name}
            className={cn(
              "relative flex flex-col rounded-3xl border bg-surface p-8 shadow-card transition-all",
              highlight
                ? "border-primary/25 ring-1 ring-primary/15"
                : "border-border",
            )}
          >
            {highlight && (
              <div className="absolute -top-3 right-8 rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground shadow-sm">
                Untuk institusi
              </div>
            )}
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl",
                  highlight
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary-soft text-primary",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold tracking-tight">{name}</div>
                <div className="text-xs text-muted-foreground">{description}</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-tight">{price}</span>
                <span className="text-sm text-muted-foreground">{priceLabel}</span>
              </div>
            </div>

            <ul className="mt-6 space-y-3 text-sm">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                      highlight
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary-soft text-primary",
                    )}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="text-foreground">{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 pt-0">
              {highlight ? (
                <Button asChild size="lg" className="w-full">
                  <Link href="mailto:mraihansurya1@gmail.com?subject=Panen%20Cerdas%20-%20Pilot%20Project">
                    {cta}
                  </Link>
                </Button>
              ) : (
                <RolePickerDialog>
                  <Button size="lg" variant="outline" className="w-full">
                    {cta}
                  </Button>
                </RolePickerDialog>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
