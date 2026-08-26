/**
 * Curves — BPM catalog card #1: "58 / 220 bpm — Guarded Contours"
 * (PLAN §2: catalog cards as BPM pages with a shared denominator,
 * 58 → 96 → 142 over /220, on Curves / Hands / Straps).
 *
 * Source grammar translated verbatim (Curves_* reference frames): the
 * catalog-card page — hairline crosshair guides with small "+" marks,
 * centered pre-title index, colossal two-line headline, two-line sub-copy,
 * the watch rising into the lower half as a macro. Semantic swap: the
 * source celebrates "elegant contours"; ONE HERTZ's card reads the case as
 * armor — the sapphire dome curving into the titanium chamfer, the raised
 * lip that guards the glass — priced in resting heartbeats: 58 over the
 * page-flip denominator 220 (max heart rate). Hands (96) and Straps (142)
 * inherit THIS card grammar: same figure block, same denominator, only the
 * numerator and story flip (documented in docs/p2/section-Curves.md).
 *
 * Lighting is entirely the infra-gl keyframe driver's (instrument.json
 * Curves key: rot 170 · envInt 1.0 — "streak strip grazes the chamfer,
 * light rehearses the copy"; no bgStage ⇒ porcelain ground). This lane
 * invents no lighting. Scrims ride the live --porcelain token (§7.1);
 * grey-line reveals use the LIGHT-ground pair #BCBCBC → #323232 (§7.3).
 *
 * Timelines (motion bible law 4 — domains declared):
 *   - DOM: scrub-fraction domain, PAUSED GSAP timeline padded to 1.
 *     Split-char headline entrances = scrub:true grammar (xPercent −105→0
 *     power3.out + linear opacity over the first half, §3); hairline
 *     guides draw via scale transforms power3.out (the --bar-scale
 *     grammar); figure block arrives power3.out; departures power2.in,
 *     gone by p≈.89 (before the .9 blend-out — wave-1 Mechanism grammar).
 *     Grey-line color reveals = scrub:2 grammar, imperative with a ~2 s
 *     catch-up lag live / instant under ?eval=1 (Movement's pattern —
 *     motion bible §7.10). BPM numerator counts 0→58 as a pure linear map
 *     of progress (data honesty; Clash 300 numerals, tabular).
 *   - WebGL: scrub-fraction domain, PAUSED GSAP timeline animating a
 *     private camera recipe composed into a CameraPoseOverride (blend
 *     0→1→0 inside the window — the base rig owns both edges, so the
 *     handoffs from Movement and into MovementWatchRight are seamless).
 *     Beats on the fraction grid: blend-in .0–.12 (parallax gated off —
 *     macro law 7) with the watch composed frame-RIGHT (the source's
 *     sweep-right entering Curves) · recenter .1–.4 while the ONE big
 *     dolly .15–.5 dives onto the dome/chamfer macro · small theta drift
 *     .5–.75 (the rot-170 streak crawls the chamfer under a moving eye) ·
 *     ease-back .75–.9 (closer ~0.5× the opener, law 3 shape) · blend-out
 *     .9–1. Pose CHASES the dial normal through caseSpace +
 *     productAttitude(clock) — live == eval == solo (wall time banned,
 *     law 9); phi offset NEGATIVE = camera above the dial normal, looking
 *     down the sapphire dome into the chamfer; target raised above the
 *     screen center so the case composes low, under the headline.
 *
 * State contract (truthful): requires the watch assembled (the macro
 * frames the case; an exploded fan here is nonsense); guarantees nothing
 * changed — the override blends fully out and no state axis is written.
 * If the GLB failed to load (caseSpace null) the override never activates
 * and the DOM card still owns the beat — degrades, never breaks.
 */

import { gsap } from "gsap";
import { Euler, Vector3 } from "three";
import { getClock } from "../core/clock";
import { extendState } from "../core/debug";
import { isEvalMode } from "../core/determinism";
import { SectionBase, timelineAdapter } from "../core/section";
import type { CameraPoseOverride, CameraRig } from "../webgl/cameraRig";
import { productAttitude } from "../webgl/stage";
import "./curves.css";

/* ---- copy (working copy per LOOKBIBLE §8 budgets — P4 polishes wording) --- */

/** Pre-title index — section number + catalog page counter (≤18 chars caps;
 *  the "07" keeps the site's numbered eyebrow spine intact — gate-3
 *  continuity: Movement 06 → Curves 07 → MWR 08). */
