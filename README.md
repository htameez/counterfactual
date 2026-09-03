# Counterfactual: WebMCP-Powered Decision Simulator

## What is Counterfactual?

**Counterfactual** is a preview and permission layer for the agentic web. It consumes WebMCP tools, turns consequential actions into explorable future branches, and lets people inspect, revise, and approve outcomes before agents act.

Counterfactual demonstrates a critical principle: **agents shouldn't discover the consequences of an action after executing it.**

Counterfactual isn't a fixed demo of one purchase decision — it's a roadmapping tool for *your* decision. There's no hardcoded "Tesla scenario" baked into the data model: `define_decision` and `set_protected_goal`/`remove_protected_goal` let you (or an agent, on your behalf) tell it what you're actually weighing and what you don't want to jeopardize — a purchase, a leave of absence, a move, a career change — and every future it forks is computed against *that*, not a preset. The Tesla example is just what loads first, to show the shape of the thing; replace it and the whole roadmap rebuilds around your real decision.

## The Problem

Today, when an agent takes an action—booking a flight, making a financial decision, sending an email—you typically learn the consequences only after the fact. By then, it's often too late to change course.

Counterfactual inverts this: it **simulates the future**, lets you explore multiple outcomes — including ones you invent yourself, not just the defaults — and only executes actions you explicitly approve.

## Why WebMCP Is Essential

WebMCP (Model Context Protocol for the Web) allows Counterfactual to:

1. **Discover** what tools are available in the browser environment
2. **Classify** tools by risk level (read-only, simulation, commitment, etc.)
3. **Intercept** actions before they cross from simulation to reality
4. **Record** every step so you can inspect and audit agent reasoning
5. **Enforce** explicit approval for consequential actions

Without WebMCP, Counterfactual would be a pre-built financial calculator. With it, Counterfactual is a **permission and preview system** that can scale to any agentic task.

## Human-Agent Collaboration Flow

1. **User defines the decision** — what they're weighing and its all-in cost (`define_decision`), or an agent proposes it from a natural-language question and the user confirms
2. **User (or agent) names what not to jeopardize** — protected goals, in priority order (`set_protected_goal` / `remove_protected_goal`)
3. **Agent discovers** available WebMCP tools
4. **Agent explores** multiple futures in simulation, including any the user forked themselves
5. **Agent recommends** the best path based on the protected goals *as the user defined them*
6. **User inspects** the Flight Recorder to understand the agent's reasoning — every define/set/fork call is logged, not just the commitment
7. **User approves** the chosen scenario, or rejects and revises
8. **System records** the decision in the Flight Recorder

At every step, the human maintains visibility and control — including control over what the decision and its stakes even *are*, not just the final yes/no.

## The Nine WebMCP Tools

### 1. `get_financial_state`
**Risk:** Read-only | **Confirmation:** Not required

Returns your current assumptions, the active decision, and protected goals.

**Response:**
```json
{
  "cashSavings": 72000,
  "monthlyTakeHome": 6000,
  "monthlyLivingExpenses": 3200,
  "monthlySavingsContribution": 2800,
  "decision": { "name": "Buy a Tesla Model 3 in cash", "baseCost": 44000 },
  "protectedGoals": [
    { "id": "goal-emergency", "name": "Emergency fund", "targetAmount": 19200 }
  ]
}
```

### 2. `update_assumption`
**Risk:** Reversible | **Confirmation:** Not required

Modifies one financial assumption and immediately recalculates all scenarios.

**Inputs:**
- `field` (string): Field name (e.g., `cashSavings`)
- `value` (number): New value (must be non-negative)

**Response:**
```json
{ "success": true, "field": "cashSavings", "value": 75000 }
```

### 3. `define_decision`
**Risk:** Reversible | **Confirmation:** Not required

Defines or replaces the decision being weighed — this is the tool that makes the app *yours* instead of a fixed Tesla demo. Resets the three canonical futures around the new cost; protected goals carry over.

**Inputs:**
- `name` (string): What you're deciding, e.g. "Take 3 months unpaid leave to write a novel"
- `description` (string, optional): One-line context
- `baseCost` (number): All-in cost of doing it now

**Response:** the new `Decision` object.

### 4. `set_protected_goal`
**Risk:** Reversible | **Confirmation:** Not required

Adds a protected goal, or updates its target if a goal with that name (case-insensitive) already exists. Goals are checked in the order added — each one must be covered on top of every goal before it.

**Inputs:**
- `name` (string): e.g. "Emergency fund", "Book advance fund"
- `targetAmount` (number): Non-negative dollar amount to protect

### 5. `remove_protected_goal`
**Risk:** Reversible | **Confirmation:** Not required

