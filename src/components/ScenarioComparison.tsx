"use client";

import type { Scenario } from "@/types";
import { formatCurrency } from "@/lib/financialCalculations";
import { Check, AlertCircle, AlertTriangle } from "lucide-react";
import ScenarioChart from "./ScenarioChart";

interface ScenarioComparisonProps {
  scenarios: Scenario[];
  recommendedId: string | null;
  onSimulate: (scenarioId: string) => void;
  onCommit: (scenarioId: string) => void;
}

export default function ScenarioComparison({
  scenarios,
  recommendedId,
  onSimulate,
  onCommit,
}: ScenarioComparisonProps) {
  if (scenarios.length === 0) {
    return (
      <div className="border-b border-neutral-200 bg-white p-6">
        <div className="rounded-lg border border-dashed border-neutral-300 py-8 text-center">
          <p className="text-neutral-600">Run agent analysis to generate scenarios</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-neutral-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-navy-900">
        Forked Futures
      </h2>

      {/* Scenarios Grid */}
      <div className="mb-6 space-y-4">
        {scenarios.map((scenario) => (
          <div
            key={scenario.id}
            className={`rounded-lg border-2 p-4 transition-all ${
              recommendedId === scenario.id
                ? "border-emerald-400 bg-emerald-50"
                : "border-neutral-200 bg-neutral-50"
            }`}
          >
            {/* Scenario Header */}
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-navy-900">
                {scenario.name}
              </h3>
              <div className="flex gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                    scenario.riskLevel === "Low"
                      ? "bg-emerald-100 text-emerald-900"
                      : scenario.riskLevel === "Medium"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-red-100 text-red-900"
                  }`}
                >
                  {scenario.riskLevel} Risk
                </span>
                {recommendedId === scenario.id && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white">
                    <Check className="h-3 w-3" /> Recommended
                  </span>
                )}
              </div>
            </div>

            {/* Scenario Details */}
            <div className="mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Purchase price:</span>
                <span className="font-medium text-navy-900">
                  {formatCurrency(scenario.purchasePrice)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Wait period:</span>
                <span className="font-medium text-navy-900">
                  {scenario.waitMonths === 0 ? "Now" : `${scenario.waitMonths} months`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Cash after purchase:</span>
                <span className="font-medium text-navy-900">
                  {formatCurrency(scenario.cashAfterPurchase)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Total buffer after 12 months:</span>
                <span className="font-medium text-navy-900">
                  {formatCurrency(scenario.cashAfterWait)}
                </span>
              </div>
            </div>

            {/* Protected Goals Status */}
            <div className="mb-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {scenario.emergencyFundPreserved ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span
                  className={
                    scenario.emergencyFundPreserved
                      ? "text-emerald-900"
                      : "text-red-900"
                  }
                >
                  Emergency fund protected
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {scenario.graduateSchoolPreserved ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                )}
                <span
                  className={
                    scenario.graduateSchoolPreserved
                      ? "text-emerald-900"
                      : "text-amber-900"
                  }
                >
                  Graduate school reserve protected
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {scenario.movingFundsPreserved ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                )}
                <span
                  className={
                    scenario.movingFundsPreserved
                      ? "text-emerald-900"
                      : "text-amber-900"
                  }
                >
                  Austin moving funds preserved
                </span>
              </div>
            </div>

            {/* Explanation */}
            <div className="mb-4 rounded bg-white p-3 text-sm text-neutral-700">
              <p>{scenario.explanation}</p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSimulate(scenario.id)}
                className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Explore This Future
              </button>
              <button
                onClick={() => onCommit(scenario.id)}
                className="rounded border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Commit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Chart */}
      {scenarios.length > 0 && <ScenarioChart scenarios={scenarios} />}
    </div>
  );
}
