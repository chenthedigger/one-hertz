/**
 * Nocturne — pinned 300svh, OUR additive signature beat (PLAN §2; LOOKBIBLE
 * §1.5 #12). The page goes to sleep: darkness radiates outward from the
 * dial, the watch drops to Always-On, and — for the only moment in the
 * whole experience — the watch itself moves on REAL wall-clock seconds
 * (motion-bible §7.1 / law 9; the tick + ≤1-tick phase-align handoff live
 * in the dial subsystem, this section only flips the `dialMode` token).
 *
 * Dual timelines (engine contract, docs/p1/engine.md §1):
 *   - DOM channel: one PAUSED fraction-domain GSAP timeline via
 *     `timelineAdapter` (split-char headline reveal x:-100%→0 power3.out +
 *     linear opacity; grey-line color reveals #BCBCBC→#FFFFFF power3.inOut
 *     in staggered windows — the scrub:2 grammar, §7.3) + imperative work
 *     (radial veil, Sleep Score count, state tokens) — all pure functions
 *     of raw progress, never lerped (single smoothing owner: Lenis).
 *   - WebGL channel: camera pose override on the shared rig + the
 *     section-owned lighting beat. The keyframe driver holds the CONTINUUM
 *     (envInt 0.35 · bloom 0.85 · bgStage #0A0B0D at section center —
 *     instrument.json); this section owns the deep 0.045 AOD match-cut
 *     blackout INSIDE the beat via `setSectionEnvDip` (infra-gl handoff)
 *     and the vignette flag (Nocturne only, PLAN §3), both restored before
 *     exit — Nocturne is the ONLY section allowed to hand a dimmed
 *     continuum into Colors' recovery ramp (LOOKBIBLE §1.5 law).
 *
 * Camera: `rig.setPoseOverride` (the multi-section seam — Disassembly owns
 * the rig's authored master timeline, Mechanism established the override
 * pattern). The pose CHASES the dial normal through `caseSpace` +
 * `productAttitude(clock)`, so the AOD dial faces the camera at any page
 * clock (live == eval == solo); LOOKBIBLE §6 nocturne-aod recipe: slight
 * low angle, the dial carries the frame. Blend rides a plateau (in by .18,
 * out over .85→1) — zero at both boundaries, so entry/exit hand off to
 * whatever base pose the neighborhood holds. One move in, one move out
 * (motion-bible §4: one big move per beat; a sleeping page holds still).
 *
 * State contract (truthful): enters on `dialMode:"wayfinder"`, flips the
 * store to `{dialMode:"aod", postStack:"nocturne"}` inside the beat, and
 * restores `{dialMode:"wayfinder", postStack:"default"}` by p=0.88 —
 * active → aod → active, guaranteed on exit both directions.
 */

import { gsap } from "gsap";
import { Euler, Vector3 } from "three";
import { getClock } from "../core/clock";
import type { OneHertzDebugApi } from "../core/debug";
import { SectionBase, timelineAdapter } from "../core/section";
import { setSectionEnvDip } from "../gl/lightKeyframes";
import type { CameraPoseOverride, CameraRig } from "../webgl/cameraRig";
import { productAttitude } from "../webgl/stage";
import "./nocturne.css";

/* ---- beat windows (fraction grid {.05,.1,.15,.2,.25,.4,.5,.75} anchored;
 * fine beats sized .04–.1 per the motion-bible §2 scrub clusters) ---------- */

/** Radial darkness closes over the first fifth-to-third of the pin. */
const VEIL_IN: readonly [number, number] = [0.02, 0.35];
/** Deep AOD blackout: in by the .5 match-cut, back on the continuum by .66. */
const DIP_IN: readonly [number, number] = [0.43, 0.5];
const DIP_OUT: readonly [number, number] = [0.56, 0.66];
/** Vignette flag rides the whole AOD beat; restored before exit (≤.88 < .9). */
const VIG_IN: readonly [number, number] = [0.42, 0.5];
const VIG_OUT: readonly [number, number] = [0.78, 0.88];
/** dialMode/postStack token ownership window (active → aod → active). */
const AOD_WINDOW: readonly [number, number] = [0.42, 0.88];
/** Sleep Score counts 0→92 on section progress (resolved before exit). */
const SCORE_WINDOW: readonly [number, number] = [0.53, 0.74];
const SCORE_MAX = 92;

/** AOD match-cut env target (LOOKBIBLE §1.5: the porcelain-graft 0.045). */
const AOD_ENV_INTENSITY = 0.045;
/** Nocturne vignette strength (LOOKBIBLE §1.2 council law; look-tuned
 *  instrument.json carries the same 0.36 — see lane notes for the seam). */
