/**
 * Hands — the side-elevation beat (source track #9, `Hands_*.png`): the
 * source holds a centered "SLIM PROFILE" plate while the watch rides
 * edge-on under the camera. ONE HERTZ inverts the claim honestly (PLAN §2
 * semantic translation): this case is 12 mm of titanium and PROUD of it —
 * headline "PROUD / PROFILE", body copy verbatim from the brief, plus BPM
 * catalog card #2 (96 / 220 bpm, "Working rate."), the catalog motif.
 * The Action Button's orange flank is the ONLY saturated element in frame
 * (Hands_* grammar); the DOM stays ink/porcelain/greys throughout.
 *
 * Dual timelines (engine contract, docs/p1/engine.md §1 — domains declared,
 * motion-bible law 4):
 *   - DOM channel: PAUSED fraction-domain GSAP timeline via
 *     `timelineAdapter` — hairline registration marks draw in (the source's
 *     technical-plate crosshairs), split-char headline x:-110%→0 power3.out
 *     + linear opacity (scrub:true grammar §3), body/card arrivals
 *     power3.out, departures power2.in. Grey-line color reveals = the
 *     scrub:2 grammar on LIGHT-ground colors #BCBCBC→#323232 (§7.3),
 *     imperative with a 2 s catch-up lag live / instant under ?eval=1
 *     (Movement's dt-lag precedent — no second smoothing owner).
 *   - WebGL channel: PAUSED fraction-domain GSAP timeline scrubbing a
 *     private recipe composed into a CameraPoseOverride each frame. The
 *     pose CHASES the case's flank axis through `caseSpace` +
 *     `productAttitude(clock)` (Nocturne's chase pattern), so the edge-on
 *     profile holds at any page clock (live == eval == solo). Optics per
 *     LOOKBIBLE §6 #4 `side-14mm`: 105 mm telephoto ≈ fov 19. Beats on the
 *     fraction grid: blend-in .0–.12 (parallax off — macro law 7) · rise
 *     .1–.5 (the one big move: the case crests from the bottom of frame
 *     into the dead side elevation) · slide-under .5–.75 (the source's .7
 *     beat: the case slides under the camera, top edge cresting) ·
 *     ease-off .75–.9 (closer ≈0.6× the opener, law 3 shape) · blend-out
 *     .9–1 → the base rig owns both handoffs.
 *
 * Lighting is entirely the infra-gl keyframe driver's (instrument.json
 * Hands key: rot 225 · envInt 0.9 · no bgStage ⇒ porcelain ground at
 * center — both chamfer streaks live on the case edge, §1.1). This lane
 * invents no lighting. Scrims ride the live --porcelain token (§7.1).
 *
 * State contract (truthful): requires the watch assembled (an exploded
 * case has no side elevation); guarantees nothing changed — the override
 * blends fully out by p=1, no state axis is written.
 */

import { gsap } from "gsap";
import { Euler, Vector3 } from "three";
import { getClock } from "../core/clock";
import { extendState } from "../core/debug";
import { isEvalMode } from "../core/determinism";
import { SectionBase, timelineAdapter } from "../core/section";
import type { CameraPoseOverride, CameraRig } from "../webgl/cameraRig";
import { productAttitude } from "../webgl/stage";
import "./hands.css";

/* ---- copy (working copy per LOOKBIBLE §8 budgets — P4 polishes wording) --- */

const EYEBROW = "09 · PROFILE"; // ≤18 chars caps
/** Headline — the honest inversion of the source's SLIM PROFILE. */
const HEADLINE_LINES = ["PROUD", "PROFILE"]; // ≤18 chars/line
/** The honest inversion, on the REAL depth: Ultra 3 slimmed to 12 mm
 *  (apple.com tech specs, verified 2026-08 — 14.4 mm was the Ultra 2). */
const BODY_A = "Twelve millimeters of titanium, and proud of every one.";
const BODY_B = "The only color it wears is the button on its flank.";
/** BPM catalog card #2 (value + unit mono · caption ≤60 chars); eyebrow
 *  grammar unified with Curves "CATALOG 01/03" / Straps "CATALOG 03/03". */
const CARD_EYEBROW = "CATALOG 02/03";
const CARD_REST = "96";
const CARD_MAX = "220";
const CARD_CAPTION = "Working rate. The case keeps its posture."; // 41 ≤ 60

/* ---- grey-line reveals (scrub:2 grammar — LIGHT-ground colors, §7.3) ------ */

