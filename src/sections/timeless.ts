/**
 * Timeless — word-stack #1 (unpinned 100svh; PLAN §2 "the tireless
 * electrical watch"; source grammar Timeless_*.png: colossal tonal stack
 * sweeping past the hero while the watch turns EDGE-ON at the section
 * center, then shows its back three-quarter as the stack hands off to the
 * info labels).
 *
 * Dual timelines (engine contract, docs/p1/engine.md §1):
 *   - DOM channel: one PAUSED fraction-domain GSAP timeline via
 *     `timelineAdapter` — the stack SWEEP (linear counter-translation, the
 *     source's differential line rates), split-char word-by-word reveals
 *     (chars xPercent −110→0 power3.out + linear opacity, motion-bible §3
 *     scrub:true grammar; word cadence = staggered window starts), label
 *     arrivals (power3.out rise) — plus imperative scrub:2 grey-line color
 *     reveals (#BCBCBC → #323232 on light ground, Disassembly precedent;
 *     live lag k≈2.2 ≈ the 2 s visual catch-up, EVAL MODE SNAPS so
 *     captures are a pure function of scroll).
 *   - WebGL channel: camera recipe timeline composed into a
 *     CameraPoseOverride each frame (the multi-section rig seam —
 *     Disassembly owns `authorTimeline`, everyone else blends overrides;
 *     section-Nocturne lane note §2). Timeless rides the Intro group's
 *     spin (motion bible §4): it takes the override slot at p .2 with a
 *     pose MATCHING Intro's held hero frame (coordinated handoff — see the
 *     INTRO_HERO block), then ONE orbit mixes hero → dead edge-on down the
 *     band-loop axis (landing exactly at p .5 — the Timeless_0.5 ring
 *     pass, type occluding the band ring) and swings on to the back
 *     three-quarter by .75 (the movement-side read of Timeless_0.75).
 *     Both anchors chase `productAttitude(clock)` so the framing holds in
 *     solo, full-page and live alike. Blend released .85–1 — zero at the
 *     exit boundary, VerticalText inherits the base pose.
 *
 * Lighting: NONE authored here — the keyframe driver holds the Timeless
 * key (instrument.json: rot 15°, envInt 1.0, exposure 1.05; LOOKBIBLE
 * §1.5 #2). Sections never invent lighting.
 *
 * State contract (truthful): needs the watch assembled, changes nothing,
 * guarantees nothing beyond what it received.
 */

import { gsap } from "gsap";
import { Euler, Vector3 } from "three";
import { getClock } from "../core/clock";
import { isEvalMode } from "../core/determinism";
import { params } from "../core/params";
import { SectionBase, timelineAdapter } from "../core/section";
import type { CameraPoseOverride, CameraRig } from "../webgl/cameraRig";
import { productAttitude } from "../webgl/stage";
import "./timeless.css";

/* ---- copy (working copy inside LOOKBIBLE §8 budgets — P4 polishes) -------- */

const EYEBROW = "02 · TIMELESS"; // ≤18 chars caps
/** Word-stack: 4 words, every line ≤34 chars (§8 word-stack budget). */
const STACK = ["THE", "TIRELESS", "ELECTRICAL", "WATCH /"] as const;
const STACK_ARIA = "THE TIRELESS ELECTRICAL WATCH";
/** Ghost section-name backdrop (source frames carry the same whisper). */
const GHOST_WORD = "TIMELESS";

const SENSING_EYEBROW = "SENSING"; // ≤18 caps
const SENSING_LINES = [
  "A contemporary interpretation of the complication:",
  "ECG, hypertension notifications, sleep apnea.",
]; // 50 + 45 chars — one thought, ≤220 (§8 body budget)
const MOVEMENT_EYEBROW = "SILICON MOVEMENT"; // 16 ≤18 caps
const MOVEMENT_LINES = [
  "Powered by the S-series SiP; never wound,",
  "12 hours in a 15-minute charge.", // Ultra 3 fast-charge claim, apple.com specs
]; // 41 + 31 chars

/* ---- beat windows (fraction grid {.05,.1,.15,.2,.25,.4,.5,.75} anchors;
 * fine beats .04–.15 per the motion-bible §2 scrub clusters) --------------- */

/** Word-by-word reveal cadence: word k opens at WORD_T0 + k·WORD_STEP. */
const WORD_T0 = 0.14;
const WORD_STEP = 0.08;
/** Label blocks arrive after the stack has swept off the label zone. */
const SENSING_IN = 0.56;
const MOVEMENT_IN = 0.6;
/** scrub:2 grey-line windows — offsets alternate (the 15/25 pattern). */
const REVEAL_WINDOWS: readonly [number, number][] = [
  [0.62, 0.72],
  [0.645, 0.755],
  [0.66, 0.76],
  [0.685, 0.795],
];

