/**
 * "ONE" section — the pinned 300svh proving ground for Spike B.
 *
 * Dual channels per the source pattern:
 *   - WebGL channel: camera orbit + dolly timeline, scrubbed through the
 *     CameraRig (paused GSAP timeline, .progress()-driven, lerped master).
 *   - DOM channel: two copy blocks cross-fade in fixed progress windows,
 *     driven directly from raw progress (no lerp on the DOM channel).
 */

import type { Section } from "../core/registry";
import { SectionRegistry, sectionDuration } from "../core/registry";
import type { CameraRig } from "../webgl/cameraRig";

/** Trapezoid window: 0 before `start`, 1 across the plateau, 0 after `end`. */
function windowOpacity(p: number, start: number, end: number, ramp = 0.08): number {
  const rise = clamp01((p - start) / ramp);
  const fall = clamp01((end - p) / ramp);
  return Math.min(rise, fall);
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export function createOneSection(rig: CameraRig): Section {
  const element = SectionRegistry.findElement("one");
  const copyA = element.querySelector<HTMLElement>(".one__copy--a");
  const copyB = element.querySelector<HTMLElement>(".one__copy--b");

  return {
    name: "one",
    duration: sectionDuration("one"),
    element,
    tick(progress: number): void {
      // WebGL channel — rig lerps its own master progress internally.
      rig.setProgress(progress);

      // DOM channel — raw, immediate.
      if (copyA) {
        const o = windowOpacity(progress, 0.08, 0.42);
        copyA.style.opacity = String(o);
        copyA.style.transform = `translate3d(0, ${(1 - o) * 2}rem, 0)`;
      }
      if (copyB) {
        const o = windowOpacity(progress, 0.55, 0.92);
        copyB.style.opacity = String(o);
        copyB.style.transform = `translate3d(0, ${(1 - o) * 2}rem, 0)`;
      }
    },
  };
}
