/**
 * Custom cursor — recon mechanic 1 (PLAN §1), desktop fine-pointer only.
 *
 * A designed DOM object that replaces the native cursor (`cursor: none`
 * scoped under `html.has-custom-cursor`): white dot in difference blend,
 * HOLD progress ring in biosignal red, porcelain icon chip, mono text
 * label. Position follows the pointer with magnetic easing
 * (1 - exp(-dt * CURSOR_FOLLOW_LERP)); layer transitions are GSAP tweens on
 * the motion-census default (power3.inOut, 0.4s).
 *
 * State machine — one visible state, derived from three inputs by fixed
 * precedence (icon > text > none):
 *
 *   inputs   busIcon   SET_CURSOR_ICON events (P3 mechanics; eval harness)
 *            override  setText() — programmatic text (P3 mechanics)
 *            hoverKey  [data-cursor-text="<key>"] hover delegation — the
 *                      declarative wiring P2 sections use (no imports):
 *                      keys of CURSOR_TEXT ("holdToExplore" | "selectModel"
 *                      | "swap")
 *
 * The HOLD ring is NOT a state: it overlays whatever state is live, filling
 * with LONGPRESS_TOGGLE intensity while the dot shrinks to a press.
 *
 * Touch/coarse pointers never mount this system (installCursor → null);
 * state().cursor is then absent and eval cursor checks skip gracefully.
 */

import { gsap } from "gsap";
import { CURSOR_FOLLOW_LERP, EASE } from "../../core/constants";
import { extendState, type CursorStateSnapshot } from "../../core/debug";
import { bus, EngineEvent, type CursorIconName } from "../../core/events";
import { iconMarkup } from "./icons";
import "./cursor.css";

/** Text-channel tokens (recon: HOLD TO EXPLORE / SELECT MODEL / SWAP). */
export const CURSOR_TEXT = {
  holdToExplore: "HOLD TO EXPLORE",
  selectModel: "SELECT MODEL",
  swap: "SWAP",
} as const;

export type CursorTextKey = keyof typeof CURSOR_TEXT;

function isCursorTextKey(v: string): v is CursorTextKey {
  return v in CURSOR_TEXT;
}

type Mode = "none" | "text" | "icon";

interface IconInput {
  name: CursorIconName;
  color?: string | undefined;
  /** "tag" floats the chip above the pointer (label-safe placement). */
  place?: "tag" | undefined;
}

/** Media query gate: the cursor exists only for hovering fine pointers. */
export function installCursor(): CursorSystem | null {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return null;
  return new CursorSystem();
}

export class CursorSystem {
  private readonly root: HTMLElement;
  private readonly dot: HTMLElement;
  private readonly ring: SVGElement;
  private readonly ringFill: SVGCircleElement;
  private readonly iconEl: HTMLElement;
  private readonly labelEl: HTMLElement;

  /* -- state-machine inputs -- */
  private busIcon: IconInput | null = null;
  private textOverride: CursorTextKey | null = null;
  private hoverKey: CursorTextKey | null = null;
  private holdIntensity = 0;
  private holdActive = false;

  /* -- derived, currently rendered -- */
  private mode: Mode = "none";
  private label: string | null = null;

  /* -- follow -- */
  private x = 0;
  private y = 0;
  private targetX = 0;
  private targetY = 0;
  private hasPointer = false;

  private readonly unsubscribe: (() => void)[] = [];

  constructor() {
    this.root = document.createElement("div");
    this.root.className = "cursor";
    this.root.setAttribute("aria-hidden", "true");
    this.root.innerHTML =
      `<div class="cursor__dot"></div>` +
      `<svg class="cursor__ring" viewBox="0 0 48 48" width="48" height="48">` +
      `<circle class="cursor__ring-track" cx="24" cy="24" r="21"></circle>` +
      `<circle class="cursor__ring-fill" cx="24" cy="24" r="21" pathLength="1"></circle>` +
      `</svg>` +
      `<div class="cursor__icon"></div>` +
      `<div class="cursor__label"></div>`;
    document.body.appendChild(this.root);
    document.documentElement.classList.add("has-custom-cursor");

    this.dot = this.query(".cursor__dot");
    this.ring = this.root.querySelector(".cursor__ring") as SVGElement;
    this.ringFill = this.root.querySelector(".cursor__ring-fill") as SVGCircleElement;
    this.iconEl = this.query(".cursor__icon");
    this.labelEl = this.query(".cursor__label");

    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", this.onLeaveViewport);
    gsap.ticker.add(this.onTick);

    this.unsubscribe.push(
      bus.on(EngineEvent.SetCursorIcon, ({ icon, color, place }) => {
        this.busIcon = icon === null ? null : { name: icon, color, place };
        this.resolve();
      }),
      bus.on(EngineEvent.LongpressToggle, ({ active, intensity }) => {
        this.setHold(active, intensity);
      }),
    );

    extendState("cursor", () => this.snapshot());
  }

  /** Programmatic text channel for P3 mechanics (null clears). */
  setText(key: CursorTextKey | null): void {
    this.textOverride = key;
    this.resolve();
  }

  snapshot(): CursorStateSnapshot {
    return {
      mode: this.mode,
      label: this.label,
      icon: this.busIcon?.name ?? null,
      holdProgress: Math.round(this.holdIntensity * 1e4) / 1e4,
    };
  }

