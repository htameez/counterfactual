import type {
  RiskLevel,
  ToolAnnotations,
  ToolInputSchema,
  ToolMetadata,
} from "@/types";

export const TOOL_POLICIES: Record<string, ToolMetadata> = {
  get_financial_state: {
    name: "get_financial_state",
    description:
      "Read the user's current financial assumptions and protected goals before creating or comparing futures. Use this first when you need the baseline cash, income, expenses, Tesla price, emergency fund, school reserve, or moving reserve. This is read-only and makes no changes.",
    riskLevel: "read-only",
    requiresConfirmation: false,
    reversible: true,
    consequence: "Reads your financial state—no changes are made.",
  },

  update_assumption: {
    name: "update_assumption",
    description:
      "Update exactly one user-editable financial assumption, then refresh all calculated futures. Use this only when the user asks to change a number or correct an assumption. This is reversible because the user can change the value again.",
    riskLevel: "reversible",
    requiresConfirmation: false,
    reversible: true,
    consequence:
      "Modifies a single financial assumption. You can change it back anytime.",
  },

  fork_scenario: {
    name: "fork_scenario",
    description:
      "Create or update a named possible future for buying the Tesla. Provide a human-readable name, purchase price, and wait time in months. The result predicts cash remaining, protected-goal status, risk level, and an explanation. This is simulation only and does not commit the user to anything.",
    riskLevel: "simulation",
    requiresConfirmation: false,
    reversible: true,
    consequence:
      "Simulates a purchase scenario. No real money changes—this is purely exploratory.",
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
      "Preview the concrete financial outcome of one existing scenario by scenarioId. Use this when the user or agent wants to inspect a specific future in detail before deciding. This is simulation only and does not execute a purchase.",
    riskLevel: "simulation",
    requiresConfirmation: false,
    reversible: true,
    consequence:
      "Shows exactly what your finances would look like after the purchase—but does not execute it.",
  },

  commit_scenario: {
    name: "commit_scenario",
    description:
      "Request human approval to move a selected simulated future toward commitment. This represents a consequential external action and must be used only after the user has reviewed the scenario. Calling this tool should pause at an approval step; no real purchase or payment occurs in this hackathon demo.",
    riskLevel: "external-commitment",
    requiresConfirmation: true,
    reversible: false,
    consequence:
      "This would represent a real financial commitment. You must explicitly approve before it proceeds.",
  },
};

export const TOOL_INPUT_SCHEMAS: Record<string, ToolInputSchema> = {
  get_financial_state: {
    type: "object",
    description:
      "No input required. Returns the current assumptions and protected goals.",
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
        enum: [
          "cashSavings",
          "monthlyTakeHome",
          "monthlyLivingExpenses",
          "teslaPurchasePrice",
          "emergencyFundMinimum",
          "graduateSchoolReserve",
          "austinMovingCost",
          "monthlySavingsContribution",
        ],
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

  fork_scenario: {
    type: "object",
    description:
      "Create or replace a simulated Tesla purchase future. This does not execute a purchase.",
    properties: {
      name: {
        type: "string",
        minLength: 1,
        description:
          "Short human-readable scenario name, such as 'Buy Now', 'Wait 8 Months', or 'Buy Used'.",
      },
      purchasePrice: {
        type: "number",
        minimum: 0,
        description:
          "All-in Tesla purchase price for this future, in dollars.",
      },
      waitMonths: {
        type: "number",
        minimum: 0,
        description:
          "Number of months the user waits before making the purchase. Use 0 for buying now.",
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
      "Ask the user to approve a selected scenario before any consequential commitment. No real purchase occurs in this demo.",
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
