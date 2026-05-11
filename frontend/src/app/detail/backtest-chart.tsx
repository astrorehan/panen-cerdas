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
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="year" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} unit=" t/ha" width={56} />
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB" }} />
          <Line
            type="monotone"
            dataKey="aktual"
            stroke="#2E7D32"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#2E7D32" }}
            name="Aktual (BPS)"
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
