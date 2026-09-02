"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  FinancialState,
  FlightRecorderEntry,
  Scenario,
  ToolStatus,
} from "@/types";
import {
  DEFAULT_FINANCIAL_STATE,
  SCENARIO_CONFIGS,
  calculateScenario,
} from "@/lib/financialCalculations";
import { WebMCPClient } from "@/lib/webmcp";
import {
  getToolAnnotations,
  getToolInputSchema,
  getToolPolicy,
} from "@/lib/riskPolicy";
import FinancialStatePanel from "./FinancialStatePanel";
import ScenarioComparison from "./ScenarioComparison";
import FlightRecorder from "./FlightRecorder";
import ConfirmationModal from "./ConfirmationModal";
import WebMCPStatus from "./WebMCPStatus";
import AgentControls from "./AgentControls";

type ToolOrigin = "user" | "agent";
type ToolHandler = (args: unknown, options?: { signal?: AbortSignal }) => Promise<unknown>;

export default function Dashboard() {
  const [financialState, setFinancialState] =
    useState<FinancialState>(DEFAULT_FINANCIAL_STATE);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [flightLog, setFlightLog] = useState<FlightRecorderEntry[]>([]);
  const [webmcpClient, setWebMCPClient] = useState<WebMCPClient | null>(null);
  const [pendingApproval, setPendingApproval] = useState<FlightRecorderEntry | null>(null);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [recommendedScenario, setRecommendedScenario] = useState<string | null>(null);

  // Tool handlers are registered once and must always see the *current*
  // state, not the values captured at registration time — refs give the
  // handlers a live view without forcing tools to re-register on every
  // state change.
  const financialStateRef = useRef(financialState);
  useEffect(() => {
    financialStateRef.current = financialState;
  }, [financialState]);

  const scenariosRef = useRef(scenarios);
  useEffect(() => {
    scenariosRef.current = scenarios;
  }, [scenarios]);

  const toolHandlersRef = useRef<Record<string, ToolHandler>>({});

  const updateScenarios = useCallback((state: FinancialState) => {
    const updated = SCENARIO_CONFIGS.map((config) => {
      const calculation = calculateScenario(
        state,
        config.purchasePrice,
        config.waitMonths
      );
      return {
        id: `scenario-${config.name}`,
        name: config.name,
        ...calculation,
      };
    });
    setScenarios(updated);
  }, []);

  const addFlightLogEntry = useCallback(
    (
      toolName: string,
      toolArgs: Record<string, unknown>,
      origin: ToolOrigin
    ) => {
      const policy = getToolPolicy(toolName);
      const entry: FlightRecorderEntry = {
        id: `entry-${Date.now()}-${Math.random()}`,
        toolName,
        toolArgs,
        riskClassification: policy?.riskLevel || "read-only",
        timestamp: new Date(),
        status: "Discovered",
        origin,
      };
      setFlightLog((prev) => [entry, ...prev]);
      return entry;
    },
    []
  );

  const updateFlightLogEntry = useCallback(
    (entryId: string, updates: Partial<FlightRecorderEntry>) => {
      setFlightLog((prev) =>
        prev.map((entry) =>
          entry.id === entryId ? { ...entry, ...updates } : entry
        )
      );
    },
    []
  );

  const executeToolWithRecorder = useCallback(
    async (
      toolName: string,
      args: unknown,
      origin: ToolOrigin,
      handler: ToolHandler,
      options?: { signal?: AbortSignal }
    ) => {
      const toolArgs =
        typeof args === "object" && args !== null && !Array.isArray(args)
          ? (args as Record<string, unknown>)
          : {};
      const entry = addFlightLogEntry(toolName, toolArgs, origin);

      try {
        const result = await handler(args, options);
        const status: ToolStatus =
          toolName === "simulate_purchase"
            ? "Simulated"
            : toolName === "commit_scenario"
              ? "Awaiting Approval"
              : "Executed";
        const completedEntry = { ...entry, status, result };

        updateFlightLogEntry(entry.id, completedEntry);
        if (status === "Awaiting Approval") {
          setPendingApproval(completedEntry);
        }

        return result;
      } catch (error) {
        updateFlightLogEntry(entry.id, {
          status: "Failed",
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    [addFlightLogEntry, updateFlightLogEntry]
  );

  // Register WebMCP tools once. Handlers read/write through refs and state
  // setters so they always operate on the *current* state, even though the
  // handler closures themselves are created only a single time.
  const initializeWebMCP = useCallback(async () => {
    const client = new WebMCPClient();

    // Register all tools
    const handlers: Record<string, ToolHandler> = {
      get_financial_state: async () => {
        return {
          ...financialStateRef.current,
          timestamp: new Date().toISOString(),
        };
      },

      update_assumption: async (args: any) => {
        const { field, value } = args;

        // Validate field name and value
        const validFields = Object.keys(DEFAULT_FINANCIAL_STATE);
        if (!validFields.includes(field)) {
          throw new Error(`Invalid field: ${field}`);
        }

        if (typeof value !== "number" || value < 0 || !isFinite(value)) {
          throw new Error(`Invalid value for ${field}: must be non-negative`);
        }

        const updated = { ...financialStateRef.current, [field]: value };
        setFinancialState(updated);

        // Recalculate scenarios
        updateScenarios(updated);

        return { success: true, field, value };
      },

      fork_scenario: async (args: any) => {
        const { name, purchasePrice, waitMonths } = args;

        if (typeof purchasePrice !== "number" || purchasePrice < 0) {
          throw new Error("Invalid purchasePrice");
        }
        if (typeof waitMonths !== "number" || waitMonths < 0) {
          throw new Error("Invalid waitMonths");
        }

        const id = `scenario-${Date.now()}`;
        const calculation = calculateScenario(
          financialStateRef.current,
          purchasePrice,
          waitMonths
        );

        const scenario: Scenario = {
          id,
          name,
          ...calculation,
        };

        setScenarios((prev) => {
          const existing = prev.findIndex((s) => s.name === name);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = scenario;
            return updated;
          }
          return [...prev, scenario];
        });

        return scenario;
      },

      compare_scenarios: async () => {
        const currentScenarios = scenariosRef.current;
        if (currentScenarios.length === 0) {
          return { recommended: null, all: [] };
        }

        // Find the scenario with lowest risk and most preserved goals
        const scored = currentScenarios.map((s) => ({
          scenario: s,
          score:
            (s.emergencyFundPreserved ? 3 : 0) +
            (s.graduateSchoolPreserved ? 2 : 0) +
            (s.movingFundsPreserved ? 1 : 0) +
            (s.riskLevel === "Low" ? 10 : s.riskLevel === "Medium" ? 5 : 0),
        }));

        const recommended = scored.sort((a, b) => b.score - a.score)[0];

        return {
          recommended: recommended?.scenario || null,
          all: currentScenarios,
          analysis: {
            scores: scored,
            bestChoice: recommended?.scenario.name || null,
          },
        };
      },

      simulate_purchase: async (args: any) => {
        const { scenarioId } = args;

        const scenario = scenariosRef.current.find((s) => s.id === scenarioId);
        if (!scenario) {
          throw new Error(`Scenario not found: ${scenarioId}`);
        }

        return {
          scenario,
          simulation: {
            initialCash: financialStateRef.current.cashSavings,
            purchaseAmount: scenario.purchasePrice,
            remainingCash: scenario.cashAfterPurchase,
            emergencyFundSafe: scenario.emergencyFundPreserved,
            graduateSchoolSafe: scenario.graduateSchoolPreserved,
            movingFundsSafe: scenario.movingFundsPreserved,
          },
        };
      },

      commit_scenario: async (args: any) => {
        const { scenarioId } = args;

        const scenario = scenariosRef.current.find((s) => s.id === scenarioId);
        if (!scenario) {
          throw new Error(`Scenario not found: ${scenarioId}`);
        }

        // This will trigger the approval modal and pause execution
        return {
          status: "awaiting_approval",
          scenario,
          message: `Ready to commit to ${scenario.name} scenario. Awaiting user approval.`,
        };
      },
    };
    toolHandlersRef.current = handlers;

    // Register each tool
    for (const [toolName, handler] of Object.entries(handlers)) {
      const policy = getToolPolicy(toolName);
      const inputSchema = getToolInputSchema(toolName);
      if (policy && inputSchema) {
        try {
          await client.registerTool(
            toolName,
            policy.name,
            policy.description,
            inputSchema,
            getToolAnnotations(toolName),
            (args, options) =>
              executeToolWithRecorder(
                toolName,
                args,
                "agent",
                (toolArgs) => handler(toolArgs, options),
                options
              )
          );
        } catch (error) {
          console.warn(`Failed to register tool ${toolName}:`, error);
        }
      }
    }

    setWebMCPClient(client);
    return client;
  }, [executeToolWithRecorder, updateScenarios]);

  const runAgentAnalysis = useCallback(async () => {
    if (!webmcpClient) return;

    setIsAgentRunning(true);
    setFlightLog([]);

    try {
      // Step 1: Discover tools
      const entry1 = addFlightLogEntry("discover_tools", {}, "agent");
      await new Promise((r) => setTimeout(r, 500));
      const tools = await webmcpClient.discoverTools();
      updateFlightLogEntry(entry1.id, { status: "Executed", result: tools });

      // Step 2: Get financial state
      await new Promise((r) => setTimeout(r, 500));
      await executeToolWithRecorder(
        "get_financial_state",
        {},
        "agent",
        toolHandlersRef.current.get_financial_state
      );

      // Step 3-5: Fork scenarios
      for (const config of SCENARIO_CONFIGS) {
        await new Promise((r) => setTimeout(r, 800));
        await executeToolWithRecorder(
          "fork_scenario",
          config,
          "agent",
          toolHandlersRef.current.fork_scenario
        );
      }

      // Step 6: Compare scenarios
      await new Promise((r) => setTimeout(r, 500));
      const comparison = (await executeToolWithRecorder(
        "compare_scenarios",
        {},
        "agent",
        toolHandlersRef.current.compare_scenarios
      )) as { recommended?: Scenario };

      if (comparison && comparison.recommended) {
        setRecommendedScenario(comparison.recommended.id);
      }
    } catch (error) {
      console.error("Agent analysis error:", error);
    } finally {
      setIsAgentRunning(false);
    }
  }, [webmcpClient, addFlightLogEntry, executeToolWithRecorder, updateFlightLogEntry]);

  const handleReset = useCallback(() => {
    setFinancialState(DEFAULT_FINANCIAL_STATE);
    setScenarios([]);
    setFlightLog([]);
    setRecommendedScenario(null);
    setPendingApproval(null);
  }, []);

  const handleSimulateScenario = useCallback(
    async (scenarioId: string) => {
      if (!webmcpClient) return;

      try {
        await executeToolWithRecorder(
          "simulate_purchase",
          { scenarioId },
          "user",
          toolHandlersRef.current.simulate_purchase
        );
      } catch {}
    },
    [webmcpClient, executeToolWithRecorder]
  );

  const handleCommitScenario = useCallback(
    async (scenarioId: string) => {
      if (!webmcpClient) return;

      try {
        await executeToolWithRecorder(
          "commit_scenario",
          { scenarioId },
          "user",
          toolHandlersRef.current.commit_scenario
        );
      } catch {}
    },
    [webmcpClient, executeToolWithRecorder]
  );

  // Initialize on client mount. The ref guard keeps this idempotent under
  // React Strict Mode's mount -> cleanup -> mount dev cycle, so tools are
  // only ever registered once per real mount.
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    updateScenarios(DEFAULT_FINANCIAL_STATE);

    let cancelled = false;
    let clientForCleanup: WebMCPClient | null = null;

    initializeWebMCP().then((client) => {
      if (cancelled) {
        void client.unregisterAll();
        return;
      }
      clientForCleanup = client;
    });

    return () => {
      cancelled = true;
      hasInitialized.current = false;
      void clientForCleanup?.unregisterAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApprove = useCallback(() => {
    if (pendingApproval) {
      updateFlightLogEntry(pendingApproval.id, { status: "Executed" });
      setPendingApproval(null);
    }
  }, [pendingApproval, updateFlightLogEntry]);

  const handleReject = useCallback(() => {
    if (pendingApproval) {
      updateFlightLogEntry(pendingApproval.id, { status: "Rejected" });
      setPendingApproval(null);
    }
  }, [pendingApproval, updateFlightLogEntry]);

  return (
    <div className="flex h-screen flex-col bg-neutral-50">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Counterfactual</h1>
            <p className="text-sm text-neutral-600">
              Explore the consequences of major decisions before acting
            </p>
          </div>
          <WebMCPStatus contextType={webmcpClient?.getContextType() || "unavailable"} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Financial State & Scenarios */}
        <div className="flex flex-1 flex-col overflow-auto border-r border-neutral-200">
          <FinancialStatePanel
            state={financialState}
            onUpdate={(field, value) => {
              const updated = { ...financialState, [field]: value };
              setFinancialState(updated);
              updateScenarios(updated);
            }}
          />

          <ScenarioComparison
            scenarios={scenarios}
            recommendedId={recommendedScenario}
            onSimulate={handleSimulateScenario}
            onCommit={handleCommitScenario}
          />

          <AgentControls
            isRunning={isAgentRunning}
            onRunAgent={runAgentAnalysis}
            onReset={handleReset}
          />
        </div>

        {/* Right Panel - Flight Recorder */}
        <div className="w-96 border-l border-neutral-200 bg-white">
          <FlightRecorder entries={flightLog} />
        </div>
      </div>

      {/* Confirmation Modal */}
      {pendingApproval && (
        <ConfirmationModal
          entry={pendingApproval}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