/** Light-ground grammar (LOOKBIBLE §7.3 / Disassembly precedent). */
const REVEAL_FROM = 0xbcbcbc;
const REVEAL_TO = 0x323232;
/** scrub:2 catch-up rate (≈2 s visual settle — Mechanism's constant). */
const REVEAL_LAG_K = 2.2;

/* ---- camera recipe (LOOKBIBLE §1.5 #2 + motion bible §4 Intro group:
 * "full spin — the Timeless edge-on pass") ----------------------------------
 *
 * The rig's pose-override slot is winner-takes-all and Timeless ticks after
 * Intro, so the HANDOFF is coordinated, not blended: Intro holds its hero
 * frame at blend 1 through its p .4 (= scroll 360 = OUR p .2 — the windows
 * line up by construction), and we take the slot at exactly p .2 with a
 * pose that MATCHES the hero frame (same formula, same constants), so the
 * steal is pixel-continuous. From there ONE orbit mixes hero → dead
 * edge-on (landing exactly at p .5, the Timeless_0.5 ring pass) and swings
 * on to the back three-quarter (Timeless_0.75's movement-side read).
 *
 * INTRO_HERO duplicates IntroSection's recipe values by necessity (the
 * factory seam passes only the rig; lane-note open handoff — if the Intro
 * lane retunes its hero recipe, retune this block with it):
 * theta = rotY + THETA_BASE(.2) + thetaOff(.1) · phi = 1.35 − .06 ·
 * radius 5.65 · lat .53 · sink .34.
 */

const INTRO_HERO = {
  theta: 0.3, // added to the product's clock yaw (Intro's chase formula)
  phi: 1.29,
  radius: 5.65,
  lat: 0.53,
  sink: 0.34,
} as const;

/** Edge-pass standoff, world units (watch = 2.4 tall; full piece + air). */
const CAM_STANDOFF = 5.2;
/** Post-edge swing: continues the spin (same direction as hero→edge) to
 *  the back three-quarter — the orbit never rewinds mid-beat. Sign set
 *  empirically from the hero→edge shortest path (captures verify). */
const CAM_POST_SWING = 0.85;
/** Slight lift off the loop axis — camera fractionally above dead level. */
const CAM_PHI_OFF = -0.04;
/** Frame-lateral at the edge pass: watch composes slightly right. */
const CAM_LATERAL = 0.18;

interface CameraRecipe {
  blend: number;
  /** 0 = Intro hero pose · 1 = dead edge-on down the band-loop axis. */
  spin: number;
  /** 0..1 → CAM_POST_SWING beyond the edge (back three-quarter). */
  post: number;
  radius: number;
  sink: number;
  lat: number;
}

/* ---- pure helpers --------------------------------------------------------- */

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function win(p: number, [a, b]: readonly [number, number]): number {
  return clamp01((p - a) / (b - a));
}

/** power3.inOut — the site default (grey reveals ride it, §7.3). */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Shortest-path angular lerp (radians) — the hero→edge mix never whips. */
function lerpAngle(a: number, b: number, t: number): number {
  const tau = Math.PI * 2;
  let d = (b - a) % tau;
  if (d > Math.PI) d -= tau;
  if (d < -Math.PI) d += tau;
  return a + d * t;
}

function mixHex(from: number, to: number, t: number): string {
  const fr = (from >> 16) & 255;
  const fg = (from >> 8) & 255;
  const fb = from & 255;
  const r = Math.round(fr + (((to >> 16) & 255) - fr) * t);
  const g = Math.round(fg + (((to >> 8) & 255) - fg) * t);
  const b = Math.round(fb + ((to & 255) - fb) * t);
  return `rgb(${r} ${g} ${b})`;
}

interface RevealLine {
  el: HTMLElement;
  win: readonly [number, number];
  value: number;
  target: number;
}

export class TimelessSection extends SectionBase {
  private readonly reveals: RevealLine[];

  /* Pose override plumbing (rig reads the SAME object every frame). */
  private readonly recipe: CameraRecipe = {
    blend: 0,
    spin: 0,
    post: 0,
    radius: INTRO_HERO.radius,
    sink: INTRO_HERO.sink,
    lat: INTRO_HERO.lat,
  };
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
  private readonly scratchAxis = new Vector3();

