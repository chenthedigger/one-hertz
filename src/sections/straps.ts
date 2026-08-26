/**
 * Straps — "The Band" (pinned 400svh, the long beat; BPM catalog card #3).
 *
 * Source grammar translated (Straps_* reference frames + motion bible
 * "Straps group"): the source converges its steel links into one horizontal
 * band filling the lower frame under a centered display headline. Ours is
 * the OCEAN BAND CREST MACRO (LOOKBIBLE §6 shot 8 recipe — macro optics,
 * the fluoroelastomer loop's outer crest across the lower frame) under the
 * same centered-copy composition, sequenced as three beats over the 400svh
 * pin: headline "MOLDED, / NOT FORGED" → BPM catalog card #3 "142 / 220"
 * (shared-denominator catalog, PLAN §2: 58 → 96 → 142 over
 * Curves/Hands/Straps; the value counts 96→142 as a pure function of
 * progress — the heart-rate peak) → Ocean color rail "BLACK · ANCHOR BLUE
 * · NEON GREEN" (the shipped recolor axis; the live tick tracks the active
 * config's band — founder 2026-08-26, real Apple Ocean colors only).
 *
 * Lighting: entirely the infra-gl keyframe driver's (instrument.json
 * Straps key: rot 250 · envInt 1.05 · porcelain stage — "band macro,
 * fluoroelastomer stays matte", LOOKBIBLE §1.5 #10). This section invents
 * no lighting. Scrims ride the ground token (§7.1, light-ground grammar).
 *
 * Timelines (motion bible law 4 — domains declared):
 *   - DOM: scrub-fraction domain, PAUSED GSAP timeline padded to 1.
 *     scrub:true transform grammar (§3): split-char x-slides power3.out +
 *     linear opacity over the first half; departures power2.in. Grey-line
 *     color reveals ride the scrub:2 grammar on the LIGHT ground
 *     (#BCBCBC→#323232, §7.3) — 2 s catch-up lag live via a gsap.ticker
 *     smoother, targets applied directly under ?eval=1 (the Mechanism
 *     precedent; settle passes run with dt=0).
 *   - WebGL: scrub-fraction domain, PAUSED GSAP recipe timeline composed
 *     into a CameraPoseOverride each frame; the crest anchor CHASES the
 *     product's clock-derived attitude (stage.productAttitude), so the
 *     framing holds in solo, full page and live alike. Beats on the
 *     fraction grid: converge .0–.1 (power2.out — the source's link
 *     converge arrives-and-settles) · crest drift .1–.5 (the one big move:
 *     dolly + graze) · reframe .5–.75 · fling-out .75–.9 (power2.in — the
 *     source's link fling departs violently) · blend-out .9–1. Parallax
 *     gated OFF for the macro (law 7). DOF: macro pinned section, tier 0
 *     only (post.ts gates the tier) — focus racks ride the SAME beats as
 *     the dolly because it derives from the live standoff (§7.9).
 *
 * State contract (truthful): requires the watch assembled (a band macro of
 * an exploded case is nonsense); guarantees nothing changed — the pose
 * override blends fully out before exit, DOF is released, and no state
 * axis is written.
 */

import { gsap } from "gsap";
import { Euler, Vector3 } from "three";
import { getClock } from "../core/clock";
import type { OneHertzDebugApi } from "../core/debug";
import { isEvalMode } from "../core/determinism";
import { bus, EngineEvent } from "../core/events";
import { SectionBase, timelineAdapter } from "../core/section";
import { CONFIGS, resolveConfig } from "../ui/colorway";
import { productAttitude } from "../webgl/stage";
import type { CameraPoseOverride, CameraRig } from "../webgl/cameraRig";
import "./straps.css";

/* ---- copy (working copy per LOOKBIBLE §8 budgets — P4 polishes wording) --- */

const EYEBROW = "10 · THE BAND"; // ≤18 chars caps
/** The elastomer loop is MOLDED, not woven (woven is Alpine/Trail's craft —
 *  the old ghost word overclaimed); the antithesis stays materials-true:
 *  molded polymer against the source bracelet's forged links. */
