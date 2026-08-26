/**
 * Scroll engine — wiring EXACTLY per PLAN §3 decision record:
 *
 *   - ONE smoothing owner: Lenis, duration 4. The engine reads
 *     `lenis.scroll` RAW every frame — no second lerp on position.
 *   - `lenis.raf` is driven from `gsap.ticker` (single rAF loop; gsap time
 *     is seconds, lenis wants milliseconds — Spike B pitfall #1).
 *   - `gsap.ticker.lagSmoothing(0)` so GSAP never rubber-bands time
 *     against Lenis after a long frame.
 *   - Pinning is CSS position:sticky; ScrollTrigger is NOT used for pins
 *     (and is not imported anywhere in the engine).
 *
 * Mobile discipline (PLAN §3): height-only resizes < TOUCH_RESIZE_IGNORE_PX
 * are ignored on touch (iOS URL-bar churn); accepted resizes are debounced
 * AND deferred to scroll-idle (|lenis.velocity| below threshold) before the
 * re-measure callbacks run — geometry never shifts mid-glide.
 *
 * Eval determinism: `settleSync(target)` runs the whole frame pipeline
 * synchronously — propagate targets → snap all registered lerps
 * (Snappable) → final pose/render pass — so `gotoSection` under `?eval=1`
 * returns with the frame already in its final state (PLAN §6).
 */

import { gsap } from "gsap";
import Lenis from "lenis";
import {
  AUTOSCROLL_DEFAULT_DURATION_S,
  LENIS_DURATION,
  RESIZE_DEBOUNCE_MS,
  SCROLL_IDLE_VELOCITY,
  TOUCH_RESIZE_IGNORE_PX,
} from "./constants";

export type FrameCallback = (rawScroll: number, deltaSeconds: number) => void;
export type ResizeCallback = () => void;

/** Anything holding an internal lerp that eval-mode settling must snap. */
export interface Snappable {
  snap(): void;
}

export class ScrollEngine {
  readonly lenis: Lenis;
  private frameCallbacks: FrameCallback[] = [];
  private resizeCallbacks: ResizeCallback[] = [];
  private snappables: Snappable[] = [];
  private lastHeight = window.innerHeight;
  private lastWidth = document.documentElement.clientWidth;
  private resizeTimer: number | undefined;
  private refreshPending = false;
  private readonly isTouch = window.matchMedia("(pointer: coarse)").matches;

  /** True when the iOS URL-bar resize guard is armed on this device —
   *  height-only resizes < TOUCH_RESIZE_IGNORE_PX are ignored (PLAN §3;
   *  surfaced as state().flags.touchResizeFilter for the eval harness). */
  get touchResizeFilterArmed(): boolean {
    return this.isTouch;
  }

  constructor() {
    this.lenis = new Lenis({ duration: LENIS_DURATION });

    // Single rAF loop: gsap.ticker drives Lenis (seconds → ms).
    gsap.ticker.add(this.onTick);
    gsap.ticker.lagSmoothing(0);

    window.addEventListener("resize", this.onResize);
  }

  private onTick = (time: number, deltaMs: number): void => {
    this.lenis.raf(time * 1000);
    // RAW read — Lenis already smoothed it; nobody smooths position again.
    const scroll = this.lenis.scroll;
    const dt = deltaMs / 1000;
    for (const cb of this.frameCallbacks) cb(scroll, dt);

    // Deferred re-measure: only once the glide has actually stopped.
    if (this.refreshPending && Math.abs(this.lenis.velocity) < SCROLL_IDLE_VELOCITY) {
      this.refreshPending = false;
      for (const cb of this.resizeCallbacks) cb();
    }
  };

  private onResize = (): void => {
    // iOS URL-bar churn guard: ignore small height-only changes on touch.
    if (this.isTouch) {
      const dh = Math.abs(window.innerHeight - this.lastHeight);
      const widthChanged = document.documentElement.clientWidth !== this.lastWidth;
      if (!widthChanged && dh < TOUCH_RESIZE_IGNORE_PX) return;
    }
    this.lastHeight = window.innerHeight;
    this.lastWidth = document.documentElement.clientWidth;
    // Debounce, then wait for scroll-idle before re-measuring (PLAN §3).
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.refreshPending = true;
    }, RESIZE_DEBOUNCE_MS);
  };

  onFrame(cb: FrameCallback): void {
    this.frameCallbacks.push(cb);
  }

  onResizeSettled(cb: ResizeCallback): void {
    this.resizeCallbacks.push(cb);
  }

  /** Register a lerp holder to be snapped by settleSync (eval mode). */
  registerSnappable(s: Snappable): void {
    this.snappables.push(s);
  }

  scrollTo(target: number, immediate = false): void {
    this.lenis.scrollTo(target, immediate ? { immediate: true, force: true } : undefined);
  }

  /**
   * Synchronous settle at `target` (eval transport): pass 1 propagates
   * scrub targets through every frame callback with dt=0, then all
   * registered lerps snap to their targets, then pass 2 re-runs the
   * pipeline so the final pose is computed AND rendered. When the caller
   * already issued an immediate scrollTo, `target` defaults to
   * `lenis.scroll`.
   */
  settleSync(target?: number): void {
    const scroll = target ?? this.lenis.scroll;
    for (const cb of this.frameCallbacks) cb(scroll, 0);
    for (const s of this.snappables) s.snap();
    for (const cb of this.frameCallbacks) cb(scroll, 0);
  }

  /**
   * Re-measure Lenis's internal dimensions. MUST be called after anything
   * that changes document height (SectionBase sets track heights AFTER the
   * engine is constructed) — otherwise lenis.limit is stale and every
   * scrollTo silently clamps to the old page height.
   */
  refresh(): void {
    this.lenis.resize();
  }

  /** Max scrollable offset right now. */
  limit(): number {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  /**
   * `?autoscroll`: scripted fixed-velocity scroll to the end of the page.
   * Default pace covers the full page in ~60s (mirrors the eval capture
   * script); `speedPxPerSec` overrides with an absolute velocity. Linear
   * easing — Lenis's own smoothing stays out of the way so the velocity is
   * actually constant (usable for the demo-reel capture too).
   */
  startAutoscroll(speedPxPerSec: number | null): void {
    // Slow boots can reach loader.ready before Lenis has measured the page
    // (stale-limit pitfall): refresh first, and retry once next frame if the
    // limit still reads empty.
    this.refresh();
    if (this.limit() <= 0) {
      requestAnimationFrame(() => {
        this.refresh();
        if (this.limit() > 0) this.startAutoscroll(speedPxPerSec);
      });
      return;
    }
    const distance = this.limit() - this.lenis.scroll;
    if (distance <= 0) return;
    const duration =
      speedPxPerSec !== null && speedPxPerSec > 0
        ? distance / speedPxPerSec
        : AUTOSCROLL_DEFAULT_DURATION_S;
    this.lenis.scrollTo(this.limit(), {
      duration,
      easing: (t: number) => t,
      lock: false,
    });
  }
}
