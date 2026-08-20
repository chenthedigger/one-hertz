/**
 * Dial spec — the ARTBOARD. Every proportion, color, and gearing constant
 * of the watchface lives here; the drawing code (face.ts, complications.ts,
 * renderer.ts) reads it and stays dumb. P1.5's dial look-lock edits THIS
 * file (PLAN §3 "dial artboard", §5 P1.5).
 *
 * Layout language: Wayfinder / Modular-Ultra class (PLAN §3 dial
 * subsystem). Radial values are fractions of R = canvasWidth / 2, measured
 * from the canvas center; the canvas itself is the Ultra 3 display
 * rectangle (422×514 px active area per research/INTERNALS-REF.md §0), so
 * there is vertical headroom above/below the dial circle for the corner
 * complication slots — exactly like the real face.
 */

/** Watchface mode: full-luminance active vs Always-On dim (PLAN §2 Nocturne). */
export type DialMode = "active" | "aod";

/** Hot-swappable complication (Details hover-swap, PLAN §1 signature). */
export type ComplicationId = "depth" | "heartRate" | "compass";

/* ---- Canvas sizing (task spec: ≥2× logical pixels, capped 1024) ---------- */

/** Hard cap on the canvas's long side, device px. */
export const DIAL_PX_CAP = 1024;

/** Minimum supersampling over logical pixels. */
export const DIAL_MIN_SCALE = 2;

/** Default logical height (pt) — 2× lands exactly on the 1024 cap. */
export const DIAL_LOGICAL_HEIGHT = 512;

/** Ultra 3 display active area — the texture's aspect (INTERNALS-REF §0). */
export const DIAL_ASPECT = { w: 422, h: 514 } as const;

/** Display corner radius as a fraction of canvas WIDTH (roughed from refs). */
export const DIAL_CORNER = 0.235;

/* ---- Grid (fractions of R = width/2 unless noted) ------------------------- */

export const GRID = {
  /** Outer compass-scale ring band (Wayfinder signature). */
  bezel: {
    outer: 0.985,
    inner: 0.8,
    minorEveryDeg: 5,
    majorEveryDeg: 15,
    numeralEveryDeg: 30,
    numeralSize: 0.062, // ×R
  },
  /** Minute track inside the bezel. */
  minute: { outer: 0.775, minorInner: 0.735, majorInner: 0.7 },
  /**
   * Hour numerals 12 / 3 / 9 at cardinal positions. The 6 slot is DROPPED —
   * the hot complication sub-dial takes its sector (watchOS drops numerals
   * under complications; keeps the grid honest).
   */
  numerals: { radius: 0.565, size: 0.2 },
  /** Top-center date slot (weekday + day). */
  date: { y: -0.4, size: 0.075 },
  /** Hot complication sub-dial (Details hover-swap target). */
  hot: { x: 0, y: 0.4, r: 0.24 },
  /** Four corner complication slots (y in R units too; H/W ≈ 1.218). */
  corners: { x: 0.68, y: 0.94, r: 0.16 },
  /** Hands: lengths/widths ×R. */
  hands: {
    hour: { len: 0.4, tail: 0.06, w: 0.05 },
    minute: { len: 0.66, tail: 0.06, w: 0.04 },
    second: { len: 0.76, tail: 0.16, w: 0.013 },
    hubR: 0.032,
  },
} as const;

/* ---- Palette (working tokens; the real ramp locks at P1.5) ---------------- */

export interface DialPalette {
  /** OLED ink (INTERNALS-REF §1: off-state #060608). */
  bg: string;
  /** Primary luminous foreground (hands, numerals). */
  fg: string;
  /** Secondary (major ticks, labels). */
  dim: string;
  /** Tertiary (minor ticks, slot outlines). */
  faint: string;
  /** Biosignal red — seconds hand + 1 Hz elements ONLY (PLAN §3 color). */
  accent: string;
  /** Complication semantic colors (watchOS system hues, roughed). */
  depth: string;
  heart: string;
  compass: string;
}

export const PALETTE: Record<DialMode, DialPalette> = {
  active: {
    bg: "#060608",
    fg: "#E9E9E7",
    dim: "rgba(233, 233, 231, 0.55)",
    faint: "rgba(233, 233, 231, 0.18)",
    accent: "#FF2D55",
    depth: "#64D2FF",
    heart: "#FF2D55",
    compass: "#FF9F0A",
  },
  // AOD: dimmed, reduced. Accent uses the brightened Nocturne variant
  // (PLAN §3: #FF375F-class) because it carries the 1 Hz tick alone.
  aod: {
    bg: "#040405",
    fg: "rgba(233, 233, 231, 0.44)",
    dim: "rgba(233, 233, 231, 0.26)",
    faint: "rgba(233, 233, 231, 0.09)",
    accent: "rgba(255, 55, 95, 0.72)",
    depth: "rgba(100, 210, 255, 0.4)",
    heart: "rgba(255, 55, 95, 0.5)",
    compass: "rgba(255, 159, 10, 0.4)",
  },
};

/* ---- Seconds-hand gearing (PLAN §2: sweeps with velocity, ticks at rest) -- */

/**
 * Full seconds-hand revolutions across the whole page (clockScalar 0→1).
 * The sweep position DERIVES from the clock scalar — deterministic,
 * reversible (scroll up = hand backward), and already Lenis-smoothed, so
 * no second smoothing owner is introduced. Feel constant; P1.5 tunes.
 */
export const GEAR_PAGE_REVS = 12;

/** |lenis.velocity| (px/frame) at/above which the hand is "sweeping". */
export const SWEEP_MIN_VELOCITY = 0.5;

/**
 * Exp rate of the sweep→rest phase-align glide (only runs while the hand is
 * >1 tick from the wall clock; converges within one tick period — the
 * "≤1 tick both directions" handoff grammar, PLAN §2). Within one tick the
 * hand steps INSTANTLY: the quartz tick, one redraw per second.
 */
export const REST_TICK_RATE = 10;

/** Tolerance around the 1-tick boundary for the instant quartz step. */
export const REST_SNAP_EPS = 0.004;

/** Redraw threshold for the seconds hand, in seconds of hand travel. */
export const SECONDS_DRAW_EPS = 0.02;

/* ---- Complication data ----------------------------------------------------- */

/** Depth gauge full-scale (Ultra depth app: 40 m recreational limit). */
export const DEPTH_GAUGE_MAX_M = 40;

/* ---- Typography (PLAN §3: SF-look rendered INTO the canvas, no files) ------ */

/** Probe order for locally-installed SF faces (task spec chain). */
export const DIAL_FONT_CANDIDATES = [
  "SF Pro Display",
  "SF Compact Display",
  "-apple-system",
] as const;

/** Fallback family when no SF face resolves (tight tracking applied). */
export const DIAL_FONT_FALLBACK = "Inter";
