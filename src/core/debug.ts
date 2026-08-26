/**
 * `window.__ONE_HERTZ__` — debug + eval transport API (PLAN §5 P1 spec).
 *
 * The eval harness addresses frames as (sectionId, localProgress) through
 * `gotoSection`; `state()` is the substrate for every structural assertion
 * in evals/assert.ts. The `state()` SHAPE IS A FROZEN CONTRACT
 * (STATE_SCHEMA_VERSION below) — additive changes only; breaking changes
 * bump the version and evals/assert.ts together.
 */

import { isSectionName, type SectionName } from "./constants";
import { freezeClock as freezeClockScalar, getClock } from "./clock";
import { isEvalMode, seedRandom } from "./determinism";
import { bus, type EventBus } from "./events";
import { params } from "./params";
import type { SectionManifestEntry, PinState, SectionRegistry } from "./registry";
import type { ScrollEngine } from "./scroll";
import type { PartialState, StateStore, UiFlags } from "./state";
import type { CameraPose, Stage } from "../webgl/stage";

/** Bump on any breaking change to the state() shape (SPIKE-B Q9).
 *  v2 (2026-08-26, P5 council co-sign — rubric v1.1.0): `scroll` scalar →
 *  `{position, velocity, enabled}` so the rubric's `longpress-lenis-stop`
 *  reads scroll arbitration first-class (`state().scroll.enabled`), closing
 *  the standing schema-v1 SKIP (docs/p1/integrate.md §6 → docs/p3/integrate.md). */
export const STATE_SCHEMA_VERSION = 2;

/* ---- Additive state() extensions (schema v1-compatible) -------------------
 * Interaction systems live outside the engine core, so state() exposes them
 * through registered providers instead of hard imports. Each key is an
 * ADDITIVE top-level field on the snapshot — evals/assert.ts reads them via
 * `state().cursor`, `state().longpress`, `state().camera`. P3 mechanics add
 * their own keys here (explode, colorway …) the same way.
 */

/** Cursor state machine snapshot (mechanic 1). */
export interface CursorStateSnapshot {
  mode: "none" | "text" | "icon";
  /** Live text label ("HOLD TO EXPLORE" | "SELECT MODEL" | "SWAP") or null. */
  label: string | null;
  /** Icon token ("finish-swatch" | "cross" | …) or null — round-trips
   *  SET_CURSOR_ICON exactly (evals/assert.ts `cursor-icon-states`). */
  icon: string | null;
  /** HOLD ring fill 0..1 (mirrors longpress intensity). */
  holdProgress: number;
}

/** Longpress hold-zoom snapshot (mechanic 2). */
export interface LongpressStateSnapshot {
  active: boolean;
  intensity: number;
  /** False while the hold has Lenis stopped. Schema v2 promoted the
   *  canonical flag to `state().scroll.enabled` (engine-level truth:
   *  `!lenis.isStopped`, covers the explode touch-drag stop too); this
   *  mirror stays because it is longpress-CAUSED specifically, and the
   *  cursor smoke asserts it. */
  scrollEnabled: boolean;
}

/** Camera interaction telemetry (dolly-in + parallax under longpress). */
export interface CameraAuxSnapshot {
  /** Effective orbit radius after the longpress dolly-in. */
  dolly: number;
  /** Mouse-parallax gain ×(1 + intensity). */
  parallaxGain: number;
  /** Active section's longpress zoom multiplier. */
  zoomMultiplier: number;
  /** Live look-at target, world space (ADDITIVE — explode lookAt-lerp
   *  evidence: rubric explode-lookat-lerp samples this over frames). */
  lookAt: { x: number; y: number; z: number };
}

/** Live watchface snapshot (dial subsystem wired to the stage screen). */
export interface DialStateSnapshot {
  mode: string;
  complication: string;
  /** Quantized painted heart rate — pinned 64 under `?eval=1`. */
  bpm: number;
  /** Active accent token (biosignal red / Nocturne AOD variant). */
  accent: string;
  /** Displayed seconds — pinned 30 under `?eval=1` (10:09:30). */
  seconds: number;
  /** Dirty-flag proof pair: uploads must stay ≪ frames at rest. */
  uploads: number;
  frames: number;
  fontName: string;
}

/** Hero watch asset snapshot (webgl/watch.ts — GLB plumbing lane). */
export interface WatchStateSnapshot {
  /** True once the GLB is adopted (false = placeholder/failed load). */
  loaded: boolean;
  /** Named nodes indexed from the part_* / grp_* contract. */
  parts: number;
  /** True once the live dial rides the GLB's part_screen mesh. */
  screenAdopted: boolean;
  /** Dial-normal tilt off world-horizontal, degrees (case-space sanity). */
  caseTiltDeg: number;
  /** Active look name ("default" until ?look= or api.look.apply). */
  look: string;
}

