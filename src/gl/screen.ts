/**
 * Screen-material contract (PLAN §3 dial subsystem ↔ WebGL stage seam).
 *
 * The dial subsystem renders into a canvas and hands the stage a
 * CanvasTexture; the stage owns ONE screen material with:
 *   - an emissive map slot for that texture,
 *   - `toneMapped = false` (belt-and-suspenders: with the post chain the
 *     whole buffer is tone-mapped by OutputPass anyway — this flag protects
 *     the non-composer fallback path and documents intent),
 *   - `emissiveIntensity` in the 2–4 band so the display reads luminous
 *     under ACES (input ~2.8 maps to ~0.9 after the curve) AND crosses the
 *     bloom threshold (≥1.0 luminance) while porcelain stays under it.
 *
 * The screen mesh lives on SCREEN_BLOOM_LAYER — the selective-bloom pass
 * darkens everything NOT on that layer, so bloom halos the display only.
 */

import {
  CanvasTexture,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  type Texture,
} from "three";

/** Layer membership that admits a mesh into the selective bloom pass. */
export const SCREEN_BLOOM_LAYER = 1;

/** Contract default — luminous under ACES, above the bloom threshold. */
export const SCREEN_EMISSIVE_INTENSITY = 2.8;

/** The one screen material — emissive slot filled via `setScreenTexture`. */
export function createScreenMaterial(emissiveMap: Texture): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    color: 0x000000, // the panel itself is black glass; light comes from emissive
    roughness: 0.35, // faint env sheen across the cover glass
    metalness: 0.0,
    emissive: 0xffffff,
    emissiveMap,
    emissiveIntensity: SCREEN_EMISSIVE_INTENSITY,
  });
  material.toneMapped = false;
  material.name = "screen_emissive";
  return material;
}

/**
 * Placeholder dial texture — static, deterministic (no wall time, no RNG),
 * replaced the moment the dial subsystem calls `stage.setScreenTexture`.
 * Content mirrors the eval freeze (10:09) so placeholder captures and dial
 * captures agree on what the display says.
 */
export function createPlaceholderDialTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("screen: 2d context unavailable for placeholder dial");
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);

  // Tick ring — 60 marks, the 1 Hz family.
  const cx = w / 2;
  const cy = h / 2;
  const r = w * 0.42;
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const major = i % 5 === 0;
    const inner = r - (major ? 26 : 14);
    ctx.strokeStyle = major ? "rgba(235,235,235,0.9)" : "rgba(235,235,235,0.35)";
    ctx.lineWidth = major ? 5 : 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.stroke();
  }

  // Time readout — matches EVAL_DIAL_TIME's face (10:09).
  ctx.fillStyle = "#ebebeb";
  ctx.font = "600 132px ui-monospace, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("10:09", cx, cy - 12);

  ctx.fillStyle = "rgba(235,235,235,0.55)";
  ctx.font = "500 30px ui-monospace, Menlo, monospace";
  ctx.letterSpacing = "8px";
  ctx.fillText("ONE HERTZ", cx, cy + 86);

  // Biosignal dot — the 1 Hz complication placeholder.
  ctx.fillStyle = "#ff2d55";
  ctx.beginPath();
  ctx.arc(cx, cy + 150, 12, 0, Math.PI * 2);
  ctx.fill();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * Placeholder screen mesh — a small display panel parented to the product
 * group (it orbits with the torus knot, exercising bloom stability on a
 * moving emitter). Dies when the GLB's named screen mesh is adopted via
 * `stage.adoptScreenMesh`.
 */
export function createPlaceholderScreenMesh(material: MeshStandardMaterial): Mesh {
  // 422:514 — the Ultra 3 display aspect, matching the DialRenderer canvas
  // so the live face maps undistorted (integrate lane).
  const mesh = new Mesh(new PlaneGeometry(422 / 514, 1.0), material);
  mesh.name = "placeholder_screen";
  mesh.position.set(0, 0, 1.8);
  mesh.layers.enable(SCREEN_BLOOM_LAYER);
  return mesh;
}
