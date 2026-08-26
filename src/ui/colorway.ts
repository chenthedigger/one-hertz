/**
 * Colorway swap — CONFIG_CHANGE owner (PLAN §1 mechanic 4 + §1 mechanic 5's
 * restart hook; rubric items colorway-* / outro-swap-restart-loop).
 *
 * ONE mutation path: every entry point (Parts picker, Colors rail, outro
 * SELECT+SWAP, `__ONE_HERTZ__.setConfig`, the eval harness) emits
 * CONFIG_CHANGE on the typed bus; this system is a bus CONSUMER like the
 * gallery and the Colors captions — nobody applies materials directly.
 *
 * The config axis (founder decision 2026-08-26, project CLAUDE.md): TWO
 * titanium finishes (natural / black-DLC) × Ocean-band COLOR recolors —
 * pure material swaps on the existing geometry. Alpine/Trail GEOMETRY stays
 * reserved pending the dika3d purchase; the four shipped configs below are
 * finish × band-color combinations, which keeps the outro's 4-instance
 * lineup truthful (each instance really wears its config).
 *
 * Material truth lives in the LOOK JSON (`x_colorway` in instrument.json:
 * per-finish and per-band {color, roughness, metalness, envMapIntensity,
 * metalnessMapIntensity} tables — docs/p15/plumbing.md §2 schema family).
 * This module owns the WALL-CLOCK transition: one 1 s GSAP tween per swap
 * (power3.inOut, motion-bible default) interpolating all five params for
 * every affected material — a graded material transition, never an instant
 * repaint (rubric colorway-5param-1s-tween). `duration: 0` (the outro SWAP
 * restart) applies synchronously.
 *
 * `metalnessMapIntensity`: three.js has no such scalar — metalness IS the
 * factor multiplied against the metalnessMap sample. The channel is
 * therefore implemented as a tweened scalar whose product with `metalness`
 * is written to material.metalness (scaling the factor scales the map's
 * contribution — same math, one uniform). Both live values are reported in
 * state().materials.
 *
 * Consumers fanned out from here on every swap:
 *   - hero materials (tween above) — mind plumbing pitfall #4: material
 *     instances are re-read from `watch.materials` on every apply, never
 *     cached across an applyLook.
 *   - dial accent (DialRenderer.setAccent — second-hand + beat dot),
 *   - BPM vital accent (LivingVital.setAccent — trace + QRS flash),
 *   - page accent tokens: `--accent` (the rubric's read) + `--biosignal`
 *     (the site-wide accent family: cursor HOLD ring, vital chrome). The
 *     per-config accents stay in the biosignal red family ON PURPOSE — the
 *     heart stays red (PLAN §2 thesis); the config modulates its temper.
 *   - StateStore `colorway` axis (state().colorway stays truthful),
 *   - gallery / Colors captions / Parts card / outro labels — their own
 *     bus listeners (they re-use `resolveConfig` below).
 *
 * Restart (rubric outro-swap-restart-loop): payload `restart: true` applies
 * the config at duration 0 and calls the injected restart hook
 * (lenis.scrollTo(0, immediate) — main.ts wires it) — the site replays
 * from the top in the chosen finish.
 */

import { gsap } from "gsap";
import { Color, type MeshStandardMaterial } from "three";
import type {
  ConfigStateSnapshot,
  TrackedMaterialSnapshot,
} from "../core/debug";
import { extendState } from "../core/debug";
import { bus, EngineEvent, type EnginePayloads } from "../core/events";
import type { StateStore } from "../core/state";
import type { DialRenderer } from "../dial/renderer";
import type { LookConfig, MaterialOverride } from "../gl/look";
import type { Stage } from "../webgl/stage";
import type { LivingVital } from "./vital/vital";

/* ---- the config table (UI copy + accents; material truth is look JSON) ---- */