const TITLE_GHOST = "MOLDED,"; // ≤18 chars/line at colossal
const TITLE_SOLID = "NOT FORGED";
/** Body block — 3 grey-reveal lines, each ≤60 chars, one thought each. */
const BODY_LINES = [
  "One loop of fluoroelastomer, molded without a seam.",
  "No links to machine. No pins to shake loose.",
  "It stretches at the sprint, and forgets it.",
] as const;
const CARD_EYEBROW = "CATALOG 03/03"; // grammar unified with cards 01/02
const CARD_UNIT = "bpm"; // value + unit; the caption carries the story
const CARD_CAPTION = "The heart at its ceiling. The band, unbothered."; // ≤60
/** Family rail → Ocean color story (founder 2026-08-26: recolor-only axis).
 *  The rail lists the three REAL Ocean colors (apple.com buy pages, checked
 *  2026-08-26: Black / Anchor Blue / Neon Green — ui/colorway CONFIGS is the
 *  one table, so the labels derive from it); the live tick tracks the ACTIVE
 *  config's band over CONFIG_CHANGE. Alpine / Trail / Milanese exist in
 *  Apple's catalog but not in this build — they no longer appear as dimmed
 *  pseudo-options (the dim-as-honesty cue retires with the lie it flagged). */
const FAMILY_LABEL = "OCEAN BAND"; // ≤18 chars caps
interface FamilyItem {
  readonly band: string;
  readonly label: string;
}
const FAMILY: readonly FamilyItem[] = CONFIGS.reduce<FamilyItem[]>((acc, c) => {
  if (!acc.some((f) => f.band === c.band)) acc.push({ band: c.band, label: c.bandLabel });
  return acc;
}, []);
const FAMILY_CAPTION = "Three waters. One heartbeat."; // 28 ≤ 60 chars

/** Catalog card #3 counts from card #2's value to the peak (PLAN §2). */
const BPM_FROM = 96;
const BPM_PEAK = 142;
const BPM_MAX = 220;
/** Count window — lands exactly on 142 at the p=.5 money frame. */
const BPM_WINDOW: readonly [number, number] = [0.4, 0.5];

/* ---- grey-line reveal machinery (scrub:2 grammar, light ground §7.3) ------ */

const REVEAL_FROM = 0xbcbcbc; // motion-bible grey (both grounds start here)
/** Third-line floor (gate:p3 Straps tune, §7.5): the last body line crosses
 *  the band macro at .25 mid-reveal, and the #BCBCBC start dips under 40%
 *  contrast against the fluoroelastomer. Its ramp therefore STARTS at the
 *  40%-ink-on-porcelain tone (same rule that lifted "WOVEN," to 40%) —
 *  still reads as the pre-reveal grey tier, never under the §7.5 floor. */
const REVEAL_FROM_BAND = 0x8f9193;
const REVEAL_TO = 0x323232; // light-ground target (§7.3)
/** scrub:2 catch-up rate (≈2 s to visually settle — Mechanism constant). */
const REVEAL_LAG_K = 2.2;

interface RevealLine {
  el: HTMLElement;
  /** progress window [in, out] — per-line stagger on the 15/25 alternation */
  win: readonly [number, number];
  /** ramp start color — line 3 floors at 40% ink (§7.5, gate:p3 tune). */
  from: number;
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

function win(p: number, [a, b]: readonly [number, number]): number {
  return clamp01((p - a) / (b - a));
}

/* ---- camera recipe -------------------------------------------------------- */

/**
 * Arc anchor: the band loop's ring axis is the case xAxis (crown side) —
 * viewed ALONG that axis the loop reads as an arc, and its lower curve
 * sweeps HORIZONTALLY across the frame (the source composition: band low,
 * clean ground above the copy). Anchor = the loop's bottom-center in case
 * space (down the dial-12 axis, behind the dial plane); the camera sits
 * off the crown side ("outside it shoots strap" — LOOKBIBLE §1.6 — is
 * exactly what a band macro wants).
 */
const ARC_Y = -1.0; // case-space: down the −yAxis to the loop's lower arc
const ARC_Z = -0.5; // case-space: behind the dial plane toward loop center

interface CameraRecipe {
  blend: number;
  /** camera distance off the crest anchor, world units (macro range) */
  standoff: number;
  /** azimuth off the dead-on back normal — grazes the crest diagonally */
  thetaOff: number;
  /** polar offset — negative lifts the camera above the crest line */
  phiOff: number;
  /** frame-lateral shift: >0 pushes the band left of center */
  lat: number;
  /** extra aim height over the crest anchor, world units */
  aimY: number;
  fov: number;
  parallaxScale: number;
}

export class StrapsSection extends SectionBase {
  private readonly recipe: CameraRecipe = {
    blend: 0,
    standoff: 2.1,
    thetaOff: 0.35,
    phiOff: -0.32,
    lat: 0.1,
    aimY: -0.12,
    fov: 30,
    parallaxScale: 1,
  };
  private readonly override: CameraPoseOverride = {
    theta: 0,
    phi: 1.5,
    radius: 1.5,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    fov: 30,
    parallaxScale: 1,
    blend: 0,
  };
  private overrideActive = false;
  private dofActive = false;
  private lastDofFocus = -1;

