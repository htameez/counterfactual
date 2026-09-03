"use client";

import { useState } from "react";
import type { Scenario, WebMCPTool } from "@/types";
import { getRiskLevelBadgeClass, getToolPolicy } from "@/lib/riskPolicy";
import { ChevronDown, Sparkles, Terminal } from "lucide-react";

interface ManualToolConsoleProps {
  tools: WebMCPTool[];
  scenarios: Scenario[];
  onInvoke: (toolName: string, args: Record<string, unknown>) => Promise<unknown>;
}

interface SchemaProperty {
  type?: string;
  enum?: string[];
  description?: string;
  minimum?: number;
  minLength?: number;
}

type FormValues = Record<string, string>;

/**
 * A judge/developer-facing console: every discovered WebMCP tool gets a
 * small form generated straight from its JSON input schema, so a human can
 * invoke the same tools the scripted agent uses — no code required.
 */
export default function ManualToolConsole({
  tools,
  scenarios,
  onInvoke,
}: ManualToolConsoleProps) {
  const [expanded, setExpanded] = useState(true);
  const [openTool, setOpenTool] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, FormValues>>({});
  const [invoking, setInvoking] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  if (tools.length === 0) {
    return null;
  }

  const setFieldValue = (toolName: string, field: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [toolName]: { ...prev[toolName], [field]: value },
    }));
  };

  const buildArgs = (
    toolName: string,
    properties: Record<string, SchemaProperty>,
    required: string[]
  ): { args: Record<string, unknown>; error?: string } => {
    const values = formValues[toolName] || {};
    const args: Record<string, unknown> = {};

    for (const [field, schema] of Object.entries(properties)) {
      const raw = values[field];

      if (raw === undefined || raw === "") {
        if (required.includes(field)) {
          return { args, error: `"${field}" is required.` };
        }
        continue;
      }

      if (schema.type === "number") {
        const num = Number(raw);
        if (!Number.isFinite(num)) {
          return { args, error: `"${field}" must be a valid number.` };
        }
        if (schema.minimum !== undefined && num < schema.minimum) {
          return { args, error: `"${field}" must be at least ${schema.minimum}.` };
        }
        args[field] = num;
      } else {
        args[field] = raw;
      }
    }

    return { args };
  };

  const handleInvoke = async (tool: WebMCPTool) => {
    const properties = (tool.inputSchema.properties || {}) as Record<
      string,
      SchemaProperty
    >;
    const required = tool.inputSchema.required || [];
    const { args, error } = buildArgs(tool.name, properties, required);

    if (error) {
      setFeedback((prev) => ({ ...prev, [tool.name]: error }));
      return;
    }

    setInvoking(tool.name);
    setFeedback((prev) => ({ ...prev, [tool.name]: "" }));
    try {
      await onInvoke(tool.name, args);
      setFeedback((prev) => ({
        ...prev,
        [tool.name]: "Invoked — see the log below.",
      }));
    } catch (err) {
      setFeedback((prev) => ({
        ...prev,
        [tool.name]: err instanceof Error ? err.message : "Invocation failed.",
      }));
    } finally {
      setInvoking(null);
    }
  };

  return (
    <div className="border-b border-ink-700 bg-ink-900">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-indigo-400" />
          <span className="text-sm font-semibold text-ink-50">
            Manual Tool Console
          </span>
          <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[10px] font-medium text-ink-400">
            {tools.length} discovered
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-ink-400 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="space-y-2 px-4 pb-4">
          <p className="text-xs text-ink-400">
            Invoke any tool yourself, exactly as the agent would — same
            handlers, same risk policy, same Flight Recorder trail.
          </p>
          {tools.map((tool) => {
            const policy = getToolPolicy(tool.name);
            const properties = (tool.inputSchema.properties || {}) as Record<
              string,
              SchemaProperty
            >;
            const required = tool.inputSchema.required || [];
            const fields = Object.entries(properties);
            const isOpen = openTool === tool.name;

            return (
              <div
                key={tool.name}
                className="rounded-lg border border-ink-700 bg-ink-850 overflow-hidden"
              >
                <button
                  onClick={() => setOpenTool(isOpen ? null : tool.name)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-ink-800"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <code className="truncate text-xs font-semibold text-ink-100">
                      {tool.name}
                    </code>
                    {policy && (
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${getRiskLevelBadgeClass(policy.riskLevel)}`}
                      >
                        {policy.riskLevel}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-ink-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isOpen && (
                  <div className="space-y-3 border-t border-ink-700 px-3 py-3">
                    {policy?.requiresConfirmation && (
                      <p className="flex items-center gap-1.5 text-[11px] text-amber-300">
                        <Sparkles className="h-3 w-3" />
                        Requires your explicit approval before it executes.
                      </p>
                    )}

                    {fields.length === 0 ? (
                      <p className="text-xs text-ink-500">No input required.</p>
                    ) : (
                      <div className="space-y-2">
                        {fields.map(([field, schema]) => {
                          const isScenarioField = field === "scenarioId";
                          const currentValue =
                            formValues[tool.name]?.[field] ?? "";

                          return (
                            <label key={field} className="block">
                              <span className="mb-1 block text-[11px] font-medium text-ink-300">
                                {field}
                                {required.includes(field) && (
                                  <span className="text-red-400"> *</span>
                                )}
                              </span>

                              {isScenarioField ? (
                                <select
                                  value={currentValue}
                                  onChange={(e) =>
                                    setFieldValue(tool.name, field, e.target.value)
                                  }
                                  className="w-full rounded border border-ink-600 bg-ink-800 px-2 py-1.5 text-xs text-ink-50 focus:border-indigo-400 focus:outline-none"
                                >
                                  <option value="">Select a scenario…</option>
                                  {scenarios.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name}
                                    </option>
                                  ))}
                                </select>
                              ) : schema.enum ? (
                                <select
                                  value={currentValue}
                                  onChange={(e) =>
                                    setFieldValue(tool.name, field, e.target.value)
                                  }
                                  className="w-full rounded border border-ink-600 bg-ink-800 px-2 py-1.5 text-xs text-ink-50 focus:border-indigo-400 focus:outline-none"
                                >
                                  <option value="">Select…</option>
                                  {schema.enum.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={schema.type === "number" ? "number" : "text"}
                                  value={currentValue}
                                  onChange={(e) =>
                                    setFieldValue(tool.name, field, e.target.value)
                                  }
                                  min={schema.minimum}
                                  placeholder={schema.description}
                                  className="w-full rounded border border-ink-600 bg-ink-800 px-2 py-1.5 text-xs text-ink-50 placeholder:text-ink-500 focus:border-indigo-400 focus:outline-none"
                                />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {feedback[tool.name] && (
                      <p className="text-[11px] text-ink-300">
                        {feedback[tool.name]}
                      </p>
                    )}

                    <button
                      onClick={() => handleInvoke(tool)}
                      disabled={invoking === tool.name}
                      className="w-full rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-ink-400"
                    >
                      {invoking === tool.name ? "Invoking…" : `Invoke ${tool.name}`}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