export interface ColorwayConfig {
  /** Config id — the gallery asset token (`${id}_${n}.webp`) and the
   *  StateStore colorway axis value. */
  readonly id: string;
  /** Finish variant key into the look's x_colorway.finishes table. */
  readonly finish: string;
  /** Band variant key into the look's x_colorway.bands table. */
  readonly band: string;
  /** Display label ("Natural Titanium · Tide"). */
  readonly label: string;
  readonly finishLabel: string;
  readonly bandLabel: string;
  /** UI chip hexes only — never material truth (LOOKBIBLE §1.3 anchors). */
  readonly finishHex: string;
  readonly bandHex: string;
  /** Accent token — biosignal family, tempered per config (see header). */
  readonly accent: string;
}

export const CONFIGS: readonly ColorwayConfig[] = [
  {
    id: "natural-titanium",
    finish: "natural",
    band: "tide",
    label: "Natural Titanium · Tide",
    finishLabel: "NATURAL",
    bandLabel: "TIDE",
    finishHex: "#cfccc6",
    bandHex: "#1f6153",
    accent: "#ff2d55", // the base biosignal — this IS the boot state
  },
  {
    id: "black-graphite",
    finish: "black-dlc",
    band: "graphite",
    label: "Black DLC · Graphite",
    finishLabel: "BLACK DLC",
    bandLabel: "GRAPHITE",
    finishHex: "#17181b",
    bandHex: "#33363a",
    accent: "#ff453a",
  },
  {
    id: "natural-ember",
    finish: "natural",
    band: "ember",
    label: "Natural Titanium · Ember",
    finishLabel: "NATURAL",
    bandLabel: "EMBER",
    finishHex: "#cfccc6",
    bandHex: "#b0431d",
    accent: "#ff5a2d",
  },
  {
    id: "black-midnight",
    finish: "black-dlc",
    band: "midnight",
    label: "Black DLC · Midnight",
    finishLabel: "BLACK DLC",
    bandLabel: "MIDNIGHT",
    finishHex: "#17181b",
    bandHex: "#1b2740",
    accent: "#ff2d6e",
  },
];

/** INITIAL_STATE.colorway — config 0 is the page's boot state. */
export const DEFAULT_CONFIG_ID = "natural-titanium";

export function configById(id: string): ColorwayConfig | null {
  return CONFIGS.find((c) => c.id === id) ?? null;
}

/**
 * Normalize any CONFIG_CHANGE payload shape to a config. Accepts the
 * canonical `{config: "<id>"}` (harness + all in-repo emitters) and the
 * legacy `{finish, band}` pair (P2 sockets spoke finish tokens).
 */
export function resolveConfig(
  payload: Partial<EnginePayloads[EngineEvent.ConfigChange]> | undefined,
): ColorwayConfig | null {
  if (!payload) return null;
  if (payload.config !== undefined) return configById(payload.config);
  if (payload.finish !== undefined) {
    const byId = configById(payload.finish); // finish field carrying an id
    if (byId) return byId;
    return (
      CONFIGS.find(
        (c) =>
          (c.finish === payload.finish || c.id.startsWith(String(payload.finish))) &&
          (payload.band === undefined || c.band === payload.band),
      ) ?? CONFIGS.find((c) => c.finish === payload.finish) ?? null
    );
  }
  return null;
}

/* ---- resolved per-material tween targets ---------------------------------- */

/** The five tweened params (rubric colorway-5param-1s-tween). */
export interface ColorwayParams {
  color: string;
  roughness: number;
  metalness: number;
  envMapIntensity: number;
  metalnessMapIntensity: number;
}

/**
 * Write resolved params onto a material (static apply — the Footer lineup
 * skins its per-instance material clones through this same helper).
 * Effective metalness = metalness × metalnessMapIntensity (see header).
 */
