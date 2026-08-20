/**
 * Intro — the hero (unpinned 100svh; the single most-judged frame of the
 * site). Colossal "ONE / HERTZ" lockup upper-left (Clash 300, §4
 * stagger-indent law), the real Ultra 3 composed lower-right standing on
 * its contact shadow, sub-line beneath the lockup, living-BPM vital anchor
 * top-right (P3 wires the signal), grey spec lines bottom-left — the
 * ink/porcelain diagonal staging the look bible names as the site's
 * editorial signature. Lighting is entirely the keyframe driver's (§1.5 #1:
 * rot 0 · envInt 1.0 · exposure 1.05 — the pose the 9-point sweep
 * validated); this section invents no lighting.
 *
 * Dual timelines (engine contract, docs/p1/engine.md §1 — domains declared
 * per motion-bible law 4):
 *   - DOM channel (scrub-fraction domain, PAUSED GSAP timeline padded to 1
 *     + imperative reveal work): scrub:true transform grammar — the hint
 *     dies by p≈.15, lockup/eyebrow/spec depart power2.in (things leaving
 *     accelerate), scrubbed opacity linear; scrub:2 grey-line color
 *     reveals on the spec lines (#BCBCBC→#323232, the light-ground greys,
 *     §7.3) with the 2 s catch-up lag live and instant targets under
 *     `?eval=1` (Mechanism precedent — settle passes run with dt=0).
 *   - WebGL channel (scrub-fraction domain): hero camera recipe composed
 *     into a CameraPoseOverride each frame. The azimuth CHASES the
 *     product's clock-derived attitude (stage.productAttitude), so the
 *     dial faces the camera at any page clock — live == eval == solo (in
 *     solo the clock spans 0..1 across this one section and the product
 *     turns a full revolution; a static theta would shoot the case back).
 *     Beats: hold the hero frame 0–.4, release blend→0 over .4–.9
 *     (power3.inOut — the one big move per beat, law 7), handing the
 *     camera to the base rig pose for Timeless. Parallax stays live (the
 *     hero is an invitation, not a macro).
 *
 * Wall-clock domain (loader-exit chain only, §8 slot table: .4 + 1.2 + 2.0
 * entrance + 1.2 title): when the loader begins its dismiss, the watch
 * enters from depth onto the contact shadow — product z −7→0 / y 1.35→0
 * with a rotation settle (−.3π, .45π)→0 on the watch root, 2.0 s
 * power3.out (source-exact: "loader→watch entrance"), while the title
 * chars slide in x:−105%→0, 1.2 s power3.out, stagger .12, opacity linear
 * over the first half. Live only — `?eval=1` skips all choreography and
 * boots at the settled frame (deterministic captures).
 *
 * Loader hand-off (P3): the activity-rings match-cut is P3 work; this
 * section ships the named destination anchor `LOADER_RINGS_ANCHOR` (the
 * hero dial's screen position) plus the BPM vital anchor `BPM_VITAL_ANCHOR`
 * — both queryable data-anchor hooks, no behavior attached here.
 *
 * State contract (truthful): consumes the page-load defaults, changes
 * nothing — camera override blends fully out by p=.9, no state axis is
 * written, exit guarantees exactly what it received.
 */

import { gsap } from "gsap";
import { getClock } from "../core/clock";
import { isEvalMode } from "../core/determinism";
import { params } from "../core/params";
import { SectionBase, timelineAdapter } from "../core/section";
import { productAttitude } from "../webgl/stage";
import type { CameraPoseOverride, CameraRig } from "../webgl/cameraRig";
import { getStage } from "./stageRef";
import "./intro.css";

/* ---- named anchors (P3 wiring contract) ----------------------------------- */

/** Loader activity-rings match-cut destination (hero dial screen position). */
export const LOADER_RINGS_ANCHOR = '[data-anchor="loader-rings"]';
/** Living-BPM vital (top-right); P3 drives value + arc from `bpm()`. */
export const BPM_VITAL_ANCHOR = '[data-anchor="bpm-vital"]';

/* ---- copy (LOOKBIBLE §8 budgets — hero: 2 lines ≤14 + sub ≤48) ------------ */

const EYEBROW = "CHEN PRESENTS"; // 13 ≤ 18 caps
const TITLE_LINE_1 = "ONE"; // 3 ≤ 14
const TITLE_LINE_2 = "HERTZ"; // 5 ≤ 14
const SUB = "the watch regulated by a human heart"; // 36 ≤ 48
const SPEC_A = "REGULATED · 1 HZ"; // 16 ≤ 18 caps (label budget)
const SPEC_B = "TITANIUM · 49 MM"; // 16 ≤ 18 caps

/* ---- hero camera recipe (LOOKBIBLE §1.5 #1 pose; base rig continuity) ----- */