/** Disassembly section telemetry (P2 — eval captures wait on readiness). */
export interface DisassemblyStateSnapshot {
  /** Internals wrappers attached under the watch root (0..7). */
  internals: number;
  /** All roster slots resolved — loaded GLB or contract-named stub. */
  internalsReady: boolean;
  /** Live explode scalar 0..1 (webgl-channel authored beat value). */
  explode: number;
}

/** Movement section telemetry (P2 — eval captures wait on SiP readiness). */
export interface MovementStateSnapshot {
  /** Load settled — real geometry on stage OR failed→section degrades. */
  sipReady: boolean;
  /** True when the featured S-SiP mesh actually landed. */
  sipLoaded: boolean;
  /** Camera pose-override blend 0..1 (0 = base rig owns the frame). */
  blend: number;
  /** Turntable spin, degrees (pure function of clock + progress). */
  spinDeg: number;
}

/** Curves section telemetry (P2 — BPM catalog card #1 evidence). */
export interface CurvesStateSnapshot {
  /** Camera pose-override blend 0..1 (0 = base rig owns the frame). */
  blend: number;
  /** Macro standoff, world units (5.4 wide → 3.5 at the chamfer macro). */
  standoff: number;
  /** BPM numerator 0→58 (pure linear map of section progress). */
  bpm: number;
}

/** Hands section telemetry (P2 — side-elevation beat evidence). */
export interface HandsStateSnapshot {
  /** Camera pose-override blend 0..1 (0 = base rig owns the frame). */
  blend: number;
  /** Telephoto dolly distance, world units (105 mm recipe). */
  standoff: number;
  /** Look-target height offset (case composes low when positive). */
  frameY: number;
}

/** MovementWatchRight telemetry (P2 — annotated plate + hover-swap graft). */
export interface MovementWatchRightStateSnapshot {
  /** Annotation anchors resolved against the loaded GLB (part_bezel radius). */
  anchorsReady: boolean;
  /** Camera pose-override blend 0..1 (0 = base rig owns the frame). */
  blend: number;
  /** Hovered annotation id ("dial" | "glass" | "bezel") or null. */
  active: string | null;
}

/** Living BPM vital telemetry (P3 vital lane — src/ui/vital/vital.ts). */
export interface VitalStateSnapshot {
  /** Displayed value — pinned 64 under `?eval=1`. */
  bpm: number;
  /** Live simulated HR before the eval pin (58↔142). */
  rawBpm: number;
  /** Beat phase 0..1 — pinned 0 under `?eval=1`. */
  phase: number;
  /** Beats fired since mount (0 forever under eval). */
  beats: number;
  /** Active signal hex (biosignal / Nocturne variant on dark grounds). */
  signal: string;
  dark: boolean;
  revealed: boolean;
  soundOn: boolean;
  reducedMotion: boolean;
}

/** One clickable part of the exploded view (rubric explode substrate). */
export interface ExplodePartSnapshot {
  id: string;
  hasProxyHitbox: boolean;
  /** Projected proxy-center, CSS px — the scripted-click target. */
  screenPos: { x: number; y: number };
  /** Local-space distance from the rest pose (0 = assembled). */
  offsetFromRest: number;
}

/**
 * Exploded-view mechanic snapshot (P3 explode lane — rubric mechanic 3).
 * NOTE on the state() shape: the rubric (frozen at P0, the mechanics
 * contract) addresses `state().explode.parts/selected/mode/...` — this
 * extension therefore REPLACES the P1 placeholder string at the `explode`
 * key; the StateStore axis token rides inside as `token`. evals/assert.ts
 * was built against the rubric shape; nothing consumed the string form.
 */
export interface ExplodeStateSnapshot {
  /** StateStore axis mirror: assembled | exploded | part-focus. */
  token: string;
  mode: "assembled" | "exploded" | "all" | "selected";
  parts: ExplodePartSnapshot[];
  selected: string | null;
  selectedRotationY: number;
  selectedScreenPos: { x: number; y: number } | null;
  /** Drag-pan cluster yaw, radians. */
  clusterRotation: number;
  /** Interactive XPLOD_ALL ramp 0..1. */
  xplodAll: number;
  dragEnabled: boolean;
  /** Taptic tick-back graft (±0.4 mm @ ~8 Hz on hover; eval-frozen). */
  tapticTick: { active: boolean; offset: number };
  /** Nocturne 1 Hz LED pulse (led_green live, led_red forced dark). */
  nocturneLed: { gated: boolean; green: number; red: number };
}

