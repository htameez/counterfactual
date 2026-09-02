import type { FinancialState, Scenario } from "@/types";

export const DEFAULT_FINANCIAL_STATE: FinancialState = {
  cashSavings: 72000,
  monthlyTakeHome: 6000,
  monthlyLivingExpenses: 3200,
  teslaPurchasePrice: 44000,
  emergencyFundMinimum: 19200,
  graduateSchoolReserve: 18000,
  austinMovingCost: 6000,
  monthlySavingsContribution: 2800,
};

export const SCENARIO_CONFIGS = [
  { name: "Buy Now", purchasePrice: 44000, waitMonths: 0 },
  { name: "Wait 8 Months", purchasePrice: 44000, waitMonths: 8 },
  { name: "Buy Used", purchasePrice: 32000, waitMonths: 0 },
];

export function calculateScenario(
  state: FinancialState,
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

  // Check if protected goals are preserved
  const emergencyFundPreserved = cashAfterPurchase >= state.emergencyFundMinimum;
  const graduateSchoolPreserved =
    cashAfterPurchase >=
    state.emergencyFundMinimum + state.graduateSchoolReserve;
  const movingFundsPreserved =
    cashAfterPurchase >=
    state.emergencyFundMinimum +
      state.graduateSchoolReserve +
      state.austinMovingCost;

  // Calculate total remaining buffer
  const totalRemainingBuffer = cashAfterPurchase;

  // Determine risk level
  let riskLevel: "Low" | "Medium" | "High" = "Low";
  if (!movingFundsPreserved) {
    riskLevel = "High";
  } else if (!graduateSchoolPreserved) {
    riskLevel = "Medium";
  }

  // Generate explanation
  const explanation = generateExplanation(
    waitMonths,
    purchasePrice,
    emergencyFundPreserved,
    graduateSchoolPreserved,
    movingFundsPreserved
  );

  return {
    purchasePrice,
    waitMonths,
    cashAfterPurchase,
    cashAfterWait,
    emergencyFundPreserved,
    graduateSchoolPreserved,
    movingFundsPreserved,
    totalRemainingBuffer,
    riskLevel,
    explanation,
  };
}

function generateExplanation(
  waitMonths: number,
  purchasePrice: number,
  emergencyPreserved: boolean,
  schoolPreserved: boolean,
  movingPreserved: boolean
): string {
  if (waitMonths === 0 && purchasePrice === 44000) {
    if (!emergencyPreserved) {
      return "Buying now depletes your emergency fund. High financial risk.";
    }
    if (!schoolPreserved) {
      return "Buying now preserves emergency fund but risks grad school reserve.";
    }
    return "Buying now is safe but leaves minimal buffer for moves.";
  }

  if (waitMonths === 8) {
    if (movingPreserved) {
      return "Waiting 8 months lets you save enough to preserve all goals.";
    }
    return "Waiting 8 months improves your position but may still compress reserves.";
  }

  if (purchasePrice === 32000) {
    if (movingPreserved) {
      return "Buying used is the most conservative option—all goals are safe.";
    }
    return "Buying used frees up capital while preserving most reserves.";
  }

  return "Scenario analysis complete.";
}

export function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

export function formatMonths(months: number): string {
  if (months === 0) return "now";
  return `${months} month${months !== 1 ? "s" : ""}`;
}
