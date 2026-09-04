import type {
  Decision,
  FinancialState,
  GoalStatus,
  ProtectedGoal,
  Scenario,
} from "@/types";

// The app opens as a clear canvas: no finances, no decision, no goals —
// everything on the map comes from what the user (or the agent, via tools)
// actually configures.
export const DEFAULT_FINANCIAL_STATE: FinancialState = {
  cashSavings: 0,
  monthlyTakeHome: 0,
  monthlyLivingExpenses: 0,
  monthlySavingsContribution: 0,
};

export const DEFAULT_DECISION: Decision = {
  name: "",
  description: "",
  baseCost: 0,
};

export const DEFAULT_PROTECTED_GOALS: ProtectedGoal[] = [];

/** No futures can be forked until the user has named a costed decision. */
export function isDecisionDefined(decision: Decision): boolean {
  return decision.name.trim().length > 0 && decision.baseCost > 0;
}

export const DEFAULT_SCENARIO_WAIT_MONTHS = 8;
// Default "cheaper alternative" price when a new decision is defined —
// just a starting point; the wait period and this price are both editable.
export const ALTERNATIVE_COST_RATIO = 0.7;

export function defaultAlternativeCost(baseCost: number): number {
  return Math.round(baseCost * ALTERNATIVE_COST_RATIO);
}

export interface ScenarioConfig {
  name: string;
  purchasePrice: number;
  waitMonths: number;
}

/** The three canonical forks for whatever decision is currently active. */
export function buildScenarioConfigs(
  decision: Decision,
  waitMonths: number,
  alternativeCost: number
): ScenarioConfig[] {
  const waitLabel = `Wait ${waitMonths} Month${waitMonths === 1 ? "" : "s"}`;
  return [
    { name: "Do It Now", purchasePrice: decision.baseCost, waitMonths: 0 },
    { name: waitLabel, purchasePrice: decision.baseCost, waitMonths },
    { name: "Cheaper Alternative", purchasePrice: alternativeCost, waitMonths: 0 },
  ];
}

export function calculateScenario(
  state: FinancialState,
  goals: ProtectedGoal[],
  purchasePrice: number,
  waitMonths: number
): Omit<Scenario, "id" | "name"> {
  // Calculate cash after purchase (immediate or after waiting)
  let cashBefore = state.cashSavings;

  // Add savings accrued during wait period
  const monthlySavings = state.monthlySavingsContribution;
  const savingsAccrued = monthlySavings * waitMonths;
  cashBefore += savingsAccrued;

  const cashAfterPurchase = cashBefore - purchasePrice;

  // Calculate cash after the full waiting period + additional buffer
  const totalMonthsToProject = Math.max(waitMonths + 3, 12); // Project at least 12 months
  const additionalSavings = monthlySavings * Math.max(totalMonthsToProject - waitMonths, 3);
  const cashAfterWait = cashAfterPurchase + additionalSavings;

  // Goals are protected in priority order — the order the user added them
  // in. Each goal must be covered on top of every higher-priority goal
  // before it, so goal N is safe only if remaining cash covers goals 1..N.
  let cumulativeTarget = 0;
  const goalStatuses: GoalStatus[] = goals.map((goal) => {
    cumulativeTarget += goal.targetAmount;
    return {
      id: goal.id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      preserved: cashAfterPurchase >= cumulativeTarget,
    };
  });

  const totalRemainingBuffer = cashAfterPurchase;
  const compromised = goalStatuses.filter((g) => !g.preserved);

  // Low: everything protected. Medium: only the lowest-priority goal slips.
  // High: anything higher-priority than that is compromised too.
  let riskLevel: "Low" | "Medium" | "High" = "Low";
  if (compromised.length > 0) {
    const lastGoalId = goalStatuses[goalStatuses.length - 1]?.id;
    riskLevel =
      compromised.length === 1 && compromised[0].id === lastGoalId
        ? "Medium"
        : "High";
  }

  const explanation = generateExplanation(
    waitMonths,
    goalStatuses,
    cashAfterPurchase
  );

  return {
    purchasePrice,
    waitMonths,
    cashAfterPurchase,
    cashAfterWait,
    goalStatuses,
    totalRemainingBuffer,
    riskLevel,
    explanation,
  };
}

function generateExplanation(
  waitMonths: number,
  goalStatuses: GoalStatus[],
  cashAfterPurchase: number
): string {
  const timing =
    waitMonths === 0
      ? "Doing this now"
      : `Waiting ${waitMonths} month${waitMonths === 1 ? "" : "s"} first`;
  const compromised = goalStatuses.filter((g) => !g.preserved).map((g) => g.name);

  if (goalStatuses.length === 0) {
    return `${timing} leaves ${formatCurrency(cashAfterPurchase)} in the bank. Add a protected goal to see how this future measures up against what matters to you.`;
  }

  if (compromised.length === 0) {
    return `${timing} keeps every protected goal funded, with ${formatCurrency(cashAfterPurchase)} left over.`;
  }

  if (compromised.length === goalStatuses.length) {
    return `${timing} wipes out every protected goal you've set — high risk.`;
  }

  return `${timing} covers the cost but puts ${compromised.join(", ")} below target.`;
}

// Shared horizon for the future map's destination cards, so every card's
// headline number answers the same question: "where does this path leave
// me after N months?"
export const PROJECTION_HORIZON_MONTHS = 24;

export function projectedSavings(
  scenario: Pick<Scenario, "cashAfterPurchase" | "waitMonths">,
  state: FinancialState,
  horizonMonths: number = PROJECTION_HORIZON_MONTHS
): number {
  const monthsAfterPurchase = Math.max(horizonMonths - scenario.waitMonths, 0);
  return (
    scenario.cashAfterPurchase +
    state.monthlySavingsContribution * monthsAfterPurchase
  );
}

/**
 * Months of saving needed after the purchase before every protected goal
 * is covered again. 0 means the buffer never dips below the goals; null
 * means it never recovers (no monthly savings to rebuild with).
 */
export function monthsToRebuild(
  scenario: Pick<Scenario, "cashAfterPurchase" | "goalStatuses">,
  state: FinancialState
): number | null {
  const totalTargets = scenario.goalStatuses.reduce(
    (sum, g) => sum + g.targetAmount,
    0
  );
  const deficit = totalTargets - scenario.cashAfterPurchase;
  if (deficit <= 0) return 0;
  if (state.monthlySavingsContribution <= 0) return null;
  return Math.ceil(deficit / state.monthlySavingsContribution);
}

export function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

export function formatMonths(months: number): string {
  if (months === 0) return "now";
  return `${months} month${months !== 1 ? "s" : ""}`;
}
