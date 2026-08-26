/**
 * VerticalText — the vertical rotation beat (pinned 300svh, light stage).
 *
 * Source grammar translated (Intro-group tail + VerticalText_* frames):
 * light stage, watch settling toward frontal, giant background letters
 * sliding `x:±60vw power3.in` out of frame. Ours reads it as a two-act
 * turn: act A shows the CASE (crown-side profile — satin titanium, the
 * chamfer streak light of the rot-35 keyframe crawling the flank), act B
 * shows the FACE (the §1.6 face-on beauty plate, straight down the 35°
 * dial normal). The turn between them at .4–.6 is the one big camera move
 * (motion-bible law 7) and the watch TRAVELS across the pinned viewport
 * while it rotates — right-of-center under the left copy block, left-of-
 * center under the right one. "Down to 1 Hz" in the right block is the
 * title's first plant; COMPLICATIONS is kept verbatim at display size.
 *
 * Giant vertical ghost stacks (the section's namesake): colossal letters
 * C-A-S-E stacked at the right frame edge in act A, F-A-C-E at the left
 * edge in act B — 30% ghost tone (§4 hierarchy), never over the watch at
 * low contrast (§7.5: they live at the far edge, opposite the copy). On
 * the turn the outgoing stack departs on the source's exact grammar —
 * per-letter `x:±60vw, power3.in`, alternating direction, stagger .03,
 * opacity linear — and the incoming stack arrives power3.out.
 *
 * Dual timelines (domains declared — motion-bible law 4):
 *   - DOM: scrub-fraction domain, ONE PAUSED GSAP timeline padded to 1.
 *     Split-char headline reveals `xPercent:-110→0 power3.out` + linear
 *     opacity over the first half (scrub:true grammar §3); grey-line color
 *     reveals in the scrub:2 grammar expressed as per-line STAGGERED
 *     windows driven by raw progress (motion-bible §7.10 — no private
 *     lerp; Lenis supplies the trailing feel), light-ground colors
 *     #323232 → ink (§7.3); departures power2.in.
 *   - WebGL: scrub-fraction domain, PAUSED timeline animating a private
 *     camera recipe composed into a CameraPoseOverride each frame. The
 *     pose CHASES the dial normal through `caseSpace` + the product's
 *     clock-derived attitude (`productAttitude` — live == eval == solo).
 *     Beats on the fraction grid: blend-in .0–.1 · satin drift .15–.4 ·
 *     THE turn .4–.6 (rotation paired with a ≤.2-window travel, law 7) ·
 *     settle dead-on .6–.75 · blend-out .9–1. Parallax stays ON (no
 *     macro here — the frame breathes).
 *
 * Lighting: entirely the keyframe driver's (instrument.json VerticalText
 * key: rot 35 · envInt 0.95 · porcelain ground — "light quiets under the
 * word stack"). This section invents no lighting. Scrims per §7.1:
 * gradient from the live --porcelain token behind each copy block.
 *
 * State contract (truthful): requires the watch assembled (both acts read
 * the sealed exterior); guarantees nothing changed — the pose override
 * blends fully out by p=1 and no state axis is written.
 */

import { gsap } from "gsap";
import { Euler, Vector3 } from "three";
import { getClock } from "../core/clock";
import { SectionBase, timelineAdapter } from "../core/section";
import { productAttitude } from "../webgl/stage";
import type { CameraPoseOverride, CameraRig } from "../webgl/cameraRig";
import "./verticaltext.css";

/* ---- copy (working copy inside LOOKBIBLE §8 budgets — P4 polishes) -------- */

const EYEBROW_A = "03 · EXTERIOR"; // ≤18 chars caps
const HEAD_A_GHOST = "CASE &"; // ≤18 chars/line at colossal
const HEAD_A_SOLID = "FINISHES";
// Apple's own spec vocabulary ("Titanium case, Grade 5" · "Water
// resistance 100m" — apple.com Ultra 3 tech specs, verified 2026-08).
const LINES_A = ["Grade 5 titanium, satin-brushed", "Water resistance · 100 m"]; // ≤34c

const EYEBROW_B = "03 · DISPLAY";
const HEAD_B_GHOST = "FACE &";
const HEAD_B_SOLID = "COMPLICATIONS"; // the lucky word — verbatim, 13c
const LINES_B = [
  "Wide-angle LTPO3",
  "Always-On Retina",
  "3000 nits · down to 1 Hz", // the title's first plant
];

const STACK_A = "CASE";
const STACK_B = "FACE";

/* ---- grey-line reveal colors (light ground — LOOKBIBLE §7.3 law) ---------- */

const REVEAL_FROM = "#323232";
const REVEAL_TO = "#0a0b0d"; // --ink constant (§2)

