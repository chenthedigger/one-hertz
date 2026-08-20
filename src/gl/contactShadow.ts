/**
 * Contact-shadow grounding stub (PLAN §3: "soft contact-shadow/AO grounding
 * on the stage") — a radial-gradient shadow catcher under the product.
 *
 * P1 scope: a prebaked radial falloff quad, not a real depth-based blur
 * (the drop-in upgrade path is three's ContactShadows-style ortho depth
 * render; the look bible decides at P1.5 whether the extra pass earns its
 * frame time). Static, deterministic, near-free.
 */

import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from "three";

export interface ContactShadowOptions {
  /** World radius of the shadow disc. */
  radius?: number;
  /** Peak opacity at the center. */
  opacity?: number;
  /** World y of the catcher plane. */
  y?: number;
}

export function createContactShadow(options: ContactShadowOptions = {}): Mesh {
  const radius = options.radius ?? 2.6;
  const opacity = options.opacity ?? 0.38;
  const y = options.y ?? -1.92;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("contactShadow: 2d context unavailable");

  // Soft radial falloff: eased toward the rim so the edge never reads as a
  // hard circle against the porcelain stage.
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0.0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.55)");
  gradient.addColorStop(0.7, "rgba(255,255,255,0.14)");
  gradient.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const alphaMap = new CanvasTexture(canvas);

  const material = new MeshBasicMaterial({
    color: 0x0b0b0c, // ink, not pure black — sits in the token ramp
    alphaMap,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  material.name = "contact_shadow";

  const mesh = new Mesh(new PlaneGeometry(radius * 2, radius * 2), material);
  mesh.name = "stage_contact_shadow";
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.renderOrder = -1; // under everything; never fights the product
  return mesh;
}
