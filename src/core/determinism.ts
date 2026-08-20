/**
 * Determinism kit — the ONE import for anything that would otherwise reach
 * for Math.random() or wall time (PLAN §6: `?eval=1` seeds RNG, freezes the
 * dial clock at 10:09:30, pins BPM 64 and ECG phase 0, skips the loader).
 *
 * Live mode: `random()` delegates to Math.random, `wallSeconds()` follows
 * the real clock, `bpm()` / `ecgPhase()` return the caller's live value.
 * Eval mode: everything below is frozen/seeded so the 70 canonical eval
 * frames are byte-stable across runs.
 *
 * Downstream contract (dial subsystem, living BPM, ECG trace, particles):
 *   - NEVER call Math.random() directly — call `random()`.
 *   - NEVER read Date/performance for on-screen vitals — read
 *     `wallSeconds()`, `bpm(live)`, `ecgPhase(live)`.
 */

import { EVAL_BPM, EVAL_DIAL_TIME, EVAL_ECG_PHASE, EVAL_RNG_SEED } from "./constants";
import { params } from "./params";

/** True when the page runs under `?eval=1`. */
export const isEvalMode: boolean = params.eval;

/* ---- Seeded RNG (mulberry32 — tiny, good-enough, reproducible) ----------- */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rng: () => number = isEvalMode ? mulberry32(EVAL_RNG_SEED) : Math.random;

/** Uniform [0,1) — seeded and reproducible in eval mode. */
export function random(): number {
  return rng();
}

/** Re-seed (used by `freezeClock(seed)` on the debug API). */
export function seedRandom(seed: number): void {
  rng = mulberry32(seed >>> 0);
}

/* ---- Wall clock (dial subsystem reads this, never Date directly) ---------- */

const EVAL_WALL_SECONDS =
  EVAL_DIAL_TIME.hours * 3600 + EVAL_DIAL_TIME.minutes * 60 + EVAL_DIAL_TIME.seconds;

/**
 * Seconds since local midnight, fractional. Frozen at 10:09:30.000 in eval
 * mode — the Always-On dial and the Nocturne real-seconds tick both derive
 * their hands from this single function.
 */
export function wallSeconds(): number {
  if (isEvalMode) return EVAL_WALL_SECONDS;
  const now = new Date();
  return (
    now.getHours() * 3600 +
    now.getMinutes() * 60 +
    now.getSeconds() +
    now.getMilliseconds() / 1000
  );
}

/* ---- Calendar (dial date slot) --------------------------------------------- */

export interface CalendarDay {
  /** Short uppercase weekday, e.g. "TUE". */
  weekday: string;
  /** Day of month, 1..31. */
  day: number;
}

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

/** Frozen calendar for eval captures (arbitrary but stable). */
const EVAL_CALENDAR: CalendarDay = { weekday: "TUE", day: 9 };

/**
 * Weekday + day-of-month for the dial's date complication — the ONE place
 * on-screen calendar data may come from (frozen under `?eval=1`).
 */
export function calendarDay(): CalendarDay {
  if (isEvalMode) return { ...EVAL_CALENDAR };
  const now = new Date();
  return { weekday: WEEKDAYS[now.getDay()] ?? "SUN", day: now.getDate() };
}

/* ---- Vitals (living BPM + ECG) -------------------------------------------- */

/** Pass the live simulated heart rate; eval mode pins it to 64. */
export function bpm(live: number): number {
  return isEvalMode ? EVAL_BPM : live;
}

/** Pass the live ECG phase 0..1; eval mode pins it to 0. */
export function ecgPhase(live: number): number {
  return isEvalMode ? EVAL_ECG_PHASE : live;
}
