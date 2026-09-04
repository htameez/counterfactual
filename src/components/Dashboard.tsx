"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  Decision,
  FinancialState,
  FlightRecorderEntry,
  ProtectedGoal,
  Scenario,
  ToolStatus,
  WebMCPTool,
} from "@/types";
import {
  DEFAULT_DECISION,
  DEFAULT_FINANCIAL_STATE,
  DEFAULT_PROTECTED_GOALS,
  DEFAULT_SCENARIO_WAIT_MONTHS,
  buildScenarioConfigs,
  calculateScenario,
  defaultAlternativeCost,
  isDecisionDefined,
} from "@/lib/financialCalculations";
import { WebMCPClient } from "@/lib/webmcp";
import {
  getToolAnnotations,
  getToolInputSchema,
  getToolPolicy,
} from "@/lib/riskPolicy";
import { isCommitScenarioResult } from "@/lib/toolResults";
import TopBar from "./TopBar";
import FutureMap from "./FutureMap";
import ProtectedGoalsStrip from "./ProtectedGoalsStrip";
import ApprovalSheet from "./ApprovalSheet";
import ActivityDrawer from "./ActivityDrawer";
import SetupDrawer from "./SetupDrawer";

type ToolOrigin = "user" | "agent";
type ToolHandler = (args: unknown, options?: { signal?: AbortSignal }) => Promise<unknown>;

