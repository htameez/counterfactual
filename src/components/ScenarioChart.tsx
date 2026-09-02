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
    "Remaining Buffer": s.totalRemainingBuffer,
    "After 12 Months": s.cashAfterWait,
    "Emergency Fund Min": s.emergencyFundPreserved
      ? 0
      : -1000, // Visual indicator
  }));

  return (
    <div className="mt-6">
      <h3 className="mb-4 text-sm font-semibold text-navy-900">
        Remaining Cash Across Futures
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e1" />
          <XAxis dataKey="name" stroke="#5a5a52" />
          <YAxis stroke="#5a5a52" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e8e8e1",
              borderRadius: "0.5rem",
            }}
            formatter={(value: any) => `$${(value as number).toLocaleString()}`}
          />
          <Legend />
          <Bar dataKey="Remaining Buffer" fill="#2727ff" radius={[8, 8, 0, 0]} />
          <Bar dataKey="After 12 Months" fill="#22c55e" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
