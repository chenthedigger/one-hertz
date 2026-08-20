/**
 * Stage reference seam for P2 section modules.
 *
 * The section factory (`sections/index.ts`) hands sections only the
 * CameraRig; sections that need scene/renderer/watch access (Disassembly's
 * exploded view attaches internals GLBs under the hero watch root) obtain
 * the live Stage through this module instead of widening the SHARED factory
 * signature. main.ts calls `provideStage(stage)` right after the Stage is
 * constructed — before any section is created — so `getStage()` is always
 * non-null by section-construction time in the real boot; the null branch
 * only guards exotic embeddings (tests importing a section standalone).
 *
 * Other P2 section lanes: reuse THIS seam rather than adding parallel ones.
 */

import type { Stage } from "../webgl/stage";

let ref: Stage | null = null;

/** Boot wiring (main.ts, once): register the live stage. */
export function provideStage(stage: Stage): void {
  ref = stage;
}

/** The live stage, or null before boot wiring (guard and no-op). */
export function getStage(): Stage | null {
  return ref;
}
