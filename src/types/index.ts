// WebMCP type definitions
export interface WebMCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface WebMCPContext {
  registerTool: (
    name: string,
    description: string,
    inputSchema: unknown,
    handler: (args: unknown) => unknown
  ) => Promise<void>;

  invokeTool: (name: string, args: unknown) => Promise<unknown>;
  discoverTools: () => Promise<WebMCPTool[]>;
  // Not part of every WebMCP draft implementation, so callers must check
  // for it before use ("clean up ... if the API permits it").
  unregisterTool?: (name: string) => Promise<void> | void;
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
  teslaPurchasePrice: number;
  emergencyFundMinimum: number;
  graduateSchoolReserve: number;
  austinMovingCost: number;
  monthlySavingsContribution: number;
}

export interface Scenario {
  id: string;
  name: string;
  purchasePrice: number;
  waitMonths: number;
  cashAfterPurchase: number;
  cashAfterWait: number;
  emergencyFundPreserved: boolean;
  graduateSchoolPreserved: boolean;
  movingFundsPreserved: boolean;
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
  | "legacy"
  | "demo-bridge"
  | "unavailable";
