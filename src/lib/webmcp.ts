import type { WebMCPContextType, WebMCPTool, WebMCPContext } from "@/types";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: unknown) => Promise<unknown> | unknown;
}

/**
 * Detects which WebMCP context is available
 */
export function detectWebMCPContext(): WebMCPContextType {
  if (typeof document === "undefined") return "unavailable";

  // Check for native WebMCP
  if (document.modelContext) {
    return "native";
  }

  // Check for legacy navigator.modelContext
  if (typeof navigator !== "undefined" && navigator.modelContext) {
    return "legacy";
  }

  return "unavailable";
}

/**
 * Gets the available WebMCP context with fallback
 */
export function getWebMCPContext(): WebMCPContext | null {
  if (typeof document === "undefined") return null;
  return document.modelContext || (navigator.modelContext as any) || null;
}

/**
 * Demo Bridge: A local implementation of WebMCP for development/fallback
 */
export class DemoBridge implements WebMCPContext {
  private tools: Map<
    string,
    {
      definition: ToolDefinition;
      handler: (args: unknown) => Promise<unknown>;
    }
  > = new Map();

  async registerTool(
    name: string,
    description: string,
    inputSchema: unknown,
    handler: (args: unknown) => Promise<unknown> | unknown
  ): Promise<void> {
    const definition: ToolDefinition = {
      name,
      description,
      inputSchema: inputSchema as ToolDefinition["inputSchema"],
      handler,
    };

    const asyncHandler = async (args: unknown) => {
      const result = await handler(args);
      return result;
    };

    this.tools.set(name, { definition, handler: asyncHandler });
  }

  async invokeTool(name: string, args: unknown): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return tool.handler(args);
  }

  async discoverTools(): Promise<WebMCPTool[]> {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.definition.name,
      description: t.definition.description,
      inputSchema: t.definition.inputSchema,
    }));
  }

  async unregisterTool(name: string): Promise<void> {
    this.tools.delete(name);
  }
}

/**
 * Unified WebMCP client with native fallback to demo bridge
 */
export class WebMCPClient {
  private context: WebMCPContext | null;
  private bridge: DemoBridge | null;
  private contextType: WebMCPContextType;
  private registeredTools: Set<string> = new Set();

  constructor() {
    this.context = getWebMCPContext();
    this.contextType = this.context ? detectWebMCPContext() : "unavailable";
    this.bridge = null;

    // Use demo bridge if native not available
    if (!this.context) {
      this.bridge = new DemoBridge();
      this.contextType = "demo-bridge";
    }
  }

  getContextType(): WebMCPContextType {
    return this.contextType;
  }

  async registerTool(
    name: string,
    description: string,
    inputSchema: unknown,
    handler: (args: unknown) => Promise<unknown> | unknown
  ): Promise<void> {
    // Prevent duplicate registration (React Strict Mode safety)
    if (this.registeredTools.has(name)) {
      console.warn(`Tool already registered: ${name}`);
      return;
    }

    if (this.context) {
      await this.context.registerTool(name, description, inputSchema, handler);
    } else if (this.bridge) {
      await this.bridge.registerTool(name, description, inputSchema, handler);
    } else {
      throw new Error("No WebMCP context available");
    }

    this.registeredTools.add(name);
  }

  async invokeTool(name: string, args: unknown): Promise<unknown> {
    if (this.context) {
      return this.context.invokeTool(name, args);
    } else if (this.bridge) {
      return this.bridge.invokeTool(name, args);
    } else {
      throw new Error("No WebMCP context available");
    }
  }

  async discoverTools(): Promise<WebMCPTool[]> {
    if (this.context) {
      return this.context.discoverTools();
    } else if (this.bridge) {
      return this.bridge.discoverTools();
    } else {
      return [];
    }
  }

  /**
   * Clean up every tool this client registered. Safe to call even when the
   * underlying context doesn't support unregistration — it just clears our
   * local bookkeeping so a later registerTool() call isn't skipped as a
   * false-positive duplicate.
   */
  async unregisterAll(): Promise<void> {
    for (const name of this.registeredTools) {
      try {
        if (this.context?.unregisterTool) {
          await this.context.unregisterTool(name);
        } else if (this.bridge) {
          await this.bridge.unregisterTool(name);
        }
      } catch (error) {
        console.warn(`Failed to unregister tool ${name}:`, error);
      }
    }
    this.registeredTools.clear();
  }
}
