"use client";

import { useEffect, useState } from "react";
import type { FlightRecorderEntry, Scenario } from "@/types";
import { formatCurrency } from "@/lib/financialCalculations";
import { AlertTriangle, Check, ShieldCheck, X } from "lucide-react";

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

// Unambiguous charset (no 0/O, 1/I) for a code someone has to actually read
// off the screen and type back, not just click through.
const CODE_CHARS = "ACDEFGHJKMNPQRTUVWXY346789";
const DWELL_MS = 1800;

function generateCode(length = 4): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

/**
 * Human-verification gate for the one action in this app that's supposed to
 * require a real person: approving a financial commitment.
 *
 * WebMCP itself already refuses to let `commit_scenario` execute on its
 * own — it stops at "Awaiting Approval" and this modal is the only path
 * past that. But the modal's Approve button is still just a DOM button,
 * and anything driving the browser the way a person does (a computer-use
 * agent included) can click a DOM button. So instead of trying to detect
 * *who* is clicking — which isn't reliably possible from inside a web
 * page — this requires proof that whoever is clicking actually read a
 * piece of on-screen state that changes every time: a short code,
 * generated fresh for this approval, that must be typed back before the
 * button will do anything. A scripted clicker can't satisfy that blind.
 * A capable multimodal agent could still read and type it — this raises
 * the bar, it doesn't guarantee a human, and the code/README say so.
 */
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

  const [confirmationCode, setConfirmationCode] = useState(() => generateCode());
  const [typedCode, setTypedCode] = useState("");
  const [dwellElapsed, setDwellElapsed] = useState(false);
  const [blockedAttempt, setBlockedAttempt] = useState(false);

  // Reset the gate whenever a new approval request comes in — fresh code,
  // fresh dwell timer — and require a short deliberate pause before the
  // button can even be pressed.
  useEffect(() => {
    setConfirmationCode(generateCode());
    setTypedCode("");
    setDwellElapsed(false);
    setBlockedAttempt(false);
    const timer = setTimeout(() => setDwellElapsed(true), DWELL_MS);
    return () => clearTimeout(timer);
  }, [entry.id]);

  const codeMatches = typedCode.trim().toUpperCase() === confirmationCode;
  const canApprove = dwellElapsed && codeMatches;

  const handleApproveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Defense in depth: ignore clicks that weren't dispatched by a real
    // input event (e.g. a script calling button.click() directly). This
    // does not catch OS/CDP-level automation, which browsers still report
    // as trusted — the code + dwell timer above are the real gate.
    if (!e.isTrusted || !canApprove) {
      setBlockedAttempt(true);
      return;
    }
    onApprove();
  };

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
            <div className="mb-4 space-y-3">
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
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
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
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-xs font-semibold text-amber-200 mb-1">
              IMPORTANT NOTICE
            </p>
            <p className="text-xs text-amber-200/90">
              This is a simulated hackathon demonstration. No real financial
              transaction will occur. This action is recorded in the Flight
              Recorder for review and validation purposes only.
            </p>
          </div>

          {/* Human verification */}
          <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-4">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-indigo-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Human verification required to approve
            </p>
            <p className="mb-3 text-xs text-indigo-200/80">
              Type the code shown below. It&apos;s generated fresh for this
              approval, so nothing can click through this button blind.
            </p>
            <div className="flex items-center gap-3">
              <span className="select-none rounded border border-ink-600 bg-ink-900 px-3 py-1.5 font-mono text-sm tracking-[0.3em] text-ink-50">
                {confirmationCode}
              </span>
              <input
                value={typedCode}
                onChange={(e) => setTypedCode(e.target.value)}
                placeholder="Type code"
                maxLength={4}
                autoComplete="off"
                spellCheck={false}
                className="flex-1 rounded border border-ink-600 bg-ink-800 px-3 py-1.5 text-sm uppercase tracking-[0.2em] text-ink-50 placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-500 focus:border-indigo-400 focus:outline-none"
              />
            </div>
            {!dwellElapsed && (
              <p className="mt-2 text-[11px] text-ink-400">
                Take a moment — approval unlocks in a second.
              </p>
            )}
            {blockedAttempt && !canApprove && dwellElapsed && (
              <p className="mt-2 text-[11px] text-red-300">
                Code doesn&apos;t match yet — copy it exactly as shown above.
              </p>
            )}
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
            onClick={handleApproveClick}
            disabled={!canApprove}
            className={`flex-1 rounded px-4 py-2 text-sm font-medium transition-colors ${
              canApprove
                ? "bg-red-600 text-white hover:bg-red-500"
                : "cursor-not-allowed bg-ink-700 text-ink-400"
            }`}
          >
            {canApprove
              ? "Approve Commitment"
              : dwellElapsed
                ? "Enter code to approve"
                : "Reviewing…"}
          </button>
        </div>
      </div>
    </div>
  );
}