/** Colorway config snapshot (P3 swap lane — rubric mechanic 4). */
export interface ConfigStateSnapshot {
  /** Active config id (== StateStore colorway axis). */
  active: string;
  finish: string;
  band: string;
  /** Active accent token (the resolved `--accent` value). */
  accent: string;
  /** True while the 1 s material tween is in flight. */
  tweening: boolean;
  /** The available configs (>= 4 — rubric colorway-5param-1s-tween). */
  finishes: {
    id: string;
    finish: string;
    band: string;
    label: string;
    accent: string;
  }[];
}

/** One tracked material's live tween state (rubric samples index 0 at
 *  t=0/0.5/1 s across a swap — all five params must interpolate). */
export interface TrackedMaterialSnapshot {
  name: string;
  /** Config id whose targets this material is at/moving toward. */
  preset: string;
  color: string;
  roughness: number;
  metalness: number;
  envMapIntensity: number;
  /** Colorway-only scalar — written as metalness × this (see ui/colorway.ts). */
  metalnessMapIntensity: number;
}

/** Outro lineup snapshot (P3 swap lane — rubric mechanic 5). */
export interface OutroStateSnapshot {
  /** Watch instances in the lineup (4 once built). */
  instances: number;
  /** Wall-clock rise stagger step, seconds (source: 0.7 + i·0.1). */
  stagger: number;
  /** Config id previewed by SELECT MODEL, or null. */
  selected: string | null;
}

/** Registry of typed extension keys — P3 mechanics extend this interface. */
export interface StateExtensions {
  cursor: CursorStateSnapshot;
  longpress: LongpressStateSnapshot;
  camera: CameraAuxSnapshot;
  dial: DialStateSnapshot;
  watch: WatchStateSnapshot;
  disassembly: DisassemblyStateSnapshot;
  movement: MovementStateSnapshot;
  movementWatchRight: MovementWatchRightStateSnapshot;
  curves: CurvesStateSnapshot;
  hands: HandsStateSnapshot;
  vital: VitalStateSnapshot;
  explode: ExplodeStateSnapshot;
  config: ConfigStateSnapshot;
  materials: TrackedMaterialSnapshot[];
  outro: OutroStateSnapshot;
}

const stateExtensions = new Map<string, () => unknown>();

/* ---- Asset residency (P5 perf-hunt) ---------------------------------------
 * evals/lib.ts waitReady() polls `state().flags.assetsReady` as its asset-
 * residency gate (rubric determinism: "fonts AND assets resident AND
 * settled frames") — a contract member that was never fed. Systems with
 * deferred-to-construction loads (eval mode) register a provider; the flag
 * is the AND of all of them. Every provider SETTLES (true on success,
 * failure, or bounded give-up) — residency can delay readiness, never
 * wedge it.
 */
const residencyProviders: (() => boolean)[] = [];

/** Register a residency signal (additive — call any time before/after
 *  installDebugApi). The provider must eventually return true forever. */
export function registerResidency(provider: () => boolean): void {
  residencyProviders.push(provider);
}

function assetsResident(): boolean {
  for (const p of residencyProviders) if (!p()) return false;
  return true;
}

/**
 * Register an additive state() field. The provider is called lazily on
 * every snapshot, so registration order vs. installDebugApi is irrelevant.
 */
export function extendState<K extends keyof StateExtensions>(
  key: K,
  provider: () => StateExtensions[K],
): void {
  stateExtensions.set(key, provider);
}

/**
 * Read ONE registered extension without building a full state() snapshot —
 * the cheap per-frame consumer hook (e.g. the Mechanism seconds readout
 * gearing to `dial.stats().seconds`, motion bible §5: the readout binds to
 * the dial gear, never UPDATE_ROTATIONS). Null until the system installs.
 */
export function readStateExtension<K extends keyof StateExtensions>(
  key: K,
): StateExtensions[K] | null {
  const provider = stateExtensions.get(key);
  return provider ? (provider() as StateExtensions[K]) : null;
}

/** Scroll snapshot (schema v2 — was a bare `lenis.scroll` scalar in v1). */
export interface ScrollStateSnapshot {
  /** Smoothed scroll offset, px (Lenis-owned — the one smoothing owner). */
  position: number;
  /** Lenis velocity, px/frame (0 at rest; the resize-defer idle signal). */
  velocity: number;
  /** False while ANY system holds Lenis stopped (longpress hold-zoom,
   *  explode touch-drag) — engine-level truth: `!lenis.isStopped`.
   *  Rubric `longpress-lenis-stop` reads this. */
  enabled: boolean;
}

