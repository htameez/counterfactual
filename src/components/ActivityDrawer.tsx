"use client";

import type {
  FlightRecorderEntry,
  Scenario,
  WebMCPContextType,
  WebMCPTool,
} from "@/types";
import { X } from "lucide-react";
import FlightRecorder from "./FlightRecorder";
import WebMCPStatus from "./WebMCPStatus";

interface ActivityDrawerProps {
  entries: FlightRecorderEntry[];
  tools: WebMCPTool[];
  scenarios: Scenario[];
  contextType: WebMCPContextType;
  onInvoke: (toolName: string, args: Record<string, unknown>) => Promise<unknown>;
  onReset: () => void;
  onClose: () => void;
}

/** Slide-over housing the Flight Recorder — the design's "Activity" view. */
export default function ActivityDrawer({
  entries,
  tools,
  scenarios,
  contextType,
  onInvoke,
  onReset,
  onClose,
}: ActivityDrawerProps) {
  return (
    <div className="animate-slide-in-right absolute inset-y-0 right-0 z-40 flex w-96 flex-col border-l border-night-600 bg-night-900 shadow-[-16px_0_32px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between border-b border-night-600 px-4 py-3">
        <WebMCPStatus contextType={contextType} />
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="text-xs text-fog underline-offset-2 hover:text-frost hover:underline"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            title="Close activity"
            className="text-fog transition-colors hover:text-frost"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <FlightRecorder
          entries={entries}
          tools={tools}
          scenarios={scenarios}
          onInvoke={onInvoke}
        />
      </div>
    </div>
  );
}
