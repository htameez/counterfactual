# Counterfactual: WebMCP-Powered Decision Simulator

## What is Counterfactual?

**Counterfactual** is a preview and permission layer for the agentic web. It consumes WebMCP tools, turns consequential actions into explorable future branches, and lets people inspect, revise, and approve outcomes before agents act.

Counterfactual demonstrates a critical principle: **agents shouldn't discover the consequences of an action after executing it.**

## The Problem

Today, when an agent takes an action—booking a flight, making a financial decision, sending an email—you typically learn the consequences only after the fact. By then, it's often too late to change course.

Counterfactual inverts this: it **simulates the future**, lets you explore multiple outcomes, and only executes actions you explicitly approve.

## Why WebMCP Is Essential

WebMCP (Model Context Protocol for the Web) allows Counterfactual to:

1. **Discover** what tools are available in the browser environment
2. **Classify** tools by risk level (read-only, simulation, commitment, etc.)
3. **Intercept** actions before they cross from simulation to reality
4. **Record** every step so you can inspect and audit agent reasoning
5. **Enforce** explicit approval for consequential actions

Without WebMCP, Counterfactual would be a pre-built financial calculator. With it, Counterfactual is a **permission and preview system** that can scale to any agentic task.

## Human-Agent Collaboration Flow

1. **User sets assumptions** (cash, income, expenses, goals)
2. **Agent discovers** available WebMCP tools
3. **Agent explores** multiple scenarios in simulation
4. **Agent recommends** the best path based on protected goals
5. **User inspects** the Flight Recorder to understand the agent's reasoning
6. **User approves** the chosen scenario, or rejects and revises
7. **System records** the decision in the Flight Recorder

At every step, the human maintains visibility and control.

## The Six WebMCP Tools

### 1. `get_financial_state`
**Risk:** Read-only | **Confirmation:** Not required

Returns your current assumptions and protected financial goals.

**Response:**
```json
{
  "cashSavings": 72000,
  "monthlyTakeHome": 6000,
  "monthlyLivingExpenses": 3200,
  "teslaPurchasePrice": 44000,
  "emergencyFundMinimum": 19200,
  "graduateSchoolReserve": 18000,
  "austinMovingCost": 6000
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

### 3. `fork_scenario`
**Risk:** Simulation | **Confirmation:** Not required

Simulates a purchase scenario and returns calculated outcomes.

**Inputs:**
- `name` (string): Scenario name (e.g., "Buy Now")
- `purchasePrice` (number): Price to pay
- `waitMonths` (number): Months to wait before purchase

**Response:**
```json
{
  "id": "scenario-buy-now",
  "name": "Buy Now",
  "purchasePrice": 44000,
  "waitMonths": 0,
  "cashAfterPurchase": 28000,
  "emergencyFundPreserved": true,
  "graduateSchoolPreserved": false,
  "movingFundsPreserved": false,
  "riskLevel": "Medium",
  "explanation": "Buying now preserves emergency fund but risks grad school reserve."
}
```

### 4. `compare_scenarios`
**Risk:** Read-only | **Confirmation:** Not required

Analyzes all simulated futures and identifies the strongest scenario.

**Response:**
```json
{
  "recommended": { /* scenario object */ },
  "all": [ /* all scenarios */ ],
  "analysis": {
    "bestChoice": "Buy Used",
    "reason": "Preserves all protected goals with lowest financial stress"
  }
}
```

### 5. `simulate_purchase`
**Risk:** Simulation | **Confirmation:** Not required

Shows exactly what your finances look like after a purchase—but does not execute it.

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
    "emergencyFundSafe": true,
    "graduateSchoolSafe": false
  }
}
```

### 6. `commit_scenario`
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

## WebMCP Context: Native vs. Demo Bridge

Counterfactual supports three WebMCP contexts:

### Native WebMCP
- **Status:** `document.modelContext` available
- **Behavior:** Uses browser-provided WebMCP
- **Indicator:** "Native WebMCP" in header

### Legacy WebMCP
- **Status:** `navigator.modelContext` available (fallback)
- **Behavior:** Uses legacy WebMCP API
- **Indicator:** "Legacy WebMCP" in header

### Demo Bridge
- **Status:** No native WebMCP found
- **Behavior:** Local, in-memory tool registry
- **Indicator:** "Demo Bridge" in header
- **Note:** Fully functional for demonstration—no functionality is lost

### Unavailable
- **Status:** No WebMCP support
- **Behavior:** Limited functionality
- **Indicator:** "WebMCP Unavailable" in header

The application always displays its actual context. It **never falsely claims native WebMCP** if using the Demo Bridge.

## Target API

```typescript
// Detect available context
const context = document.modelContext ?? navigator.modelContext

// Register a tool
await context.registerTool(
  name: string,
  description: string,
  inputSchema: JSONSchema,
  handler: (args: unknown) => unknown
)

// Invoke a tool
const result = await context.invokeTool(name: string, args: unknown)

// Discover available tools
const tools = await context.discoverTools(): WebMCPTool[]
```

