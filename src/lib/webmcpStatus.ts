import type { WebMCPContextType } from "@/types";

export function getWebMCPStatusText(contextType: WebMCPContextType): string {
  const statusMap: Record<WebMCPContextType, string> = {
    native: "Native WebMCP",
    polyfilled: "WebMCP (Polyfilled)",
    legacy: "Legacy WebMCP",
    "demo-bridge": "Demo Bridge",
    unavailable: "WebMCP Unavailable",
  };
  return statusMap[contextType] || "Unknown";
}

export function getWebMCPStatusColor(contextType: WebMCPContextType): string {
  const colorMap: Record<WebMCPContextType, string> = {
    native: "text-aqua bg-aqua/10",
    polyfilled: "text-aqua bg-aqua/10",
    legacy: "text-gold bg-gold/10",
    "demo-bridge": "text-violet bg-violet/10",
    unavailable: "text-fog bg-night-600/20",
  };
  return colorMap[contextType] || "text-fog bg-night-600/20";
}

export function getWebMCPStatusDotClass(contextType: WebMCPContextType): string {
  const dotMap: Record<WebMCPContextType, string> = {
    native: "bg-aqua",
    polyfilled: "bg-aqua",
    legacy: "bg-gold",
    "demo-bridge": "bg-violet",
    unavailable: "bg-fog",
  };
  return dotMap[contextType] || "bg-fog";
}

export function getWebMCPStatusDescription(contextType: WebMCPContextType): string {
  const descMap: Record<WebMCPContextType, string> = {
    native: "Browser ships document.modelContext natively.",
    polyfilled:
      "document.modelContext installed via @mcp-b/webmcp-polyfill — genuinely visible to outside tools, e.g. a browser extension.",
    legacy: "Using legacy WebMCP via navigator.modelContext.",
    "demo-bridge":
      "Polyfill unavailable. Using an in-page Demo Bridge — tools work here, but aren't visible outside this tab.",
    unavailable:
      "WebMCP is not available. Some features may not work correctly.",
  };
  return descMap[contextType] || "Status unknown.";
}