const VIGNETTE_NOCTURNE = 0.36;
/* Camera recipe (LOOKBIBLE §6 nocturne-aod: "50mm, slight low angle, dial
 * emission carries the room") expressed as dial-normal chase offsets. */
const CAM_STANDOFF = 3.2; // world units off the screen center
const CAM_THETA_OFF = 0.12; // slight three-quarter twist off dead-on
const CAM_PHI_OFF = 0.1; // slight LOW angle (camera under the dial normal)
const CAM_LATERAL = 0.55; // aim right of center → watch composes left

/* ---- pure easing helpers (deterministic — no gsap runtime state) --------- */

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Normalized window position: 0 before `a`, 1 after `b`. */
function win(p: number, [a, b]: readonly [number, number]): number {
  return clamp01((p - a) / (b - a));
}

/** power2.inOut — the light-motion ease (motion-bible law 2). */
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) * (-2 * t + 2)) / 2;
}

/** power3.inOut — the site default, used for the veil's radial close. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** smoothstep 0→1 (zero slope at both ends). */
function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Camera-blend shape: ramp the pose override in over the entry window,
 * HOLD the AOD frame, release over the exit window. 0 at both boundaries —
 * the base rig pose (whatever the neighborhood holds) wins outside.
 */
function plateau(p: number): number {
  const rise = smooth(clamp01((p - 0.02) / 0.16)); // in by p=.18
  const fall = 1 - smooth(clamp01((p - 0.85) / 0.15)); // out by p=1
  return Math.min(rise, fall);
}

export class NocturneSection extends SectionBase {
  private readonly veil: HTMLElement;
  private readonly scoreValue: HTMLElement;

  private lastVeil = "";
  private lastScore = -1;
  private lastDip = 0;
  private lastVig = "";
  private owningTokens = false;

  /* Pose override plumbing (rig reads the SAME object every frame). */
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
  private readonly scratchEuler = new Euler();
  private readonly scratchNormal = new Vector3();
  private readonly scratchAim = new Vector3();

  constructor(private readonly rig: CameraRig) {
    super({
      name: "Nocturne",
      // Truthful contract: the dial must be the assembled watch's active
      // face on entry; we flip to AOD inside and hand it back restored.
      requiredEnterState: { explode: "assembled", dialMode: "wayfinder" },
      guaranteedExitState: {
        explode: "assembled",
        dialMode: "wayfinder",
        postStack: "default",
      },
    });

    this.buildDom();
    this.veil = this.mustQuery(".noc__veil");
    this.scoreValue = this.mustQuery("[data-score]");
    this.addDomAdapter(timelineAdapter(this.buildDomTimeline()));
  }

  /* ---- DOM (self-rendered — index.html holds only the empty track) ------- */

  private buildDom(): void {
    // Static authored template — replaces the P1 placeholder markup.
    this.element.innerHTML = `
      <div class="pin noc">
        <div class="noc__veil" aria-hidden="true"></div>
        <div class="noc__copy">
          <header class="noc__beat noc__beat--head">
            <p class="noc__eyebrow">Nocturne &middot; 22:00</p>
            <h2 class="noc__headline" aria-label="Darkness, measured.">
              <span class="noc__line" aria-hidden="true">DARKNESS,</span>
              <span class="noc__line" aria-hidden="true">MEASURED.</span>
            </h2>
            <p class="noc__lead">Light leaves the page. The dial remains.</p>
          </header>
          <div class="noc__beat noc__beat--lines">
            <p>The room forgets you. The watch does not.</p>
            <p>One tick per second. Real seconds.</p>
            <p>The only wall clock this page obeys.</p>
          </div>
          <p class="noc__beat noc__aodtag">AOD &middot; <em>real seconds</em></p>
          <div class="noc__beat noc__beat--score">
            <p class="noc__eyebrow">Sleep score</p>
            <p class="noc__score-value tnum"><span data-score>0</span><span class="noc__score-unit">/100</span></p>
            <p class="noc__caption">Scored while the dial keeps the night watch.</p>
          </div>
        </div>
      </div>`;

    // Split-char prep: each headline line becomes per-char spans under an
    // overflow-clipped line (source grammar: chars slide in from x:-100%).
    for (const line of this.element.querySelectorAll<HTMLElement>(".noc__line")) {
      const text = line.textContent ?? "";
      line.textContent = "";
      for (const ch of text) {
        const span = document.createElement("span");
        span.className = "noc__char";
        span.textContent = ch;
        line.append(span);
      }
    }
  }

