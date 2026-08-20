/**
 * Mechanism — "Electrical Heart" (pinned 400svh, the dark beat).
 *
 * Source grammar translated (Mechanism_* reference frames + motion bible
 * "Particles group"): dark stage (keyframe driver: bgStage #101216, env rot
 * 110 — LOOKBIBLE §1.5 #5, this section never invents lighting), the
 * movement shown from its working side — here the Ultra 3 BACK-CRYSTAL
 * macro (LOOKBIBLE §1.6: camera inside the band loop; outside it shoots
 * strap) — monumental split-char title left, stats rail beneath, a trace
 * drawn by scroll (their particle trails → our ECG, biosignal red), and the
 * giant two-digit seconds readout bottom-right, geared to the dial's second
 * hand (PLAN §2 small signature; motion bible §5: the readout binds to the
 * dial gear, never UPDATE_ROTATIONS).
 *
 * Timelines (motion bible law 4 — domains declared):
 *   - DOM: scrub-fraction domain, PAUSED GSAP timeline padded to 1
 *     (scrub:true grammar — char slides x:-110%→0 power3.out + linear
 *     opacity, §3) + imperative scrub work in tickDom: ECG dash-draw linear
 *     over the FULL window (the drawing-with-scroll signature) and grey-line
 *     color reveals in the scrub:2 grammar (#BCBCBC→#FFFFFF on dark, 2 s
 *     catch-up lag — the ONLY sanctioned second smoothing, text color only;
 *     eval mode applies targets directly so captures stay deterministic,
 *     the dial-gear dt≤0 snap precedent).
 *   - WebGL: scrub-fraction domain, PAUSED GSAP timeline padded to 1
 *     animating a private camera recipe, composed into a CameraPoseOverride
 *     each frame: the back-shot azimuth CHASES the product's clock-derived
 *     attitude (stage.productAttitude — live == eval since the motion-law
 *     parity fix), so the framing holds in solo, full-page and live alike.
 *     Beats on the fraction grid: blend-in .0–.15 (orbit to the back, the
 *     one big move) · macro dolly .15–.55 · light-drift .55–.75 · pull-back
 *     .75–.9 · blend-out .9–1 (hand back to the base rig pose). Parallax is
 *     gated OFF while the macro owns the frame (law 7).
 *
 * State contract (truthful): requires the watch assembled (a back shot of
 * an exploded case is nonsense); guarantees nothing changed — the pose
 * override blends fully out before exit and no state axis is written.
 */

import { gsap } from "gsap";
import { Euler, Vector3 } from "three";
import { getClock } from "../core/clock";
import { readStateExtension } from "../core/debug";
import { isEvalMode } from "../core/determinism";
import { SectionBase, timelineAdapter } from "../core/section";
import { productAttitude } from "../webgl/stage";
import type { CameraPoseOverride, CameraRig } from "../webgl/cameraRig";
import "./mechanism.css";

/* ---- copy (working copy per LOOKBIBLE §8 budgets — P4 polishes wording) --- */

const EYEBROW = "05 · MECHANISM"; // ≤18 chars caps
const TITLE_GHOST = "ELECTRICAL"; // ≤18 chars/line at tier-2 display
const TITLE_SOLID = "HEART";
const LABEL_SAMPLING = "SAMPLING";
const VALUE_SAMPLING = "continuous · 1 Hz";
const BODY =
  "No balance wheel to coax. A silicon heart, regulated by the one it measures."; // 77 ≤ 220
const LABEL_CASE = "CASE";
const VALUE_CASE = "49 mm";

/* ---- ECG geometry (authored constants — deterministic by construction) ----
 * 1600×900 design space, preserveAspectRatio slice. The main trace runs the
 * lower third with PQRST complexes flanking the watch zone (center-right);
 * two grey echo strands swirl behind, the source's ribbon read. */

const ECG_MAIN =
  "M -40 680" +
  " C 60 672, 110 676, 150 678" +
  " l 18 -26 l 16 52 l 14 -30" +
  " C 250 670, 320 656, 390 660" +
  " l 22 -10 l 14 -88 l 16 128 l 14 -44 l 20 14" +
  " C 560 672, 640 700, 720 706" +
  " l 20 -12 l 16 -140 l 18 196 l 16 -58 l 22 14" +
  " C 900 712, 1000 728, 1090 724" +
  " l 18 -8 l 14 -70 l 16 106 l 14 -36 l 18 8" +
  " C 1310 722, 1380 700, 1430 678" +
  " l 16 -22 l 14 -104 l 18 150 l 14 -40 l 20 10" +
  " C 1560 676, 1620 670, 1680 666";

