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

export interface OrbitProxy {
  theta: number; // azimuth, radians
  phi: number; // polar, radians (0 = top-down)
  radius: number; // dolly distance
  targetX: number; // look-at x (decenters the subject in frame; default 0)
  targetY: number; // look-at height
  fov: number;
  /**
   * Mouse-parallax gate 0..1 (motion bible §4: "parallax is gated OFF
   * during macros and drag beats"). Section-authored timelines tween this;
   * 1 = full base amplitude.
   */
  parallaxMultiplier: number;
}

/**
 * Per-section camera-pose override (P2 section recipes — ADDITIVE API,
 * composes with `authorTimeline`, it does not replace it).
 *
 * For beats whose pose cannot be a static timeline of proxy values — e.g.
 * the Mechanism back-crystal macro, whose azimuth CHASES the product's
 * clock-derived attitude — the section computes a pose each frame (a pure
 * function of its scrubbed recipe + the clock scalar) and blends it over
 * whatever the base timeline poses. `blend` ramps 0→1→0 inside the
 * section's own scrub window, so handoffs are seamless and the override is
 * inert whenever the section does not own the frame. Longpress dolly-in and
 * mouse parallax still apply ON TOP of the blended pose; `parallaxScale`
 * gates parallax off during macros (motion bible law 7). No internal lerp
 * is added — eval settling stays a fixed point of update().
 */
export interface CameraPoseOverride {
  theta: number;
  phi: number;
  radius: number;
  /** Look-at target, world space (base pose uses (0, targetY, 0)). */
  targetX: number;
  targetY: number;
  targetZ: number;
  fov: number;
  /** Mouse-parallax gain scale while blended (0 = off — macro law). */
  parallaxScale: number;
  /** 0..1 — how much of this override wins over the base timeline pose. */
  blend: number;
}

export class CameraRig {
  private readonly proxy: OrbitProxy = {
    theta: 0.2,
    phi: 1.35,
    radius: 6,
    targetX: 0,
    targetY: 0.2,
    fov: 35,
    parallaxMultiplier: 1,
  };
  private timeline: gsap.core.Timeline;
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

  /* Section pose override (null/blend-0 = inert; see CameraPoseOverride). */
  private poseOverride: CameraPoseOverride | null = null;

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

  /**
   * P2 section camera authorship: replace the rig's beat timeline with a
   * section-authored one (the constructor beats are the Spike-B proving
   * grounds — docs/p1/engine.md notes the real P2 build replaces them,
   * keeping this wiring). The builder receives the live proxy and must
   * return a PAUSED timeline in the scrub-fraction domain (padded to 1,
   * motion-bible law 4). Beat 0 inherits the proxy's current (hero) pose —
   * author `.to()` tweens and the handoff is seamless. ONE owner at a time:
   * whichever section drives `setProgress` should be the one that authored
   * the beats (today: Disassembly, the only rig driver).
   */
  authorTimeline(build: (proxy: OrbitProxy) => gsap.core.Timeline): void {
    const tl = build(this.proxy);
    if (!tl.paused()) tl.pause();
    this.timeline.kill();
    this.timeline = tl;
    this.timeline.progress(this.lerpedProgress);
    this.apply();
  }

  /**
   * Blend a section-computed pose over the base timeline (see
   * CameraPoseOverride). Pass the SAME object every frame (the rig only
   * reads it) and null when the section leaves; blend 0 is equally inert.
   */
  setPoseOverride(override: CameraPoseOverride | null): void {
    this.poseOverride = override;
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
    // Base pose from the scrubbed proxy, then an optional section override
    // blended over it (angles on the shortest path — no 2π whips).
    let poseTheta = this.proxy.theta;
    let posePhi = this.proxy.phi;
    let poseRadius = this.proxy.radius;
    let fov = this.proxy.fov;
    let tx = this.proxy.targetX;
    let ty = this.proxy.targetY;
    let tz = 0;
    let parallaxScale = this.proxy.parallaxMultiplier;
    const o = this.poseOverride;
    if (o !== null && o.blend > 0) {
      const b = Math.min(1, Math.max(0, o.blend));
      poseTheta = lerpAngle(poseTheta, o.theta, b);
      posePhi = lerp(posePhi, o.phi, b);
      poseRadius = lerp(poseRadius, o.radius, b);
      fov = lerp(fov, o.fov, b);
      tx = lerp(tx, o.targetX, b);
      ty = lerp(ty, o.targetY, b);
      tz = o.targetZ * b;
      parallaxScale = lerp(parallaxScale, o.parallaxScale, b);
    }
    // Dolly-in: full intensity divides the radius by the section multiplier.
    const zoom = 1 + this.longpressIntensity * (this.zoomMultiplier - 1);
    const radius = poseRadius / zoom;
    this.effectiveRadius = radius;
    // Parallax: small orbital nudge, amplified while holding, gated per
    // beat by the authored parallaxMultiplier (OFF during macros).
    const gain = PARALLAX_BASE_RAD * this.parallaxGain * parallaxScale;
    const theta = poseTheta + this.parallaxX * gain;
    const phi = Math.min(
      Math.PI - 0.15,
      Math.max(0.15, posePhi + this.parallaxY * gain * 0.6),
    );
    this.camera.position.set(
      tx + radius * Math.sin(phi) * Math.sin(theta),
      ty + radius * Math.cos(phi),
      tz + radius * Math.sin(phi) * Math.cos(theta),
    );
    this.target.set(tx, ty, tz);
    this.camera.lookAt(this.target);
    if (this.camera.fov !== fov) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Shortest-path angular lerp (radians) — override blends never whip 2π. */
function lerpAngle(a: number, b: number, t: number): number {
  const tau = Math.PI * 2;
  let d = (b - a) % tau;
  if (d > Math.PI) d -= tau;
  if (d < -Math.PI) d += tau;
  return a + d * t;
}
