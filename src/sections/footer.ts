/**
 * Footer — the OUTRO (unpinned 100svh, the end slate; LOOKBIBLE §1.5 #15).
 *
 * Two moments share the final viewport, translated from the source's Footer
 * grammar (motion bible §4 "Footer group" + §8 row 15):
 *
 *   1. THE LINEUP — four watches rise from below frame into a face-on
 *      line-up (source: `from y:-3.5, duration .7+i·.1, power4.out`, all at
 *      t=0 — stagger via duration, not offset). Groundwork only: the rise
 *      choreography + per-model labels land here; SELECT/SWAP interaction
 *      and the restart loop are P3 (the pin keeps `data-cursor-text=
 *      "selectModel"` — fixed cursor vocabulary, LOOKBIBLE §8).
 *   2. THE CREDITS SLATE — film-credits card as a designed moment (PLAN §7
 *      provenance law): eyebrow → split-char "ONE HERTZ" wordmark →
 *      biosignal pulse rule → six role/value credit rows → fin line. Copy
 *      inside LOOKBIBLE §8 budgets (credits slate ≤7 lines · ≤44 chars).
 *
 * Dual timelines (engine contract, docs/p1/engine.md §1; domains declared
 * per motion-bible law 4):
 *   - DOM channel: PAUSED fraction-domain GSAP timeline via
 *     `timelineAdapter` — scrub:true transform grammar (arrivals power3.out
 *     + linear opacity, §3) for labels/eyebrow/wordmark chars; grey-line
 *     color reveals ride the scrub:2 grammar on the LIGHT ground
 *     (#BCBCBC→#323232, §7.3) — 2 s catch-up via a gsap.ticker smoother
 *     live, targets applied directly under ?eval=1 (Mechanism/Straps
 *     precedent; settle passes stay synchronous).
 *   - WebGL channel: the lineup rise + a static face-on camera recipe
 *     composed into a `CameraPoseOverride`. Rise is DUAL-DRIVEN: a
 *     scrub-mapped stagger (deterministic — evals and captures are pure
 *     functions of progress) MAX'd with a live wall-clock timeline played
 *     on enter (the source's event-driven rise: watches come up at their
 *     own pace even under a slow scroll; §2 wall-clock scale, .7–1.0 s
 *     band). Eval mode never starts the wall-clock leg (law 9).
 *
 * Camera recipe: LOOKBIBLE §1.6 face-on beauty plate applied to the row —
 * each clone wrapper is rotated by the inverse of `caseSpace.quaternion`
 * so every dial normal faces +Z, then one symmetric frontal pose (slight
 * low angle) frames the four. Radius auto-fits the viewport aspect so the
 * row spans a constant width fraction and the DOM labels align beneath the
 * watches. Lighting is entirely the keyframe driver's Footer key (rot 360
 * — the full-revolution loop close; instrument.json): nothing invented.
 *
 * State contract (truthful): requires the assembled watch (the lineup
 * clones the hero); guarantees nothing changed — hero visibility restored,
 * pose override released, no state axis written.
 */

import { gsap } from "gsap";
import { Group } from "three";
import { isEvalMode } from "../core/determinism";
import { SectionBase, timelineAdapter } from "../core/section";
import { getStage } from "./stageRef";
import type { CameraPoseOverride, CameraRig } from "../webgl/cameraRig";
import "./footer.css";

/* ---- copy (LOOKBIBLE §8 budgets; P4 polishes wording) --------------------- */

const EYEBROW = "A SCROLL FILM"; // ≤18 chars caps
const WORDMARK = "ONE HERTZ"; // the end-slate title card
/** Credits slate: 6 role/value rows + fin = 7 lines, each ≤44 chars (§8). */
const CREDITS: readonly (readonly [string, string])[] = [
  ["built by", "CHEN"],
  ["design language", "“The Watch” by 60fps"],
  ["watch", "Apple USDZ · materials re-authored"],
  ["light", "authored 8-former HDRI · no stock"],
  ["type", "Clash Display · Fraunces · Geist · Inter"],
  ["lineup", "as of watchOS 26 · August 2026"],
];
const FIN = "fin · the heart keeps counting"; // ≤44 chars
/** Model labels under the four watches (family names, Straps rail parity).
 *  Ocean is the geometry on stage; the swap mechanic is P3. */
