/**
 * Look configs — `?look=<name>` (PLAN §3 lighting/material/post levers as
 * ONE hot-appliable document; P1.5 look agents author these).
 *
 * A look lives at `public/assets/looks/<name>.json` and is applied to the
 * live stage + post chain + CSS tokens + hero materials without a reload
 * (`applyLook`). Absent field = leave the current value untouched, at every
 * level of the schema — a look may retune a single bloom constant.
 *
 * THE SCHEMA (build contract — see docs/p15/plumbing.md for field-by-field
 * semantics):
 *
 * {
 *   "envFile":   "/assets/env/<file>.hdr",      // Radiance HDR → PMREM swap
 *   "envParams": { "sky": [c1,c2,c3,c4],        // OR procedural gradient env
 *                  "band": {"y","height","alpha"} },
 *   "lightRig":  { "envRotationDeg": 0,          // scene.environmentRotation.y
 *                  "envIntensity": 1.0,          // scene.environmentIntensity
 *                  "exposure": 1.0 },            // renderer.toneMappingExposure
 *   "postTune":  { "bloomThreshold": 1.0, "bloomStrength": 0.7,
 *                  "bloomRadius": 0.35, "grainAmount": 0.055,
 *                  "vignetteNocturne": 0.32 },
 *   "bgTokens":  { "stage": "#EBEBEB", "ink": "#0B0B0C" },
 *   "contactShadow": { "opacity": 0.3, "radius": 1.1, "falloff": 2.0 },
 *   "x_sectionLightKeyframes": { "keyframes": [ ... ] },  // gl/lightKeyframes.ts
 *   "materialOverrides": {
 *     "mat_band_ocean": { "color": "#2f7d6b", "roughness": 0.6, ... }
 *   }
 * }
 *
 * `envFile` wins if both env fields are present. Look JSONs are data, not
 * code: unknown material names warn and skip; unknown top-level keys are
 * ignored (forward-compatible).
 */

import { Color, MeshPhysicalMaterial } from "three";
import type { ContactShadowTune } from "./contactShadow";
import {
  buildProceduralEnv,
  loadHdrEnv,
  type ProceduralEnvParams,
} from "./env";
import type { SectionLightKeyframe } from "./lightKeyframes";
import type { PostTune } from "./post";
import type { Stage } from "../webgl/stage";
import { ensurePhysical, type WatchAsset } from "../webgl/watch";

