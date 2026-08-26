/**
 * Typed event fabric — enum adopted verbatim from the source-site recon
 * (PLAN §1). Payloads are FIRM as of the P1 cursor+events lane: each shape
 * below is the contract for its P3 mechanic (docs/p1/cursor-events.md).
 * Additive changes only; renaming a key means updating every consumer AND
 * evals/assert.ts in the same change.
 */

export enum EngineEvent {
  ConfigChange = "CONFIG_CHANGE",
  SetCursorIcon = "SET_CURSOR_ICON",
  SetClickedMesh = "SET_CLICKED_MESH",
  LeaveClickedMesh = "LEAVE_CLICKED_MESH",
  NextPreviousClickedMesh = "NEXT_PREVIOUS_CLICKED_MESH",
  XplodAll = "XPLOD_ALL",
  LongpressToggle = "LONGPRESS_TOGGLE",
  HoverPosition = "HOVER_POSITION",
  UpdateRotations = "UPDATE_ROTATIONS",
  /* Section lifecycle crossings (ADDITIVE — P3 integrate lane). The
   * registry is the one lifecycle OWNER (registry.onLifecycle stays the
   * engine-internal channel); main.ts bridges every crossing onto the bus
   * under these names because the rubric's `lifecycle-events` item
   * subscribes to them via `api.bus.on("enter", …)` (evals/assert.ts). */
  SectionEnter = "enter",
  SectionLeave = "leave",
  SectionEnterCenter = "enterCenter",
  SectionLeaveCenter = "leaveCenter",
}

/**
 * Cursor icon-channel tokens (recon mechanic 1). Kebab-case strings ON
 * PURPOSE — evals/assert.ts round-trips these exact values through
 * SET_CURSOR_ICON and state().cursor.icon.
 */
export type CursorIconName =
  | "finish-swatch"
  | "cross"
  | "arrow-left"
  | "arrow-right"
  | "select";

/** Payload map — the typed contract for every mechanic (PLAN §1). */
export interface EnginePayloads {
  /** Colorway swap (PLAN §1 mechanic 4; consumed by materials, gallery
   *  `<picture>` sets, screen canvas, accent tokens). Canonical form is
   *  `{config: "<id>"}` (the eval harness's shape — ui/colorway.ts CONFIGS
   *  ids); `{finish, band}` is the legacy P2-socket form, still resolved.
   *  `duration` overrides the 1 s material tween (0 = instant);
   *  `restart: true` is the outro SWAP loop — apply at duration 0, then
   *  lenis.scrollTo(0, immediate) (PLAN §1 mechanic 5). */
  [EngineEvent.ConfigChange]: {
    config?: string;
    finish?: string;
    band?: string;
    duration?: number;
    restart?: boolean;
  };
  /** Cursor icon channel; `null` clears it. `color` tints the
   *  finish-swatch icon (defaults to the cursor's swatch fallback). */
  [EngineEvent.SetCursorIcon]: { icon: CursorIconName | null; color?: string };
  /** Exploded view: a part proxy was clicked (part = GLB node name). */
  [EngineEvent.SetClickedMesh]: { part: string };
  /** Exploded view: close the selected part. */
  [EngineEvent.LeaveClickedMesh]: undefined;
  /** Exploded view: step selection (1 = next part, -1 = previous). */
  [EngineEvent.NextPreviousClickedMesh]: { direction: 1 | -1 };
  /** Exploded view: explode/collapse everything. */
  [EngineEvent.XplodAll]: { on: boolean };
  /** Longpress hold-zoom: fired every ramp frame with intensity 0..1
   *  (power3.inOut over LONGPRESS_RAMP_S). `active` flips false on release
   *  while intensity ramps back down. */
  [EngineEvent.LongpressToggle]: { active: boolean; intensity: number };
  /** Details section: 3D-projected screen position of a hover label
   *  (viewport px) + which part it annotates. */
  [EngineEvent.HoverPosition]: { x: number; y: number; part: string };
  /** Rotation-speed multiplier for idle/mechanism spins (1 = base rate). */
  [EngineEvent.UpdateRotations]: { speed: number };
  /** Lifecycle crossings (bridged from the registry — one payload shape
   *  for all four; direction 1 = scrolling down, -1 = up). */
  [EngineEvent.SectionEnter]: { section: string; direction: 1 | -1 };
  [EngineEvent.SectionLeave]: { section: string; direction: 1 | -1 };
  [EngineEvent.SectionEnterCenter]: { section: string; direction: 1 | -1 };
  [EngineEvent.SectionLeaveCenter]: { section: string; direction: 1 | -1 };
}

type Handler<E extends EngineEvent> = (payload: EnginePayloads[E]) => void;

/** Events whose payload is `undefined` may be emitted without an argument. */
type EmitArgs<E extends EngineEvent> = undefined extends EnginePayloads[E]
  ? [payload?: EnginePayloads[E]]
  : [payload: EnginePayloads[E]];

export class EventBus {
  private handlers = new Map<EngineEvent, Set<Handler<EngineEvent>>>();

  on<E extends EngineEvent>(event: E, handler: Handler<E>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<EngineEvent>);
    return () => this.off(event, handler);
  }

  off<E extends EngineEvent>(event: E, handler: Handler<E>): void {
    this.handlers.get(event)?.delete(handler as Handler<EngineEvent>);
  }

  emit<E extends EngineEvent>(event: E, ...args: EmitArgs<E>): void {
    const payload = args[0] as EnginePayloads[E];
    this.handlers.get(event)?.forEach((h) => h(payload));
  }
}

/** Single shared bus — the engine's nervous system. */
export const bus = new EventBus();
