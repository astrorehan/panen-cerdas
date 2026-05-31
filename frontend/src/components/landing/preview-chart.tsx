"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const TREND_DATA = [
  { tahun: "2018", prediksi: 5.4, aktual: 5.3 },
  { tahun: "2019", prediksi: 5.6, aktual: 5.5 },
  { tahun: "2020", prediksi: 5.8, aktual: 5.7 },
  { tahun: "2021", prediksi: 6.0, aktual: 6.1 },
  { tahun: "2022", prediksi: 6.2, aktual: 6.0 },
  { tahun: "2023", prediksi: 6.3, aktual: 6.4 },
  { tahun: "2024", prediksi: 6.4, aktual: 6.4 },
];

export default function PreviewChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={TREND_DATA}>
        <CartesianGrid stroke="#E7E2D6" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="tahun"
          tick={{ fill: "#6B7568", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#6B7568", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={30}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #E7E2D6",
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="prediksi"
          stroke="#1F5132"
          strokeWidth={2}
          dot={{ r: 3, fill: "#1F5132" }}
        />
        <Line
          type="monotone"
          dataKey="aktual"
          stroke="#C97B1A"
          strokeWidth={2}
          dot={{ r: 3, fill: "#C97B1A" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
