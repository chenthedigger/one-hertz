/**
 * Parts — "CALIBRE 1HZ" sensing table (pinned 200svh, light beat).
 *
 * Budget note: SECTION_VH.Parts bumped 100→200 by this lane — the
 * motion-bible §8 ⚠ case (source measures 161vh, content-sized) with the
 * bible-sanctioned fix applied at the single constant: at 100svh the
 * unpinned track equals the viewport, so `?solo=Parts` has zero scrub
 * runway (degenerate bounds) and no reveal grammar can exist.
 *
 * Source grammar translated (Parts_* reference frames): colossal ghost/solid
 * title stack top-left (their MODEL / 146GR), a full-width instrument table
 * whose rows ink in as the scroll passes (plus glyph · name · index ·
 * category · value), and the colorway picker card top-right (the source's
 * dual-placement law: picker lives in the parts table AND the outro; SWAP
 * wiring is P3's — this section ships the truthful DOM slot).
 *
 * PLAN §2 signature inversion: the source's table sums COMPONENT WEIGHTS to
 * its 146GR title; ours lists the ten SENSING INSTRUMENTS with Hz / g-force
 * / precision values, and the summary line lands the joke the thesis earns:
 * "MODEL 1HZ · total weight: immaterial". Copy sits inside LOOKBIBLE §8
 * budgets (table row label ≤16 · value ≤12 mono; the CALIBRE table is
 * always Geist Mono + tnum, §4 data voice).
 *
 * Timelines (motion bible law 4 — domains declared):
 *   - DOM: scrub-fraction domain, PAUSED GSAP timeline padded to 1.
 *     scrub:true transform grammar (§3): title split-chars x:-110%→0
 *     power3.out + linear opacity; rows rise y→0 power3.out (the image-grid
 *     y:300 grammar at table scale) with their hairline rules drawing
 *     scaleX 0→1 (the --bar-scale reveal). scrub:2 grammar: per-row grey
 *     reveals #BCBCBC→#323232 (LIGHT-ground law pair, §7.3; Intro/Movement
 *     precedent) in staggered windows on the alternating 15/25 half-width
 *     pattern, with the live-only 2 s catch-up lag (eval applies targets
 *     directly — deterministic captures, the Mechanism precedent).
 *   - WebGL: pose override on the shared rig (Disassembly owns
 *     `authorTimeline`; overrides are everyone else's seam). LOOKBIBLE §1.6
 *     face-on beauty plate (render-03 recipe: straight down the 35° dial
 *     normal) chasing `productAttitude(clock)` so solo == full page; the
 *     watch composes frame-RIGHT beside the picker card — the live product
 *     standing where the source parks a static photo. Blend rides a
 *     plateau (in by .22, out .82→.97), zero at both boundaries. One move
 *     in, one out (law 7). Lighting comes from the keyframe driver (rot
 *     350 / envInt 1.0 — LOOKBIBLE §1.5 #14); this section invents none.
 *
 * DOM-led section ⇒ longpress zoomMultiplier 1 (motion bible law 8).
 *
 * State contract (truthful): requires the assembled watch (a calibre table
 * over an exploded case is nonsense); guarantees nothing changed — the
 * pose override blends out and releases, no state axis is written.
 */

import { gsap } from "gsap";
import { Euler, Vector3 } from "three";
import { getClock } from "../core/clock";
import { isEvalMode } from "../core/determinism";
import { SectionBase, timelineAdapter } from "../core/section";
import { productAttitude } from "../webgl/stage";
import type { CameraPoseOverride, CameraRig } from "../webgl/cameraRig";
import "./parts.css";

/* ---- copy (LOOKBIBLE §8 budgets — P4 polishes wording, not structure) ----- */

const EYEBROW = "14 · CALIBRE"; // ≤18 chars caps
const TITLE_GHOST = "CALIBRE"; // ghost tone layer (§4: 30–32%)
const TITLE_SOLID = "1HZ";
const LEAD = "Ten instruments. One second."; // ≤48 chars

