"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RolePickerDialog } from "@/components/role-picker-dialog";

export function CtaBanner() {
  return (
    <section className="container pb-20 md:pb-32">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary-deep px-8 py-14 text-primary-foreground shadow-elevated md:px-16 md:py-20">
        <div className="absolute inset-0 bg-grid-dot opacity-10" />
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-primary-accent/40 blur-3xl" />

        <div className="relative mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <Sparkles className="h-3 w-3" />
            Demo siap dicoba
          </div>
          <h2 className="mt-6 text-3xl font-semibold leading-tight tracking-tight text-balance md:text-5xl">
            Siap mulai panen lebih cerdas?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-primary-foreground/85 md:text-lg">
            Pilih perspektif Petani atau Pemerintah, jelajahi dashboard demo,
            dan rasakan bagaimana AI dapat menjadi mitra pertanian Anda.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <RolePickerDialog>
              <Button size="xl" variant="secondary" className="group bg-surface text-primary hover:bg-surface/90">
                Coba Demo Sekarang
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Button>
            </RolePickerDialog>
            <Button
              asChild
              size="xl"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <a href="#features">Pelajari Fitur</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
