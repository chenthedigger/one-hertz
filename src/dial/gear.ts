/**
 * Geared seconds hand — the thesis rehearsed on the dial (PLAN §2:
 * "scroll-geared second hand… sweeps with velocity, ticks 1/s at rest").
 *
 * Two regimes, one displayed value (fractional seconds on a 0..60 wheel):
 *
 *   SWEEP (|scrollVelocity| ≥ SWEEP_MIN_VELOCITY): the hand position is a
 *   pure function of the page clock scalar — `offset + clockScalar ×
 *   GEAR_PAGE_REVS × 60`. The scroll is already Lenis-smoothed and the
 *   offset is captured at engage so the hand never jumps; deriving from the
 *   scalar (not integrating velocity) keeps it deterministic, reversible
 *   (scroll up = hand runs backward — mechanical), and adds NO second
 *   smoothing owner (engine doctrine, docs/p1/engine.md).
 *
 *   REST: the hand phase-aligns to the wall-clock tick — shortest path on
 *   the wheel, exponential ease (≤1-tick handoff, the same grammar the
 *   Nocturne clock handoff formalizes in P3) — then follows floor(wall)
 *   in whole 1 s steps: the quartz tick.
 *
 * Eval mode (`?eval=1`): bypasses both regimes — displayed seconds come
 * straight from the frozen `wallSeconds()` (10:09:30 → hand at 30 s).
 * dt ≤ 0 (the engine's settleSync pass) snaps the phase-align instantly.
 */

import { isEvalMode, wallSeconds } from "../core/determinism";
import { GEAR_PAGE_REVS, REST_SNAP_EPS, REST_TICK_RATE, SWEEP_MIN_VELOCITY } from "./spec";

/** Per-frame gearing input (wire: clockScalar = getClock(), scrollVelocity = lenis.velocity). */
export interface DialGear {
  /** Global page progress 0..1 (core/clock.ts scalar — freezable). */
  clockScalar: number;
  /** Raw Lenis velocity, px/frame. Preview may synthesize it. */
  scrollVelocity: number;
}

function wrap60(v: number): number {
  return ((v % 60) + 60) % 60;
}

/** Shortest signed distance a→b on the 60 s wheel, in (-30, 30]. */
function shortest60(delta: number): number {
  return ((((delta + 30) % 60) + 60) % 60) - 30;
}

export class GearedSeconds {
  private displayed = wrap60(wallSeconds());
  private sweepOffset = 0;
  private sweeping = false;

  /** Displayed seconds, fractional, [0, 60). */
  value(): number {
    return this.displayed;
  }

  /** Advance one frame; returns the displayed seconds. */
  update(gear: DialGear, dt: number): number {
    if (isEvalMode) {
      this.displayed = wrap60(wallSeconds()); // frozen 10:09:30 → 30 s
      return this.displayed;
    }

    const pageSeconds = gear.clockScalar * GEAR_PAGE_REVS * 60;
    const moving = Math.abs(gear.scrollVelocity) >= SWEEP_MIN_VELOCITY;

    if (moving && !this.sweeping) {
      this.sweeping = true;
      this.sweepOffset = this.displayed - pageSeconds; // engage without a jump
    } else if (!moving && this.sweeping) {
      this.sweeping = false;
    }

    if (this.sweeping) {
      this.displayed = wrap60(this.sweepOffset + pageSeconds);
    } else {
      const target = Math.floor(wallSeconds()) % 60;
      const delta = shortest60(target - this.displayed);
      if (Math.abs(delta) <= 1 + REST_SNAP_EPS) {
        // Within one tick of the wall clock: the quartz step — INSTANT, so
        // rest costs exactly one redraw per second (dirty-flag contract).
        // A designed 2–3 frame snap animation is a P1.5 beauty decision.
        this.displayed = target;
      } else {
        // Fresh out of a sweep, >1 tick away: phase-align glide, shortest
        // path; converges inside one tick period (REST_TICK_RATE).
        const k = dt > 0 ? 1 - Math.exp(-dt * REST_TICK_RATE) : 1;
        this.displayed = wrap60(this.displayed + delta * k);
      }
    }
    return this.displayed;
  }
}