export function applyColorwayParams(
  material: MeshStandardMaterial,
  p: ColorwayParams,
): void {
  material.color.set(p.color);
  material.roughness = p.roughness;
  material.metalness = p.metalness * p.metalnessMapIntensity;
  material.envMapIntensity = p.envMapIntensity;
  material.userData["colorwayParams"] = { ...p };
}

/* ---- live tween state ------------------------------------------------------ */

interface LiveParams {
  color: Color; // working-space (linear) — lerped component-wise
  roughness: number;
  metalness: number;
  envMapIntensity: number;
  metalnessMapIntensity: number;
}

function toLive(p: ColorwayParams): LiveParams {
  return {
    color: new Color(p.color),
    roughness: p.roughness,
    metalness: p.metalness,
    envMapIntensity: p.envMapIntensity,
    metalnessMapIntensity: p.metalnessMapIntensity,
  };
}

/** Snapshot copy — the tween's `from` must NEVER alias the live (mutated)
 *  params, or every tick lerps from its own last output and the 1 s grade
 *  collapses into an exponential snap (bit this lane on the first smoke). */
function cloneLive(p: LiveParams): LiveParams {
  return {
    color: p.color.clone(),
    roughness: p.roughness,
    metalness: p.metalness,
    envMapIntensity: p.envMapIntensity,
    metalnessMapIntensity: p.metalnessMapIntensity,
  };
}

function lerpLive(from: LiveParams, to: LiveParams, t: number, out: LiveParams): void {
  out.color.copy(from.color).lerp(to.color, t);
  out.roughness = from.roughness + (to.roughness - from.roughness) * t;
  out.metalness = from.metalness + (to.metalness - from.metalness) * t;
  out.envMapIntensity =
    from.envMapIntensity + (to.envMapIntensity - from.envMapIntensity) * t;
  out.metalnessMapIntensity =
    from.metalnessMapIntensity +
    (to.metalnessMapIntensity - from.metalnessMapIntensity) * t;
}

/** Materials reported in state().materials, in order (m[0] = the harness's
 *  tracked material — mat_titanium_case changes on every adjacent-index
 *  swap because CONFIGS alternates finishes). */
const TRACKED: readonly string[] = ["mat_titanium_case", "mat_band_ocean"];

/** Swap transition length, seconds (rubric: 1 s ± 0.15). */
export const SWAP_TWEEN_S = 1;

const round3 = (v: number): number => Math.round(v * 1000) / 1000;

/* ---- the system ------------------------------------------------------------ */

export interface ColorwaySystemOptions {
  stage: Stage;
  store: StateStore;
  dial: DialRenderer;
  vital: LivingVital;
  /** Hard-restart hook: lenis.scrollTo(0, immediate) (+ eval settle). */
  restart: () => void;
}

export class ColorwaySystem {
  private lookTables: NonNullable<LookConfig["x_colorway"]> | null = null;
  private active: ColorwayConfig = CONFIGS[0] as ColorwayConfig;
  private readonly live = new Map<string, LiveParams>();
  private swapTween: gsap.core.Tween | null = null;
  private tweening = false;
  private warnedNoTables = false;

  /** Cursor finish-swatch delegation bookkeeping. */
  private hoverEl: HTMLElement | null = null;

