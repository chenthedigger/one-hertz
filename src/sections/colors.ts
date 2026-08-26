/**
 * Colors — the colorway catalog (pinned 450svh, the film's penultimate
 * movement and its longest beat; LOOKBIBLE §1.5 #13 "recovery ramp out of
 * Nocturne").
 *
 * Source grammar translated (motion bible §4 "Colors group" + §8 row 13):
 * the source dollies OUT to a wide drag-tilted hero (radius→10, dur .2
 * @.1), settles power3.out @.15, kills the tilt @.5 and wipes to the
 * colorway picker @.55. Ours keeps the watch ON stage the whole beat — it
 * IS the presentation — and replaces the overlay picker with the edition
 * ring: a scroll-drawn dial around the face-on beauty plate (LOOKBIBLE
 * §1.6 render-03 recipe: straight down the 35° dial normal, symmetric —
 * canonical for marketing frames) with the four finish×band editions
 * arranged beneath. SWAP itself is the P3 mechanic; this section ships the
 * presentation DOM, the camera choreography and the CONFIG_CHANGE consumer
 * (captions, swatches, ring indicator, `--first/second-color` pair — the
 * §2 colorway declaration), so the mechanic lands into wired sockets.
 *
 * Lighting: NEVER invented here. The keyframe driver holds the section key
 * (rot 330 · envInt 1.0 · exposure 1.05, instrument.json) and owns the
 * Nocturne→Colors ground ramp (#0A0B0D→#E8EAED between section centers) —
 * the source's stage-dim in/out grammar IS that ramp in our build. Copy is
 * choreographed around it: the dawn tag rides the dark tail on an ink
 * scrim, the ink headline waits for the ground to lighten (p≥.14), the
 * grey-line reveals sit fully on porcelain (§7.3 light-ground greys).
 *
 * Dual timelines (motion bible law 4 — domains declared):
 *   - DOM: scrub-fraction domain, PAUSED GSAP timeline padded to 1
 *     (scrub:true grammar — split-char slides xPercent −105→0 power3.out +
 *     linear opacity, `--bar-scale` edition bars, power2.in departures) +
 *     imperative scrub work in tickDom (ring dash-draw, linear over its
 *     window — the drawing-with-scroll signature). Grey-line color reveals
 *     use the §7.10 window grammar (staggered windows off raw progress,
 *     #BCBCBC→#323232 on light, power3.inOut — Lenis carries the lag).
 *   - WebGL: scrub-fraction domain, PAUSED GSAP timeline animating a
 *     private camera recipe, composed into a CameraPoseOverride each frame
 *     chasing the product's clock-derived attitude (the Mechanism/Nocturne
 *     rig seam — Disassembly owns the rig's authored master timeline).
 *     Beats on the fraction grid: blend-in .0–.15 · dolly-out .2 @.1 (the
 *     recovery breath, source-exact) · settle power3.out @.15 · recenter
 *     to the symmetric plate .5–.7 (parallax OFF for the plate, law 7) ·
 *     blend-out .9–1. Watch composes RIGHT of frame while the copy column
 *     owns the left, then centers inside the ring.
 *
 * State contract (truthful): requires the assembled watch wearing its
 * active face (a colorway plate of an exploded AOD watch is nonsense);
 * guarantees nothing changed — scroll writes no state axis here. The
 * colorway axis is written by the P3 CONFIG_CHANGE emitter; this section
 * only LISTENS.
 */

import { gsap } from "gsap";
import { Euler, Vector3 } from "three";
import { getClock } from "../core/clock";
import { EngineEvent, bus } from "../core/events";
import { SectionBase, timelineAdapter } from "../core/section";
import { CONFIGS, resolveConfig, type ColorwayConfig } from "../ui/colorway";
import type { CameraPoseOverride, CameraRig } from "../webgl/cameraRig";
import { productAttitude } from "../webgl/stage";
import "./colors.css";

/* ---- copy (working copy inside LOOKBIBLE §8 budgets — P4 polishes) -------- */

