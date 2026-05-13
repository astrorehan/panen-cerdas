"use client";

import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Role = "petani" | "pemerintah" | "peneliti" | "media" | "lainnya";

const ROLES: Array<{ id: Role; label: string }> = [
  { id: "petani", label: "Petani / Penyuluh" },
  { id: "pemerintah", label: "Pemerintah / Dinas" },
  { id: "peneliti", label: "Peneliti / Akademisi" },
  { id: "media", label: "Media / Jurnalis" },
  { id: "lainnya", label: "Lainnya" },
];

const TO_EMAIL = "mraihansurya1@gmail.com";

export function ContactForm() {
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("petani");
  const [organisasi, setOrganisasi] = useState("");
  const [pesan, setPesan] = useState("");
  const [opened, setOpened] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const roleLabel = ROLES.find((r) => r.id === role)?.label ?? role;
    const subject = `[Panen Cerdas] Pesan dari ${nama} (${roleLabel})`;
    const lines = [
      `Nama       : ${nama}`,
      `Email      : ${email}`,
      `Peran      : ${roleLabel}`,
      organisasi ? `Organisasi : ${organisasi}` : null,
      "",
      "Pesan:",
      pesan,
      "",
      "---",
      "Dikirim dari formulir https://panen-cerdas/hubungi-kami",
    ].filter(Boolean) as string[];
    const body = lines.join("\n");
    const url = `mailto:${TO_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
    setOpened(true);
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-3xl border border-border bg-surface p-6 shadow-card md:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nama">Nama lengkap</Label>
          <Input
            id="nama"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Contoh: Budi Santoso"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email balasan</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@domain.id"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Saya adalah</Label>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              className={
                "rounded-full border px-4 py-2 text-sm font-medium transition-all " +
                (role === r.id
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-surface text-foreground hover:border-primary/30")
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="org">
          Organisasi <span className="text-muted-foreground">(opsional)</span>
        </Label>
        <Input
          id="org"
          value={organisasi}
          onChange={(e) => setOrganisasi(e.target.value)}
          placeholder="Contoh: Dinas Pertanian Sleman, UGM, Bulog"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pesan">Pesan</Label>
        <textarea
          id="pesan"
          value={pesan}
          onChange={(e) => setPesan(e.target.value)}
          required
          rows={6}
          placeholder="Ceritakan kebutuhan, pertanyaan, atau ide kolaborasi Anda."
          className="flex w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <p className="max-w-sm text-xs text-muted-foreground">
          Tombol kirim akan membuka aplikasi email Anda dengan isi sudah
          terisi - tinggal periksa lalu tekan kirim.
        </p>
        <Button type="submit" size="lg">
          <Send className="h-4 w-4" />
          Buka aplikasi email
        </Button>
      </div>

      {opened && (
        <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary-soft p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-primary">
              Email sudah dibuka
            </div>
            <p className="mt-0.5 text-sm text-foreground">
              Periksa isinya di aplikasi email Anda lalu tekan kirim. Kalau
              tidak terbuka otomatis, salin alamat {TO_EMAIL} dan kirim
              manual.
            </p>
          </div>
        </div>
      )}
    </form>
  );
}