/* ---- camera recipe --------------------------------------------------------
 * Angles are offsets off the product-chased dial normal; `lat` shifts the
 * look-at target so the watch composes opposite the active copy block
 * (positive = watch left of center, Nocturne sign convention). Standoffs
 * verified on captures: 3.0 fills the frame with the case flank, 3.45
 * shows the full head dead-on. */

interface CameraRecipe {
  blend: number;
  /** azimuth off the dial normal — 1.3 rad ≈ crown-side profile, 0 = frontal */
  thetaOff: number;
  /** polar off the dial normal — negative lifts the camera slightly above */
  phiOff: number;
  /** frame-lateral: >0 composes the watch left (act B), <0 right (act A) */
  lat: number;
  standoff: number;
  aimY: number;
  parallaxScale: number;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export class VerticalTextSection extends SectionBase {
  private readonly recipe: CameraRecipe = {
    blend: 0,
    thetaOff: 1.55,
    phiOff: -0.12,
    lat: -0.28,
    standoff: 3.35,
    aimY: 0.05,
    parallaxScale: 1,
  };
  private readonly override: CameraPoseOverride = {
    theta: 0,
    phi: 1.2,
    radius: 3.2,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    fov: 35,
    parallaxScale: 1,
    blend: 0,
  };
  private overrideActive = false;

  // scratch (no per-frame allocs)
  private readonly scratchEuler = new Euler(0, 0, 0, "XYZ");
  private readonly scratchNormal = new Vector3();
  private readonly scratchAim = new Vector3();

  constructor(private readonly rig: CameraRig) {
    super({
      name: "VerticalText",
      requiredEnterState: { explode: "assembled" },
      guaranteedExitState: {},
      // longpress zoom: default 1.35 (law 8 table — not a macro, not DOM-only)
    });

    const pin = this.element.querySelector<HTMLElement>(".pin");
    if (!pin) throw new Error("VerticalText: track has no .pin");
    pin.className = "pin vt";
    pin.innerHTML = buildMarkup();

    this.addDomAdapter(timelineAdapter(this.buildDomTimeline(pin)));
    this.addWebglAdapter(timelineAdapter(this.buildCameraTimeline()));
  }

  /* ---- DOM scrub timeline (fraction domain 0..1, padded to 1) ------------ */

  private buildDomTimeline(pin: HTMLElement): gsap.core.Timeline {
    const q = <T extends Element>(sel: string): T => {
      const el = pin.querySelector<T>(sel);
      if (!el) throw new Error(`VerticalText: missing ${sel}`);
      return el;
    };
    const all = <T extends Element>(sel: string): T[] =>
      Array.from(pin.querySelectorAll<T>(sel));

    const blockA = q<HTMLElement>(".vt__block--a");
    const blockB = q<HTMLElement>(".vt__block--b");
    const scrimA = q<HTMLElement>(".vt__scrim--a");
    const scrimB = q<HTMLElement>(".vt__scrim--b");
    const eyebrowA = q<HTMLElement>(".vt__block--a .vt__eyebrow");
    const eyebrowB = q<HTMLElement>(".vt__block--b .vt__eyebrow");
    const charsA = all<HTMLElement>(".vt__block--a .vt__char");
    const charsB = all<HTMLElement>(".vt__block--b .vt__char");
    const linesA = all<HTMLElement>(".vt__block--a .vt__line");
    const linesB = all<HTMLElement>(".vt__block--b .vt__line");
    const stackA = all<HTMLElement>(".vt__stack--a .vt__stack-char");
    const stackB = all<HTMLElement>(".vt__stack--b .vt__stack-char");

    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });

