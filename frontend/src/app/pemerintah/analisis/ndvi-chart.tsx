"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NdviPoint } from "@/types";

const PRIMARY = "#1F5132";
const MUTED = "#6B7568";
const BORDER = "#E7E2D6";

export function NdviChart({ series }: { series: NdviPoint[] }) {
  const data = series.map((p) => ({ date: p.date.slice(0, 7), ndvi: p.ndvi }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="grad-ndvi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.45} />
              <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={BORDER} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: MUTED, fontSize: 11 }}
            tickMargin={8}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={56}
          />
          <YAxis
            tick={{ fill: MUTED, fontSize: 11 }}
            domain={[0, 1]}
            tickMargin={4}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <ReferenceLine y={0.5} stroke={MUTED} strokeDasharray="2 4" opacity={0.4} />
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
            formatter={(v: number) => v.toFixed(3)}
          />
          <Area
            type="monotone"
            dataKey="ndvi"
            stroke={PRIMARY}
            strokeWidth={2.2}
            fill="url(#grad-ndvi)"
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span>Sentinel-2 NDVI - mean per bulan</span>
        <span>Ambang sehat ~ 0.50</span>
      </div>
    </div>
  );
}
