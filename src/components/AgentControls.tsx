"use client";

import { Play, RotateCcw } from "lucide-react";

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
    <div className="border-b border-neutral-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-navy-900">Agent</h2>

      <div className="space-y-3">
        <button
          onClick={onRunAgent}
          disabled={isRunning}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700 disabled:bg-neutral-400"
        >
          <Play className="h-4 w-4" />
          {isRunning ? "Running Analysis..." : "Run Agent Analysis"}
        </button>

        <button
          onClick={onReset}
          disabled={isRunning}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-3 font-medium text-neutral-900 hover:bg-neutral-50 disabled:text-neutral-400"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Demo
        </button>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs text-blue-900">
            <span className="font-semibold">Demo Mode:</span> The agent will
            automatically discover tools, explore scenarios, and recommend the
            best financial outcome.
          </p>
        </div>
      </div>
    </div>
  );
}