/** Per-material override — keys map 1:1 onto material properties. */
export interface MaterialOverride {
  /** CSS hex color → material.color. */
  color?: string;
  roughness?: number;
  metalness?: number;
  /** 0..1 — upgrades the material to MeshPhysicalMaterial if needed. */
  anisotropy?: number;
  /** Radians — anisotropy direction (physical upgrade too). */
  anisotropyRotation?: number;
  /** 0..1 — physical upgrade. */
  clearcoat?: number;
  clearcoatRoughness?: number;
  /**
   * Index of refraction (MeshPhysicalMaterial.ior, default 1.5) — physical
   * upgrade. Lets looks state the sapphire 1.77 as config instead of
   * inheriting the in-code 1.76 first-pass (porcelain/instrument blocker #1).
   */
  ior?: number;
  envMapIntensity?: number;
  /**
   * Colorway tween channel (rubric mechanic 4). three.js has no such
   * scalar — the colorway system (src/ui/colorway.ts) OWNS this field and
   * writes metalness × metalnessMapIntensity to material.metalness
   * (metalness IS the metalnessMap multiplier, so scaling the factor
   * scales the map's contribution). `applyLook` deliberately ignores it:
   * author it only inside `x_colorway` variant tables.
   */
  metalnessMapIntensity?: number;
  /** Extra levers first-pass fixes exposed (crystal etc.). */
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

export interface LightRigParams {
  /** Environment rotation around Y, degrees (lighting-keyframe base pose). */
  envRotationDeg?: number;
  /** scene.environmentIntensity multiplier (r163+). */
  envIntensity?: number;
  /** renderer.toneMappingExposure. */
  exposure?: number;
}

export interface BgTokens {
  /** Stage/porcelain: scene.background + CSS `--porcelain`. */
  stage?: string;
  /** Ink: CSS `--ink`. */
  ink?: string;
}

export interface LookConfig {
  /** Optional display name (defaults to the file basename). */
  name?: string;
  /** Radiance .hdr URL to PMREM + swap in (wins over envParams). */
  envFile?: string;
  /** Procedural gradient env parameters (see gl/env.ts). */
  envParams?: ProceduralEnvParams;
  lightRig?: LightRigParams;
  postTune?: PostTune;
  bgTokens?: BgTokens;
  /**
   * Contact-shadow treatment (LOOKBIBLE §1.4 fix 2): `{opacity, radius,
   * falloff}` — opacity on the material, radius as absolute world radius
   * (overrides the footprint-derived default), falloff as the exponent on
   * the pixel-wise `(1-r)^falloff` alpha curve (gl/contactShadow.ts).
   */
  contactShadow?: ContactShadowTune;
  /** Keyed by `mat_*` material name from the hero GLB naming contract. */
  materialOverrides?: Record<string, MaterialOverride>;
  /**
   * Per-section lighting keyframes (LOOKBIBLE §1.5 — DATA in the look
   * JSON, wired by gl/lightKeyframes.ts off the raw scroll). The `x_`
   * prefix is historical (the key predates driver support); it is now a
   * first-class schema field. Other `x_*` keys remain ignored-by-design.
   */
  x_sectionLightKeyframes?: {
    comment?: string;
    keyframes?: SectionLightKeyframe[];
  };
  /**
   * Colorway variant tables (P3 swap mechanic — DATA in the look JSON,
   * consumed by src/ui/colorway.ts, never by applyLook). `finishes` keys
   * are finish tokens ("natural" / "black-dlc"), `bands` keys are Ocean
   * recolor tokens; each value maps mat_* names to the FIVE tween params
   * {color, roughness, metalness, envMapIntensity, metalnessMapIntensity}.
   * The "natural"+"tide" tables MUST mirror the look's base
   * materialOverrides — they are the boot state the first swap tweens FROM.
   * (Supersedes the x_dlcVariant stash; first-class like
   * x_sectionLightKeyframes, other x_* keys stay ignored-by-design.)
   */
  x_colorway?: {
    comment?: string;
    finishes?: Record<string, Record<string, MaterialOverride>>;
    bands?: Record<string, Record<string, MaterialOverride>>;
  };
}

/**
 * The current TEMP look, as data — what the stage boots with, plus the
 * Ocean-band color correction (DEVICE-DECISION defect #3: the USDZ ships
 * washed mint 0.525/1.0/0.45; this deepens it toward a believable
 * fluoroelastomer green — P1.5 owns the real Apple-reference color).
 * `public/assets/looks/default.json` mirrors this object.
 */
export const DEFAULT_LOOK: LookConfig = {
  name: "default",
  // No envFile/envParams: the stage's boot env (studio HDR over procedural
  // fallback) IS the default — don't refetch what is already lit.
  lightRig: { envRotationDeg: 0, envIntensity: 1.0, exposure: 1.0 },
  postTune: {
    bloomThreshold: 1.0,
    bloomStrength: 0.7,
    bloomRadius: 0.35,
    grainAmount: 0.055,
    vignetteNocturne: 0.32,
  },
  bgTokens: { stage: "#EBEBEB", ink: "#0B0B0C" },
  materialOverrides: {
    // Ocean band correction (defect #3). The bright studio env lifts
    // fluoroelastomer hard, so the correction is color + envMapIntensity
    // together — judged against the rendered frame, not the swatch.
    mat_band_ocean: { color: "#1f6153", roughness: 0.58, envMapIntensity: 0.45 },
    // The band tabs ship the same washed mint — one colorway, one correction.
    mat_band_tab: { color: "#1f6153", roughness: 0.66, envMapIntensity: 0.45 },
  },
};

/** Fetch `/assets/looks/<name>.json`. Throws on 404/parse — caller decides. */
export async function loadLook(name: string): Promise<LookConfig> {
  const res = await fetch(`/assets/looks/${name}.json`);
  if (!res.ok) throw new Error(`look: ${name}.json → HTTP ${res.status}`);
  const config = (await res.json()) as LookConfig;
  config.name = config.name ?? name;
  return config;
}

/**
 * Hot-apply a look to the live stage. Async only for `envFile` (HDR fetch +
 * PMREM); everything else lands synchronously before the promise resolves.
 * `watch` may be null (GLB still loading / failed): material overrides are
 * then skipped with a warn — call again after adoption.
 */
export async function applyLook(
  stage: Stage,
  watch: WatchAsset | null,
  look: LookConfig,
): Promise<void> {
  // ---- Environment ---------------------------------------------------------
  if (look.envFile !== undefined) {
    const env = await loadHdrEnv(stage.renderer, look.envFile);
    if (env) stage.swapEnvironment(env);
  } else if (look.envParams !== undefined) {
    stage.swapEnvironment(buildProceduralEnv(stage.renderer, look.envParams));
  }

  // ---- Light rig -----------------------------------------------------------
  const rig = look.lightRig;
  if (rig?.envRotationDeg !== undefined) {
    stage.setEnvRotation((rig.envRotationDeg * Math.PI) / 180);
  }
  if (rig?.envIntensity !== undefined) stage.setEnvIntensity(rig.envIntensity);
  if (rig?.exposure !== undefined) stage.renderer.toneMappingExposure = rig.exposure;

  // ---- Post tune -----------------------------------------------------------
  if (look.postTune) stage.post.tune(look.postTune);

  // ---- Contact shadow (LOOKBIBLE §1.4 fix 2) -------------------------------
  if (look.contactShadow) stage.tuneContactShadow(look.contactShadow);

  // ---- Background tokens (scene + CSS custom properties) --------------------
  const bg = look.bgTokens;
  if (bg?.stage !== undefined) {
    stage.setStageColor(bg.stage);
    document.documentElement.style.setProperty("--porcelain", bg.stage);
  }
  if (bg?.ink !== undefined) {
    document.documentElement.style.setProperty("--ink", bg.ink);
  }

  // ---- Material overrides ---------------------------------------------------
  const overrides = look.materialOverrides;
  if (overrides && Object.keys(overrides).length > 0) {
    if (watch === null) {
      console.warn("look: materialOverrides skipped — watch asset not loaded yet");
    } else {
      for (const [name, override] of Object.entries(overrides)) {
        applyMaterialOverride(watch, name, override);
      }
    }
  }
}

function applyMaterialOverride(
  watch: WatchAsset,
  name: string,
  o: MaterialOverride,
): void {
  const needsPhysical =
    o.anisotropy !== undefined ||
    o.anisotropyRotation !== undefined ||
    o.clearcoat !== undefined ||
    o.clearcoatRoughness !== undefined ||
    o.ior !== undefined;

  const material = needsPhysical
    ? ensurePhysical(watch, name)
    : (watch.materials.get(name) ?? null);
  if (material === null) {
    console.warn(`look: unknown material "${name}" — override skipped`);
    return;
  }

  if (o.color !== undefined) material.color = new Color(o.color);
  if (o.roughness !== undefined) material.roughness = o.roughness;
  if (o.metalness !== undefined) material.metalness = o.metalness;
  if (o.envMapIntensity !== undefined) material.envMapIntensity = o.envMapIntensity;
  if (o.emissive !== undefined) material.emissive = new Color(o.emissive);
  if (o.emissiveIntensity !== undefined) material.emissiveIntensity = o.emissiveIntensity;
  if (o.opacity !== undefined) {
    material.opacity = o.opacity;
    material.transparent = o.opacity < 1;
  }
  if (material instanceof MeshPhysicalMaterial) {
    if (o.anisotropy !== undefined) material.anisotropy = o.anisotropy;
    if (o.anisotropyRotation !== undefined) {
      material.anisotropyRotation = o.anisotropyRotation;
    }
    if (o.clearcoat !== undefined) material.clearcoat = o.clearcoat;
    if (o.clearcoatRoughness !== undefined) {
      material.clearcoatRoughness = o.clearcoatRoughness;
    }
    if (o.ior !== undefined) material.ior = o.ior;
  }
  material.needsUpdate = true;
}
