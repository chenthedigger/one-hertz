/**
 * Scroll engine — wiring EXACTLY per PLAN §3 decision record:
 *
 *   - ONE smoothing owner: Lenis, duration 4. The engine reads
 *     `lenis.scroll` RAW every frame — no second lerp on position.
 *   - `lenis.raf` is driven from `gsap.ticker` (single rAF loop).
 *   - `gsap.ticker.lagSmoothing(0)` so GSAP never rubber-bands time
 *     against Lenis after a long frame.
 *   - Pinning is CSS position:sticky; ScrollTrigger is NOT used for pins
 *     (and is not even imported in this slice).
 */

import { gsap } from "gsap";
import Lenis from "lenis";
import { LENIS_DURATION, TOUCH_RESIZE_IGNORE_PX } from "./constants";

export type FrameCallback = (rawScroll: number, deltaSeconds: number) => void;
export type ResizeCallback = () => void;

export class ScrollEngine {
  readonly lenis: Lenis;
  private frameCallbacks: FrameCallback[] = [];
  private resizeCallbacks: ResizeCallback[] = [];
  private lastHeight = window.innerHeight;
  private lastWidth = document.documentElement.clientWidth;
  private resizeTimer: number | undefined;
  private readonly isTouch = window.matchMedia("(pointer: coarse)").matches;

  constructor() {
    this.lenis = new Lenis({ duration: LENIS_DURATION });

    // Single rAF loop: gsap.ticker drives Lenis. gsap time is seconds,
    // lenis.raf wants milliseconds.
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
    // Debounce re-measure to scroll-idle-ish (PLAN §3).
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      for (const cb of this.resizeCallbacks) cb();
    }, 150);
  };

  onFrame(cb: FrameCallback): void {
    this.frameCallbacks.push(cb);
  }

  onResizeSettled(cb: ResizeCallback): void {
    this.resizeCallbacks.push(cb);
  }

  scrollTo(target: number, immediate = false): void {
    this.lenis.scrollTo(target, immediate ? { immediate: true } : undefined);
  }
}