  constructor(private readonly opts: ColorwaySystemOptions) {
    // Page accent tokens exist from boot (the rubric reads --accent; the
    // boot value equals the shipped --biosignal, so nothing regrades).
    this.applyAccents(this.active);

    bus.on(EngineEvent.ConfigChange, (payload) => {
      const cfg = resolveConfig(payload);
      if (!cfg) {
        console.warn(`colorway: unknown CONFIG_CHANGE payload ${JSON.stringify(payload)} — ignored`);
        return;
      }
      const restart = payload?.restart === true;
      const duration = payload?.duration ?? (restart ? 0 : SWAP_TWEEN_S);
      this.setConfig(cfg, duration);
      if (restart) this.opts.restart();
    });

    // Finish-swatch cursor icon over any picker swatch / outro model
    // (LOOKBIBLE §10 icon channel). Clears ONLY when leaving our own
    // elements — never stomps another system's icon (explode pitfall #1).
    document.addEventListener(
      "pointerover",
      (e) => {
        const el =
          e.target instanceof Element
            ? e.target.closest<HTMLElement>("[data-finish], [data-outro-model]")
            : null;
        if (el === this.hoverEl) return;
        const hadOurs = this.hoverEl !== null;
        this.hoverEl = el;
        if (el) {
          const id = el.dataset["finish"] ?? el.dataset["outroModel"] ?? "";
          const cfg = configById(id);
          bus.emit(EngineEvent.SetCursorIcon, {
            icon: "finish-swatch",
            ...(cfg ? { color: cfg.bandHex } : {}),
          });
        } else if (hadOurs) {
          bus.emit(EngineEvent.SetCursorIcon, { icon: null });
        }
      },
      { passive: true },
    );

    extendState("config", () => this.configSnapshot());
    extendState("materials", () => this.materialsSnapshot());
  }

  /** Active look landed/changed — (re)learn the x_colorway variant tables. */
  setLook(look: LookConfig): void {
    this.lookTables = look.x_colorway ?? null;
    if (this.lookTables === null) {
      if (!this.warnedNoTables) {
        this.warnedNoTables = true;
        console.warn(
          `colorway: look "${look.name ?? "?"}" ships no x_colorway tables — ` +
            "config swaps will move accents/gallery/state but not materials",
        );
      }
      return;
    }
    // Seed the live state at the active config's authored values (the look
    // itself just applied its base overrides = config 0's values).
    const targets = this.materialTargetsFor(this.active.id);
    if (targets) {
      for (const [name, p] of targets) this.live.set(name, toLive(p));
    }
  }

  activeConfig(): ColorwayConfig {
    return this.active;
  }

  /**
   * Merged finish+band param table for a config, or null when the active
   * look ships no tables. Used by the tween AND by the Footer lineup's
   * per-instance static skins.
   */
  materialTargetsFor(configId: string): Map<string, ColorwayParams> | null {
    const cfg = configById(configId);
    const tables = this.lookTables;
    if (!cfg || !tables) return null;
    const merged = new Map<string, ColorwayParams>();
    const collect = (source: Record<string, MaterialOverride> | undefined): void => {
      if (!source) return;
      for (const [mat, o] of Object.entries(source)) {
        if (
          o.color === undefined ||
          o.roughness === undefined ||
          o.metalness === undefined ||
          o.envMapIntensity === undefined
        ) {
          console.warn(`colorway: variant for "${mat}" missing a tween param — skipped`);
          continue;
        }
        merged.set(mat, {
          color: o.color,
          roughness: o.roughness,
          metalness: o.metalness,
          envMapIntensity: o.envMapIntensity,
          metalnessMapIntensity: o.metalnessMapIntensity ?? 1,
        });
      }
    };
    collect(tables.finishes?.[cfg.finish]);
    collect(tables.bands?.[cfg.band]);
    return merged.size > 0 ? merged : null;
  }