  private readonly bpmValue: HTMLElement;
  private readonly reveals: RevealLine[];
  private lastBpm = -1;

  // scratch (no per-frame allocs)
  private readonly scratchEuler = new Euler(0, 0, 0, "XYZ");
  private readonly scratchBack = new Vector3();
  private readonly scratchAim = new Vector3();
  private readonly scratchCam = new Vector3();

  constructor(private readonly rig: CameraRig) {
    super({
      name: "Straps",
      requiredEnterState: { explode: "assembled" },
      guaranteedExitState: {},
      // longpress zoom: default 1.35 (law 8 table — not the Disassembly
      // macro, not DOM-only; the table names no Straps exception).
    });

    const pin = this.element.querySelector<HTMLElement>(".pin");
    if (!pin) throw new Error("Straps: track has no .pin");
    pin.className = "pin strp";
    pin.dataset["cursorText"] = "holdToExplore"; // fixed vocabulary (§8)
    pin.innerHTML = buildMarkup();

    const q = <T extends Element>(sel: string): T => {
      const el = pin.querySelector<T>(sel);
      if (!el) throw new Error(`Straps: missing ${sel}`);
      return el;
    };

    this.bpmValue = q<HTMLElement>("[data-bpm]");

    // Family-rail live tick follows the ACTIVE band (CONFIG_CHANGE
    // consumer — same normalization path as the gallery / Colors rail).
    bus.on(EngineEvent.ConfigChange, (payload) => {
      const cfg = resolveConfig(payload);
      if (!cfg) return;
      for (const item of pin.querySelectorAll<HTMLElement>(".strp__fam-item")) {
        item.classList.toggle(
          "strp__fam-item--live",
          item.dataset["band"] === cfg.band,
        );
      }
    });

    // Grey-line windows: staggered per-line on the 15/25 alternation shape
    // (motion bible §3 — expressed directly in the progress domain).
    const lines = Array.from(pin.querySelectorAll<HTMLElement>(".strp__line"));
    const wins: readonly [number, number][] = [
      [0.13, 0.24],
      [0.165, 0.29],
      [0.2, 0.33],
    ];
    this.reveals = lines.map((el, i) => ({
      el,
      win: wins[i] ?? [0.2, 0.33],
      // Line 3 ("…and forgets it." tier) overlaps the band at .25 — floor
      // its ramp start at 40% ink (§7.5; gate:p3 Straps tune).
      from: i === 2 ? REVEAL_FROM_BAND : REVEAL_FROM,
      value: 0,
      target: 0,
    }));
    // Paint the ramp starts once so the floored line never waits for its
    // first reveal tick to leave the CSS #BCBCBC default.
    for (const line of this.reveals) this.applyReveal(line);

    this.addDomAdapter(timelineAdapter(this.buildDomTimeline(pin)));
    this.addWebglAdapter(timelineAdapter(this.buildCameraTimeline()));

    // scrub:2 catch-up lag lives on the shared ticker (live only — eval
    // applies targets directly in tickDom so settleSync is already final).
    if (!isEvalMode) {
      gsap.ticker.add((_t, deltaMs) => this.tickLag(deltaMs / 1000));
    }
  }

