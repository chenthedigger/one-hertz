/**
 * WebGL stage — renderer, scene, camera, environment.
 *
 * Spike B slice: torus-knot placeholder standing in for the watch,
 * PMREM environment generated from a procedural gradient (no network
 * asset — real envmaps are pre-PMREM'd offline in P1), ACES filmic
 * tonemapping (PLAN §3 post stack).
 */

import {
  ACESFilmicToneMapping,
  CanvasTexture,
  Color,
  EquirectangularReflectionMapping,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  TorusKnotGeometry,
  CylinderGeometry,
  Vector3,
  WebGLRenderer,
} from "three";
import { uClock } from "../core/clock";

const STAGE_COLOR = 0xebebeb; // porcelain, from recon

export class Stage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly product: Group;

  private qualityTier = 0; // 0 = full; higher tiers shed post, never smoothness
  private disposed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.applyPixelRatio();

    this.scene.background = new Color(STAGE_COLOR);

    this.camera = new PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(0, 0.4, 6);

    this.buildEnvironment();
    this.product = this.buildProduct();
    this.scene.add(this.product);

    this.resize();
  }

  /**
   * PMREM environment from a generated gradient — warm key above fading to
   * cool floor, with a bright horizontal band to draw long speculars
   * (stand-in for the P1.5 authored lightformer rig).
   */
  private buildEnvironment(): void {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Stage: 2d context unavailable for env gradient");

    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0.0, "#ffffff");
    sky.addColorStop(0.35, "#dfe3e8");
    sky.addColorStop(0.62, "#9aa1ab");
    sky.addColorStop(1.0, "#3c4048");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Horizontal specular band (lightformer stand-in).
    const band = ctx.createLinearGradient(0, 88, 0, 128);
    band.addColorStop(0, "rgba(255,255,255,0)");
    band.addColorStop(0.5, "rgba(255,255,255,0.95)");
    band.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = band;
    ctx.fillRect(0, 88, canvas.width, 40);

    const texture = new CanvasTexture(canvas);
    texture.mapping = EquirectangularReflectionMapping;
    texture.colorSpace = SRGBColorSpace;

    const pmrem = new PMREMGenerator(this.renderer);
    const envMap = pmrem.fromEquirectangular(texture).texture;
    this.scene.environment = envMap;
    texture.dispose();
    pmrem.dispose();
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

  /** Quality tiers shed post/resolution, never smoothness (PLAN §3). */
  forceQualityTier(tier: number): void {
    this.qualityTier = tier;
    this.applyPixelRatio();
    this.resize();
  }

  get tier(): number {
    return this.qualityTier;
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(dt: number): void {
    if (this.disposed) return;
    // Idle life driven by the clock scalar + time: the placeholder slowly
    // turns; the clock scalar biases its attitude so the WebGL layer
    // visibly consumes the same scalar the CSS layer does.
    this.product.rotation.y += dt * 0.15;
    this.product.rotation.x = -0.15 + uClock.value * 0.3;
    this.renderer.render(this.scene, this.camera);
  }

  lookAt(target: Vector3): void {
    this.camera.lookAt(target);
  }

  dispose(): void {
    this.disposed = true;
    this.renderer.dispose();
  }
}
