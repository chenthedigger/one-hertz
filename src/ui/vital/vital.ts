/**
 * Living BPM vital (PLAN §2 "Living BPM" — P3 vital lane).
 *
 * Persistent top-right chrome, the page's heartbeat instrument: a Geist
 * Mono tabular BPM readout + a 2 px ECG trace that DRAWS with overall
 * scroll progress (the clock scalar), plus the opt-in sound toggle styled
 * into the same chip. Mounts hidden at boot and reveals when the loader
 * resolves (the Intro lane's placeholder anchor `.intro__vital` yields via
 * `body.vital-live` — this module IS that anchor's promised wiring).
 *
 * Signal model (motion-bible §7.1 vocabulary — {clock, velocity, intensity}):
 *   - Simulated HR: |Lenis velocity| → target 58↔142, smoothed with an
 *     asymmetric lerp (fast rise, slow physiological recovery).
 *   - Beat phase integrates dt · HR/60; each wrap = one BEAT: QRS flash at
 *     the trace head + a ONE-FRAME 1.006 scale tick on the WebGL canvas
 *     (#stage) + a heartbeat voice when sound is on.
 *   - ECG reveal = clock scalar (scroll IS the pen).
 *
 * Determinism (docs/p1/engine.md §5 — NEVER Math.random/Date):
 *   - Display value runs through `bpm(live)` → pinned 64 under `?eval=1`.
 *   - Trace phase runs through `ecgPhase(live)` → pinned 0.
 *   - Under eval the simulation itself is inert (no phase advance, no
 *     beats, no flash) so repeat captures are structurally identical.
 *
 * bgStage awareness (LOOKBIBLE §2): the light-keyframe driver rewrites the
 * stage ground per section; this vital watches the applied ground's
 * luminance and swaps to the Nocturne signal token (#FF375F) + porcelain
 * text on dark beats. Literal porcelain text on dark (cursor-chip
 * precedent, docs/p2/integrate.md #7): `--porcelain` itself IS the dark
 * value on those beats, so the token cannot be used for the counter-color.
 *
 * prefers-reduced-motion: beat flash + canvas scale tick are suppressed and
 * the sound toggle renders disabled (no AudioContext, ever). The trace
 * still draws — it is scroll-driven, not autonomous motion.
 */

import { gsap } from "gsap";
import { getClock } from "../../core/clock";
import type { VitalStateSnapshot } from "../../core/debug";
import { bpm as pinBpm, ecgPhase as pinEcgPhase, isEvalMode } from "../../core/determinism";
import type { StateStore } from "../../core/state";
import { HeartAudio } from "./sound";
import "./vital.css";

/* ---- signal constants ------------------------------------------------------ */

const HR_REST = 58;
const HR_MAX = 142;
/** |Lenis velocity| (px/frame) that reads as a flat-out sprint. */
const VEL_FULL = 55;
/** Velocity envelope smoothing (1 − e^(−dt·k)). */
const VEL_K = 3;
/** HR chase rates — cardio-shaped: quick to rise, slow to recover. */
const HR_UP_K = 1.4;
const HR_DOWN_K = 0.3;
/** QRS flash decay (s) — one beat's glint, gone before the next. */
const FLASH_S = 0.22;
/** One-frame canvas tick scale (PLAN §2 verbatim). */
const STAGE_TICK_SCALE = 1.006;
/** PQRST complexes across the full trace width. */
const TRACE_CYCLES = 5;