/** Row: [label ≤16, index, sensing domain, value ≤12 mono] — brief order. */
const ROWS: ReadonlyArray<readonly [string, string, string, string]> = [
  ["HEART SENSOR", "01", "OPTICAL", "1 Hz · cont"],
  ["ECG ELECTRODES", "02", "ELECTRICAL", "512 Hz"],
  ["WRIST TEMP", "03", "THERMAL", "±0.1 °C"],
  ["ACCELEROMETER", "04", "INERTIAL", "256 g"],
  ["GYROSCOPE", "05", "INERTIAL", "2000 °/s"],
  ["ALTIMETER", "06", "BAROMETRIC", "±1 m"],
  ["DEPTH GAUGE", "07", "HYDROSTATIC", "40 m"],
  ["PRECISION GPS", "08", "SATELLITE", "L1 + L5"],
  ["COMPASS", "09", "MAGNETIC", "±2°"],
  ["MICROPHONE", "10", "ACOUSTIC", "0–130 dB"],
];

const SUMMARY_MODEL = "MODEL 1HZ";
const SUMMARY_LABEL = "TOTAL WEIGHT";
const SUMMARY_VALUE = "immaterial"; // ≤12 — the inversion's punchline

/** Colorway picker slot copy (P3 SWAP wiring; truthful current state). */
const PICKER_EYEBROW = "COLORWAY";
const PICKER_NAME = "Natural Titanium";
const PICKER_SUB = "Ocean band";

/* ---- grey-line reveals (scrub:2 grammar — LIGHT-ground colors, §7.3) ------ */

const REVEAL_FROM = 0xbcbcbc;
const REVEAL_TO = 0x323232;
/** scrub:2 catch-up rate (≈2 s visual settle — the Mechanism constant). */
const REVEAL_LAG_K = 2.2;

interface RevealLine {
  el: HTMLElement;
  win: [number, number];
  value: number;
  target: number;
}