export default function Dashboard() {
  const [financialState, setFinancialState] =
    useState<FinancialState>(DEFAULT_FINANCIAL_STATE);
  const [decision, setDecision] = useState<Decision>(DEFAULT_DECISION);
  const [protectedGoals, setProtectedGoals] = useState<ProtectedGoal[]>(
    DEFAULT_PROTECTED_GOALS
  );
  const [scenarioParams, setScenarioParams] = useState({
    waitMonths: DEFAULT_SCENARIO_WAIT_MONTHS,
    alternativeCost: defaultAlternativeCost(DEFAULT_DECISION.baseCost),
  });
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [flightLog, setFlightLog] = useState<FlightRecorderEntry[]>([]);
  const [webmcpClient, setWebMCPClient] = useState<WebMCPClient | null>(null);
  const [pendingApproval, setPendingApproval] = useState<FlightRecorderEntry | null>(null);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [recommendedScenario, setRecommendedScenario] = useState<string | null>(null);
  const [committedScenarioId, setCommittedScenarioId] = useState<string | null>(null);
  const [discoveredTools, setDiscoveredTools] = useState<WebMCPTool[]>([]);
  const [activityOpen, setActivityOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  // Tool handlers are registered once and must always see the *current*
  // state, not the values captured at registration time — refs give the
  // handlers a live view without forcing tools to re-register on every
  // state change.
  const financialStateRef = useRef(financialState);
  useEffect(() => {
    financialStateRef.current = financialState;
  }, [financialState]);

  const decisionRef = useRef(decision);
  useEffect(() => {
    decisionRef.current = decision;
  }, [decision]);

  const protectedGoalsRef = useRef(protectedGoals);
  useEffect(() => {
    protectedGoalsRef.current = protectedGoals;
  }, [protectedGoals]);

  const scenariosRef = useRef(scenarios);
  useEffect(() => {
    scenariosRef.current = scenarios;
  }, [scenarios]);

  const committedScenarioIdRef = useRef(committedScenarioId);
  useEffect(() => {
    committedScenarioIdRef.current = committedScenarioId;
  }, [committedScenarioId]);

  const toolHandlersRef = useRef<Record<string, ToolHandler>>({});

  // Recompute every existing scenario's numbers in place (financial state
  // or protected goals changed, but the futures themselves didn't). The
  // committed scenario, if any, is left untouched — it represents a future
  // that already happened, so it shouldn't be silently recomputed against
  // its own aftermath (e.g. "can I still buy the Tesla I just bought?").
  // `committedId` overrides the ref for the same-tick case right after a
  // commit, before the ref's sync effect has had a render to catch up.
  const refreshAllScenarios = useCallback(
    (
      state: FinancialState,
      goals: ProtectedGoal[],
      committedId: string | null = committedScenarioIdRef.current
    ) => {
      setScenarios((prev) =>
        prev.map((s) =>
          s.id === committedId
            ? s
            : { ...s, ...calculateScenario(state, goals, s.purchasePrice, s.waitMonths) }
        )
      );
    },
    []
  );

  // Rebuild the three canonical futures from scratch — used when the
  // *decision* itself changes, since old prices no longer mean anything.
  const resetScenariosForDecision = useCallback(
    (
      state: FinancialState,
      goals: ProtectedGoal[],
      activeDecision: Decision,
      waitMonths: number,
      alternativeCost: number
    ) => {
      // A clear canvas until there's an actual decision to fork: no routes,
      // no recommendation, nothing committed.
      if (!isDecisionDefined(activeDecision)) {
        setScenarios([]);
        setRecommendedScenario(null);
        setCommittedScenarioId(null);
        return;
      }
      const rebuilt = buildScenarioConfigs(
        activeDecision,
        waitMonths,
        alternativeCost
      ).map((config) => ({
        id: `scenario-${config.name}`,
        name: config.name,
        ...calculateScenario(state, goals, config.purchasePrice, config.waitMonths),
      }));
      setScenarios(rebuilt);
      setRecommendedScenario(null);
      setCommittedScenarioId(null);
    },
    []
  );

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

    const handlers: Record<string, ToolHandler> = {
      get_financial_state: async () => {
        return {
          ...financialStateRef.current,
          decision: decisionRef.current,
          protectedGoals: protectedGoalsRef.current,
          timestamp: new Date().toISOString(),
        };
      },

      update_assumption: async (args: any) => {
        const { field, value } = args;

        const validFields = Object.keys(DEFAULT_FINANCIAL_STATE);
        if (!validFields.includes(field)) {
          throw new Error(`Invalid field: ${field}`);
        }
        if (typeof value !== "number" || value < 0 || !isFinite(value)) {
          throw new Error(`Invalid value for ${field}: must be non-negative`);
        }

        const updated = { ...financialStateRef.current, [field]: value };
        setFinancialState(updated);
        refreshAllScenarios(updated, protectedGoalsRef.current);

        return { success: true, field, value };
      },

      define_decision: async (args: any) => {
        const { name, description, baseCost } = args;

        if (typeof name !== "string" || name.trim().length === 0) {
          throw new Error("name must be a non-empty string");
        }
        if (typeof baseCost !== "number" || !isFinite(baseCost) || baseCost < 0) {
          throw new Error("baseCost must be a non-negative finite number");
        }

        const newDecision: Decision = {
          name: name.trim(),
          description: typeof description === "string" ? description.trim() : "",
          baseCost,
        };
        const altCost = defaultAlternativeCost(baseCost);

        setDecision(newDecision);
        decisionRef.current = newDecision;
        setScenarioParams({ waitMonths: DEFAULT_SCENARIO_WAIT_MONTHS, alternativeCost: altCost });
        resetScenariosForDecision(
          financialStateRef.current,
          protectedGoalsRef.current,
          newDecision,
          DEFAULT_SCENARIO_WAIT_MONTHS,
          altCost
        );

        return newDecision;
      },

      set_protected_goal: async (args: any) => {
        const { name, targetAmount } = args;

        if (typeof name !== "string" || name.trim().length === 0) {
          throw new Error("name must be a non-empty string");
        }
        if (
          typeof targetAmount !== "number" ||
          !isFinite(targetAmount) ||
          targetAmount < 0
        ) {
          throw new Error("targetAmount must be a non-negative finite number");
        }

        const trimmed = name.trim();
        const current = protectedGoalsRef.current;
        const existingIdx = current.findIndex(
          (g) => g.name.toLowerCase() === trimmed.toLowerCase()
        );

        let updatedGoals: ProtectedGoal[];
        if (existingIdx >= 0) {
          updatedGoals = [...current];
          updatedGoals[existingIdx] = { ...updatedGoals[existingIdx], targetAmount };
        } else {
          updatedGoals = [
            ...current,
            { id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: trimmed, targetAmount },
          ];
        }

        setProtectedGoals(updatedGoals);
        refreshAllScenarios(financialStateRef.current, updatedGoals);

        return { goals: updatedGoals };
      },

      remove_protected_goal: async (args: any) => {
        const { name } = args;

        if (typeof name !== "string" || name.trim().length === 0) {
          throw new Error("name must be a non-empty string");
        }

        const trimmed = name.trim().toLowerCase();
        const current = protectedGoalsRef.current;
        if (!current.some((g) => g.name.toLowerCase() === trimmed)) {
          throw new Error(`No protected goal named "${name}"`);
        }

        const updatedGoals = current.filter(
          (g) => g.name.toLowerCase() !== trimmed
        );
        setProtectedGoals(updatedGoals);
        refreshAllScenarios(financialStateRef.current, updatedGoals);

        return { goals: updatedGoals };
      },

      fork_scenario: async (args: any) => {
        const { name, purchasePrice, waitMonths } = args;

        if (typeof name !== "string" || name.trim().length === 0) {
          throw new Error("name must be a non-empty string");
        }
        if (typeof purchasePrice !== "number" || !isFinite(purchasePrice) || purchasePrice < 0) {
          throw new Error("Invalid purchasePrice");
        }
        if (typeof waitMonths !== "number" || !isFinite(waitMonths) || waitMonths < 0) {
          throw new Error("Invalid waitMonths");
        }

        const calculation = calculateScenario(
          financialStateRef.current,
          protectedGoalsRef.current,
          purchasePrice,
          waitMonths
        );

        // Compute the result in this scope, then set state from it — rather
        // than mutating a captured variable from inside setScenarios'
        // updater and reading it right after. Reads through the ref (kept
        // live by the sync effect above) instead of a functional updater,
        // matching set_protected_goal/remove_protected_goal.
        const existingIdx = scenariosRef.current.findIndex((s) => s.name === name);
        const scenario: Scenario = {
          id: existingIdx >= 0 ? scenariosRef.current[existingIdx].id : `scenario-${Date.now()}`,
          name,
          ...calculation,
        };

        if (existingIdx >= 0) {
          const updated = [...scenariosRef.current];
          updated[existingIdx] = scenario;
          setScenarios(updated);
        } else {
          setScenarios([...scenariosRef.current, scenario]);
        }

        return scenario;
      },

      compare_scenarios: async () => {
        const currentScenarios = scenariosRef.current;
        if (currentScenarios.length === 0) {
          setRecommendedScenario(null);
          return { recommended: null, all: [] };
        }

        // Higher-priority goals (earlier in the list) weigh more heavily.
        const scored = currentScenarios.map((s) => {
          const goalScore = s.goalStatuses.reduce(
            (sum, g, idx) =>
              sum + (g.preserved ? s.goalStatuses.length - idx : 0),
            0
          );
          const riskScore =
            s.riskLevel === "Low" ? 10 : s.riskLevel === "Medium" ? 5 : 0;
          return { scenario: s, score: goalScore + riskScore };
        });

        const recommended = scored.sort((a, b) => b.score - a.score)[0];

        // The recommendation drives UI, not just data handed back to
        // whoever called this tool (the gold "Recommended" flag on a
        // destination card) — so the handler updates it directly. That way
        // an external agent calling compare_scenarios through WebMCP gets
        // the same visual feedback as the in-app "Explore futures" button,
        // instead of that update being special-cased to one caller.
        setRecommendedScenario(recommended?.scenario.id ?? null);

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
            goalStatuses: scenario.goalStatuses,
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

    for (const [toolName, handler] of Object.entries(handlers)) {
      const policy = getToolPolicy(toolName);
      const inputSchema = getToolInputSchema(toolName);
      if (policy && inputSchema) {
        try {
          await client.registerTool({
            name: toolName,
            title: policy.name,
            description: policy.description,
            inputSchema,
            annotations: getToolAnnotations(toolName),
            execute: (args, options) =>
              executeToolWithRecorder(
                toolName,
                args,
                "agent",
                (toolArgs) => handler(toolArgs, options),
                options
              ),
          });
        } catch (error) {
          console.warn(`Failed to register tool ${toolName}:`, error);
        }
      }
    }

    setWebMCPClient(client);
    return client;
  }, [executeToolWithRecorder, refreshAllScenarios, resetScenariosForDecision]);

  const runAgentAnalysis = useCallback(async () => {
    if (!webmcpClient) return;

    // Nothing to explore until a decision exists — send the user to the
    // setup drawer instead of forking futures for a nameless $0 decision.
    if (!isDecisionDefined(decisionRef.current)) {
      setActivityOpen(false);
      setSetupOpen(true);
      return;
    }

    setIsAgentRunning(true);
    setFlightLog([]);

    try {
      // Step 1: Discover tools
      const entry1 = addFlightLogEntry("discover_tools", {}, "agent");
      await new Promise((r) => setTimeout(r, 500));
      const tools = await webmcpClient.discoverTools();
      updateFlightLogEntry(entry1.id, { status: "Executed", result: tools });

      // Step 2: Get financial state (sees the *current* decision + goals)
      await new Promise((r) => setTimeout(r, 500));
      await executeToolWithRecorder(
        "get_financial_state",
        {},
        "agent",
        toolHandlersRef.current.get_financial_state
      );

      // Step 3-5: Fork the three canonical futures for the active decision
      const configs = buildScenarioConfigs(
        decisionRef.current,
        scenarioParams.waitMonths,
        scenarioParams.alternativeCost
      );
      for (const config of configs) {
        await new Promise((r) => setTimeout(r, 800));
        await executeToolWithRecorder(
          "fork_scenario",
          config,
          "agent",
          toolHandlersRef.current.fork_scenario
        );
      }

      // Step 6: Compare scenarios — the handler itself updates
      // recommendedScenario, so there's nothing left to do with the result
      // here beyond letting it land in the Flight Recorder.
      await new Promise((r) => setTimeout(r, 500));
      await executeToolWithRecorder(
        "compare_scenarios",
        {},
        "agent",
        toolHandlersRef.current.compare_scenarios
      );
    } catch (error) {
      console.error("Agent analysis error:", error);
    } finally {
      setIsAgentRunning(false);
    }
  }, [
    webmcpClient,
    addFlightLogEntry,
    executeToolWithRecorder,
    updateFlightLogEntry,
    scenarioParams,
  ]);

  const handleReset = useCallback(() => {
    setFinancialState(DEFAULT_FINANCIAL_STATE);
    setDecision(DEFAULT_DECISION);
    setProtectedGoals(DEFAULT_PROTECTED_GOALS);
    setScenarioParams({
      waitMonths: DEFAULT_SCENARIO_WAIT_MONTHS,
      alternativeCost: defaultAlternativeCost(DEFAULT_DECISION.baseCost),
    });
    setScenarios([]);
    setFlightLog([]);
    setRecommendedScenario(null);
    setCommittedScenarioId(null);
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

  // Lets the user fork a future entirely of their own design — not one of
  // the three defaults — through the exact same tool + Flight Recorder
  // trail the agent uses.
  const handleForkCustomScenario = useCallback(
    async (name: string, purchasePrice: number, waitMonths: number) => {
      if (!webmcpClient) return;
      try {
        await executeToolWithRecorder(
          "fork_scenario",
          { name, purchasePrice, waitMonths },
          "user",
          toolHandlersRef.current.fork_scenario
        );
      } catch {}
    },
    [webmcpClient, executeToolWithRecorder]
  );

  const handleDefineDecision = useCallback(
    async (name: string, description: string, baseCost: number) => {
      if (!webmcpClient) return;
      try {
        await executeToolWithRecorder(
          "define_decision",
          { name, description, baseCost },
          "user",
          toolHandlersRef.current.define_decision
        );
      } catch {}
    },
    [webmcpClient, executeToolWithRecorder]
  );

  const handleSetProtectedGoal = useCallback(
    async (name: string, targetAmount: number) => {
      if (!webmcpClient) return;
      try {
        await executeToolWithRecorder(
          "set_protected_goal",
          { name, targetAmount },
          "user",
          toolHandlersRef.current.set_protected_goal
        );
      } catch {}
    },
    [webmcpClient, executeToolWithRecorder]
  );

  const handleRemoveProtectedGoal = useCallback(
    async (name: string) => {
      if (!webmcpClient) return;
      try {
        await executeToolWithRecorder(
          "remove_protected_goal",
          { name },
          "user",
          toolHandlersRef.current.remove_protected_goal
        );
      } catch {}
    },
    [webmcpClient, executeToolWithRecorder]
  );

  // Lets a human invoke any discovered tool directly — the same handler,
  // risk policy, and Flight Recorder trail the scripted agent uses.
  const handleManualInvoke = useCallback(
    async (toolName: string, args: Record<string, unknown>) => {
      const handler = toolHandlersRef.current[toolName];
      if (!handler) {
        throw new Error(`Unknown tool: ${toolName}`);
      }
      return executeToolWithRecorder(toolName, args, "user", handler);
    },
    [executeToolWithRecorder]
  );

  // Initialize on client mount. The ref guard keeps this idempotent under
  // React Strict Mode's mount -> cleanup -> mount dev cycle, so tools are
  // only ever registered once per real mount.
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    resetScenariosForDecision(
      DEFAULT_FINANCIAL_STATE,
      DEFAULT_PROTECTED_GOALS,
      DEFAULT_DECISION,
      DEFAULT_SCENARIO_WAIT_MONTHS,
      defaultAlternativeCost(DEFAULT_DECISION.baseCost)
    );

    let cancelled = false;
    let clientForCleanup: WebMCPClient | null = null;

    initializeWebMCP().then(async (client) => {
      if (cancelled) {
        void client.unregisterAll();
        return;
      }
      clientForCleanup = client;
      const tools = await client.discoverTools();
      if (!cancelled) {
        setDiscoveredTools(tools);
      }
    });

    return () => {
      cancelled = true;
      hasInitialized.current = false;
      void clientForCleanup?.unregisterAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApprove = useCallback(() => {
    if (!pendingApproval) return;

    // Apply the committed future's outcome to the real baseline: cash
    // actually moves, so the board reflects the decision that was just
    // made instead of pretending nothing happened. Still entirely
    // simulated — no real transaction — but *our own* numbers should be
    // honest about the future the user just chose.
    const commit = isCommitScenarioResult(pendingApproval.result)
      ? pendingApproval.result
      : null;

    if (commit) {
      const updatedState: FinancialState = {
        ...financialStateRef.current,
        cashSavings: commit.scenario.cashAfterPurchase,
      };
      setFinancialState(updatedState);
      // Pass the id explicitly: committedScenarioIdRef hasn't synced yet
      // this tick, so refreshAllScenarios would otherwise still recompute
      // (and invalidate) the scenario we're committing to right now.
      refreshAllScenarios(updatedState, protectedGoalsRef.current, commit.scenario.id);
      setCommittedScenarioId(commit.scenario.id);
    }

    // The stored result is a snapshot from the moment commit_scenario was
    // first called — it still literally says "awaiting_approval" unless we
    // update it here too, which would contradict the "Executed" badge right
    // above it in the Flight Recorder.
    updateFlightLogEntry(pendingApproval.id, {
      status: "Executed",
      ...(commit && {
        result: {
          ...commit,
          status: "executed",
          message: `Committed to ${commit.scenario.name}. Approved by user.`,
        },
      }),
    });
    setPendingApproval(null);
  }, [pendingApproval, updateFlightLogEntry, refreshAllScenarios]);

  const handleReject = useCallback(() => {
    if (!pendingApproval) return;

    const commit = isCommitScenarioResult(pendingApproval.result)
      ? pendingApproval.result
      : null;

    updateFlightLogEntry(pendingApproval.id, {
      status: "Rejected",
      ...(commit && {
        result: {
          ...commit,
          status: "rejected",
          message: `Rejected committing to ${commit.scenario.name}.`,
        },
      }),
    });
    setPendingApproval(null);
  }, [pendingApproval, updateFlightLogEntry]);

  const referenceScenario =
    scenarios.find((s) => s.id === committedScenarioId) ??
    scenarios.find((s) => s.id === recommendedScenario) ??
    null;

  return (
    <div className="flex h-screen flex-col bg-night-950 text-frost">
      <TopBar
        decision={decision}
        hasDecision={isDecisionDefined(decision)}
        isAgentRunning={isAgentRunning}
        canExplore={webmcpClient !== null}
        onEditDecision={() => {
          setSetupOpen((v) => !v);
          setActivityOpen(false);
        }}
        onToggleActivity={() => {
          setActivityOpen((v) => !v);
          setSetupOpen(false);
        }}
        onExplore={runAgentAnalysis}
      />

      {/* Future map + overlays */}
      <div className="relative flex flex-1 overflow-hidden">
        <FutureMap
          scenarios={scenarios}
          recommendedId={recommendedScenario}
          committedId={committedScenarioId}
          currentCash={financialState.cashSavings}
          financialState={financialState}
          hasDecision={isDecisionDefined(decision)}
          onChoose={handleCommitScenario}
          onExplore={handleSimulateScenario}
          onForkCustom={handleForkCustomScenario}
          onConfigure={() => {
            setActivityOpen(false);
            setSetupOpen(true);
          }}
        />

        {pendingApproval && (
          <ApprovalSheet
            entry={pendingApproval}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}

        {activityOpen && (
          <ActivityDrawer
            entries={flightLog}
            tools={discoveredTools}
            scenarios={scenarios}
            contextType={webmcpClient?.getContextType() || "unavailable"}
            onInvoke={handleManualInvoke}
            onReset={handleReset}
            onClose={() => setActivityOpen(false)}
          />
        )}

        {setupOpen && (
          <SetupDrawer
            financialState={financialState}
            decision={decision}
            protectedGoals={protectedGoals}
            onUpdateFinancialState={(field, value) => {
              const updated = { ...financialState, [field]: value };
              setFinancialState(updated);
              refreshAllScenarios(updated, protectedGoals);
            }}
            onDefineDecision={handleDefineDecision}
            onSetGoal={handleSetProtectedGoal}
            onRemoveGoal={handleRemoveProtectedGoal}
            onClose={() => setSetupOpen(false)}
          />
        )}
      </div>

      <ProtectedGoalsStrip
        goals={protectedGoals}
        financialState={financialState}
        referenceScenario={referenceScenario}
        onOpenSetup={() => {
          setSetupOpen(true);
          setActivityOpen(false);
        }}
      />
    </div>
  );
}
