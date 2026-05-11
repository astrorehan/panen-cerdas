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

export function TrendChart({ trend }: Props) {
  // Split into two series for "aktual" vs "prediksi" so we can draw different strokes
  const data = trend.points.map((p) => ({
    year: p.year,
    aktual: p.kind === "aktual" ? p.value : null,
    prediksi: p.kind === "prediksi" ? p.value : null,
  }));

  // Connect line by carrying last aktual forward into prediksi point
  let lastAktual: number | null = null;
  for (const row of data) {
    if (row.aktual != null) lastAktual = row.aktual;
    if (row.prediksi != null && row.aktual == null) row.aktual = lastAktual;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="year" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} unit={` ${trend.unit}`} width={90} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB" }}
            formatter={(v: number | null) => (v == null ? "-" : `${v.toFixed(2)} ${trend.unit}`)}
          />
          <Line
            type="monotone"
            dataKey="aktual"
            stroke="#2E7D32"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#2E7D32" }}
            name="Aktual"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="prediksi"
            stroke="#FF9800"
            strokeWidth={2.5}
            strokeDasharray="6 4"
            dot={{ r: 5, fill: "#FF9800" }}
            name="Prediksi"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