    /* ---- act A in (scrub:true grammar — transforms power3.out, opacity
     * linear over the first half of each slide) --------------------------- */
    tl.to(scrimA, { opacity: 1, duration: 0.05 }, 0.02);
    // Blocks fade in as units so their grey lines (color-only reveals)
    // stay hidden until their act — elements untouched by the playhead
    // otherwise render at natural CSS state.
    tl.fromTo(blockA, { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.03);
    tl.fromTo(eyebrowA, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.04);
    tl.fromTo(eyebrowA, { y: 12 }, { y: 0, duration: 0.06, ease: "power3.out" }, 0.04);
    tl.fromTo(
      charsA,
      { xPercent: -110 },
      { xPercent: 0, duration: 0.1, ease: "power3.out", stagger: 0.008 },
      0.06,
    );
    tl.fromTo(charsA, { opacity: 0 }, { opacity: 1, duration: 0.05, stagger: 0.008 }, 0.06);
    // giant vertical stack arrives from beyond the left frame edge (the
    // column anchors the left edge both acts; the words swap on the turn)
    tl.fromTo(
      stackA,
      { x: "-60vw" },
      { x: "0vw", duration: 0.12, ease: "power3.out", stagger: 0.03 },
      0.05,
    );
    tl.fromTo(stackA, { opacity: 0 }, { opacity: 1, duration: 0.06, stagger: 0.03 }, 0.05);

    /* grey-line color reveals — scrub:2 grammar as staggered raw-progress
     * windows (§7.10); per-line offsets alternate on the 15/25 pattern */
    linesA.forEach((line, i) => {
      tl.fromTo(
        line,
        { color: REVEAL_FROM },
        { color: REVEAL_TO, duration: 0.1, ease: "power3.inOut" },
        0.2 + (i % 2 === 0 ? 0 : 0.045) + Math.floor(i / 2) * 0.09,
      );
    });

    /* ---- the turn: act A departs (departures power2.in), the outgoing
     * stack flies out on the source-verbatim ±60vw power3.in grammar ------ */
    tl.to(blockA, { opacity: 0, duration: 0.06 }, 0.42);
    tl.to(blockA, { y: -30, duration: 0.07, ease: "power2.in" }, 0.42);
    tl.to(scrimA, { opacity: 0, duration: 0.06 }, 0.42);
    stackA.forEach((ch, i) => {
      tl.to(
        ch,
        { x: i % 2 === 0 ? "60vw" : "-60vw", duration: 0.12, ease: "power3.in" },
        0.4 + i * 0.03,
      );
      tl.to(ch, { opacity: 0, duration: 0.08 }, 0.42 + i * 0.03);
    });

    /* ---- act B in --------------------------------------------------------- */
    tl.fromTo(
      stackB,
      { x: "-60vw" },
      { x: "0vw", duration: 0.12, ease: "power3.out", stagger: 0.03 },
      0.5,
    );
    tl.fromTo(stackB, { opacity: 0 }, { opacity: 1, duration: 0.06, stagger: 0.03 }, 0.5);
    /* gate-2 tune: act-B copy arrives ≈.48–.55 so the page-truth .5–.6
     * frames carry content (the .5 beat was a dead frame — copy chain
     * shifted 0.04 earlier; act A's block is gone by .48, clean overlap) */
    tl.to(scrimB, { opacity: 1, duration: 0.05 }, 0.48);
    tl.fromTo(blockB, { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.48);
    tl.fromTo(eyebrowB, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.5);
    tl.fromTo(eyebrowB, { y: 12 }, { y: 0, duration: 0.06, ease: "power3.out" }, 0.5);
    tl.fromTo(
      charsB,
      { xPercent: -110 },
      { xPercent: 0, duration: 0.1, ease: "power3.out", stagger: 0.006 },
      0.52,
    );
    tl.fromTo(charsB, { opacity: 0 }, { opacity: 1, duration: 0.05, stagger: 0.006 }, 0.52);
    linesB.forEach((line, i) => {
      tl.fromTo(
        line,
        { color: REVEAL_FROM },
        { color: REVEAL_TO, duration: 0.1, ease: "power3.inOut" },
        0.58 + (i % 2 === 0 ? 0 : 0.045) + Math.floor(i / 2) * 0.09,
      );
    });

    /* ---- act B departs before the pin releases (clean handoff into
     * Disassembly's copy — hand-offs are shared, never sequential) --------- */
    tl.to(blockB, { opacity: 0, duration: 0.06 }, 0.88);
    tl.to(blockB, { y: -30, duration: 0.07, ease: "power2.in" }, 0.88);
    tl.to(scrimB, { opacity: 0, duration: 0.06 }, 0.88);
    stackB.forEach((ch, i) => {
      tl.to(
        ch,
        { x: i % 2 === 0 ? "-60vw" : "60vw", duration: 0.1, ease: "power3.in" },
        0.86 + i * 0.025,
      );
      tl.to(ch, { opacity: 0, duration: 0.07 }, 0.87 + i * 0.025);
    });

    tl.call(() => {}, [], 1); // pad to exactly 1 (WebGL-group grammar, §2)
    return tl;
  }

  /* ---- WebGL channel ------------------------------------------------------ */

  private buildCameraTimeline(): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });
    const r = this.recipe;
    // .0–.1: blend onto the crown-side profile (the one entry move)
    tl.to(r, { blend: 1, duration: 0.1 }, 0);
    // .15–.4: satin drift — the streak light crawls the flank while the
    // left copy reveals (small rotation, the beat breathes)
    tl.to(r, { thetaOff: 1.25, duration: 0.25 }, 0.15);
    // .4–.6: THE turn — profile → near-frontal beauty plate; the watch
    // travels across the frame (rotation paired with a ≤.2-window position
    // move). Settles at thetaOff .3, NOT dead-on: exactly on the dial
    // normal the crystal mirrors the env into a glare sheet (the az-0
    // mirror law, verified live on capture — dial legibility outranks
    // symmetric drama, §7.2).
    tl.to(r, { thetaOff: 0.5, lat: 0.72, standoff: 3.5, duration: 0.2 }, 0.4);
    // .6–.75: settle slightly above the dial normal (§1.6 recipe spirit;
    // the exact-normal pose mirrors the env into the crystal)
    tl.to(r, { phiOff: -0.15, duration: 0.15 }, 0.6);
    // .9–1: hand the camera back to the base rig pose
    tl.to(r, { blend: 0, duration: 0.1 }, 0.9);
    tl.call(() => {}, [], 1);
    return tl;
  }

  override tickWebgl(progress: number): void {
    super.tickWebgl(progress); // scrubs the recipe timeline

    const r = this.recipe;
    const cs = this.rig.caseSpace;
    if (r.blend <= 0.0001 || cs === null) {
      if (this.overrideActive) {
        this.overrideActive = false;
        this.rig.setPoseOverride(null);
      }
      return;
    }

    // Chase the dial normal through the product's clock-derived attitude
    // (live == eval == solo; the framing holds at any page clock).
    const att = productAttitude(getClock());
    this.scratchEuler.set(att.rotX, att.rotY, 0, "XYZ");
    const n = this.scratchNormal.copy(cs.zAxis).applyEuler(this.scratchEuler);
    const aim = this.scratchAim.copy(cs.origin).applyEuler(this.scratchEuler);
    const thetaDial = Math.atan2(n.x, n.z);
    const phiDial = Math.acos(Math.min(1, Math.max(-1, n.y)));

    const o = this.override;
    o.theta = thetaDial + r.thetaOff;
    o.phi = Math.min(Math.PI - 0.15, Math.max(0.15, phiDial + r.phiOff));
    o.radius = r.standoff;
    // frame-lateral: aim beside the case so the watch composes opposite
    // the active copy block (lat > 0 → watch left, Nocturne convention)
    o.targetX = aim.x + Math.cos(o.theta) * r.lat;
    o.targetZ = aim.z - Math.sin(o.theta) * r.lat;
    o.targetY = aim.y + r.aimY;
    o.fov = 35;
    o.parallaxScale = r.parallaxScale;
    o.blend = clamp01(r.blend);
    this.overrideActive = true;
    this.rig.setPoseOverride(this.override);
  }

  /* ---- lifecycle ---------------------------------------------------------- */

  /** Belt-and-braces: never leave a stale pose override behind. */
  override onLeave(): void {
    if (this.overrideActive) {
      this.overrideActive = false;
      this.rig.setPoseOverride(null);
    }
  }
}

