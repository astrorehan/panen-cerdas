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

const INK = "#1A1D1B";
const MOSS = "#2A3D2F";
const RULE = "#C8C0A8";

export function NdviChart({ series }: { series: NdviPoint[] }) {
  const data = series.map((p) => ({ date: p.date.slice(0, 7), ndvi: p.ndvi }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 16, bottom: 6, left: -8 }}>
          <defs>
            <linearGradient id="grad-ndvi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={MOSS} stopOpacity={0.6} />
              <stop offset="100%" stopColor={MOSS} stopOpacity={0.05} />
            </linearGradient>
            <pattern
              id="grain-ndvi"
              width="3"
              height="3"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="0.4" fill={INK} opacity="0.06" />
            </pattern>
          </defs>
          <CartesianGrid stroke={RULE} strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="date"
            stroke={INK}
            tick={{ fill: INK, fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickMargin={8}
            axisLine={{ stroke: INK }}
            tickLine={{ stroke: INK }}
            interval="preserveStartEnd"
            minTickGap={56}
          />
          <YAxis
            stroke={INK}
            tick={{ fill: INK, fontSize: 10, fontFamily: "var(--font-mono)" }}
            domain={[0, 1]}
            tickMargin={6}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <ReferenceLine y={0.5} stroke={INK} strokeDasharray="2 4" opacity={0.4} />
          <Tooltip
            cursor={{ stroke: INK, strokeDasharray: "2 4" }}
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
            formatter={(v: number) => v.toFixed(3)}
          />
          <Area
            type="monotone"
            dataKey="ndvi"
            stroke={MOSS}
            strokeWidth={2}
            fill="url(#grad-ndvi)"
          />
          {/* Grain overlay tint */}
          <Area
            type="monotone"
            dataKey="ndvi"
            stroke="none"
            fill="url(#grain-ndvi)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-3 flex items-center justify-between border-t border-rule pt-3 font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
        <span>Sentinel-2 NDVI · mean per bulan</span>
        <span>Ambang sehat ≈ 0.50</span>
      </div>
    </div>
  );
}
