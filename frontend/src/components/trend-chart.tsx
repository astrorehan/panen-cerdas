"use client";

import {
  Area,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { YieldTrend } from "@/types";

type Props = { trend: YieldTrend };

const PRIMARY = "#1F5132";
const AMBER = "#C97B1A";
const MUTED = "#6B7568";
const BORDER = "#E7E2D6";

export function TrendChart({ trend }: Props) {
  const data = trend.points.map((p) => ({
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
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="aktualGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.22} />
              <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={BORDER} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fill: MUTED, fontSize: 11 }}
            tickMargin={8}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: MUTED, fontSize: 11 }}
            tickMargin={4}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            cursor={{ stroke: PRIMARY, strokeDasharray: "2 4", strokeWidth: 1 }}
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
          <Area
            type="monotone"
            dataKey="aktual"
            stroke="transparent"
            fill="url(#aktualGrad)"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="aktual"
            stroke={PRIMARY}
            strokeWidth={2.2}
            dot={{ r: 3.5, fill: PRIMARY, stroke: "#FFFFFF", strokeWidth: 2 }}
            activeDot={{ r: 5.5, fill: PRIMARY, stroke: "#FFFFFF", strokeWidth: 2 }}
            name="Aktual"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="prediksi"
            stroke={AMBER}
            strokeWidth={2.2}
            strokeDasharray="5 4"
            dot={{ r: 4, fill: "#FFFFFF", stroke: AMBER, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: AMBER, stroke: "#FFFFFF", strokeWidth: 2 }}
            name="Prediksi"
            connectNulls
          />
        </ComposedChart>
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
          Prediksi Panen Cerdas
        </span>
      </div>
    </div>
  );
}
