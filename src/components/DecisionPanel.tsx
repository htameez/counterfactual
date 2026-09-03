"use client";

import { useEffect, useState } from "react";
import type { Decision, ProtectedGoal } from "@/types";
import { formatCurrency } from "@/lib/financialCalculations";
import { Compass, Plus, Shield, X } from "lucide-react";

interface DecisionPanelProps {
  decision: Decision;
  protectedGoals: ProtectedGoal[];
  onDefineDecision: (name: string, description: string, baseCost: number) => void;
  onSetGoal: (name: string, targetAmount: number) => void;
  onRemoveGoal: (name: string) => void;
}

function buildPromptQuote(decision: Decision, goals: ProtectedGoal[]): string {
  const verb = decision.name.trim() || "do this";
  if (goals.length === 0) {
    return `Can I ${verb.charAt(0).toLowerCase()}${verb.slice(1)}? (Add a protected goal below to check it against something that matters to you.)`;
  }
  const names = goals.map((g) => g.name);
  const goalList =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")}${names.length > 2 ? "," : ""} or ${names[names.length - 1]}`;
  return `Can I ${verb.charAt(0).toLowerCase()}${verb.slice(1)} without jeopardizing ${goalList}?`;
}

export default function DecisionPanel({
  decision,
  protectedGoals,
  onDefineDecision,
  onSetGoal,
  onRemoveGoal,
}: DecisionPanelProps) {
  const [nameDraft, setNameDraft] = useState(decision.name);
  const [descriptionDraft, setDescriptionDraft] = useState(decision.description);
  const [baseCostDraft, setBaseCostDraft] = useState(String(decision.baseCost));

  useEffect(() => {
    setNameDraft(decision.name);
    setDescriptionDraft(decision.description);
    setBaseCostDraft(String(decision.baseCost));
  }, [decision]);

  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalEditValue, setGoalEditValue] = useState("");
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalAmount, setNewGoalAmount] = useState("");

  const baseCostNumber = Number(baseCostDraft);
  const isDirty =
    nameDraft.trim() !== decision.name ||
    descriptionDraft.trim() !== decision.description ||
    !isFinite(baseCostNumber) ||
    baseCostNumber !== decision.baseCost;

  const handleSaveDecision = () => {
    const cost = Number(baseCostDraft);
    if (nameDraft.trim().length === 0 || !isFinite(cost) || cost < 0) return;
    onDefineDecision(nameDraft.trim(), descriptionDraft.trim(), cost);
  };

  const handleAddGoal = () => {
    const amount = Number(newGoalAmount);
    if (newGoalName.trim().length === 0 || !isFinite(amount) || amount < 0) return;
    onSetGoal(newGoalName.trim(), amount);
    setNewGoalName("");
    setNewGoalAmount("");
  };

  const handleSaveGoalEdit = (goal: ProtectedGoal) => {
    const amount = Number(goalEditValue);
    if (isFinite(amount) && amount >= 0) {
      onSetGoal(goal.name, amount);
    }
    setEditingGoalId(null);
  };

  return (
    <div className="border-b border-ink-700 bg-ink-900/60 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Compass className="h-4 w-4 text-indigo-400" />
        <h2 className="text-lg font-semibold text-ink-50">Your Decision</h2>
      </div>

      {/* Editable decision */}
      <div className="mb-4 rounded-lg border border-ink-700 bg-ink-850 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-400">
              What are you deciding?
            </label>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="e.g. Buy a Tesla Model 3 in cash, take 3 months unpaid leave, put a deposit on a house…"
              className="w-full rounded border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-ink-50 placeholder:text-ink-500 focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div className="sm:w-40">
            <label className="mb-1 block text-xs font-medium text-ink-400">
              All-in cost
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={baseCostDraft}
              onChange={(e) => setBaseCostDraft(e.target.value)}
              className="w-full rounded border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-ink-50 focus:border-indigo-400 focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-ink-400">
            Context (optional)
          </label>
          <input
            value={descriptionDraft}
            onChange={(e) => setDescriptionDraft(e.target.value)}
            placeholder="Anything worth remembering about this decision"
            className="w-full rounded border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-ink-50 placeholder:text-ink-500 focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[11px] text-ink-500">
            Updates the three canonical futures below (Do It Now, Wait, Cheaper
            Alternative).
          </p>
          <button
            onClick={handleSaveDecision}
            disabled={!isDirty || nameDraft.trim().length === 0}
            className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-ink-500"
          >
            Update Decision
          </button>
        </div>
      </div>

      {/* Prompt quote, generated from the live decision + goals */}
      <div className="mb-4 rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-4">
        <p className="text-base font-semibold text-indigo-100">
          &ldquo;{buildPromptQuote(decision, protectedGoals)}&rdquo;
        </p>
      </div>

      {/* Protected goals */}
      <div className="rounded-lg border border-ink-700 bg-ink-850 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          <h3 className="text-sm font-semibold text-ink-100">
            What you don&apos;t want to jeopardize
          </h3>
        </div>

        {protectedGoals.length === 0 ? (
          <p className="mb-3 text-xs text-ink-500">
            No protected goals yet — futures will show your remaining cash but
            can&apos;t flag anything as at-risk until you add one.
          </p>
        ) : (
          <div className="mb-3 space-y-2">
            {protectedGoals.map((goal, idx) => (
              <div
                key={goal.id}
                className="flex items-center justify-between gap-2 rounded border border-ink-700 bg-ink-900 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 rounded bg-ink-800 px-1.5 py-0.5 text-[10px] font-medium text-ink-400">
                    #{idx + 1}
                  </span>
                  <span className="truncate text-sm text-ink-100">{goal.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {editingGoalId === goal.id ? (
                    <>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        autoFocus
                        value={goalEditValue}
                        onChange={(e) => setGoalEditValue(e.target.value)}
                        className="w-24 rounded border border-ink-600 bg-ink-800 px-2 py-1 text-right text-sm text-ink-50 focus:border-indigo-400 focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveGoalEdit(goal)}
                        className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500"
                      >
                        Save
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingGoalId(goal.id);
                        setGoalEditValue(String(goal.targetAmount));
                      }}
                      className="rounded bg-ink-800 px-3 py-1 text-sm font-semibold text-ink-100 hover:bg-ink-700"
                    >
                      {formatCurrency(goal.targetAmount)}
                    </button>
                  )}
                  <button
                    onClick={() => onRemoveGoal(goal.name)}
                    aria-label={`Remove ${goal.name}`}
                    className="rounded p-1 text-ink-500 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add a new goal */}
        <div className="flex flex-wrap items-center gap-2 border-t border-ink-700 pt-3">
          <input
            value={newGoalName}
            onChange={(e) => setNewGoalName(e.target.value)}
            placeholder="Goal name, e.g. Emergency fund"
            className="min-w-0 flex-1 rounded border border-ink-600 bg-ink-800 px-3 py-1.5 text-sm text-ink-50 placeholder:text-ink-500 focus:border-indigo-400 focus:outline-none"
          />
          <input
            type="number"
            min="0"
            step="100"
            value={newGoalAmount}
            onChange={(e) => setNewGoalAmount(e.target.value)}
            placeholder="Amount"
            className="w-28 rounded border border-ink-600 bg-ink-800 px-3 py-1.5 text-sm text-ink-50 placeholder:text-ink-500 focus:border-indigo-400 focus:outline-none"
          />
          <button
            onClick={handleAddGoal}
            disabled={newGoalName.trim().length === 0 || newGoalAmount.trim().length === 0}
            className="flex items-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-ink-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