For compatibility, Counterfactual includes a **compatibility helper** that checks both `document.modelContext` and `navigator.modelContext`, and falls back to the **Demo Bridge** if neither is available.

## Demo Scenario

The application focuses on one decision: **Should I buy a Tesla Model 3 in cash?**

### Assumptions
- **Cash savings:** $72,000
- **Monthly take-home:** $6,000
- **Monthly expenses:** $3,200
- **Monthly savings:** $2,800
- **Tesla price (all-in):** $44,000
- **Emergency fund minimum:** $19,200
- **Grad school reserve:** $18,000
- **Austin moving cost:** $6,000

### Three Futures
1. **Buy Now** – Purchase immediately
2. **Wait 8 Months** – Accumulate savings first
3. **Buy Used** – Buy a used Model 3 for $32,000

Each scenario shows:
- Remaining cash immediately after purchase
- Remaining cash after 12 months
- Whether all protected goals are preserved
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
   - Gets financial state
   - Forks three scenarios (Buy Now, Wait 8 Months, Buy Used)
   - Compares them
   - Recommends the best choice

3. **Inspect the Flight Recorder:** "Every tool invocation is recorded with its risk classification, arguments, and status. This is the agent's audit trail."

4. **Explore a scenario:** Click "Explore This Future" on any scenario. See the simulation of what your finances would look like.

5. **Simulate a commitment:** The agent can recommend "Buy Used"—which preserves all three protected goals (emergency fund, grad school, moving costs).

6. **Approve or reject:** If you were to commit, a modal would require explicit approval. This is where humans stay in control.

7. **Edit assumptions:** Try changing "Cash savings" to $80,000 and watch all scenarios recalculate instantly.

8. **Reset:** Click "Reset Demo" to restore defaults and clear the Flight Recorder.

## Key Features

✓ **Polished desktop-first interface** – Clean, readable, no excessive gradients or glowing effects  
✓ **Three forked futures** – Visual scenario cards with risk classification and explanations  
✓ **Real-time Flight Recorder** – Tool invocations recorded with risk and status  
✓ **Approval gates** – Consequential actions require explicit human confirmation  
✓ **Scripted agent demo** – Automated analysis that feels like an agent operating the live interface  
✓ **WebMCP status indicator** – Displays whether using native, legacy, or Demo Bridge  
✓ **Editable assumptions** – User or agent can update financial parameters; scenarios recalculate instantly  
✓ **TypeScript type safety** – Narrowly scoped custom type declarations for experimental WebMCP  
✓ **Responsive design** – Polished on desktop; mobile support included  
✓ **No database, no auth, no external APIs** – Fully client-side simulation  

## Current Limitations

- **Single scenario:** Focused on the Tesla purchase decision only
- **Deterministic calculations:** No Monte Carlo simulation or probabilistic modeling
- **Simulated commitments:** No real financial transactions
- **No persistence:** Reloading the page resets state (by design)
- **No machine learning:** The agent follows a scripted path, not a learned policy

## Future Vision

Imagine Counterfactual as an **agentic browser layer** that:

1. **Intercepts WebMCP tools** from any website before they execute
2. **Forks scenarios** for flights, purchases, API calls, contract actions, etc.
3. **Lets users preview** consequences across multiple futures
4. **Enforces approval gates** for consequential actions
5. **Maintains an audit log** of every decision and its outcome

The same WebMCP tool-discovery, simulation, and approval flow that works in this dashboard could work across the entire web. Counterfactual is a proof of concept for that future.

## Visual Design

- **Background:** Warm off-white (`#fafaf8`)
- **Text:** Deep navy (`#1a1a16`)
- **Agent actions:** Indigo (`#2727ff`)
- **Protected goals:** Emerald (`#22c55e`)
- **Warnings:** Amber (`#f59e0b`)
- **Risk/rejection:** Red (`#dc2626`)
- **Cards:** Rounded corners, subtle shadows, clear hierarchy
- **Animations:** Smooth transitions, no distracting effects

## Technology Stack

- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Charts:** Recharts (lightweight bar chart for scenario comparison)
- **Icons:** Lucide React
- **State:** Client-side React hooks (no database)

## Submission Summary

Counterfactual demonstrates that **WebMCP is not just a data-fetching protocol—it's a permission and transparency layer for the agentic web.**

By combining tool discovery, simulation, forking, and approval gates, Counterfactual shows how humans can maintain control and visibility even as agents explore and recommend. The Flight Recorder, scenario branching, and risk classification make agent reasoning inspectable and auditable.

This is the future of responsible agentic AI: not automation that bypasses humans, but collaboration where agents explore possibilities and humans make the final call.

---

**Counterfactual: Choose your future before it chooses you.**