  private mustQuery(selector: string): HTMLElement {
    const el = this.element.querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`Nocturne: missing ${selector}`);
    return el;
  }

  /* ---- DOM scrub timeline (fraction domain 0..1, padded to 1) ------------ */

  private buildDomTimeline(): gsap.core.Timeline {
    const q = (s: string): HTMLElement => this.mustQuery(s);
    const head = q(".noc__beat--head");
    const eyebrow = q(".noc__beat--head .noc__eyebrow");
    const lead = q(".noc__lead");
    const chars = this.element.querySelectorAll<HTMLElement>(".noc__char");
    const linesBlock = q(".noc__beat--lines");
    const lines = this.element.querySelectorAll<HTMLElement>(".noc__beat--lines p");
    const aodTag = q(".noc__aodtag");
    const score = q(".noc__beat--score");

    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });

    // Beat 1 · headline. Scrubbed opacity = linear; transforms carry the
    // ease (motion-bible law 2: arrivals from off-frame power3.out).
    tl.to(head, { opacity: 1, duration: 0.03 }, 0.03);
    tl.fromTo(eyebrow, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.04);
    tl.fromTo(eyebrow, { y: 14 }, { y: 0, duration: 0.06, ease: "power3.out" }, 0.04);
    tl.fromTo(
      chars,
      { xPercent: -105 },
      { xPercent: 0, duration: 0.1, ease: "power3.out", stagger: 0.005 },
      0.05,
    );
    tl.fromTo(
      chars,
      { opacity: 0 },
      { opacity: 1, duration: 0.05, stagger: 0.005 }, // linear, first half
      0.05,
    );
    tl.fromTo(lead, { opacity: 0 }, { opacity: 1, duration: 0.06 }, 0.17);
    tl.fromTo(lead, { y: 16 }, { y: 0, duration: 0.07, ease: "power3.out" }, 0.17);
    // Departure: power2.in (things leaving accelerate away).
    tl.to(head, { opacity: 0, duration: 0.08 }, 0.3);
    tl.to(head, { y: -36, duration: 0.08, ease: "power2.in" }, 0.3);

    // Beat 2 · grey-line color reveals (§7.3 greys on dark, staggered
    // windows — the scrub:2 grammar expressed in the progress domain).
    tl.to(linesBlock, { opacity: 1, duration: 0.04 }, 0.26);
    lines.forEach((line, i) => {
      tl.fromTo(
        line,
        { color: "#BCBCBC" },
        { color: "#FFFFFF", duration: 0.1, ease: "power3.inOut" },
        0.3 + i * 0.025,
      );
    });
    tl.to(linesBlock, { opacity: 0, duration: 0.04 }, 0.455);
    tl.to(linesBlock, { y: -18, duration: 0.045, ease: "power2.in" }, 0.455);

    // AOD match-cut caption — present exactly around the .5 blackout.
    tl.to(aodTag, { opacity: 1, duration: 0.04 }, 0.45);
    tl.fromTo(aodTag, { y: 12 }, { y: 0, duration: 0.05, ease: "power3.out" }, 0.45);
    tl.to(aodTag, { opacity: 0, duration: 0.04 }, 0.6);

    // Beat 3 · Sleep Score block (the count itself is imperative).
    tl.to(score, { opacity: 1, duration: 0.06 }, 0.52);
    tl.fromTo(score, { y: 26 }, { y: 0, duration: 0.07, ease: "power3.out" }, 0.52);
    tl.to(score, { opacity: 0, duration: 0.05 }, 0.83);
    tl.to(score, { y: -18, duration: 0.05, ease: "power2.in" }, 0.83);

    // Pad to exactly 1 (WebGL-group padding grammar, motion-bible §2).
    tl.call(() => {}, [], 1);
    return tl;
  }

  /* ---- channels ----------------------------------------------------------- */

  override tickDom(progress: number): void {
    super.tickDom(progress);

    // Darkness radiates outward from the dial: the veil's transparent hole
    // closes from beyond-frame to a tight halo around the watch head.
    const t = easeInOutCubic(win(progress, VEIL_IN));
    const hole = Math.round((130 - 104 * t) * 10) / 10;
    const soft = Math.round((175 - 105 * t) * 10) / 10;
    const veilKey = `${hole}/${soft}`;
    if (veilKey !== this.lastVeil) {
      this.lastVeil = veilKey;
      this.veil.style.setProperty("--noc-hole", `${hole}%`);
      this.veil.style.setProperty("--noc-soft", `${soft}%`);
    }

    // Sleep Score: 0→92 as a pure linear map of section progress (data
    // honesty — the number IS the scroll). Mono + tabular via CSS.
    const score = Math.round(SCORE_MAX * win(progress, SCORE_WINDOW));
    if (score !== this.lastScore) {
      this.lastScore = score;
      this.scoreValue.textContent = String(score);
    }

    // State tokens — value-window (jump-safe: pure function of progress,
    // eval gotoSection lands correct on the first settled tick).
    const own = progress >= AOD_WINDOW[0] && progress < AOD_WINDOW[1];
    if (own !== this.owningTokens) {
      this.owningTokens = own;
      this.applyTokens(own);
    }
  }

  override tickWebgl(progress: number): void {
    super.tickWebgl(progress);

    // Camera: dial-normal chase blended over the base rig pose (see the
    // module doc). Released at both boundaries and whenever the GLB is
    // absent (placeholder keeps the base rig).
    const blend = plateau(progress);
    const cs = this.rig.caseSpace;
    if (blend <= 0.0001 || cs === null) {
      if (this.overrideActive) {
        this.overrideActive = false;
        this.rig.setPoseOverride(null);
      }
    } else {
      const att = productAttitude(getClock());
      this.scratchEuler.set(att.rotX, att.rotY, 0, "XYZ");
      const n = this.scratchNormal.copy(cs.zAxis).applyEuler(this.scratchEuler);
      const aim = this.scratchAim.copy(cs.origin).applyEuler(this.scratchEuler);
      const o = this.poseOverride;
      o.theta = Math.atan2(n.x, n.z) + CAM_THETA_OFF;
      o.phi = Math.min(
        Math.PI - 0.15,
        Math.max(0.15, Math.acos(Math.min(1, Math.max(-1, n.y))) + CAM_PHI_OFF),
      );
      o.radius = CAM_STANDOFF;
      o.targetX = aim.x + Math.cos(o.theta) * CAM_LATERAL;
      o.targetZ = aim.z - Math.sin(o.theta) * CAM_LATERAL;
      o.targetY = aim.y;
      o.blend = blend;
      this.overrideActive = true;
      this.rig.setPoseOverride(this.poseOverride);
    }

    // Deep AOD blackout: continuum → 0.045 → continuum, composed inside
    // the keyframe driver (it runs after section ticks and owns the
    // envIntensity channel). power2.inOut ramps — light never snaps.
    const dip = Math.min(
      easeInOutQuad(win(progress, DIP_IN)),
      1 - easeInOutQuad(win(progress, DIP_OUT)),
    );
    if (Math.abs(dip - this.lastDip) > 1e-4 || (dip === 0) !== (this.lastDip === 0)) {
      this.lastDip = dip;
      setSectionEnvDip(dip, AOD_ENV_INTENSITY);
    }

    // Vignette flag — Nocturne only (PLAN §3); strength ramps with the AOD
    // beat and is fully restored by .88 (stage-restore law, §4/§7).
    const vig = Math.min(
      easeInOutQuad(win(progress, VIG_IN)),
      1 - easeInOutQuad(win(progress, VIG_OUT)),
    );
    const strength = Math.round(VIGNETTE_NOCTURNE * vig * 1e3) / 1e3;
    const vigKey = `${vig > 0}/${strength}`;
    if (vigKey !== this.lastVig) {
      this.lastVig = vigKey;
      this.api?.gl.setVignette(vig > 0, strength);
    }
  }

  /* ---- lifecycle ---------------------------------------------------------- */

  override onEnterCenter(): void {
    this.element.classList.add("is-center");
  }

  override onLeaveCenter(): void {
    this.element.classList.remove("is-center");
  }

  /** Belt-and-braces: never leave the page in AOD, either direction. */
  override onLeave(): void {
    if (this.overrideActive) {
      this.overrideActive = false;
      this.rig.setPoseOverride(null);
    }
    if (this.owningTokens) {
      this.owningTokens = false;
      this.applyTokens(false);
    }
    if (this.lastDip !== 0) {
      this.lastDip = 0;
      setSectionEnvDip(0, AOD_ENV_INTENSITY);
    }
    if (this.lastVig !== "false/0") {
      this.lastVig = "false/0";
      this.api?.gl.setVignette(false, 0);
    }
  }

  /* ---- store bridge ------------------------------------------------------- */

  private applyTokens(aod: boolean): void {
    this.api?.applyState(
      aod
        ? { dialMode: "aod", postStack: "nocturne" }
        : { dialMode: "wayfinder", postStack: "default" },
    );
  }

  /** Debug API is installed later in the same boot tick sections are
   *  constructed in; every consumer here runs on frames, after install. */
  private get api(): OneHertzDebugApi | null {
    return "__ONE_HERTZ__" in window ? window.__ONE_HERTZ__ : null;
  }
}
