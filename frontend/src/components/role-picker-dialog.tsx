"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Building2, Wheat, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Role } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface RolePickerDialogProps {
  children: ReactNode;
}

const ROLES: Array<{
  role: Role;
  title: string;
  description: string;
  icon: typeof Wheat;
  highlights: string[];
}> = [
  {
    role: "petani",
    title: "Petani",
    description: "Prediksi panen, cek cuaca, dan rekomendasi AI untuk lahan Anda.",
    icon: Wheat,
    highlights: ["Prediksi panen padi", "Cuaca 7 hari", "Manajemen irigasi"],
  },
  {
    role: "pemerintah",
    title: "Pemerintah",
    description: "Peta produksi pangan, deteksi defisit, dan analitik antar-kecamatan.",
    icon: Building2,
    highlights: ["Choropleth real-time", "Alert defisit", "Analitik wilayah"],
  },
];

export function RolePickerDialog({ children }: RolePickerDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const choose = (role: Role) => {
    setOpen(false);
    router.push(`/register?role=${role}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Pilih peran Anda</DialogTitle>
          <DialogDescription>
            Panen Cerdas melayani dua persona. Pilih peran untuk lanjut ke
            pendaftaran.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {ROLES.map(({ role, title, description, icon: Icon, highlights }) => (
            <button
              key={role}
              type="button"
              onClick={() => choose(role)}
              className={cn(
                "group relative flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 text-left transition-all",
                "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-glow",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-6 w-6" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
              </div>
              <div>
                <div className="text-lg font-semibold tracking-tight">{title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </div>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {highlights.map((h) => (
                  <li key={h} className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-primary/60" />
                    {h}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Sudah punya akun? Klik Masuk di pojok kanan atas.
        </p>
      </DialogContent>
    </Dialog>
  );
}