export interface VitalOptions {
  store: StateStore;
  /** The WebGL canvas (#stage) — receives the one-frame beat scale tick. */
  stageCanvas: HTMLElement;
  /** Raw Lenis velocity, px/frame (the ONE scroll-speed source). */
  getVelocity(): number;
  /** Applied stage ground hex from the light-keyframe driver (null = parked). */
  getStageHex(): string | null;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Relative luminance (sRGB, cheap) of "#rrggbb" — dark-ground detector. */
function hexLuminance(hex: string): number {
  const v = parseInt(hex.replace("#", ""), 16);
  const r = ((v >> 16) & 255) / 255;
  const g = ((v >> 8) & 255) / 255;
  const b = (v & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * One PQRST complex on u ∈ [0,1): flat baseline with a P bump, the sharp
 * QRS triangle, and a T bump. Returns −1..1 (1 = R peak, up).
 */
function ecgWave(u: number): number {
  const t = u - Math.floor(u);
  // P wave
  if (t >= 0.12 && t < 0.22) return 0.16 * Math.sin(((t - 0.12) / 0.1) * Math.PI);
  // Q dip
  if (t >= 0.28 && t < 0.32) return -0.18 * ((t - 0.28) / 0.04);
  // R spike up
  if (t >= 0.32 && t < 0.38) {
    const k = (t - 0.32) / 0.06;
    return -0.18 + (1 + 0.18) * (k < 0.5 ? k * 2 : (1 - k) * 2);
  }
  // S dip
  if (t >= 0.38 && t < 0.43) return -0.28 * (1 - (t - 0.38) / 0.05);
  // T wave
  if (t >= 0.52 && t < 0.68) return 0.26 * Math.sin(((t - 0.52) / 0.16) * Math.PI);
  return 0;
}

export class LivingVital {
  private readonly root: HTMLElement;
  private readonly valueEl: HTMLElement;
  private readonly soundBtn: HTMLButtonElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx2d: CanvasRenderingContext2D | null;
  private readonly audio = new HeartAudio();
  private readonly reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** Token colors read at construction from the live CSS custom properties;
   *  the light signal follows the colorway accent (setAccent below). */
  private signalLight: string;
  private readonly signalDark: string;

  private hr = HR_REST;
  private velEnv = 0; // smoothed 0..1 velocity envelope
  private phase = 0;
  private beats = 0;
  private flash = 0;
  private dark = false;
  private revealed = false;
  private shownValue = -1; // last painted readout (write-on-change)
  private tickArmed = false; // stage scale applied this frame — clear next
  private lastDraw = { clock: -1, phase: -1, flash: -1, dark: false };

  constructor(private readonly opts: VitalOptions) {
    const styles = getComputedStyle(document.documentElement);
    this.signalLight = (styles.getPropertyValue("--biosignal").trim() || "#FF2D55").toLowerCase();
    this.signalDark =
      (styles.getPropertyValue("--biosignal-nocturne").trim() || "#FF375F").toLowerCase();

    this.root = document.createElement("aside");
    this.root.className = "vital";
    this.root.setAttribute("aria-label", "live heart rate");
    this.root.dataset["vital"] = "bpm-live";
    this.root.innerHTML = `
      <canvas class="vital__trace" aria-hidden="true"></canvas>
      <p class="vital__read">
        <span class="vital__value tnum" data-vital-value>${HR_REST}</span>
        <span class="vital__unit">BPM</span>
      </p>
      <button class="vital__sound" type="button" aria-pressed="false"
              aria-label="enable heartbeat sound">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path class="vital__sound-body" d="M2 6h2.6L8 3v10L4.6 10H2z" />
          <path class="vital__sound-wave" d="M10.5 5.5q2 2.5 0 5" fill="none" />
          <path class="vital__sound-mute" d="M10.2 6.2l3.6 3.6M13.8 6.2l-3.6 3.6" fill="none" />
        </svg>
      </button>`;

    this.valueEl = this.must(".vital__value");
    this.soundBtn = this.must(".vital__sound") as HTMLButtonElement;
    this.canvas = this.must(".vital__trace") as HTMLCanvasElement;
    this.ctx2d = this.canvas.getContext("2d");

    if (this.reducedMotion) {
      // No sound path at all under reduced motion (spec: respected).
      this.soundBtn.disabled = true;
      this.soundBtn.setAttribute("aria-label", "sound unavailable (reduced motion)");
    } else {
      this.soundBtn.addEventListener("click", () => this.toggleSound());
    }

    document.body.append(this.root);
    // Size ONLY after the root is in the DOM — a detached canvas measures
    // 0×0 and a 1×1 backing store CSS-stretches into a solid red block
    // (bit this lane on the first capture). ResizeObserver keeps the
    // backing store honest across viewport/layout changes.
    this.sizeCanvas();
    new ResizeObserver(() => this.sizeCanvas()).observe(this.canvas);
    // The Intro section's placeholder vital yields to this live chrome.
    document.body.classList.add("vital-live");
  }

  /**
   * Colorway accent (P3 swap — CONFIG_CHANGE consumer): the trace + QRS
   * flash follow the config's tempered biosignal on light grounds. The
   * Nocturne dark-ground variant stays the authored #FF375F family — the
   * AOD beat keeps its own law (LOOKBIBLE §5).
   */
  setAccent(accent: string): void {
    const next = accent.toLowerCase();
    if (next === this.signalLight) return;
    this.signalLight = next;
    this.lastDraw.clock = -1; // dirty — repaint on the next update()
  }

  /** Loader resolved — fade the instrument in (instant under eval). */
  reveal(): void {
    if (this.revealed) return;
    this.revealed = true;
    if (isEvalMode) {
      this.root.classList.add("is-live");
      return;
    }
    // Timed to the Intro entrance chain's vital slot (t≈1.0 after dismiss
    // start; loader.ready lands at +0.6 s — wall-clock scale {0.4, 0.8}).
    gsap.to(this.root, {
      autoAlpha: 1,
      duration: 0.8,
      ease: "power3.out",
      delay: 0.4,
      onStart: () => this.root.classList.add("is-live"),
    });
  }

  /** Per engine frame (dt seconds; dt=0 on eval settle passes). */
  update(dt: number): void {
    // Clear last frame's one-frame stage tick FIRST (exactly one frame).
    if (this.tickArmed) {
      this.tickArmed = false;
      this.opts.stageCanvas.style.transform = "";
    }

    if (!isEvalMode && dt > 0) {
      // Velocity envelope → target HR → asymmetric chase.
      const vel = clamp01(Math.abs(this.opts.getVelocity()) / VEL_FULL);
      this.velEnv += (vel - this.velEnv) * (1 - Math.exp(-dt * VEL_K));
      const target = HR_REST + (HR_MAX - HR_REST) * this.velEnv;
      const k = target > this.hr ? HR_UP_K : HR_DOWN_K;
      this.hr += (target - this.hr) * (1 - Math.exp(-dt * k));

      // Beat integrator — each wrap is one heartbeat.
      this.phase += (dt * this.hr) / 60;
      if (this.phase >= 1) {
        this.phase -= Math.floor(this.phase);
        this.onBeat();
      }
      if (this.flash > 0) this.flash = Math.max(0, this.flash - dt / FLASH_S);

      this.audio.update();
    }

    // Ground awareness: dark stage → Nocturne signal + porcelain text.
    const ground = this.opts.getStageHex();
    const dark = ground !== null && hexLuminance(ground) < 0.35;
    if (dark !== this.dark) {
      this.dark = dark;
      this.root.classList.toggle("is-dark", dark);
    }

    // Readout (write-on-change; pinned 64 under eval).
    const shown = Math.round(pinBpm(this.hr));
    if (shown !== this.shownValue) {
      this.shownValue = shown;
      this.valueEl.textContent = String(shown);
    }

    this.draw();
  }

  stats(): VitalStateSnapshot {
    return {
      bpm: Math.round(pinBpm(this.hr)),
      rawBpm: Math.round(this.hr * 10) / 10,
      phase: pinEcgPhase(this.phase),
      beats: this.beats,
      signal: this.dark ? this.signalDark : this.signalLight,
      dark: this.dark,
      revealed: this.revealed,
      soundOn: this.audio.on,
      reducedMotion: this.reducedMotion,
    };
  }

  /* ---- internals ----------------------------------------------------------- */

  private onBeat(): void {
    this.beats++;
    if (this.reducedMotion) return; // flash + scale tick are motion
    this.flash = 1;
    // ONE-FRAME 1.006 scale tick on the WebGL canvas (PLAN §2) — applied
    // now, cleared at the top of the next update.
    this.opts.stageCanvas.style.transform = `scale(${STAGE_TICK_SCALE})`;
    this.tickArmed = true;
    this.audio.beat(this.hr);
  }

  private toggleSound(): void {
    if (this.audio.on) {
      this.audio.disable();
    } else {
      this.audio.enable(); // first call constructs the AudioContext
    }
    const on = this.audio.on;
    this.opts.store.uiFlags.soundOn = on;
    this.soundBtn.setAttribute("aria-pressed", String(on));
    this.soundBtn.setAttribute(
      "aria-label",
      on ? "mute heartbeat sound" : "enable heartbeat sound",
    );
    this.root.classList.toggle("is-sound", on);
  }

  private sizeCanvas(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.lastDraw.clock = -1; // force repaint at the new size
    }
  }

  /** Repaint only when an input actually changed (dirty-flag discipline). */
  private draw(): void {
    const ctx = this.ctx2d;
    if (!ctx) return;
    const clock = getClock();
    const phase = pinEcgPhase(this.phase);
    const flash = isEvalMode ? 0 : this.flash;
    const d = this.lastDraw;
    if (clock === d.clock && phase === d.phase && flash === d.flash && this.dark === d.dark) {
      return;
    }
    this.lastDraw = { clock, phase, flash, dark: this.dark };

    const w = this.canvas.width;
    const h = this.canvas.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const signal = this.dark ? this.signalDark : this.signalLight;
    ctx.clearRect(0, 0, w, h);

    const baseline = h * 0.62;
    const amp = h * 0.42;
    const headX = clamp01(clock) * w;

    // Undrawn remainder: 1 px hairline at 18% — the paper the pen will ink.
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 1 * dpr;
    ctx.strokeStyle = signal;
    ctx.beginPath();
    ctx.moveTo(headX, baseline);
    ctx.lineTo(w, baseline);
    ctx.stroke();

    // The drawn trace — 2 px, revealed by the clock scalar.
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2 * dpr;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    const steps = Math.max(2, Math.floor(headX));
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * headX;
      const y = baseline - ecgWave((x / w) * TRACE_CYCLES) * amp;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Beat: QRS spike fired at the head + head dot glint.
    if (flash > 0) {
      const spikeH = amp * (0.5 + 0.5 * flash);
      ctx.globalAlpha = flash;
      ctx.beginPath();
      ctx.moveTo(Math.max(0, headX - 6 * dpr), baseline);
      ctx.lineTo(Math.max(0, headX - 3 * dpr), baseline - spikeH);
      ctx.lineTo(headX, baseline + spikeH * 0.24);
      ctx.lineTo(Math.min(w, headX + 2 * dpr), baseline);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = signal;
    ctx.beginPath();
    ctx.arc(headX, baseline - ecgWave((headX / w) * TRACE_CYCLES) * amp, (1.6 + 1.8 * flash) * dpr, 0, Math.PI * 2);
    ctx.fill();
  }

  private must(sel: string): HTMLElement {
    const el = this.root.querySelector<HTMLElement>(sel);
    if (!el) throw new Error(`vital: missing ${sel}`);
    return el;
  }
}