  /* ---- DOM channel -------------------------------------------------------- */

  private buildDomTimeline(pin: HTMLElement): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true });
    const head = pin.querySelector<HTMLElement>(".strp__head");
    const eyebrow = pin.querySelector<HTMLElement>(".strp__eyebrow");
    const ghost = Array.from(pin.querySelectorAll<HTMLElement>(".strp__t-ghost .strp__char"));
    const solid = Array.from(pin.querySelectorAll<HTMLElement>(".strp__t-solid .strp__char"));
    const body = pin.querySelector<HTMLElement>(".strp__body");
    const card = pin.querySelector<HTMLElement>(".strp__card");
    const family = pin.querySelector<HTMLElement>(".strp__family");
    const familyItems = Array.from(pin.querySelectorAll<HTMLElement>(".strp__fam-item"));

    // Beat 1 · headline (.04–.32): split-char scrub:true grammar — x-slides
    // power3.out, opacity linear over the first half of each slide (§3).
    if (eyebrow) {
      tl.fromTo(
        eyebrow,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" },
        0.04,
      );
    }
    tl.fromTo(
      ghost,
      { xPercent: -110 },
      { xPercent: 0, duration: 0.1, ease: "power3.out", stagger: 0.008 },
      0.05,
    );
    tl.fromTo(
      ghost,
      { opacity: 0 },
      { opacity: 1, duration: 0.05, ease: "none", stagger: 0.008 },
      0.05,
    );
    tl.fromTo(
      solid,
      { xPercent: -110 },
      { xPercent: 0, duration: 0.1, ease: "power3.out", stagger: 0.008 },
      0.08,
    );
    tl.fromTo(
      solid,
      { opacity: 0 },
      { opacity: 1, duration: 0.05, ease: "none", stagger: 0.008 },
      0.08,
    );
    if (body) {
      tl.fromTo(body, { opacity: 0 }, { opacity: 1, duration: 0.04, ease: "none" }, 0.12);
    }
    // departure — the whole head block accelerates away (power2.in, law 2)
    if (head) {
      tl.to(head, { opacity: 0, duration: 0.06, ease: "none" }, 0.32);
      tl.to(head, { y: -44, duration: 0.06, ease: "power2.in" }, 0.32);
    }

    // Beat 2 · BPM catalog card (.4–.68): hero-adjacent arrival, y-rise
    // power3.out + linear opacity; count is imperative (tickDom).
    if (card) {
      tl.fromTo(card, { opacity: 0 }, { opacity: 1, duration: 0.05, ease: "none" }, 0.4);
      tl.fromTo(card, { y: 30 }, { y: 0, duration: 0.08, ease: "power3.out" }, 0.4);
      tl.to(card, { opacity: 0, duration: 0.05, ease: "none" }, 0.62);
      tl.to(card, { y: -36, duration: 0.06, ease: "power2.in" }, 0.62);
    }

    // Scrim retirement (P6 gate fix — the Straps→Images "semi-transparent
    // case" artifact): the top legibility scrim's job ends when the card
    // departs — beat 3's family rail lives bottom-left on bare porcelain.
    // Held at full strength through the pin, its 50–60% porcelain gradient
    // sat over the base-rig case re-entering top-center from ~.9, so any
    // paused frame in the hand-off showed the case half-faded. Fade it out
    // with the last copy it protects: gone by .74, a .16 margin before the
    // case re-entry (scrub restores it symmetrically on the way back up).
    const scrim = pin.querySelector<HTMLElement>(".strp__scrim");
    if (scrim) {
      tl.to(scrim, { opacity: 0, duration: 0.06, ease: "none" }, 0.68);
    }

    // Beat 3 · family callout rail (.67–.87): staggered rises timed to be
    // fully SETTLED at the .75 catalog frame (last item lands .70+.05).
    // Departure finishes by ≤.875 (gate-3 tune 1): the base-rig watch case
    // re-enters top-center from ~.9 as the camera blends out — every DOM
    // departure must be resolved before that handoff so no rail text ever
    // crosses the returning case (verified on page-truth .9/.95 captures).
    if (family) {
      tl.fromTo(family, { opacity: 0 }, { opacity: 1, duration: 0.04, ease: "none" }, 0.67);
      tl.fromTo(
        familyItems,
        { y: 22, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.05, ease: "power3.out", stagger: 0.01 },
        0.67,
      );
      tl.to(family, { opacity: 0, duration: 0.05, ease: "none" }, 0.82);
      tl.to(family, { y: -30, duration: 0.055, ease: "power2.in" }, 0.82);
    }

    tl.call(() => {}, [], 1); // pad — beat positions are window fractions
    return tl;
  }

  override tickDom(progress: number): void {
    super.tickDom(progress);

    // BPM count: card #2's 96 → the 142 peak, a pure linear map of section
    // progress (data honesty — the number IS the scroll; §4 tabular-nums).
    const v = Math.round(BPM_FROM + (BPM_PEAK - BPM_FROM) * win(progress, BPM_WINDOW));
    if (v !== this.lastBpm) {
      this.lastBpm = v;
      this.bpmValue.textContent = String(v);
    }

    // Grey-line reveals: targets from progress windows; eval applies
    // instantly (deterministic captures — settle passes run with dt=0).
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
    line.el.style.color = mixHex(line.from, REVEAL_TO, easeInOutCubic(clamp01(line.value)));
  }

  /* ---- WebGL channel ------------------------------------------------------ */

  private buildCameraTimeline(): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });
    const r = this.recipe;
    // .0–.1: converge — arrive-and-settle onto the crest (power2.out, the
    // source's Straps link-converge ease); parallax off for the macro.
    tl.to(r, { blend: 1, parallaxScale: 0, duration: 0.1, ease: "power2.out" }, 0);
    // .1–.5: the one big move — slow grazing dolly along the crest while
    // the streak light crawls the fluoroelastomer weave.
    tl.to(r, { standoff: 1.7, thetaOff: -0.25, lat: -0.1, duration: 0.4 }, 0.1);
    // .5–.75: reframe — lift slightly off the arc line for the card /
    // family beats (small paired move, law 7).
    tl.to(r, { phiOff: -0.45, aimY: -0.02, thetaOff: -0.4, duration: 0.25 }, 0.5);
    // .75–.9: fling — the arc releases, camera accelerates back out
    // (power2.in, the source's link-fling departure).
    tl.to(r, { standoff: 2.6, fov: 33, duration: 0.15, ease: "power2.in" }, 0.75);
    // .9–1: hand the camera back to the base rig pose.
    tl.to(r, { blend: 0, parallaxScale: 1, duration: 0.1 }, 0.9);
    return tl;
  }

  override tickWebgl(progress: number): void {
    super.tickWebgl(progress); // scrubs the recipe timeline

    const r = this.recipe;
    const cs = this.rig.caseSpace;
    if (r.blend <= 0.0001 || cs === null) {
      this.releaseCamera();
      return;
    }

    // Chase the product's clock-derived attitude (live == eval): the view
    // axis is the loop's ring axis (case xAxis), the aim is the loop's
    // lower arc, both rotated with the product.
    const att = productAttitude(getClock());
    this.scratchEuler.set(att.rotX, att.rotY, 0, "XYZ");
    const side = this.scratchBack.copy(cs.xAxis).applyEuler(this.scratchEuler);
    const aim = this.scratchAim
      .copy(cs.origin)
      .addScaledVector(cs.yAxis, ARC_Y)
      .addScaledVector(cs.zAxis, ARC_Z)
      .applyEuler(this.scratchEuler);
    const thetaB = Math.atan2(side.x, side.z);
    const phiB = Math.acos(Math.min(1, Math.max(-1, side.y)));

    const o = this.override;
    o.theta = thetaB + r.thetaOff;
    o.phi = Math.min(Math.PI - 0.15, Math.max(0.15, phiB + r.phiOff));
    o.radius = r.standoff;
    // frame-lateral: aim right of the crest so the band composes low-left
    o.targetX = aim.x + Math.cos(o.theta) * r.lat;
    o.targetZ = aim.z - Math.sin(o.theta) * r.lat;
    o.targetY = aim.y + r.aimY;
    o.fov = r.fov; // macro optics (LOOKBIBLE §6 shot 8: macro 40mm class)
    o.parallaxScale = r.parallaxScale;
    o.blend = r.blend;
    this.overrideActive = true;
    this.rig.setPoseOverride(o);

    // DOF (macro pinned section, §7.9): focus = true camera→crest distance,
    // so the rack rides the SAME beat fractions as the dolly by derivation.
    // post.ts gates it to tier 0; flag released with the blend.
    const api = this.api;
    if (api) {
      if (r.blend > 0.5) {
        const camDist = this.scratchCam
          .set(
            o.targetX + o.radius * Math.sin(o.phi) * Math.sin(o.theta),
            o.targetY + o.radius * Math.cos(o.phi),
            o.targetZ + o.radius * Math.sin(o.phi) * Math.cos(o.theta),
          )
          .distanceTo(this.scratchAim.set(aim.x, aim.y + r.aimY, aim.z));
        const focus = Math.round(camDist * 1e3) / 1e3;
        if (!this.dofActive || focus !== this.lastDofFocus) {
          this.dofActive = true;
          this.lastDofFocus = focus;
          api.gl.setDof(true, focus);
        }
      } else if (this.dofActive) {
        this.dofActive = false;
        api.gl.setDof(false);
      }
    }
  }

  private releaseCamera(): void {
    if (this.overrideActive) {
      this.overrideActive = false;
      this.rig.setPoseOverride(null);
    }
    if (this.dofActive) {
      this.dofActive = false;
      this.api?.gl.setDof(false);
    }
  }

  /* ---- lifecycle ---------------------------------------------------------- */

  override onEnterCenter(): void {
    this.element.classList.add("is-center");
  }

  override onLeaveCenter(): void {
    this.element.classList.remove("is-center");
  }

  /** Belt-and-braces: never leak the macro camera or DOF past the track. */
  override onLeave(): void {
    this.releaseCamera();
  }

  /** Debug API is installed later in the same boot tick sections are
   *  constructed in; every consumer here runs on frames, after install. */
  private get api(): OneHertzDebugApi | null {
    return "__ONE_HERTZ__" in window ? window.__ONE_HERTZ__ : null;
  }
}

