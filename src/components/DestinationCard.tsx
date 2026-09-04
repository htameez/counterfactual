"use client";

import type { FinancialState, Scenario } from "@/types";
import {
  PROJECTION_HORIZON_MONTHS,
  formatCurrency,
  monthsToRebuild,
  projectedSavings,
} from "@/lib/financialCalculations";
import { ArrowRight, Lock } from "lucide-react";

interface DestinationCardProps {
  scenario: Scenario;
  routeColor: string;
  isRecommended: boolean;
  isCommitted: boolean;
  financialState: FinancialState;
  onChoose: (scenarioId: string) => void;
  onExplore: (scenarioId: string) => void;
}

export default function DestinationCard({
  scenario,
  routeColor,
  isRecommended,
  isCommitted,
  financialState,
  onChoose,
  onExplore,
}: DestinationCardProps) {
  const savings = projectedSavings(scenario, financialState);
  const rebuild = monthsToRebuild(scenario, financialState);
  const rebuildLabel =
    rebuild === null
      ? "no rebuild path"
      : rebuild === 0
        ? "buffer intact"
        : `${rebuild} mo rebuild`;

  const emphasized = isRecommended || isCommitted;

  return (
    <div
      onClick={() => onExplore(scenario.id)}
      title="Log an exploration of this future"
      data-no-pan
      data-tour="destination-card"
      className={`relative flex w-[238px] cursor-pointer flex-col items-start gap-2.5 rounded-[18px] bg-night-800 p-4 transition-transform hover:-translate-y-0.5 ${
        emphasized
          ? "border-2 shadow-[0px_0px_9px_rgba(246,200,95,0.33)]"
          : "border shadow-[0px_16px_16px_rgba(0,0,0,0.4)]"
      }`}
      style={{ borderColor: emphasized ? "#f6c85f" : routeColor }}
    >
      {isCommitted ? (
        <span className="absolute -top-[11px] left-3.5 flex items-center gap-1 rounded-full bg-gold px-2.5 py-[5px] text-[10px] font-extrabold text-night-950">
          <Lock className="h-2.5 w-2.5" /> COMMITTED
        </span>
      ) : (
        isRecommended && (
          <span
            data-tour="recommended-flag"
            className="absolute -top-[11px] left-3.5 rounded-full bg-gold px-2.5 py-[5px] text-[10px] font-extrabold text-night-950"
          >
            ★ RECOMMENDED
          </span>
        )
      )}

      <p className="text-sm font-bold text-frost">{scenario.name}</p>
      <p
        className="font-mono text-2xl font-bold"
        style={{ color: emphasized ? "#f6c85f" : routeColor }}
      >
        {formatCurrency(savings)}
      </p>
      <div className="flex w-full items-start justify-between text-[11px] text-fog">
        <span>AFTER {PROJECTION_HORIZON_MONTHS} MONTHS</span>
        <span>{rebuildLabel}</span>
      </div>
      <p className="text-xs leading-[1.4] text-frost">{scenario.explanation}</p>

      {isCommitted ? (
        <div className="flex h-10 items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 text-sm text-gold">
          <Lock className="h-[15px] w-[15px]" /> This future is yours
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChoose(scenario.id);
          }}
          className={`flex h-10 items-center gap-2 rounded-xl border px-4 text-sm transition-opacity hover:opacity-90 ${
            isRecommended
              ? "border-gold bg-gold font-medium text-night-950"
              : "border-night-600 bg-night-700 text-frost"
          }`}
        >
          <ArrowRight className="h-[15px] w-[15px]" />
          Choose this future
        </button>
      )}
    </div>
  );
}
