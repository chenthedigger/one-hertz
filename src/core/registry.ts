/**
 * Section registry — the scrub fabric + lifecycle owner + contract auditor
 * (PLAN §3 decision record).
 *
 * Responsibilities:
 *   1. Geometry. Measured from getBoundingClientRect() + scrollY AFTER
 *      layout (never innerHeight × budget — wrong under iOS URL-bar
 *      states). Re-measured via `measure()` (engine calls it debounced at
 *      scroll-idle). Computes each section's RAW (DOM) bounds and
 *      OFFSET-EXTENDED (WebGL) bounds — see section.ts for the bound
 *      grammar and sign convention.
 *   2. Scrubbing. `update(rawScroll)` delivers BOTH channels every frame:
 *      `tickDom(progressDom)` over raw bounds, `tickWebgl(progressWebgl)`
 *      over extended bounds. Raw Lenis scroll in — the registry never
 *      smooths position (single smoothing owner rule).
 *   3. Lifecycle. The registry is the ONE ordered owner of crossing
 *      detection: enter/leave (track intersects viewport) and
 *      enterCenter/leaveCenter (viewport center line, scroll + 0.5vh,
 *      inside raw bounds). Each fires exactly once per crossing, with the
 *      scroll direction. In-view state starts false, so the first update
 *      fires enter/enterCenter (direction +1) for whatever is on screen —
 *      deep-linked and solo boots initialize sections the same way.
 *   4. Contracts. `register()` asserts state-contract continuity against
 *      the fold of all previously registered sections' exit states, and
 *      asserts canonical order (SECTION_ORDER). Violations throw AT BOOT.
 *      Solo mode (`?solo=`) skips both — the sandbox stubs enter-state
 *      instead.
 *
 * Eval transport: `(sectionId, localProgress)` addresses the RAW (DOM)
 * bounds — `scrollPositionFor` inverts exactly what `progressDom` measures.
 */

import { CENTER_LINE_VH, SECTION_ORDER, SECTION_SOURCE_ROLE, type SectionName } from "./constants";
import type { ScrollDirection, SectionBase } from "./section";
import {
  contractConflicts,
  foldExitState,
  INITIAL_STATE,
  type EngineStateContract,
} from "./state";

/** Frames an out-of-view section keeps ticking after its clamped progress
 *  stops moving (~2 s at 60 Hz) — long enough for every internal lerp /
 *  decay to settle at the boundary value before its scrubs go quiet. */
const IDLE_TICK_LINGER_FRAMES = 120;

/** Track dormancy (P5 perf-hunt): a track further than SLEEP viewports
 *  from the view span goes content-visibility:hidden (Blink skips its
 *  style/layout/paint — the measured 250 ms → ~40 ms major-GC fix); it
 *  wakes crossing WAKE. The margin clears every designed cross-track type
 *  bleed (~≤1 viewport); the gap between the two is hysteresis. */
const DORMANT_SLEEP_VH = 2.0;
const DORMANT_WAKE_VH = 1.5;

export type LifecycleType = "enter" | "leave" | "enterCenter" | "leaveCenter";

export interface LifecycleEvent {
  section: SectionName;
  type: LifecycleType;
  direction: ScrollDirection;
}

export interface SectionManifestEntry {
  name: SectionName;
  /** Source-site role this section recreates (rubric sections-14-order);
   *  null = additive beat with no source counterpart. */
  sourceRole: string | null;
  /** Scrub channels this section is driven by (rubric scrub-dual-speeds).
   *  Every section here runs both: raw DOM progress + the offset-extended
   *  lerped WebGL master (progressDom / progressWebgl below). */
  scrubChannels: readonly ["dom", "webgl"];
  vhBudget: number;
  pinned: boolean;
  startOffset: number;
  endOffset: number;
  top: number;
  height: number;
  rawStart: number;
  rawEnd: number;
  webglStart: number;
  webglEnd: number;
  progressDom: number;
  progressWebgl: number;
  inView: boolean;
  inCenter: boolean;
}

export type PinState = "before" | "pinned" | "after" | "unpinned";

interface Measured {
  section: SectionBase;
  top: number;
  height: number;
  /** DOM channel bounds (raw). */
  rawStart: number;
  rawEnd: number;
  /** WebGL channel bounds (offset-extended, viewport-clamped first/last). */
  webglStart: number;
  webglEnd: number;
  /** Live values, surfaced via manifest()/state(). */
  progressDom: number;
  progressWebgl: number;
  inView: boolean;
  inCenter: boolean;
  /** Consecutive frames both channel progresses were unchanged (P5
   *  perf-hunt — the out-of-range tick-skip window). */
  idleFrames: number;
  /** True while the track wears .track--dormant (content-visibility:
   *  hidden) — see DORMANT_SLEEP_VH / DORMANT_WAKE_VH. */
  dormant: boolean;
}

