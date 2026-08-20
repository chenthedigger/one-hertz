/**
 * Engine constants — single source of truth for scroll geometry and motion.
 *
 * Per-section vh budgets come straight from the source-site recon CSS
 * (300/400/450vh sticky tracks). Deviations from these values are allowed
 * only for deliberately longer beats (e.g. Nocturne) and must be recorded
 * in the look bible. See docs/PLAN.md §3.
 */

/** Lenis smoothing duration in seconds — the ONE smoothing owner (PLAN §3). */
export const LENIS_DURATION = 4;

/**
 * Per-section scroll-track heights, in viewport heights (svh).
 * A value of 100 means the section is not pinned (track == viewport).
 */
export const SECTION_VH = {
  hero: 100,
  one: 300,
  // ---- future sections, budgets frozen from recon ----
  // timeless: 300, vertical: 300, disassembly: 450,
  // mechanism: 400, movement: 300, curves: 300, details: 300,
  // profile: 300, bracelet: 400, gallery: 100, parts: 100, outro: 100,
} as const;

export type SectionName = keyof typeof SECTION_VH;

/**
 * Smoothing factor for the WebGL master progress lerp (per PLAN §3 the
 * WebGL channel MAY keep the source's lerpedProgress smoothing; the scroll
 * position itself is read raw from Lenis and never double-lerped).
 * Applied frame-rate independently: 1 - exp(-dt * WEBGL_PROGRESS_LERP).
 */
export const WEBGL_PROGRESS_LERP = 8;

/**
 * Height-only resizes smaller than this (px) are ignored on touch devices —
 * iOS URL-bar churn protection (PLAN §3).
 */
export const TOUCH_RESIZE_IGNORE_PX = 120;

/** Motion-bible working defaults (locked properly at P1.5). */
export const EASE = {
  default: "power3.inOut",
  exit: "power3.out",
  enter: "power2.in",
} as const;
