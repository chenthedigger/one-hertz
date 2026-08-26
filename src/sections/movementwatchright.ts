/**
 * MovementWatchRight — the annotated instrument plate (pinned 300svh,
 * porcelain ground, Presentation .5–.75 slot).
 *
 * Source grammar translated (MovementWatchRight_* reference frames): the
 * watch holds a face-on beauty read composed RIGHT of center; a detail
 * stack sits on the LEFT with thin hairlines reaching toward the case
 * (Refined Dial / Polished Hands / Premium Bezel in the source). Ours
 * makes the hairlines TRUE: three annotations — RETINA DIAL / LIQUID
 * GLASS / TITANIUM BEZEL — are 3D-projected DOM callouts whose dots track
 * real mesh positions (part_screen / part_crystal / part_bezel) through
 * the product's clock attitude + case space, re-projected every frame
 * (the HOVER_POSITION pattern, recon "Details" mechanic). Hovering a row
 * swaps the dial complication live — heart / depth / compass — through
 * the StateStore `dialMode` axis (main.ts forwards the token to
 * `dial.applyDialToken`; the store write and the renderer call stay one
 * owner). The dial itself answers the copy: this is the hover-swap graft,
 * wired to exactly what the dial module already supports (P3 polishes).
 *
 * Dual timelines (domains declared — motion-bible law 4):
 *   - DOM: scrub-fraction domain, ONE PAUSED GSAP timeline padded to 1.
 *     Split-char headline reveal `xPercent:-110→0 power3.out` + linear
 *     opacity (scrub:true grammar §3); annotation rows arrive power3.out
 *     staggered; departures power2.in before the pin releases. Grey-line
 *     color reveals in the scrub:2 grammar — light-ground colors
 *     #BCBCBC→#323232 (§7.3, Movement precedent) — imperative windows
 *     with a ≈2 s catch-up lag live, instant under ?eval=1.
 *   - WebGL: scrub-fraction domain, PAUSED timeline animating a private
 *     camera recipe composed into a CameraPoseOverride each frame. The
 *     pose CHASES the dial normal through caseSpace + productAttitude
 *     (live == eval == solo). Beats on the fraction grid: blend-in .0–.1 ·
 *     THE move .1–.4 (top-down three-quarter — the source's settled macro
 *     read — descends onto the lit dial plate; the ≤.2-window lateral
 *     travel composes the watch right, law 7 pairing) · annotated crawl
 *     .5–.75 (slow crown-side quarter-orbit — capture-sweep-tuned so the
 *     crystal stays OFF the streak-former mirror band at every product
 *     attitude the beat can meet, solo's full-revolution clock included;
 *     dial legibility outranks drama, §7.2) · blend-out .9–1. Settle is
 *     DELIBERATELY off the exact dial normal: dead-on, the crystal
 *     mirrors the env into a glare sheet (az-0 mirror law).
 *
 * Lighting: entirely the keyframe driver's (instrument.json
 * MovementWatchRight key: rot 200 · envInt 1.0 · no bgStage ⇒ porcelain).
 * This section invents no lighting. Scrim per §7.1: gradient from the
 * live --porcelain token behind the copy column; annotation hairlines are
 * ink-on-tokens (bloom never aids legibility, §7.6).
 *
 * State contract (truthful): requires `{explode:"assembled",
 * dialMode:"wayfinder"}` (the plate reads the sealed exterior; hover
 * swaps FROM the wayfinder base). Hover writes `dialMode` transiently;
 * the section restores `dialMode:"wayfinder"` on leave in BOTH directions
 * (guaranteed exit — Nocturne downstream enters on wayfinder). The pose
 * override blends fully out by p=1; no other axis is touched.
 */

import { gsap } from "gsap";
import { Box3, Euler, Vector3 } from "three";
import { getClock } from "../core/clock";
import { extendState } from "../core/debug";
import type { OneHertzDebugApi } from "../core/debug";
import { isEvalMode } from "../core/determinism";
import { bus, EngineEvent } from "../core/events";
import { SectionBase, timelineAdapter } from "../core/section";
import { productAttitude } from "../webgl/stage";
import type { CameraPoseOverride, CameraRig } from "../webgl/cameraRig";
import type { Stage } from "../webgl/stage";
import { getStage } from "./stageRef";
import "./movementwatchright.css";

