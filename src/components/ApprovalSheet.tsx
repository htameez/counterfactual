"use client";

import { useEffect, useState } from "react";
import type { FlightRecorderEntry } from "@/types";
import { isCommitScenarioResult } from "@/lib/toolResults";
import { AlertTriangle, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";

interface ApprovalSheetProps {
  entry: FlightRecorderEntry;
  onApprove: () => void;
  onReject: () => void;
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
 * The future-map styling of the approval gate. Same rules as the old
 * ConfirmationModal: `commit_scenario` stops at "Awaiting Approval", and the
 * only way past is a person reading a fresh on-screen code and typing it
 * back after a short dwell. A scripted clicker can't satisfy that blind; a
 * capable multimodal agent still could — this raises the bar, it doesn't
 * guarantee a human.
 */
export default function ApprovalSheet({
  entry,
  onApprove,
  onReject,
}: ApprovalSheetProps) {
  const scenario = isCommitScenarioResult(entry.result)
    ? entry.result.scenario
    : null;

  const [confirmationCode, setConfirmationCode] = useState(() => generateCode());
  const [typedCode, setTypedCode] = useState("");
  const [dwellElapsed, setDwellElapsed] = useState(false);
  const [blockedAttempt, setBlockedAttempt] = useState(false);

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
    // does not catch OS/CDP-level automation — the code + dwell timer
    // above are the real gate.
    if (!e.isTrusted || !canApprove) {
      setBlockedAttempt(true);
      return;
    }
    onApprove();
  };

  return (
    <div className="animate-sheet-in absolute bottom-7 right-7 z-30 flex w-[470px] flex-col gap-3.5 rounded-3xl border border-gold bg-night-700 p-5 shadow-[0px_16px_32px_rgba(0,0,0,0.4)]">
      {/* Heading */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-extrabold tracking-wide text-gold">
            READY TO COMMIT
          </p>
          <p className="mt-1 text-lg text-frost">
            Choose &ldquo;{scenario ? scenario.name : entry.toolName}&rdquo;
          </p>
        </div>
        <button
          onClick={onReject}
          title="Dismiss without committing"
          className="text-fog transition-colors hover:text-frost"
        >
          <XCircle className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Mini path */}
      <div className="flex h-5 items-center">
        <span className="h-3 w-3 rounded-full bg-frost" />
        <span
          className="h-0.5 min-w-px flex-1 bg-gold"
          style={{ boxShadow: "0 0 4px #f6c85f" }}
        />
        <span className="h-5 w-5 rounded-full border-[3px] border-gold bg-night-900 shadow-[0_0_4px_#f6c85f]" />
      </div>

      {/* Consequence summary */}
      <p className="text-sm leading-normal text-frost">
        {scenario
          ? scenario.explanation
          : "This action represents a consequential external commitment. Review carefully before approving."}
        {" "}
        Simulated demo — no real transaction occurs; this approval is recorded
        in the Flight Recorder.
      </p>

      {/* Goal impacts */}
      {scenario && scenario.goalStatuses.length > 0 && (
        <div className="flex flex-col gap-2">
          {scenario.goalStatuses.map((goal) => (
            <div key={goal.id} className="flex items-start justify-between">
              <p className="text-xs text-fog">
                {goal.name}{" "}
                {goal.preserved ? "stays protected" : "falls below target"}
              </p>
              {goal.preserved ? (
                <CheckCircle2 className="h-4 w-4 text-aqua" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-coral" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Human verification */}
      <div className="flex items-center gap-3 rounded-xl border border-night-600 bg-night-800 p-3">
        <span className="select-none rounded-lg border border-night-600 bg-night-900 px-3 py-1.5 font-mono text-sm tracking-[0.3em] text-frost">
          {confirmationCode}
        </span>
        <input
          value={typedCode}
          onChange={(e) => setTypedCode(e.target.value)}
          placeholder="Type code to approve"
          maxLength={4}
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-lg border border-night-600 bg-night-700 px-3 py-1.5 text-sm uppercase tracking-[0.2em] text-frost placeholder:normal-case placeholder:tracking-normal placeholder:text-fog focus:border-gold focus:outline-none"
        />
      </div>
      {!dwellElapsed && (
        <p className="-mt-2 text-[11px] text-fog">
          Take a moment — approval unlocks in a second.
        </p>
      )}
      {blockedAttempt && !canApprove && dwellElapsed && (
        <p className="-mt-2 text-[11px] text-coral">
          Code doesn&apos;t match yet — copy it exactly as shown.
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2.5">
        <button
          onClick={onReject}
          className="flex h-10 items-center rounded-xl border border-night-600 bg-night-700 px-4 text-sm text-frost transition-colors hover:bg-night-600/60"
        >
          Reject
        </button>
        <button
          onClick={handleApproveClick}
          disabled={!canApprove}
          className={`flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-opacity ${
            canApprove
              ? "border-gold bg-gold text-night-950 hover:opacity-90"
              : "cursor-not-allowed border-night-600 bg-night-700 text-fog"
          }`}
        >
          <ShieldCheck className="h-[15px] w-[15px]" />
          Approve future
        </button>
      </div>
    </div>
  );
}