const REVEAL_FROM = 0xbcbcbc;
const REVEAL_TO = 0x323232;
/** scrub:2 catch-up rate (≈2 s visual settle — Movement/Mechanism constant). */
const REVEAL_LAG_K = 2.2;

interface RevealLine {
  el: HTMLElement;
  /** progress window [in, out] — half-widths alternate (the 15/25 pattern). */
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

/* ---- camera recipe (LOOKBIBLE §6 #4 side-14mm, translated) ---------------- */

/**
 * Which case flank faces the camera: the Ultra's Action Button (the orange)
 * sits opposite the crown, i.e. along −caseSpace.xAxis. Verified on the
 * design-gate captures; a wrong-side read flips this ONE constant.
 */
const SIDE_SIGN = -1;
/** 105 mm telephoto (vertical fov ≈ 2·atan(12/105) — the §6 #4 optics). */
const SIDE_FOV = 19;

interface CameraRecipe {
  blend: number;
  /** Dolly distance from the case, world units (watch height = 2.4). */
  standoff: number;
  /** Polar offset off the flank axis; negative lifts the camera above the
   *  side — the slide-under read (source .7: case slides UNDER the camera). */
  phiOff: number;
  /** Look-target height offset: positive aims above the case → the case
   *  composes low in frame (the source's bottom-crest framing). */
  frameY: number;
  /** Frame-lateral aim shift (screen-space, world units): positive aims
   *  frame-left of the case → the case composes toward frame-right/center
   *  during the entry crest, settling to 0 for the centered elevation. */
  lat: number;
  parallaxScale: number;
}

export class HandsSection extends SectionBase {
  private readonly recipe: CameraRecipe = {
    blend: 0,
    standoff: 5.9,
    phiOff: 0,
    frameY: 0.78,
    lat: 0.55,
    parallaxScale: 1,
  };
  private readonly override: CameraPoseOverride = {
    theta: 0,
    phi: Math.PI / 2,
    radius: 6.4,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    fov: SIDE_FOV,
    parallaxScale: 1,
    blend: 0,
  };
  private overrideActive = false;
  private readonly scratchEuler = new Euler();
  private readonly scratchSide = new Vector3();
  private readonly scratchAim = new Vector3();

  private readonly reveals: RevealLine[];

  constructor(private readonly rig: CameraRig) {
    super({
      name: "Hands",
      requiredEnterState: { explode: "assembled" },
      guaranteedExitState: {},
      // longpress zoom stays the default 1.35 (law 8 table) — the hold
      // dives onto the case flank while the override owns the frame.
    });

    const pin = this.element.querySelector<HTMLElement>(".pin");
    if (!pin) throw new Error("Hands: track has no .pin");
    pin.className = "pin hnd";
    pin.dataset["cursorText"] = "holdToExplore"; // fixed vocabulary (§8)
    pin.innerHTML = buildMarkup();

    const q = (sel: string): HTMLElement => {
      const el = pin.querySelector<HTMLElement>(sel);
      if (!el) throw new Error(`Hands: missing ${sel}`);
      return el;
    };

    // Split-char prep: headline lines become per-char spans under
    // overflow-clipped line masks (source grammar: chars slide from x<0).
    for (const line of pin.querySelectorAll<HTMLElement>(".hnd__line")) {
      const text = line.textContent ?? "";
      line.textContent = "";
      for (const ch of text) {
        const span = document.createElement("span");
        span.className = "hnd__char";
        span.textContent = ch;
        line.append(span);
      }
    }

    // Grey-line reveals: two body lines + the card caption, windows on the
    // alternating 15/25 half-width pattern (motion-bible §3).
    this.reveals = [
      { el: q(".hnd__body--a"), win: [0.18, 0.32], value: 0, target: 0 },
      { el: q(".hnd__body--b"), win: [0.23, 0.45], value: 0, target: 0 },
      { el: q(".hnd__card-caption"), win: [0.28, 0.44], value: 0, target: 0 },
    ];

    this.addDomAdapter(timelineAdapter(this.buildDomTimeline(pin)));
    this.addWebglAdapter(timelineAdapter(this.buildCameraTimeline()));

    // scrub:2 catch-up lag on the shared ticker (live only — eval applies
    // targets directly in tickDom so settleSync is already final).
    if (!isEvalMode) {
      gsap.ticker.add((_t, deltaMs) => this.tickLag(deltaMs / 1000));
    }

    extendState("hands", () => ({
      blend: Math.round(this.recipe.blend * 1e4) / 1e4,
      standoff: Math.round(this.recipe.standoff * 1e3) / 1e3,
      frameY: Math.round(this.recipe.frameY * 1e3) / 1e3,
    }));
  }

