"use client";

import type { FlightRecorderEntry, Scenario } from "@/types";
import { formatCurrency } from "@/lib/financialCalculations";
import { AlertTriangle, Check, X } from "lucide-react";

interface ConfirmationModalProps {
  entry: FlightRecorderEntry;
  onApprove: () => void;
  onReject: () => void;
}

function isScenarioResult(
  value: unknown
): value is { scenario: Scenario; message?: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "scenario" in value &&
    typeof (value as { scenario: unknown }).scenario === "object"
  );
}

export default function ConfirmationModal({
  entry,
  onApprove,
  onReject,
}: ConfirmationModalProps) {
  const scenario = isScenarioResult(entry.result) ? entry.result.scenario : null;
  const goalRows = scenario
    ? [
        { label: "Emergency fund", preserved: scenario.emergencyFundPreserved },
        { label: "Graduate school reserve", preserved: scenario.graduateSchoolPreserved },
        { label: "Austin moving funds", preserved: scenario.movingFundsPreserved },
      ]
    : [];
  const compromised = goalRows.filter((g) => !g.preserved);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
      <div className="w-full max-w-md rounded-xl border border-ink-700 bg-ink-900 shadow-2xl">
        {/* Header */}
        <div className="border-b border-ink-700 bg-red-500/10 px-6 py-4 rounded-t-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-400" />
            <h2 className="text-lg font-semibold text-red-200">
              Confirm Financial Commitment
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <p className="mb-4 text-sm text-ink-300">
            This action represents a consequential external commitment. It
            cannot be undone. Please review carefully before approving.
          </p>

          {scenario ? (
            <div className="mb-6 space-y-3">
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-red-300">
                  Selected future
                </p>
                <p className="mt-1 text-base font-semibold text-ink-50">
                  {scenario.name}
                </p>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-400">Purchase amount</dt>
                    <dd className="font-medium text-ink-100">
                      {formatCurrency(scenario.purchasePrice)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-400">Cash remaining after</dt>
                    <dd className="font-medium text-ink-100">
                      {formatCurrency(scenario.cashAfterPurchase)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-400">Reversible</dt>
                    <dd className="font-medium text-red-300">No — treat as final</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg border border-ink-700 bg-ink-850 p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-400">
                  Protected goals
                </p>
                <div className="space-y-1.5">
                  {goalRows.map((g) => (
                    <div key={g.label} className="flex items-center gap-2 text-sm">
                      {g.preserved ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-red-400" />
                      )}
                      <span className={g.preserved ? "text-ink-200" : "text-red-300"}>
                        {g.label} {g.preserved ? "stays protected" : "would be compromised"}
                      </span>
                    </div>
                  ))}
                </div>
                {compromised.length > 0 && (
                  <p className="mt-2 text-xs text-amber-300">
                    Heads up: {compromised.map((g) => g.label).join(", ")}{" "}
                    {compromised.length === 1 ? "falls" : "fall"} below your
                    protected minimum in this future.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <h3 className="mb-3 font-semibold text-red-200">
                Action: {entry.toolName}
              </h3>
              <dl className="space-y-2 text-sm">
                {Object.entries(entry.toolArgs).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <dt className="text-red-300 font-medium">{key}:</dt>
                    <dd className="text-red-200">
                      {typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Important Notice */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-xs font-semibold text-amber-200 mb-1">
              IMPORTANT NOTICE
            </p>
            <p className="text-xs text-amber-200/90">
              This is a simulated hackathon demonstration. No real financial
              transaction will occur. This action is recorded in the Flight
              Recorder for review and validation purposes only.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-ink-700 bg-ink-850 px-6 py-4 flex gap-3 rounded-b-xl">
          <button
            onClick={onReject}
            className="flex-1 rounded border border-ink-600 px-4 py-2 text-sm font-medium text-ink-200 hover:bg-ink-800"
          >
            Reject
          </button>
          <button
            onClick={onApprove}
            className="flex-1 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
          >
            Approve Commitment
          </button>
        </div>
      </div>
    </div>
  );
}
