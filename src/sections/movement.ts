/**
 * Movement — word-stack #2 over the rotating S-SiP (the light beat after
 * Mechanism's dark one).
 *
 * Source grammar translated (Movement_* reference frames + motion bible
 * "Presentation group" 0–.25): the giant five-line word stack scrolling
 * past the featured object, per-line grey reveals, two label blocks on the
 * right. Semantic swap (PLAN §2): the source celebrates an automatic
 * movement; ONE HERTZ's movement IS silicon — the in-house S-SiP GLB
 * (research/internals-models `part_sip`, shipped at
 * /assets/watch/internals/part_sip.glb) turns on an invisible turntable
 * while "THE / HIGHLY / ATTENTIVE / SILICON / MOVEMENT" rides the DOM
 * channel over it. Labels: NEURAL ENGINE (on a wrist) · RELIABILITY
 * (swimproof, crash and fall detection).
 *
 * Lighting is entirely the infra-gl keyframe driver's (instrument.json
 * Movement key: rot 140 · envInt 0.95 · no bgStage ⇒ porcelain ground at
 * center; the dark→light ramp out of Mechanism is the driver's continuum).
 * This lane invents no lighting. Scrims ride the live --porcelain token
 * (LOOKBIBLE §7.1).
 *
 * Timelines (motion bible law 4 — domains declared):
 *   - DOM: scrub-fraction domain, PAUSED GSAP timeline padded to 1.
 *     Stack traversal = linear scrubbed transform (the source stack rides
 *     the DOM channel with scroll); line entrances = split-char scrub:true
 *     grammar (x:-110%→0 power3.out + linear opacity, §3); label blocks
 *     arrive power3.out. Grey-line color reveals = scrub:2 grammar,
 *     imperative with a 2 s catch-up lag live / instant under ?eval=1
 *     (Mechanism's dial-gear dt≤0 precedent). LIGHT-ground colors per
 *     LOOKBIBLE §7.3: #BCBCBC → #323232.
 *   - WebGL: scrub-fraction domain, PAUSED GSAP timeline padded to 1
 *     animating a private camera recipe composed into a CameraPoseOverride
 *     (additive rig API — blend ramps 0→1→0 inside the window, so the base
 *     rig owns the frame at both edges and the handoff to Curves is
 *     seamless). Beats on the fraction grid: blend-in .0–.15 (parallax
 *     gated off — macro law 7) · dolly-in .15–.5 (the one big move) ·
 *     orbit drift .5–.75 (light crawls the gold pad ring) · ease-out
 *     .75–.9 (closer at ~0.6× the opener, law 3 shape) · blend-out .9–1.
 *     SiP spin + die-glow are pure functions of {clock scalar, progress} —
 *     wall time banned (law 9), eval settling is a fixed point.
 *
 * State contract (truthful): requires the watch assembled (the base-rig
 * pose frames the hero at both blend edges; an exploded case there is
 * nonsense); guarantees nothing changed — the override blends fully out,
 * the SiP is hidden on leave, no state axis is written. If the SiP GLB
 * fails to load the camera override never activates (the base rig keeps
 * the hero framed) and the word stack still owns the beat — the section
 * degrades, never breaks.
 */