const MODELS = ["OCEAN", "ALPINE", "TRAIL", "MILANESE"] as const;

/* ---- lineup geometry (world units) ---------------------------------------- */

const LINEUP_COUNT = 4;
/** Uniform clone scale (hero is normalized to world height 2.4). */
const LINEUP_SCALE = 0.68;
/** Horizontal spacing between watch centers. */
const LINEUP_SPACING = 1.85;
/** Final resting height of each wrapper (row sits in the lower third). */
const LINEUP_Y = -0.55;
/** Source rise origin (desktop) — deepened automatically on tall frames. */
const RISE_FROM_MIN = -3.5;

/* ---- camera recipe (face-on plate, LOOKBIBLE §1.6) ------------------------ */

const CAM_FOV = 30;
/** Slight LOW angle: camera a touch below the dial normals (source outro). */
const CAM_PHI = Math.PI / 2 + 0.06;
/** Row span as a fraction of frame width — the labels container width is
 *  derived from the same numbers (4·spacing/visibleWidth = 75vw) so its 4
 *  column centers sit exactly under the 4 watch centers. */
const ROW_SPAN_WORLD = 6.7; // 3·spacing + one watch width at LINEUP_SCALE
const ROW_SPAN_FRACTION = 0.68;
/** radius = FIT_K / aspect keeps the row's width fraction constant. */
const CAM_FIT_K =
  ROW_SPAN_WORLD / (ROW_SPAN_FRACTION * 2 * Math.tan((CAM_FOV * Math.PI) / 360));
const CAM_RADIUS_MAX = 28; // portrait safety — beyond this the row may crop

/* ---- beat windows (fraction grid {.05,.1,.15,.2,.25,.4,.5,.75} anchored;
 * fine beats sized per the motion-bible §2 scrub clusters). Every window is
 * authored to be SETTLED at the capture fractions {.25, .5, .75} — a beat
 * that straddles a capture photographs half-faded (Straps pitfall #1). ---- */

/** Scrub-mapped rise: shared start, staggered durations (source shape). */
const RISE_START = 0.18;
const RISE_DUR_BASE = 0.16;
const RISE_DUR_STEP = 0.05; // watch i lands at .34/.39/.44/.49 — set by .5
/** Live wall-clock rise durations (source-exact: .7 + i·.1, power4.out). */
const RISE_WALL_BASE_S = 0.7;
const RISE_WALL_STEP_S = 0.1;
/** Hero watch hidden while the lineup owns the stage (restored ≤.02 / leave). */
const HERO_HIDE_AT = 0.02;

/** Grey-line reveal windows — starts alternate +.02/+.03 (the 15/25
 *  alternation shape, §3), all complete by .75. */
const REVEAL_WINS: readonly (readonly [number, number])[] = [
  [0.56, 0.63],
  [0.58, 0.65],
  [0.61, 0.68],
  [0.63, 0.7],
  [0.66, 0.73],
  [0.68, 0.75],
];
const REVEAL_FROM = 0xbcbcbc; // motion-bible grey (light ground, §7.3)
const REVEAL_TO = 0x323232;
/** scrub:2 catch-up rate (≈2 s visual settle — Mechanism/Straps constant). */
const REVEAL_LAG_K = 2.2;

/* ---- pure helpers (deterministic — no runtime state) ---------------------- */

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function win(p: number, [a, b]: readonly [number, number]): number {
  return clamp01((p - a) / (b - a));
}

/** power4.out — the hero-entrance ease (motion-bible law 2). */
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
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

interface RevealLine {
  el: HTMLElement;
  win: readonly [number, number];
  value: number;
  target: number;
}

interface CameraRecipe {
  blend: number;
  /** multiplier on the aspect-fit radius (push-in rides this). */
  radiusScale: number;
  targetY: number;
  parallaxScale: number;
}

export class FooterSection extends SectionBase {
  private readonly recipe: CameraRecipe = {
    blend: 0,
    radiusScale: 1.08,
    targetY: 0.55,
    parallaxScale: 0.5,
  };
  private readonly override: CameraPoseOverride = {
    theta: 0,
    phi: CAM_PHI,
    radius: CAM_FIT_K,
    targetX: 0,
    targetY: 0.45,
    targetZ: 0,
    fov: CAM_FOV,
    parallaxScale: 0.5,
    blend: 0,
  };
  private overrideActive = false;

