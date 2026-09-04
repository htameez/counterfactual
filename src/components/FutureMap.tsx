"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { FinancialState, Scenario } from "@/types";
import {
  PROJECTION_HORIZON_MONTHS,
  formatCurrency,
  monthsToRebuild,
} from "@/lib/financialCalculations";
import { AlertTriangle, Car, Minus, Plus, ShieldCheck } from "lucide-react";
import DestinationCard from "./DestinationCard";

interface FutureMapProps {
  scenarios: Scenario[];
  recommendedId: string | null;
  committedId: string | null;
  currentCash: number;
  financialState: FinancialState;
  /** False until the user has named a costed decision — a clear canvas. */
  hasDecision: boolean;
  onChoose: (scenarioId: string) => void;
  onExplore: (scenarioId: string) => void;
  onForkCustom: (name: string, purchasePrice: number, waitMonths: number) => void;
  /** Opens the setup drawer so the empty canvas can point somewhere. */
  onConfigure: () => void;
}

const ROUTE_COLORS = ["#35d0ba", "#f6c85f", "#9478ff", "#ff6278", "#5ec1ff"];
// The first three scenarios are the canonical forks; anything past that was
// forked by the user (or agent) and renders as a dashed "custom" route.
const CANONICAL_ROUTES = 3;

// How long one route takes to draw itself out from the Today node. Milestone
// and card delays are derived from this so they pop in as the line front
// reaches them.
const ROUTE_DRAW_SECONDS = 0.9;
const FIRST_ROUTE_DELAY_SECONDS = 0.3;
const ROUTE_STAGGER_SECONDS = 0.45;

// Pan/zoom limits and step sizing for the canvas the routes live on.
const MIN_SCALE = 0.4;
const MAX_SCALE = 2.5;
const WHEEL_ZOOM_SENSITIVITY = 0.0015;
const BUTTON_ZOOM_STEP = 1.25;
// The card column's own top-6/bottom-6 inset and gap-6 spacing (in px) —
// mirrored here so the minimum-required canvas height can be computed from
// real, measured card heights rather than a guessed constant.
const WORLD_VERTICAL_PADDING = 48;
const CARD_GAP = 24;

interface Point {
  x: number;
  y: number;
}

interface MapGeometry {
  start: Point;
  ends: Record<string, Point>;
  width: number;
  height: number;
}

interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

type MilestoneKind = "wait" | "purchase" | "breach" | "rebuilt" | "safe";

interface Milestone {
  t: number;
  kind: MilestoneKind;
  label: string;
}

const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

// Milestone positions are schematic (fractions along the route, like the
// design), while their labels carry the real months from the scenario math.
function milestonesFor(scenario: Scenario, state: FinancialState): Milestone[] {
  const items: Milestone[] = [];
  const purchaseMonth = scenario.waitMonths + 1;

  if (scenario.waitMonths > 0) {
    items.push({
      t: 0.24,
      kind: "wait",
      label: `${scenario.waitMonths} months`,
    });
  }
  items.push({
    t: scenario.waitMonths > 0 ? 0.46 : 0.3,
    kind: "purchase",
    label: `Purchase · month ${purchaseMonth}`,
  });

  if (scenario.goalStatuses.length > 0) {
    const compromised = scenario.goalStatuses.some((g) => !g.preserved);
    if (!compromised) {
      items.push({ t: 0.72, kind: "safe", label: "Goals protected" });
    } else {
      items.push({
        t: 0.62,
        kind: "breach",
        label: `Fund breached · month ${purchaseMonth}`,
      });
      const rebuild = monthsToRebuild(scenario, state);
      if (rebuild !== null) {
        items.push({
          t: 0.84,
          kind: "rebuilt",
          label: `Fund rebuilt · month ${purchaseMonth + rebuild}`,
        });
      }
    }
  }
  return items;
}

function pointAlong(start: Point, end: Point, t: number): Point {
  return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
}

