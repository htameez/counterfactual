import type { WebMCPContextType } from "@/types";

export function getWebMCPStatusText(contextType: WebMCPContextType): string {
  const statusMap: Record<WebMCPContextType, string> = {
    native: "Native WebMCP",
    legacy: "Legacy WebMCP",
    "demo-bridge": "Demo Bridge",
    unavailable: "WebMCP Unavailable",
  };
  return statusMap[contextType] || "Unknown";
}

export function getWebMCPStatusColor(contextType: WebMCPContextType): string {
  const colorMap: Record<WebMCPContextType, string> = {
    native: "text-emerald-600 bg-emerald-50",
    legacy: "text-amber-600 bg-amber-50",
    "demo-bridge": "text-indigo-600 bg-indigo-50",
    unavailable: "text-neutral-600 bg-neutral-100",
  };
  return colorMap[contextType] || "text-neutral-600 bg-neutral-100";
}

export function getWebMCPStatusDescription(contextType: WebMCPContextType): string {
  const descMap: Record<WebMCPContextType, string> = {
    native: "Using native WebMCP from the browser environment.",
    legacy: "Using legacy WebMCP via navigator.modelContext.",
    "demo-bridge":
      "Native WebMCP not found. Using local Demo Bridge for tool demonstration.",
    unavailable:
      "WebMCP is not available. Some features may not work correctly.",
  };
  return descMap[contextType] || "Status unknown.";
}
