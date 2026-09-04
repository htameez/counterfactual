"use client";

import type { Decision } from "@/types";
import { formatCurrency } from "@/lib/financialCalculations";
import { startProductTour } from "@/lib/productTour";
import {
  Clock,
  GitBranch,
  HelpCircle,
  Loader2,
  Pencil,
  Sparkles,
} from "lucide-react";

interface TopBarProps {
  decision: Decision;
  hasDecision: boolean;
  isAgentRunning: boolean;
  canExplore: boolean;
  onEditDecision: () => void;
  onToggleActivity: () => void;
  onExplore: () => void;
}

export default function TopBar({
  decision,
  hasDecision,
  isAgentRunning,
  canExplore,
  onEditDecision,
  onToggleActivity,
  onExplore,
}: TopBarProps) {
  return (
    <header className="relative flex h-[84px] shrink-0 items-center justify-between border-b border-night-600 bg-night-950 px-7">
      <div data-tour="brand" className="flex items-center gap-2.5">
        <GitBranch className="h-7 w-7 text-gold" />
        <span className="text-lg text-frost">Counterfactual</span>
      </div>

      <button
        onClick={onEditDecision}
        data-tour="decision-pill"
        title={hasDecision ? "Edit this decision" : "Define your decision"}
        className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg px-3 py-1.5 text-lg transition-colors hover:bg-night-700"
      >
        {hasDecision ? (
          <>
            <span className="max-w-[24rem] truncate text-frost">
              {decision.name}
            </span>
            <span className="text-fog">—</span>
            <span className="font-mono text-frost">
              {formatCurrency(decision.baseCost)}
            </span>
          </>
        ) : (
          <span className="text-fog">Define your decision</span>
        )}
        <Pencil className="h-3.5 w-3.5 text-fog" />
      </button>

      <div className="flex items-center gap-2.5">
        <button
          onClick={() => startProductTour()}
          title="Take a tour"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-night-600 bg-night-700 text-frost transition-colors hover:bg-night-600/60"
        >
          <HelpCircle className="h-[17px] w-[17px]" />
        </button>
        <button
          onClick={onToggleActivity}
          data-tour="activity-button"
          className="flex h-10 items-center gap-2 rounded-xl border border-night-600 bg-night-700 px-4 text-sm text-frost transition-colors hover:border-night-600 hover:bg-night-600/60"
        >
          <Clock className="h-[15px] w-[15px]" />
          Activity
        </button>
        <button
          onClick={onExplore}
          disabled={!canExplore || isAgentRunning}
          data-tour="explore-futures"
          className="flex h-10 items-center gap-2 rounded-xl border border-gold bg-gold px-4 text-sm font-medium text-night-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isAgentRunning ? (
            <Loader2 className="h-[15px] w-[15px] animate-spin" />
          ) : (
            <Sparkles className="h-[15px] w-[15px]" />
          )}
          {isAgentRunning ? "Exploring…" : "Explore futures"}
        </button>
      </div>
    </header>
  );
}
