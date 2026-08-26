/**
 * WebGL stage — renderer, scene, camera, environment, post pipeline.
 *
 * P1 gl lane (extends the Spike B slice): torus-knot placeholder still
 * stands in for the watch and rides the FULL chain — studio-HDR PMREM env
 * (procedural gradient as instant fallback), selective bloom on the
 * emissive screen, luminance-weighted grain, optional DOF/vignette flags,
 * quality tiers, contact-shadow grounding. ACES filmic + sRGB output are
 * applied by the composer's OutputPass (PLAN §3 post stack).
 */

import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  TorusKnotGeometry,
  CylinderGeometry,
  Vector3,
  WebGLRenderer,
  type CanvasTexture,
  type Texture,
} from "three";
import type { WatchAsset } from "./watch";
import { uClock } from "../core/clock";
import { isEvalMode } from "../core/determinism";
import {
  CONTACT_SHADOW_BASE_RADIUS,
  createContactShadow,
  tuneContactShadow,
  type ContactShadowTune,
} from "../gl/contactShadow";
import { buildProceduralEnv, loadStudioHdr } from "../gl/env";
import { PostPipeline } from "../gl/post";
import { detectInitialTier, QualityGovernor, TIER_FULL } from "../gl/quality";
import {
  createPlaceholderDialTexture,
  createPlaceholderScreenMesh,
  createScreenMaterial,
  SCREEN_BLOOM_LAYER,
} from "../gl/screen";

const STAGE_COLOR = 0xebebeb; // porcelain, from recon

/** Snapshot of the live camera for `state()` assertions (PLAN §6). */
export interface CameraPose {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  fov: number;
}

/** One row of the `?materials` inspector stub. */
export interface MaterialInfo {
  mesh: string;
  material: string;
  type: string;
  color: string | null;
  roughness: number | null;
  metalness: number | null;
  envMapIntensity: number | null;
}

export interface StageOptions {
  /** Real byte progress of the studio HDR fetch (feeds a loader task). */
  onEnvProgress?: ((p: number) => void) | undefined;
}

