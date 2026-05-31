"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

const weatherData = [
  { d: 1, v: 14 },
  { d: 2, v: 18 },
  { d: 3, v: 9 },
  { d: 4, v: 22 },
  { d: 5, v: 16 },
  { d: 6, v: 28 },
  { d: 7, v: 19 },
];

export default function MockupChart() {
  return (
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
  );
}
