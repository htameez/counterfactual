"use client";

import type { FlightRecorderEntry } from "@/types";
import { AlertTriangle } from "lucide-react";

interface ConfirmationModalProps {
  entry: FlightRecorderEntry;
  onApprove: () => void;
  onReject: () => void;
}

export default function ConfirmationModal({
  entry,
  onApprove,
  onReject,
}: ConfirmationModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="w-full max-w-md rounded-lg bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-neutral-200 bg-red-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h2 className="text-lg font-semibold text-red-900">
              Confirm Financial Commitment
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <p className="mb-4 text-sm text-neutral-700">
            This action represents a consequential external commitment. It cannot be
            undone. Please review carefully before approving.
          </p>

          {/* Scenario Details */}
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="mb-3 font-semibold text-red-900">
              Action: {entry.toolName}
            </h3>
            <dl className="space-y-2 text-sm">
              {Object.entries(entry.toolArgs).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <dt className="text-red-900 font-medium">{key}:</dt>
                  <dd className="text-red-800">
                    {typeof value === "object"
                      ? JSON.stringify(value)
                      : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Important Notice */}
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-900 mb-2">
              IMPORTANT NOTICE
            </p>
            <p className="text-xs text-amber-900">
              This is a simulated hackathon demonstration. No real financial
              transaction will occur. This action is recorded in the Flight Recorder
              for review and validation purposes only.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-neutral-200 bg-neutral-50 px-6 py-4 flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 rounded border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
          >
            Reject
          </button>
          <button
            onClick={onApprove}
            className="flex-1 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Approve Commitment
          </button>
        </div>
      </div>
    </div>
  );
}