export class SectionRegistry {
  private sections: SectionBase[] = [];
  private measured: Measured[] = [];
  private carriedState: EngineStateContract = { ...INITIAL_STATE };
  private lifecycleListeners: ((e: LifecycleEvent) => void)[] = [];
  private lastScroll = 0;
  private direction: ScrollDirection = 1;
  private readonly solo: boolean;

  constructor(options: { solo?: boolean } = {}) {
    this.solo = options.solo ?? false;
  }

  /**
   * Register a section. In full mode this asserts (a) canonical order and
   * (b) state-contract continuity: requiredEnterState must not contradict
   * the fold of INITIAL_STATE + all previous guaranteedExitStates.
   */
  register(section: SectionBase): void {
    if (!this.solo) {
      const prev = this.sections[this.sections.length - 1];
      if (prev) {
        const prevIdx = SECTION_ORDER.indexOf(prev.name);
        const idx = SECTION_ORDER.indexOf(section.name);
        if (idx <= prevIdx) {
          throw new Error(
            `SectionRegistry: "${section.name}" registered out of canonical order (after "${prev.name}")`,
          );
        }
      }
      const conflicts = contractConflicts(this.carriedState, section.requiredEnterState);
      if (conflicts.length > 0) {
        throw new Error(
          `SectionRegistry: state contract broken entering "${section.name}" — ` +
            conflicts.join("; "),
        );
      }
      this.carriedState = foldExitState(this.carriedState, section.guaranteedExitState);
    }
    this.sections.push(section);
  }

  /** Subscribe to lifecycle crossings (eval harness, cursor system, …). */
  onLifecycle(cb: (e: LifecycleEvent) => void): () => void {
    this.lifecycleListeners.push(cb);
    return () => {
      this.lifecycleListeners = this.lifecycleListeners.filter((f) => f !== cb);
    };
  }

  /** Re-measure section geometry. Call on init and (debounced) on resize. */
  measure(): void {
    const vh = window.innerHeight;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
    const last = this.sections.length - 1;

    this.measured = this.sections.map((section, i) => {
      const rect = section.element.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const height = rect.height;

      // Raw (DOM) bounds — see section.ts for the grammar.
      let rawStart: number;
      let rawEnd: number;
      if (section.pinned) {
        rawStart = top;
        rawEnd = top + height - vh;
      } else {
        rawStart = i === 0 ? Math.max(0, top - vh) : top - vh;
        rawEnd = i === last ? Math.min(top + height, maxScroll) : top + height;
      }
      if (rawEnd <= rawStart) rawEnd = rawStart + 1; // degenerate guard

      // Offset-extended (WebGL) bounds, first/last viewport-clamped.
      let webglStart = rawStart + vh * section.startOffset;
      let webglEnd = rawEnd + vh * section.endOffset;
      if (i === 0) webglStart = Math.max(0, webglStart);
      if (i === last) webglEnd = Math.min(maxScroll, webglEnd);
      if (webglEnd <= webglStart) webglEnd = webglStart + 1;

      // Carry live flags across re-measures where possible.
      const old = this.measured[i];
      return {
        section,
        top,
        height,
        rawStart,
        rawEnd,
        webglStart,
        webglEnd,
        progressDom: old?.progressDom ?? 0,
        progressWebgl: old?.progressWebgl ?? 0,
        inView: old?.inView ?? false,
        inCenter: old?.inCenter ?? false,
        idleFrames: 0,
        dormant: old?.dormant ?? false,
      };
    });
  }

