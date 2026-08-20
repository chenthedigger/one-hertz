/**
 * Section registry — the scrub fabric (PLAN §3 decision record).
 *
 * Each section is `{ name, duration, tick(progress) }`:
 *   - `name`     — from `data-section` on the track element
 *   - `duration` — track height in vh, from SECTION_VH (recon budgets)
 *   - `tick`     — called every frame with local progress 0..1
 *
 * Pinning is CSS position:sticky ONLY (no ScrollTrigger pins). Local
 * progress for a pinned track = scrolled distance through the track's
 * sticky range: (scroll - top) / (height - viewport). The registry reads
 * the RAW Lenis scroll value passed in by the engine — it never smooths
 * position itself (single smoothing owner rule).
 */

import { SECTION_VH, type SectionName } from "./constants";

export interface Section {
  readonly name: SectionName;
  /** Track height in viewport heights (svh). */
  readonly duration: number;
  readonly element: HTMLElement;
  /** Scrub callback: local progress 0..1, clamped. */
  tick(progress: number): void;
}

interface Measured {
  section: Section;
  top: number;
  /** Scroll distance over which progress runs 0→1 (track - viewport). */
  range: number;
  /** Last progress delivered to tick() — surfaced via state(). */
  lastProgress: number;
}

export class SectionRegistry {
  private sections: Section[] = [];
  private measured: Measured[] = [];

  register(section: Section): void {
    this.sections.push(section);
  }

  /** Look up a section's track element by data-section name. */
  static findElement(name: SectionName): HTMLElement {
    const el = document.querySelector<HTMLElement>(`[data-section="${name}"]`);
    if (!el) throw new Error(`SectionRegistry: no element [data-section="${name}"]`);
    return el;
  }

  /** Re-measure section geometry. Call on init and (debounced) on resize. */
  measure(): void {
    const vh = window.innerHeight;
    this.measured = this.sections.map((section) => {
      const rect = section.element.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      // Pinned track: progress runs over the sticky range (height - vh).
      // Unpinned (~100vh) track: progress runs over its own height as it
      // scrolls past — avoids a degenerate 0-length range.
      const pinned = rect.height > vh + 1;
      const range = pinned ? rect.height - vh : Math.max(1, rect.height);
      return { section, top, range, lastProgress: 0 };
    });
  }

  /** Drive all sections from the raw Lenis scroll value. */
  update(rawScroll: number): void {
    for (const m of this.measured) {
      const p = clamp01((rawScroll - m.top) / m.range);
      m.lastProgress = p;
      m.section.tick(p);
    }
  }

  /** Manifest for the debug API / eval harness. */
  manifest(): {
    name: string;
    duration: number;
    top: number;
    range: number;
    progress: number;
  }[] {
    return this.measured.map((m) => ({
      name: m.section.name,
      duration: m.section.duration,
      top: m.top,
      range: m.range,
      progress: m.lastProgress,
    }));
  }

  /** Absolute scroll position for (sectionId, localProgress) — eval transport. */
  scrollPositionFor(name: SectionName, localProgress: number): number {
    const m = this.measured.find((x) => x.section.name === name);
    if (!m) throw new Error(`SectionRegistry: unknown section "${name}"`);
    return m.top + m.range * clamp01(localProgress);
  }

  /** Total document scroll range (for the clock scalar). */
  totalRange(): number {
    return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }
}

export function sectionDuration(name: SectionName): number {
  return SECTION_VH[name];
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
