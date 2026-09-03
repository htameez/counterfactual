import type { Scenario } from "@/types";

export interface CommitScenarioResult {
  scenario: Scenario;
  message?: string;
}

/**
 * Type guard for commit_scenario's return shape ({ scenario, message? }).
 * Shared between the approval modal (to show what's being committed) and
 * the Dashboard's approve handler (to actually apply it).
 */
export function isCommitScenarioResult(
  value: unknown
): value is CommitScenarioResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "scenario" in value &&
    typeof (value as { scenario: unknown }).scenario === "object"
  );
}