Removes a protected goal by name. Every existing future is recalculated without it.

**Inputs:**
- `name` (string)

### 6. `fork_scenario`
**Risk:** Simulation | **Confirmation:** Not required

Simulates a future for the active decision and returns calculated outcomes — any price and wait period, not just the three defaults. This is the same tool the "Add your own future" button in the UI calls.

**Inputs:**
- `name` (string): Scenario name (e.g., "Do It Now", or anything you want)
- `purchasePrice` (number): Cost for this future
- `waitMonths` (number): Months to wait before acting

**Response:**
```json
{
  "id": "scenario-do-it-now",
  "name": "Do It Now",
  "purchasePrice": 44000,
  "waitMonths": 0,
  "cashAfterPurchase": 28000,
  "goalStatuses": [
    { "id": "goal-emergency", "name": "Emergency fund", "targetAmount": 19200, "preserved": true },
    { "id": "goal-school", "name": "Graduate school reserve", "targetAmount": 18000, "preserved": false }
  ],
  "riskLevel": "Medium",
  "explanation": "Doing this now preserves emergency fund but risks grad school reserve."
}
```

### 7. `compare_scenarios`
**Risk:** Read-only | **Confirmation:** Not required

Analyzes all simulated futures and identifies the strongest scenario, weighting higher-priority protected goals more heavily.

**Response:**
```json
{
  "recommended": { /* scenario object */ },
  "all": [ /* all scenarios */ ],
  "analysis": {
    "bestChoice": "Cheaper Alternative",
    "reason": "Preserves all protected goals with lowest financial stress"
  }
}
```

### 8. `simulate_purchase`
**Risk:** Simulation | **Confirmation:** Not required

Shows exactly what your finances look like in a given future—but does not execute it.

**Inputs:**
- `scenarioId` (string): Scenario to simulate

**Response:**
```json
{
  "scenario": { /* scenario object */ },
  "simulation": {
    "initialCash": 72000,
    "purchaseAmount": 44000,
    "remainingCash": 28000,
    "goalStatuses": [ /* GoalStatus[] */ ]
  }
}
```

### 9. `commit_scenario`
**Risk:** External Commitment | **Confirmation:** **Always required**

Represents a consequential external commitment. **Never executes immediately.**

**Process:**
1. Tool is invoked
2. Flight Recorder entry marked `Awaiting Approval`
3. Human confirmation modal opens
4. User clicks "Approve Commitment" or "Reject"
5. Entry marked `Executed` or `Rejected`
6. No real purchase or payment occurs

**Note:** This is a hackathon MVP. No real financial transaction is processed.

## WebMCP Context: Native vs. Polyfilled vs. Demo Bridge

Counterfactual supports five WebMCP contexts, checked in this order:

### Native WebMCP
- **Status:** `document.modelContext` present without us doing anything
- **Behavior:** The browser itself ships WebMCP
- **Indicator:** "Native WebMCP" in header
- **Reality check:** as of today, no shipping browser does this unflagged — this path exists for when one does.

