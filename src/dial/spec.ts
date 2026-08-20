/**
 * Dial spec — the ARTBOARD. Every proportion, color, and gearing constant
 * of the watchface lives here; the drawing code (face.ts, complications.ts,
 * renderer.ts) reads it and stays dumb. P1.5's dial look-lock edits THIS
 * file (PLAN §3 "dial artboard", §5 P1.5).
 *
 * Art pass 2026-08-20 (docs/p15/dial-art.md): proportions and rhythm are
 * now measured against the REAL extracted Wayfinder texture
 * (research/asset-qa/ultra-3/textures/rIbiCAQPvhuVClj.jpg): stubby
 * rounded-cap dashes inside a hairline-contained band, degree numerals and
 * cardinals rotated tangentially OUTSIDE the dash band, slate-teal
 * secondary ink (#91AFBA-class sampled from the texture), near-white
 * primary. Our face stays ORIGINAL — analog Wayfinder-class instrument in
 * Liquid Glass language — but reads native at a glance.
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
  /**
   * Outer compass-scale ring band (Wayfinder signature). Measured order,
   * outside-in: hairline containment ring → rotated numerals/cardinals →
   * rounded-dash tick band → inner hairline ring.
   */
  bezel: {
    /** Outer hairline containment circle. */
    ringOuter: 0.985,
    /** Inner hairline circle closing the band. */
    ringInner: 0.77,
    /** Rotated degree numerals + cardinal letters center radius. */
    numeralR: 0.905,
    /** Rounded-dash tick band (stubby dashes, NOT hairlines — ref truth). */
    dashOuter: 0.845,
    dashInner: 0.802,
    /** Majors run deeper into the band (native long/short tick rhythm). */
    dashInnerMajor: 0.786,
    minorEveryDeg: 5,
    majorEveryDeg: 15,
    numeralEveryDeg: 30,
    /** Dash width ×R (rounded caps make it a capsule). */
    dashW: 0.014,
    numeralSize: 0.056, // ×R
    cardinalSize: 0.07, // ×R — cardinals read a step above degrees
  },
  /** Minute track inside the bezel: minor DOTS, major dashes (watchOS rhythm). */
  minute: {
    outer: 0.735,
    minorDotR: 0.006,
    majorLen: 0.05,
    majorW: 0.012,
  },
  /**
   * Hour numerals 12 / 3 / 9 at cardinal positions. The 6 slot is DROPPED —
   * the hot complication sub-dial takes its sector (watchOS drops numerals
   * under complications; keeps the grid honest).
   */
  numerals: { radius: 0.545, size: 0.195 },
  /** Top-center date pill (weekday + day, hairline capsule outline). */
  date: { y: -0.38, size: 0.068, padX: 0.055, padY: 0.032 },
  /** Hot complication sub-dial (Details hover-swap target) — glass slab. */
  hot: { x: 0, y: 0.4, r: 0.25 },
  /** Four corner complication slots (y in R units too; H/W ≈ 1.218). */
  corners: {
    x: 0.68,
    y: 0.94,
    r: 0.155,
    /** Open-ring gauge: total sweep (deg); the gap faces the display corner. */
    gaugeSweepDeg: 280,
    gaugeW: 0.018, // ×R
  },
  /** Hands: lengths/widths ×R. Outlined batons + shadow pass (depth). */
  hands: {
    hour: { len: 0.4, stem: 0.055, w: 0.05, outline: 0.012 },
    minute: { len: 0.665, stem: 0.055, w: 0.04, outline: 0.011 },
    second: { len: 0.755, tail: 0.16, w: 0.011, ballR: 0.021 },
    /**
     * Dark stem segment near the pivot (LOOKBIBLE §5 tune 3): the lume
     * baton starts `len` ×R past the stem root; a narrower ink-metal stem
     * (`wScale` × hand width, palette `handStem`) rides inside the outline
     * below it — real Ultra hands never run solid white to the hub.
     */
    stemDark: { len: 0.115, wScale: 0.5 },
    hubR: 0.033,
    /** AOD hollow-hand rim thickness ×R (watchOS AOD outlines its hands). */
    aodRim: 0.008,
    /** Shadow pass under the hands (canvas shadow, redraw-time only). */
    shadow: { blur: 0.025, dy: 0.014, alpha: 0.55 },
  },
} as const;

/* ---- Liquid Glass overlay (prebaked sprite layer — PLAN §3 sanctioned:
 * "layered canvas + prebaked glass sprites, no real-time refraction").
 * Painted ONCE per (mode × size) into a cached canvas, composited last. */

export const GLASS = {
  /** Inner rim light along the rounded display edge (top bright → bottom). */
  rim: { w: 0.014, alphaTop: 0.14, alphaBottom: 0.025 },
  /** Broad diagonal crystal sheen across the upper-left. */
  sheen: { alpha: 0.055 },
  /** Soft specular bloom hugging the top-left corner radius. */
  bloom: { alpha: 0.07, r: 0.55 },
  /** Radial edge falloff — OLED under curved glass. */
  vignette: { alpha: 0.14 },
  /** AOD multiplies every glass alpha by this (glass barely reads in dark). */
  aodScale: 0.25,
} as const;

/* ---- Palette (Wayfinder-sampled slate; biosignal red per PLAN §3) --------- */

export interface DialPalette {
  /** OLED ink (INTERNALS-REF §1: off-state #060608). */
  bg: string;
  /** Primary luminous foreground (hands, numerals). */
  fg: string;
  /** Secondary — slate-teal instrument ink (sampled #91AFBA-class). */
  dim: string;
  /** Tertiary (minor ticks, hairlines, slot outlines). */
  faint: string;
  /** Biosignal red — seconds hand + 1 Hz elements ONLY (PLAN §3 color). */
  accent: string;
  /** Dark metal stem near the hand pivot (LOOKBIBLE §5 tune 3, active mode). */
  handStem: string;
  /** Complication semantic colors (watchOS system hues). */
  depth: string;
  heart: string;
  compass: string;
}

export const PALETTE: Record<DialMode, DialPalette> = {
  active: {
    bg: "#05060a",
    fg: "#F2F3F4",
    dim: "rgba(145, 175, 190, 0.92)",
    faint: "rgba(145, 175, 190, 0.28)",
    accent: "#FF2D55",
    handStem: "#15181d",
    depth: "#64D2FF",
    heart: "#FF2D55",
    compass: "#FF9F0A",
  },
  // AOD: dimmed, reduced, hands hollowed, seconds hand DROPPED entirely
  // (LOOKBIBLE §5 tune 1 — real watchOS AOD grammar). Accent uses the
  // brightened Nocturne variant (PLAN §3: #FF375F-class) for the N cardinal;
  // the 1 Hz life is the whole-minute hand step, not a sweeping second.
  aod: {
    bg: "#030407",
    fg: "rgba(242, 243, 244, 0.5)",
    dim: "rgba(145, 175, 190, 0.34)",
    faint: "rgba(145, 175, 190, 0.11)",
    accent: "rgba(255, 55, 95, 0.78)",
    handStem: "#0a0c10", // unused — AOD hands are hollow rims (tune 1)
    depth: "rgba(100, 210, 255, 0.35)",
    heart: "rgba(255, 55, 95, 0.45)",
    compass: "rgba(255, 159, 10, 0.35)",
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

/** Wide tracking for small-caps instrument labels (native watchOS feel). */
export const LABEL_TRACKING = "0.08em";
