"use client";

import { useState } from "react";
import type { FinancialState } from "@/types";
import { formatCurrency } from "@/lib/financialCalculations";
import { MapPin } from "lucide-react";

interface FinancialStatePanelProps {
  state: FinancialState;
  onUpdate: (field: keyof FinancialState, value: number) => void;
}

const FIELD_LABELS: Record<keyof FinancialState, string> = {
  cashSavings: "Cash savings",
  monthlyTakeHome: "Monthly take-home income",
  monthlyLivingExpenses: "Monthly living expenses",
  teslaPurchasePrice: "Tesla purchase price (incl. taxes & fees)",
  emergencyFundMinimum: "Emergency fund minimum",
  graduateSchoolReserve: "Graduate school reserve",
  austinMovingCost: "Austin moving cost",
  monthlySavingsContribution: "Monthly savings contribution",
};

const FIELD_DESCRIPTIONS: Record<keyof FinancialState, string> = {
  cashSavings: "Your current liquid savings",
  monthlyTakeHome: "Your monthly income after taxes",
  monthlyLivingExpenses: "Your monthly rent, food, utilities, etc.",
  teslaPurchasePrice: "Total cost of the Tesla (all-in)",
  emergencyFundMinimum: "The amount you want to keep as a safety net",
  graduateSchoolReserve: "Amount you want to preserve for grad school",
  austinMovingCost: "Estimated cost of relocating to Austin",
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

  const monthlySavings = state.monthlySavingsContribution;
  const totalReserves =
    state.emergencyFundMinimum +
    state.graduateSchoolReserve +
    state.austinMovingCost;

  return (
    <div className="border-b border-ink-700 bg-ink-900/60 p-6">
      <div className="mb-4 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-indigo-400" />
        <h2 className="text-lg font-semibold text-ink-50">
          Where You Stand Today
        </h2>
      </div>

      {/* Quick Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-ink-700 bg-ink-850 p-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-ink-400">Current cash</p>
          <p className="text-xl font-bold text-ink-50">
            {formatCurrency(state.cashSavings)}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-400">Monthly savings</p>
          <p className="text-xl font-bold text-emerald-400">
            {formatCurrency(monthlySavings)}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-400">Protected goals</p>
          <p className="text-xl font-bold text-indigo-300">
            {formatCurrency(totalReserves)}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-400">Tesla price</p>
          <p className="text-xl font-bold text-ink-50">
            {formatCurrency(state.teslaPurchasePrice)}
          </p>
        </div>
      </div>

      {/* Question Prompt */}
      <div className="mb-6 rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-4">
        <p className="text-base font-semibold text-indigo-100">
          &ldquo;Can I buy this Tesla in cash without jeopardizing graduate
          school, my emergency fund, or a possible move to Austin?&rdquo;
        </p>
      </div>

      {/* Editable Fields */}
      <div className="space-y-3">
        {(Object.keys(state) as Array<keyof FinancialState>).map((field) => (
          <div key={field} className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-ink-200">
                {FIELD_LABELS[field]}
              </label>
              <p className="text-xs text-ink-500">{FIELD_DESCRIPTIONS[field]}</p>
            </div>
            {editingField === field ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-32 rounded border border-ink-600 bg-ink-800 px-2 py-1 text-right text-sm text-ink-50 focus:border-indigo-400 focus:outline-none"
                  autoFocus
                  min="0"
                  step="100"
                />
                <button
                  onClick={() => handleSave(field)}
                  className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="rounded bg-ink-700 px-3 py-1 text-xs font-medium text-ink-200 hover:bg-ink-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleEdit(field)}
                className="shrink-0 rounded bg-ink-800 px-4 py-2 text-right text-sm font-semibold text-ink-100 hover:bg-ink-700"
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