const DAWN_TAG = "DAYBREAK · 06:00"; // 16 ≤ 18 caps — Nocturne's bookend
const EYEBROW = "13 · EDITIONS"; // 13 ≤ 18 caps
const TITLE_LINE_1 = "ONE HEART,"; // 10 ≤ 18 at colossal
const TITLE_LINE_2 = "FOUR LIGHTS."; // 12 ≤ 18
// Three REAL Ocean colors (Black / Anchor Blue / Neon Green — apple.com buy
// pages 2026-08-26) across four finish×color editions; Anchor Blue repeats.
const LEAD = "Two finishes. Three Ocean colors. One heart."; // 44 ≤ 48
const GREY_LINES = [
  "Natural titanium returns the light.", // 35 ≤ 44
  "DLC keeps it. Ocean cools it.", // 29
  "The band decides the mood.", // 26
] as const;
const RAIL_CAPTION = "Four editions. One instrument. Tap a slot to swap."; // 50 ≤ 60

/* ---- editions — the FOUR shipped configs (ui/colorway CONFIGS is the one
 * table: 2 Ti finishes × Ocean COLOR recolors, founder 2026-08-26; the old
 * reserved Alpine/Trail slots retired with the recolor-only decision). The
 * rail is dual-placement picker #3 (Parts card + outro lineup are #1/#2):
 * every slot emits CONFIG_CHANGE on the shared bus — same mutation path as
 * every other entry point. Hexes stay UI chips only, never material truth. */

const EDITIONS: readonly ColorwayConfig[] = CONFIGS;

/* ---- beat windows (fraction grid {.05,.1,.15,.2,.25,.4,.5,.75} anchored) -- */

/** Ring dash-draw window — linear over the window (drawing-with-scroll). */
const RING_DRAW: readonly [number, number] = [0.58, 0.84];
/** Grey-line reveal windows — §7.10 staggered windows, 15/25-style
 *  alternating widths, fully on the recovered porcelain ground. */
const GREY_WINDOWS: readonly (readonly [number, number])[] = [
  [0.42, 0.52],
  [0.445, 0.575],
  [0.47, 0.57],
];

const GREY_FROM = 0xbcbcbc; // motion-bible grey (from), light ground
const GREY_TO = 0x323232; // §7.3 reveal target on light

/* ---- camera recipe -------------------------------------------------------- */

interface CameraRecipe {
  blend: number;
  /** standoff from the screen center along the dial normal, world units */
  standoff: number;
  /** azimuth offset off the dial normal (the drag-tilted hero read) */
  thetaOff: number;
  /** polar offset — negative lifts the camera above the 35° dial normal */
  phiOff: number;
  /** frame-lateral: >0 aims left of the case → watch composes right */
  lat: number;
  parallaxScale: number;
}

const CAM_FOV = 35; // LOOKBIBLE §1.6 — the plate is a 35mm read

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function win(p: number, [a, b]: readonly [number, number]): number {
  return clamp01((p - a) / (b - a));
}

