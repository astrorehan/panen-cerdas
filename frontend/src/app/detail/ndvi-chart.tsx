"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NdviPoint } from "@/types";

export function NdviChart({ series }: { series: NdviPoint[] }) {
  const data = series.map((p) => ({
    date: p.date.slice(0, 7),
    ndvi: p.ndvi,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="grad-ndvi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2E7D32" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#2E7D32" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            interval="preserveStartEnd"
            minTickGap={48}
          />
          <YAxis tickLine={false} axisLine={false} fontSize={12} domain={[0, 1]} width={40} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB" }}
            formatter={(v: number) => v.toFixed(3)}
          />
          <Area
            type="monotone"
            dataKey="ndvi"
            stroke="#2E7D32"
            strokeWidth={2}
            fill="url(#grad-ndvi)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