import { gsap } from "gsap";
import { Box3, Group, MeshStandardMaterial, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { getClock } from "../core/clock";
import { extendState } from "../core/debug";
import { isEvalMode } from "../core/determinism";
import { bus, EngineEvent } from "../core/events";
import { params } from "../core/params";
import { SectionBase, timelineAdapter } from "../core/section";
import { BASIS_TRANSCODER_PATH } from "../webgl/watch";
import type { CameraPoseOverride, CameraRig } from "../webgl/cameraRig";
import type { Stage } from "../webgl/stage";
import { getStage } from "./stageRef";
import "./movement.css";

/* ---- copy (working copy per LOOKBIBLE §8 budgets — P4 polishes wording) --- */

const EYEBROW = "06 · MOVEMENT"; // ≤18 chars caps
/** Word-stack #2 (PLAN §2 brief): 5 words, every line ≤34 chars. */
const STACK_LINES = ["THE", "/ HIGHLY", "ATTENTIVE", "SILICON", "MOVEMENT"];
const LABEL_NEURAL = "NEURAL ENGINE"; // ≤18 chars caps
const BODY_NEURAL = "Neural Engine, on a wrist."; // ≤220 chars
const LABEL_RELIABILITY = "RELIABILITY";
// "Swimproof" is Series-tier vocabulary; Ultra's verified reliability story
// is the detection pair (apple.com Ultra 3, checked 2026-08-26).
const BODY_RELIABILITY = "Crash and fall detection. It calls when you can't."; // 50 ≤ 220

/* ---- featured object: the S-SiP ------------------------------------------- */

const SIP_URL = "/assets/watch/internals/part_sip.glb";
/** Largest bbox dimension, watch world units (internals roster proportion). */
const SIP_WORLD_SIZE = 0.58;
/** Blender part is authored plate-up (+Y after glTF) → plate face +z. */
const SIP_PRE_ROTATION: [number, number, number] = [Math.PI / 2, 0, 0];
/**
 * World anchor for the turntable — far from the hero at the origin so the
 * macro frames only silicon (the watch never photobombs the beat).
 */
const SIP_ANCHOR = new Vector3(0.4, -7, 0);
/** Small parts must not out-spec the hero titanium (internals-tune law). */
const SIP_ENV_INTENSITY = 0.95;

/* ---- grey-line reveals (scrub:2 grammar — LIGHT-ground colors, §7.3) ------ */

const REVEAL_FROM = 0xbcbcbc;
const REVEAL_TO = 0x323232;
/** scrub:2 catch-up rate (≈2 s to visually settle — Mechanism's constant). */
const REVEAL_LAG_K = 2.2;

interface RevealLine {
  el: HTMLElement;
  /** progress window [in, out] — per-line half-widths alternate (15/25). */
  win: [number, number];
  value: number;
  target: number;
}

/* ---- stack geometry (scrub transform, vh units — DOM channel) ------------- */

/** Stack container translate: +55vh (below center) → −76vh (past the top). */
const STACK_Y_FROM = 55;
const STACK_Y_TO = -76;

/** Split-char slide window starts per line (fraction grid-adjacent). */
const CHAR_WINDOWS = [0.02, 0.08, 0.22, 0.38, 0.54];
/** Color-reveal centers per line; half-widths alternate .06/.10 (15/25). */
const REVEAL_CENTERS = [0.14, 0.22, 0.36, 0.52, 0.68];
const REVEAL_HALF = [0.06, 0.1, 0.06, 0.1, 0.06];

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

/* ---- camera recipe -------------------------------------------------------- */

interface CameraRecipe {
  blend: number;
  /** Camera distance from the SiP anchor, world units (SiP ≈ 0.58 wide). */
  standoff: number;
  /** Azimuth around the turntable (world θ — the SiP owns its own spin). */
  theta: number;
  /** Polar angle — ~0.95 ≈ 35° elevation, the sip_a_hero read. */
  phi: number;
  /** Frame-lateral shift: aim left of the anchor → SiP composes right. */
  lat: number;
  /** Die-floorplan emissive gain ("highly attentive" — the silicon wakes). */
  glow: number;
  parallaxScale: number;
}

export class MovementSection extends SectionBase {
  private readonly stage: Stage | null;

  private readonly recipe: CameraRecipe = {
    blend: 0,
    standoff: 2.4,
    theta: 0.55,
    phi: 0.95,
    lat: 0.22,
    glow: 1,
    parallaxScale: 1,
  };
  private readonly override: CameraPoseOverride = {
    theta: 0,
    phi: 0.95,
    radius: 2.3,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    fov: 35,
    parallaxScale: 1,
    blend: 0,
  };
  private overrideActive = false;

  /* SiP scene graph: anchor (position) → spin (rotation.y) → plate-up part */
  private readonly sipAnchor = new Group();
  private readonly sipSpin = new Group();
  private sipLoaded = false;
  private sipReady = false;
  private readonly sipEmissives: MeshStandardMaterial[] = [];
  private lastGlow = -1;
  private spinRad = 0;

  private readonly reveals: RevealLine[];

  constructor(private readonly rig: CameraRig) {
    super({
      name: "Movement",
      requiredEnterState: { explode: "assembled" },
      guaranteedExitState: {},
      // longpress zoom stays the default 1.35 (law 8 table) — the hold
      // dives into the SiP macro while the override owns the frame.
    });

    this.stage = getStage();

    const pin = this.element.querySelector<HTMLElement>(".pin");
    if (!pin) throw new Error("Movement: track has no .pin");
    pin.className = "pin mvt";
    pin.dataset["cursorText"] = "holdToExplore"; // fixed vocabulary (§8)
    pin.innerHTML = buildMarkup();

    const q = <T extends Element>(sel: string): T => {
      const el = pin.querySelector<T>(sel);
      if (!el) throw new Error(`Movement: missing ${sel}`);
      return el;
    };

    const stackLines = Array.from(pin.querySelectorAll<HTMLElement>(".mvt__line"));
    this.reveals = stackLines.map((el, i) => ({
      el,
      win: [
        (REVEAL_CENTERS[i] ?? 0.5) - (REVEAL_HALF[i] ?? 0.08),
        (REVEAL_CENTERS[i] ?? 0.5) + (REVEAL_HALF[i] ?? 0.08),
      ] as [number, number],
      value: 0,
      target: 0,
    }));
    this.reveals.push(
      { el: q<HTMLElement>(".mvt__body--neural"), win: [0.32, 0.48], value: 0, target: 0 },
      { el: q<HTMLElement>(".mvt__body--reliability"), win: [0.46, 0.62], value: 0, target: 0 },
    );

    this.addDomAdapter(timelineAdapter(this.buildDomTimeline(pin)));
    this.addWebglAdapter(timelineAdapter(this.buildCameraTimeline()));

    // Featured-object fetch policy (P4 perf — keep the 564 KB SiP GLB out
    // of the first-load window; progressive resilience unchanged):
    //   eval / solo=Movement → load now (frame determinism / sandbox);
    //   live → one-shot prefetch on the first lifecycle `enter` within two
    //   tracks of Movement (Disassembly/Mechanism above, Curves below).
    if (this.stage) {
      this.sipAnchor.name = "movement_sip_anchor";
      this.sipAnchor.position.copy(SIP_ANCHOR);
      this.sipAnchor.visible = false;
      this.sipAnchor.add(this.sipSpin);
      this.stage.scene.add(this.sipAnchor);
      let kicked = false;
      const kick = (): void => {
        if (kicked) return;
        kicked = true;
        offEnter();
        void this.loadSip();
      };
      const PREFETCH_SECTIONS = new Set(["Disassembly", "Mechanism", "Movement", "Curves"]);
      const offEnter = bus.on(EngineEvent.SectionEnter, ({ section }) => {
        if (PREFETCH_SECTIONS.has(section)) kick();
      });
      if (isEvalMode || params.solo === "Movement") kick();
    } else {
      this.sipReady = true; // exotic embedding: DOM-only beat
    }

    // scrub:2 catch-up lag lives on the shared ticker (live only — eval
    // applies targets directly in tickDom so settleSync is already final)
    if (!isEvalMode) {
      gsap.ticker.add((_t, deltaMs) => this.tickLag(deltaMs / 1000));
    }

    extendState("movement", () => ({
      sipReady: this.sipReady,
      sipLoaded: this.sipLoaded,
      blend: Math.round(this.recipe.blend * 1e4) / 1e4,
      spinDeg: Math.round(((this.spinRad * 180) / Math.PI) * 10) / 10,
    }));
  }

  /* ---- featured-object load (resilient: fail → degrade, never break) ------ */

  private async loadSip(): Promise<void> {
    const stage = this.stage;
    if (!stage) return;
    const ktx2 = new KTX2Loader()
      .setTranscoderPath(BASIS_TRANSCODER_PATH)
      .detectSupport(stage.renderer);
    const loader = new GLTFLoader().setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
    try {
      const gltf = await loader.loadAsync(SIP_URL);
      const scene = gltf.scene;
      // Plate face along +z, then flat on the turntable (+y up), then
      // normalize scale + center on the anchor (internals-roster recipe).
      scene.rotation.set(...SIP_PRE_ROTATION);
      scene.updateWorldMatrix(true, true);
      const box = new Box3().setFromObject(scene);
      const size = box.getSize(new Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
      scene.scale.setScalar(SIP_WORLD_SIZE / maxDim);
      scene.updateWorldMatrix(true, true);
      const scaled = new Box3().setFromObject(scene);
      scene.position.sub(scaled.getCenter(new Vector3()));
      const flat = new Group();
      flat.rotation.x = -Math.PI / 2; // +z plate normal → +y (turntable)
      flat.add(scene);
      scene.traverse((obj) => {
        const mesh = obj as { material?: unknown };
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if (m instanceof MeshStandardMaterial) {
            m.envMapIntensity = SIP_ENV_INTENSITY;
            if (m.emissiveMap || m.emissive.getHex() !== 0) this.sipEmissives.push(m);
          }
        }
      });
      this.sipSpin.add(flat);
      this.sipLoaded = true;
    } catch (error: unknown) {
      console.warn(
        `movement: featured S-SiP failed (${String(error)}) — camera override stays inert, DOM beat degrades gracefully`,
      );
    } finally {
      ktx2.dispose(); // worker teardown; decoded textures unaffected
      this.sipReady = true;
    }
  }

  /* ---- DOM channel -------------------------------------------------------- */

  private buildDomTimeline(pin: HTMLElement): gsap.core.Timeline {
    const tl = gsap.timeline({ paused: true });
    const stack = pin.querySelector<HTMLElement>(".mvt__stack");
    const eyebrow = pin.querySelector<HTMLElement>(".mvt__eyebrow");
    const blockNeural = pin.querySelector<HTMLElement>(".mvt__block--neural");
    const blockReliability = pin.querySelector<HTMLElement>(".mvt__block--reliability");

    // Stack traversal: linear scrubbed transform over the FULL window (the
    // source stack rides the scroll; scrubbed position stays ease-free).
    if (stack) {
      tl.fromTo(
        stack,
        { y: `${STACK_Y_FROM}vh` },
        { y: `${STACK_Y_TO}vh`, duration: 1, ease: "none" },
        0,
      );
    }

    // Split-char entrances per line: scrub:true grammar (§3) — x slides
    // power3.out, opacity linear over the first half of each slide.
    const lines = Array.from(pin.querySelectorAll<HTMLElement>(".mvt__line"));
    lines.forEach((line, i) => {
      const chars = Array.from(line.querySelectorAll<HTMLElement>(".mvt__char"));
      const at = CHAR_WINDOWS[i] ?? 0.05 + i * 0.12;
      tl.fromTo(
        chars,
        { xPercent: -110 },
        { xPercent: 0, duration: 0.1, ease: "power3.out", stagger: 0.012 },
        at,
      );
      tl.fromTo(
        chars,
        { opacity: 0 },
        { opacity: 1, duration: 0.05, ease: "none", stagger: 0.012 },
        at,
      );
    });

    if (eyebrow) {
      tl.fromTo(
        eyebrow,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.06, ease: "power3.out" },
        0.04,
      );
    }
    // Label blocks arrive from off-frame → power3.out (motion law 2).
    if (blockNeural) {
      tl.fromTo(
        blockNeural,
        { opacity: 0, y: 26 },
        { opacity: 1, y: 0, duration: 0.1, ease: "power3.out" },
        0.3,
      );
    }
    if (blockReliability) {
      tl.fromTo(
        blockReliability,
        { opacity: 0, y: 26 },
        { opacity: 1, y: 0, duration: 0.1, ease: "power3.out" },
        0.44,
      );
    }
    tl.add(() => {}, 1); // pad — beat positions are window fractions
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
    // .0–.15: blend over to the turntable while Mechanism's ink ground is
    // still ramping back to porcelain; parallax off for the macro (law 7)
    tl.to(r, { blend: 1, parallaxScale: 0, duration: 0.15 }, 0);
    // .15–.5: the one big move — dolly onto the package as the word stack
    // crosses it (landing near frame-center, clear of the label rail); the
    // die floorplan wakes ("highly attentive")
    tl.to(r, { standoff: 1.55, lat: 0.06, duration: 0.35 }, 0.15);
    // gate-2 tune: emissive peak 2.4 → 4.5 — the die must read LIT from
    // emission alone at .5 (bloomThreshold 1.0 law untouched; the ramp
    // 1→4.5 is the visible "silicon wakes" step the thesis needs)
    tl.to(r, { glow: 4.5, duration: 0.25 }, 0.3);
    // .5–.75: orbit drift — the streak light crawls the gold pad ring
    tl.to(r, { theta: 1.3, phi: 0.84, duration: 0.25 }, 0.5);
    // .75–.9: ease back off (closer runs ~0.6× the opener, law 3 shape)
    tl.to(r, { standoff: 2.1, glow: 1.4, duration: 0.15 }, 0.75);
    // .9–1: hand the frame back to the base rig for Curves
    tl.to(r, { blend: 0, parallaxScale: 1, duration: 0.1 }, 0.9);
    return tl;
  }

  override tickWebgl(progress: number): void {
    super.tickWebgl(progress); // scrubs the recipe timeline

    const r = this.recipe;
    const active = this.sipLoaded && r.blend > 0.0001;

    // Turntable spin: pure function of {clock scalar, progress} — never
    // wall time (law 9). Distinct poses at .25/.5/.75 by construction.
    this.spinRad = getClock() * Math.PI * 1.6 + progress * Math.PI * 1.4;
    if (this.sipLoaded) {
      this.sipSpin.rotation.y = this.spinRad;
      if (this.sipAnchor.visible !== active) this.sipAnchor.visible = active;
      if (this.lastGlow !== r.glow) {
        this.lastGlow = r.glow;
        for (const m of this.sipEmissives) m.emissiveIntensity = r.glow;
      }
    }

    if (!active) {
      if (this.overrideActive) {
        this.overrideActive = false;
        this.rig.setPoseOverride(null);
      }
      return;
    }

    const o = this.override;
    o.theta = r.theta;
    o.phi = r.phi;
    o.radius = r.standoff;
    // frame-lateral: aim left of the anchor so the SiP composes right of
    // center under the word stack (source: object center-right of type)
    o.targetX = SIP_ANCHOR.x - Math.cos(r.theta) * r.lat;
    o.targetZ = SIP_ANCHOR.z + Math.sin(r.theta) * r.lat;
    o.targetY = SIP_ANCHOR.y;
    o.fov = 35;
    o.parallaxScale = r.parallaxScale;
    o.blend = r.blend;
    this.overrideActive = true;
    this.rig.setPoseOverride(o);
  }

  /* ---- lifecycle ---------------------------------------------------------- */

  override onLeave(): void {
    this.sipAnchor.visible = false;
    if (this.overrideActive) {
      this.overrideActive = false;
      this.rig.setPoseOverride(null);
    }
  }
}