const ECG_ECHO_A =
  "M -60 260 C 300 140, 620 120, 900 220 C 1180 320, 1360 300, 1700 170";

const ECG_ECHO_B =
  "M -60 760 C 260 840, 520 810, 820 730 C 1120 650, 1420 700, 1700 790";

/* W1 tune 3: added strand pass — ORIGINATES top-right so the dash-draw puts
 * structure across the sensor-dome black on the right half from early in
 * the window (the left-origin strands only reach it near the end). */
const ECG_ECHO_C =
  "M 1680 150 C 1460 250, 1290 420, 1255 590 C 1230 740, 1330 840, 1560 885";

/* ---- grey-line reveal windows (scrub-fraction domain, §7.3 colors) -------- */

interface RevealLine {
  el: HTMLElement;
  /** progress window [in, out] — per-line offsets alternate, §3 scrub:2 */
  win: [number, number];
  /** lagged color progress 0..1 (live); target applied directly in eval */
  value: number;
  target: number;
}

const REVEAL_FROM = 0xbcbcbc; // motion-bible dark-ground grey
const REVEAL_TO = 0xffffff;

/** scrub:2 catch-up rate (≈2 s to visually settle — 86% at 1 s, 98% at 2 s) */
const REVEAL_LAG_K = 2.2;

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

/* ---- camera recipe -------------------------------------------------------- */

interface CameraRecipe {
  blend: number;
  /**
   * Camera standoff from the case-back center, world units (watch = 2.4
   * tall). MUST stay inside the band-loop cavity (≲1.3) — outside it the
   * strap wall blocks the case (LOOKBIBLE §1.6: "outside it shoots strap").
   */
  standoff: number;
  /** azimuth offset off the dead-on back normal (3/4 → near-frontal drift) */
  thetaOff: number;
  /** polar offset — negative lifts the camera off the −35° back normal */
  phiOff: number;
  /** frame-lateral shift: >0 pushes the watch right of center (title left) */
  lat: number;
  /** extra aim height over the case-back center, world units */
  aimY: number;
  parallaxScale: number;
}

/** Case-back center, case-local: screen center pushed through the case. */
const BACK_DEPTH = 0.35;

export class MechanismSection extends SectionBase {
  // Empirical cavity law (this lane, measured): the band-loop inner wall
  // sits ~1.15 world units from the case-back center along the back normal —
  // every PARKED standoff must stay ≤ ~1.08 or the strap swallows the
  // camera. Entry routes through the crown-side loop opening (thetaOff ≈
  // 1.15 rad) instead of diving through the strap wall.
  private readonly recipe: CameraRecipe = {
    blend: 0,
    standoff: 1.05,
    thetaOff: 1.15,
    phiOff: -0.1,
    lat: 0.3,
    aimY: 0.05,
    parallaxScale: 1,
  };
  private readonly override: CameraPoseOverride = {
    theta: 0,
    phi: 1.5,
    radius: 4.6,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    fov: 35,
    parallaxScale: 1,
    blend: 0,
  };
  private overrideActive = false;

  private readonly ecgSvg: SVGSVGElement;
  private readonly ecgPaths: { el: SVGPathElement; lead: number }[];
  private readonly secDigits: HTMLElement;
  private readonly secEl: HTMLElement;
  private readonly reveals: RevealLine[];
  private secAlphaValue = 0;
  private secAlphaTarget = 0;
  private lastSecText = "";
  private lastSecAlpha = -1;
  private lastEcgOffset = new Map<SVGPathElement, string>();
  private inView = false;

  // scratch (no per-frame allocs)
  private readonly scratchEuler = new Euler(0, 0, 0, "XYZ");
  private readonly scratchBack = new Vector3();
  private readonly scratchAim = new Vector3();

