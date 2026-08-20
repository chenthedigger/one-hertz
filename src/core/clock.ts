/**
 * Clock scalar — the single global progress scalar (0..1 over the whole
 * page) that drives BOTH the CSS layer (custom property `--clock`) and the
 * WebGL layer (a shared uniform object). One value, two consumers, zero
 * drift (PLAN §3: lighting keyframes, Nocturne radial mask, etc. all read
 * this scalar).
 */

export interface ClockUniform {
  value: number;
}

const root = document.documentElement;

/** Shared uniform object — pass by reference into any three.js material. */
export const uClock: ClockUniform = { value: 0 };

let frozen = false;
let frozenValue = 0;

export function setClock(progress: number): void {
  const v = frozen ? frozenValue : Math.min(1, Math.max(0, progress));
  if (v === uClock.value) return;
  uClock.value = v;
  root.style.setProperty("--clock", v.toFixed(5));
}

export function getClock(): number {
  return uClock.value;
}

/**
 * Freeze the clock at a deterministic value — eval-harness hook
 * (PLAN §6 determinism: `?eval=1` freezes clock). `seed` doubles as the
 * frozen scalar value for now; RNG seeding joins in P1.
 */
export function freezeClock(seed: number): void {
  frozen = true;
  frozenValue = Math.min(1, Math.max(0, seed));
  uClock.value = frozenValue;
  root.style.setProperty("--clock", frozenValue.toFixed(5));
}

export function unfreezeClock(): void {
  frozen = false;
}
