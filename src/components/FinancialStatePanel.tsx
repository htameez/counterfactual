"use client";

import { useState } from "react";
import type { FinancialState } from "@/types";
import { formatCurrency } from "@/lib/financialCalculations";
import { Wallet } from "lucide-react";

interface FinancialStatePanelProps {
  state: FinancialState;
  onUpdate: (field: keyof FinancialState, value: number) => void;
}

const FIELD_LABELS: Record<keyof FinancialState, string> = {
  cashSavings: "Cash savings",
  monthlyTakeHome: "Monthly take-home income",
  monthlyLivingExpenses: "Monthly living expenses",
  monthlySavingsContribution: "Monthly savings contribution",
};

const FIELD_DESCRIPTIONS: Record<keyof FinancialState, string> = {
  cashSavings: "Your current liquid savings",
  monthlyTakeHome: "Your monthly income after taxes",
  monthlyLivingExpenses: "Your monthly rent, food, utilities, etc.",
  monthlySavingsContribution:
    "How much you can save each month (income − expenses)",
};

export default function FinancialStatePanel({
  state,
  onUpdate,
}: FinancialStatePanelProps) {
  const [editingField, setEditingField] = useState<keyof FinancialState | null>(
    null
  );
  const [editValue, setEditValue] = useState<string>("");

  const handleEdit = (field: keyof FinancialState) => {
    setEditingField(field);
    setEditValue(String(state[field]));
  };

  const handleSave = (field: keyof FinancialState) => {
    const value = parseFloat(editValue);
    if (!isNaN(value) && value >= 0 && isFinite(value)) {
      onUpdate(field, value);
    }
    setEditingField(null);
  };

  const handleCancel = () => {
    setEditingField(null);
  };

  return (
    <div className="border-b border-night-600 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Wallet className="h-4 w-4 text-gold" />
        <h2 className="text-lg font-bold text-frost">Where You Stand Today</h2>
      </div>

      {/* Quick Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 rounded-[18px] border border-night-600 bg-night-800 p-4">
        <div>
          <p className="text-xs text-fog">Current cash</p>
          <p className="font-mono text-xl font-bold text-frost">
            {formatCurrency(state.cashSavings)}
          </p>
        </div>
        <div>
          <p className="text-xs text-fog">Monthly savings</p>
          <p className="font-mono text-xl font-bold text-aqua">
            {formatCurrency(state.monthlySavingsContribution)}
          </p>
        </div>
      </div>

      {/* Editable Fields */}
      <div className="space-y-3">
        {(Object.keys(state) as Array<keyof FinancialState>).map((field) => (
          <div key={field} className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-frost">
                {FIELD_LABELS[field]}
              </label>
              <p className="text-xs text-fog">{FIELD_DESCRIPTIONS[field]}</p>
            </div>
            {editingField === field ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-32 rounded-lg border border-night-600 bg-night-700 px-2 py-1 text-right font-mono text-sm text-frost focus:border-gold focus:outline-none"
                  autoFocus
                  min="0"
                  step="100"
                />
                <button
                  onClick={() => handleSave(field)}
                  className="rounded-lg bg-gold px-3 py-1 text-xs font-medium text-night-950 hover:opacity-90"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="rounded-lg border border-night-600 bg-night-700 px-3 py-1 text-xs font-medium text-frost hover:bg-night-600/60"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleEdit(field)}
                className="shrink-0 rounded-lg bg-night-700 px-4 py-2 text-right font-mono text-sm font-semibold text-frost hover:bg-night-600/60"
              >
                {formatCurrency(state[field])}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
