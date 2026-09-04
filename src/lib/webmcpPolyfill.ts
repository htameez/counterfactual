import { initializeWebMCPPolyfill } from "@mcp-b/webmcp-polyfill";

/**
 * Installs the real `@mcp-b/webmcp-polyfill` runtime so this page's
 * `document.modelContext` genuinely exists on window/document — not just
 * inside our own in-page Demo Bridge, which lives entirely in React state
 * and is invisible to anything outside this tab (a browser extension,
 * another agent inspecting the live DOM, etc.).
 *
 * The polyfill itself no-ops if `document.modelContext` already exists —
 * i.e. a real native browser implementation, or some other polyfill, got
 * there first — so calling this is always safe. We snapshot whether *we*
 * were the one who put it there purely so the UI can label this mode
 * "Polyfilled" instead of overclaiming "Native".
 *
 * This module has a top-level side effect and must be imported (for that
 * side effect alone, before anything reads `document.modelContext`) —
 * it's imported at the top of webmcp.ts for exactly that reason, so it
 * runs during module evaluation, well before any component mounts.
 */
let installedByUs = false;

if (typeof document !== "undefined") {
  const existedBefore = Boolean(document.modelContext);
  try {
    initializeWebMCPPolyfill();
  } catch (error) {
    console.warn("Failed to initialize @mcp-b/webmcp-polyfill:", error);
  }
  installedByUs = !existedBefore && Boolean(document.modelContext);

  // Compatibility shim, not a spec requirement: document.modelContext is
  // the current surface, but some agent tooling still only checks
  // navigator.modelContext from an earlier WebMCP draft. Mirror ours
  // there too, as the SAME object reference — so a tool registered later
  // via document.modelContext stays visible through navigator.modelContext
  // automatically, no separate sync needed — but only when nothing else
  // is already there. Never clobber a real implementation (native or a
  // different polyfill) that put itself on navigator on its own.
  if (
    document.modelContext &&
    typeof navigator !== "undefined" &&
    !navigator.modelContext
  ) {
    try {
      navigator.modelContext = document.modelContext;
    } catch (error) {
      console.warn("Failed to mirror modelContext onto navigator:", error);
    }
  }
}

export function wasWebMCPPolyfillInstalledByUs(): boolean {
  return installedByUs;
}