const PRE_TITLE = "07 · CATALOG 01/03";
/** Headline ≤3 lines · ≤18 chars/line at colossal. */
const HEADLINE_LINES = ["GUARDED", "CONTOURS"];
/** Sub-copy: the raised guarding lip (grey-line reveal pair, ≤220 each). */
const SUB_LINES = [
  "The sapphire dome falls away into a titanium chamfer.",
  "A raised lip guards the glass, machined from the case.",
];
/** BPM card figure: value + unit mono · caption ≤60 chars (§8). */
const BPM_VALUE = 58;
const BPM_DENOMINATOR = "/ 220 bpm";
const CAPTION = "Resting rate. The raised lip stands guard.";
/** Shared-denominator page-flip rail (Curves=01 · Hands=02 · Straps=03). */
const PAGES = ["01", "02", "03"];
const ACTIVE_PAGE = 0;

/* ---- grey-line reveals (scrub:2 grammar — LIGHT-ground colors, §7.3) ------ */

const REVEAL_FROM = 0xbcbcbc;
const REVEAL_TO = 0x323232;
/** scrub:2 catch-up rate (≈2 s visual settle — Movement/Mechanism constant). */
const REVEAL_LAG_K = 2.2;
/** Per-line reveal centers; half-widths alternate .06/.10 (the 15/25 law). */
const REVEAL_CENTERS = [0.27, 0.36];
const REVEAL_HALF = [0.06, 0.1];

interface RevealLine {
  el: HTMLElement;
  win: [number, number];
  value: number;
  target: number;
}

/** BPM numerator counts 0→58 across this progress window (linear — data;
 *  resolved BY the .5 macro hold so the card reads "58" at its center). */
const BPM_WINDOW: readonly [number, number] = [0.38, 0.5];

/* ---- camera recipe -------------------------------------------------------- */