function MilestoneDot({
  point,
  kind,
  label,
  routeColor,
  delay,
}: {
  point: Point;
  kind: MilestoneKind;
  label: string;
  routeColor: string;
  /** Seconds until this milestone pops in (when the route front reaches it). */
  delay: number;
}) {
  const color = kind === "breach" ? "#ff6278" : routeColor;
  return (
    <div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: point.x, top: point.y }}
    >
      <div
        className="animate-pop-in flex h-10 w-10 items-center justify-center rounded-full border-[3px] bg-night-900"
        style={{
          borderColor: color,
          boxShadow: `0 0 6px ${color}`,
          animationDelay: `${delay}s`,
        }}
      >
        {kind === "wait" ? (
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
        ) : kind === "purchase" ? (
          <Car className="h-[19px] w-[19px]" style={{ color }} />
        ) : kind === "breach" ? (
          <AlertTriangle className="h-[19px] w-[19px]" style={{ color }} />
        ) : (
          <ShieldCheck className="h-[19px] w-[19px]" style={{ color }} />
        )}
      </div>
      <p
        className="animate-fade-in absolute left-1/2 top-full mt-1.5 w-[104px] -translate-x-1/2 text-center text-[11px] leading-tight text-fog"
        style={{ animationDelay: `${delay + 0.15}s` }}
      >
        {label}
      </p>
    </div>
  );
}

function ForkFutureDialog({
  onFork,
  onClose,
}: {
  onFork: FutureMapProps["onForkCustom"];
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [wait, setWait] = useState("0");

  const priceNum = Number(price);
  const waitNum = Number(wait);
  const valid =
    name.trim().length > 0 &&
    price.trim().length > 0 &&
    isFinite(priceNum) &&
    priceNum >= 0 &&
    isFinite(waitNum) &&
    waitNum >= 0;

  return (
    <div
      data-no-pan
      className="animate-fade-in absolute bottom-[132px] left-1/2 z-30 w-72 -translate-x-1/2 rounded-[18px] border border-night-600 bg-night-700 p-4 shadow-[0px_16px_32px_rgba(0,0,0,0.4)] [animation-duration:0.25s]"
    >
      <p className="mb-3 text-sm font-bold text-frost">Fork your own future</p>
      <div className="space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name this future"
          autoFocus
          className="w-full rounded-lg border border-night-600 bg-night-800 px-3 py-1.5 text-sm text-frost placeholder:text-fog focus:border-gold focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            step="100"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price ($)"
            className="w-1/2 rounded-lg border border-night-600 bg-night-800 px-3 py-1.5 text-sm text-frost placeholder:text-fog focus:border-gold focus:outline-none"
          />
          <input
            type="number"
            min="0"
            step="1"
            value={wait}
            onChange={(e) => setWait(e.target.value)}
            placeholder="Wait (months)"
            className="w-1/2 rounded-lg border border-night-600 bg-night-800 px-3 py-1.5 text-sm text-frost placeholder:text-fog focus:border-gold focus:outline-none"
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={onClose}
          className="h-9 flex-1 rounded-xl border border-night-600 text-sm text-frost hover:bg-night-600/60"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (!valid) return;
            onFork(name.trim(), priceNum, waitNum);
            onClose();
          }}
          disabled={!valid}
          className="h-9 flex-1 rounded-xl bg-gold text-sm font-medium text-night-950 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Fork it
        </button>
      </div>
    </div>
  );
}

