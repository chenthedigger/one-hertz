/**
 * Longpress hold-zoom — recon mechanic 2, the signature interaction
 * (PLAN §1): hold ≥LONGPRESS_HOLD_MS anywhere (mouse OR touch) →
 *
 *   1. lenis.stop() — the page freezes under the finger,
 *   2. intensity ramps 0→1 over LONGPRESS_RAMP_S (power3.inOut), emitting
 *      LONGPRESS_TOGGLE {active:true, intensity} every ramp frame,
 *   3. consumers: camera rig dollys in by the active section's
 *      zoomMultiplier and multiplies mouse parallax ×(1+intensity); the
 *      cursor's HOLD ring fills; UPDATE_ROTATIONS {speed} accelerates
 *      mechanism spins.
 *
 * Release (or pointercancel / window blur) restarts Lenis IMMEDIATELY and
 * ramps intensity back down (power3.out over a duration proportional to
 * how far it got) with {active:false} — the zoom relaxes while scrolling
 * is already live again, exactly the source's feel.
 *
 * Gesture arbitration (PLAN §3): while a hold is ACTIVE, touchmove is
 * preventDefault-ed (non-passive listener added only for the hold's
 * lifetime) and contextmenu is suppressed, so the OS long-press menu and
 * native scrolling never fight the mechanic. BEFORE arming, pointer travel
 * beyond LONGPRESS_CANCEL_MOVE_PX cancels the pending hold — a moving
 * finger means scroll intent. Movement after arming is welcome: it feeds
 * the amplified parallax.
 *
 * Exposes state().longpress {active, intensity, scrollEnabled} additively
 * (scrollEnabled lives here because state().scroll must stay a scalar in
 * schema v1).
 */

import { gsap } from "gsap";
import {
  EASE,
  LONGPRESS_CANCEL_MOVE_PX,
  LONGPRESS_HOLD_MS,
  LONGPRESS_RAMP_S,
  LONGPRESS_ROTATION_GAIN,
} from "../../core/constants";
import { extendState } from "../../core/debug";
import { bus, EngineEvent } from "../../core/events";
import type { ScrollEngine } from "../../core/scroll";

export class LongpressSystem {
  private pointerId: number | null = null;
  private pending = false;
  private active = false;
  private startX = 0;
  private startY = 0;
  private timer: number | undefined;
  private readonly ramp = { value: 0 };
  private tween: gsap.core.Tween | null = null;
  private scrollStopped = false;

  constructor(private readonly engine: ScrollEngine) {
    window.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerEnd);
    window.addEventListener("pointercancel", this.onPointerEnd);
    window.addEventListener("blur", this.onBlur);
    window.addEventListener("contextmenu", this.onContextMenu, true);

    extendState("longpress", () => ({
      active: this.active,
      intensity: Math.round(this.ramp.value * 1e4) / 1e4,
      scrollEnabled: !this.scrollStopped,
    }));
  }

  dispose(): void {
    window.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerEnd);
    window.removeEventListener("pointercancel", this.onPointerEnd);
    window.removeEventListener("blur", this.onBlur);
    window.removeEventListener("contextmenu", this.onContextMenu, true);
    this.releaseHold();
  }

  /* ---- pointer lifecycle ---------------------------------------------------- */

  private onPointerDown = (e: PointerEvent): void => {
    if (this.pointerId !== null) return; // first pointer owns the hold
    if (e.pointerType === "mouse" && e.button !== 0) return; // primary only
    // Native scrollbar drags land on the root element past the client edge.
    if (e.clientX >= document.documentElement.clientWidth) return;
    this.pointerId = e.pointerId;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.pending = true;
    this.timer = window.setTimeout(this.arm, LONGPRESS_HOLD_MS);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.pending || this.active || e.pointerId !== this.pointerId) return;
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    if (dx * dx + dy * dy > LONGPRESS_CANCEL_MOVE_PX * LONGPRESS_CANCEL_MOVE_PX) {
      this.cancelPending(); // travel before arming = scroll/drag intent
    }
  };

  private onPointerEnd = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    if (this.active) this.releaseHold();
    else this.cancelPending();
  };

  private onBlur = (): void => {
    // Cmd-tab / OS interruptions: never leave the page scroll-locked.
    if (this.active) this.releaseHold();
    else this.cancelPending();
  };

  private onContextMenu = (e: Event): void => {
    // Touch long-press summons the OS context menu right at arm time.
    if (this.pending || this.active) e.preventDefault();
  };

  private preventTouchMove = (e: TouchEvent): void => {
    e.preventDefault(); // PLAN §1 mechanic 2: no native scroll during hold
  };

  /* ---- hold state ------------------------------------------------------------ */

  private arm = (): void => {
    if (!this.pending) return;
    this.pending = false;
    this.active = true;

    this.engine.lenis.stop();
    this.scrollStopped = true;
    window.addEventListener("touchmove", this.preventTouchMove, { passive: false });
    document.documentElement.classList.add("is-longpressing");

    this.tween?.kill();
    // Ramp up from wherever a mid-decay re-press left off, at constant rate.
    this.tween = gsap.to(this.ramp, {
      value: 1,
      duration: LONGPRESS_RAMP_S * (1 - this.ramp.value),
      ease: EASE.default, // power3.inOut per recon
      onUpdate: () => this.emitTick(),
    });
    this.emitTick();
  };

  private releaseHold(): void {
    window.clearTimeout(this.timer);
    this.pending = false;
    this.pointerId = null;
    if (!this.active) return;
    this.active = false;

    this.engine.lenis.start(); // scroll returns immediately …
    this.scrollStopped = false;
    window.removeEventListener("touchmove", this.preventTouchMove);
    document.documentElement.classList.remove("is-longpressing");

    this.tween?.kill();
    // … while the zoom relaxes on its own exit ease.
    this.tween = gsap.to(this.ramp, {
      value: 0,
      duration: LONGPRESS_RAMP_S * this.ramp.value,
      ease: EASE.exit, // power3.out (motion-census exit)
      onUpdate: () => this.emitTick(),
    });
    this.emitTick();
  }

  private cancelPending(): void {
    window.clearTimeout(this.timer);
    this.pending = false;
    this.pointerId = null;
  }

  private emitTick(): void {
    const intensity = this.ramp.value;
    bus.emit(EngineEvent.LongpressToggle, { active: this.active, intensity });
    bus.emit(EngineEvent.UpdateRotations, {
      speed: 1 + intensity * LONGPRESS_ROTATION_GAIN,
    });
  }
}