/** Base rig pose at scrub 0 (cameraRig proxy boot values) — the blend-out
 *  must land here so Timeless inherits a seamless camera. */
const THETA_BASE = 0.2;
const PHI_BASE = 1.35;

interface HeroRecipe {
  /** 0..1 — how much the hero frame owns the camera. */
  blend: number;
  /** dolly distance (base rig holds 6 — a touch closer for presence). */
  radius: number;
  /** frame-lateral shift: aim left of the case → watch composes right. */
  lat: number;
  /** aim height above origin → watch sinks onto its shadow, lower frame. */
  sink: number;
  /** azimuth offset off the chased hero azimuth (gentle 3/4). */
  thetaOff: number;
  /** polar offset — slightly more level than base (monumental read). */
  phiOff: number;
}

/* ---- entrance (wall-clock, source-exact loader→watch chain) ---------------- */

const ENTER_Z = -7; // depth the watch enters from (world units)
const ENTER_Y = 1.35; // drop height onto the contact shadow
const ENTER_ROT_X = -0.3 * Math.PI;
const ENTER_ROT_Y = 0.45 * Math.PI;

/* ---- grey-line reveals (scrub-fraction windows; §3 alternating offsets) ---- */

interface RevealLine {
  el: HTMLElement;
  win: [number, number];
  value: number;
  target: number;
}

