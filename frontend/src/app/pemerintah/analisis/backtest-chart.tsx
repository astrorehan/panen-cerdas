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

export function BacktestChart({ points }: { points: YieldPoint[] }) {
  const data = points.map((p) => ({
    year: p.year,
    aktual: p.kind === "aktual" ? p.value : null,
    prediksi: p.kind === "prediksi" ? p.value : null,
  }));

  let last: number | null = null;
  for (const r of data) {
    if (r.aktual != null) last = r.aktual;
    if (r.prediksi != null && r.aktual == null) r.aktual = last;
  }

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
            name="Aktual (BPS)"
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
          Aktual BPS
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-0.5 w-5 rounded-full"
            style={{
              background: `repeating-linear-gradient(to right, ${AMBER} 0, ${AMBER} 4px, transparent 4px, transparent 7px)`,
            }}
          />
          Prediksi XGBoost
        </span>
        <span className="ml-auto">MAPE 13.4% - split per-tahun</span>
      </div>
    </div>
  );
}
