/**
 * Per-section lighting keyframe driver (LOOKBIBLE §1.4 fix 1 + §1.5 wiring
 * contract) — the system that makes the winning look's live identity real.
 *
 * The active look config carries `x_sectionLightKeyframes.keyframes`: one
 * key per canonical section holding {envRotationDeg, envIntensity, exposure,
 * bloomStrength?, bgStage?}. This driver anchors each key at its section's
 * CENTER (progressDom 0.5 over the raw bounds — "section-center keys",
 * LOOKBIBLE §1.5) and, every frame, interpolates between the two keys that
 * bracket the raw Lenis scroll. Segment interpolation is eased
 * `power2.inOut` per the light-motion law (light never snaps — motion bible
 * §1 / LOOKBIBLE §1.5).
 *
 * Applied channels:
 *   envRotationDeg → stage.setEnvRotation      (radians)
 *   envIntensity   → stage.setEnvIntensity
 *   exposure       → renderer.toneMappingExposure
 *   bloomStrength  → stage.post.tune           (absent on a key = look base)
 *   bgStage        → stage.setStageColor + CSS `--porcelain`
 *                    (absent on a key = the look's bgTokens.stage — the
 *                     ink/porcelain split-stage grammar rides this: DOM and
 *                     WebGL grounds darken as ONE surface)
 *
 * Determinism: `update(scroll)` is a PURE function of the raw scroll value
 * given fixed geometry + look (no wall time, no internal lerp — Lenis is
 * the one smoothing owner). It runs inside the engine frame pipeline, so
 * eval `gotoSection` settles it synchronously with everything else.
 *
 * Change-caching: a channel is only written when its sampled value changes,
 * so at scroll-rest the driver goes quiet — debug pokes
 * (`gl.setEnvRotation` sweeps) survive until the next scroll movement.
 */

import type { Stage } from "../webgl/stage";
import type { LookConfig } from "./look";

/** One per-section key — DATA in the look JSON (LOOKBIBLE §1.5 table). */
export interface SectionLightKeyframe {
  /** Canonical section name (matched against the registry manifest). */
  section: string;
  envRotationDeg: number;
  envIntensity: number;
  exposure: number;
  /** Per-beat bloom (Nocturne 0.85); absent = the look's base strength. */
  bloomStrength?: number;
  /** DOM+GL stage ground for the beat; absent = the look's bgTokens.stage. */
  bgStage?: string;
  /**
   * Anchor shift, in fractions of the owning section's raw range, added to
   * the center anchor (default 0 = exact center). The sanctioned knob for
   * "start the next ramp earlier/later" retimes (gate-4 Images exit
   * handoff: Images `anchorOffset: -0.05` starts the porcelain→Nocturne
   * bgStage ramp one beat sooner — safe there because the Straps→Images
   * segment is value-flat, so only the outgoing ramp moves).
   */
  anchorOffset?: number;
  /** Authoring annotation — ignored by the driver. */
  note?: string;
}

/** Minimal geometry the driver needs per section (manifest subset). */
export interface SectionGeometryEntry {
  name: string;
  rawStart: number;
  rawEnd: number;
}

/** A fully-resolved sample of every driven channel. */
export interface LightSample {
  envRotationDeg: number;
  envIntensity: number;
  exposure: number;
  bloomStrength: number;
  /** sRGB hex "#rrggbb" (CSS-ready; stage parses the same string). */
  bgStage: string;
}

interface AnchoredKey {
  /** Absolute scroll position of the owning section's raw center. */
  at: number;
  sample: LightSample;
}

/** power2.inOut on 0..1 — the light-motion ease (LOOKBIBLE §1.5 law). */
export function easeLight(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) * (-2 * t + 2)) / 2;
}

const HEX_RE = /^#?([0-9a-f]{6})$/i;