  /* Lineup scene graph (built lazily once the hero GLB is adopted). */
  private lineup: Group | null = null;
  private wrappers: Group[] = [];
  private heroHidden = false;

  /* Live wall-clock rise leg (never started in eval — law 9). */
  private readonly wallRise = Array.from({ length: LINEUP_COUNT }, () => ({ v: 0 }));
  private riseTl: gsap.core.Timeline | null = null;
  private risePending = false;

  private readonly reveals: RevealLine[];

  constructor(private readonly rig: CameraRig) {
    super({
      name: "Footer",
      // Truthful contract: the lineup clones the assembled hero; nothing
      // is written to the store and every stage mutation is restored.
      requiredEnterState: { explode: "assembled" },
      guaranteedExitState: {},
    });

    const pin = this.element.querySelector<HTMLElement>(".pin");
    if (!pin) throw new Error("Footer: track has no .pin");
    pin.className = "pin outro";
    // SELECT MODEL stays on the cursor channel (P3 wires the mechanic).
    pin.dataset["cursorText"] = "selectModel";
    pin.innerHTML = buildMarkup();

    // Grey-line reveal targets: the credit VALUES + the fin line (roles are
    // static dim labels — film-credit two-tone grammar).
    const valueEls = Array.from(pin.querySelectorAll<HTMLElement>("[data-reveal]"));
    this.reveals = valueEls.map((el, i) => ({
      el,
      win: REVEAL_WINS[i] ?? [0.68, 0.75],
      value: 0,
      target: 0,
    }));

    this.addDomAdapter(timelineAdapter(this.buildDomTimeline(pin)));
    this.addWebglAdapter(timelineAdapter(this.buildCameraTimeline()));

    // scrub:2 catch-up lag on the shared ticker (live only — eval applies
    // targets directly in tickDom so settleSync stays a fixed point).
    if (!isEvalMode) {
      gsap.ticker.add((_t, deltaMs) => this.tickLag(deltaMs / 1000));
    }
  }

  /* ---- DOM scrub timeline (fraction domain 0..1, padded to 1) ------------ */