  /* ---- DOM channel -------------------------------------------------------- */

  private buildDomTimeline(pin: HTMLElement): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    const q = (sel: string): HTMLElement | null => pin.querySelector<HTMLElement>(sel);
    const regV = q(".hnd__reg-v");
    const regH = q(".hnd__reg-h");
    const regPlus = q(".hnd__reg-plus");
    const eyebrow = q(".hnd__eyebrow");
    const chars = pin.querySelectorAll<HTMLElement>(".hnd__char");
    const bodyA = q(".hnd__body--a");
    const bodyB = q(".hnd__body--b");
    const copy = q(".hnd__copy");
    const reg = q(".hnd__reg");
    const card = q(".hnd__card");
    const cardRule = q(".hnd__card-rule");

    // Registration marks draw in (the source plate's hairline crosshairs):
    // scaling bars = the --bar-scale reveal grammar, power3.out.
    if (regV) {
      tl.fromTo(
        regV,
        { scaleY: 0 },
        { scaleY: 1, duration: 0.1, ease: "power3.out" },
        0.02,
      );
    }
    if (regH) {
      tl.fromTo(
        regH,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.1, ease: "power3.out" },
        0.04,
      );
    }
    if (regPlus) tl.fromTo(regPlus, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.05);

    if (eyebrow) {
      tl.fromTo(eyebrow, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.04);
      tl.fromTo(eyebrow, { y: 12 }, { y: 0, duration: 0.06, ease: "power3.out" }, 0.04);
    }

    // Headline split-chars: x slides power3.out, opacity linear over the
    // first half of each slide (scrub:true grammar, §3).
    tl.fromTo(
      chars,
      { xPercent: -110 },
      { xPercent: 0, duration: 0.1, ease: "power3.out", stagger: 0.006 },
      0.06,
    );
    tl.fromTo(chars, { opacity: 0 }, { opacity: 1, duration: 0.05, stagger: 0.006 }, 0.06);

    // Body lines arrive from off-frame (power3.out); their COLOR is the
    // imperative reveal channel.
    if (bodyA) {
      tl.fromTo(bodyA, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.16);
      tl.fromTo(bodyA, { y: 16 }, { y: 0, duration: 0.07, ease: "power3.out" }, 0.16);
    }
    if (bodyB) {
      tl.fromTo(bodyB, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.2);
      tl.fromTo(bodyB, { y: 16 }, { y: 0, duration: 0.07, ease: "power3.out" }, 0.2);
    }