/* ---- copy (working copy inside LOOKBIBLE §8 budgets — P4 polishes) -------- */

const EYEBROW = "08 · IN DETAIL"; // ≤18 chars caps
const HEAD_GHOST = "READ THE"; // ≤18 chars/line at display
const HEAD_SOLID = "INSTRUMENT";
const SUB_LINES = [
  "Three surfaces. One story.", // ≤34 chars
  "Hover. The dial answers.",
];

/** Annotation rows — label ≤26 chars (§8 "Details hover label"). `token`
 *  is the StateStore dialMode vocabulary (state.ts: heart|depth|compass);
 *  `part` is the GLB node the dot annotates (HOVER_POSITION payload). */
interface AnnotationSpec {
  id: "dial" | "glass" | "bezel";
  label: string;
  spec: string;
  token: string;
  part: string;
  /** Dot anchor offset in case space, units of the bezel radius (x =
   *  crown side, y = dial-12). Negative x = the label-rail side. */
  ox: number;
  oy: number;
  /** Lift along the dial normal, world units — dot floats over the glass. */
  oz: number;
}

const ANNOTATIONS: readonly AnnotationSpec[] = [
  {
    id: "dial",
    label: "RETINA DIAL",
    spec: "LTPO3 · 3000 NITS",
    token: "heart", // the thesis complication — one human hertz
    part: "part_screen",
    ox: -0.06,
    oy: 0.56,
    oz: 0.1,
  },
  {
    id: "glass",
    label: "LIQUID GLASS",
    spec: "SAPPHIRE · IOR 1.77",
    token: "depth", // the dive read lives under the glass slab
    part: "part_crystal",
    ox: -0.56,
    oy: 0.02,
    oz: 0.14,
  },
  {
    id: "bezel",
    label: "TITANIUM BEZEL",
    spec: "GRADE 5 · KNURLED",
    token: "compass", // the bezel carries the tangential scale
    part: "part_bezel",
    ox: -0.38,
    oy: -0.7,
    oz: 0.05,
  },
];

/* ---- grey-line reveals (LIGHT-ground colors — §7.3, Movement precedent) --- */

const REVEAL_FROM = 0xbcbcbc;
const REVEAL_TO = 0x323232;
/** scrub:2 catch-up rate (≈2 s visual settle — the shared lane constant). */
const REVEAL_LAG_K = 2.2;

interface RevealLine {
  el: HTMLElement;
  win: [number, number];
  value: number;
  target: number;
}