export class Stage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly product: Group;
  /** Post chain — sections drive DOF/vignette flags through this. */
  readonly post: PostPipeline;
  /**
   * Resolves once the environment SETTLED — studio HDR swapped in, or the
   * procedural fallback confirmed after a failed fetch. Loader honesty:
   * either way the stage is presentable when this resolves.
   */
  readonly envReady: Promise<void>;

  private qualityTier: number; // 0 = full; higher tiers shed post, never smoothness
  private readonly governor: QualityGovernor;
  private readonly screenMaterial: MeshStandardMaterial;
  private readonly placeholderDial: CanvasTexture;
  private readonly contactShadow: Mesh;
  private screenMesh: Mesh;
  private rotationSpeed = 1; // multiplier — UPDATE_ROTATIONS (longpress lane)
  private holdSpin = 0; // decaying longpress spin offset (live mode only)
  private disposed = false;
  /** The adopted hero asset (null until the GLB lands / if it fails). */
  private watchAsset: WatchAsset | null = null;
  /** True once a look config owns the env (boot HDR must not clobber it). */
  private envLockedByLook = false;
  /** Active look's contactShadow tune (survives a later watch adoption). */
  private contactShadowTune: ContactShadowTune | null = null;

  constructor(canvas: HTMLCanvasElement, options: StageOptions = {}) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    // ACES + sRGB stay on the renderer; with the composer active they are
    // honored by OutputPass (r152+ tone-maps only the default framebuffer).
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = SRGBColorSpace;

    // Quality tier: deterministic tier 0 under ?eval=1 (forceQualityTier is
    // the eval control); heuristic + fps governor in live mode (PLAN §3).
    this.qualityTier = isEvalMode ? TIER_FULL : detectInitialTier(this.renderer);
    this.governor = new QualityGovernor(this.qualityTier);
    if (isEvalMode) this.governor.force();
    this.applyPixelRatio();

    this.scene.background = new Color(STAGE_COLOR);

    this.camera = new PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(0, 0.4, 6);

    // Environment: procedural PMREM NOW (never an unlit first frame), the
    // studio HDR swapped in when its bytes arrive (gl/env.ts).
    this.scene.environment = buildProceduralEnv(this.renderer);
    this.envReady = this.upgradeEnvironment(options.onEnvProgress);

    this.placeholderDial = createPlaceholderDialTexture();
    this.screenMaterial = createScreenMaterial(this.placeholderDial);
    this.product = this.buildProduct();
    this.screenMesh = createPlaceholderScreenMesh(this.screenMaterial);
    this.product.add(this.screenMesh);
    this.scene.add(this.product);
    this.contactShadow = createContactShadow();
    this.scene.add(this.contactShadow);

    this.post = new PostPipeline(this.renderer, this.scene, this.camera);
    this.post.applyTier(this.qualityTier);

    this.resize();
  }

  /** Swap the procedural env for the studio HDR once loaded (TEMP asset). */
  private async upgradeEnvironment(onProgress?: (p: number) => void): Promise<void> {
    const hdr = await loadStudioHdr(this.renderer, onProgress);
    if (hdr === null) return; // fallback stays; page remains presentable
    if (this.disposed || this.envLockedByLook) {
      // A look config already swapped its own env in — the boot HDR lost
      // the race and must not clobber it.
      hdr.dispose();
      return;
    }
    const previous = this.scene.environment;
    this.scene.environment = hdr;
    previous?.dispose();
  }

  /** Torus-knot placeholder "watch" on a pedestal — swapped for the GLB in P1.5. */
  private buildProduct(): Group {
    const group = new Group();

    const body = new Mesh(
      new TorusKnotGeometry(1, 0.34, 320, 48),
      new MeshPhysicalMaterial({
        color: 0xc9cbd0, // natural titanium-ish
        metalness: 1.0,
        roughness: 0.32,
        clearcoat: 0.4,
        clearcoatRoughness: 0.25,
        envMapIntensity: 1.2,
      }),
    );
    body.name = "placeholder_body";
    group.add(body);

    const pedestal = new Mesh(
      new CylinderGeometry(1.9, 2.1, 0.12, 64),
      new MeshStandardMaterial({ color: 0xe2e2e0, metalness: 0, roughness: 0.9 }),
    );
    pedestal.position.y = -1.85;
    pedestal.name = "placeholder_pedestal";
    group.add(pedestal);

    return group;
  }

  private applyPixelRatio(): void {
    const cap = this.qualityTier >= 2 ? 1.5 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, cap));
  }

  /**
   * Quality tiers shed post/resolution, never smoothness (PLAN §3).
   * Forcing a tier retires the fps governor for the session — evals
   * measure each tier separately via this call (PLAN §6).
   */
  forceQualityTier(tier: number): void {
    this.governor.force();
    this.applyTier(tier);
  }

  private applyTier(tier: number): void {
    this.qualityTier = tier;
    this.applyPixelRatio();
    this.post.applyTier(tier);
    this.resize(); // composer targets follow the new pixel ratio
  }

  get tier(): number {
    return this.qualityTier;
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.post.setSize(w, h, this.renderer.getPixelRatio());
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(dt: number): void {
    if (this.disposed) return;
    // Idle life derives from the clock scalar in BOTH modes (motion bible
    // law 9: wall time is banned — the old live-mode `+= dt` accumulation
    // was a placeholder-era violation). Live now equals eval attitude-wise
    // (LOOKBIBLE §1.4 live-parity theme), and section camera recipes can
    // chase the pose through `productAttitude` (Mechanism back macro). The
    // longpress "rotations accelerate" mechanic survives as an additive
    // offset in the interaction-intensity domain that decays once the hold
    // releases, so composition-critical beats stay predictable at rest.
    const attitude = productAttitude(uClock.value);
    if (isEvalMode) {
      this.product.rotation.y = attitude.rotY;
    } else {
      this.holdSpin += dt * 0.15 * (this.rotationSpeed - 1);
      this.holdSpin *= Math.exp(-dt * 0.8);
      this.product.rotation.y = attitude.rotY + this.holdSpin;
    }
    this.product.rotation.x = attitude.rotX;

    // fps governor: shed one tier per bad window in live mode (inert when
    // forced or in eval mode — QualityGovernor.force()).
    const shed = this.governor.update(dt);
    if (shed !== null) this.applyTier(shed);

    this.post.render(dt);
  }

  /**
   * Screen-material contract (PLAN §3): hand the dial subsystem's
   * CanvasTexture to the emissive slot. The material keeps
   * toneMapped=false + SCREEN_EMISSIVE_INTENSITY so the display stays luminous
   * under ACES and is the ONLY thing the bloom pass sees. The caller owns
   * the texture (and its per-dirty-flag updates); only the built-in
   * placeholder dial is disposed here.
   */
  setScreenTexture(texture: Texture): void {
    texture.colorSpace = SRGBColorSpace;
    const previous = this.screenMaterial.emissiveMap;
    if (previous === texture) return;
    this.screenMaterial.emissiveMap = texture;
    this.screenMaterial.needsUpdate = true;
    if (previous === this.placeholderDial) previous.dispose();
  }

  /**
   * Adopt the GLB's named screen mesh: it takes the screen material and
   * bloom-layer membership; the placeholder panel dies. (Asset lane calls
   * this after the watch GLB lands.)
   */
  adoptScreenMesh(mesh: Mesh): void {
    mesh.material = this.screenMaterial;
    mesh.layers.enable(SCREEN_BLOOM_LAYER);
    if (this.screenMesh.name === "placeholder_screen") {
      this.screenMesh.removeFromParent();
      this.screenMesh.geometry.dispose();
    }
    this.screenMesh = mesh;
  }

  /**
   * Adopt the loaded hero watch (webgl/watch.ts): the placeholder torus
   * knot + pedestal die; the normalized watch_root joins the product group
   * (it inherits the idle rotation + rig choreography exactly as the
   * placeholder did); the GLB's `part_screen` mesh takes the live screen
   * material; the contact shadow re-grounds under the watch's real bottom.
   */
  adoptWatch(watch: WatchAsset): void {
    // Placeholder body + pedestal die.
    for (const name of ["placeholder_body", "placeholder_pedestal"]) {
      const obj = this.product.getObjectByName(name);
      if (obj instanceof Mesh) {
        obj.removeFromParent();
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) m.dispose();
      }
    }

    this.product.add(watch.root);
    if (watch.screenMesh) this.adoptScreenMesh(watch.screenMesh);
    this.watchAsset = watch;

    // Ground the contact shadow just under the watch (centered at origin,
    // so the bottom is at -height/2 of its bbox). Sized to the footprint,
    // softened — a grounding hint, not a puddle (look-dev owns the final
    // treatment; gl lane's upgrade path note stands).
    watch.root.updateWorldMatrix(true, true);
    const box = new Box3().setFromObject(watch.root);
    this.contactShadow.position.y = box.min.y - 0.02;
    const span = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
    const targetRadius = span * 0.6;
    this.contactShadow.scale.setScalar(targetRadius / CONTACT_SHADOW_BASE_RADIUS);
    const shadowMat = this.contactShadow.material;
    if (!Array.isArray(shadowMat)) shadowMat.opacity = 0.3;
    // A look's contactShadow tune outranks the footprint defaults — re-apply
    // it if one already landed (applyLook normally runs after adoption, but
    // the order must not matter).
    if (this.contactShadowTune) tuneContactShadow(this.contactShadow, this.contactShadowTune);
  }

  /**
   * Look-config `contactShadow {opacity, radius, falloff}` hot-apply
   * (LOOKBIBLE §1.4 fix 2). Remembered so a later watch adoption re-applies
   * it over the footprint defaults.
   */
  tuneContactShadow(tune: ContactShadowTune): void {
    this.contactShadowTune = { ...this.contactShadowTune, ...tune };
    tuneContactShadow(this.contactShadow, tune);
  }

  /** The adopted watch asset, if any (case-space + materials live here). */
  get watch(): WatchAsset | null {
    return this.watchAsset;
  }

  /**
   * Swap the scene environment for a prefiltered texture (look configs).
   * The previous env is disposed — pass only PMREM'd textures you own.
   */
  swapEnvironment(env: Texture): void {
    this.envLockedByLook = true;
    const previous = this.scene.environment;
    this.scene.environment = env;
    if (previous !== env) previous?.dispose();
  }

  /** scene.environmentIntensity (look-config lightRig hook). */
  setEnvIntensity(intensity: number): void {
    this.scene.environmentIntensity = intensity;
  }

  /** Stage/porcelain background color (look-config bgTokens hook). */
  setStageColor(css: string): void {
    this.scene.background = new Color(css);
  }

  /**
   * Rotate the environment around Y — the per-section lighting-keyframe
   * hook (PLAN §3: env rotation driven by the clock scalar at P1.5).
   */
  setEnvRotation(radians: number): void {
    this.scene.environmentRotation.y = radians;
  }

  /**
   * Idle/mechanism rotation-speed multiplier (1 = base rate) — consumer of
   * UPDATE_ROTATIONS (recon: rotations accelerate during the longpress
   * hold). Eval-mode rotation stays clock-derived and ignores this.
   */
  setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }

  /** Live camera pose for `state()` snapshots. */
  cameraPose(): CameraPose {
    const p = this.camera.position;
    const q = this.camera.quaternion;
    return {
      position: [round5(p.x), round5(p.y), round5(p.z)],
      quaternion: [round5(q.x), round5(q.y), round5(q.z), round5(q.w)],
      fov: this.camera.fov,
    };
  }

  /** Scene material listing for the `?materials` inspector stub. */
  listMaterials(): MaterialInfo[] {
    const rows: MaterialInfo[] = [];
    this.scene.traverse((obj) => {
      if (!(obj instanceof Mesh)) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        const std = mat instanceof MeshStandardMaterial ? mat : null;
        rows.push({
          mesh: obj.name || "(unnamed)",
          material: mat.name || "(unnamed)",
          type: mat.type,
          color: std ? `#${std.color.getHexString()}` : null,
          roughness: std ? std.roughness : null,
          metalness: std ? std.metalness : null,
          envMapIntensity: std ? std.envMapIntensity : null,
        });
      }
    });
    return rows;
  }

  lookAt(target: Vector3): void {
    this.camera.lookAt(target);
  }

  dispose(): void {
    this.disposed = true;
    this.post.dispose();
    this.renderer.dispose();
  }
}

function round5(v: number): number {
  return Math.round(v * 1e5) / 1e5;
}

/**
 * Product-group attitude as a pure function of the page clock scalar — the
 * ONE source of truth for the hero's idle pose (render() applies it every
 * frame; section camera recipes chase it, e.g. the Mechanism back-crystal
 * macro). One full revolution over the page, mirroring the env-rotation
 * loop (LOOKBIBLE §1.5), so the outro restart lands on the hero pose.
 */
export function productAttitude(clock: number): { rotX: number; rotY: number } {
  return { rotX: -0.15 + clock * 0.3, rotY: clock * Math.PI * 2 };
}