  private buildDomTimeline(pin: HTMLElement): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true });
    const models = pin.querySelector<HTMLElement>(".outro__models");
    const modelItems = Array.from(pin.querySelectorAll<HTMLElement>(".outro__model"));
    const slate = pin.querySelector<HTMLElement>(".outro__slate");
    const eyebrow = pin.querySelector<HTMLElement>(".outro__eyebrow");
    const chars = Array.from(pin.querySelectorAll<HTMLElement>(".outro__wm-char"));
    const pulse = pin.querySelector<HTMLElement>(".outro__pulse");
    const rows = Array.from(pin.querySelectorAll<HTMLElement>(".outro__row"));
    const fin = pin.querySelector<HTMLElement>(".outro__fin");

    // Beat 1 · model labels (.32–.49): each label arrives as its watch
    // lands — same stagger story as the rise, settled before the .5 frame.
    if (models) {
      tl.fromTo(models, { opacity: 0 }, { opacity: 1, duration: 0.04, ease: "none" }, 0.32);
    }
    tl.fromTo(
      modelItems,
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.05, ease: "power3.out", stagger: 0.04 },
      0.32,
    );

    // Beat 2 · credits slate (.52–.75): the film-credit card assembles.
    if (slate) {
      tl.fromTo(slate, { opacity: 0 }, { opacity: 1, duration: 0.04, ease: "none" }, 0.52);
    }
    if (eyebrow) {
      tl.fromTo(
        eyebrow,
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.06, ease: "power3.out" },
        0.52,
      );
    }
    // Wordmark: split-char x-slides power3.out + linear opacity over the
    // first half of each slide (the scrub:true grammar, §3).
    tl.fromTo(
      chars,
      { xPercent: -105 },
      { xPercent: 0, duration: 0.1, ease: "power3.out", stagger: 0.005 },
      0.53,
    );
    tl.fromTo(
      chars,
      { opacity: 0 },
      { opacity: 1, duration: 0.05, ease: "none", stagger: 0.005 },
      0.53,
    );
    if (pulse) {
      tl.fromTo(
        pulse,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.06, ease: "power3.out" },
        0.58,
      );
    }
    // Credit rows ride a soft y-settle; their COLOR reveal is imperative
    // (the scrub:2 channel below) — transforms here, color there.
    tl.fromTo(
      rows,
      { y: 10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.05, ease: "power3.out", stagger: 0.02 },
      0.56,
    );
    if (fin) {
      tl.fromTo(
        fin,
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.06, ease: "power3.out" },
        0.68,
      );
    }

    tl.call(() => {}, [], 1); // pad — beat positions are window fractions
    return tl;
  }

  override tickDom(progress: number): void {
    super.tickDom(progress);

    // Grey-line reveals (scrub:2 grammar): targets are a pure function of
    // progress; eval applies instantly (deterministic captures), live lags
    // ~2 s on the ticker.
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
    // 0–.08: the override takes the frame (blend in while everything is
    // still below frame — the base rig hands off invisibly).
    tl.to(r, { blend: 1, duration: 0.08 }, 0);
    // .08–.56: the one big move — a slow push-in as the row rises and
    // settles (paired micro targetY drop; law 7: one big move per beat).
    tl.to(r, { radiusScale: 1.0, targetY: 0.45, duration: 0.48 }, 0.08);
    // hold to 1 — the Footer is the last section; there is no downward
    // exit, and the upward exit re-crosses the same .0–.08 ramp.
    tl.call(() => {}, [], 1);
    return tl;
  }

  override tickWebgl(progress: number): void {
    super.tickWebgl(progress); // scrubs the camera recipe timeline

    const stage = getStage();
    if (progress > 0 && this.lineup === null) this.buildLineup();

    // Hero swap: the single hero yields the stage to the lineup (value-
    // window — jump-safe both directions; restored on leave belt-and-braces).
    const shouldHide = this.lineup !== null && progress > HERO_HIDE_AT;
    if (shouldHide !== this.heroHidden) {
      this.heroHidden = shouldHide;
      this.setHeroVisible(!shouldHide);
    }

    const r = this.recipe;
    if (this.lineup === null || stage === null || r.blend <= 0.0001) {
      if (this.lineup) this.lineup.visible = false;
      this.releaseCamera();
      return;
    }
    this.lineup.visible = true;

    // Aspect-fit framing: the row spans a constant width fraction so the
    // DOM labels stay under the watches at any viewport (pure function of
    // progress + viewport — eval-deterministic).
    const aspect = stage.camera.aspect;
    const radius = Math.min(CAM_RADIUS_MAX, CAM_FIT_K / Math.max(0.35, aspect)) * r.radiusScale;
    const visH = 2 * radius * Math.tan((CAM_FOV * Math.PI) / 360);
    const riseFrom = Math.min(RISE_FROM_MIN, r.targetY - visH / 2 - 0.9);

    // Rise: scrub-mapped stagger MAX'd with the live wall-clock leg (the
    // source's enter-triggered rise) — eval sees only the scrub map.
    for (let i = 0; i < this.wrappers.length; i++) {
      const wrapper = this.wrappers[i];
      const wall = this.wallRise[i];
      if (!wrapper || !wall) continue;
      const dur = RISE_DUR_BASE + RISE_DUR_STEP * i;
      const scrub = easeOutQuart(win(progress, [RISE_START, RISE_START + dur]));
      const rise = Math.max(scrub, wall.v);
      wrapper.position.y = riseFrom + (LINEUP_Y - riseFrom) * rise;
    }

    const o = this.override;
    o.theta = 0;
    o.phi = CAM_PHI;
    o.radius = radius;
    o.targetX = 0;
    o.targetY = r.targetY;
    o.targetZ = 0;
    o.fov = CAM_FOV;
    o.parallaxScale = r.parallaxScale;
    o.blend = r.blend;
    this.overrideActive = true;
    this.rig.setPoseOverride(o);
  }

  /* ---- lineup construction ------------------------------------------------ */

  /**
   * Clone the adopted hero four times (geometry + materials SHARED — the
   * live dial texture and bloom-layer membership ride the clones for free;
   * P3's colorway swap re-skins per-clone by cloning materials then).
   * Wrappers are rotated by the inverse case quaternion so every dial
   * normal faces +Z — the §1.6 face-on plate, symmetric framing.
   */
  private buildLineup(): void {
    const stage = getStage();
    const watch = stage?.watch ?? null;
    if (stage === null || watch === null) return; // GLB not landed (or failed)

    const lineup = new Group();
    lineup.name = "footer_lineup";
    const faceOn = watch.caseSpace.quaternion.clone().invert();
    for (let i = 0; i < LINEUP_COUNT; i++) {
      const wrapper = new Group();
      wrapper.name = `footer_slot_${i}`;
      wrapper.quaternion.copy(faceOn);
      wrapper.scale.setScalar(LINEUP_SCALE);
      wrapper.position.set((i - (LINEUP_COUNT - 1) / 2) * LINEUP_SPACING, RISE_FROM_MIN, 0);
      wrapper.add(watch.root.clone(true));
      lineup.add(wrapper);
      this.wrappers.push(wrapper);
    }
    lineup.visible = false;
    stage.scene.add(lineup);
    this.lineup = lineup;

    // Live rise leg — source-exact wall-clock stagger, armed on enter.
    if (!isEvalMode) {
      const tl = gsap.timeline({ paused: true });
      this.wallRise.forEach((wall, i) => {
        tl.to(
          wall,
          { v: 1, duration: RISE_WALL_BASE_S + RISE_WALL_STEP_S * i, ease: "power4.out" },
          0,
        );
      });
      this.riseTl = tl;
      if (this.risePending) {
        this.risePending = false;
        tl.restart();
      }
    }
  }

  /** Hero product + its contact shadow (the lineup brings no puddle of its
   *  own — grounding treatment for the row is a look-lane follow-up). */
  private setHeroVisible(visible: boolean): void {
    const stage = getStage();
    if (stage === null) return;
    stage.product.visible = visible;
    const shadow = stage.scene.getObjectByName("stage_contact_shadow");
    if (shadow) shadow.visible = visible;
  }

  private releaseCamera(): void {
    if (this.overrideActive) {
      this.overrideActive = false;
      this.rig.setPoseOverride(null);
    }
  }

  /* ---- lifecycle ---------------------------------------------------------- */

  override onEnter(): void {
    // The wall-clock rise arms on ANY entry (live only). Eval mode never
    // starts it — captures stay pure functions of progress (law 9).
    if (isEvalMode) return;
    if (this.riseTl) this.riseTl.restart();
    else this.risePending = true;
  }

  override onEnterCenter(): void {
    this.element.classList.add("is-center");
  }

  override onLeaveCenter(): void {
    this.element.classList.remove("is-center");
  }

  /** Belt-and-braces: never leak the lineup, camera, or a hidden hero. */
  override onLeave(): void {
    this.releaseCamera();
    if (this.lineup) this.lineup.visible = false;
    if (this.heroHidden) {
      this.heroHidden = false;
      this.setHeroVisible(true);
    }
    this.risePending = false;
    if (this.riseTl) {
      this.riseTl.pause();
      this.riseTl.progress(0); // re-entry replays the rise (source behavior)
    }
  }
}

