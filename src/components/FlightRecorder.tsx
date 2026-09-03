"use client";

import type { FlightRecorderEntry, Scenario, WebMCPTool } from "@/types";
import { getRiskLevelBadgeClass } from "@/lib/riskPolicy";
import { Clock, User, Zap } from "lucide-react";
import ManualToolConsole from "./ManualToolConsole";

interface FlightRecorderProps {
  entries: FlightRecorderEntry[];
  tools: WebMCPTool[];
  scenarios: Scenario[];
  onInvoke: (toolName: string, args: Record<string, unknown>) => Promise<unknown>;
}

const STATUS_COLORS: Record<string, string> = {
  Discovered: "bg-ink-700 text-ink-200",
  Simulated: "bg-indigo-500/15 text-indigo-300",
  "Awaiting Approval": "bg-amber-500/15 text-amber-300",
  Approved: "bg-emerald-500/15 text-emerald-300",
  Rejected: "bg-red-500/15 text-red-300",
  Executed: "bg-emerald-500/15 text-emerald-300",
  Failed: "bg-red-500/15 text-red-300",
};

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString();
}

export default function FlightRecorder({
  entries,
  tools,
  scenarios,
  onInvoke,
}: FlightRecorderProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-ink-700 bg-ink-900 px-4 py-3">
        <h3 className="font-semibold text-ink-50">Flight Recorder</h3>
        <p className="text-xs text-ink-400">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </p>
      </div>

      <ManualToolConsole tools={tools} scenarios={scenarios} onInvoke={onInvoke} />

      {/* Entries List */}
      <div className="scrollbar-thin flex-1 overflow-auto">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <Zap className="mb-2 h-8 w-8 text-ink-600" />
            <p className="text-sm font-medium text-ink-300">
              No tool calls yet
            </p>
            <p className="mt-2 text-xs text-ink-500">
              Run the agent, or invoke a tool above — every call lands here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-ink-800">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="border-l-4 bg-ink-900 px-4 py-3 transition-colors hover:bg-ink-850"
                style={{
                  borderLeftColor:
                    entry.riskClassification === "read-only"
                      ? "#1fc27f"
                      : entry.riskClassification === "simulation"
                        ? "#7c66ff"
                        : entry.riskClassification === "reversible"
                          ? "#ef9a0c"
                          : "#f87171",
                }}
              >
                {/* Tool Name & Status */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    <code className="text-xs font-bold text-ink-50 bg-ink-800 px-2 py-1 rounded">
                      {entry.toolName}
                    </code>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${getRiskLevelBadgeClass(entry.riskClassification)}`}
                    >
                      {entry.riskClassification}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${STATUS_COLORS[entry.status] || "bg-ink-800 text-ink-200"}`}
                  >
                    {entry.status}
                  </span>
                </div>

                {/* Origin & Timestamp */}
                <div className="flex items-center gap-4 text-xs text-ink-500 mb-2">
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
                  <div className="mb-2 rounded bg-ink-850 px-2 py-1.5 font-mono text-xs text-ink-300">
                    <p className="font-semibold text-ink-100 mb-1">args:</p>
                    <pre className="overflow-auto text-xs">
                      {JSON.stringify(entry.toolArgs, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Result (executed or rejected — either way, what happened is part of the audit trail) */}
                {Boolean(entry.result) &&
                  (entry.status === "Executed" || entry.status === "Rejected") &&
                  (() => {
                    const resultStr = JSON.stringify(entry.result, null, 2);
                    const truncated =
                      resultStr.length > 300 ? resultStr.substring(0, 300) + "..." : resultStr;
                    const isRejected = entry.status === "Rejected";
                    return (
                      <div
                        className={`mb-2 max-h-24 overflow-auto rounded px-2 py-1.5 font-mono text-xs ${
                          isRejected
                            ? "bg-red-500/10 text-red-300"
                            : "bg-emerald-500/10 text-emerald-300"
                        }`}
                      >
                        <p
                          className={`mb-1 font-semibold ${isRejected ? "text-red-200" : "text-emerald-200"}`}
                        >
                          {isRejected ? "result (rejected):" : "result:"}
                        </p>
                        <pre className="text-xs overflow-auto">{truncated}</pre>
                      </div>
                    );
                  })()}

                {/* Error (if failed) */}
                {entry.error && (
                  <div className="rounded bg-red-500/10 px-2 py-1.5 font-mono text-xs text-red-300">
                    <p className="font-semibold text-red-200">error:</p>
                    <p>{entry.error}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