function hexToRgb(hex: string): [number, number, number] {
  const m = HEX_RE.exec(hex.trim());
  if (!m || m[1] === undefined) return [0, 0, 0];
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

/** Lerp two sRGB hex colors component-wise (CSS-space, matches the token). */
export function lerpHex(a: string, b: string, t: number): string {
  if (a === b) return a;
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const c = ca.map((v, i) => Math.round(v + ((cb[i] ?? 0) - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/* ---- Section-owned env-intensity dip (ADDITIVE — Nocturne lane) -----------
 * LOOKBIBLE §1.5 Nocturne law: the driver holds the section-center CONTINUUM
 * (envIntensity 0.35); the deep 0.045 AOD match-cut blackout INSIDE the
 * section rides the section's own timeline (infra-gl open handoff). The
 * driver runs AFTER section ticks in the frame pipeline and rewrites
 * envIntensity on every scrolled frame, so an in-section dip MUST compose
 * here — a section writing stage.setEnvIntensity directly would be
 * overwritten the same frame while scrolling.
 *
 * Contract: `setSectionEnvDip(amount, target)` blends the sampled continuum
 * toward `target` by `amount` (0 = continuum untouched, 1 = exactly target).
 * Pure function of whatever the owning section derives it from (its scroll
 * progress), so eval settling stays synchronous + deterministic. Change-
 * caching still holds: the dip participates in the applied-sample compare.
 * Inert when the active look has no keyframes (driver parked — the dip is a
 * keyframed-look feature by design).
 */
let sectionEnvDipAmount = 0;
let sectionEnvDipTarget = 0.045;

/** Section-owned blackout dip on the driven env intensity (see above). */
export function setSectionEnvDip(amount: number, target = 0.045): void {
  sectionEnvDipAmount = Math.min(1, Math.max(0, amount));
  sectionEnvDipTarget = target;
}

function lerpSample(a: LightSample, b: LightSample, t: number): LightSample {
  return {
    envRotationDeg: lerp(a.envRotationDeg, b.envRotationDeg, t),
    envIntensity: lerp(a.envIntensity, b.envIntensity, t),
    exposure: lerp(a.exposure, b.exposure, t),
    bloomStrength: lerp(a.bloomStrength, b.bloomStrength, t),
    bgStage: lerpHex(a.bgStage, b.bgStage, t),
  };
}

/**
 * Pure sampler: given anchored keys (sorted by `at` ascending) and a scroll
 * value, return the eased interpolation. Clamps to the first/last key
 * outside the anchored range (Intro pose before its center; the Footer's
 * full-revolution pose after — the outro SWAP-restart lands back on the
 * hero pose because 360° ≡ 0°).
 */
export function sampleAnchoredKeys(keys: AnchoredKey[], scroll: number): LightSample | null {
  const first = keys[0];
  if (first === undefined) return null;
  if (keys.length === 1 || scroll <= first.at) return first.sample;
  const last = keys[keys.length - 1];
  if (last === undefined || scroll >= last.at) return last?.sample ?? first.sample;
  for (let i = 1; i < keys.length; i++) {
    const b = keys[i];
    const a = keys[i - 1];
    if (a === undefined || b === undefined) continue;
    if (scroll <= b.at) {
      const t = (scroll - a.at) / (b.at - a.at);
      return lerpSample(a.sample, b.sample, easeLight(t));
    }
  }
  return last.sample;
}

export class LightKeyframeDriver {
  private keyframes: SectionLightKeyframe[] = [];
  private anchored: AnchoredKey[] = [];
  private geometry: SectionGeometryEntry[] = [];
  /** Look base values (fallbacks for absent per-key fields). */
  private baseBloom = 0.7;
  private baseStage = "#EBEBEB";
  /** Last applied values — channels write only on change. */
  private applied: LightSample | null = null;

  constructor(private readonly stage: Stage) {}

  /**
   * Last APPLIED stage ground hex (null while parked — DEFAULT_LOOK or
   * pre-first-frame). The living vital reads this for its bgStage-aware
   * signal/counter-color swap (ADDITIVE — P3 vital lane).
   */
  stageHex(): string | null {
    return this.applied?.bgStage ?? null;
  }

  /**
   * Adopt the active look: its keyframes (if any) and the base values its
   * per-key fallbacks resolve against. A look without keyframes parks the
   * driver (applyLook's static lightRig values then own the frame).
   */
  setLook(look: LookConfig): void {
    this.keyframes = look.x_sectionLightKeyframes?.keyframes ?? [];
    this.baseBloom = look.postTune?.bloomStrength ?? this.baseBloom;
    this.baseStage = look.bgTokens?.stage ?? this.baseStage;
    this.applied = null; // re-apply everything under the new look
    this.anchor();
  }

  /**
   * (Re)learn section geometry — call after registry.measure() at boot and
   * on settled resizes. Order + centers come from the live manifest, so the
   * driver follows real layout, never vh arithmetic.
   */
  setGeometry(manifest: SectionGeometryEntry[]): void {
    this.geometry = manifest.map((m) => ({
      name: m.name,
      rawStart: m.rawStart,
      rawEnd: m.rawEnd,
    }));
    this.anchor();
  }

  /** Anchor each keyframe at its section's raw center (progressDom 0.5),
   *  plus the key's optional `anchorOffset` (fractions of its own range). */
  private anchor(): void {
    const spans = new Map<string, { center: number; range: number }>();
    for (const g of this.geometry) {
      spans.set(g.name, {
        center: (g.rawStart + g.rawEnd) / 2,
        range: g.rawEnd - g.rawStart,
      });
    }
    this.anchored = this.keyframes
      .filter((k) => spans.has(k.section))
      .map((k) => ({
        at:
          (spans.get(k.section) as { center: number; range: number }).center +
          (k.anchorOffset ?? 0) *
            (spans.get(k.section) as { center: number; range: number }).range,
        sample: {
          envRotationDeg: k.envRotationDeg,
          envIntensity: k.envIntensity,
          exposure: k.exposure,
          bloomStrength: k.bloomStrength ?? this.baseBloom,
          bgStage: k.bgStage ?? this.baseStage,
        },
      }))
      .sort((a, b) => a.at - b.at);
    // Solo mode note: only the mounted section's key survives the filter —
    // the sandbox holds that section's lighting constantly (by design).
  }

  /**
   * Per-frame tick — pure function of the raw Lenis scroll. Inert until a
   * look with keyframes AND geometry are both set.
   */
  update(scroll: number): void {
    const sampled = sampleAnchoredKeys(this.anchored, scroll);
    if (sampled === null) return;
    // Compose the section-owned dip (Nocturne AOD match-cut) into the
    // continuum BEFORE the change-cached apply, so dip changes at scroll-rest
    // still write and scrolled frames never fight the owning section.
    const s: LightSample =
      sectionEnvDipAmount > 0
        ? {
            ...sampled,
            envIntensity: lerp(sampled.envIntensity, sectionEnvDipTarget, sectionEnvDipAmount),
          }
        : sampled;
    const prev = this.applied;
    if (prev === null || s.envRotationDeg !== prev.envRotationDeg) {
      this.stage.setEnvRotation((s.envRotationDeg * Math.PI) / 180);
    }
    if (prev === null || s.envIntensity !== prev.envIntensity) {
      this.stage.setEnvIntensity(s.envIntensity);
    }
    if (prev === null || s.exposure !== prev.exposure) {
      this.stage.renderer.toneMappingExposure = s.exposure;
    }
    if (prev === null || s.bloomStrength !== prev.bloomStrength) {
      this.stage.post.tune({ bloomStrength: s.bloomStrength });
    }
    if (prev === null || s.bgStage !== prev.bgStage) {
      this.stage.setStageColor(s.bgStage);
      document.documentElement.style.setProperty("--porcelain", s.bgStage);
    }
    this.applied = s;
  }
}