export interface EngineStateSnapshot {
  schema: number;
  /** Section whose track contains the viewport center line. */
  activeSection: SectionName | null;
  /** Pin state of the active section. */
  pinState: PinState;
  cameraPose: CameraPose;
  colorway: string;
  dialMode: string;
  /**
   * Contract-axis token until the explode mechanic installs; then the
   * registered `explode` extension replaces it with the rubric's rich
   * snapshot (see ExplodeStateSnapshot note — rubric-shaped on purpose).
   */
  explode: string | ExplodeStateSnapshot;
  postStack: string;
  uiFlags: UiFlags;
  /**
   * Harness flag block (rubric debug_api: state() "…, flags"). ADDITIVE —
   * `uiFlags` above stays the P1 store mirror; this block is the rubric's
   * named read surface for boot params + engine capabilities:
   * mobile-svh-dvh reads `touchResizeFilter`, deeplink-params reads
   * `eval` / `materialsDebug`.
   */
  flags: {
    eval: boolean;
    materialsDebug: boolean;
    touchResizeFilter: boolean;
    /** All registered residency providers settled (ADDITIVE — P5
     *  perf-hunt; the waitReady() asset-residency gate, see above). */
    assetsReady: boolean;
  };
  scroll: ScrollStateSnapshot;
  clock: number;
  qualityTier: number;
  evalMode: boolean;
  sections: SectionManifestEntry[];
  /* Additive extension fields (present once their system is installed). */
  cursor?: CursorStateSnapshot;
  longpress?: LongpressStateSnapshot;
  camera?: CameraAuxSnapshot;
  dial?: DialStateSnapshot;
  watch?: WatchStateSnapshot;
  disassembly?: DisassemblyStateSnapshot;
  vital?: VitalStateSnapshot;
  config?: ConfigStateSnapshot;
  materials?: TrackedMaterialSnapshot[];
  outro?: OutroStateSnapshot;
}

export interface OneHertzDebugApi {
  /** Section manifest: budgets, dual bounds, live dual progress. */
  sections: SectionManifestEntry[];
  /**
   * Jump to (sectionId, localProgress 0..1) over the RAW bounds.
   * Immediate scroll; under `?eval=1` the whole pipeline settles
   * SYNCHRONOUSLY — when this returns, state() and the rendered frame are
   * final (PLAN §6 determinism).
   */
  gotoSection(id: SectionName, localProgress?: number): void;
  /** Structural state snapshot for assertions (frozen shape, see above). */
  state(): EngineStateSnapshot;
  /**
   * Freeze the page clock scalar at `seed` (0..1) AND re-seed the shared
   * RNG with the same value — one call, fully deterministic page.
   */
  freezeClock(seed: number): void;
  /** Force a quality tier (tiers shed post, never smoothness). */
  forceQualityTier(tier: number): void;
  /**
   * Apply a partial to the live StateStore (ADDITIVE — Nocturne lane).
   * Sections/mechanics write contract axes through this one owner; the boot
   * frame loop bridges `dialMode` token changes to the dial renderer. The
   * state() SHAPE is unchanged (schema stays v1).
   */
  applyState(partial: PartialState): void;
  /**
   * The shared typed event bus (ADDITIVE — evals/assert.ts drives mechanics
   * through `api.bus.emit(...)` / records via `api.bus.on(...)`).
   */
  bus: EventBus;
  /**
   * Post-stack flags (ADDITIVE, gl lane) — look-dev + eval interaction
   * frames (PLAN §6 "Nocturne mid"). Sections drive the same flags through
   * their stage reference in P2.
   */
  gl: {
    /** Per-section DOF flag (honored only at quality tier 0). */
    setDof(enabled: boolean, focus?: number): void;
    /** Vignette flag — Nocturne only (PLAN §3). */
    setVignette(enabled: boolean, strength?: number): void;
    /** Grain base amount dial (weighting stays luminance-driven). */
    setGrainAmount(amount: number): void;
    /** Rotate the environment around Y (lighting-keyframe hook). */
    setEnvRotation(radians: number): void;
    /**
     * scene.environmentIntensity (lighting-keyframe hook — LOOKBIBLE §1.4
     * fix 3; symmetric with setEnvRotation for sweeps + eval wiring).
     */
    setEnvIntensity(intensity: number): void;
    /**
     * Renderer resource counters (ADDITIVE — P5 perf-hunt; EVAL MODE ONLY).
     * The perf harness samples this across its scripted pass to prove GL
     * resources are warm-resident (no mid-scroll program/texture churn).
     */
    info?: () => { programs: number; geometries: number; textures: number; calls: number };
  };
  /**
   * Look-config hot-apply (ADDITIVE, hero-plumbing lane; src/gl/look.ts) —
   * installed by main.ts once the stage exists. `apply` fetches
   * /assets/looks/<name>.json and hot-applies it; `current` reports the
   * active look name.
   */
  look?: {
    apply(name: string): Promise<void>;
    current(): string;
  };
  /**
   * Colorway swap entry point (ADDITIVE — P3 swap lane; the capture kit's
   * preferred path). Emits CONFIG_CHANGE on the bus — the ONE mutation
   * path; every consumer (materials tween, gallery, accents, pickers)
   * hears it identically. `durationS` overrides the 1 s tween.
   */
  setConfig?: (id: string, durationS?: number) => void;
  /**
   * The live Lenis instance (ADDITIVE — P5 perf-hunt; rubric perf.method
   * contract scroll driver). EVAL MODE ONLY: evals/perf.ts drives its
   * scripted pass via `lenis.scrollTo(end, {duration, easing})` — the real
   * smoothing owner — instead of the synthetic-wheel fallback. Absent
   * outside `?eval=1` (no internals leak on the live page).
   */
  lenis?: import("lenis").default;
}

