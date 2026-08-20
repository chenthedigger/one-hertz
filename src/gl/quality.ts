/**
 * Quality tiers (PLAN §3 mobile tiers, defined in P1 not P5):
 *
 *   tier 0 — full stack
 *   tier 1 — no DOF
 *   tier 2 — no DOF + no bloom (grain + ACES kept), pixel-ratio cap 1.5
 *
 * Tiers shed post effects and resolution, NEVER smoothness.
 *
 * Two mechanisms, one owner (the stage):
 *   1. `detectInitialTier` — instant heuristic at boot: DPR × pointer
 *      coarseness, GPU renderer-string hints, deviceMemory.
 *   2. `QualityGovernor` — fps sampling over the first seconds of the live
 *      session; sheds one tier per bad window, never upgrades (no visible
 *      flip-flop mid-scroll).
 *
 * `__ONE_HERTZ__.forceQualityTier(n)` overrides BOTH: a forced tier
 * disables the governor for the rest of the session (evals measure each
 * tier separately, PLAN §6). Eval mode never auto-detects and never
 * governs — tier 0 unless forced, so captures are deterministic.
 */

import type { WebGLRenderer } from "three";

export const TIER_FULL = 0;
export const TIER_NO_DOF = 1;
export const TIER_NO_BLOOM = 2;

/** GPU strings that mark low-end mobile silicon (straight to tier 2). */
const GPU_LOW = /mali-[gt]?[0-9]|adreno \(tm\) [1-5]\d\d|powervr|apple a([7-9]|1[0-2])\b/i;
/** GPU strings that mark unambiguous desktop/flagship silicon (tier 0). */
const GPU_HIGH = /apple m\d|rtx|geforce|radeon (pro|rx)|apple a1[6-9]|apple a2\d/i;

function gpuString(renderer: WebGLRenderer): string {
  const gl = renderer.getContext();
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const param = info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const value = gl.getParameter(param);
  return typeof value === "string" ? value : "";
}

/** Boot-time heuristic — cheap signals only, refined by the governor. */
export function detectInitialTier(renderer: WebGLRenderer): number {
  const gpu = gpuString(renderer);
  if (GPU_LOW.test(gpu)) return TIER_NO_BLOOM;
  if (GPU_HIGH.test(gpu)) return TIER_FULL;

  let tier = TIER_FULL;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse) tier = TIER_NO_DOF; // unknown phone/tablet: start cautious

  // navigator.deviceMemory — Chromium-only progressive enhancement.
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (memory !== undefined) {
    if (memory <= 2) tier = Math.max(tier, TIER_NO_BLOOM);
    else if (memory <= 4) tier = Math.max(tier, TIER_NO_DOF);
  }

  // Very high DPR on a coarse pointer = lots of pixels on mobile silicon.
  if (coarse && window.devicePixelRatio >= 3.5) tier = Math.max(tier, TIER_NO_BLOOM);

  return tier;
}

const WARMUP_S = 2.5; // loader/compile spikes exempt (PLAN §6 perf method)
const WINDOW_S = 2.0;
const MAX_WINDOWS = 3;
const SHED_BELOW_FPS = 45;

export class QualityGovernor {
  private forced = false;
  private elapsed = 0;
  private windowTime = 0;
  private windowFrames = 0;
  private windowsDone = 0;

  constructor(private tier: number) {}

  /** A forced tier ends governance for the session. */
  force(): void {
    this.forced = true;
  }

  /**
   * Feed one frame; returns the NEW tier when a shed is decided, else null.
   * Self-terminates after MAX_WINDOWS clean windows or at tier 2.
   */
  update(dt: number): number | null {
    if (this.forced || this.tier >= TIER_NO_BLOOM || this.windowsDone >= MAX_WINDOWS) {
      return null;
    }
    // Ignore pathological deltas (tab switch, breakpoint) — not real frames.
    if (dt <= 0 || dt > 0.5) return null;

    this.elapsed += dt;
    if (this.elapsed < WARMUP_S) return null;

    this.windowTime += dt;
    this.windowFrames += 1;
    if (this.windowTime < WINDOW_S) return null;

    const fps = this.windowFrames / this.windowTime;
    this.windowTime = 0;
    this.windowFrames = 0;
    this.windowsDone += 1;

    if (fps < SHED_BELOW_FPS) {
      this.tier += 1;
      return this.tier;
    }
    return null;
  }
}