/* ---- helpers --------------------------------------------------------------- */

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function windowProgress(p: number, [a, b]: [number, number]): number {
  return clamp01((p - a) / (b - a));
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

/* ---- camera recipe --------------------------------------------------------- *
 * Angles are offsets off the product-chased dial normal (VerticalText's
 * proven chase). `lat` shifts the look-at target laterally in frame —
 * NEGATIVE composes the watch RIGHT of center (Nocturne sign convention),
 * clearing the left rail for the detail stack. Standoff 3.0 fills the
 * frame with the lit head while the full dial stays legible.             */

interface CameraRecipe {
  blend: number;
  /** azimuth off the dial normal — .95 ≈ crown-side three-quarter, 0 = frontal */
  thetaOff: number;
  /** polar off the dial normal — very negative = the top-down source read */
  phiOff: number;
  /** frame-lateral: <0 composes the watch right (labels own the left) */
  lat: number;
  standoff: number;
  aimY: number;
  parallaxScale: number;
}

/* ---- per-row runtime ------------------------------------------------------- */

interface AnnotationRow {
  spec: AnnotationSpec;
  rowEl: HTMLButtonElement;
  labelEl: HTMLElement;
  dotEl: HTMLElement;
  lineEl: SVGLineElement;
  /** Timeline-scrubbed reveal 0..1 (drives dot + hairline opacity). */
  state: { reveal: number };
  /** Last projected dot position, viewport px (HOVER_POSITION payload). */
  px: number;
  py: number;
  onScreen: boolean;
}

export class MovementWatchRightSection extends SectionBase {
  private readonly stage: Stage | null;

  private readonly recipe: CameraRecipe = {
    blend: 0,
    thetaOff: 0.95,
    phiOff: -0.52,
    lat: 0,
    standoff: 3.45,
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

  private readonly rows: AnnotationRow[];
  private readonly reveals: RevealLine[];
  private readonly pin: HTMLElement;
  private activeRow: AnnotationRow | null = null;

  /** Bezel radius in world units — resolved lazily from the loaded GLB. */
  private bezelRadius = 0;
  private anchorsReady = false;

  // scratch (no per-frame allocs)
  private readonly scratchEuler = new Euler(0, 0, 0, "XYZ");
  private readonly scratchNormal = new Vector3();
  private readonly scratchAim = new Vector3();
  private readonly scratchAnchor = new Vector3();

  constructor(private readonly rig: CameraRig) {
    super({
      name: "MovementWatchRight",
      requiredEnterState: { explode: "assembled", dialMode: "wayfinder" },
      guaranteedExitState: { dialMode: "wayfinder" },
      // longpress zoom: default 1.35 (law 8 table — a plate, not a macro)
    });

    this.stage = getStage();

    const pin = this.element.querySelector<HTMLElement>(".pin");
    if (!pin) throw new Error("MovementWatchRight: track has no .pin");
    pin.className = "pin mwr";
    pin.innerHTML = buildMarkup();
    this.pin = pin;

    const q = <T extends Element>(sel: string): T => {
      const el = pin.querySelector<T>(sel);
      if (!el) throw new Error(`MovementWatchRight: missing ${sel}`);
      return el;
    };

    // Wire rows ↔ dots ↔ hairlines (order matches ANNOTATIONS).
    this.rows = ANNOTATIONS.map((spec) => {
      const rowEl = q<HTMLButtonElement>(`.mwr__row--${spec.id}`);
      const row: AnnotationRow = {
        spec,
        rowEl,
        labelEl: q<HTMLElement>(`.mwr__row--${spec.id} .mwr__row-label`),
        dotEl: q<HTMLElement>(`.mwr__dot--${spec.id}`),
        lineEl: q<SVGLineElement>(`.mwr__line--${spec.id}`),
        state: { reveal: 0 },
        px: 0,
        py: 0,
        onScreen: false,
      };
      // Hover-swap graft (recon Details .8 s grammar — CSS transitions
      // carry the wall-clock highlight; the dial answers via the store).
      rowEl.addEventListener("pointerenter", () => this.setHover(row));
      rowEl.addEventListener("pointerleave", () => this.setHover(null));
      rowEl.addEventListener("focus", () => this.setHover(row));
      rowEl.addEventListener("blur", () => this.setHover(null));
      return row;
    });

    this.reveals = [
      { el: q<HTMLElement>(".mwr__sub--0"), win: [0.18, 0.3], value: 0, target: 0 },
      { el: q<HTMLElement>(".mwr__sub--1"), win: [0.24, 0.36], value: 0, target: 0 },
    ];

    this.addDomAdapter(timelineAdapter(this.buildDomTimeline(pin)));
    this.addWebglAdapter(timelineAdapter(this.buildCameraTimeline()));

    // scrub:2 catch-up lag lives on the shared ticker (live only — eval
    // applies targets directly in tickDom so settleSync is already final)
    if (!isEvalMode) {
      gsap.ticker.add((_t, deltaMs) => this.tickLag(deltaMs / 1000));
    }

    extendState("movementWatchRight", () => ({
      anchorsReady: this.anchorsReady,
      blend: Math.round(this.recipe.blend * 1e4) / 1e4,
      active: this.activeRow?.spec.id ?? null,
    }));
  }

  /* ---- DOM scrub timeline (fraction domain 0..1, padded to 1) ------------ */

  private buildDomTimeline(pin: HTMLElement): gsap.core.Timeline {
    const q = <T extends Element>(sel: string): T => {
      const el = pin.querySelector<T>(sel);
      if (!el) throw new Error(`MovementWatchRight: missing ${sel}`);
      return el;
    };
    const all = <T extends Element>(sel: string): T[] =>
      Array.from(pin.querySelectorAll<T>(sel));

    const scrim = q<HTMLElement>(".mwr__scrim");
    const rays = q<HTMLElement>(".mwr__rays");
    const eyebrow = q<HTMLElement>(".mwr__eyebrow");
    const chars = all<HTMLElement>(".mwr__char");
    const copy = q<HTMLElement>(".mwr__copy");
    const rowEls = this.rows.map((r) => r.rowEl);

    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });

    /* arrivals — scrub:true grammar §3 (transforms power3.out, opacity
     * linear over the first half of each slide) */
    tl.to(scrim, { opacity: 1, duration: 0.05 }, 0.02);
    tl.fromTo(rays, { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.06);
    tl.fromTo(eyebrow, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.04);
    tl.fromTo(eyebrow, { y: 12 }, { y: 0, duration: 0.06, ease: "power3.out" }, 0.04);
    tl.fromTo(
      chars,
      { xPercent: -110 },
      { xPercent: 0, duration: 0.1, ease: "power3.out", stagger: 0.006 },
      0.06,
    );
    tl.fromTo(chars, { opacity: 0 }, { opacity: 1, duration: 0.05, stagger: 0.006 }, 0.06);

    /* annotation rows arrive power3.out, staggered on the grid; each row's
     * reveal proxy rides the same window (dots + hairlines fade with it) */
    this.rows.forEach((row, i) => {
      const at = 0.26 + i * 0.07;
      tl.fromTo(
        row.rowEl,
        { opacity: 0, x: -26 },
        { opacity: 1, x: 0, duration: 0.09, ease: "power3.out" },
        at,
      );
      tl.to(row.state, { reveal: 1, duration: 0.08 }, at + 0.02);
    });

    /* departures before the pin releases — power2.in (law 2); the DOM
     * handoff into Hands overlaps the shared viewport */
    tl.to(copy, { opacity: 0, y: -26, duration: 0.07, ease: "power2.in" }, 0.88);
    tl.to(scrim, { opacity: 0, duration: 0.06 }, 0.88);
    tl.to(rays, { opacity: 0, duration: 0.06 }, 0.87);
    rowEls.forEach((el, i) => {
      tl.to(el, { opacity: 0, x: -20, duration: 0.06, ease: "power2.in" }, 0.86 + i * 0.015);
    });
    this.rows.forEach((row, i) => {
      tl.to(row.state, { reveal: 0, duration: 0.05 }, 0.86 + i * 0.015);
    });

    tl.call(() => {}, [], 1); // pad to exactly 1 (WebGL-group grammar)
    return tl;
  }

  /* ---- WebGL camera timeline ---------------------------------------------- */

  private buildCameraTimeline(): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });
    const r = this.recipe;
    // .0–.1: blend onto the source's settled read — high three-quarter
    // over the crown side (the "top-down macro held" entry).
    tl.to(r, { blend: 1, duration: 0.1 }, 0);
    // .1–.4: THE move — descend onto the lit dial plate (settles OFF the
    // exact normal: az-0 mirror law). One big orbit; the paired lateral
    // travel runs inside a ≤.2 window (law 7 pairing) and composes the
    // watch right of center for the annotation rail.
    tl.to(r, { thetaOff: 0.32, phiOff: -0.14, standoff: 3.0, duration: 0.3 }, 0.1);
    tl.to(r, { lat: -0.42, duration: 0.2 }, 0.2);
    // parallax quiets (not off — the frame still breathes) so the hover
    // targets hold steady under the pointer during the annotated beat.
    tl.to(r, { parallaxScale: 0.55, duration: 0.15 }, 0.25);
    // .5–.75: annotated crawl — a slow quarter-orbit toward the crown
    // side while the rows do the talking. The swing is capture-sweep
    // evidence, not taste: the 6 m streak formers subtend ~90° of mirror
    // band on the domed crystal, so only a LARGE relative-azimuth move
    // keeps the dial ink at every attitude (phi alone proved useless —
    // sweep frames in the lane notes). lat deepens so the composition
    // stays right-of-center through the swing.
    tl.to(r, { thetaOff: 0.85, phiOff: -0.3, lat: -0.55, duration: 0.25 }, 0.5);
    // .75–.85: small settle-back (closer ≈ 0.5× the opener, law 3 shape).
    tl.to(r, { standoff: 3.12, phiOff: -0.34, duration: 0.1 }, 0.75);
    // .9–1: hand the camera back to the base rig for Hands.
    tl.to(r, { blend: 0, parallaxScale: 1, duration: 0.1 }, 0.9);
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
    // frame-lateral: aim beside the case — lat < 0 composes the watch
    // RIGHT of center (the track's namesake), rail owns the left.
    o.targetX = aim.x + Math.cos(o.theta) * r.lat;
    o.targetZ = aim.z - Math.sin(o.theta) * r.lat;
    o.targetY = aim.y + r.aimY;
    o.fov = 35;
    o.parallaxScale = r.parallaxScale;
    o.blend = clamp01(r.blend);
    this.overrideActive = true;
    this.rig.setPoseOverride(this.override);
  }

  /* ---- DOM channel: reveals + annotation projection ----------------------- */

  override tickDom(progress: number): void {
    super.tickDom(progress); // scrubs the DOM timeline (rows, reveal proxies)

    for (const line of this.reveals) {
      line.target = windowProgress(progress, line.win);
      if (isEvalMode) {
        line.value = line.target;
        this.applyReveal(line);
      }
    }

    this.projectAnnotations();
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

  /* ---- 3D-projected annotations (the HOVER_POSITION mechanic) -------------- *
   * Anchors live in case space (offsets in bezel-radius units), rotate
   * with the product attitude, and project through the live camera. The
   * camera matrices are the LAST rendered frame's (sections tick before
   * rig.update in the pipeline) — one frame of annotation lag at 60 fps,
   * invisible live; eval captures wait a settled frame so dots are exact. */

  private resolveAnchors(): void {
    const watch = this.stage?.watch ?? null;
    if (!watch) return;
    const bezel = watch.parts.get("part_bezel");
    if (!bezel) {
      // Contract-named part missing — degrade: dots stay hidden, the rail
      // still reads, hover still swaps the dial. Never break the beat.
      this.bezelRadius = -1;
      return;
    }
    const box = new Box3().setFromObject(bezel);
    const size = box.getSize(new Vector3());
    this.bezelRadius = Math.max(size.x, size.y, size.z) / 2;
    this.anchorsReady = this.bezelRadius > 0;
  }

  private projectAnnotations(): void {
    if (!this.anchorsReady && this.bezelRadius === 0) this.resolveAnchors();

    const cs = this.rig.caseSpace;
    const stage = this.stage;
    const show =
      this.anchorsReady && cs !== null && stage !== null && this.recipe.blend > 0.2;

    // Pin-local correction: dots/lines live inside the pin; while pinned
    // the pin's top is 0, at the edges it is not — subtract it so the
    // projected viewport px land on the right pin-local spot.
    const pinTop = show ? this.pin.getBoundingClientRect().top : 0;

    const att = productAttitude(getClock());
    this.scratchEuler.set(att.rotX, att.rotY, 0, "XYZ");
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    for (const row of this.rows) {
      let opacity = 0;
      if (show && cs && stage) {
        const s = row.spec;
        const v = this.scratchAnchor
          .copy(cs.origin)
          .addScaledVector(cs.xAxis, s.ox * this.bezelRadius)
          .addScaledVector(cs.yAxis, s.oy * this.bezelRadius)
          .addScaledVector(cs.zAxis, s.oz)
          .applyEuler(this.scratchEuler)
          .project(stage.camera);
        row.onScreen = v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2;
        if (row.onScreen) {
          row.px = (v.x * 0.5 + 0.5) * vw;
          row.py = (-v.y * 0.5 + 0.5) * vh;
          opacity = row.state.reveal * clamp01((this.recipe.blend - 0.2) / 0.6);
        }
      } else {
        row.onScreen = false;
      }

      const active = row === this.activeRow;
      row.dotEl.style.opacity = String(opacity);
      row.dotEl.style.transform = `translate(${row.px}px, ${row.py - pinTop}px)`;
      // Hairline: from the row's right edge to the tracked dot (the
      // source's radiating leader grammar, made load-bearing).
      const rect = row.labelEl.getBoundingClientRect();
      row.lineEl.setAttribute("x1", String(rect.right + 16));
      row.lineEl.setAttribute("y1", String(rect.top + rect.height / 2 - pinTop));
      row.lineEl.setAttribute("x2", String(row.px));
      row.lineEl.setAttribute("y2", String(row.py - pinTop));
      row.lineEl.style.opacity = String(opacity * (active ? 0.62 : 0.28));
      // Rows accept the pointer only while revealed (dead rows can't swap).
      const interactive = opacity > 0.4;
      if ((row.rowEl.style.pointerEvents === "auto") !== interactive) {
        row.rowEl.style.pointerEvents = interactive ? "auto" : "none";
      }
    }
  }

  /* ---- hover-swap graft (store bridge — one owner: main.ts forwards) ------ */

  private setHover(row: AnnotationRow | null): void {
    if (row === this.activeRow) return;
    if (row !== null && this.recipe.blend < 0.3) return; // section must own the frame
    this.activeRow?.rowEl.classList.remove("is-active");
    this.activeRow?.dotEl.classList.remove("is-active");
    this.activeRow = row;
    if (row) {
      row.rowEl.classList.add("is-active");
      row.dotEl.classList.add("is-active");
      bus.emit(EngineEvent.HoverPosition, { x: row.px, y: row.py, part: row.spec.part });
    }
    bus.emit(EngineEvent.SetCursorIcon, { icon: row ? "select" : null });
    // StateStore write — main.ts's frame loop forwards dialMode changes to
    // dial.applyDialToken (docs/p1/dial.md hover-swap contract).
    this.api?.applyState({ dialMode: row ? row.spec.token : "wayfinder" });
  }

  /** Debug API installs later in the same boot tick sections are
   *  constructed in; hover always runs on frames, after install. */
  private get api(): OneHertzDebugApi | null {
    return "__ONE_HERTZ__" in window ? window.__ONE_HERTZ__ : null;
  }

  /* ---- lifecycle ----------------------------------------------------------- */

  /** Center marker — engine-smoke lifecycle contract (placeholder parity). */
  override onEnterCenter(): void {
    this.element.classList.add("is-center");
  }

  override onLeaveCenter(): void {
    this.element.classList.remove("is-center");
  }

  /** Truthful exit both directions: wayfinder restored, override cleared. */
  override onLeave(): void {
    this.setHover(null);
    if (this.overrideActive) {
      this.overrideActive = false;
      this.rig.setPoseOverride(null);
    }
  }
}