/* ---- markup --------------------------------------------------------------- */

function splitChars(word: string): string {
  return Array.from(word)
    .map((c) => (c === " " ? " " : `<span class="strp__char">${c}</span>`))
    .join("");
}

function buildMarkup(): string {
  // Boot tick = the boot config's band (sections build before any swap).
  const bootBand = CONFIGS[0]?.band;
  const famItems = FAMILY.map(
    (f) =>
      `<li class="strp__fam-item${f.band === bootBand ? " strp__fam-item--live" : ""}" data-band="${f.band}">${f.label}</li>`,
  ).join("\n        ");
  return `
    <div class="strp__scrim" aria-hidden="true"></div>
    <header class="strp__head">
      <p class="strp__eyebrow">${EYEBROW}</p>
      <h2 class="strp__title">
        <span class="strp__t-line strp__t-ghost" aria-label="${TITLE_GHOST}">${splitChars(TITLE_GHOST)}</span>
        <span class="strp__t-line strp__t-solid" aria-label="${TITLE_SOLID}">${splitChars(TITLE_SOLID)}</span>
      </h2>
      <div class="strp__body">
        ${BODY_LINES.map((l) => `<p class="strp__line">${l}</p>`).join("\n        ")}
      </div>
    </header>
    <div class="strp__card">
      <p class="strp__eyebrow">${CARD_EYEBROW}</p>
      <p class="strp__value">
        <span class="strp__num tnum" data-bpm>${BPM_FROM}</span><span class="strp__denom tnum"> / ${BPM_MAX}</span>
      </p>
      <p class="strp__unit">${CARD_UNIT}</p>
      <p class="strp__caption">${CARD_CAPTION}</p>
    </div>
    <div class="strp__family">
      <p class="strp__eyebrow">${FAMILY_LABEL}</p>
      <ul class="strp__fam-list">
        ${famItems}
      </ul>
      <p class="strp__caption">${FAMILY_CAPTION}</p>
    </div>
  `;
}