const REVEAL_FROM = 0xbcbcbc; // light-ground from-grey (motion bible §3)
const REVEAL_TO = 0x323232; // light-ground ink-in target (§7.3)
/** scrub:2 catch-up rate (≈2 s to visually settle; live only). */
const REVEAL_LAG_K = 2.2;

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function windowProgress(p: number, [a, b]: [number, number]): number {
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

export class IntroSection extends SectionBase {
  private readonly recipe: HeroRecipe = {
    blend: 1,
    radius: 5.65,
    lat: 0.53,
    sink: 0.34, // keeps the contact shadow inside the frame — the watch STANDS
    thetaOff: 0.1,
    phiOff: -0.06, // camera a touch above base — the shadow ellipse opens
  };
  private readonly override: CameraPoseOverride = {
    theta: THETA_BASE,
    phi: PHI_BASE,
    radius: 5.5,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    fov: 35,
    parallaxScale: 1,
    blend: 0,
  };
  private overrideActive = false;

  private readonly reveals: RevealLine[];
  private entranceTl: gsap.core.Timeline | null = null;
  private entranceArmed = false;
  private inView = false;

  constructor(private readonly rig: CameraRig) {
    super({
      name: "Intro",
      // Truthful contract: consumes the page-load defaults, changes nothing.
      requiredEnterState: { camera: "intro-hero", explode: "assembled" },
      guaranteedExitState: {},
    });

    const pin = this.element.querySelector<HTMLElement>(".pin");
    if (!pin) throw new Error("Intro: track has no .pin");
    pin.className = "pin intro";
    // The hero is a longpress beat (default zoom 1.35, law 8 table);
    // fixed cursor vocabulary (LOOKBIBLE §8).
    pin.dataset["cursorText"] = "holdToExplore";
    pin.innerHTML = buildMarkup();

    const q = (sel: string): HTMLElement => {
      const el = pin.querySelector<HTMLElement>(sel);
      if (!el) throw new Error(`Intro: missing ${sel}`);
      return el;
    };

    // Split-char prep: each title line becomes per-char spans under an
    // overflow-clipped line (source grammar: chars slide from x:-105%).
    for (const line of pin.querySelectorAll<HTMLElement>(".intro__line")) {
      const text = line.textContent ?? "";
      line.textContent = "";
      for (const ch of text) {
        const span = document.createElement("span");
        span.className = "intro__char";
        span.textContent = ch;
        line.append(span);
      }
    }

    this.reveals = [
      { el: q(".intro__spec-line--a"), win: [0.05, 0.2], value: 0, target: 0 },
      { el: q(".intro__spec-line--b"), win: [0.1, 0.28], value: 0, target: 0 },
    ];

    this.addDomAdapter(timelineAdapter(this.buildDomTimeline(pin)));
    this.addWebglAdapter(timelineAdapter(this.buildCameraTimeline()));

    // Solo-sandbox runway: an unpinned 100svh track alone on the page has
    // maxScroll 0 — localProgress can never persist past the next frame
    // (the engine recomputes it from raw scroll). One extra viewport of
    // plain ground below restores the traversal so `?solo=Intro` scrubs
    // exactly like the full page. Injected in the constructor, BEFORE
    // boot's registry.measure() + engine.refresh(), so Lenis learns the
    // limit (engine pitfall #1). Sandbox only — never on the real page.
    // Reusable pattern for the other unpinned lanes (Timeless/Images/
    // Parts/Footer).
    if (params.solo === "Intro") {
      const runway = document.createElement("div");
      runway.style.height = "100svh";
      runway.setAttribute("aria-hidden", "true");
      this.element.insertAdjacentElement("afterend", runway);
    }

    if (!isEvalMode) {
      // Pre-entrance state (live only): everything the loader-exit chain
      // brings in starts hidden; the watch parks at entry depth so the
      // stage never shows a resting hero through the loader's dismiss fade.
      const chars = pin.querySelectorAll<HTMLElement>(".intro__char");
      gsap.set(chars, { xPercent: -105, opacity: 0 });
      gsap.set(q(".intro__eyebrow"), { opacity: 0, y: 12 });
      gsap.set(q(".intro__sub"), { opacity: 0, y: 16 });
      gsap.set(q(".intro__vital"), { opacity: 0 });
      gsap.set(q(".intro__spec"), { opacity: 0 });
      gsap.set(q(".intro__hint"), { opacity: 0 });
      const stage = getStage();
      if (stage) {
        stage.product.position.z = ENTER_Z;
        stage.product.position.y = ENTER_Y;
      }
      // scrub:2 catch-up lag rides the shared ticker (live only — eval
      // applies targets directly in tickDom, settle passes run dt=0).
      gsap.ticker.add((_t, deltaMs) => this.tickLag(deltaMs / 1000));
    }
  }

  /* ---- DOM channel (scrub-fraction domain, padded to 1) ------------------- */

  private buildDomTimeline(pin: HTMLElement): gsap.core.Timeline {
    const q = (sel: string): HTMLElement => {
      const el = pin.querySelector<HTMLElement>(sel);
      if (!el) throw new Error(`Intro: missing ${sel}`);
      return el;
    };
    const lockup = q(".intro__lockup");
    const eyebrow = q(".intro__eyebrow");
    const spec = q(".intro__spec");
    const vital = q(".intro__vital");
    const hint = q(".intro__hint");

    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });

    // The hint dies first — it has done its job (scrubbed opacity linear).
    tl.to(hint, { opacity: 0, duration: 0.13 }, 0.02);

    // Departures accelerate away (power2.in); opacity stays linear.
    tl.to(eyebrow, { y: -14, duration: 0.2, ease: "power2.in" }, 0.28);
    tl.to(eyebrow, { opacity: 0, duration: 0.18 }, 0.28);
    tl.to(lockup, { yPercent: -28, duration: 0.3, ease: "power2.in" }, 0.3);
    tl.to(lockup, { opacity: 0, duration: 0.26 }, 0.32);
    tl.to(spec, { y: -20, duration: 0.18, ease: "power2.in" }, 0.52);
    tl.to(spec, { opacity: 0, duration: 0.16 }, 0.52);
    // The vital holds longest — the instrument stays on watch as copy leaves.
    tl.to(vital, { opacity: 0, duration: 0.2 }, 0.58);

    tl.call(() => {}, [], 1); // pad to exactly 1 (WebGL-group padding grammar)
    return tl;
  }

  override tickDom(progress: number): void {
    super.tickDom(progress);

    // Entrance trigger: the loader dismiss (fade start or removal) is the
    // wall-clock zero of the loader-exit chain. Live only; polled here
    // because sections have no loader seam (cheap until armed).
    if (!this.entranceArmed && !isEvalMode) {
      const loader = document.getElementById("loader");
      if (loader === null || Number(getComputedStyle(loader).opacity) < 0.999) {
        this.armEntrance();
      }
    }

    // Grey-line reveals: targets from progress windows; instant under
    // eval (deterministic captures), lagged on the ticker live.
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

  /* ---- WebGL channel (scrub-fraction domain, padded to 1) ----------------- */

  private buildCameraTimeline(): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });
    // Hold the hero frame 0–.4, then ONE move: release the override so the
    // base rig pose (Timeless neighborhood) takes the camera by .9 (law 7:
    // dim/overrides restored before exit).
    tl.to(this.recipe, { blend: 0, duration: 0.5 }, 0.4);
    tl.call(() => {}, [], 1);
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

    // Chase the product's clock-derived yaw so the dial faces the camera at
    // any page clock (solo spins the product a full turn across this one
    // section). Pure function of clock + progress — eval-settle safe.
    const att = productAttitude(getClock());
    const o = this.override;
    o.theta = att.rotY + THETA_BASE + r.thetaOff;
    o.phi = PHI_BASE + r.phiOff;
    o.radius = r.radius;
    // Aim left of the case (screen-right axis) → the watch composes right;
    // aim above the origin → the watch sinks onto its contact shadow.
    o.targetX = -Math.cos(o.theta) * r.lat;
    o.targetZ = Math.sin(o.theta) * r.lat;
    o.targetY = r.sink;
    o.fov = 35;
    o.parallaxScale = 1; // the hero invites parallax — not a macro beat
    o.blend = r.blend;
    this.overrideActive = true;
    this.rig.setPoseOverride(o);
  }

  /* ---- entrance (wall-clock domain — loader-exit chain, live only) -------- */

  private armEntrance(): void {
    this.entranceArmed = true;
    const pin = this.element.querySelector<HTMLElement>(".pin");
    if (!pin) return;
    const chars = pin.querySelectorAll<HTMLElement>(".intro__char");
    const tl = gsap.timeline();

    const stage = getStage();
    if (stage) {
      // Watch enters from depth onto the contact shadow — 2.0 s power3.out
      // (source-exact loader→watch entrance; position pre-offset at boot).
      tl.to(stage.product.position, { y: 0, z: 0, duration: 2, ease: "power3.out" }, 0);
      const root = stage.watch?.root ?? null;
      if (root) {
        // Rotation settle rides the watch root (stage.render owns
        // product.rotation absolutely — offsets there would be clobbered).
        const bx = root.rotation.x;
        const by = root.rotation.y;
        const off = { rx: ENTER_ROT_X, ry: ENTER_ROT_Y };
        root.rotation.x = bx + off.rx;
        root.rotation.y = by + off.ry;
        tl.to(
          off,
          {
            rx: 0,
            ry: 0,
            duration: 2,
            ease: "power3.out",
            onUpdate: () => {
              root.rotation.x = bx + off.rx;
              root.rotation.y = by + off.ry;
            },
            onComplete: () => {
              root.rotation.x = bx; // exact base restored — no residue
              root.rotation.y = by;
            },
          },
          0,
        );
      }
    }

    // Title chars: 1.2 s power3.out, stagger .12, opacity linear first half.
    tl.to(chars, { xPercent: 0, duration: 1.2, ease: "power3.out", stagger: 0.12 }, 0.15);
    tl.to(chars, { opacity: 1, duration: 0.6, ease: "none", stagger: 0.12 }, 0.15);
    // Supporting copy settles in on the wall-clock scale {0.4, 0.8}.
    tl.to(".intro__eyebrow", { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, 0.9);
    tl.to(".intro__vital", { opacity: 1, duration: 0.8, ease: "power3.out" }, 1.0);
    tl.to(".intro__sub", { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, 1.2);
    tl.to(".intro__spec", { opacity: 1, duration: 0.8, ease: "power3.out" }, 1.5);
    tl.to(".intro__hint", { opacity: 1, duration: 0.4, ease: "none" }, 1.9);

    this.entranceTl = tl;
    // Deep-linked boots land elsewhere: snap the chain to its settled end
    // (the watch must not fly through a Mechanism frame).
    if (!this.inView) tl.progress(1);
  }

  /* ---- lifecycle ---------------------------------------------------------- */

  override onEnter(): void {
    this.inView = true;
  }

  override onLeave(): void {
    this.inView = false;
    // Never let the entrance run off-screen; finish it (restores exact
    // base transforms via onComplete) and release the camera.
    if (this.entranceTl && this.entranceTl.progress() < 1) {
      this.entranceTl.progress(1);
    }
    if (this.overrideActive) {
      this.overrideActive = false;
      this.rig.setPoseOverride(null);
    }
  }
}

/* ---- markup ---------------------------------------------------------------- */

function buildMarkup(): string {
  return `
    <p class="intro__eyebrow">${EYEBROW}</p>
    <div class="intro__vital" data-anchor="bpm-vital" data-vital="bpm">
      <svg class="intro__vital-ring" viewBox="0 0 32 32" aria-hidden="true">
        <circle class="intro__vital-track" cx="16" cy="16" r="13" />
        <circle class="intro__vital-fill" cx="16" cy="16" r="13" pathLength="100" />
      </svg>
      <p class="intro__vital-read">
        <span class="intro__vital-value tnum" data-vital-value>64</span>
        <span class="intro__vital-unit">BPM</span>
      </p>
    </div>
    <header class="intro__lockup">
      <h1 class="intro__title" aria-label="${TITLE_LINE_1} ${TITLE_LINE_2}">
        <span class="intro__line" aria-hidden="true">${TITLE_LINE_1}</span>
        <span class="intro__line intro__line--2" aria-hidden="true">${TITLE_LINE_2}</span>
      </h1>
      <p class="intro__sub">${SUB}</p>
    </header>
    <div class="intro__spec">
      <p class="intro__spec-line intro__spec-line--a">${SPEC_A}</p>
      <p class="intro__spec-line intro__spec-line--b">${SPEC_B}</p>
    </div>
    <p class="intro__hint">SCROLL</p>
    <div class="intro__rings-anchor" data-anchor="loader-rings" aria-hidden="true"></div>
  `;
}
