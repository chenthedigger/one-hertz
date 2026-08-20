/**
 * Camera rig — orbit + dolly choreography as a PAUSED GSAP timeline,
 * scrubbed via `timeline.progress(p)` (source pattern from recon: paused
 * timelines as scrub adapters, never time-driven).
 *
 * The rig animates a spherical proxy {theta, phi, radius, targetY}; the
 * camera position is derived every frame. Master progress here MAY lerp
 * (PLAN §3: WebGL master progress keeps the source's lerpedProgress
 * smoothing) — scroll position itself arrives raw and is never touched.
 */

import { gsap } from "gsap";
import { PerspectiveCamera, Vector3 } from "three";
import { WEBGL_PROGRESS_LERP } from "../core/constants";
import { EASE } from "../core/constants";

interface OrbitProxy {
  theta: number; // azimuth, radians
  phi: number; // polar, radians (0 = top-down)
  radius: number; // dolly distance
  targetY: number; // look-at height
  fov: number;
}

export class CameraRig {
  private readonly proxy: OrbitProxy = {
    theta: 0.2,
    phi: 1.35,
    radius: 6,
    targetY: 0.2,
    fov: 35,
  };
  private readonly timeline: gsap.core.Timeline;
  private readonly target = new Vector3();
  private lerpedProgress = 0;
  private targetProgress = 0;

  constructor(private readonly camera: PerspectiveCamera) {
    // Paused timeline — progress() is the ONLY driver.
    this.timeline = gsap.timeline({ paused: true, defaults: { ease: EASE.default } });

    // Beat 1: slow half-orbit while dollying in — "walk around the piece".
    this.timeline.to(this.proxy, {
      theta: Math.PI * 0.85,
      phi: 1.15,
      radius: 3.6,
      targetY: 0.0,
      duration: 1.0,
    });
    // Beat 2: macro dolly — dive toward the surface, slight top-down tilt.
    this.timeline.to(this.proxy, {
      theta: Math.PI * 1.2,
      phi: 0.9,
      radius: 2.1,
      targetY: -0.1,
      fov: 30,
      duration: 0.8,
      ease: EASE.exit,
    });
    // Beat 3: pull back and settle low — hand-off pose for the next section.
    this.timeline.to(this.proxy, {
      theta: Math.PI * 1.5,
      phi: 1.45,
      radius: 4.8,
      targetY: 0.3,
      fov: 35,
      duration: 0.7,
    });

    this.apply();
  }

  /** Set the scrub target (raw section progress, 0..1). */
  setProgress(p: number): void {
    this.targetProgress = p;
  }

  /** Advance the lerped master progress and pose the camera. */
  update(dt: number): void {
    const k = 1 - Math.exp(-dt * WEBGL_PROGRESS_LERP);
    this.lerpedProgress += (this.targetProgress - this.lerpedProgress) * k;
    this.timeline.progress(this.lerpedProgress);
    this.apply();
  }

  private apply(): void {
    const { theta, phi, radius, targetY, fov } = this.proxy;
    this.camera.position.set(
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi) + targetY,
      radius * Math.sin(phi) * Math.cos(theta),
    );
    this.target.set(0, targetY, 0);
    this.camera.lookAt(this.target);
    if (this.camera.fov !== fov) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }
}
