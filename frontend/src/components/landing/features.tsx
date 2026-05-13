import {
  CloudRain,
  BarChart3,
  Bot,
  Droplets,
  Leaf,
  Wallet,
  type LucideIcon,
} from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: "primary" | "amber" | "clay";
}

const FEATURES: Feature[] = [
  {
    icon: CloudRain,
    title: "Prediksi Cuaca",
    description:
      "Curah hujan, suhu, dan radiasi 7 hari ke depan langsung dari NASA POWER untuk setiap kecamatan.",
  },
  {
    icon: BarChart3,
    title: "Analitik Panen",
    description:
      "Estimasi yield padi per hektar dengan model XGBoost 3 bulan sebelum panen - lebih cepat dari rilis BPS.",
    accent: "primary",
  },
  {
    icon: Bot,
    title: "Asisten AI",
    description:
      "Chatbot AI menjawab pertanyaan agronomi dalam Bahasa Indonesia: pupuk, hama, irigasi, dan pasca-panen.",
  },
  {
    icon: Droplets,
    title: "Monitoring Irigasi",
    description:
      "Pantau kelembaban tanah dan kebutuhan air per lahan. Hemat air, optimalkan jadwal pengairan.",
    accent: "amber",
  },
  {
    icon: Leaf,
    title: "Deteksi Penyakit",
    description:
      "Identifikasi gejala hama wereng, blast, dan penyakit padi lainnya dari foto - rekomendasi tindakan instan.",
  },
  {
    icon: Wallet,
    title: "Pelacakan Finansial",
    description:
      "Catat biaya benih, pupuk, dan tenaga kerja. Bandingkan dengan proyeksi pendapatan panen.",
    accent: "clay",
  },
];

const ACCENT_CLASSES: Record<NonNullable<Feature["accent"]> | "default", string> = {
  default: "bg-primary-soft text-primary",
  primary: "bg-primary text-primary-foreground",
  amber: "bg-amber/15 text-amber",
  clay: "bg-clay/15 text-clay",
};

export function Features() {
  return (
    <section id="features" className="container scroll-mt-24 py-20 md:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow">Fitur Utama</div>
        <h2 className="mt-5 h-section text-balance">
          Satu platform untuk seluruh siklus pertanian
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Dari pemantauan harian hingga keputusan strategis - semua tools yang
          dibutuhkan petani dan pemerintah daerah dalam satu dashboard.
        </p>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, description, accent }, i) => (
          <div
            key={title}
            className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-7 shadow-card transition-all hover:-translate-y-1 hover:border-primary/20 hover:shadow-elevated"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${ACCENT_CLASSES[accent ?? "default"]}`}
            >
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-lg font-semibold tracking-tight">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary-soft opacity-0 blur-2xl transition-opacity group-hover:opacity-60" />
          </div>
        ))}
      </div>
    </section>
  );
}
