/**
 * Engine constants — single source of truth for scroll geometry and motion.
 *
 * Per-section vh budgets come straight from the source-site recon
 * (evals/reference/source/sections.json): 2700px tracks at a 900px
 * viewport = 300vh, 3600px = 400vh, 4050px = 450vh; everything else is an
 * unpinned 100svh beat. Deviations from these values are allowed only for
 * deliberately longer beats (Nocturne is the one sanctioned case) and must
 * be recorded in the look bible. See docs/PLAN.md §3.
 */

/** Lenis smoothing duration in seconds — the ONE smoothing owner (PLAN §3). */
export const LENIS_DURATION = 4;

/**
 * Canonical section order + scroll-track heights in viewport heights (svh).
 * Names are the source recon names VERBATIM (sections.json `dataSection`)
 * so eval addressing `(sectionId, localProgress)` matches the frozen
 * reference. `Nocturne` is OUR additive beat (PLAN §2), inserted after the
 * gallery (`Images`); everything else keeps the source order exactly.
 *
 * A value of 100 means the section is not pinned (track == viewport).
 * Key order in this object IS the page order — the registry asserts
 * registration follows it.
 */
export const SECTION_VH = {
  Intro: 100,
  Timeless: 100,
  VerticalText: 300,
  Disassembly: 300,
  Mechanism: 400,
  Movement: 300,
  Curves: 300,
  MovementWatchRight: 300,
  Hands: 300,
  Straps: 400,
  Images: 100,
  Nocturne: 300, // additive beat — sanctioned deviation (PLAN §3)
  Colors: 450,
  // Bumped 100→200 by the Parts lane: the source measures Parts at 161vh
  // (content-sized) and motion-bible §8 marks it ⚠ with exactly this fix
  // sanctioned ("budget bump, never a local hack") — at 100svh the unpinned
  // track has ZERO scrub runway in ?solo= (track == viewport ⇒ degenerate
  // bounds) and the table's reveal grammar cannot exist.
  Parts: 200,
  Footer: 100,
} as const;

export type SectionName = keyof typeof SECTION_VH;

/** Canonical page order, derived from the table above. */
export const SECTION_ORDER = Object.keys(SECTION_VH) as SectionName[];

export function isSectionName(name: string): name is SectionName {
  return name in SECTION_VH;
}

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

/** Resize re-measure debounce (ms) before waiting for scroll-idle. */
export const RESIZE_DEBOUNCE_MS = 150;

/** Lenis |velocity| below this counts as scroll-idle (px/frame). */
export const SCROLL_IDLE_VELOCITY = 0.05;

/**
 * Lifecycle center-line: enterCenter/leaveCenter fire when the viewport
 * center (scroll + CENTER_LINE_VH * viewportHeight) crosses a section's
 * raw bounds. ±0.5vh per recon (PLAN §1).
 */
export const CENTER_LINE_VH = 0.5;

/**
 * `?autoscroll` default: full page in ~60s (matches the eval harness's
 * scripted `lenis.scrollTo(end, ~60s)` capture, PLAN §6).
 * `?autoscrollspeed=<px/s>` overrides with an absolute velocity.
 */
export const AUTOSCROLL_DEFAULT_DURATION_S = 60;

/** Motion-bible working defaults (locked properly at P1.5). */
export const EASE = {
  default: "power3.inOut",
  exit: "power3.out",
  enter: "power2.in",
} as const;

/* ---- Interaction mechanics: cursor + longpress (PLAN §1 mechanics 1-2) ---- */

/** Hold duration before the longpress mechanic arms (ms). Recon: ≥500ms. */
export const LONGPRESS_HOLD_MS = 500;

/** Intensity ramp 0→1 duration once armed (seconds, power3.inOut). Recon: 2s. */
export const LONGPRESS_RAMP_S = 2;

/**
 * Pointer travel (px) that cancels a PENDING (not yet armed) hold — a moving
 * finger means scroll intent, a moving mouse means drag intent. Matches the
 * recon's 15px mobile tap tolerance. Movement AFTER arming never cancels
 * (it feeds the parallax).
 */
export const LONGPRESS_CANCEL_MOVE_PX = 15;

/**
 * Default per-section camera dolly-in multiplier at full hold intensity.
 * Sections override via `SectionSpec.zoomMultiplier` (recon: per-section
 * zoomMultiplier); effective dolly = radius / (1 + intensity * (mult - 1)).
 */
export const LONGPRESS_ZOOM_DEFAULT = 1.35;

/**
 * Rotation acceleration at full hold (recon: "mechanism rotations
 * accelerate"): UPDATE_ROTATIONS.speed = 1 + intensity * this gain.
 */
export const LONGPRESS_ROTATION_GAIN = 2;

/** Cursor magnetic-easing follow constant: 1 - exp(-dt * k). */
export const CURSOR_FOLLOW_LERP = 12;

/** Mouse-parallax base amplitude on the orbit proxy (radians). */
export const PARALLAX_BASE_RAD = 0.05;

/** Parallax smoothing constant (own lerp — scroll stays single-owner). */
export const PARALLAX_LERP = 6;

/* ---- Eval determinism kit (PLAN §6: `?eval=1`) --------------------------- */

/** Seed for the deterministic RNG in eval mode ("1HZ" + vintage). */
export const EVAL_RNG_SEED = 0x1a2026;

/** Dial clock frozen at 10:09:30 (Apple marketing time + 30s). */
export const EVAL_DIAL_TIME = { hours: 10, minutes: 9, seconds: 30 } as const;

/** Living-BPM vital pinned in eval mode. */
export const EVAL_BPM = 64;

/** ECG trace phase pinned in eval mode. */
export const EVAL_ECG_PHASE = 0;