/** power3.inOut — reveal ease per LOOKBIBLE §7.3. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function mixHex(from: number, to: number, t: number): string {
  const r = Math.round(((from >> 16) & 255) + ((((to >> 16) & 255) - ((from >> 16) & 255)) * t));
  const g = Math.round(((from >> 8) & 255) + ((((to >> 8) & 255) - ((from >> 8) & 255)) * t));
  const b = Math.round((from & 255) + (((to & 255) - (from & 255)) * t));
  return `rgb(${r} ${g} ${b})`;
}

export class ColorsSection extends SectionBase {
  private readonly ringFill: SVGCircleElement;
  private readonly greyLines: HTMLElement[];
  private readonly slots: HTMLElement[];

  private lastRing = "";
  private readonly lastGrey: string[] = ["", "", ""];
  private activeIndex = -1;

  /* Pose override plumbing (rig reads the SAME object every frame). */
  private readonly recipe: CameraRecipe = {
    blend: 0,
    standoff: 5.2,
    thetaOff: 0.85,
    phiOff: -0.3,
    lat: 0.65,
    parallaxScale: 0,
  };
  private readonly poseOverride: CameraPoseOverride = {
    theta: 0,
    phi: Math.PI / 2,
    radius: 8,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    fov: CAM_FOV,
    parallaxScale: 1,
    blend: 0,
  };
  private overrideActive = false;
  private readonly scratchEuler = new Euler(0, 0, 0, "XYZ");
  private readonly scratchNormal = new Vector3();
  private readonly scratchAim = new Vector3();

  constructor(private readonly rig: CameraRig) {
    super({
      name: "Colors",
      requiredEnterState: { explode: "assembled", dialMode: "wayfinder" },
      guaranteedExitState: {},
    });

    this.buildDom();
    this.ringFill = this.mustQuery<SVGCircleElement>(".col__ring-fill");
    this.greyLines = Array.from(this.element.querySelectorAll<HTMLElement>(".col__lines p"));
    this.slots = Array.from(this.element.querySelectorAll<HTMLElement>(".col__slot"));

    this.addDomAdapter(timelineAdapter(this.buildDomTimeline()));
    this.addWebglAdapter(timelineAdapter(this.buildCameraTimeline()));

    // CONFIG_CHANGE consumer: captions, swatch ring, colorway CSS pair all
    // follow the bus. resolveConfig normalizes every payload shape.
    bus.on(EngineEvent.ConfigChange, (payload) => {
      const cfg = resolveConfig(payload);
      if (cfg) this.applyEdition(cfg);
    });
    // …and EMITTER (dual-placement picker #3): every slot speaks the same
    // canonical `{config}` payload the Parts card and the outro emit.
    this.mustQuery<HTMLElement>(".col__rail").addEventListener("click", (e) => {
      const el =
        e.target instanceof Element ? e.target.closest<HTMLElement>("[data-finish]") : null;
      const id = el?.dataset["finish"];
      if (id) bus.emit(EngineEvent.ConfigChange, { config: id });
    });
    this.applyEdition(CONFIGS[0] as ColorwayConfig);
  }

  /* ---- DOM (self-rendered — index.html holds only the empty track) ------- */

  private buildDom(): void {
    this.element.innerHTML = `
      <div class="pin col">
        <p class="col__dawn">${DAWN_TAG}</p>
        <header class="col__head">
          <p class="col__eyebrow">${EYEBROW}</p>
          <h2 class="col__headline" aria-label="${TITLE_LINE_1} ${TITLE_LINE_2}">
            <span class="col__line" aria-hidden="true">${splitChars(TITLE_LINE_1)}</span>
            <span class="col__line col__line--indent" aria-hidden="true">${splitChars(TITLE_LINE_2)}</span>
          </h2>
          <p class="col__lead">${LEAD}</p>
        </header>
        <div class="col__lines">
          ${GREY_LINES.map((l) => `<p>${l}</p>`).join("")}
        </div>
        <svg class="col__ring" viewBox="0 0 100 100" aria-hidden="true">
          <circle class="col__ring-track" cx="50" cy="50" r="48" pathLength="100" />
          <circle class="col__ring-fill" cx="50" cy="50" r="48" pathLength="100"
            stroke-dasharray="100" stroke-dashoffset="100" />
          <g class="col__ring-cursor">
            <circle class="col__ring-dot" cx="50" cy="2" r="1.4" />
          </g>
        </svg>
        <div class="col__rail" data-cursor-text="swap" data-colorway-picker
             data-colorway-slot="colors" role="group" aria-label="Colorway picker">
          <ul class="col__slots">
            ${EDITIONS.map(slotMarkup).join("")}
          </ul>
          <p class="col__caption">${RAIL_CAPTION}</p>
        </div>
      </div>`;
  }

  private mustQuery<T extends Element>(selector: string): T {
    const el = this.element.querySelector<T>(selector);
    if (!el) throw new Error(`Colors: missing ${selector}`);
    return el;
  }

  /* ---- DOM scrub timeline (fraction domain 0..1, padded to 1) ------------ */

  private buildDomTimeline(): gsap.core.Timeline {
    const q = (s: string): HTMLElement => this.mustQuery<HTMLElement>(s);
    const dawn = q(".col__dawn");
    const head = q(".col__head");
    const eyebrow = q(".col__eyebrow");
    const lead = q(".col__lead");
    const chars = this.element.querySelectorAll<HTMLElement>(".col__char");
    const linesBlock = q(".col__lines");
    const ring = q(".col__ring");
    const rail = q(".col__rail");
    const slots = this.element.querySelectorAll<HTMLElement>(".col__slot");
    const bars = this.element.querySelectorAll<HTMLElement>(".col__slot-bar");
    const caption = q(".col__caption");

    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });

    // Beat 0 · dawn tag — the night's last breath, gone before the ground
    // lightens (porcelain micro-caps on an ink scrim, both-grounds-safe).
    tl.fromTo(dawn, { opacity: 0 }, { opacity: 1, duration: 0.03 }, 0.02);
    tl.to(dawn, { opacity: 0, duration: 0.04 }, 0.08);

    // Beat 1 · headline (ink type — enters once the ramp has lightened).
    // scrub:true grammar: transforms power3.out, scrubbed opacity linear.
    tl.to(head, { opacity: 1, duration: 0.02 }, 0.13);
    tl.fromTo(eyebrow, { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.14);
    tl.fromTo(eyebrow, { y: 14 }, { y: 0, duration: 0.05, ease: "power3.out" }, 0.14);
    tl.fromTo(
      chars,
      { xPercent: -105 },
      { xPercent: 0, duration: 0.1, ease: "power3.out", stagger: 0.004 },
      0.15,
    );
    tl.fromTo(
      chars,
      { opacity: 0 },
      { opacity: 1, duration: 0.05, stagger: 0.004 }, // linear, first half
      0.15,
    );
    tl.fromTo(lead, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.27);
    tl.fromTo(lead, { y: 16 }, { y: 0, duration: 0.06, ease: "power3.out" }, 0.27);
    // Departure — power2.in (things leaving accelerate away).
    tl.to(head, { opacity: 0, duration: 0.06 }, 0.36);
    tl.to(head, { y: -40, duration: 0.06, ease: "power2.in" }, 0.36);

    // Beat 2 · grey-line block (colors are imperative — §7.10 windows).
    tl.fromTo(linesBlock, { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.4);
    tl.fromTo(linesBlock, { y: 18 }, { y: 0, duration: 0.05, ease: "power3.out" }, 0.4);
    tl.to(linesBlock, { opacity: 0, duration: 0.04 }, 0.6);
    tl.to(linesBlock, { y: -18, duration: 0.045, ease: "power2.in" }, 0.6);

    // Beat 3 · the edition ring + rail (the presentation plate). The rail
    // WRAPPER fades in with its content (gate-4 tune 3: its scrim backing
    // used to sit visible from p=0 as a stray translucent rectangle).
    tl.fromTo(ring, { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.58);
    tl.fromTo(rail, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.6);
    tl.fromTo(
      slots,
      { y: 26, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.07, ease: "power3.out", stagger: 0.02 },
      0.62,
    );
    // `--bar-scale` grammar: each slot's hairline draws with its arrival.
    tl.fromTo(
      bars,
      { scaleX: 0 },
      { scaleX: 1, duration: 0.06, ease: "power3.out", stagger: 0.02 },
      0.63,
    );
    tl.fromTo(caption, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.72);
    // Departure before the pin releases into Parts.
    tl.to([rail, ring], { opacity: 0, duration: 0.05 }, 0.92);
    tl.to(rail, { y: -24, duration: 0.05, ease: "power2.in" }, 0.92);

    tl.call(() => {}, [], 1); // pad — the fraction domain spans exactly 0..1
    return tl;
  }

  override tickDom(progress: number): void {
    super.tickDom(progress);

    // Ring dash-draw: linear over its window, a pure function of progress
    // (the source's 3 s wall-clock ring draw becomes scroll-drawn here —
    // presentation is scrub; the wall-clock draw stays with P3's SWAP).
    const drawn = win(progress, RING_DRAW);
    const offset = ((1 - drawn) * 100).toFixed(2);
    if (offset !== this.lastRing) {
      this.lastRing = offset;
      this.ringFill.setAttribute("stroke-dashoffset", offset);
    }

    // Grey-line reveals — §7.10 staggered windows, power3.inOut, raw
    // progress (Lenis is the one smoothing owner; its glide is the lag).
    for (let i = 0; i < this.greyLines.length; i++) {
      const line = this.greyLines[i];
      const window = GREY_WINDOWS[i];
      if (!line || !window) continue;
      const t = easeInOutCubic(win(progress, window));
      const color = mixHex(GREY_FROM, GREY_TO, t);
      if (color !== this.lastGrey[i]) {
        this.lastGrey[i] = color;
        line.style.color = color;
      }
    }
  }

  /* ---- WebGL channel ------------------------------------------------------ */

  private buildCameraTimeline(): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });
    const r = this.recipe;
    // .0–.15: blend over the base pose (arrive on the tilted wide hero).
    tl.to(r, { blend: 1, duration: 0.15 }, 0);
    // .1–.3: THE recovery breath — dolly-out (source: radius→10, dur .2 @.1).
    tl.to(r, { standoff: 8, duration: 0.2 }, 0.1);
    // .15–.3: settle the drag-tilt partway, parallax comes alive
    // (source: settle power3.out @.15, parallax ON @.15).
    tl.to(r, { thetaOff: 0.42, phiOff: -0.18, parallaxScale: 1, duration: 0.15, ease: "power3.out" }, 0.15);
    // .32–.46: the watch rides ~15% larger through the grey-line reveal
    // window (gate-4 tune 4 — the small watch + grey block read
    // under-tensioned at .40–.60), then the recenter returns it to plate
    // scale. Paired ≤.2-window moves (law 7).
    tl.to(r, { standoff: 6.6, duration: 0.14 }, 0.32);
    // .5–.7: recenter to the near-symmetric face-on plate; parallax OFF for
    // the plate (source: rotation→0 @.5; law 7 — parallax off during
    // macros). A small residual off-axis stays: dead-on the crystal sheets
    // the emissive dial at normal incidence (§7.2 — legibility over drama).
    tl.to(r, { thetaOff: 0.12, phiOff: -0.05, lat: 0, parallaxScale: 0, standoff: 7.6, duration: 0.2 }, 0.5);
    // .75–.9: a small press-in as the captions land (≤.2-window move).
    tl.to(r, { standoff: 7.1, duration: 0.15 }, 0.75);
    // .9–1: hand the camera back to the base rig pose.
    tl.to(r, { blend: 0, parallaxScale: 1, duration: 0.1 }, 0.9);
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
    // (live == eval == solo): the plate holds at any page clock.
    const att = productAttitude(getClock());
    this.scratchEuler.set(att.rotX, att.rotY, 0, "XYZ");
    const n = this.scratchNormal.copy(cs.zAxis).applyEuler(this.scratchEuler);
    const aim = this.scratchAim.copy(cs.origin).applyEuler(this.scratchEuler);
    const o = this.poseOverride;
    o.theta = Math.atan2(n.x, n.z) + r.thetaOff;
    o.phi = Math.min(
      Math.PI - 0.15,
      Math.max(0.15, Math.acos(Math.min(1, Math.max(-1, n.y))) + r.phiOff),
    );
    o.radius = r.standoff;
    // frame-lateral: aim left of the case so the watch composes right,
    // returning to dead-center as `lat` tweens to 0 for the plate.
    o.targetX = aim.x - Math.cos(o.theta) * r.lat;
    o.targetZ = aim.z + Math.sin(o.theta) * r.lat;
    o.targetY = aim.y;
    o.fov = CAM_FOV;
    o.parallaxScale = r.parallaxScale;
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

  /** Never trap the rig: release the override in both exit directions. */
  override onLeave(): void {
    if (this.overrideActive) {
      this.overrideActive = false;
      this.rig.setPoseOverride(null);
    }
  }

  /* ---- CONFIG_CHANGE consumer --------------------------------------------- */

  private applyEdition(cfg: ColorwayConfig): void {
    const index = EDITIONS.findIndex((e) => e.id === cfg.id);
    const edition = EDITIONS[index];
    if (!edition || index === this.activeIndex) return;
    this.activeIndex = index;
    this.slots.forEach((slot, i) => slot.classList.toggle("col__slot--active", i === index));
    // The §2 colorway declaration: CSS `--first/second-color` pair (scoped
    // to the section root; the source tweens these 1.2 s power3.inOut on
    // swap — that wall-clock tween ships with the P3 mechanic).
    this.element.style.setProperty("--first-color", edition.finishHex);
    this.element.style.setProperty("--second-color", edition.bandHex);
    // Ring indicator walks to the active slot (CSS transform transition 1 s
    // easeOutCubic — the source picker's circle-svg grammar).
    this.element.style.setProperty("--col-arc-rot", `${index * 90}deg`);
  }
}

/* ---- markup helpers -------------------------------------------------------- */

function splitChars(text: string): string {
  return Array.from(text)
    .map((c) => (c === " " ? " " : `<span class="col__char">${c}</span>`))
    .join("");
}

function slotMarkup(e: ColorwayConfig, i: number): string {
  return `
    <li class="col__slot">
      <span class="col__slot-bar" aria-hidden="true"></span>
      <button type="button" class="col__slot-btn" data-finish="${e.id}"
              aria-label="${e.label}" title="${e.label}">
        <span class="col__slot-index">0${i + 1}</span>
        <span class="col__slot-name">${e.finishLabel}<em>${e.bandLabel}</em></span>
        <span class="col__slot-chips" aria-hidden="true">
          <i class="col__chip" style="--chip:${e.finishHex}"></i>
          <i class="col__chip col__chip--band" style="--chip:${e.bandHex}"></i>
        </span>
      </button>
    </li>`;
}