function mixHex(from: number, to: number, t: number): string {
  const f = { r: (from >> 16) & 255, g: (from >> 8) & 255, b: from & 255 };
  const o = { r: (to >> 16) & 255, g: (to >> 8) & 255, b: to & 255 };
  const r = Math.round(f.r + (o.r - f.r) * t);
  const g = Math.round(f.g + (o.g - f.g) * t);
  const b = Math.round(f.b + (o.b - f.b) * t);
  return `rgb(${r} ${g} ${b})`;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function windowProgress(p: number, [a, b]: [number, number]): number {
  return clamp01((p - a) / (b - a));
}

/** smoothstep 0→1 (zero slope both ends — blend ramps, Nocturne precedent). */
function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/* ---- beat windows (fraction grid {.05,.1,.15,.2,.25,.4,.5,.75} anchored) --
 * Pinned 200svh track ⇒ DOM progress spans the sticky range [top,
 * top + height − vh] and hits 1 exactly at pin release (engine.md §1);
 * reveals ride the middle half, everything resolved before the release. */

/** Camera blend plateau: in .05–.22, hold, out .82–.97 (0 at boundaries). */
function plateau(p: number): number {
  const rise = smooth(clamp01((p - 0.05) / 0.17));
  const fall = 1 - smooth(clamp01((p - 0.82) / 0.15));
  return Math.min(rise, fall);
}

/** Row stagger: row i rises at ROW_T0 + i·ROW_STEP over ROW_DUR. */
const ROW_T0 = 0.22;
const ROW_STEP = 0.035;
const ROW_DUR = 0.09;
/** Grey-reveal centers trail each row's rise; half-widths alternate the
 *  source's 15/25 offset pattern (§3 scrub:2 windows). */
const REVEAL_C0 = 0.32;
const REVEAL_STEP = 0.038;
const REVEAL_HALF: readonly [number, number] = [0.06, 0.1];

/* ---- camera recipe (LOOKBIBLE §1.6 face-on beauty plate, frame-right) ----- */

/** Standoff for a card-scale product read (visible height ≈ r·0.63). */
const CAM_STANDOFF = 10.0;
/** Slight three-quarter twist off dead-on — life without breaking the
 *  "symmetric framing" read at this standoff. */
const CAM_THETA_OFF = 0.14;
/** Slightly above the dial normal (camera looks marginally down). */
const CAM_PHI_OFF = -0.06;
/** Aim LEFT of the case so the watch composes RIGHT (Mechanism sign
 *  convention), clearing the title + table's left column. */
const CAM_LATERAL = 1.9;
/** Aim below the case so the watch rides the UPPER right, above the table
 *  band (the slot where the source parks its photo card). */
const CAM_AIM_Y = -1.35;

export class PartsSection extends SectionBase {
  private readonly reveals: RevealLine[];

  private readonly poseOverride: CameraPoseOverride = {
    theta: 0,
    phi: Math.PI / 2,
    radius: CAM_STANDOFF,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    fov: 35,
    parallaxScale: 1,
    blend: 0,
  };
  private overrideActive = false;
  private readonly scratchEuler = new Euler(0, 0, 0, "XYZ");
  private readonly scratchNormal = new Vector3();
  private readonly scratchAim = new Vector3();

  constructor(private readonly rig: CameraRig) {
    super({
      name: "Parts",
      requiredEnterState: { explode: "assembled" },
      guaranteedExitState: {},
      zoomMultiplier: 1, // DOM-led section — the hold does not dolly (law 8)
    });

    const pin = this.element.querySelector<HTMLElement>(".pin");
    if (!pin) throw new Error("Parts: track has no .pin");
    pin.className = "pin prt";
    pin.innerHTML = buildMarkup();

    const q = <T extends Element>(sel: string): T => {
      const el = pin.querySelector<T>(sel);
      if (!el) throw new Error(`Parts: missing ${sel}`);
      return el;
    };

    // scrub:2 reveal targets: each row's name + value darken as one line.
    this.reveals = Array.from(
      pin.querySelectorAll<HTMLElement>(".prt__row"),
    ).map((row, i) => {
      const c = REVEAL_C0 + i * REVEAL_STEP;
      const h = REVEAL_HALF[i % 2] ?? 0.08;
      return { el: row, win: [c - h, c + h], value: 0, target: 0 };
    });
    // The summary line reveals last — after every instrument has inked in.
    this.reveals.push({
      el: q<HTMLElement>(".prt__summary"),
      win: [0.72, 0.8],
      value: 0,
      target: 0,
    });

    this.addDomAdapter(timelineAdapter(this.buildDomTimeline(pin)));

    // scrub:2 catch-up lag on the shared ticker (live only — eval applies
    // targets directly in tickDom so settleSync captures are final).
    if (!isEvalMode) {
      gsap.ticker.add((_t, deltaMs) => this.tickLag(deltaMs / 1000));
    }
  }

  /* ---- DOM channel -------------------------------------------------------- */

  private buildDomTimeline(pin: HTMLElement): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true });
    const eyebrow = pin.querySelector<HTMLElement>(".prt__eyebrow");
    const lead = pin.querySelector<HTMLElement>(".prt__lead");
    const ghostChars = Array.from(
      pin.querySelectorAll<HTMLElement>(".prt__line--ghost .prt__char"),
    );
    const solidChars = Array.from(
      pin.querySelectorAll<HTMLElement>(".prt__line--solid .prt__char"),
    );
    const picker = pin.querySelector<HTMLElement>(".prt__picker");
    const rows = Array.from(pin.querySelectorAll<HTMLElement>(".prt__row"));
    const rules = Array.from(pin.querySelectorAll<HTMLElement>(".prt__rule"));
    const summary = pin.querySelector<HTMLElement>(".prt__summary");
    const summaryRule = pin.querySelector<HTMLElement>(".prt__summary .prt__rule");

    // Title stack — split-char scrub:true grammar (§3): x-slides power3.out,
    // opacity linear over the first half of each slide.
    if (eyebrow) {
      tl.fromTo(
        eyebrow,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.06, ease: "power3.out" },
        0.06,
      );
    }
    tl.fromTo(
      ghostChars,
      { xPercent: -110 },
      { xPercent: 0, duration: 0.1, ease: "power3.out", stagger: 0.007 },
      0.08,
    );
    tl.fromTo(
      ghostChars,
      { opacity: 0 },
      { opacity: 1, duration: 0.05, ease: "none", stagger: 0.007 },
      0.08,
    );
    tl.fromTo(
      solidChars,
      { xPercent: -110 },
      { xPercent: 0, duration: 0.1, ease: "power3.out", stagger: 0.014 },
      0.12,
    );
    tl.fromTo(
      solidChars,
      { opacity: 0 },
      { opacity: 1, duration: 0.05, ease: "none", stagger: 0.014 },
      0.12,
    );
    if (lead) {
      tl.fromTo(
        lead,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.07, ease: "power3.out" },
        0.2,
      );
    }

    // Picker card — arrives from below (the image-grid rise grammar).
    if (picker) {
      tl.fromTo(
        picker,
        { opacity: 0, y: 44 },
        { opacity: 1, y: 0, duration: 0.1, ease: "power3.out" },
        0.18,
      );
    }

    // Rows — staggered rise + hairline rule draw (the --bar-scale reveal).
    rows.forEach((row, i) => {
      const t0 = ROW_T0 + i * ROW_STEP;
      tl.fromTo(
        row,
        { opacity: 0, y: 34 },
        { opacity: 1, y: 0, duration: ROW_DUR, ease: "power3.out" },
        t0,
      );
      const rule = rules[i];
      if (rule) {
        tl.fromTo(
          rule,
          { scaleX: 0 },
          { scaleX: 1, duration: ROW_DUR * 1.3, ease: "power3.out" },
          t0 + 0.01,
        );
      }
    });

    // Summary line — the punchline lands after the full roster.
    if (summary) {
      tl.fromTo(
        summary,
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.09, ease: "power3.out" },
        0.66,
      );
    }
    if (summaryRule) {
      tl.fromTo(
        summaryRule,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.12, ease: "power3.out" },
        0.67,
      );
    }

    tl.add(() => {}, 1); // pad — beat positions are window fractions
    return tl;
  }

  override tickDom(progress: number): void {
    super.tickDom(progress);

    // scrub:2 grey reveals: targets from progress windows; eval applies
    // instantly (deterministic captures), live lags on the ticker.
    for (const line of this.reveals) {
      line.target = windowProgress(progress, line.win);
      if (isEvalMode) {
        line.value = line.target;
        this.applyReveal(line);
      }
    }
  }

  /** Live-only scrub:2 catch-up (text color is the only lagged channel). */
  private tickLag(dt: number): void {
    const k = 1 - Math.exp(-dt * REVEAL_LAG_K);
    for (const line of this.reveals) {
      const delta = line.target - line.value;
      if (Math.abs(delta) < 0.001) continue;
      line.value += delta * k;
      this.applyReveal(line);
    }
  }

  private applyReveal(line: RevealLine): void {
    line.el.style.setProperty(
      "--prt-reveal",
      mixHex(REVEAL_FROM, REVEAL_TO, easeInOutCubic(clamp01(line.value))),
    );
  }

  /* ---- WebGL channel ------------------------------------------------------ */

  override tickWebgl(progress: number): void {
    super.tickWebgl(progress);

    const blend = plateau(progress);
    const cs = this.rig.caseSpace;
    if (blend <= 0.0001 || cs === null) {
      if (this.overrideActive) {
        this.overrideActive = false;
        this.rig.setPoseOverride(null);
      }
      return;
    }

    // Face-on plate chasing the clock-derived product attitude (live ==
    // eval == solo — the Mechanism/Nocturne parity pattern).
    const att = productAttitude(getClock());
    this.scratchEuler.set(att.rotX, att.rotY, 0, "XYZ");
    const n = this.scratchNormal.copy(cs.zAxis).applyEuler(this.scratchEuler);
    const aim = this.scratchAim.copy(cs.origin).applyEuler(this.scratchEuler);

    const o = this.poseOverride;
    o.theta = Math.atan2(n.x, n.z) + CAM_THETA_OFF;
    o.phi = Math.min(
      Math.PI - 0.15,
      Math.max(0.15, Math.acos(Math.min(1, Math.max(-1, n.y))) + CAM_PHI_OFF),
    );
    o.radius = CAM_STANDOFF;
    // aim left + below the case → the watch composes upper-right.
    o.targetX = aim.x - Math.cos(o.theta) * CAM_LATERAL;
    o.targetZ = aim.z + Math.sin(o.theta) * CAM_LATERAL;
    o.targetY = aim.y + CAM_AIM_Y;
    o.fov = 35;
    o.parallaxScale = 1; // not a macro — parallax stays live (law 7)
    o.blend = blend;
    this.overrideActive = true;
    this.rig.setPoseOverride(o);
  }

  /* ---- lifecycle ---------------------------------------------------------- */

  override onEnterCenter(): void {
    this.element.classList.add("is-center");
  }

  override onLeaveCenter(): void {
    this.element.classList.remove("is-center");
  }

  /** Never leak the pose override past the track, either direction. */
  override onLeave(): void {
    if (this.overrideActive) {
      this.overrideActive = false;
      this.rig.setPoseOverride(null);
    }
  }
}

