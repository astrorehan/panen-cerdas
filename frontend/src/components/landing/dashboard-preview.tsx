"use client";

import {
  LayoutDashboard,
  TrendingUp,
  Sprout,
  CloudRain,
  MapPin,
} from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const TREND_DATA = [
  { tahun: "2018", prediksi: 5.4, aktual: 5.3 },
  { tahun: "2019", prediksi: 5.6, aktual: 5.5 },
  { tahun: "2020", prediksi: 5.8, aktual: 5.7 },
  { tahun: "2021", prediksi: 6.0, aktual: 6.1 },
  { tahun: "2022", prediksi: 6.2, aktual: 6.0 },
  { tahun: "2023", prediksi: 6.3, aktual: 6.4 },
  { tahun: "2024", prediksi: 6.4, aktual: 6.4 },
];

const SIDEBAR = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Sprout, label: "Lahan" },
  { icon: TrendingUp, label: "Prediksi" },
  { icon: CloudRain, label: "Cuaca" },
  { icon: MapPin, label: "Wilayah" },
];

export function DashboardPreview() {
  return (
    <section id="preview" className="bg-muted/30 py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow">Dashboard Preview</div>
          <h2 className="mt-5 h-section text-balance">
            Antarmuka yang sederhana, data yang dalam
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Dirancang dengan UX khas aplikasi fintech dan WhatsApp - tombol
            besar, navigasi sederhana, dan tipografi yang mudah dibaca.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-3xl border border-border bg-surface shadow-elevated">
          {/* Top bar */}
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sprout className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-semibold tracking-tight">
                Panen Cerdas
              </span>
              <span className="ml-3 text-xs text-muted-foreground">/ Pemerintah / Dashboard</span>
            </div>
            <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span className="flex h-2 w-2 rounded-full bg-primary" /> Live
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-12">
            {/* Sidebar */}
            <aside className="hidden border-r border-border bg-background p-4 lg:col-span-2 lg:block">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Navigasi
              </div>
              <nav className="mt-3 flex flex-col gap-1">
                {SIDEBAR.map(({ icon: Icon, label, active }) => (
                  <div
                    key={label}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </div>
                ))}
              </nav>
            </aside>

            {/* Main */}
            <div className="lg:col-span-10">
              <div className="grid gap-4 p-5 sm:p-7">
                {/* KPI row */}
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Produksi MT 2024", value: "1.42", unit: "jt ton", trend: "+8%", tone: "primary" },
                    { label: "Surplus daerah", value: "23", unit: "kecamatan", trend: "+3", tone: "primary" },
                    { label: "Defisit waspada", value: "5", unit: "kecamatan", trend: "-2", tone: "clay" },
                  ].map((k) => (
                    <div key={k.label} className="rounded-2xl border border-border bg-surface p-5">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {k.label}
                      </div>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-3xl font-semibold tracking-tight text-foreground">{k.value}</span>
                        <span className="text-xs text-muted-foreground">{k.unit}</span>
                      </div>
                      <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${k.tone === "primary" ? "bg-primary-soft text-primary" : "bg-clay/15 text-clay"}`}>
                        <TrendingUp className="h-3 w-3" />
                        {k.trend} vs MT 2023
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chart + recommendation */}
                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-surface p-5 lg:col-span-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold tracking-tight">Tren prediksi vs aktual</div>
                        <div className="text-xs text-muted-foreground">DI Yogyakarta - ton/ha</div>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-primary" /> Prediksi
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-amber" /> Aktual
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={TREND_DATA}>
                          <CartesianGrid stroke="#E7E2D6" strokeDasharray="2 4" vertical={false} />
                          <XAxis
                            dataKey="tahun"
                            tick={{ fill: "#6B7568", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: "#6B7568", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            width={30}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid #E7E2D6",
                              fontSize: 12,
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="prediksi"
                            stroke="#1F5132"
                            strokeWidth={2}
                            dot={{ r: 3, fill: "#1F5132" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="aktual"
                            stroke="#C97B1A"
                            strokeWidth={2}
                            dot={{ r: 3, fill: "#C97B1A" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Map placeholder */}
                <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary-soft via-surface to-amber/10 p-5">
                  <div className="absolute inset-0 bg-grid-dot opacity-30" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
                        <MapPin className="h-4 w-4 text-primary" />
                        Peta produksi pangan
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        27 kecamatan terpantau - update tiap MT
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      {[
                        { label: "Surplus", color: "#1F5132" },
                        { label: "Cukup", color: "#7AA876" },
                        { label: "Waspada", color: "#D4933A" },
                        { label: "Defisit", color: "#B3573A" },
                      ].map((s) => (
                        <span key={s.label} className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                          {s.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="relative mt-4 grid grid-cols-9 gap-1">
                    {Array.from({ length: 36 }).map((_, i) => {
                      const colors = ["#1F5132", "#7AA876", "#7AA876", "#D4933A", "#1F5132", "#7AA876", "#B3573A"];
                      const c = colors[(i * 3) % colors.length];
                      return (
                        <div
                          key={i}
                          className="aspect-square rounded transition-all hover:scale-110"
                          style={{ background: c, opacity: 0.65 + ((i % 4) / 10) }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
