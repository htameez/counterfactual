import type {
  RiskLevel,
  ToolAnnotations,
  ToolInputSchema,
  ToolMetadata,
} from "@/types";
import { DEFAULT_FINANCIAL_STATE } from "./financialCalculations";

export const TOOL_POLICIES: Record<string, ToolMetadata> = {
  get_financial_state: {
    name: "get_financial_state",
    description:
      "Read the user's current financial assumptions, the decision they're weighing, and the goals they've asked to protect. Use this first when you need the baseline cash, income, expenses, decision cost, or protected-goal targets. This is read-only and makes no changes.",
    riskLevel: "read-only",
    requiresConfirmation: false,
    reversible: true,
    consequence: "Reads your financial state—no changes are made.",
  },

  update_assumption: {
    name: "update_assumption",
    description:
      "Update exactly one user-editable financial assumption (cash, income, expenses, or savings rate), then refresh all calculated futures. Use this only when the user asks to change a number or correct an assumption. This is reversible because the user can change the value again.",
    riskLevel: "reversible",
    requiresConfirmation: false,
    reversible: true,
    consequence:
      "Modifies a single financial assumption. You can change it back anytime.",
  },

  define_decision: {
    name: "define_decision",
    description:
      "Define or replace the decision the user is actually weighing — this is the whole point of the app, and it's the user's decision, not a fixed scenario. Give it a short name, an optional one-line description, and its all-in base cost. This resets the three canonical futures (Do It Now, Wait, Cheaper Alternative) around the new cost, but does not remove protected goals. Use this whenever the user describes a real decision they're facing, before forking any futures for it.",
    riskLevel: "reversible",
    requiresConfirmation: false,
    reversible: true,
    consequence:
      "Sets the active decision everything else is compared against. Fully reversible — define a new one anytime.",
  },

  set_protected_goal: {
    name: "set_protected_goal",
    description:
      "Add a new protected financial goal, or update the target amount of an existing one (matched by name, case-insensitive). Goals are protected in priority order — the first one added is checked first. Use this when the user names something they don't want this decision to jeopardize, e.g. an emergency fund, a deposit, a degree, a trip.",
    riskLevel: "reversible",
    requiresConfirmation: false,
    reversible: true,
    consequence:
      "Adds or updates one protected goal and recalculates every future against it. Fully reversible.",
  },

  remove_protected_goal: {
    name: "remove_protected_goal",
    description:
      "Remove a protected goal by name (case-insensitive). Use this when the user says a goal no longer applies. Every existing future is recalculated without it.",
    riskLevel: "reversible",
    requiresConfirmation: false,
    reversible: true,
    consequence:
      "Removes one protected goal and recalculates every future without it. Reversible by adding it back with set_protected_goal.",
  },

  fork_scenario: {
    name: "fork_scenario",
    description:
      "Create or update a named possible future for the active decision. Provide a human-readable name, purchase price, and wait time in months — any price and wait period, not just the three defaults, so the user can explore a future that's actually theirs. The result predicts cash remaining, protected-goal status, risk level, and an explanation. This is simulation only and does not commit the user to anything.",
    riskLevel: "simulation",
    requiresConfirmation: false,
    reversible: true,
    consequence:
      "Simulates a future for the active decision. No real money changes—this is purely exploratory.",
  },

  compare_scenarios: {
    name: "compare_scenarios",
    description:
      "Compare all currently forked futures and identify the strongest option based on protected goals and risk. Use this after creating or updating scenarios. This is read-only and does not take action on the recommendation.",
    riskLevel: "read-only",
    requiresConfirmation: false,
    reversible: true,
    consequence:
      "Analyzes all simulated futures and recommends the best one—no action is taken.",
  },

  simulate_purchase: {
    name: "simulate_purchase",
    description:
      "Preview the concrete financial outcome of one existing scenario by scenarioId. Use this when the user or agent wants to inspect a specific future in detail before deciding. This is simulation only and does not execute anything.",
    riskLevel: "simulation",
    requiresConfirmation: false,
    reversible: true,
    consequence:
      "Shows exactly what your finances would look like in this future—but does not execute it.",
  },

  commit_scenario: {
    name: "commit_scenario",
    description:
      "Request human approval to move a selected simulated future toward commitment. This represents a consequential external action and must be used only after the user has reviewed the scenario. Calling this tool should pause at an approval step; no real transaction occurs in this hackathon demo.",
    riskLevel: "external-commitment",
    requiresConfirmation: true,
    reversible: false,
    consequence:
      "This would represent a real commitment. You must explicitly approve before it proceeds.",
  },
};

