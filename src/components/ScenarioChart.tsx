"use client";

import type { Scenario } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ScenarioChartProps {
  scenarios: Scenario[];
}

export default function ScenarioChart({ scenarios }: ScenarioChartProps) {
  const data = scenarios.map((s) => ({
    name: s.name,
    "Cash right after": s.cashAfterPurchase,
    "Buffer after 12mo": s.cashAfterWait,
  }));

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-850 p-4">
      <h3 className="mb-4 text-sm font-semibold text-ink-100">
        Remaining Cash Across Futures
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3d" />
          <XAxis dataKey="name" stroke="#767d8f" tick={{ fill: "#9ba1b0", fontSize: 12 }} />
          <YAxis stroke="#767d8f" tick={{ fill: "#9ba1b0", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#151822",
              border: "1px solid #2a2f3d",
              borderRadius: "0.5rem",
              color: "#e2e4ea",
            }}
            labelStyle={{ color: "#e2e4ea" }}
            formatter={(value: any) => `$${(value as number).toLocaleString()}`}
          />
          <Legend wrapperStyle={{ color: "#9ba1b0", fontSize: 12 }} />
          <Bar dataKey="Cash right after" fill="#7c66ff" radius={[6, 6, 0, 0]} />
          <Bar dataKey="Buffer after 12mo" fill="#1fc27f" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
