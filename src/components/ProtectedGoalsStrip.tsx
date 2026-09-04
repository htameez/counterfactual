"use client";

import type { FinancialState, ProtectedGoal, Scenario } from "@/types";
import { formatCurrency } from "@/lib/financialCalculations";
import { AlertTriangle, CheckCircle2, Home, Shield, Sliders } from "lucide-react";

interface ProtectedGoalsStripProps {
  goals: ProtectedGoal[];
  financialState: FinancialState;
  /** The future the chips grade goals against (committed, else recommended). */
  referenceScenario: Scenario | null;
  onOpenSetup: () => void;
}

function goalIcon(name: string) {
  return /home|house|deposit|move|moving/i.test(name) ? Home : Shield;
}

export default function ProtectedGoalsStrip({
  goals,
  financialState,
  referenceScenario,
  onOpenSetup,
}: ProtectedGoalsStripProps) {
  return (
    <footer
      data-tour="protected-goals"
      className="flex h-20 shrink-0 items-center justify-between border-t border-night-600 bg-night-900 px-7"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="shrink-0 text-xs font-bold tracking-wide text-fog">
          PROTECTED GOALS
        </span>
        <div className="flex min-w-0 items-center gap-2.5 overflow-x-auto scrollbar-thin">
          {goals.map((goal) => {
            const Icon = goalIcon(goal.name);
            const status = referenceScenario?.goalStatuses.find(
              (g) => g.id === goal.id
            );
            return (
              <button
                key={goal.id}
                onClick={onOpenSetup}
                title="Edit protected goals"
                className="flex shrink-0 items-center gap-[7px] rounded-full bg-night-700 px-3 py-2 transition-colors hover:bg-night-600/60"
              >
                <Icon className="h-3.5 w-3.5 text-gold" />
                <span className="whitespace-nowrap text-xs text-frost">
                  {goal.name} {formatCurrency(goal.targetAmount)}
                </span>
                {status && !status.preserved ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-coral" />
                ) : (
                  <CheckCircle2
                    className={`h-3.5 w-3.5 ${status ? "text-aqua" : "text-fog"}`}
                  />
                )}
              </button>
            );
          })}
          {goals.length === 0 && (
            <button
              onClick={onOpenSetup}
              className="text-xs text-fog underline-offset-2 hover:text-frost hover:underline"
            >
              Add a goal to protect
            </button>
          )}
        </div>
      </div>

      <button
        onClick={onOpenSetup}
        title="Edit assumptions"
        className="flex shrink-0 items-center gap-2 text-fog transition-colors hover:text-frost"
      >
        <span className="font-mono text-xs">
          {formatCurrency(financialState.monthlyTakeHome)}/mo in ·{" "}
          {formatCurrency(financialState.monthlyLivingExpenses)}/mo out
        </span>
        <Sliders className="h-3.5 w-3.5" />
      </button>
    </footer>
  );
}
