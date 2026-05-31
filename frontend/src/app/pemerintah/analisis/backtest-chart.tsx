"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { YieldPoint } from "@/types";

const PRIMARY = "#1F5132";
const AMBER = "#C97B1A";
const MUTED = "#6B7568";
const BORDER = "#E7E2D6";

export function BacktestChart({
  points,
  mape,
}: {
  points: YieldPoint[];
  mape?: number | null;
}) {
  // No Kementan history for this province + commodity (e.g. ubi jalar di DKI
  // Jakarta). Backend returns an empty list on purpose — show why, not a blank
  // grid.
  if (points.length === 0) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-muted/20 text-center">
        <span className="text-sm font-medium text-foreground">
          Belum ada data Kementan
        </span>
        <span className="max-w-xs text-xs text-muted-foreground">
          Komoditas ini belum tercatat produksinya di provinsi terpilih, jadi
          tidak ada riwayat untuk divalidasi.
        </span>
      </div>
    );
  }

  // Backend emits actual + model prediction as separate points per year (plus a
  // forward projection). Merge by year so each year carries both the actual and
  // the re-run prediction — that's what lets the dashed line overlap history.
  const byYear = new Map<number, { year: number; aktual: number | null; prediksi: number | null }>();
  for (const p of points) {
    const row = byYear.get(p.year) ?? { year: p.year, aktual: null, prediksi: null };
    if (p.kind === "aktual") row.aktual = p.value;
    else row.prediksi = p.value;
    byYear.set(p.year, row);
  }
  const data = [...byYear.values()].sort((a, b) => a.year - b.year);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -10 }}>
          <CartesianGrid stroke={BORDER} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fill: MUTED, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            tick={{ fill: MUTED, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickMargin={4}
            width={48}
            unit=" t/ha"
          />
          <Tooltip
            cursor={{ stroke: PRIMARY, strokeDasharray: "2 4" }}
            contentStyle={{
              background: "#FFFFFF",
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              fontSize: 12,
              padding: 10,
              boxShadow: "0 4px 12px rgba(15,31,24,0.08)",
            }}
            labelStyle={{ color: "#0F1F18", fontWeight: 600, marginBottom: 4 }}
          />
          <Line
            type="monotone"
            dataKey="aktual"
            stroke={PRIMARY}
            strokeWidth={2.2}
            dot={{ r: 3.5, fill: PRIMARY, stroke: "#FFFFFF", strokeWidth: 2 }}
            name="Aktual (Kementan)"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="prediksi"
            stroke={AMBER}
            strokeWidth={2.2}
            strokeDasharray="5 4"
            dot={{ r: 4, fill: "#FFFFFF", stroke: AMBER, strokeWidth: 2 }}
            name="Prediksi"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-4 flex items-center gap-5 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded-full" style={{ background: PRIMARY }} />
          Aktual Kementan
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-0.5 w-5 rounded-full"
            style={{
              background: `repeating-linear-gradient(to right, ${AMBER} 0, ${AMBER} 4px, transparent 4px, transparent 7px)`,
            }}
          />
          Prediksi RandomForest
        </span>
        <span className="ml-auto">
          {mape != null
            ? `MAPE ${mape.toFixed(1)}% - rata-rata error per tahun`
            : "MAPE belum tersedia"}
        </span>
      </div>
    </div>
  );
}
