"use client";

import { Play, RotateCcw, Sparkles } from "lucide-react";

interface AgentControlsProps {
  isRunning: boolean;
  onRunAgent: () => void;
  onReset: () => void;
}

export default function AgentControls({
  isRunning,
  onRunAgent,
  onReset,
}: AgentControlsProps) {
  return (
    <div className="border-b border-ink-700 bg-ink-900/60 p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink-50">
        <Sparkles className="h-4 w-4 text-indigo-400" />
        Agent Co-Pilot
      </h2>

      <div className="space-y-3">
        <button
          onClick={onRunAgent}
          disabled={isRunning}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white shadow-sm shadow-indigo-950/40 transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-ink-400"
        >
          <Play className="h-4 w-4" />
          {isRunning ? "Running Analysis..." : "Run Agent Analysis"}
        </button>

        <button
          onClick={onReset}
          disabled={isRunning}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-ink-600 bg-ink-850 px-4 py-3 font-medium text-ink-200 transition-colors hover:bg-ink-800 disabled:text-ink-500"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Demo
        </button>

        <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3">
          <p className="text-xs text-indigo-200">
            <span className="font-semibold text-indigo-100">Demo mode:</span>{" "}
            the agent discovers your tools, forks all three futures, compares
            them against your protected goals, and recommends one — you still
            decide whether to explore or commit.
          </p>
        </div>
      </div>
    </div>
  );
}
