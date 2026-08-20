/**
 * Contact-shadow grounding (PLAN §3: "soft contact-shadow/AO grounding on
 * the stage") — a radial-falloff shadow catcher under the product.
 *
 * LOOKBIBLE §1.4 fix 2 upgrade: the shadow is now look-configurable via the
 * `contactShadow {opacity, radius, falloff}` schema key (gl/look.ts), and
 * the alpha map is computed PIXEL-WISE with a smooth pow() falloff plus a
 * deterministic ordered dither — the old 4-stop canvas radial gradient
 * produced the banded hard-edged ellipse every live shootout frame showed
 * (piecewise-linear 8-bit alpha ramps mach-band hard against porcelain).
 * Still a prebaked quad: static, deterministic, near-free. (The real
 * depth-render upgrade path noted in P1 remains open if a council ever
 * demands it.)
 */

import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from "three";

/** Geometry base radius — mesh scale 1 ⇒ this world radius. */
export const CONTACT_SHADOW_BASE_RADIUS = 2.6;

/** Alpha-map resolution (per side). */
const MAP_SIZE = 512;

/** Default falloff exponent — alpha = (1 - r)^falloff. */
const FALLOFF_DEFAULT = 2.0;

export interface ContactShadowOptions {
  /** World radius of the shadow disc. */
  radius?: number;
  /** Peak opacity at the center. */
  opacity?: number;
  /** World y of the catcher plane. */
  y?: number;
  /**
   * Falloff exponent on the radial alpha curve `(1 - r)^falloff` — higher
   * = tighter core with a longer soft skirt; 1 = linear cone.
   */
  falloff?: number;
}

/**
 * Look-config tune for a live shadow mesh (the `contactShadow` schema key).
 * Absent field = leave the current value untouched.
 */
export interface ContactShadowTune {
  opacity?: number;
  /** Absolute world radius (overrides the footprint-derived default). */
  radius?: number;
  falloff?: number;
}

/**
 * Deterministic per-pixel dither in [-0.5, 0.5) — breaks 8-bit alpha
 * banding without Math.random() (eval captures must stay byte-stable).
 * Interleaved-gradient-noise (Jimenez) on integer pixel coords.
 */
function dither(x: number, y: number): number {
  const v = 52.9829189 * ((0.06711056 * x + 0.00583715 * y) % 1);
  return (v - Math.floor(v)) - 0.5;
}

/** Paint the radial falloff alpha map for a given exponent. */
function paintAlphaMap(canvas: HTMLCanvasElement, falloff: number): void {
  canvas.width = MAP_SIZE;
  canvas.height = MAP_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("contactShadow: 2d context unavailable");

  const image = ctx.createImageData(MAP_SIZE, MAP_SIZE);
  const data = image.data;
  const center = (MAP_SIZE - 1) / 2;
  for (let py = 0; py < MAP_SIZE; py++) {
    for (let px = 0; px < MAP_SIZE; px++) {
      const dx = (px - center) / center;
      const dy = (py - center) / center;
      const r = Math.sqrt(dx * dx + dy * dy);
      const a = r >= 1 ? 0 : Math.pow(1 - r, falloff);
      const i = (py * MAP_SIZE + px) * 4;
      // Luminance channels feed alphaMap sampling (three uses .g); white
      // everywhere, the curve lives in the value + dither kills banding.
      const v = Math.min(255, Math.max(0, Math.round(a * 255 + dither(px, py))));
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

export function createContactShadow(options: ContactShadowOptions = {}): Mesh {
  const radius = options.radius ?? CONTACT_SHADOW_BASE_RADIUS;
  const opacity = options.opacity ?? 0.38;
  const y = options.y ?? -1.92;
  const falloff = options.falloff ?? FALLOFF_DEFAULT;

  const canvas = document.createElement("canvas");
  paintAlphaMap(canvas, falloff);
  const alphaMap = new CanvasTexture(canvas);

  const material = new MeshBasicMaterial({
    color: 0x0b0b0c, // ink, not pure black — sits in the token ramp
    alphaMap,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  material.name = "contact_shadow";

  const mesh = new Mesh(
    new PlaneGeometry(CONTACT_SHADOW_BASE_RADIUS * 2, CONTACT_SHADOW_BASE_RADIUS * 2),
    material,
  );
  mesh.name = "stage_contact_shadow";
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.scale.setScalar(radius / CONTACT_SHADOW_BASE_RADIUS);
  mesh.renderOrder = -1; // under everything; never fights the product
  // Falloff is baked into the alpha map — remember it for cheap re-tunes.
  mesh.userData["contactShadowFalloff"] = falloff;
  return mesh;
}

/**
 * Hot-apply a look's `contactShadow` tune to a live shadow mesh: opacity
 * lands on the material, radius on the mesh scale, and a falloff change
 * repaints the alpha map in place (same texture object, one re-upload).
 */
export function tuneContactShadow(mesh: Mesh, tune: ContactShadowTune): void {
  const material = mesh.material;
  if (Array.isArray(material) || !(material instanceof MeshBasicMaterial)) return;

  if (tune.opacity !== undefined) material.opacity = tune.opacity;
  if (tune.radius !== undefined) {
    mesh.scale.setScalar(tune.radius / CONTACT_SHADOW_BASE_RADIUS);
  }
  if (
    tune.falloff !== undefined &&
    tune.falloff !== mesh.userData["contactShadowFalloff"] &&
    material.alphaMap instanceof CanvasTexture
  ) {
    const image = material.alphaMap.image as HTMLCanvasElement;
    paintAlphaMap(image, tune.falloff);
    material.alphaMap.needsUpdate = true;
    mesh.userData["contactShadowFalloff"] = tune.falloff;
  }
}
