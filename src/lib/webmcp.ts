import type {
  ToolAnnotations,
  ToolInputSchema,
  WebMCPContextType,
  WebMCPTool,
  WebMCPContext,
} from "@/types";
// Side-effecting import: installs the real @mcp-b/webmcp-polyfill runtime
// (a no-op if native WebMCP or another polyfill already put it there) so
// this page's document.modelContext is genuinely visible to tools outside
// this React tree, not just to our own in-page Demo Bridge.
import { wasWebMCPPolyfillInstalledByUs } from "./webmcpPolyfill";

export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: ToolInputSchema;
  annotations: ToolAnnotations;
  handler: (args: unknown, options?: { signal?: AbortSignal }) => Promise<unknown> | unknown;
}

/**
 * What a caller hands to registerTool() — deliberately shaped like the
 * standard `document.modelContext.registerTool({ name, description,
 * inputSchema, execute })` dictionary, since that's exactly what this
 * becomes (plus title/annotations) once it reaches the real API.
 */
export interface ToolRegistration {
  name: string;
  title: string;
  description: string;
  inputSchema: unknown;
  annotations: ToolAnnotations;
  execute: (args: unknown, options?: { signal?: AbortSignal }) => Promise<unknown> | unknown;
}

/**
 * Detects which WebMCP context is available
 */
export function detectWebMCPContext(): WebMCPContextType {
  if (typeof document === "undefined") return "unavailable";

  if (document.modelContext) {
    // If we're the one who installed @mcp-b/webmcp-polyfill, say so rather
    // than claiming the browser ships this natively.
    return wasWebMCPPolyfillInstalledByUs() ? "polyfilled" : "native";
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
export class DemoBridge {
  private tools: Map<
    string,
    {
      definition: ToolDefinition;
      handler: (args: unknown) => Promise<unknown>;
    }
  > = new Map();

  async registerTool(tool: ToolRegistration): Promise<void> {
    const { name, title, description, inputSchema, annotations, execute } = tool;

    const definition: ToolDefinition = {
      name,
      title,
      description,
      inputSchema: inputSchema as ToolInputSchema,
      annotations,
      handler: execute,
    };

    const asyncHandler = async (args: unknown) => {
      const result = await execute(args, { signal: new AbortController().signal });
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
      title: t.definition.title,
      description: t.definition.description,
      inputSchema: t.definition.inputSchema,
      annotations: t.definition.annotations,
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
  private bridge: DemoBridge;
  private contextType: WebMCPContextType;
  private registeredTools: Set<string> = new Set();
  private nativeRegistrationController = new AbortController();

  constructor() {
    this.context = getWebMCPContext();
    this.contextType = this.context ? detectWebMCPContext() : "unavailable";
    this.bridge = new DemoBridge();

    // Use demo bridge if native not available
    if (!this.context) {
      this.contextType = "demo-bridge";
    }
  }

  getContextType(): WebMCPContextType {
    return this.contextType;
  }

  async registerTool(tool: ToolRegistration): Promise<void> {
    const { name, title, description, inputSchema, annotations, execute } = tool;

    // Prevent duplicate registration (React Strict Mode safety)
    if (this.registeredTools.has(name)) {
      console.warn(`Tool already registered: ${name}`);
      return;
    }

    await this.bridge.registerTool(tool);

    if (this.context) {
      const modelContextTool: WebMCPTool = {
        name,
        title,
        description,
        inputSchema: inputSchema as ToolInputSchema,
        annotations,
        execute,
      };

      try {
        await this.context.registerTool(modelContextTool, {
          signal: this.nativeRegistrationController.signal,
        });
      } catch (objectShapeError) {
        this.contextType = "demo-bridge";
        console.warn(
          `Failed to register native WebMCP tool ${name}; using local demo bridge instead.`,
          objectShapeError
        );
      }
    }

    this.registeredTools.add(name);
  }

  async invokeTool(name: string, args: unknown): Promise<unknown> {
    try {
      return await this.bridge.invokeTool(name, args);
    } catch (bridgeError) {
      if (!this.context?.executeTool || !this.context?.getTools) {
        throw bridgeError;
      }
      const tools = await this.context.getTools({ fromOrigins: [] });
      const tool = tools.find((candidate) => candidate.name === name);
      if (!tool) {
        throw bridgeError;
      }
      return this.context.executeTool(tool, args);
    }
  }

  async discoverTools(): Promise<WebMCPTool[]> {
    const localTools = await this.bridge.discoverTools();
    if (localTools.length > 0) {
      return localTools;
    }

    if (this.context?.getTools) {
      return this.context.getTools({ fromOrigins: [] });
    }

    return [];
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
        await this.bridge.unregisterTool(name);
      } catch (error) {
        console.warn(`Failed to unregister tool ${name}:`, error);
      }
    }
    this.nativeRegistrationController.abort();
    this.nativeRegistrationController = new AbortController();
    this.registeredTools.clear();
  }
}
