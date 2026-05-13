"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Sprout, Wheat } from "lucide-react";
import { setRole, type Role } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const ROLES: Array<{
  role: Role;
  icon: typeof Wheat;
  title: string;
  description: string;
  features: string[];
}> = [
  {
    role: "petani",
    icon: Wheat,
    title: "Petani",
    description:
      "Untuk petani individu dan kelompok tani. Catat lahan, terima prediksi panen, dan rekomendasi AI.",
    features: ["Prediksi panen", "Cuaca 7 hari", "Asisten AI"],
  },
  {
    role: "pemerintah",
    icon: Building2,
    title: "Pemerintah",
    description:
      "Untuk dinas pertanian dan pemerintah daerah. Peta produksi, alert defisit, dan analitik wilayah.",
    features: ["Peta choropleth", "Alert defisit", "Analitik wilayah"],
  },
];

export default function LoginPage() {
  const router = useRouter();

  function pick(role: Role) {
    setRole(role);
    router.push(`/${role}/dashboard`);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-mesh">
      <div className="absolute inset-0 bg-grid-dot opacity-40" />

      <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col px-5 py-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke beranda
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sprout className="h-5 w-5" />
            </span>
            <span className="text-base font-semibold tracking-tight">
              Panen Cerdas
            </span>
          </Link>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-12">
          <div className="w-full max-w-3xl">
            <div className="mx-auto max-w-xl text-center">
              <div className="eyebrow mx-auto">Masuk</div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-balance md:text-5xl">
                Pilih perspektif untuk masuk
              </h1>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Peran disimpan di peramban Anda dan dapat diganti kapan saja
                lewat menu Keluar.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {ROLES.map(({ role, icon: Icon, title, description, features }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => pick(role)}
                  className="group flex flex-col gap-4 rounded-3xl border border-border bg-surface p-7 text-left shadow-card transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-glow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-7 w-7" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
                  </div>

                  <div>
                    <div className="text-2xl font-semibold tracking-tight">{title}</div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  </div>

                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {features.map((f) => (
                      <li
                        key={f}
                        className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                      >
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-2">
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="-ml-2 text-primary hover:bg-primary-soft hover:text-primary"
                    >
                      <span>
                        Masuk sebagai {title.toLowerCase()}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </Button>
                  </div>
                </button>
              ))}
            </div>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              MVP UNITY Competition 14 - UNY 2026. Tidak ada kata sandi pada
              tahap ini.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
