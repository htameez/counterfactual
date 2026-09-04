"use client";

import type { Decision, FinancialState, ProtectedGoal } from "@/types";
import { X } from "lucide-react";
import DecisionPanel from "./DecisionPanel";
import FinancialStatePanel from "./FinancialStatePanel";

interface SetupDrawerProps {
  financialState: FinancialState;
  decision: Decision;
  protectedGoals: ProtectedGoal[];
  onUpdateFinancialState: (field: keyof FinancialState, value: number) => void;
  onDefineDecision: (name: string, description: string, baseCost: number) => void;
  onSetGoal: (name: string, targetAmount: number) => void;
  onRemoveGoal: (name: string) => void;
  onClose: () => void;
}

/**
 * Slide-over for everything the map summarizes but doesn't edit inline:
 * the decision itself, the financial assumptions, and the protected goals.
 * Opened from the top bar's pencil and the goal strip's sliders.
 */
export default function SetupDrawer({
  financialState,
  decision,
  protectedGoals,
  onUpdateFinancialState,
  onDefineDecision,
  onSetGoal,
  onRemoveGoal,
  onClose,
}: SetupDrawerProps) {
  return (
    <div className="animate-slide-in-right absolute inset-y-0 right-0 z-40 flex w-[26rem] flex-col border-l border-night-600 bg-night-900 shadow-[-16px_0_32px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between border-b border-night-600 px-4 py-3">
        <p className="text-sm font-semibold text-frost">
          Decision, assumptions &amp; goals
        </p>
        <button
          onClick={onClose}
          title="Close setup"
          className="text-fog transition-colors hover:text-frost"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <FinancialStatePanel
          state={financialState}
          onUpdate={onUpdateFinancialState}
        />
        <DecisionPanel
          decision={decision}
          protectedGoals={protectedGoals}
          onDefineDecision={onDefineDecision}
          onSetGoal={onSetGoal}
          onRemoveGoal={onRemoveGoal}
        />
      </div>
    </div>
  );
}
