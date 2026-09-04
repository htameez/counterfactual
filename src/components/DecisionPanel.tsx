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
    <div className="border-b border-night-600 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Compass className="h-4 w-4 text-gold" />
        <h2 className="text-lg font-bold text-frost">Your Decision</h2>
      </div>

      {/* Editable decision */}
      <div className="mb-4 rounded-[18px] border border-night-600 bg-night-800 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium text-fog">
              What are you deciding?
            </label>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="e.g. Buy a Tesla Model 3 in cash, take 3 months unpaid leave, put a deposit on a house…"
              className="w-full rounded-lg border border-night-600 bg-night-700 px-3 py-2 text-sm text-frost placeholder:text-fog focus:border-gold focus:outline-none"
            />
          </div>
          <div className="sm:w-40">
            <label className="mb-1 block text-xs font-medium text-fog">
              All-in cost
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={baseCostDraft}
              onChange={(e) => setBaseCostDraft(e.target.value)}
              className="w-full rounded-lg border border-night-600 bg-night-700 px-3 py-2 font-mono text-sm text-frost focus:border-gold focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-fog">
            Context (optional)
          </label>
          <input
            value={descriptionDraft}
            onChange={(e) => setDescriptionDraft(e.target.value)}
            placeholder="Anything worth remembering about this decision"
            className="w-full rounded-lg border border-night-600 bg-night-700 px-3 py-2 text-sm text-frost placeholder:text-fog focus:border-gold focus:outline-none"
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[11px] text-fog">
            Forks three canonical futures onto the map (Do It Now, Wait,
            Cheaper Alternative).
          </p>
          <button
            onClick={handleSaveDecision}
            disabled={!isDirty || nameDraft.trim().length === 0}
            className="rounded-lg bg-gold px-4 py-1.5 text-sm font-medium text-night-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-night-700 disabled:text-fog"
          >
            Update Decision
          </button>
        </div>
      </div>

      {/* Prompt quote, generated from the live decision + goals */}
      <div className="mb-4 rounded-[18px] border border-gold/30 bg-gold/10 p-4">
        <p className="text-base font-semibold text-frost">
          &ldquo;{buildPromptQuote(decision, protectedGoals)}&rdquo;
        </p>
      </div>

      {/* Protected goals */}
      <div className="rounded-[18px] border border-night-600 bg-night-800 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-aqua" />
          <h3 className="text-sm font-semibold text-frost">
            What you don&apos;t want to jeopardize
          </h3>
        </div>

        {protectedGoals.length === 0 ? (
          <p className="mb-3 text-xs text-fog">
            No protected goals yet — futures will show your remaining cash but
            can&apos;t flag anything as at-risk until you add one.
          </p>
        ) : (
          <div className="mb-3 space-y-2">
            {protectedGoals.map((goal, idx) => (
              <div
                key={goal.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-night-600 bg-night-900 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 rounded bg-night-700 px-1.5 py-0.5 text-[10px] font-medium text-fog">
                    #{idx + 1}
                  </span>
                  <span className="truncate text-sm text-frost">{goal.name}</span>
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
                        className="w-24 rounded-lg border border-night-600 bg-night-700 px-2 py-1 text-right font-mono text-sm text-frost focus:border-gold focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveGoalEdit(goal)}
                        className="rounded-lg bg-gold px-2 py-1 text-xs font-medium text-night-950 hover:opacity-90"
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
                      className="rounded-lg bg-night-700 px-3 py-1 font-mono text-sm font-semibold text-frost hover:bg-night-600/60"
                    >
                      {formatCurrency(goal.targetAmount)}
                    </button>
                  )}
                  <button
                    onClick={() => onRemoveGoal(goal.name)}
                    aria-label={`Remove ${goal.name}`}
                    className="rounded-lg p-1 text-fog hover:bg-coral/10 hover:text-coral"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add a new goal */}
        <div className="flex flex-wrap items-center gap-2 border-t border-night-600 pt-3">
          <input
            value={newGoalName}
            onChange={(e) => setNewGoalName(e.target.value)}
            placeholder="Goal name, e.g. Emergency fund"
            className="min-w-0 flex-1 rounded-lg border border-night-600 bg-night-700 px-3 py-1.5 text-sm text-frost placeholder:text-fog focus:border-gold focus:outline-none"
          />
          <input
            type="number"
            min="0"
            step="100"
            value={newGoalAmount}
            onChange={(e) => setNewGoalAmount(e.target.value)}
            placeholder="Amount"
            className="w-28 rounded-lg border border-night-600 bg-night-700 px-3 py-1.5 font-mono text-sm text-frost placeholder:text-fog focus:border-gold focus:outline-none"
          />
          <button
            onClick={handleAddGoal}
            disabled={newGoalName.trim().length === 0 || newGoalAmount.trim().length === 0}
            className="flex items-center gap-1 rounded-lg bg-gold px-3 py-1.5 text-sm font-medium text-night-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-night-700 disabled:text-fog"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
