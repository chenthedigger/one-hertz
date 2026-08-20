/**
 * Disassembly — pinned 300svh, the engine's dual-channel proving ground
 * (carried over from Spike B's "one" section; the real exploded-view build
 * replaces the copy + rig beats in P2, keeping this wiring).
 *
 *   - WebGL channel: camera orbit/dolly rig scrubbed over OFFSET-EXTENDED
 *     bounds (startOffset -0.25 / endOffset +0.25 viewport-heights): the
 *     camera move begins while the previous section is still finishing and
 *     hands off a quarter-viewport into the next — the source's
 *     webglStart/webglEnd cross-section handoff pattern, live.
 *   - DOM channel: copy windows on RAW progress, imperative override —
 *     never lerped (Spike B pitfall #8: the DOM/WebGL channel separation
 *     IS the feel; don't "fix" it).
 *
 * Contract: needs the watch assembled on entry; leaves it assembled
 * (the P2 exploded-view build will keep this exit guarantee — XPLOD
 * collapses before the pin releases).
 */

import { SectionBase } from "../core/section";
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

export class DisassemblySection extends SectionBase {
  private readonly copyA: HTMLElement | null;
  private readonly copyB: HTMLElement | null;

  constructor(private readonly rig: CameraRig) {
    super({
      name: "Disassembly",
      startOffset: -0.25,
      endOffset: 0.25,
      requiredEnterState: { explode: "assembled" },
      guaranteedExitState: { explode: "assembled" },
      // Macro beat: the longpress hold-zoom dives deeper here than the
      // page default (per-section zoomMultiplier, PLAN §1 mechanic 2).
      zoomMultiplier: 1.6,
    });
    this.copyA = this.element.querySelector<HTMLElement>(".copy--a");
    this.copyB = this.element.querySelector<HTMLElement>(".copy--b");
  }

  override tickWebgl(progress: number): void {
    super.tickWebgl(progress);
    // Rig lerps its own master progress internally (WEBGL_PROGRESS_LERP).
    this.rig.setProgress(progress);
  }

  override tickDom(progress: number): void {
    super.tickDom(progress);
    if (this.copyA) {
      const o = windowOpacity(progress, 0.08, 0.42);
      this.copyA.style.opacity = String(o);
      this.copyA.style.transform = `translate3d(0, ${(1 - o) * 2}rem, 0)`;
    }
    if (this.copyB) {
      const o = windowOpacity(progress, 0.55, 0.92);
      this.copyB.style.opacity = String(o);
      this.copyB.style.transform = `translate3d(0, ${(1 - o) * 2}rem, 0)`;
    }
  }
}