/* ---- markup ---------------------------------------------------------------- */

function splitChars(word: string, cls: string): string {
  return Array.from(word)
    .map((c) => `<span class="${cls}">${c === " " ? "&nbsp;" : c}</span>`)
    .join("");
}

function stackMarkup(word: string, variant: string): string {
  return `
    <div class="vt__stack vt__stack--${variant}" aria-hidden="true">
      ${splitChars(word, "vt__stack-char")}
    </div>`;
}

function blockMarkup(
  variant: string,
  eyebrow: string,
  ghost: string,
  solid: string,
  lines: readonly string[],
): string {
  return `
    <div class="vt__block vt__block--${variant}">
      <p class="vt__eyebrow">${eyebrow}</p>
      <h2 class="vt__head" aria-label="${ghost} ${solid}">
        <span class="vt__headline vt__headline--ghost" aria-hidden="true">${splitChars(ghost, "vt__char")}</span>
        <span class="vt__headline vt__headline--solid" aria-hidden="true">${splitChars(solid, "vt__char")}</span>
      </h2>
      <div class="vt__lines">
        ${lines.map((l) => `<p class="vt__line">${l}</p>`).join("")}
      </div>
    </div>`;
}

function buildMarkup(): string {
  // Paint order matters: scrims sit OVER the ghost stacks (they soften the
  // colossal letters behind the copy, §7.1) and UNDER the copy blocks.
  return `
    ${stackMarkup(STACK_A, "a")}
    ${stackMarkup(STACK_B, "b")}
    <div class="vt__scrim vt__scrim--a" aria-hidden="true"></div>
    <div class="vt__scrim vt__scrim--b" aria-hidden="true"></div>
    ${blockMarkup("a", EYEBROW_A, HEAD_A_GHOST, HEAD_A_SOLID, LINES_A)}
    ${blockMarkup("b", EYEBROW_B, HEAD_B_GHOST, HEAD_B_SOLID, LINES_B)}
  `;
}
