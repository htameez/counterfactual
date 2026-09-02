"use client";

import type { FlightRecorderEntry } from "@/types";
import { getRiskLevelBadgeClass } from "@/lib/riskPolicy";
import { Clock, User, Zap } from "lucide-react";

interface FlightRecorderProps {
  entries: FlightRecorderEntry[];
}

const STATUS_COLORS: Record<string, string> = {
  Discovered: "bg-blue-100 text-blue-900",
  Simulated: "bg-indigo-100 text-indigo-900",
  "Awaiting Approval": "bg-amber-100 text-amber-900",
  Approved: "bg-emerald-100 text-emerald-900",
  Rejected: "bg-red-100 text-red-900",
  Executed: "bg-emerald-100 text-emerald-900",
  Failed: "bg-red-100 text-red-900",
};

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString();
}

export default function FlightRecorder({ entries }: FlightRecorderProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <Zap className="mb-2 h-8 w-8 text-neutral-400" />
        <p className="text-sm font-medium text-neutral-600">
          WebMCP Flight Recorder
        </p>
        <p className="mt-2 text-xs text-neutral-500">
          Tool invocations will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-4 py-3">
        <h3 className="font-semibold text-navy-900">Flight Recorder</h3>
        <p className="text-xs text-neutral-600">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </p>
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-0 divide-y divide-neutral-200">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="border-l-4 border-neutral-200 bg-white px-4 py-3 transition-colors hover:bg-neutral-50"
              style={{
                borderLeftColor:
                  entry.riskClassification === "read-only"
                    ? "#059669"
                    : entry.riskClassification === "simulation"
                      ? "#2727ff"
                      : entry.riskClassification === "reversible"
                        ? "#f59e0b"
                        : "#dc2626",
              }}
            >
              {/* Tool Name & Status */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1">
                  <code className="text-xs font-bold text-navy-900 bg-neutral-100 px-2 py-1 rounded">
                    {entry.toolName}
                  </code>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${getRiskLevelBadgeClass(entry.riskClassification)}`}
                  >
                    {entry.riskClassification}
                  </span>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${STATUS_COLORS[entry.status] || "bg-neutral-100 text-neutral-900"}`}
                >
                  {entry.status}
                </span>
              </div>

              {/* Origin & Timestamp */}
              <div className="flex items-center gap-4 text-xs text-neutral-600 mb-2">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {entry.origin === "agent" ? "Agent" : "User"}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTimestamp(entry.timestamp)}
                </div>
              </div>

              {/* Arguments */}
              {Object.keys(entry.toolArgs).length > 0 && (
                <div className="mb-2 rounded bg-neutral-50 px-2 py-1.5 font-mono text-xs text-neutral-700">
                  <p className="font-semibold text-neutral-900 mb-1">args:</p>
                  <pre className="overflow-auto text-xs">
                    {JSON.stringify(entry.toolArgs, null, 2)}
                  </pre>
                </div>
              )}

              {/* Result (if completed successfully) */}
              {Boolean(entry.result) && entry.status !== "Failed" && (() => {
                const resultStr = JSON.stringify(entry.result, null, 2);
                const truncated =
                  resultStr.length > 300 ? resultStr.substring(0, 300) + "..." : resultStr;
                return (
                  <div className="mb-2 rounded bg-emerald-50 px-2 py-1.5 font-mono text-xs text-emerald-700 max-h-24 overflow-auto">
                    <p className="font-semibold text-emerald-900 mb-1">result:</p>
                    <pre className="text-xs overflow-auto">{truncated}</pre>
                  </div>
                );
              })()}

              {/* Error (if failed) */}
              {entry.error && (
                <div className="rounded bg-red-50 px-2 py-1.5 font-mono text-xs text-red-700">
                  <p className="font-semibold text-red-900">error:</p>
                  <p>{entry.error}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