    // BPM catalog card #2 arrives; its rule draws (bar-scale grammar).
    if (card) {
      tl.fromTo(card, { opacity: 0 }, { opacity: 1, duration: 0.06 }, 0.18);
      tl.fromTo(card, { y: 26 }, { y: 0, duration: 0.08, ease: "power3.out" }, 0.18);
    }
    if (cardRule) {
      tl.fromTo(
        cardRule,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.08, ease: "power3.out" },
        0.2,
      );
    }

    // Departures accelerate away (power2.in) — resolved before the pin
    // releases so Straps opens on a clean frame.
    if (copy) {
      tl.to(copy, { opacity: 0, duration: 0.08 }, 0.84);
      tl.to(copy, { y: -30, duration: 0.08, ease: "power2.in" }, 0.84);
    }
    if (reg) tl.to(reg, { opacity: 0, duration: 0.06 }, 0.84);
    if (card) {
      tl.to(card, { opacity: 0, duration: 0.07 }, 0.86);
      tl.to(card, { y: -20, duration: 0.07, ease: "power2.in" }, 0.86);
    }

    tl.call(() => {}, [], 1); // pad to exactly 1 (motion-bible §2 grammar)
    return tl;
  }

  override tickDom(progress: number): void {
    super.tickDom(progress);
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
    line.el.style.color = mixHex(REVEAL_FROM, REVEAL_TO, easeInOutCubic(clamp01(line.value)));
  }

  /* ---- WebGL channel ------------------------------------------------------ */

  private buildCameraTimeline(): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });
    const r = this.recipe;
    // .0–.12: blend onto the flank; parallax off (telephoto macro, law 7).
    tl.to(r, { blend: 1, parallaxScale: 0, duration: 0.12 }, 0);
    // .1–.5: THE one big move — the case crests from the bottom of frame
    // into the flank elevation while the dolly closes (source 0→.5).
    tl.to(r, { frameY: 0.4, standoff: 4.9, lat: 0, duration: 0.4 }, 0.1);
    // .5–.75: slide-under (the source's .7 beat) — the camera climbs above
    // the flank, the top edge crests, the chamfer streak crawls the case.
    // phiOff capped at −.12 (gate-3 tune 1, re-swept at LIVE clock
    // ≈.57–.61 on full-page captures): at −.24 the crystal face mirrors
    // the streak formers into a blown white sheet from .5 through the
    // exit; −.12 keeps the crest read while the crystal holds a
    // controlled specular line (§7.2 legibility over drama).
    tl.to(r, { phiOff: -0.12, frameY: 0.18, standoff: 4.55, duration: 0.25 }, 0.5);
    // .75–.9: ease back off (closer runs ~0.6× the opener, law 3 shape).
    tl.to(r, { standoff: 4.85, phiOff: -0.07, duration: 0.15 }, 0.75);
    // .9–1: hand the frame back to the base rig for Straps.
    tl.to(r, { blend: 0, parallaxScale: 1, duration: 0.1 }, 0.9);
    return tl;
  }

  override tickWebgl(progress: number): void {
    super.tickWebgl(progress); // scrubs the recipe timeline

    // Pose chase: the flank direction is a pure function of {caseSpace,
    // clock scalar} — wall time banned (law 9), eval settle is a fixed
    // point (no internal lerp anywhere). Released whenever the GLB is
    // absent: the base rig keeps the hero framed, the DOM beat still owns
    // the section (degrade, never break).
    const r = this.recipe;
    const cs = this.rig.caseSpace;
    if (r.blend <= 0.0001 || cs === null) {
      if (this.overrideActive) {
        this.overrideActive = false;
        this.rig.setPoseOverride(null);
      }
      return;
    }

    const att = productAttitude(getClock());
    this.scratchEuler.set(att.rotX, att.rotY, 0, "XYZ");
    const side = this.scratchSide
      .copy(cs.xAxis)
      .multiplyScalar(SIDE_SIGN)
      .applyEuler(this.scratchEuler);
    const aim = this.scratchAim.copy(cs.origin).applyEuler(this.scratchEuler);

    const o = this.override;
    o.theta = Math.atan2(side.x, side.z);
    o.phi = Math.min(
      Math.PI - 0.15,
      Math.max(0.15, Math.acos(Math.min(1, Math.max(-1, side.y))) + r.phiOff),
    );
    o.radius = r.standoff;
    // Composition: aim on the case, lifted by frameY so the profile rides
    // the lower half of frame; `lat` shifts the aim frame-left (screen
    // space — camera looks along −side, so frame-left ∝ side × up) so the
    // entry crest composes toward center, settling on the centered plate.
    o.targetX = aim.x - side.z * r.lat;
    o.targetY = aim.y + r.frameY;
    o.targetZ = aim.z + side.x * r.lat;
    o.fov = SIDE_FOV;
    o.parallaxScale = r.parallaxScale;
    o.blend = r.blend;
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

  override onLeave(): void {
    if (this.overrideActive) {
      this.overrideActive = false;
      this.rig.setPoseOverride(null);
    }
  }
}

/* ---- markup --------------------------------------------------------------- */

function splitLines(lines: readonly string[]): string {
  return lines
    .map((line) => `<span class="hnd__line" aria-hidden="true">${line}</span>`)
    .join("");
}

function buildMarkup(): string {
  return `
    <div class="hnd__scrim hnd__scrim--copy" aria-hidden="true"></div>
    <div class="hnd__reg" aria-hidden="true">
      <span class="hnd__reg-v"></span>
      <span class="hnd__reg-h"></span>
      <span class="hnd__reg-plus">+</span>
    </div>
    <header class="hnd__copy">
      <p class="hnd__eyebrow">${EYEBROW}</p>
      <h2 class="hnd__headline" aria-label="proud profile">${splitLines(HEADLINE_LINES)}</h2>
      <p class="hnd__body hnd__body--a">${BODY_A}</p>
      <p class="hnd__body hnd__body--b">${BODY_B}</p>
    </header>
    <aside class="hnd__card">
      <span class="hnd__card-rule" aria-hidden="true"></span>
      <p class="hnd__card-eyebrow">${CARD_EYEBROW}</p>
      <p class="hnd__card-zones">tempo / max</p>
      <p class="hnd__card-value tnum">${CARD_REST}<span class="hnd__card-sep">/</span>${CARD_MAX}<span class="hnd__card-unit">bpm</span></p>
      <p class="hnd__card-caption">${CARD_CAPTION}</p>
    </aside>
  `;
}
