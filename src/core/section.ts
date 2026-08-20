/**
 * Section base — the unit every P2 agent builds (PLAN §3 decision record +
 * §1 scroll grammar).
 *
 * A section owns ONE scroll track (`[data-section="<Name>"]`, height set
 * from its vh budget in svh) and exposes TWO progress channels:
 *
 *   - DOM channel (`tickDom`) — local progress over the RAW bounds:
 *       pinned  (budget > 100): [top, top + height - vh]  (the sticky range;
 *               progress hits 1 exactly when the pin releases)
 *       unpinned:               [top - vh, top + height]  (viewport
 *               traversal; first section clamped to 0, last clamped to
 *               maxScroll so progress actually reaches 1)
 *     Driven RAW every frame — never lerped (Spike B pitfall #8).
 *
 *   - WebGL channel (`tickWebgl`) — local progress over OFFSET-EXTENDED
 *     bounds for cross-section camera handoffs (source's webglStart/End):
 *       webglStart = rawStart + vh * startOffset
 *       webglEnd   = rawEnd   + vh * endOffset
 *     Sign convention (SPIKE-B open question #1, now decided): offsets are
 *     in viewport-height units; NEGATIVE startOffset starts the WebGL
 *     timeline EARLIER (reaches back into the previous section), POSITIVE
 *     endOffset ends it LATER. First section's webglStart is clamped to 0
 *     and last section's webglEnd to maxScroll (viewport clamping), so the
 *     extended timeline still spans exactly 0..1.
 *     Consumers may lerp their own master progress (CameraRig does); the
 *     scroll position itself arrives raw.
 *
 * Scrub adapters: animation is expressed as `{duration, tick(progress)}`
 * adapters — for GSAP, a PAUSED timeline scrubbed via `.progress()`
 * (`timelineAdapter`). Adapters registered per channel are ticked in
 * registration order. Sections may also override tickDom/tickWebgl for
 * imperative work; call super to keep adapters running.
 *
 * Lifecycle: the REGISTRY owns crossing detection (one ordered owner —
 * SPIKE-B open question #2, decided) and calls the section's onEnter /
 * onLeave / onEnterCenter / onLeaveCenter hooks once per crossing per
 * direction. enter/leave = track intersects the viewport; enterCenter /
 * leaveCenter = the viewport CENTER LINE (scroll + 0.5vh) is inside the
 * raw bounds (PLAN §1 "±0.5vh").
 *
 * State contract: `requiredEnterState` / `guaranteedExitState` (partial —
 * absent key = don't-care / unchanged). The registry asserts continuity at
 * registration. Any section runs standalone via `?solo=<Name>`: only its
 * track is mounted and its requiredEnterState is applied to the store as a
 * stub.
 */

import { LONGPRESS_ZOOM_DEFAULT, SECTION_VH, type SectionName } from "./constants";
import type { PartialState } from "./state";

/** Direction of a lifecycle crossing: 1 = scrolling down, -1 = up. */
export type ScrollDirection = 1 | -1;

/** The scrub adapter shape (source pattern: paused timelines). */
export interface ScrubAdapter {
  /** Relative weight/length — informational (GSAP: timeline.duration()). */
  readonly duration: number;
  /** Apply local progress 0..1 (clamped by the caller). */
  tick(progress: number): void;
}

/** Wrap a PAUSED GSAP timeline as a scrub adapter. */
export function timelineAdapter(tl: gsap.core.Timeline): ScrubAdapter {
  if (!tl.paused()) tl.pause(); // progress() is the only driver, ever
  return {
    duration: tl.duration(),
    tick: (p) => void tl.progress(p),
  };
}

export interface SectionSpec {
  name: SectionName;
  /** Track height in svh; defaults to the SECTION_VH budget table. */
  vhBudget?: number;
  /** WebGL bound extension, viewport-height units (negative = earlier). */
  startOffset?: number;
  /** WebGL bound extension, viewport-height units (positive = later). */
  endOffset?: number;
  /** State axes this section assumes on entry (absent = don't care). */
  requiredEnterState?: PartialState;
  /** State axes this section promises on exit (absent = unchanged). */
  guaranteedExitState?: PartialState;
  /**
   * Longpress hold-zoom camera multiplier for THIS section (PLAN §1
   * mechanic 2: per-section zoomMultiplier). Consumed by the camera rig
   * while the section owns the viewport center line; defaults to
   * LONGPRESS_ZOOM_DEFAULT. 1 = the hold does not dolly here.
   */
  zoomMultiplier?: number;
}

export class SectionBase {
  readonly name: SectionName;
  readonly vhBudget: number;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly requiredEnterState: PartialState;
  readonly guaranteedExitState: PartialState;
  readonly zoomMultiplier: number;
  readonly element: HTMLElement;

  private webglAdapters: ScrubAdapter[] = [];
  private domAdapters: ScrubAdapter[] = [];

  constructor(spec: SectionSpec) {
    this.name = spec.name;
    this.vhBudget = spec.vhBudget ?? SECTION_VH[spec.name];
    this.startOffset = spec.startOffset ?? 0;
    this.endOffset = spec.endOffset ?? 0;
    this.requiredEnterState = spec.requiredEnterState ?? {};
    this.guaranteedExitState = spec.guaranteedExitState ?? {};
    this.zoomMultiplier = spec.zoomMultiplier ?? LONGPRESS_ZOOM_DEFAULT;
    this.element = SectionBase.findElement(spec.name);
    // svh sizing from the budget table — ONE source of truth (no CSS
    // per-track height classes; iOS URL-bar safe).
    this.element.style.height = `${this.vhBudget}svh`;
  }

  /** True when the track is taller than the viewport (sticky pin inside). */
  get pinned(): boolean {
    return this.vhBudget > 100;
  }

  static findElement(name: SectionName): HTMLElement {
    const el = document.querySelector<HTMLElement>(`[data-section="${name}"]`);
    if (!el) throw new Error(`Section: no element [data-section="${name}"]`);
    return el;
  }

  /* ---- channels ---------------------------------------------------------- */

  addWebglAdapter(adapter: ScrubAdapter): void {
    this.webglAdapters.push(adapter);
  }

  addDomAdapter(adapter: ScrubAdapter): void {
    this.domAdapters.push(adapter);
  }

  /** WebGL channel — offset-extended local progress, every frame. */
  tickWebgl(progress: number): void {
    for (const a of this.webglAdapters) a.tick(progress);
  }

  /** DOM channel — raw-bounds local progress, every frame, never lerped. */
  tickDom(progress: number): void {
    for (const a of this.domAdapters) a.tick(progress);
  }

  /* ---- lifecycle hooks (called by the registry, once per crossing) ------- */

  onEnter(_direction: ScrollDirection): void {}
  onLeave(_direction: ScrollDirection): void {}
  onEnterCenter(_direction: ScrollDirection): void {}
  onLeaveCenter(_direction: ScrollDirection): void {}
}