/* ---- markup ----------------------------------------------------------------- */

function splitChars(word: string): string {
  return Array.from(word)
    .map((c) => `<span class="mwr__char">${c === " " ? "&nbsp;" : c}</span>`)
    .join("");
}

function buildMarkup(): string {
  const rows = ANNOTATIONS.map(
    (a) => `
      <button class="mwr__row mwr__row--${a.id}" type="button"
              aria-label="${a.label} — show ${a.token} complication">
        <span class="mwr__row-label">${a.label}</span>
        <span class="mwr__row-spec tnum">${a.spec}</span>
      </button>`,
  ).join("");
  const dots = ANNOTATIONS.map(
    (a) => `<div class="mwr__dot mwr__dot--${a.id}" aria-hidden="true"></div>`,
  ).join("");
  const lines = ANNOTATIONS.map(
    (a) => `<line class="mwr__line mwr__line--${a.id}" x1="0" y1="0" x2="0" y2="0" />`,
  ).join("");
  // Paint order: rays under the scrim, scrim under the copy, hairline
  // overlay (SVG + dots) on top — pointer-transparent, rows interactive.
  return `
    <div class="mwr__rays" aria-hidden="true">
      <i class="mwr__ray mwr__ray--a"></i>
      <i class="mwr__ray mwr__ray--b"></i>
      <i class="mwr__ray mwr__ray--c"></i>
    </div>
    <div class="mwr__scrim" aria-hidden="true"></div>
    <div class="mwr__copy">
      <p class="mwr__eyebrow">${EYEBROW}</p>
      <h2 class="mwr__head" aria-label="${HEAD_GHOST} ${HEAD_SOLID}">
        <span class="mwr__headline mwr__headline--ghost" aria-hidden="true">${splitChars(HEAD_GHOST)}</span>
        <span class="mwr__headline mwr__headline--solid" aria-hidden="true">${splitChars(HEAD_SOLID)}</span>
      </h2>
      <div class="mwr__subs">
        <p class="mwr__sub mwr__sub--0">${SUB_LINES[0]}</p>
        <p class="mwr__sub mwr__sub--1">${SUB_LINES[1]}</p>
      </div>
    </div>
    <nav class="mwr__rail" aria-label="watch details">${rows}</nav>
    <svg class="mwr__overlay" aria-hidden="true">${lines}</svg>
    ${dots}
  `;
}
