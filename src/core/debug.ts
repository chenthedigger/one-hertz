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
import type { SectionManifestEntry, PinState, SectionRegistry } from "./registry";
import type { ScrollEngine } from "./scroll";
import type { StateStore, UiFlags } from "./state";
import type { CameraPose, Stage } from "../webgl/stage";

/** Bump on any breaking change to the state() shape (SPIKE-B Q9). */
export const STATE_SCHEMA_VERSION = 1;

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
  /** False while the hold has Lenis stopped (the `scroll.enabled` flag the
   *  eval wants lives here — state().scroll must stay a scalar in schema 1). */
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

/** Registry of typed extension keys — P3 mechanics extend this interface. */
export interface StateExtensions {
  cursor: CursorStateSnapshot;
  longpress: LongpressStateSnapshot;
  camera: CameraAuxSnapshot;
  dial: DialStateSnapshot;
  watch: WatchStateSnapshot;
}

const stateExtensions = new Map<string, () => unknown>();

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

export interface EngineStateSnapshot {
  schema: number;
  /** Section whose track contains the viewport center line. */
  activeSection: SectionName | null;
  /** Pin state of the active section. */
  pinState: PinState;
  cameraPose: CameraPose;
  colorway: string;
  dialMode: string;
  explode: string;
  postStack: string;
  uiFlags: UiFlags;
  scroll: number;
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
        scroll: engine.lenis.scroll,
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
    bus,
    gl: {
      setDof: (enabled, focus) => stage.post.setDof(enabled, focus),
      setVignette: (enabled, strength) =>
        strength === undefined
          ? stage.post.setVignette(enabled)
          : stage.post.setVignette(enabled, strength),
      setGrainAmount: (amount) => stage.post.setGrainAmount(amount),
      setEnvRotation: (radians) => stage.setEnvRotation(radians),
    },
  };
  window.__ONE_HERTZ__ = api;
  return api;
}