/* ---- markup --------------------------------------------------------------- */

function splitChars(word: string): string {
  return Array.from(word)
    .map((c) => `<span class="prt__char">${c}</span>`)
    .join("");
}

function rowMarkup([label, index, domain, value]: readonly [
  string,
  string,
  string,
  string,
]): string {
  return `
    <li class="prt__row">
      <span class="prt__plus" aria-hidden="true">+</span>
      <span class="prt__name">${label}</span>
      <span class="prt__index tnum">${index}</span>
      <span class="prt__domain">${domain}</span>
      <span class="prt__value tnum">${value}</span>
      <span class="prt__rule" aria-hidden="true"></span>
    </li>`;
}

function buildMarkup(): string {
  return `
    <div class="prt__scrim prt__scrim--title" aria-hidden="true"></div>
    <div class="prt__scrim prt__scrim--table" aria-hidden="true"></div>
    <header class="prt__head">
      <p class="prt__eyebrow">${EYEBROW}</p>
      <h2 class="prt__title">
        <span class="prt__line prt__line--ghost" aria-label="${TITLE_GHOST}">${splitChars(TITLE_GHOST)}</span>
        <span class="prt__line prt__line--solid" aria-label="${TITLE_SOLID}">${splitChars(TITLE_SOLID)}</span>
      </h2>
      <p class="prt__lead">${LEAD}</p>
    </header>
    <aside class="prt__picker" data-colorway-slot="parts" data-cursor-text="swap">
      <span class="prt__picker-dot" aria-hidden="true"></span>
      <span class="prt__picker-copy">
        <span class="prt__picker-eyebrow">${PICKER_EYEBROW}</span>
        <span class="prt__picker-name">${PICKER_NAME}</span>
        <span class="prt__picker-sub">${PICKER_SUB}</span>
      </span>
      <svg class="prt__picker-ring" viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r="19" class="prt__picker-ring-track" />
        <circle cx="22" cy="22" r="19" class="prt__picker-ring-arc" />
        <circle cx="22" cy="22" r="7" class="prt__picker-ring-core" />
      </svg>
    </aside>
    <ul class="prt__table">
      ${ROWS.map(rowMarkup).join("")}
    </ul>
    <p class="prt__summary">
      <span class="prt__summary-model">${SUMMARY_MODEL}</span>
      <span class="prt__summary-label">${SUMMARY_LABEL}</span>
      <span class="prt__summary-value">${SUMMARY_VALUE}</span>
      <span class="prt__rule prt__rule--summary" aria-hidden="true"></span>
    </p>
  `;
}