  constructor(private readonly rig: CameraRig) {
    super({
      name: "Mechanism",
      requiredEnterState: { explode: "assembled" },
      guaranteedExitState: {},
      // longpress zoom table (motion bible law 8): default 1.35 — Mechanism
      // is neither the Disassembly macro (1.6) nor DOM-only (1).
    });

    const pin = this.element.querySelector<HTMLElement>(".pin");
    if (!pin) throw new Error("Mechanism: track has no .pin");
    pin.className = "pin mech";
    // the dark beat is a longpress beat in the source (rotations accelerate);
    // fixed cursor vocabulary (LOOKBIBLE §8)
    pin.dataset["cursorText"] = "holdToExplore";
    pin.innerHTML = buildMarkup();

    const q = <T extends Element>(sel: string): T => {
      const el = pin.querySelector<T>(sel);
      if (!el) throw new Error(`Mechanism: missing ${sel}`);
      return el;
    };

    this.ecgSvg = q<SVGSVGElement>(".mech__ecg");
    this.ecgPaths = [
      // echoes lead the pen slightly, the layered-ribbon read
      { el: q<SVGPathElement>(".mech__ecg-echo--a"), lead: 1.18 },
      { el: q<SVGPathElement>(".mech__ecg-echo--b"), lead: 1.1 },
      { el: q<SVGPathElement>(".mech__ecg-echo--c"), lead: 1.25 },
      { el: q<SVGPathElement>(".mech__ecg-main"), lead: 1 },
    ];
    this.secEl = q<HTMLElement>(".mech__sec");
    this.secDigits = q<HTMLElement>(".mech__sec-digits");

    this.reveals = [
      { el: q<HTMLElement>(".mech__value--sampling"), win: [0.26, 0.4], value: 0, target: 0 },
      { el: q<HTMLElement>(".mech__body"), win: [0.32, 0.48], value: 0, target: 0 },
      { el: q<HTMLElement>(".mech__value--case"), win: [0.4, 0.52], value: 0, target: 0 },
    ];

    this.addDomAdapter(timelineAdapter(this.buildDomTimeline(pin)));
    this.addWebglAdapter(timelineAdapter(this.buildCameraTimeline()));

    // scrub:2 catch-up lag lives on the shared ticker (live only — eval
    // applies targets directly in tickDom so settleSync is already final)
    if (!isEvalMode) {
      gsap.ticker.add((_t, deltaMs) => this.tickLag(deltaMs / 1000));
    }
  }

  /* ---- DOM channel -------------------------------------------------------- */