declare global {
  interface Window {
    __ONE_HERTZ__: OneHertzDebugApi;
  }
}

export function installDebugApi(
  registry: SectionRegistry,
  engine: ScrollEngine,
  stage: Stage,
  store: StateStore,
): OneHertzDebugApi {
  const api: OneHertzDebugApi = {
    get sections() {
      return registry.manifest();
    },
    gotoSection(id, localProgress = 0) {
      if (!isSectionName(id)) throw new Error(`gotoSection: unknown section "${id}"`);
      const target = registry.scrollPositionFor(id, localProgress);
      engine.scrollTo(target, true);
      if (isEvalMode) engine.settleSync(target);
    },
    state() {
      const active = registry.activeSection();
      const contract = store.get();
      const snapshot: EngineStateSnapshot = {
        schema: STATE_SCHEMA_VERSION,
        activeSection: active,
        pinState: registry.pinState(active),
        cameraPose: stage.cameraPose(),
        colorway: contract.colorway,
        dialMode: contract.dialMode,
        explode: contract.explode,
        postStack: contract.postStack,
        uiFlags: { ...store.uiFlags },
        flags: {
          eval: isEvalMode,
          materialsDebug: params.materials,
          touchResizeFilter: engine.touchResizeFilterArmed,
          assetsReady: assetsResident(),
        },
        scroll: {
          position: engine.lenis.scroll,
          velocity: engine.lenis.velocity,
          enabled: !engine.lenis.isStopped,
        },
        clock: getClock(),
        qualityTier: stage.tier,
        evalMode: isEvalMode,
        sections: registry.manifest(),
      };
      for (const [key, provider] of stateExtensions) {
        (snapshot as unknown as Record<string, unknown>)[key] = provider();
      }
      return snapshot;
    },
    freezeClock(seed) {
      freezeClockScalar(seed);
      seedRandom(Math.floor(seed * 0xffffffff));
    },
    forceQualityTier(tier) {
      stage.forceQualityTier(tier);
    },
    applyState(partial) {
      store.apply(partial);
    },
    bus,
    gl: {
      setDof: (enabled, focus) => stage.post.setDof(enabled, focus),
      setVignette: (enabled, strength) =>
        strength === undefined
          ? stage.post.setVignette(enabled)
          : stage.post.setVignette(enabled, strength),
      setGrainAmount: (amount) => stage.post.setGrainAmount(amount),
      setEnvRotation: (radians) => stage.setEnvRotation(radians),
      setEnvIntensity: (intensity) => stage.setEnvIntensity(intensity),
    },
  };
  // Contract scroll driver (perf.ts preference #1) — eval-gated on purpose.
  if (isEvalMode) {
    api.lenis = engine.lenis;
    api.gl.info = () => ({
      programs: stage.renderer.info.programs?.length ?? 0,
      geometries: stage.renderer.info.memory.geometries,
      textures: stage.renderer.info.memory.textures,
      calls: stage.renderer.info.render.calls,
    });
  }
  window.__ONE_HERTZ__ = api;
  return api;
}