  dispose(): void {
    for (const off of this.unsubscribe) off();
    window.removeEventListener("pointermove", this.onPointerMove);
    document.documentElement.removeEventListener("mouseleave", this.onLeaveViewport);
    gsap.ticker.remove(this.onTick);
    document.documentElement.classList.remove("has-custom-cursor");
    this.root.remove();
  }

  /* ---- input handlers ------------------------------------------------------ */

  private onPointerMove = (e: PointerEvent): void => {
    this.targetX = e.clientX;
    this.targetY = e.clientY;
    if (!this.hasPointer) {
      // First contact: appear AT the pointer, never fly in from (0,0).
      this.hasPointer = true;
      this.x = this.targetX;
      this.y = this.targetY;
      this.root.classList.add("is-active");
    }
    // Declarative text channel: nearest [data-cursor-text] under the pointer.
    const el =
      e.target instanceof Element ? e.target.closest<HTMLElement>("[data-cursor-text]") : null;
    const raw = el?.dataset["cursorText"];
    const key = raw !== undefined && isCursorTextKey(raw) ? raw : null;
    if (key !== this.hoverKey) {
      this.hoverKey = key;
      this.resolve();
    }
  };

  private onLeaveViewport = (): void => {
    this.hasPointer = false;
    this.root.classList.remove("is-active");
  };

  private onTick = (_time: number, deltaMs: number): void => {
    if (!this.hasPointer) return;
    // Magnetic easing follow — frame-rate independent.
    const k = 1 - Math.exp(-(deltaMs / 1000) * CURSOR_FOLLOW_LERP);
    this.x += (this.targetX - this.x) * k;
    this.y += (this.targetY - this.y) * k;
    this.root.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
  };

  /* ---- HOLD ring (longpress overlay) --------------------------------------- */

  private setHold(active: boolean, intensity: number): void {
    const wasEngaged = this.holdActive || this.holdIntensity > 0.001;
    this.holdActive = active;
    this.holdIntensity = intensity;
    // Ring fill is driven DIRECTLY by the ramp (it IS the ramp made visible).
    this.ringFill.style.strokeDashoffset = String(1 - intensity);
    const engaged = active || intensity > 0.001;
    if (engaged !== wasEngaged) {
      this.root.classList.toggle("is-holding", engaged);
      gsap.to(this.ring, {
        opacity: engaged ? 1 : 0,
        duration: 0.4,
        ease: EASE.default,
        overwrite: "auto",
      });
      // The dot presses in while the ring charges around it.
      gsap.to(this.dot, {
        scale: engaged ? 0.5 : this.dotScale(this.mode),
        duration: 0.4,
        ease: EASE.default,
        overwrite: "auto",
      });
      // Text yields to the ring during a hold.
      gsap.to(this.labelEl, {
        opacity: engaged ? 0 : this.mode === "text" ? 1 : 0,
        duration: 0.3,
        ease: EASE.default,
        overwrite: "auto",
      });
    }
  }

  /* ---- state machine -------------------------------------------------------- */

  /** Tag chips (label-safe placement) float above the pointer: the
   *  finish-swatch always, plus any icon sent with `place: "tag"`. */
  private isTagChip(): boolean {
    const icon = this.busIcon;
    return icon !== null && (icon.name === "finish-swatch" || icon.place === "tag");
  }

  private dotScale(mode: Mode): number {
    // Tag chips park ABOVE the pointer (gate:p3 cursor polish), so the
    // dot survives at reduced scale as the chip's anchor point.
    if (mode === "icon") return this.isTagChip() ? 0.6 : 0;
    return mode === "text" ? 1.6 : 1;
  }

  /** Recompute the derived state from the inputs and animate the change. */
  private resolve(): void {
    const textKey = this.textOverride ?? this.hoverKey;
    const next: Mode = this.busIcon !== null ? "icon" : textKey !== null ? "text" : "none";
    const nextLabel = next === "text" && textKey !== null ? CURSOR_TEXT[textKey] : null;

    // Icon content updates even within the same mode (e.g. swatch recolor).
    if (next === "icon" && this.busIcon !== null) {
      this.iconEl.innerHTML = iconMarkup(this.busIcon.name, this.busIcon.color);
    }
    // gate:p3 cursor polish (MWR rows / outro model labels): tag chips
    // float above the pointer — never a cover over the label they point
    // at. CSS .is-swatch lifts the chip; dotScale above keeps the dot
    // visible as its anchor.
    this.root.classList.toggle("is-swatch", next === "icon" && this.isTagChip());
    if (nextLabel !== null) this.labelEl.textContent = nextLabel;

    const modeChanged = next !== this.mode || nextLabel !== this.label;
    this.mode = next;
    this.label = nextLabel;
    if (!modeChanged) return;

    const d = 0.4; // motion-census default duration
    const holdEngaged = this.holdActive || this.holdIntensity > 0.001;
    gsap.to(this.dot, {
      scale: holdEngaged ? 0.5 : this.dotScale(next),
      duration: d,
      ease: EASE.default,
      overwrite: "auto",
    });
    gsap.to(this.iconEl, {
      scale: next === "icon" ? 1 : 0,
      opacity: next === "icon" ? 1 : 0,
      duration: d,
      ease: EASE.default,
      overwrite: "auto",
    });
    gsap.to(this.labelEl, {
      opacity: next === "text" && !holdEngaged ? 1 : 0,
      y: next === "text" ? 0 : 6,
      duration: d,
      ease: EASE.default,
      overwrite: "auto",
    });
  }

  private query(selector: string): HTMLElement {
    const el = this.root.querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`CursorSystem: missing ${selector}`);
    return el;
  }
}