  /**
   * Apply a config. `duration` in seconds — one GSAP tween interpolates all
   * five params for every affected material (0 = synchronous, the restart
   * path). Everything else (accents, store axis) lands immediately: the
   * material grade is the transition; the tokens are the destination.
   */
  setConfig(target: ColorwayConfig | string, duration: number = SWAP_TWEEN_S): void {
    const cfg = typeof target === "string" ? configById(target) : target;
    if (!cfg) {
      console.warn(`colorway: setConfig("${String(target)}") — unknown config`);
      return;
    }

    this.active = cfg;
    this.applyAccents(cfg);
    this.opts.store.apply({ colorway: cfg.id });

    const targets = this.materialTargetsFor(cfg.id);
    if (!targets) return; // no tables (or config unknown to the look) — tokens only

    this.swapTween?.kill();
    this.swapTween = null;

    // Capture from/to ONCE; materials are re-read from the live watch map
    // on every application tick (plumbing pitfall #4).
    const names = [...targets.keys()];
    const from = new Map<string, LiveParams>();
    const to = new Map<string, LiveParams>();
    for (const name of names) {
      const t = targets.get(name) as ColorwayParams;
      const current = this.live.get(name);
      from.set(name, current ? cloneLive(current) : toLive(t));
      to.set(name, toLive(t));
      if (!this.live.has(name)) this.live.set(name, toLive(t));
    }

    const applyAt = (t: number): void => {
      for (const name of names) {
        const lv = this.live.get(name);
        const f = from.get(name);
        const g = to.get(name);
        if (!lv || !f || !g) continue;
        lerpLive(f, g, t, lv);
        this.writeMaterial(name, lv);
      }
    };

    if (duration <= 0) {
      this.tweening = false;
      applyAt(1);
      return;
    }
    const state = { t: 0 };
    this.tweening = true;
    this.swapTween = gsap.to(state, {
      t: 1,
      duration,
      ease: "power3.inOut", // motion-bible default — a graded transition
      onUpdate: () => applyAt(state.t),
      onComplete: () => {
        this.tweening = false;
      },
    });
  }

  /* ---- internals ----------------------------------------------------------- */

  private writeMaterial(name: string, lv: LiveParams): void {
    const material = this.opts.stage.watch?.materials.get(name);
    if (!material) return; // GLB failed/loading — tokens still applied
    material.color.copy(lv.color);
    material.roughness = lv.roughness;
    material.metalness = lv.metalness * lv.metalnessMapIntensity;
    material.envMapIntensity = lv.envMapIntensity;
  }

  private applyAccents(cfg: ColorwayConfig): void {
    const root = document.documentElement;
    root.style.setProperty("--accent", cfg.accent);
    root.style.setProperty("--biosignal", cfg.accent);
    this.opts.dial.setAccent(cfg.accent);
    this.opts.vital.setAccent(cfg.accent);
  }

  /* ---- state() providers ---------------------------------------------------- */

  private configSnapshot(): ConfigStateSnapshot {
    return {
      active: this.active.id,
      finish: this.active.finish,
      band: this.active.band,
      accent: this.active.accent,
      tweening: this.tweening,
      finishes: CONFIGS.map((c) => ({
        id: c.id,
        finish: c.finish,
        band: c.band,
        label: c.label,
        accent: c.accent,
      })),
    };
  }

  private materialsSnapshot(): TrackedMaterialSnapshot[] {
    const out: TrackedMaterialSnapshot[] = [];
    for (const name of TRACKED) {
      const lv = this.live.get(name);
      if (lv) {
        out.push({
          name,
          preset: this.active.id,
          color: `#${lv.color.getHexString()}`,
          roughness: round3(lv.roughness),
          metalness: round3(lv.metalness),
          envMapIntensity: round3(lv.envMapIntensity),
          metalnessMapIntensity: round3(lv.metalnessMapIntensity),
        });
        continue;
      }
      // Tables not landed yet — report the live three.js material so the
      // snapshot is never a lie (params minus the colorway-only scalar).
      const material = this.opts.stage.watch?.materials.get(name);
      if (!material) continue;
      out.push({
        name,
        preset: this.active.id,
        color: `#${material.color.getHexString()}`,
        roughness: round3(material.roughness),
        metalness: round3(material.metalness),
        envMapIntensity: round3(material.envMapIntensity),
        metalnessMapIntensity: 1,
      });
    }
    return out;
  }
}

/* ---- module seam (sections import the accessor — stageRef pattern) -------- */

let system: ColorwaySystem | null = null;

export function provideColorway(s: ColorwaySystem): void {
  system = s;
}

export function getColorwaySystem(): ColorwaySystem | null {
  return system;
}