export const TOOL_INPUT_SCHEMAS: Record<string, ToolInputSchema> = {
  get_financial_state: {
    type: "object",
    description:
      "No input required. Returns the current assumptions, the active decision, and protected goals.",
    properties: {},
    additionalProperties: false,
  },

  update_assumption: {
    type: "object",
    description:
      "Change one financial assumption. Use only fields from the enum and provide a non-negative numeric value.",
    properties: {
      field: {
        type: "string",
        enum: Object.keys(DEFAULT_FINANCIAL_STATE),
        description:
          "The financial assumption to update. Choose one exact field name.",
      },
      value: {
        type: "number",
        minimum: 0,
        description:
          "The new non-negative dollar amount for the selected assumption.",
      },
    },
    required: ["field", "value"],
    additionalProperties: false,
  },

  define_decision: {
    type: "object",
    description:
      "Define or replace the decision being weighed. This does not execute anything — it just sets what the rest of the app compares futures against.",
    properties: {
      name: {
        type: "string",
        minLength: 1,
        description:
          "Short human-readable name for the decision, e.g. 'Buy a Tesla Model 3 in cash', 'Take 3 months unpaid leave', 'Put a deposit on a house'.",
      },
      description: {
        type: "string",
        description: "Optional one-line context for the decision.",
      },
      baseCost: {
        type: "number",
        minimum: 0,
        description:
          "All-in cost of doing this right now, in dollars. Used as the price for the 'Do It Now' and 'Wait' futures.",
      },
    },
    required: ["name", "baseCost"],
    additionalProperties: false,
  },

  set_protected_goal: {
    type: "object",
    description:
      "Add a protected goal, or update its target amount if a goal with this name (case-insensitive) already exists.",
    properties: {
      name: {
        type: "string",
        minLength: 1,
        description:
          "Short name for the goal, e.g. 'Emergency fund', 'Wedding fund', 'Grad school reserve'.",
      },
      targetAmount: {
        type: "number",
        minimum: 0,
        description: "The non-negative dollar amount to protect for this goal.",
      },
    },
    required: ["name", "targetAmount"],
    additionalProperties: false,
  },

  remove_protected_goal: {
    type: "object",
    description: "Remove a protected goal by name (case-insensitive).",
    properties: {
      name: {
        type: "string",
        minLength: 1,
        description: "The exact name of the goal to remove.",
      },
    },
    required: ["name"],
    additionalProperties: false,
  },

  fork_scenario: {
    type: "object",
    description:
      "Create or replace a simulated future for the active decision. This does not execute anything.",
    properties: {
      name: {
        type: "string",
        minLength: 1,
        description:
          "Short human-readable scenario name, such as 'Do It Now', 'Wait 8 Months', or a custom name of your own.",
      },
      purchasePrice: {
        type: "number",
        minimum: 0,
        description: "All-in cost for this future, in dollars.",
      },
      waitMonths: {
        type: "number",
        minimum: 0,
        description:
          "Number of months the user waits before acting. Use 0 for doing it now.",
      },
    },
    required: ["name", "purchasePrice", "waitMonths"],
    additionalProperties: false,
  },

  compare_scenarios: {
    type: "object",
    description:
      "No input required. Compares all current futures and returns the recommended scenario.",
    properties: {},
    additionalProperties: false,
  },

  simulate_purchase: {
    type: "object",
    description:
      "Inspect one already-created scenario without committing to it.",
    properties: {
      scenarioId: {
        type: "string",
        minLength: 1,
        description:
          "The id of the scenario to simulate. Use a scenario id returned by fork_scenario or compare_scenarios.",
      },
    },
    required: ["scenarioId"],
    additionalProperties: false,
  },

  commit_scenario: {
    type: "object",
    description:
      "Ask the user to approve a selected scenario before any consequential commitment. No real transaction occurs in this demo.",
    properties: {
      scenarioId: {
        type: "string",
        minLength: 1,
        description:
          "The id of the scenario the user has chosen to commit to. Use only after simulation/review.",
      },
    },
    required: ["scenarioId"],
    additionalProperties: false,
  },
};

export const TOOL_ANNOTATIONS: Record<string, ToolAnnotations> = {
  get_financial_state: { readOnlyHint: true },
  update_assumption: { readOnlyHint: false },
  define_decision: { readOnlyHint: false },
  set_protected_goal: { readOnlyHint: false },
  remove_protected_goal: { readOnlyHint: false },
  fork_scenario: { readOnlyHint: false },
  compare_scenarios: { readOnlyHint: true },
  simulate_purchase: { readOnlyHint: true },
  commit_scenario: { readOnlyHint: false },
};

export function getToolPolicy(toolName: string): ToolMetadata | null {
  return TOOL_POLICIES[toolName] || null;
}

export function getToolInputSchema(toolName: string): ToolInputSchema | null {
  return TOOL_INPUT_SCHEMAS[toolName] || null;
}

export function getToolAnnotations(toolName: string): ToolAnnotations {
  return TOOL_ANNOTATIONS[toolName] || {};
}

export function getRiskLevelColor(riskLevel: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    "read-only": "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
    simulation: "text-indigo-300 bg-indigo-500/10 border-indigo-500/30",
    reversible: "text-amber-300 bg-amber-500/10 border-amber-500/30",
    "external-commitment": "text-red-300 bg-red-500/10 border-red-500/30",
    destructive: "text-red-200 bg-red-500/20 border-red-500/50",
  };
  return colors[riskLevel] || "text-ink-300 bg-ink-500/10 border-ink-500/30";
}

export function getRiskLevelBadgeClass(riskLevel: RiskLevel): string {
  const classes: Record<RiskLevel, string> = {
    "read-only": "bg-aqua/15 text-aqua border border-aqua/30",
    simulation: "bg-violet/15 text-violet border border-violet/30",
    reversible: "bg-gold/15 text-gold border border-gold/30",
    "external-commitment": "bg-coral/15 text-coral border border-coral/30",
    destructive: "bg-coral/25 text-coral border border-coral/50",
  };
  return classes[riskLevel] || "bg-night-600/30 text-fog border border-night-600";
}

/** A solid dot color for compact risk indicators (timelines, legends). */
export function getRiskLevelDotClass(riskLevel: RiskLevel): string {
  const classes: Record<RiskLevel, string> = {
    "read-only": "bg-aqua",
    simulation: "bg-violet",
    reversible: "bg-gold",
    "external-commitment": "bg-coral",
    destructive: "bg-coral",
  };
  return classes[riskLevel] || "bg-fog";
}