/* ---- markup --------------------------------------------------------------- */

function splitChars(line: string): string {
  return Array.from(line)
    .map((c) => (c === " " ? " " : `<span class="mvt__char">${c}</span>`))
    .join("");
}

function buildMarkup(): string {
  const stack = STACK_LINES.map(
    (line, i) =>
      `<span class="mvt__line mvt__line--${i}" aria-label="${line}">${splitChars(line)}</span>`,
  ).join("");
  return `
    <div class="mvt__scrim mvt__scrim--stack" aria-hidden="true"></div>
    <div class="mvt__scrim mvt__scrim--labels" aria-hidden="true"></div>
    <p class="mvt__eyebrow">${EYEBROW}</p>
    <h2 class="mvt__stack" aria-label="the highly attentive silicon movement">${stack}</h2>
    <aside class="mvt__labels">
      <div class="mvt__block mvt__block--neural">
        <p class="mvt__label">${LABEL_NEURAL}</p>
        <p class="mvt__body mvt__body--neural">${BODY_NEURAL}</p>
      </div>
      <div class="mvt__block mvt__block--reliability">
        <p class="mvt__label">${LABEL_RELIABILITY}</p>
        <p class="mvt__body mvt__body--reliability">${BODY_RELIABILITY}</p>
      </div>
    </aside>
  `;
}
