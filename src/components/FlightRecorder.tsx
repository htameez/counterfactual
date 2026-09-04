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
  Discovered: "bg-night-700 text-fog",
  Simulated: "bg-violet/15 text-violet",
  "Awaiting Approval": "bg-gold/15 text-gold",
  Approved: "bg-aqua/15 text-aqua",
  Rejected: "bg-coral/15 text-coral",
  Executed: "bg-aqua/15 text-aqua",
  Failed: "bg-coral/15 text-coral",
};

// Route-palette accents for the entry's left border, keyed by risk.
const RISK_EDGE_COLORS: Record<string, string> = {
  "read-only": "#35d0ba",
  simulation: "#9478ff",
  reversible: "#f6c85f",
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
      <div className="border-b border-night-600 px-4 py-3">
        <h3 className="font-bold text-frost">Flight Recorder</h3>
        <p className="text-xs text-fog">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </p>
      </div>

      <ManualToolConsole tools={tools} scenarios={scenarios} onInvoke={onInvoke} />

      {/* Entries List */}
      <div className="scrollbar-thin flex-1 overflow-auto">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <Zap className="mb-2 h-8 w-8 text-night-600" />
            <p className="text-sm font-medium text-frost">No tool calls yet</p>
            <p className="mt-2 text-xs text-fog">
              Run the agent, or invoke a tool above — every call lands here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-night-600/60">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="border-l-4 px-4 py-3 transition-colors hover:bg-night-800"
                style={{
                  borderLeftColor:
                    RISK_EDGE_COLORS[entry.riskClassification] ?? "#ff6278",
                }}
              >
                {/* Tool Name & Status */}
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex flex-1 items-center gap-2">
                    <code className="rounded-lg bg-night-700 px-2 py-1 font-mono text-xs font-bold text-frost">
                      {entry.toolName}
                    </code>
                    <span
                      className={`rounded-lg px-2 py-0.5 text-xs font-medium ${getRiskLevelBadgeClass(entry.riskClassification)}`}
                    >
                      {entry.riskClassification}
                    </span>
                  </div>
                  <span
                    className={`rounded-lg px-2 py-1 text-xs font-medium ${STATUS_COLORS[entry.status] || "bg-night-700 text-fog"}`}
                  >
                    {entry.status}
                  </span>
                </div>

                {/* Origin & Timestamp */}
                <div className="mb-2 flex items-center gap-4 text-xs text-fog">
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
                  <div className="mb-2 rounded-lg bg-night-800 px-2 py-1.5 font-mono text-xs text-fog">
                    <p className="mb-1 font-semibold text-frost">args:</p>
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
                        className={`mb-2 max-h-24 overflow-auto rounded-lg px-2 py-1.5 font-mono text-xs ${
                          isRejected
                            ? "bg-coral/10 text-coral"
                            : "bg-aqua/10 text-aqua"
                        }`}
                      >
                        <p className="mb-1 font-semibold">
                          {isRejected ? "result (rejected):" : "result:"}
                        </p>
                        <pre className="overflow-auto text-xs">{truncated}</pre>
                      </div>
                    );
                  })()}

                {/* Error (if failed) */}
                {entry.error && (
                  <div className="rounded-lg bg-coral/10 px-2 py-1.5 font-mono text-xs text-coral">
                    <p className="font-semibold">error:</p>
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
