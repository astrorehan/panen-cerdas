"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Satellite, Cpu, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RolePickerDialog } from "@/components/role-picker-dialog";
import { DashboardMockup } from "@/components/landing/dashboard-mockup";

const TRUST = [
  { icon: Satellite, label: "Sentinel-2" },
  { icon: Cloud, label: "NASA POWER" },
  { icon: Cpu, label: "XGBoost ML" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-mesh">
      <div className="absolute inset-0 -z-10 bg-grid-dot opacity-50" />

      <div className="container relative pb-20 pt-12 md:pb-32 md:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          {/* Copy */}
          <div className="lg:col-span-6">
            <div className="eyebrow animate-fade-in">
              <Sparkles className="h-3 w-3" />
              Pertanian cerdas berbasis AI
            </div>

            <h1 className="mt-6 animate-fade-in-up text-4xl font-semibold leading-[1.05] tracking-tight text-foreground text-balance sm:text-5xl md:text-6xl lg:text-[64px]">
              Pantau dan{" "}
              <span className="relative inline-block">
                <span className="relative z-10">Optimalkan</span>
                <span className="absolute inset-x-0 bottom-1 -z-0 h-3 bg-primary-soft md:bottom-2 md:h-4" />
              </span>{" "}
              Pertanian dengan{" "}
              <span className="text-primary">AI</span>
            </h1>

            <p className="mt-6 max-w-xl animate-fade-in-up stagger-2 text-base leading-relaxed text-muted-foreground md:text-lg">
              Prediksi panen tiga bulan lebih awal, analisis cuaca real-time
              dari NASA POWER, monitoring irigasi, dan rekomendasi AI untuk
              setiap petak lahan padi Anda.
            </p>

            <div className="mt-8 flex animate-fade-in-up stagger-3 flex-wrap items-center gap-3">
              <RolePickerDialog>
                <Button size="lg" className="group">
                  Coba Demo
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </Button>
              </RolePickerDialog>
              <Button asChild size="lg" variant="outline">
                <Link href="#features">Lihat Fitur</Link>
              </Button>
            </div>

            {/* Trust strip */}
            <div className="mt-10 animate-fade-in-up stagger-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Didukung data dari
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                {TRUST.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground shadow-sm"
                  >
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mockup */}
          <div className="animate-fade-in lg:col-span-6">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
