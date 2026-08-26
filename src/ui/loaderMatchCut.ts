/**
 * Loader → hero match-cut (PLAN §2 "ring→3D-screen match cut" — the
 * ultracut graft, LOOKBIBLE loader law; P3 vital lane).
 *
 * When the loader begins its dismiss, the 2D activity-rings SVG is lifted
 * out of the loader shell (position:fixed at its exact rect) and flown —
 * translate + scale, 1.2 s power3.inOut (wall-clock scale) — onto the hero
 * watch's emissive screen, crossfading out over the flight's second half so
 * the landing IS the live dial. The destination is re-projected EVERY tween
 * tick from the GLB screen mesh's world bounding sphere through the live
 * stage camera, so the rings track the watch while the Intro entrance
 * (product z −7→0, 2 s power3.out) is still flying it in — the cut lands
 * exactly where the screen actually is, not where a layout guess put it.
 *
 * Reviewer-resilience ladder (never a stuck overlay):
 *   1. "screen"  — GLB adopted: track the projected part_screen sphere.
 *   2. "anchor"  — GLB failed/placeholder: fly to the Intro lane's
 *                  `[data-anchor="loader-rings"]` DOM anchor.
 *   3. "fade"    — no destination at all (solo of a non-Intro section) or
 *                  prefers-reduced-motion: fade out in place, no flight.
 *
 * Debug/eval surface: `window.__ONE_HERTZ_MATCHCUT__` records
 * {mode, dist, target} at flight end — the lane smoke asserts the landing
 * tolerance there. (`?eval=1` never reaches this module: the loader shell
 * is removed wholesale and dismiss() is skipped.)
 */

import { gsap } from "gsap";
import { Vector3 } from "three";
import type { Stage } from "../webgl/stage";

const FLIGHT_S = 1.2; // wall-clock scale {1.2} (motion-bible §2)
const FADE_START = 0.5; // crossfade begins past the flight's midpoint

export type MatchCutMode = "screen" | "anchor" | "fade";

export interface MatchCutResult {
  mode: MatchCutMode;
  /** Landing error in px (ring center vs live target center) — 0-ish when tracking. */
  dist: number;
  target: { x: number; y: number; d: number } | null;
}

declare global {
  interface Window {
    __ONE_HERTZ_MATCHCUT__?: MatchCutResult;
  }
}

interface Dest {
  x: number;
  y: number;
  /** Destination diameter in px (rings scale to it). */
  d: number;
}

const worldCenter = new Vector3();
const ndc = new Vector3();

/** Project the hero screen mesh's bounding sphere to viewport px. */
function projectScreen(stage: Stage): Dest | null {
  const mesh = stage.watch?.screenMesh;
  if (!mesh) return null;
  const geometry = mesh.geometry;
  if (geometry.boundingSphere === null) geometry.computeBoundingSphere();
  const sphere = geometry.boundingSphere;
  if (sphere === null) return null;
  mesh.updateWorldMatrix(true, false);
  worldCenter.copy(sphere.center).applyMatrix4(mesh.matrixWorld);
  const scale = mesh.getWorldScale(new Vector3());
  const radiusWorld = sphere.radius * Math.max(scale.x, scale.y, scale.z);

  const camera = stage.camera;
  ndc.copy(worldCenter).project(camera);
  if (ndc.z > 1) return null; // behind the camera — no cut target
  const w = window.innerWidth;
  const h = window.innerHeight;
  const x = (ndc.x * 0.5 + 0.5) * w;
  const y = (-ndc.y * 0.5 + 0.5) * h;
  const dist = camera.position.distanceTo(worldCenter);
  const halfFovTan = Math.tan(((camera.fov / 2) * Math.PI) / 180);
  const pxRadius = (radiusWorld / (dist * halfFovTan)) * (h / 2);
  return { x, y, d: Math.min(h, Math.max(36, pxRadius * 2)) };
}

/** The Intro lane's DOM anchor (fallback destination). */
function anchorDest(): Dest | null {
  const el = document.querySelector<HTMLElement>('[data-anchor="loader-rings"]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, d: r.width };
}

function finish(rings: SVGSVGElement, result: MatchCutResult): void {
  rings.remove();
  window.__ONE_HERTZ_MATCHCUT__ = result;
}

/**
 * Fly the lifted rings SVG onto the hero screen. `rings` must already be
 * position:fixed at its loader rect (Loader.liftRings does that).
 */
export function runLoaderMatchCut(rings: SVGSVGElement, stage: Stage): void {
  const start = rings.getBoundingClientRect();
  const startCx = start.left + start.width / 2;
  const startCy = start.top + start.height / 2;

  // Ring tracks fade first — only the closing arcs make the cut.
  const tracks = rings.querySelectorAll(".ring-track");
  gsap.to(tracks, { opacity: 0, duration: 0.4, ease: "power3.out" });

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const liveDest = (): Dest | null => projectScreen(stage) ?? anchorDest();
  const initialDest = liveDest();

  if (reduced || initialDest === null) {
    // No flight — fade in place (0.4 s, wall-clock scale).
    gsap.to(rings, {
      autoAlpha: 0,
      duration: 0.4,
      ease: "power3.out",
      onComplete: () => finish(rings, { mode: "fade", dist: 0, target: null }),
    });
    return;
  }

  rings.style.transformOrigin = "center";
  rings.style.willChange = "transform, opacity";

  const flight = { p: 0 };
  let lastDest = initialDest;
  gsap.to(flight, {
    p: 1,
    duration: FLIGHT_S,
    ease: "power3.inOut",
    onUpdate: () => {
      const dest = liveDest() ?? lastDest;
      lastDest = dest;
      const p = flight.p; // eased by the tween itself
      const x = startCx + (dest.x - startCx) * p;
      const y = startCy + (dest.y - startCy) * p;
      const scale = 1 + (dest.d / start.width - 1) * p;
      rings.style.transform = `translate(${x - startCx}px, ${y - startCy}px) scale(${scale})`;
      // Crossfade into the emissive dial over the second half.
      rings.style.opacity = String(p <= FADE_START ? 1 : 1 - (p - FADE_START) / (1 - FADE_START));
    },
    onComplete: () => {
      const dest = liveDest() ?? lastDest;
      const rect = rings.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      finish(rings, {
        mode: stage.watch?.screenMesh ? "screen" : "anchor",
        dist: Math.hypot(cx - dest.x, cy - dest.y),
        target: dest,
      });
    },
  });
}