  /** Drive all sections from the raw Lenis scroll value. */
  update(rawScroll: number): void {
    if (rawScroll > this.lastScroll) this.direction = 1;
    else if (rawScroll < this.lastScroll) this.direction = -1;
    this.lastScroll = rawScroll;

    const vh = window.innerHeight;
    const viewBottom = rawScroll + vh;
    const centerLine = rawScroll + vh * CENTER_LINE_VH;

    for (const m of this.measured) {
      // Channels.
      const progressDom = clamp01((rawScroll - m.rawStart) / (m.rawEnd - m.rawStart));
      const progressWebgl = clamp01((rawScroll - m.webglStart) / (m.webglEnd - m.webglStart));
      const unchanged = progressDom === m.progressDom && progressWebgl === m.progressWebgl;
      m.idleFrames = unchanged ? m.idleFrames + 1 : 0;
      m.progressDom = progressDom;
      m.progressWebgl = progressWebgl;
      // P5 perf-hunt: an out-of-view section whose clamped progress has not
      // moved for a linger window is INERT by design law (ticks are pure
      // functions of progress; wall-clock behaviors ride gsap.ticker, not
      // the scrub) — skip its scrubs instead of re-writing identical values
      // through 13 idle GSAP timelines every frame. Measured effect: the
      // full-page per-frame write flood was the difference between a 15 ms
      // and a 300 ms major-GC pause mid-scroll (write-barrier/marking
      // contention), the P4 gate's growing hitch cadence. The linger window
      // (~2 s at 60 Hz) lets every internal lerp/decay settle at the
      // boundary value before the section goes quiet; in-view sections
      // always tick (interactions compose over static progress).
      const skip = m.idleFrames > IDLE_TICK_LINGER_FRAMES && !m.inView;
      if (!skip) {
        m.section.tickWebgl(m.progressWebgl);
        m.section.tickDom(m.progressDom);
      }

      // Dormancy — distance from the view span in viewports (see consts).
      const distBelow = (m.top - viewBottom) / vh; // track fully below view
      const distAbove = (rawScroll - (m.top + m.height)) / vh; // fully above
      const far = Math.max(distBelow, distAbove);
      if (m.dormant) {
        if (far < DORMANT_WAKE_VH) {
          m.dormant = false;
          m.section.element.classList.remove("track--dormant");
        }
      } else if (far > DORMANT_SLEEP_VH) {
        m.dormant = true;
        m.section.element.classList.add("track--dormant");
      }

      // Lifecycle — boolean transitions fire exactly once per crossing.
      const inView = viewBottom > m.top && rawScroll < m.top + m.height;
      const inCenter = centerLine >= m.top && centerLine < m.top + m.height;
      const dir = this.direction;

      if (inView !== m.inView) {
        m.inView = inView;
        this.fire(m.section, inView ? "enter" : "leave", dir);
      }
      if (inCenter !== m.inCenter) {
        m.inCenter = inCenter;
        this.fire(m.section, inCenter ? "enterCenter" : "leaveCenter", dir);
      }
    }
  }

  private fire(section: SectionBase, type: LifecycleType, direction: ScrollDirection): void {
    switch (type) {
      case "enter":
        section.onEnter(direction);
        break;
      case "leave":
        section.onLeave(direction);
        break;
      case "enterCenter":
        section.onEnterCenter(direction);
        break;
      case "leaveCenter":
        section.onLeaveCenter(direction);
        break;
    }
    const event: LifecycleEvent = { section: section.name, type, direction };
    for (const cb of this.lifecycleListeners) cb(event);
  }

  /** Manifest for the debug API / eval harness. */
  manifest(): SectionManifestEntry[] {
    return this.measured.map((m) => ({
      name: m.section.name,
      sourceRole: SECTION_SOURCE_ROLE[m.section.name],
      scrubChannels: ["dom", "webgl"] as const,
      vhBudget: m.section.vhBudget,
      pinned: m.section.pinned,
      startOffset: m.section.startOffset,
      endOffset: m.section.endOffset,
      top: m.top,
      height: m.height,
      rawStart: m.rawStart,
      rawEnd: m.rawEnd,
      webglStart: m.webglStart,
      webglEnd: m.webglEnd,
      progressDom: m.progressDom,
      progressWebgl: m.progressWebgl,
      inView: m.inView,
      inCenter: m.inCenter,
    }));
  }

  /**
   * Absolute scroll for (sectionId, localProgress) over the RAW bounds —
   * the eval transport. Inverse of progressDom exactly.
   */
  scrollPositionFor(name: SectionName, localProgress: number): number {
    const m = this.measured.find((x) => x.section.name === name);
    if (!m) throw new Error(`SectionRegistry: unknown section "${name}"`);
    return m.rawStart + (m.rawEnd - m.rawStart) * clamp01(localProgress);
  }

  /** Section whose raw track contains the viewport center line (or nearest). */
  activeSection(): SectionName | null {
    const m = this.measured.find((x) => x.inCenter);
    return m?.section.name ?? null;
  }

  /** Pin state of the given (or active) section, for state() snapshots. */
  pinState(name?: SectionName | null): PinState {
    const target = name ?? this.activeSection();
    const m = this.measured.find((x) => x.section.name === target);
    if (!m || !m.section.pinned) return "unpinned";
    if (this.lastScroll < m.rawStart) return "before";
    if (this.lastScroll <= m.rawEnd) return "pinned";
    return "after";
  }

  /** Total document scroll range (for the clock scalar / autoscroll). */
  totalRange(): number {
    return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