  constructor(private readonly rig: CameraRig) {
    super({
      name: "Timeless",
      // Truthful contract: reads the assembled hero, writes nothing.
      requiredEnterState: { explode: "assembled" },
      guaranteedExitState: {},
    });

    this.buildDom();

    // Solo-sandbox runways (the Intro lane's reusable pattern): an unpinned
    // 100svh track alone on the page has maxScroll 0, so localProgress can
    // never persist. One plain viewport of ground BEFORE restores the
    // enters-from-below traversal (full-page bounds [top−vh, top+height] =
    // a 200vh window) and one AFTER restores maxScroll — solo geometry then
    // equals the full page exactly. Injected in the constructor, before
    // boot's registry.measure() + engine.refresh() (engine pitfall #1).
    // Sandbox only — never on the real page.
    if (params.solo === "Timeless") {
      for (const where of ["beforebegin", "afterend"] as const) {
        const runway = document.createElement("div");
        runway.style.height = "100svh";
        runway.setAttribute("aria-hidden", "true");
        this.element.insertAdjacentElement(where, runway);
      }
    }

    this.reveals = Array.from(
      this.element.querySelectorAll<HTMLElement>(".tml__label-line"),
    ).map((el, i) => {
      const w = REVEAL_WINDOWS[i];
      if (!w) throw new Error("Timeless: reveal line without a window");
      return { el, win: w, value: 0, target: 0 };
    });
    if (this.reveals.length !== REVEAL_WINDOWS.length) {
      throw new Error("Timeless: reveal line count drifted from windows");
    }

    this.addDomAdapter(timelineAdapter(this.buildDomTimeline()));
    this.addWebglAdapter(timelineAdapter(this.buildCameraTimeline()));

    // scrub:2 catch-up lag rides the shared ticker LIVE only — eval applies
    // targets directly in tickDom (deterministic captures, Mechanism model).
    if (!isEvalMode) {
      gsap.ticker.add((_t, deltaMs) => this.tickLag(deltaMs / 1000));
    }
  }

  /* ---- DOM (self-rendered — index.html holds only the empty track) ------- */

  private buildDom(): void {
    const stackLines = STACK.map(
      (word, i) => `
        <span class="tml__line tml__line--${i}" aria-hidden="true">${splitChars(word)}</span>`,
    ).join("");
    this.element.innerHTML = `
      <div class="tml">
        <p class="tml__eyebrow">${EYEBROW}</p>
        <div class="tml__sweep">
          <p class="tml__ghostword" aria-hidden="true">${GHOST_WORD}</p>
          <h2 class="tml__stack" aria-label="${STACK_ARIA}">${stackLines}
          </h2>
        </div>
        <div class="tml__label tml__label--sensing">
          <p class="tml__label-eyebrow">${SENSING_EYEBROW}</p>
          <p class="tml__label-line">${SENSING_LINES[0]}</p>
          <p class="tml__label-line">${SENSING_LINES[1]}</p>
        </div>
        <div class="tml__label tml__label--movement">
          <p class="tml__label-eyebrow">${MOVEMENT_EYEBROW}</p>
          <p class="tml__label-line">${MOVEMENT_LINES[0]}</p>
          <p class="tml__label-line">${MOVEMENT_LINES[1]}</p>
        </div>
      </div>`;
  }

  /* ---- DOM scrub timeline (fraction domain 0..1, padded to 1) ------------ */

