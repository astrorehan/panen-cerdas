"use client";

import {
  CloudRain,
  Sprout,
  Bot,
  TrendingUp,
  Droplets,
  Sun,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";

const weatherData = [
  { d: 1, v: 14 },
  { d: 2, v: 18 },
  { d: 3, v: 9 },
  { d: 4, v: 22 },
  { d: 5, v: 16 },
  { d: 6, v: 28 },
  { d: 7, v: 19 },
];

export function DashboardMockup() {
  return (
    <div className="relative w-full">
      {/* Floating glow */}
      <div className="absolute -inset-12 -z-10 rounded-[40px] bg-gradient-to-tr from-primary/8 via-transparent to-amber/8 blur-3xl" />

      {/* Browser frame */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated">
        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-primary/40" />
          </div>
          <div className="rounded-md bg-surface px-3 py-1 text-[10px] font-medium tracking-wide text-muted-foreground">
            app.panencerdas.id/dashboard
          </div>
          <div className="h-2.5 w-12" />
        </div>

        {/* Dashboard content */}
        <div className="grid gap-3 bg-background p-4 sm:grid-cols-12">
          {/* Sidebar */}
          <aside className="hidden flex-col gap-1.5 rounded-xl bg-surface p-3 sm:col-span-3 sm:flex">
            {[
              { icon: Sprout, label: "Lahan", active: true },
              { icon: CloudRain, label: "Cuaca" },
              { icon: TrendingUp, label: "Prediksi" },
              { icon: Bot, label: "Asisten AI" },
            ].map(({ icon: Icon, label, active }) => (
              <div
                key={label}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </div>
            ))}
          </aside>

          {/* Main grid */}
          <div className="grid gap-3 sm:col-span-9 sm:grid-cols-2">
            {/* Harvest prediction KPI */}
            <div className="col-span-2 flex items-center justify-between rounded-xl bg-gradient-to-br from-primary to-primary-deep p-4 text-primary-foreground">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-80">
                  <Sprout className="h-3 w-3" /> Prediksi panen
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight">
                  6.42 ton/ha
                </div>
                <div className="mt-1 text-[11px] opacity-80">
                  +12% vs MT 2023 - Subang
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground/10">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>

            {/* Weather chart */}
            <div className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CloudRain className="h-3 w-3 text-primary" /> Curah hujan 7h
                </span>
                <span>mm</span>
              </div>
              <div className="mt-2 text-lg font-semibold tracking-tight">
                18.6
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                  mm/hari
                </span>
              </div>
              <div className="mt-1 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weatherData}>
                    <defs>
                      <linearGradient id="wgrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1F5132" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#1F5132" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke="#1F5132"
                      strokeWidth={1.5}
                      fill="url(#wgrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Irrigation status */}
            <div className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <Droplets className="h-3 w-3 text-primary" /> Kelembaban tanah
              </div>
              <div className="mt-2 text-lg font-semibold tracking-tight">
                72%
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-primary to-primary-accent" />
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">
                Optimal - tidak perlu irigasi
              </div>
            </div>

            {/* AI assistant snippet */}
            <div className="col-span-2 flex gap-2.5 rounded-xl border border-primary/15 bg-primary-soft p-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="text-xs leading-relaxed text-foreground">
                <span className="font-semibold">Asisten AI:</span> Cuaca cerah
                7 hari ke depan dengan NDVI 0.68. Saya rekomendasikan pemupukan
                susulan dalam 3 hari.
                <span className="ml-1 inline-flex items-center gap-1 text-primary">
                  <Sun className="h-3 w-3" /> Lihat detail
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating data badge */}
      <div className="absolute -left-3 top-1/3 hidden -translate-y-1/2 rounded-2xl border border-border bg-surface px-3 py-2 shadow-card md:flex md:items-center md:gap-2">
        <span className="flex h-2 w-2 rounded-full bg-primary">
          <span className="absolute h-2 w-2 animate-ping rounded-full bg-primary opacity-60" />
        </span>
        <div className="text-[10px] leading-tight">
          <div className="font-semibold tracking-tight">NASA POWER</div>
          <div className="text-muted-foreground">Live · 30 hari</div>
        </div>
      </div>

      <div className="absolute -right-3 bottom-1/4 hidden rounded-2xl border border-border bg-surface px-3 py-2 shadow-card md:flex md:items-center md:gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber/15 text-amber">
          <Sun className="h-3.5 w-3.5" />
        </div>
        <div className="text-[10px] leading-tight">
          <div className="font-semibold tracking-tight">Sentinel-2</div>
          <div className="text-muted-foreground">NDVI 0.68</div>
        </div>
      </div>
    </div>
  );
}
