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
import type { YieldTrend } from "@/types";

type Props = { trend: YieldTrend };

const INK = "#1A1D1B";
const MOSS = "#2A3D2F";
const SAFFRON = "#C97B1A";
const RULE = "#C8C0A8";

export function TrendChart({ trend }: Props) {
  const data = trend.points.map((p) => ({
    year: p.year,
    aktual: p.kind === "aktual" ? p.value : null,
    prediksi: p.kind === "prediksi" ? p.value : null,
  }));

  // Bridge the discontinuity so the line stays connected
  let last: number | null = null;
  for (const r of data) {
    if (r.aktual != null) last = r.aktual;
    if (r.prediksi != null && r.aktual == null) r.aktual = last;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 18, right: 16, bottom: 6, left: -6 }}>
          <CartesianGrid stroke={RULE} strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="year"
            stroke={INK}
            strokeWidth={1}
            tick={{ fill: INK, fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickMargin={10}
            axisLine={{ stroke: INK, strokeWidth: 1 }}
            tickLine={{ stroke: INK }}
          />
          <YAxis
            stroke={INK}
            tick={{ fill: INK, fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickMargin={6}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip
            cursor={{ stroke: INK, strokeDasharray: "2 4", strokeWidth: 1 }}
            contentStyle={{
              background: "#F4EFE6",
              border: `1px solid ${INK}`,
              borderRadius: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              boxShadow: "3px 3px 0 rgba(26,29,27,0.12)",
            }}
            labelStyle={{ color: INK, fontWeight: 600 }}
            formatter={(v: number | null) => (v == null ? "—" : `${v.toFixed(2)} ${trend.unit}`)}
          />
          <Line
            type="monotone"
            dataKey="aktual"
            stroke={MOSS}
            strokeWidth={2}
            dot={{ r: 4, fill: MOSS, stroke: "#F4EFE6", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: MOSS, stroke: "#F4EFE6", strokeWidth: 2 }}
            name="Aktual"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="prediksi"
            stroke={SAFFRON}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{ r: 5, fill: "#F4EFE6", stroke: SAFFRON, strokeWidth: 2 }}
            activeDot={{ r: 7, fill: SAFFRON, stroke: "#F4EFE6", strokeWidth: 2 }}
            name="Prediksi"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-3 flex items-center gap-5 border-t border-rule pt-3 font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
        <span className="flex items-center gap-1.5">
          <span className="h-[2px] w-5" style={{ background: MOSS }} /> Aktual BPS
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-[2px] w-5"
            style={{ background: `repeating-linear-gradient(to right, ${SAFFRON} 0, ${SAFFRON} 4px, transparent 4px, transparent 7px)` }}
          />
          Prediksi PanenCerdas
        </span>
      </div>
    </div>
  );
}