  private buildDomTimeline(pin: HTMLElement): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true });
    const line1 = Array.from(pin.querySelectorAll<HTMLElement>(".mech__line--ghost .mech__char"));
    const line2 = Array.from(pin.querySelectorAll<HTMLElement>(".mech__line--solid .mech__char"));
    const eyebrow = pin.querySelector<HTMLElement>(".mech__eyebrow");
    const copy = pin.querySelector<HTMLElement>(".mech__copy");
    const rail = pin.querySelector<HTMLElement>(".mech__rail");

    // W1 tune 1 — the DOM channel is GATED: copy enters .12–.18, after the
    // blend-in camera sweep (.0–.15) has landed, and departs power2.in @.85
    // (done by ≈.89) before the blend-out hands the frame back.
    // scrub:true transform grammar (§3): char x-slides power3.out, opacity
    // linear over the first half of each slide.
    tl.fromTo(
      line1,
      { xPercent: -110 },
      { xPercent: 0, duration: 0.1, ease: "power3.out", stagger: 0.011 },
      0.14,
    );
    tl.fromTo(
      line1,
      { opacity: 0 },
      { opacity: 1, duration: 0.05, ease: "none", stagger: 0.011 },
      0.14,
    );
    tl.fromTo(
      line2,
      { xPercent: -110 },
      { xPercent: 0, duration: 0.1, ease: "power3.out", stagger: 0.018 },
      0.18,
    );
    tl.fromTo(
      line2,
      { opacity: 0 },
      { opacity: 1, duration: 0.05, ease: "none", stagger: 0.018 },
      0.18,
    );
    if (eyebrow) {
      tl.fromTo(
        eyebrow,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.06, ease: "power3.out" },
        0.12,
      );
    }
    // stats rail rides the same gate (its color reveals still open @.26)
    if (rail) {
      tl.fromTo(rail, { opacity: 0 }, { opacity: 1, duration: 0.05, ease: "none" }, 0.16);
    }
    // departure — copy block + rail leave power2.in (accelerating out, §1
    // departure grammar) inside .85–.89
    const leaving = [copy, rail].filter((el): el is HTMLElement => el !== null);
    if (leaving.length > 0) {
      tl.to(leaving, { opacity: 0, y: -40, ease: "power2.in", duration: 0.04 }, 0.85);
    }
    // trace fades up fast (source: uOpacity→1 dur .1 @0), draws all window
    tl.fromTo(this.ecgSvg, { opacity: 0 }, { opacity: 1, duration: 0.08, ease: "none" }, 0.02);
    tl.add(() => {}, 1); // pad — beat positions are window fractions
    return tl;
  }

  override tickDom(progress: number): void {
    super.tickDom(progress);

    // ECG: drawn by section progress, linear over the FULL window (the
    // source's particle-trail signature). Pure function of progress.
    for (const { el, lead } of this.ecgPaths) {
      const drawn = clamp01(progress * lead);
      const offset = ((1 - drawn) * 1000).toFixed(1);
      if (this.lastEcgOffset.get(el) !== offset) {
        this.lastEcgOffset.set(el, offset);
        el.setAttribute("stroke-dashoffset", offset);
      }
    }

    // grey-line reveals: targets from progress windows, power3.inOut per
    // the bible; eval applies instantly (deterministic captures)
    for (const line of this.reveals) {
      line.target = windowProgress(progress, line.win);
      if (isEvalMode) {
        line.value = line.target;
        this.applyReveal(line);
      }
    }
    this.secAlphaTarget = windowProgress(progress, [0.16, 0.36]);
    if (isEvalMode) {
      this.secAlphaValue = this.secAlphaTarget;
      this.applySecAlpha();
    }

    // seconds readout — geared to the dial's second hand (the ONE source of
    // displayed seconds; frozen 30 under ?eval=1). Only while on screen.
    if (this.inView) {
      const dial = readStateExtension("dial");
      if (dial) {
        const text = String(Math.floor(dial.seconds) % 60).padStart(2, "0");
        if (text !== this.lastSecText) {
          this.lastSecText = text;
          this.secDigits.textContent = text;
        }
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
    const dSec = this.secAlphaTarget - this.secAlphaValue;
    if (Math.abs(dSec) >= 0.001) {
      this.secAlphaValue += dSec * k;
      this.applySecAlpha();
    }
  }

  private applyReveal(line: RevealLine): void {
    line.el.style.color = mixHex(REVEAL_FROM, REVEAL_TO, easeInOutCubic(clamp01(line.value)));
  }

  private applySecAlpha(): void {
    // §4 tone hierarchy: the giant numeral rises ghost 30% → full porcelain
    const pct = Math.round(30 + 70 * easeInOutCubic(clamp01(this.secAlphaValue)));
    if (pct === this.lastSecAlpha) return;
    this.lastSecAlpha = pct;
    this.secEl.style.color = `color-mix(in srgb, var(--mech-light) ${pct}%, transparent)`;
  }

  /* ---- WebGL channel ------------------------------------------------------ */

  private buildCameraTimeline(): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });
    const r = this.recipe;
    // .0–.15: the one big move — sweep in past the crown, through the loop
    // opening, while the stage-dim ramp lands; parallax off for the macro
    tl.to(r, { blend: 1, parallaxScale: 0, duration: 0.15 }, 0);
    // .15–.35: the settling orbit — swing off the crown side onto the
    // engraved-ring macro (small dolly rides along, law 7 pairing)
    tl.to(r, { standoff: 0.92, thetaOff: 0.26, lat: 0.34, duration: 0.2 }, 0.15);
    // .55–.75: fine drift — the streak light crawls the engraved ring
    tl.to(r, { thetaOff: 0.08, phiOff: -0.03, duration: 0.2 }, 0.55);
    // .75–.9: ease back off the ring (closer at ~0.4× the opener, law 3)
    tl.to(r, { standoff: 1.06, thetaOff: 0.35, duration: 0.15 }, 0.75);
    // .9–1: hand the camera back to the base rig pose
    tl.to(r, { blend: 0, parallaxScale: 1, duration: 0.1 }, 0.9);
    return tl;
  }

  override tickWebgl(progress: number): void {
    super.tickWebgl(progress); // scrubs the recipe timeline

    const r = this.recipe;
    if (r.blend <= 0.0001) {
      if (this.overrideActive) {
        this.overrideActive = false;
        this.rig.setPoseOverride(null);
      }
      return;
    }
    const cs = this.rig.caseSpace;
    if (!cs) return; // GLB not adopted — placeholder keeps the base rig

    // Chase the product's clock-derived attitude (live == eval, stage.ts
    // parity fix): the case-back normal in world space is the camera axis,
    // and the aim point is the case-back CENTER rotated with the product —
    // the camera rides inside the band-loop cavity with the watch.
    const att = productAttitude(getClock());
    this.scratchEuler.set(att.rotX, att.rotY, 0, "XYZ");
    const back = this.scratchBack.copy(cs.zAxis).multiplyScalar(-1).applyEuler(this.scratchEuler);
    const aim = this.scratchAim
      .copy(cs.origin)
      .addScaledVector(cs.zAxis, -BACK_DEPTH)
      .applyEuler(this.scratchEuler);
    const thetaB = Math.atan2(back.x, back.z);
    const phiB = Math.acos(Math.min(1, Math.max(-1, back.y)));

    const o = this.override;
    o.theta = thetaB + r.thetaOff;
    o.phi = Math.min(Math.PI - 0.15, Math.max(0.15, phiB + r.phiOff));
    o.radius = r.standoff;
    // frame-lateral: aim left of the case so the watch composes right
    o.targetX = aim.x - Math.cos(o.theta) * r.lat;
    o.targetZ = aim.z + Math.sin(o.theta) * r.lat;
    o.targetY = aim.y + r.aimY;
    o.fov = 35; // LOOKBIBLE §1.6 — 35mm; crop rides the standoff
    o.parallaxScale = r.parallaxScale;
    o.blend = r.blend;
    this.overrideActive = true;
    this.rig.setPoseOverride(o);
  }

  /* ---- lifecycle ---------------------------------------------------------- */

  override onEnter(): void {
    this.inView = true;
  }

  override onLeave(): void {
    this.inView = false;
    if (this.overrideActive) {
      this.overrideActive = false;
      this.rig.setPoseOverride(null);
    }
  }
}

