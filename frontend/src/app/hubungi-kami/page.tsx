import {
  Github,
  Handshake,
  Lightbulb,
  Mail,
  MapPin,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { ContactForm } from "./contact-form";

export const metadata = {
  title: "Hubungi Kami - Panen Cerdas",
  description:
    "Kolaborasi dengan tim Panen Cerdas - kirim feedback, ide riset, atau kerja sama institusi.",
};

const CHANNELS = [
  {
    icon: Mail,
    label: "Email",
    value: "mraihansurya1@gmail.com",
    href: "mailto:mraihansurya1@gmail.com",
    note: "Respons dalam 1-2 hari kerja.",
  },
  {
    icon: Github,
    label: "GitHub",
    value: "astrorehan/panen-cerdas",
    href: "https://github.com/astrorehan/panen-cerdas",
    note: "Bug report dan pull request publik.",
  },
  {
    icon: MapPin,
    label: "Lokasi tim",
    value: "DI Yogyakarta, Indonesia",
    href: null,
    note: "Yogyakarta - basis pengembangan dan pilot deployment.",
  },
];

const COLLAB = [
  {
    icon: Handshake,
    title: "Kolaborasi institusi",
    body: "Dinas Pertanian, Bulog, BPS, BMKG, atau perguruan tinggi yang ingin uji coba prediksi di wilayah lain - kami terbuka untuk pilot project.",
  },
  {
    icon: Lightbulb,
    title: "Akses dataset & API",
    body: "Akademisi atau peneliti agronomi yang butuh akses ke data NDVI, cuaca, atau hasil prediksi kami untuk publikasi - silakan ajukan tujuan riset.",
  },
  {
    icon: MessageSquare,
    title: "Feedback petani",
    body: "Petani atau penyuluh lapangan yang sudah pakai prediksi - laporan akurasi vs panen aktual sangat berharga untuk retraining model.",
  },
];

export default function HubungiKamiPage() {
  return (
    <div className="container space-y-16 py-12 md:py-20">
      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <div className="eyebrow mx-auto">
          <Sparkles className="h-3 w-3" />
          Hubungi Kami
        </div>
        <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-balance md:text-5xl">
          Mari membangun pangan{" "}
          <span className="text-primary">yang lebih cerdas</span> bersama
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
          Panen Cerdas adalah proyek open source. Kami terbuka untuk
          kolaborasi dengan dinas pertanian, peneliti, komunitas petani, dan
          siapa saja yang ingin memajukan ketahanan pangan Indonesia.
        </p>
      </section>

      {/* Channels */}
      <section>
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow">Saluran kontak</div>
          <h2 className="mt-5 h-section">Cara tercepat menghubungi kami</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            const inner = (
              <article className="h-full rounded-2xl border border-border bg-surface p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {c.label}
                </div>
                <div className="mt-1 text-base font-semibold tracking-tight text-foreground">
                  {c.value}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {c.note}
                </p>
              </article>
            );
            return c.href ? (
              <a
                key={c.label}
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="block"
              >
                {inner}
              </a>
            ) : (
              <div key={c.label}>{inner}</div>
            );
          })}
        </div>
      </section>

      {/* Form */}
      <section className="grid gap-10 lg:grid-cols-[2fr_3fr]">
        <header>
          <div className="eyebrow">
            <MessageSquare className="h-3 w-3" />
            Kirim pesan
          </div>
          <h2 className="mt-5 h-section">Ceritakan kebutuhan Anda</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Isi formulir di samping - kami akan membalas via email yang Anda
            cantumkan. Untuk laporan bug teknis, lampirkan langkah reproduksi
            atau screenshot.
          </p>
          <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Catatan privasi
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Formulir ini membuka aplikasi email Anda dengan isi yang sudah
              diformat. Tidak ada data yang dikirim ke server kami sebelum
              Anda menekan kirim di aplikasi email.
            </p>
          </div>
        </header>
        <ContactForm />
      </section>

      {/* Collab */}
      <section>
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow">
            <Handshake className="h-3 w-3" />
            Bentuk kolaborasi
          </div>
          <h2 className="mt-5 h-section">Apa yang ingin kami dengar</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {COLLAB.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.title} className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">
                  {c.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {c.body}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
        Tim Panen Cerdas - DI Yogyakarta - UNITY Competition 14 - UNY 2026
      </div>
    </div>
  );
}
