"use client";

import { useState } from "react";
import type { FinancialState } from "@/types";
import { formatCurrency } from "@/lib/financialCalculations";

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

  const monthlySavings = state.monthlyTakeHome - state.monthlyLivingExpenses;
  const totalReserves =
    state.emergencyFundMinimum +
    state.graduateSchoolReserve +
    state.austinMovingCost;

  return (
    <div className="border-b border-neutral-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-navy-900">
        Current Financial State
      </h2>

      {/* Quick Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-neutral-50 p-4">
        <div>
          <p className="text-sm text-neutral-600">Current Cash</p>
          <p className="text-xl font-bold text-navy-900">
            {formatCurrency(state.cashSavings)}
          </p>
        </div>
        <div>
          <p className="text-sm text-neutral-600">Monthly Savings</p>
          <p className="text-xl font-bold text-emerald-600">
            {formatCurrency(monthlySavings)}
          </p>
        </div>
        <div>
          <p className="text-sm text-neutral-600">Protected Goals</p>
          <p className="text-xl font-bold text-indigo-600">
            {formatCurrency(totalReserves)}
          </p>
        </div>
        <div>
          <p className="text-sm text-neutral-600">Tesla Price</p>
          <p className="text-xl font-bold text-navy-900">
            {formatCurrency(state.teslaPurchasePrice)}
          </p>
        </div>
      </div>

      {/* Question Prompt */}
      <div className="mb-6 rounded-lg border-2 border-indigo-300 bg-indigo-50 p-4">
        <p className="text-base font-semibold text-indigo-900">
          Can I buy this Tesla in cash without jeopardizing graduate school, my
          emergency fund, or a possible move to Austin?
        </p>
      </div>

      {/* Editable Fields */}
      <div className="space-y-3">
        {(Object.keys(state) as Array<keyof FinancialState>).map((field) => (
          <div key={field} className="flex items-center justify-between">
            <div className="flex-1">
              <label className="block text-sm font-medium text-navy-900">
                {FIELD_LABELS[field]}
              </label>
              <p className="text-xs text-neutral-600">
                {FIELD_DESCRIPTIONS[field]}
              </p>
            </div>
            {editingField === field ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-32 rounded border border-neutral-300 px-2 py-1 text-right text-sm focus:border-indigo-500 focus:outline-none"
                  autoFocus
                  min="0"
                  step="100"
                />
                <button
                  onClick={() => handleSave(field)}
                  className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="rounded bg-neutral-300 px-3 py-1 text-xs font-medium text-neutral-900 hover:bg-neutral-400"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleEdit(field)}
                className="rounded bg-neutral-100 px-4 py-2 text-right text-sm font-semibold text-navy-900 hover:bg-neutral-200"
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