/* ---- markup ---------------------------------------------------------------- */

function splitChars(word: string): string {
  return Array.from(word)
    .map((c) => (c === " " ? " " : `<span class="outro__wm-char">${c}</span>`))
    .join("");
}

function buildMarkup(): string {
  const rows = CREDITS.map(
    ([role, value]) => `
        <div class="outro__row">
          <dt class="outro__role">${role}</dt>
          <dd class="outro__value" data-reveal>${value}</dd>
        </div>`,
  ).join("");
  const models = MODELS.map(
    (name, i) =>
      `<li class="outro__model${i === 0 ? " outro__model--live" : ""}" data-model="${name.toLowerCase()}">${name}</li>`,
  ).join("\n        ");
  return `
    <div class="outro__scrim" aria-hidden="true"></div>
    <section class="outro__slate" aria-label="Credits">
      <p class="outro__eyebrow">${EYEBROW}</p>
      <h2 class="outro__wordmark" aria-label="${WORDMARK}">
        <span class="outro__wm-line" aria-hidden="true">${splitChars(WORDMARK)}</span>
      </h2>
      <div class="outro__pulse" aria-hidden="true"></div>
      <dl class="outro__credits">${rows}
      </dl>
      <p class="outro__fin" data-reveal>${FIN}</p>
    </section>
    <nav class="outro__models" aria-label="The lineup">
      <ul class="outro__model-list">
        ${models}
      </ul>
    </nav>
  `;
}