export default function FutureMap({
  scenarios,
  recommendedId,
  committedId,
  currentCash,
  financialState,
  hasDecision,
  onChoose,
  onExplore,
  onForkCustom,
  onConfigure,
}: FutureMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const todayRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const [geometry, setGeometry] = useState<MapGeometry | null>(null);
  const [forkOpen, setForkOpen] = useState(false);

  // The pannable/zoomable canvas. `view` drives rendering (the transform
  // style + the zoom-% readout); `viewRef` mirrors it so measure() can read
  // the latest pan/zoom without depending on it — panning shouldn't force a
  // re-measure of every card's DOM position on every frame.
  const [view, setView] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragRef = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(null);

  // The minimum height the card column actually needs, from real measured
  // card heights (see measure() below) — not a guessed per-card constant,
  // since explanation text length varies enough to make a flat guess
  // unreliable. Populated before first paint, so there's no visible jump.
  const [neededCardHeight, setNeededCardHeight] = useState(0);

  // The canvas grows taller as more futures are forked, so cards get room
  // instead of being squeezed into a fixed viewport height. Width tracks
  // the container 1:1 — routes only need to fan out vertically.
  const worldWidth = containerSize.width || 1200;
  const worldHeight = Math.max(containerSize.height || 700, neededCardHeight);

  // Each route animates in once, when it first appears. The initial batch
  // staggers left-to-right like the futures are being forged one after
  // another; anything forked later (by the user or the agent) starts almost
  // immediately, since the agent already paces its forks. Delays are kept
  // in a ref so re-renders never restart a finished animation.
  const routeDelaysRef = useRef(new Map<string, number>());
  const isInitialBatchRef = useRef(true);
  scenarios.forEach((scenario, i) => {
    if (!routeDelaysRef.current.has(scenario.id)) {
      routeDelaysRef.current.set(
        scenario.id,
        isInitialBatchRef.current
          ? FIRST_ROUTE_DELAY_SECONDS + i * ROUTE_STAGGER_SECONDS
          : 0.05
      );
    }
  });
  useEffect(() => {
    if (scenarios.length > 0) {
      isInitialBatchRef.current = false;
    } else {
      // Canvas emptied out (reset, new decision) — forget the old
      // requirement so it doesn't leave the empty canvas artificially tall.
      setNeededCardHeight(0);
    }
  }, [scenarios.length]);
  const delayFor = (id: string) => routeDelaysRef.current.get(id) ?? 0;

  // Measures Today's and each card's screen position, then converts back
  // into the canvas's own local coordinates (undoing the current pan/zoom)
  // so routes/milestones — rendered inside the same transformed layer —
  // stay correctly anchored at any pan or zoom level without re-measuring.
  const measure = useCallback(() => {
    const map = mapRef.current;
    const today = todayRef.current;
    if (!map || !today) return;
    const mapBox = map.getBoundingClientRect();
    const { x: tx, y: ty, scale } = viewRef.current;
    const toLocal = (screenX: number, screenY: number): Point => ({
      x: (screenX - mapBox.left - tx) / scale,
      y: (screenY - mapBox.top - ty) / scale,
    });

    const todayBox = today.getBoundingClientRect();
    const ends: Record<string, Point> = {};
    // getBoundingClientRect returns already-scaled screen pixels, so a
    // *size* (unlike a position) converts back to local units by dividing
    // out the scale alone — no translate offset involved.
    let cardHeightTotal = 0;
    cardRefs.current.forEach((el, id) => {
      const box = el.getBoundingClientRect();
      ends[id] = toLocal(box.left, box.top + box.height / 2);
      cardHeightTotal += box.height / scale;
    });
    if (cardRefs.current.size > 0) {
      const minimum =
        cardHeightTotal +
        Math.max(cardRefs.current.size - 1, 0) * CARD_GAP +
        WORLD_VERTICAL_PADDING;
      setNeededCardHeight((prev) => (Math.abs(minimum - prev) > 1 ? minimum : prev));
    }
    setGeometry({
      start: toLocal(todayBox.right, todayBox.top + todayBox.height / 2),
      ends,
      width: worldWidth,
      height: worldHeight,
    });
  }, [worldWidth, worldHeight]);

  // Track the container's own (untransformed) size — this is what grows
  // the canvas and drives fit-to-view; it does not change with pan/zoom.
  useLayoutEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = () => {
      const rect = map.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(map);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure, scenarios, recommendedId, committedId]);

  // Scales (and, if needed, shrinks) the view so every current future fits
  // on screen at once — never zooms in past 100% just because the canvas
  // is short.
  const fitView = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const { width: cw, height: ch } = map.getBoundingClientRect();
    if (cw === 0 || ch === 0) return;
    const scale = clampScale(Math.min(1, ch / worldHeight));
    setView({
      scale,
      x: (cw - worldWidth * scale) / 2,
      y: (ch - worldHeight * scale) / 2,
    });
  }, [worldWidth, worldHeight]);

  // Auto-frame the map the moment it goes from an empty canvas to
  // populated, then leave the view entirely under the user's control —
  // forking one more future later shouldn't yank away a view they framed
  // on purpose. Re-arms the next time the canvas empties out (a reset, or
  // a new decision clearing the old futures).
  const didAutoFitRef = useRef(false);
  useEffect(() => {
    if (scenarios.length === 0) {
      didAutoFitRef.current = false;
      return;
    }
    if (!didAutoFitRef.current && containerSize.width > 0) {
      fitView();
      didAutoFitRef.current = true;
    }
  }, [scenarios.length, containerSize.width, fitView]);

  // Zoom by a multiplicative factor, anchored at a point in container
  // coordinates (defaults to center, e.g. for the +/- buttons) so the
  // content under that point stays put as the scale changes.
  const zoomBy = useCallback((factor: number, anchor?: Point) => {
    setView((prev) => {
      const nextScale = clampScale(prev.scale * factor);
      if (nextScale === prev.scale) return prev;
      const map = mapRef.current;
      const rect = map?.getBoundingClientRect();
      const ax = anchor?.x ?? (rect ? rect.width / 2 : 0);
      const ay = anchor?.y ?? (rect ? rect.height / 2 : 0);
      const worldX = (ax - prev.x) / prev.scale;
      const worldY = (ay - prev.y) / prev.scale;
      return { scale: nextScale, x: ax - worldX * nextScale, y: ay - worldY * nextScale };
    });
  }, []);

  // Wheel handling is wired up natively (not via JSX onWheel) so
  // preventDefault reliably stops the browser's own scroll/page-zoom.
  // Plain scroll pans the canvas; Ctrl/Cmd+scroll (also how browsers report
  // trackpad pinch gestures) zooms around the cursor.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = map.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_SENSITIVITY);
        zoomBy(factor, { x: px, y: py });
      } else {
        setView((prev) => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    };
    map.addEventListener("wheel", onWheel, { passive: false });
    return () => map.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  // Click-and-drag panning. Starting a drag on an interactive element
  // (a card, a button, a dialog — anything marked data-no-pan) is left
  // alone so its own click/drag behavior still works.
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-no-pan]")) return;
    dragRef.current = { pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPanning(true);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.lastX;
    const dy = e.clientY - drag.lastY;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    setView((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  };
  const endPan = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
      setIsPanning(false);
    }
  };

  const hasCustomRoutes = scenarios.length > CANONICAL_ROUTES;

  return (
    <div
      ref={mapRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      className={`relative flex-1 touch-none select-none overflow-hidden bg-night-900 bg-board bg-[length:22px_22px] ${
        isPanning ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      {/* Pannable/zoomable canvas: Today, routes, milestones, and cards all
          live in this one transformed layer so they move and scale as one. */}
      <div
        className="absolute left-0 top-0"
        style={{
          width: worldWidth,
          height: worldHeight,
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          transformOrigin: "0 0",
        }}
      >
        {/* Today node. The pop animation lives on an inner element so the
            measured (outer) box never moves — routes anchor to it. */}
        <div
          ref={todayRef}
          data-tour="today-node"
          className="absolute left-[50px] top-1/2 z-10 w-[132px] -translate-y-1/2"
        >
          <div className="animate-pop-in rounded-[18px] border-2 border-white bg-night-700 p-3.5">
            <p className="text-[10px] font-extrabold tracking-wide text-fog">
              TODAY
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-frost">
              {formatCurrency(currentCash)}
            </p>
          </div>
        </div>

        {/* Routes */}
        {geometry && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            aria-hidden
          >
            {/* Dashed hint toward an unforked future */}
            {scenarios.length > 0 && !hasCustomRoutes && (
              <line
                className="animate-fade-in"
                x1={geometry.start.x}
                y1={geometry.start.y}
                x2={geometry.start.x + geometry.width * 0.42}
                y2={geometry.start.y - geometry.height * 0.34}
                stroke="#8994ad"
                strokeOpacity={0.45}
                strokeWidth={2}
                strokeDasharray="6 7"
                style={{ animationDelay: "1.9s" }}
              />
            )}
            {scenarios.map((scenario, i) => {
              const end = geometry.ends[scenario.id];
              if (!end) return null;
              const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
              const emphasized =
                scenario.id === recommendedId || scenario.id === committedId;
              const isCustom = i >= CANONICAL_ROUTES;
              const length = Math.hypot(
                end.x - geometry.start.x,
                end.y - geometry.start.y
              );
              const delay = delayFor(scenario.id);
              return (
                <line
                  key={scenario.id}
                  className={isCustom ? "animate-fade-in" : "animate-draw-route"}
                  x1={geometry.start.x}
                  y1={geometry.start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={color}
                  strokeWidth={emphasized ? 7 : isCustom ? 2.5 : 4.5}
                  strokeLinecap="round"
                  strokeDasharray={isCustom ? "8 8" : undefined}
                  style={{
                    filter: `drop-shadow(0 0 4px ${color})`,
                    animationDelay: `${delay}s`,
                    // Dash-offset draw trick: hide the whole stroke, then
                    // let the animation reel it out from the Today node.
                    ...(isCustom
                      ? {}
                      : { strokeDasharray: length, strokeDashoffset: length }),
                  }}
                />
              );
            })}
          </svg>
        )}

        {/* Route labels + milestones */}
        {geometry &&
          scenarios.map((scenario, i) => {
            const end = geometry.ends[scenario.id];
            if (!end) return null;
            const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
            const labelPoint = pointAlong(geometry.start, end, 0.14);
            const delay = delayFor(scenario.id);
            return (
              <div key={scenario.id}>
                <p
                  className="animate-fade-in absolute z-10 -translate-x-1/4 whitespace-nowrap text-xs font-bold uppercase tracking-wide"
                  style={{
                    left: labelPoint.x,
                    top: labelPoint.y + 12,
                    color,
                    animationDelay: `${delay + 0.15}s`,
                  }}
                >
                  {scenario.name}
                </p>
                {milestonesFor(scenario, financialState).map((m) => (
                  <MilestoneDot
                    key={`${scenario.id}-${m.kind}-${m.t}`}
                    point={pointAlong(geometry.start, end, m.t)}
                    kind={m.kind}
                    label={m.label}
                    routeColor={color}
                    delay={delay + m.t * ROUTE_DRAW_SECONDS}
                  />
                ))}
              </div>
            );
          })}

        {/* Destination cards */}
        <div className="absolute bottom-6 right-7 top-6 z-10 flex flex-col justify-evenly gap-6">
          {scenarios.map((scenario, i) => (
            // The entrance animation sits on this measured wrapper: card-in
            // only scales about the center, so the route's anchor point
            // (left-center of this box) stays put while it animates.
            <div
              key={scenario.id}
              className="animate-card-in"
              style={{
                animationDelay: `${delayFor(scenario.id) + ROUTE_DRAW_SECONDS * 0.8}s`,
              }}
              ref={(el) => {
                if (el) cardRefs.current.set(scenario.id, el);
                else cardRefs.current.delete(scenario.id);
              }}
            >
              <DestinationCard
                scenario={scenario}
                routeColor={ROUTE_COLORS[i % ROUTE_COLORS.length]}
                isRecommended={scenario.id === recommendedId}
                isCommitted={scenario.id === committedId}
                financialState={financialState}
                onChoose={onChoose}
                onExplore={onExplore}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Map label — fixed HUD, doesn't pan or zoom with the canvas */}
      <div className="animate-fade-up pointer-events-none absolute left-7 top-[22px] z-10">
        <h2 className="text-2xl font-bold text-frost">Your possible futures</h2>
        <p className="mt-0.5 text-xs text-fog">
          AI-simulated from your finances and protected goals
        </p>
      </div>

      {/* Clear canvas: nothing forked yet */}
      {scenarios.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-fade-in flex flex-col items-center gap-4 text-center">
            {hasDecision ? (
              <p className="max-w-sm text-sm text-fog">
                Run <span className="text-gold">Explore futures</span> to
                simulate where this decision could take you.
              </p>
            ) : (
              <>
                <p className="max-w-sm text-sm text-fog">
                  This canvas is yours. Set up your finances, name the
                  decision you&apos;re weighing, and protect what matters —
                  then watch your possible futures branch out from Today.
                </p>
                <button
                  onClick={onConfigure}
                  data-no-pan
                  className="flex h-10 items-center gap-2 rounded-xl border border-gold bg-gold px-4 text-sm font-medium text-night-950 transition-opacity hover:opacity-90"
                >
                  Set up your decision
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Fork your own future, zoom controls, and the timeline are fixed
          HUD chrome — they stay put on screen regardless of pan/zoom. */}
      {scenarios.length > 0 && (
        <>
          <button
            onClick={() => setForkOpen((v) => !v)}
            data-no-pan
            data-tour="fork-future"
            className="animate-fade-in absolute bottom-[92px] left-1/2 z-20 -translate-x-1/2 text-sm text-fog transition-colors hover:text-frost"
            style={{ animationDelay: "1.6s" }}
          >
            Fork your own future +
          </button>
          {forkOpen && (
            <ForkFutureDialog
              onFork={onForkCustom}
              onClose={() => setForkOpen(false)}
            />
          )}

          {/* Timeline */}
          <div
            className="animate-fade-in pointer-events-none absolute bottom-[26px] left-[70px] right-[330px] flex justify-between text-[11px]"
            style={{ animationDelay: "1.3s" }}
          >
            <span className="text-frost">NOW</span>
            <span className="text-fog">6 MO</span>
            <span className="text-fog">12 MO</span>
            <span className="text-fog">{PROJECTION_HORIZON_MONTHS} MO</span>
          </div>
        </>
      )}

      {/* Zoom controls */}
      {scenarios.length > 0 && (
        <div
          data-no-pan
          data-tour="zoom-controls"
          className="absolute bottom-[52px] left-7 z-30 flex items-center gap-0.5 rounded-xl border border-night-600 bg-night-800/90 p-1 backdrop-blur-sm"
        >
          <button
            onClick={() => zoomBy(1 / BUTTON_ZOOM_STEP)}
            disabled={view.scale <= MIN_SCALE + 0.001}
            title="Zoom out"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-fog transition-colors hover:bg-night-700 hover:text-frost disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={fitView}
            title="Fit all futures in view"
            className="rounded-lg px-2 py-1 font-mono text-xs text-fog transition-colors hover:bg-night-700 hover:text-frost"
          >
            {Math.round(view.scale * 100)}%
          </button>
          <button
            onClick={() => zoomBy(BUTTON_ZOOM_STEP)}
            disabled={view.scale >= MAX_SCALE - 0.001}
            title="Zoom in"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-fog transition-colors hover:bg-night-700 hover:text-frost disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