interface CameraRecipe {
  blend: number;
  /** Camera distance from the (raised) aim point, world units. */
  standoff: number;
  /** Azimuth offset off the dial normal — slight 3/4 twist. */
  thetaOff: number;
  /** Polar offset off the dial normal — NEGATIVE = camera above, looking
   *  down the dome into the chamfer (the guarding-lip read). */
  phiOff: number;
  /** Frame-lateral aim shift: negative = aim left ⇒ watch composes RIGHT
   *  (the source's sweep-right entry), 0 = centered. */
  lat: number;
  /** Aim raised above the screen center ⇒ case composes LOW in frame,
   *  under the headline (source composition). */
  raise: number;
  parallaxScale: number;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function win(p: number, [a, b]: readonly [number, number]): number {
  return clamp01((p - a) / (b - a));
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function mixHex(from: number, to: number, t: number): string {
  const f = { r: (from >> 16) & 255, g: (from >> 8) & 255, b: from & 255 };
  const o = { r: (to >> 16) & 255, g: (to >> 8) & 255, b: to & 255 };
  const r = Math.round(f.r + (o.r - f.r) * t);
  const g = Math.round(f.g + (o.g - f.g) * t);
  const b = Math.round(f.b + (o.b - f.b) * t);
  return `rgb(${r} ${g} ${b})`;
}

export class CurvesSection extends SectionBase {
  private readonly recipe: CameraRecipe = {
    blend: 0,
    standoff: 5.4,
    thetaOff: 0.14,
    phiOff: -0.45,
    lat: -0.6,
    raise: 0.8,
    parallaxScale: 1,
  };
  private readonly override: CameraPoseOverride = {
    theta: 0,
    phi: 1.2,
    radius: 5.4,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    fov: 35,
    parallaxScale: 1,
    blend: 0,
  };
  private overrideActive = false;
  private readonly scratchEuler = new Euler();
  private readonly scratchNormal = new Vector3();
  private readonly scratchAim = new Vector3();

  private readonly reveals: RevealLine[];
  private readonly bpmEl: HTMLElement;
  private lastBpm = -1;

  constructor(private readonly rig: CameraRig) {
    super({
      name: "Curves",
      requiredEnterState: { explode: "assembled" },
      guaranteedExitState: {},
      // longpress zoom stays the default 1.35 (law 8 table) — the hold
      // dives deeper onto the chamfer while the override owns the frame.
    });

    const pin = this.element.querySelector<HTMLElement>(".pin");
    if (!pin) throw new Error("Curves: track has no .pin");
    pin.className = "pin crv";
    pin.dataset["cursorText"] = "holdToExplore"; // fixed vocabulary (§8)
    pin.innerHTML = buildMarkup();

    const q = <T extends Element>(sel: string): T => {
      const el = pin.querySelector<T>(sel);
      if (!el) throw new Error(`Curves: missing ${sel}`);
      return el;
    };

    this.bpmEl = q<HTMLElement>("[data-bpm]");
    this.reveals = Array.from(pin.querySelectorAll<HTMLElement>(".crv__subline")).map(
      (el, i) => ({
        el,
        win: [
          (REVEAL_CENTERS[i] ?? 0.4) - (REVEAL_HALF[i] ?? 0.08),
          (REVEAL_CENTERS[i] ?? 0.4) + (REVEAL_HALF[i] ?? 0.08),
        ] as [number, number],
        value: 0,
        target: 0,
      }),
    );

    this.addDomAdapter(timelineAdapter(this.buildDomTimeline(pin)));
    this.addWebglAdapter(timelineAdapter(this.buildCameraTimeline()));

    // scrub:2 catch-up lag on the shared ticker (live only — eval applies
    // targets directly in tickDom so settleSync is already the fixed point)
    if (!isEvalMode) {
      gsap.ticker.add((_t, deltaMs) => this.tickLag(deltaMs / 1000));
    }

    extendState("curves", () => ({
      blend: Math.round(this.recipe.blend * 1e4) / 1e4,
      standoff: Math.round(this.recipe.standoff * 1e3) / 1e3,
      bpm: this.lastBpm,
    }));
  }

  /* ---- DOM channel -------------------------------------------------------- */

  private buildDomTimeline(pin: HTMLElement): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    const q = (sel: string): HTMLElement | null => pin.querySelector<HTMLElement>(sel);

    const pretitle = q(".crv__pretitle");
    const card = q(".crv__card");
    const sub = q(".crv__sub");
    const figure = q(".crv__figure");
    const guideVt = q(".crv__guide--vt");
    const guideHz = q(".crv__guide--hz");
    const marks = pin.querySelectorAll<HTMLElement>(".crv__mark");

    // Hairline guides draw in (the source's technical crosshair — the
    // scrub:true --bar-scale grammar: scale transforms, power3.out).
    if (guideHz) {
      tl.fromTo(
        guideHz,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.16, ease: "power3.out" },
        0.06,
      );
    }
    if (guideVt) {
      tl.fromTo(
        guideVt,
        { scaleY: 0 },
        { scaleY: 1, duration: 0.16, ease: "power3.out" },
        0.08,
      );
    }
    tl.fromTo(marks, { opacity: 0 }, { opacity: 1, duration: 0.05, stagger: 0.02 }, 0.1);

    // Pre-title index — arrival from off-frame: power3.out + linear opacity.
    if (pretitle) {
      tl.fromTo(pretitle, { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.04);
      tl.fromTo(
        pretitle,
        { y: 12 },
        { y: 0, duration: 0.06, ease: "power3.out" },
        0.04,
      );
    }

    // Headline split-char entrances per line (scrub:true grammar §3):
    // x slides power3.out, opacity linear over the first half of the slide.
    const lines = Array.from(pin.querySelectorAll<HTMLElement>(".crv__line"));
    lines.forEach((line, i) => {
      const chars = Array.from(line.querySelectorAll<HTMLElement>(".crv__char"));
      const at = 0.07 + i * 0.04;
      tl.fromTo(
        chars,
        { xPercent: -105 },
        { xPercent: 0, duration: 0.09, ease: "power3.out", stagger: 0.006 },
        at,
      );
      tl.fromTo(
        chars,
        { opacity: 0 },
        { opacity: 1, duration: 0.045, stagger: 0.006 }, // linear, first half
        at,
      );
    });

    // Sub-copy block (its line COLORS are the imperative scrub:2 channel).
    if (sub) {
      tl.fromTo(sub, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.18);
      tl.fromTo(sub, { y: 18 }, { y: 0, duration: 0.07, ease: "power3.out" }, 0.18);
    }

    // Figure block — the BPM page number rises as the macro lands (@.36,
    // just ahead of its count window). The count itself is imperative.
    if (figure) {
      tl.fromTo(figure, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.36);
      tl.fromTo(figure, { y: 30 }, { y: 0, duration: 0.09, ease: "power3.out" }, 0.36);
    }

    // Departures — things leaving accelerate away (power2.in), fully gone
    // by ≈.89, before the camera blend-out at .9 (wave-1 gating grammar).
    if (card) {
      tl.to(card, { opacity: 0, duration: 0.05 }, 0.84);
      tl.to(card, { y: -40, duration: 0.05, ease: "power2.in" }, 0.84);
    }
    if (figure) {
      tl.to(figure, { opacity: 0, duration: 0.05 }, 0.84);
      tl.to(figure, { y: -24, duration: 0.05, ease: "power2.in" }, 0.84);
    }
    if (guideHz) tl.to(guideHz, { opacity: 0, duration: 0.04 }, 0.85);
    if (guideVt) tl.to(guideVt, { opacity: 0, duration: 0.04 }, 0.85);
    tl.to(marks, { opacity: 0, duration: 0.04 }, 0.85);

    tl.call(() => {}, [], 1); // pad to exactly 1 (WebGL-group grammar §2)
    return tl;
  }

  override tickDom(progress: number): void {
    super.tickDom(progress);

    // Grey-line reveal targets (lagged live, instant under eval).
    for (const line of this.reveals) {
      line.target = win(progress, line.win);
      if (isEvalMode) {
        line.value = line.target;
        this.applyReveal(line);
      }
    }

    // BPM numerator 0→58: pure linear map of progress (the number IS the
    // scroll — data honesty; Nocturne's Sleep Score precedent).
    const bpm = Math.round(BPM_VALUE * win(progress, BPM_WINDOW));
    if (bpm !== this.lastBpm) {
      this.lastBpm = bpm;
      this.bpmEl.textContent = String(bpm);
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
    // .0–.12: blend over while Movement's turntable blends out; parallax
    // off for the macro (law 7). The watch enters composed frame-right.
    tl.to(r, { blend: 1, parallaxScale: 0, duration: 0.12 }, 0);
    // .1–.4: recenter (the source's sweep-right → centered-by-.5 shape).
    tl.to(r, { lat: 0, duration: 0.3 }, 0.1);
    // .15–.5: THE one big move — dolly down the dial normal onto the
    // dome/chamfer macro; the raised lip fills the lower frame.
    tl.to(r, { standoff: 3.5, duration: 0.35 }, 0.15);
    // .5–.75: small theta drift — the rot-170 streak crawls the chamfer
    // under a moving eye (paired small move, ≤.25 window — law 7).
    tl.to(r, { thetaOff: 0.34, duration: 0.25 }, 0.5);
    // .75–.9: ease back off (closer runs ~0.5× the opener, law 3 shape).
    tl.to(r, { standoff: 4.2, duration: 0.15 }, 0.75);
    // .9–1: hand the frame back to the base rig for MovementWatchRight.
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

    // Chase the dial normal through the product's idle attitude so the
    // macro holds at any page clock (live == eval == solo — Nocturne's
    // pattern; wall time banned, law 9).
    const att = productAttitude(getClock());
    this.scratchEuler.set(att.rotX, att.rotY, 0, "XYZ");
    const n = this.scratchNormal.copy(cs.zAxis).applyEuler(this.scratchEuler);
    const aim = this.scratchAim.copy(cs.origin).applyEuler(this.scratchEuler);
    const o = this.override;
    o.theta = Math.atan2(n.x, n.z) + r.thetaOff;
    o.phi = Math.min(
      Math.PI - 0.15,
      Math.max(
        0.15,
        Math.acos(Math.min(1, Math.max(-1, n.y))) + r.phiOff,
      ),
    );
    o.radius = r.standoff;
    // Lateral: aim left ⇒ watch composes right (entry sweep); raised aim ⇒
    // the case sits LOW under the headline (source composition).
    o.targetX = aim.x + Math.cos(o.theta) * r.lat;
    o.targetZ = aim.z - Math.sin(o.theta) * r.lat;
    o.targetY = aim.y + r.raise;
    o.fov = 35;
    o.parallaxScale = r.parallaxScale;
    o.blend = r.blend;
    this.overrideActive = true;
    this.rig.setPoseOverride(o);
  }

  /* ---- lifecycle ---------------------------------------------------------- */

  override onEnterCenter(): void {
    // Placeholder-inherited contract: the track marks itself while it owns
    // the viewport center line (engine.md §2; smoke asserts it on Curves).
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

function splitChars(line: string): string {
  return Array.from(line)
    .map((c) => (c === " " ? " " : `<span class="crv__char">${c}</span>`))
    .join("");
}

function buildMarkup(): string {
  const headline = HEADLINE_LINES.map(
    (line) => `<span class="crv__line" aria-hidden="true">${splitChars(line)}</span>`,
  ).join("");
  const sub = SUB_LINES.map((line) => `<p class="crv__subline">${line}</p>`).join("");
  const pages = PAGES.map(
    (p, i) =>
      `<li class="crv__page tnum${i === ACTIVE_PAGE ? " is-active" : ""}">${p}</li>`,
  ).join("");
  return `
    <div class="crv__guides" aria-hidden="true">
      <span class="crv__guide crv__guide--vt"></span>
      <span class="crv__guide crv__guide--hz"></span>
      <span class="crv__mark crv__mark--a">+</span>
      <span class="crv__mark crv__mark--b">+</span>
    </div>
    <div class="crv__scrim" aria-hidden="true"></div>
    <div class="crv__card">
      <p class="crv__pretitle">${PRE_TITLE}</p>
      <h2 class="crv__headline" aria-label="${HEADLINE_LINES.join(" ").toLowerCase()}">${headline}</h2>
      <div class="crv__sub">${sub}</div>
    </div>
    <footer class="crv__figure">
      <p class="crv__value">
        <span class="crv__num tnum" data-bpm>0</span><span class="crv__den tnum">${BPM_DENOMINATOR}</span>
      </p>
      <p class="crv__caption">${CAPTION}</p>
      <ol class="crv__pages" aria-label="catalog pages">${pages}</ol>
    </footer>
  `;
}
