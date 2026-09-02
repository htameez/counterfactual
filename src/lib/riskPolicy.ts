import type { RiskLevel, ToolMetadata } from "@/types";

export const TOOL_POLICIES: Record<string, ToolMetadata> = {
  get_financial_state: {
    name: "get_financial_state",
    description: "Returns the current assumptions and protected financial goals.",
    riskLevel: "read-only",
    requiresConfirmation: false,
    reversible: true,
    consequence: "Reads your financial state—no changes are made.",
  },

  update_assumption: {
    name: "update_assumption",
    description:
      "Updates one supported financial assumption and immediately refreshes the interface.",
    riskLevel: "reversible",
    requiresConfirmation: false,
    reversible: true,
    consequence:
      "Modifies a single financial assumption. You can change it back anytime.",
  },

  fork_scenario: {
    name: "fork_scenario",
    description:
      "Creates or updates a possible future and returns its calculated outcome.",
    riskLevel: "simulation",
    requiresConfirmation: false,
    reversible: true,
    consequence:
      "Simulates a purchase scenario. No real money changes—this is purely exploratory.",
  },

  compare_scenarios: {
    name: "compare_scenarios",
    description:
      "Returns the calculated outcomes for all current futures and identifies the strongest scenario.",
    riskLevel: "read-only",
    requiresConfirmation: false,
    reversible: true,
    consequence:
      "Analyzes all simulated futures and recommends the best one—no action is taken.",
  },

  simulate_purchase: {
    name: "simulate_purchase",
    description:
      "Calculates exactly what would happen if the selected purchase occurred, without changing real or committed state.",
    riskLevel: "simulation",
    requiresConfirmation: false,
    reversible: true,
    consequence:
      "Shows exactly what your finances would look like after the purchase—but does not execute it.",
  },

  commit_scenario: {
    name: "commit_scenario",
    description:
      "Represents a consequential external commitment. Requires explicit human approval before execution.",
    riskLevel: "external-commitment",
    requiresConfirmation: true,
    reversible: false,
    consequence:
      "This would represent a real financial commitment. You must explicitly approve before it proceeds.",
  },
};

export function getToolPolicy(toolName: string): ToolMetadata | null {
  return TOOL_POLICIES[toolName] || null;
}

export function getRiskLevelColor(riskLevel: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    "read-only": "text-emerald-700 bg-emerald-50 border-emerald-200",
    simulation: "text-indigo-700 bg-indigo-50 border-indigo-200",
    reversible: "text-amber-700 bg-amber-50 border-amber-200",
    "external-commitment": "text-red-700 bg-red-50 border-red-200",
    destructive: "text-red-900 bg-red-100 border-red-400",
  };
  return colors[riskLevel] || "text-neutral-700 bg-neutral-50 border-neutral-200";
}

export function getRiskLevelBadgeClass(riskLevel: RiskLevel): string {
  const classes: Record<RiskLevel, string> = {
    "read-only": "bg-emerald-100 text-emerald-900",
    simulation: "bg-indigo-100 text-indigo-900",
    reversible: "bg-amber-100 text-amber-900",
    "external-commitment": "bg-red-100 text-red-900",
    destructive: "bg-red-200 text-red-900",
  };
  return classes[riskLevel] || "bg-neutral-100 text-neutral-900";
}