  private buildDomTimeline(): gsap.core.Timeline {
    const el = this.element;
    const sweep = el.querySelector<HTMLElement>(".tml__sweep");
    const ghost = el.querySelector<HTMLElement>(".tml__ghostword");
    const eyebrow = el.querySelector<HTMLElement>(".tml__eyebrow");
    const lines = Array.from(el.querySelectorAll<HTMLElement>(".tml__line"));
    const sensing = el.querySelector<HTMLElement>(".tml__label--sensing");
    const movement = el.querySelector<HTMLElement>(".tml__label--movement");
    if (!sweep || !ghost || !eyebrow || !sensing || !movement) {
      throw new Error("Timeless: markup incomplete");
    }

    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });

    // The sweep: the whole stack counter-translates linearly across the
    // window (net travel ≈ one viewport — the source's slower-than-scroll
    // line rates), each line adding a small differential for depth.
    tl.fromTo(sweep, { yPercent: 22 }, { yPercent: -22, duration: 1 }, 0);
    lines.forEach((line, i) => {
      tl.fromTo(line, { y: i * 30 }, { y: i * -30, duration: 1 }, 0);
    });

    // Ghost backdrop breathes in early (tone layer, §4 hierarchy).
    tl.fromTo(ghost, { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.04);

    // Eyebrow: arrival power3.out, departure power2.in (motion law 2).
    tl.fromTo(eyebrow, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.06);
    tl.fromTo(eyebrow, { y: 12 }, { y: 0, duration: 0.06, ease: "power3.out" }, 0.06);
    tl.to(eyebrow, { opacity: 0, duration: 0.06 }, 0.55);
    tl.to(eyebrow, { y: -14, duration: 0.06, ease: "power2.in" }, 0.55);

    // Word-by-word split-char reveals (scrub:true grammar §3): chars slide
    // xPercent −110→0 power3.out; opacity linear over the first half.
    lines.forEach((line, k) => {
      const chars = line.querySelectorAll<HTMLElement>(".tml__char");
      const t0 = WORD_T0 + k * WORD_STEP;
      tl.fromTo(
        chars,
        { xPercent: -110 },
        { xPercent: 0, duration: 0.09, ease: "power3.out", stagger: 0.004 },
        t0,
      );
      tl.fromTo(
        chars,
        { opacity: 0 },
        { opacity: 1, duration: 0.045, stagger: 0.004 },
        t0,
      );
    });

    // Info labels: arrive once the stack has swept clear of their zone
    // (the Timeless_0.75 read — labels own the late beat).
    for (const [block, at] of [
      [sensing, SENSING_IN],
      [movement, MOVEMENT_IN],
    ] as const) {
      tl.fromTo(block, { opacity: 0 }, { opacity: 1, duration: 0.06 }, at);
      tl.fromTo(block, { y: 26 }, { y: 0, duration: 0.07, ease: "power3.out" }, at);
    }

    tl.call(() => {}, [], 1); // pad to exactly 1 (motion-bible law 4)
    return tl;
  }

  override tickDom(progress: number): void {
    super.tickDom(progress);
    // Grey-line targets from progress windows; eval applies instantly.
    for (const line of this.reveals) {
      line.target = win(progress, line.win);
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
    // p .2: TAKEOVER — blend snaps 1 while spin 0 renders the exact Intro
    // hero pose (pixel-continuous steal; Intro holds blend 1 to this point).
    tl.set(r, { blend: 1 }, 0.2);
    // .25–.5: THE move — hero → dead edge-on down the band-loop axis; the
    // small dolly/aim settles ride along (law 7 pairing class).
    tl.to(
      r,
      { spin: 1, radius: CAM_STANDOFF, sink: 0, lat: CAM_LATERAL, duration: 0.25 },
      0.25,
    );
    // .5–.75: the spin carries on past the edge to the back three-quarter.
    tl.to(r, { post: 1, duration: 0.25 }, 0.5);
    // .85–1: hand the camera back to the base pose for VerticalText.
    tl.to(r, { blend: 0, duration: 0.15 }, 0.85);
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

    // Both anchors chase the product's clock-derived attitude, so the
    // framing holds live == eval == solo: the HERO anchor is Intro's
    // formula verbatim (yaw chase), the EDGE anchor looks down the
    // band-loop axis (case-local +x, the crown line) in world space.
    const att = productAttitude(getClock());
    this.scratchEuler.set(att.rotX, att.rotY, 0, "XYZ");
    const axis = this.scratchAxis.copy(cs.xAxis).applyEuler(this.scratchEuler);
    const thetaAxis = Math.atan2(axis.x, axis.z);
    const phiAxis = Math.acos(Math.min(1, Math.max(-1, axis.y)));
    const thetaHero = att.rotY + INTRO_HERO.theta;

    const o = this.poseOverride;
    o.theta = lerpAngle(thetaHero, thetaAxis, r.spin) + r.post * CAM_POST_SWING;
    o.phi = Math.min(
      Math.PI - 0.15,
      Math.max(0.15, lerp(INTRO_HERO.phi, phiAxis + CAM_PHI_OFF, r.spin)),
    );
    o.radius = r.radius;
    // Aim left of the case → the watch composes right; sink keeps the hero
    // standing on its shadow until the orbit lifts away (Intro convention).
    o.targetX = -Math.cos(o.theta) * r.lat;
    o.targetZ = Math.sin(o.theta) * r.lat;
    o.targetY = r.sink;
    o.blend = r.blend;
    this.overrideActive = true;
    this.rig.setPoseOverride(this.poseOverride);
  }

  /* ---- lifecycle ---------------------------------------------------------- */

  override onEnterCenter(): void {
    this.element.classList.add("is-center");
  }

  override onLeaveCenter(): void {
    this.element.classList.remove("is-center");
  }

  /** Belt-and-braces: never leave a stale pose override, either direction. */
  override onLeave(): void {
    if (this.overrideActive) {
      this.overrideActive = false;
      this.rig.setPoseOverride(null);
    }
  }
}

/* ---- markup helpers -------------------------------------------------------- */

function splitChars(word: string): string {
  return Array.from(word)
    .map((c) => `<span class="tml__char">${c === " " ? "&nbsp;" : c}</span>`)
    .join("");
}