### Polyfilled WebMCP
- **Status:** `document.modelContext` present because *we* installed it
- **Behavior:** [`@mcp-b/webmcp-polyfill`](https://www.npmjs.com/package/@mcp-b/webmcp-polyfill) — the real, spec-tracking polyfill from the WebMCP-org project — is loaded on mount ([`src/lib/webmcpPolyfill.ts`](src/lib/webmcpPolyfill.ts)) and genuinely writes `document.modelContext` onto the page.
- **Indicator:** "WebMCP (Polyfilled)" in header
- **Why this matters:** this is the difference between a demo that only talks to itself and one that's actually discoverable. With the polyfill active, any real outside consumer — a browser extension, another AI agent inspecting the live tab, `chrome-devtools-mcp` — can find and call these tools by reading `document.modelContext` directly, the same way a native implementation would let them. Our own Demo Bridge (below) can't do that; it never touches `window`/`document` at all.
- **No-op guarantee:** the polyfill checks for an existing `document.modelContext` before installing and does nothing if one is already there (native or otherwise), so it's always safe to load.

### Legacy WebMCP
- **Status:** `navigator.modelContext` available (fallback)
- **Behavior:** Uses the deprecated pre-Document-first WebMCP surface
- **Indicator:** "Legacy WebMCP" in header

### Demo Bridge
- **Status:** No native or polyfilled context found (e.g. insecure context)
- **Behavior:** Local, in-memory tool registry, scoped to this page's React state
- **Indicator:** "Demo Bridge" in header
- **Note:** Fully functional for the in-app demo — Flight Recorder, Manual Tool Console, and the scripted agent all work identically — but invisible to anything outside this tab.

### Unavailable
- **Status:** No WebMCP support of any kind (e.g. non-browser environment)
- **Indicator:** "WebMCP Unavailable" in header

The application always displays its actual context and **never falsely claims native WebMCP** for the polyfilled or Demo Bridge paths.

## Target API

```typescript
// Detect available context (Document is canonical; Navigator is the deprecated alias)
const context = document.modelContext ?? navigator.modelContext;

// Register a tool
await context.registerTool(
  {
    name: string,
    title?: string,
    description: string,
    inputSchema?: JSONSchema,
    annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean },
    execute: (input: unknown) => unknown | Promise<unknown>,
  },
  { signal?: AbortSignal, exposedTo?: string[] }
);

// Discover available tools
const tools = await context.getTools({ fromOrigins?: string[] });
```

Tool registration is cleaned up by aborting the `AbortSignal` passed at registration time — there's no separate `unregisterTool` call in the real API, and our own cleanup path (`WebMCPClient.unregisterAll()`) does exactly that.

For compatibility, Counterfactual includes a **compatibility helper** ([`src/lib/webmcp.ts`](src/lib/webmcp.ts)) that checks `document.modelContext ?? navigator.modelContext`, loads the real `@mcp-b/webmcp-polyfill` if neither is present, and falls back to the in-page **Demo Bridge** only if the polyfill itself can't install (e.g. an insecure context).

## Demo Scenario

The app loads with a **starting example**, not a fixed scenario: **Should I buy a Tesla Model 3 in cash?** Every field below is user data, editable through the UI or the `define_decision` / `set_protected_goal` tools — nothing about it is hardcoded into the app.

### Starting assumptions
- **Cash savings:** $72,000
- **Monthly take-home:** $6,000
- **Monthly expenses:** $3,200
- **Monthly savings:** $2,800
- **Decision:** Buy a Tesla Model 3 in cash — all-in cost $44,000
- **Protected goals (in priority order):** Emergency fund $19,200, Graduate school reserve $18,000, Austin moving fund $6,000

### Three canonical futures, generated from *whatever decision is active*
1. **Do It Now** – Act immediately, at the decision's full cost
2. **Wait N Months** – Accumulate savings first (default 8 months, editable)
3. **Cheaper Alternative** – A lower-cost version of the same decision (default 70% of base cost, editable)

Plus **as many custom futures as you want** — the "Add your own future" card on the roadmap, or the `fork_scenario` tool directly, forks any name/price/wait-period combination.

Each scenario shows:
- Remaining cash immediately after acting
- Remaining cash after 12 months
- Which protected goals stay funded, in priority order — computed live against *your* goals, not a fixed three
- Risk classification (Low, Medium, High)
- Plain-language explanation

## Local Setup

```bash
# Clone or extract the project
cd counterfactual

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Running Checks

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build
npm run build
```

## 60–90 Second Demo Script

1. **Show the start state:** "Counterfactual starts with default assumptions: $72k saved, $6k monthly income, $3.2k expenses."

2. **Run agent analysis:** Click "Run Agent Analysis." Watch the Flight Recorder populate in real time:
   - Discovers tools
   - Gets financial state (including the active decision and protected goals)
   - Forks the three canonical futures for that decision
   - Compares them
   - Recommends the best choice

3. **Inspect the Flight Recorder:** "Every tool invocation is recorded with its risk classification, arguments, and status. This is the agent's audit trail."

4. **Make it your own decision:** In "Your Decision," replace the Tesla example — try "Take 3 months unpaid leave to write a novel," cost $15,000, click Update Decision. Watch all three futures rebuild around the new number, live, through `define_decision`.

5. **Add a goal only you would think to protect:** Under "What you don't want to jeopardize," add "Book advance fund" at $5,000. Every future recalculates against it immediately, in priority order alongside the others.

6. **Fork a future of your own:** Click "Add your own future" and try a price/wait combination none of the three defaults cover — this calls the exact same `fork_scenario` tool the agent uses.

7. **Explore a scenario:** Click "Explore" on any scenario. See the simulation of what your finances would look like.

8. **Approve or reject a commitment:** Click "Commit" on a scenario. A modal opens requiring a freshly generated code to be typed back before Approve unlocks — explicit, verified human control, not just a click-through.

9. **Reset:** Click "Reset Demo" to restore the Tesla example and clear the Flight Recorder.

## Key Features

✓ **User-defined decisions and goals** – `define_decision` and `set_protected_goal`/`remove_protected_goal` mean nothing about the scenario is hardcoded; the Tesla example is a starting point, not the product  
✓ **Polished desktop-first interface** – Clean, readable, no excessive gradients or glowing effects  
✓ **Forked futures, including your own** – Three canonical futures plus unlimited custom ones via "Add your own future" or `fork_scenario`  
✓ **Real-time Flight Recorder** – Tool invocations recorded with risk and status  
✓ **Approval gates** – Consequential actions require explicit human confirmation  
✓ **Scripted agent demo** – Automated analysis that feels like an agent operating the live interface  
✓ **WebMCP status indicator** – Displays whether using native, polyfilled, legacy, or Demo Bridge  
✓ **Genuinely external-visible tools** – `@mcp-b/webmcp-polyfill` puts a real `document.modelContext` on the page, so outside tools (browser extensions, other agents) can discover and call it, not just our own in-page demo  
✓ **Human-verification gate on commitment** – `commit_scenario`'s approval modal requires typing a freshly generated code before Approve unlocks, so a UI-driving agent can't click straight through it the way it could a plain button  
✓ **Editable assumptions** – User or agent can update financial parameters; scenarios recalculate instantly  
✓ **TypeScript type safety** – Narrowly scoped custom type declarations for experimental WebMCP  
✓ **Responsive design** – Polished on desktop; mobile support included  
✓ **No database, no auth, no external APIs** – Fully client-side simulation  

## Current Limitations

- **One active decision at a time:** You can redefine the decision freely, but the app tracks a single decision + goal set, not a saved portfolio of past ones — switching decisions replaces the roadmap rather than archiving it.
- **Deterministic calculations:** No Monte Carlo simulation or probabilistic modeling
- **Simulated commitments:** No real financial transactions
- **No persistence:** Reloading the page resets state (by design)
- **No machine learning:** The agent follows a scripted path, not a learned policy
- **The approval gate raises the bar, it doesn't guarantee a human:** the confirmation code + dwell timer on `commit_scenario` stop a naive UI-clicking agent, but a capable enough multimodal agent could still read the code and type it back. True human-proof would need something like WebAuthn — out of scope here; the code is upfront about this tradeoff.
- **Discoverability depends on the polyfill actually installing:** `@mcp-b/webmcp-polyfill` requires a secure context (HTTPS, or `localhost`). If it can't install for some reason, the app silently falls back to the Demo Bridge — still fully demoable in-page, just not externally visible.

## Future Vision

Imagine Counterfactual as an **agentic browser layer** that:

1. **Intercepts WebMCP tools** from any website before they execute
2. **Forks scenarios** for flights, purchases, API calls, contract actions, etc.
3. **Lets users preview** consequences across multiple futures
4. **Enforces approval gates** for consequential actions
5. **Maintains an audit log** of every decision and its outcome

The same WebMCP tool-discovery, simulation, and approval flow that works in this dashboard could work across the entire web. Counterfactual is a proof of concept for that future.

## Visual Design

A dark, board-like interface — the central metaphor is **forking paths**, made literal: a "Today" node visibly branches into every future via drawn connector lines, not just a row of cards.

- **Background:** Near-black ink tones (`#0a0c12` → `#1b1f2a` surfaces), with a faint dotted board texture
- **Text:** Off-white / light gray on dark (`#e2e4ea` primary, `#767d8f` muted)
- **Agent / simulation actions:** Violet-indigo (`#7c66ff`)
- **Protected goals:** Emerald (`#1fc27f`)
- **Warnings:** Amber (`#ef9a0c`)
- **Risk/rejection/commitment:** Red
- **Cards:** Rounded corners, subtle borders, a restrained glow only on the agent's recommended future
- **Animations:** Smooth transitions, no distracting effects

## Technology Stack

- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Charts:** Recharts (lightweight bar chart for scenario comparison)
- **Icons:** Lucide React
- **WebMCP runtime:** [`@mcp-b/webmcp-polyfill`](https://www.npmjs.com/package/@mcp-b/webmcp-polyfill) — puts a real `document.modelContext` on the page for genuine external discoverability
- **State:** Client-side React hooks (no database)

## Submission Summary

Counterfactual demonstrates that **WebMCP is not just a data-fetching protocol—it's a permission and transparency layer for the agentic web.**

By combining tool discovery, simulation, forking, and approval gates, Counterfactual shows how humans can maintain control and visibility even as agents explore and recommend — and it does this for *any* decision the user defines, not a fixed scenario, via `define_decision` and `set_protected_goal`. The Flight Recorder, scenario branching, and risk classification make agent reasoning inspectable and auditable.

This is the future of responsible agentic AI: not automation that bypasses humans, but collaboration where agents explore possibilities and humans make the final call.

---

**Counterfactual: Choose your future before it chooses you.**
