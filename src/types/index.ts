// WebMCP type definitions
export interface WebMCPTool {
  name: string;
  title?: string;
  description: string;
  inputSchema: ToolInputSchema;
  annotations?: ToolAnnotations;
  execute?: (input: unknown, options?: ToolExecuteOptions) => unknown;
}

export interface RegisteredWebMCPTool extends WebMCPTool {
  window?: Window;
  origin?: string;
  execute?: never;
}

export interface ToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
}

export interface ToolExecuteOptions {
  signal: AbortSignal;
}

export interface ToolInputSchema {
  type: "object";
  description?: string;
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface WebMCPContext {
  registerTool: (
    tool: WebMCPTool,
    options?: { exposedTo?: string[]; signal?: AbortSignal }
  ) => Promise<void>;
  getTools?: (options?: { fromOrigins?: string[] }) => Promise<RegisteredWebMCPTool[]>;
  executeTool?: (
    tool: RegisteredWebMCPTool,
    inputObject?: unknown,
    options?: { signal?: AbortSignal }
  ) => Promise<unknown>;
}

declare global {
  interface Document {
    modelContext?: WebMCPContext;
  }

  interface Navigator {
    modelContext?: WebMCPContext;
  }
}

export type RiskLevel =
  | "read-only"
  | "simulation"
  | "reversible"
  | "external-commitment"
  | "destructive";

export type ToolStatus =
  | "Discovered"
  | "Simulated"
  | "Awaiting Approval"
  | "Approved"
  | "Rejected"
  | "Executed"
  | "Failed";

export interface ToolMetadata {
  name: string;
  description: string;
  riskLevel: RiskLevel;
  requiresConfirmation: boolean;
  reversible: boolean;
  consequence: string;
}

export interface FinancialState {
  cashSavings: number;
  monthlyTakeHome: number;
  monthlyLivingExpenses: number;
  monthlySavingsContribution: number;
}

/** The decision a user is actually weighing — theirs to define, not ours. */
export interface Decision {
  name: string;
  description: string;
  baseCost: number;
}

/**
 * A user-defined reserve to protect (an emergency fund, a deposit, a
 * degree — anything). Goals are protected in the order they appear: each
 * one must be covered on top of every goal before it.
 */
export interface ProtectedGoal {
  id: string;
  name: string;
  targetAmount: number;
}

export interface GoalStatus {
  id: string;
  name: string;
  targetAmount: number;
  preserved: boolean;
}

export interface Scenario {
  id: string;
  name: string;
  purchasePrice: number;
  waitMonths: number;
  cashAfterPurchase: number;
  cashAfterWait: number;
  goalStatuses: GoalStatus[];
  totalRemainingBuffer: number;
  riskLevel: "Low" | "Medium" | "High";
  explanation: string;
}

export interface FlightRecorderEntry {
  id: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  riskClassification: RiskLevel;
  timestamp: Date;
  status: ToolStatus;
  origin: "user" | "agent";
  result?: unknown;
  error?: string;
}

export type WebMCPContextType =
  | "native"
  | "polyfilled"
  | "legacy"
  | "demo-bridge"
  | "unavailable";
