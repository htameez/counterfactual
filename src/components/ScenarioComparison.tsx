"use client";

import { useState } from "react";
import type { Scenario } from "@/types";
import { formatCurrency } from "@/lib/financialCalculations";
import { Check, AlertTriangle, GitBranch, Lock, Plus, Sparkles } from "lucide-react";
import ScenarioChart from "./ScenarioChart";

interface ScenarioComparisonProps {
  scenarios: Scenario[];
  recommendedId: string | null;
  committedId: string | null;
  currentCash: number;
  onSimulate: (scenarioId: string) => void;
  onCommit: (scenarioId: string) => void;
  onForkCustom: (name: string, purchasePrice: number, waitMonths: number) => void;
}

const RISK_STYLES: Record<
  Scenario["riskLevel"],
  { badge: string; dot: string }
> = {
  Low: { badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30", dot: "bg-emerald-400" },
  Medium: { badge: "bg-amber-500/15 text-amber-300 border border-amber-500/30", dot: "bg-amber-400" },
  High: { badge: "bg-red-500/15 text-red-300 border border-red-500/30", dot: "bg-red-400" },
};

function TimelineStrip({ scenario }: { scenario: Scenario }) {
  const horizon = Math.max(scenario.waitMonths, 12);
  const purchasePct = Math.min((scenario.waitMonths / horizon) * 100, 100);
  const dot = RISK_STYLES[scenario.riskLevel].dot;

  return (
    <div className="mt-3 mb-1">
      <div className="relative h-4">
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-ink-700" />
        <div
          className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-ink-900 bg-ink-400"
          style={{ left: "0%" }}
          title="Today"
        />
        <div
          className={`absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-ink-900 ${dot}`}
          style={{ left: `${purchasePct}%` }}
          title={scenario.waitMonths === 0 ? "Act today" : `Act at month ${scenario.waitMonths}`}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ink-500">
        <span>Today{scenario.waitMonths === 0 ? " · act" : ""}</span>
        {scenario.waitMonths > 0 && (
          <span className="text-ink-400">act · +{scenario.waitMonths}mo</span>
        )}
        <span>+{horizon}mo</span>
      </div>
    </div>
  );
}

function AddFutureCard({
  onForkCustom,
}: {
  onForkCustom: ScenarioComparisonProps["onForkCustom"];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [wait, setWait] = useState("0");

  const handleSubmit = () => {
    const priceNum = Number(price);
    const waitNum = Number(wait);
    if (name.trim().length === 0 || !isFinite(priceNum) || priceNum < 0 || !isFinite(waitNum) || waitNum < 0) {
      return;
    }
    onForkCustom(name.trim(), priceNum, waitNum);
    setName("");
    setPrice("");
    setWait("0");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink-600 p-4 text-ink-400 transition-colors hover:border-indigo-400/60 hover:text-indigo-300 min-h-[200px]"
      >
        <Plus className="h-6 w-6" />
        <span className="text-sm font-medium">Add your own future</span>
        <span className="text-center text-xs text-ink-500">
          Not one of the three defaults? Fork any price and wait period you
          want.
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-indigo-400/40 bg-ink-900 p-4">
      <h3 className="mb-3 text-sm font-semibold text-ink-50">
        Fork a custom future
      </h3>
      <div className="space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name this future"
          autoFocus
          className="w-full rounded border border-ink-600 bg-ink-800 px-3 py-1.5 text-sm text-ink-50 placeholder:text-ink-500 focus:border-indigo-400 focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            step="100"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price ($)"
            className="w-1/2 rounded border border-ink-600 bg-ink-800 px-3 py-1.5 text-sm text-ink-50 placeholder:text-ink-500 focus:border-indigo-400 focus:outline-none"
          />
          <input
            type="number"
            min="0"
            step="1"
            value={wait}
            onChange={(e) => setWait(e.target.value)}
            placeholder="Wait (months)"
            className="w-1/2 rounded border border-ink-600 bg-ink-800 px-3 py-1.5 text-sm text-ink-50 placeholder:text-ink-500 focus:border-indigo-400 focus:outline-none"
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 rounded border border-ink-600 px-3 py-1.5 text-sm font-medium text-ink-300 hover:bg-ink-800"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={name.trim().length === 0 || price.trim().length === 0}
          className="flex-1 rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-ink-500"
        >
          Fork it
        </button>
      </div>
    </div>
  );
}

export default function ScenarioComparison({
  scenarios,
  recommendedId,
  committedId,
  currentCash,
  onSimulate,
  onCommit,
  onForkCustom,
}: ScenarioComparisonProps) {
  if (scenarios.length === 0) {
    return (
      <div className="border-b border-ink-700 bg-ink-900/60 p-6">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="h-4 w-4 text-indigo-400" />
          <h2 className="text-lg font-semibold text-ink-50">Your Roadmap</h2>
        </div>
        <div className="rounded-lg border border-dashed border-ink-700 py-10 text-center">
          <p className="text-ink-400">
            Run agent analysis, or fork a future yourself, to see this
            decision play out
          </p>
        </div>
      </div>
    );
  }

  const n = scenarios.length;
  const centers = scenarios.map((_, i) => ((i + 0.5) / n) * 100);

  return (
    <div className="border-b border-ink-700 bg-ink-900/60 p-6">
      <div className="mb-1 flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-indigo-400" />
        <h2 className="text-lg font-semibold text-ink-50">Your Roadmap</h2>
      </div>
      <p className="mb-6 text-sm text-ink-400">
        Every path forks from the same point in time. Compare where each one
        leaves you — you choose which future to walk toward.
      </p>

      {/* Fork visual: "Today" node branching into every scenario */}
      <div className="relative mb-4">
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-ink-600 bg-ink-850 px-4 py-1.5 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            <span className="text-sm font-semibold text-ink-50">Today</span>
            <span className="text-sm text-ink-400">
              · {formatCurrency(currentCash)}
            </span>
          </div>
        </div>

        {n > 1 && (
          <div className="relative mx-auto mt-1 h-7 max-w-4xl">
            <div className="absolute left-1/2 top-0 h-1/2 w-px -translate-x-1/2 bg-ink-600" />
            <div
              className="absolute top-1/2 h-px bg-ink-600"
              style={{ left: `${centers[0]}%`, right: `${100 - centers[n - 1]}%` }}
            />
            {centers.map((c, i) => (
              <div
                key={i}
                className="absolute top-1/2 h-1/2 w-px bg-ink-600"
                style={{ left: `${c}%` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Scenario tiles */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {scenarios.map((scenario) => {
          const isRecommended = recommendedId === scenario.id;
          const isCommitted = committedId === scenario.id;
          const risk = RISK_STYLES[scenario.riskLevel];

          return (
            <div
              key={scenario.id}
              className={`flex flex-col rounded-xl border bg-ink-900 p-4 transition-all ${
                isCommitted
                  ? "border-emerald-400/60 shadow-[0_0_0_1px_rgba(31,194,127,0.35),0_10px_28px_-12px_rgba(31,194,127,0.55)]"
                  : isRecommended
                    ? "border-indigo-400/60 shadow-[0_0_0_1px_rgba(124,102,255,0.35),0_10px_28px_-12px_rgba(124,102,255,0.55)]"
                    : "border-ink-700 hover:border-ink-600"
              }`}
            >
              {/* Header */}
              <div className="mb-1 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${risk.dot}`} />
                <h3 className="text-base font-semibold text-ink-50">
                  {scenario.name}
                </h3>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${risk.badge}`}>
                  {scenario.riskLevel} Risk
                </span>
                {isCommitted ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 px-2.5 py-0.5 text-xs font-medium text-emerald-200">
                    <Lock className="h-3 w-3" /> Committed
                  </span>
                ) : (
                  isRecommended && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 border border-indigo-400/40 px-2.5 py-0.5 text-xs font-medium text-indigo-200">
                      <Sparkles className="h-3 w-3" /> Agent&apos;s Pick
                    </span>
                  )
                )}
              </div>
              {isCommitted && (
                <p className="mb-3 -mt-1 text-xs text-emerald-300/80">
                  This is the future you chose — its numbers are locked in
                  from the moment you approved it.
                </p>
              )}

              {/* Timeline */}
              <TimelineStrip scenario={scenario} />

              {/* Stats */}
              <div className="my-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-400">Cost</span>
                  <span className="font-medium text-ink-100">
                    {formatCurrency(scenario.purchasePrice)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-400">Cash right after</span>
                  <span className="font-medium text-ink-100">
                    {formatCurrency(scenario.cashAfterPurchase)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-400">Buffer after 12mo</span>
                  <span className="font-medium text-ink-100">
                    {formatCurrency(scenario.cashAfterWait)}
                  </span>
                </div>
              </div>

              {/* Protected Goals Status */}
              {scenario.goalStatuses.length > 0 && (
                <div className="mb-3 space-y-1.5 rounded-lg border border-ink-700 bg-ink-850 p-3">
                  {scenario.goalStatuses.map((goal) => (
                    <div key={goal.id} className="flex items-center gap-2 text-sm">
                      {goal.preserved ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                      )}
                      <span className={goal.preserved ? "text-ink-200" : "text-amber-300"}>
                        {goal.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Explanation */}
              <div className="mb-4 flex-1 rounded-lg bg-ink-850 p-3 text-sm text-ink-300">
                <p>{scenario.explanation}</p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onSimulate(scenario.id)}
                  className="rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
                >
                  Explore
                </button>
                {isCommitted ? (
                  <button
                    disabled
                    className="flex cursor-not-allowed items-center justify-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300"
                  >
                    <Lock className="h-3.5 w-3.5" /> Committed
                  </button>
                ) : (
                  <button
                    onClick={() => onCommit(scenario.id)}
                    className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20"
                  >
                    Commit
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <AddFutureCard onForkCustom={onForkCustom} />
      </div>

      {/* Comparison Chart */}
      {scenarios.length > 0 && <ScenarioChart scenarios={scenarios} />}
    </div>
  );
}