/* ---- markup --------------------------------------------------------------- */

function splitChars(word: string): string {
  return Array.from(word)
    .map((c) => `<span class="mech__char">${c}</span>`)
    .join("");
}

function buildMarkup(): string {
  return `
    <svg class="mech__ecg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path class="mech__ecg-echo mech__ecg-echo--a" d="${ECG_ECHO_A}"
        pathLength="1000" stroke-dasharray="1000" stroke-dashoffset="1000" />
      <path class="mech__ecg-echo mech__ecg-echo--b" d="${ECG_ECHO_B}"
        pathLength="1000" stroke-dasharray="1000" stroke-dashoffset="1000" />
      <path class="mech__ecg-echo mech__ecg-echo--c" d="${ECG_ECHO_C}"
        pathLength="1000" stroke-dasharray="1000" stroke-dashoffset="1000" />
      <path class="mech__ecg-main" d="${ECG_MAIN}"
        pathLength="1000" stroke-dasharray="1000" stroke-dashoffset="1000" />
    </svg>
    <div class="mech__scrim" aria-hidden="true"></div>
    <div class="mech__copy">
      <p class="mech__eyebrow">${EYEBROW}</p>
      <h2 class="mech__title">
        <span class="mech__line mech__line--ghost" aria-label="${TITLE_GHOST}">${splitChars(TITLE_GHOST)}</span>
        <span class="mech__line mech__line--solid" aria-label="${TITLE_SOLID}">${splitChars(TITLE_SOLID)}</span>
      </h2>
    </div>
    <div class="mech__rail">
      <svg class="mech__pulse" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="13" fill="none" stroke="#FF2D55" stroke-width="2.5" />
        <circle cx="16" cy="16" r="4" fill="#E8EAED" />
      </svg>
      <p class="mech__label">${LABEL_SAMPLING}</p>
      <p class="mech__value mech__value--sampling tnum">${VALUE_SAMPLING}</p>
      <p class="mech__body">${BODY}</p>
      <p class="mech__label">${LABEL_CASE}</p>
      <p class="mech__value mech__value--case tnum">${VALUE_CASE}</p>
    </div>
    <p class="mech__sec"><span class="mech__sec-digits tnum">30</span><span class="mech__sec-prime">′</span></p>
  `;
}
