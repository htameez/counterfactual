import { driver, type DriveStep, type Side } from "driver.js";

/**
 * Every possible stop on the tour, in narrative order. `selector` is looked
 * up right before the tour starts — only steps whose element actually
 * exists survive, so the same tour works whether it's launched on a blank
 * canvas or a fully forked map, instead of pointing at nothing or crashing
 * on a missing target.
 */
interface TourStepDef {
  selector: string;
  title: string;
  description: string;
  side?: Side;
}

const TOUR_STEPS: TourStepDef[] = [
  {
    selector: '[data-tour="brand"]',
    title: "Welcome to Counterfactual",
    description:
      "This turns a decision into a map of the futures it could lead to — and lets an AI agent explore that map for you, using real browser tools, out in the open.",
    side: "bottom",
  },
  {
    selector: '[data-tour="decision-pill"]',
    title: "Start with a real decision",
    description:
      "Name what you're actually weighing and its all-in cost — a purchase, a leave of absence, anything with a price tag.",
    side: "bottom",
  },
  {
    selector: '[data-tour="explore-futures"]',
    title: "Hand it to an agent",
    description:
      "One click asks an agent to fork this decision into a few different futures — doing it now, waiting, or a cheaper version — and compare them for you.",
    side: "bottom",
  },
  {
    selector: '[data-tour="today-node"]',
    title: "Everything starts here",
    description:
      "Every path on the map forks from exactly where your finances stand today — not a guess, your real numbers.",
    side: "right",
  },
  {
    selector: '[data-tour="destination-card"]',
    title: "Each card is a possible future",
    description:
      "Projected savings, whether your protected goals survive, and a plain-English read on the tradeoff.",
    side: "left",
  },
  {
    selector: '[data-tour="recommended-flag"]',
    title: "The agent's pick",
    description:
      "Scored on your protected goals and risk — not just the biggest number.",
    side: "top",
  },
  {
    selector: '[data-tour="fork-future"]',
    title: "Not one of the defaults?",
    description: "Fork your own price and timeline — the map grows to fit.",
    side: "top",
  },
  {
    selector: '[data-tour="zoom-controls"]',
    title: "Zoom and pan",
    description:
      "Fork five paths or fifty — pan around the map, or fit every future in view with one click.",
    side: "top",
  },
  {
    selector: '[data-tour="protected-goals"]',
    title: "What you don't want to risk",
    description:
      "Goals you've told the agent never to compromise — every future gets checked against them.",
    side: "top",
  },
  {
    selector: '[data-tour="activity-button"]',
    title: "Nothing happens off to the side",
    description:
      "Every tool call an agent makes — yours or an external one — lands here: what it did, how risky it was, and why.",
    side: "bottom",
  },
];

let tourInstance: ReturnType<typeof driver> | null = null;

/** Builds the step list from whatever's actually on screen right now. */
function resolveSteps(): DriveStep[] {
  return TOUR_STEPS.filter((step) =>
    document.querySelector(step.selector)
  ).map((step) => ({
    element: step.selector,
    // Defensive: if the target disappears mid-tour (a resize, a state
    // change), skip past it instead of getting stuck.
    skipMissingElement: true,
    popover: {
      title: step.title,
      description: step.description,
      side: step.side,
    },
  }));
}

/**
 * Starts (or restarts) the guided tour. Safe to call from anywhere client-
 * side — each call re-resolves which steps apply to the app's current
 * state, so a tour launched on an empty canvas and one launched after a
 * decision's been explored cover different ground automatically.
 */
export function startProductTour(): void {
  if (typeof window === "undefined") return;

  const steps = resolveSteps();
  if (steps.length === 0) return;

  tourInstance?.destroy();
  tourInstance = driver({
    showProgress: true,
    animate: true,
    overlayOpacity: 0.65,
    stagePadding: 6,
    stageRadius: 12,
    popoverClass: "cf-tour-popover",
    nextBtnText: "Next →",
    prevBtnText: "← Back",
    doneBtnText: "Done",
    steps,
  });
  tourInstance.drive();
}

const TOUR_SEEN_KEY = "counterfactual:tour-seen";

/** Launches the tour once per browser, the first time the app is opened. */
export function startProductTourOnFirstVisit(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(TOUR_SEEN_KEY)) return;
    window.localStorage.setItem(TOUR_SEEN_KEY, "1");
  } catch {
    // Private browsing / storage disabled — just don't auto-launch; the
    // help button still starts the tour on demand either way.
    return;
  }
  startProductTour();
}
