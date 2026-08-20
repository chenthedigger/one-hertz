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

import { CENTER_LINE_VH, SECTION_ORDER, type SectionName } from "./constants";
import type { ScrollDirection, SectionBase } from "./section";
import {
  contractConflicts,
  foldExitState,
  INITIAL_STATE,
  type EngineStateContract,
} from "./state";

export type LifecycleType = "enter" | "leave" | "enterCenter" | "leaveCenter";

export interface LifecycleEvent {
  section: SectionName;
  type: LifecycleType;
  direction: ScrollDirection;
}

export interface SectionManifestEntry {
  name: SectionName;
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
      m.progressDom = clamp01((rawScroll - m.rawStart) / (m.rawEnd - m.rawStart));
      m.progressWebgl = clamp01((rawScroll - m.webglStart) / (m.webglEnd - m.webglStart));
      m.section.tickWebgl(m.progressWebgl);
      m.section.tickDom(m.progressDom);

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
