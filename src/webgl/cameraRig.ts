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
import {
  EASE,
  LONGPRESS_ZOOM_DEFAULT,
  PARALLAX_BASE_RAD,
  PARALLAX_LERP,
  WEBGL_PROGRESS_LERP,
} from "../core/constants";
import type { CameraAuxSnapshot } from "../core/debug";
import type { CaseSpace } from "./watch";

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

  /* Longpress hold-zoom (PLAN §1 mechanic 2): the camera consumes the ramp
   * intensity as a dolly-in on the orbit radius, scaled by the ACTIVE
   * section's zoomMultiplier (wired via lifecycle in main.ts). */
  private longpressIntensity = 0;
  private zoomMultiplier = LONGPRESS_ZOOM_DEFAULT;

  /* Mouse parallax: normalized pointer (-1..1) nudges theta/phi, lerped on
   * its own constant (scroll position stays single-smoothing-owner). Gain is
   * ×(1 + intensity) during a hold, per recon. */
  private pointerX = 0;
  private pointerY = 0;
  private parallaxX = 0;
  private parallaxY = 0;
  private effectiveRadius = 0;

  /* Case-local frame of the hero watch (registered at GLB adoption). The
   * Ultra 3 case sits tilted ~45° inside the band loop (USDZ AR pose), so
   * world axes are NOT case axes: beat authors that want "dolly along the
   * dial normal" or "frame the crown side" express those directions in case
   * space and convert through this helper (`rig.caseSpace.toWorld(v)`).
   * Null until the watch lands — beats written against it must guard. */
  private caseSpaceRef: CaseSpace | null = null;

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

  /** Set the scrub target (webgl-channel section progress, 0..1). */
  setProgress(p: number): void {
    this.targetProgress = p;
  }

  /** Longpress ramp intensity 0..1 (wired from LONGPRESS_TOGGLE in main.ts). */
  setLongpress(intensity: number): void {
    this.longpressIntensity = intensity;
  }

  /** Active section's hold-zoom multiplier (wired from lifecycle events). */
  setZoomMultiplier(multiplier: number): void {
    this.zoomMultiplier = Math.max(1, multiplier);
  }

  /** Register the hero watch's case-local frame (the 45°-tilt correction). */
  setCaseSpace(caseSpace: CaseSpace): void {
    this.caseSpaceRef = caseSpace;
  }

  /** Case-local axis helper — null until the watch GLB is adopted. */
  get caseSpace(): CaseSpace | null {
    return this.caseSpaceRef;
  }

  /** Normalized pointer position, -1..1 both axes (viewport center = 0). */
  setPointer(nx: number, ny: number): void {
    this.pointerX = nx;
    this.pointerY = ny;
  }

  /** Advance the lerped master progress and pose the camera. */
  update(dt: number): void {
    const k = 1 - Math.exp(-dt * WEBGL_PROGRESS_LERP);
    this.lerpedProgress += (this.targetProgress - this.lerpedProgress) * k;
    const kp = 1 - Math.exp(-dt * PARALLAX_LERP);
    this.parallaxX += (this.pointerX - this.parallaxX) * kp;
    this.parallaxY += (this.pointerY - this.parallaxY) * kp;
    this.timeline.progress(this.lerpedProgress);
    this.apply();
  }

  /**
   * Snap the lerped master to its target (Snappable — eval-mode settling:
   * `gotoSection` must return with the camera already in final pose).
   * Parallax snaps too, so a settle is a full fixed point of update().
   */
  snap(): void {
    this.lerpedProgress = this.targetProgress;
    this.parallaxX = this.pointerX;
    this.parallaxY = this.pointerY;
    this.timeline.progress(this.lerpedProgress);
    this.apply();
  }

  /** Mouse-parallax gain — base amplitude ×(1 + hold intensity). */
  get parallaxGain(): number {
    return 1 + this.longpressIntensity;
  }

  /** Interaction telemetry for state().camera (additive eval field). */
  aux(): CameraAuxSnapshot {
    return {
      dolly: Math.round(this.effectiveRadius * 1e5) / 1e5,
      parallaxGain: this.parallaxGain,
      zoomMultiplier: this.zoomMultiplier,
    };
  }

  private apply(): void {
    const { theta: baseTheta, phi: basePhi, radius: baseRadius, targetY, fov } = this.proxy;
    // Dolly-in: full intensity divides the radius by the section multiplier.
    const zoom = 1 + this.longpressIntensity * (this.zoomMultiplier - 1);
    const radius = baseRadius / zoom;
    this.effectiveRadius = radius;
    // Parallax: small orbital nudge, amplified while holding.
    const gain = PARALLAX_BASE_RAD * this.parallaxGain;
    const theta = baseTheta + this.parallaxX * gain;
    const phi = Math.min(
      Math.PI - 0.15,
      Math.max(0.15, basePhi + this.parallaxY * gain * 0.6),
    );
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
