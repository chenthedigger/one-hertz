/**
 * Post pipeline (PLAN §3 post stack, guardrailed):
 *
 *   beauty:  RenderPass → BokehPass (DOF, opt-in) → bloom-mix → OutputPass
 *            (ACES filmic + sRGB) → Grain/Vignette (custom, LAST)
 *   bloom:   separate composer — RenderPass over the LAYER-DARKENED scene
 *            (everything not on SCREEN_BLOOM_LAYER swapped to black, so
 *            occlusion stays correct) → UnrealBloomPass threshold 1.0.
 *            Belt and suspenders: layer isolation AND the ≥1.0 luminance
 *            threshold — only the emissive screen (intensity 2–4) blooms;
 *            HDR-env speculars on the case NEVER reach the bloom pass.
 *
 * Pass-order rationale vs the PLAN enumeration: DOF runs BEFORE grain
 * (grain must sit on top of the blur — blurred grain reads as compression
 * artifacts, not film), and grain runs AFTER OutputPass so it weights
 * display-referred luminance (near-zero on porcelain as specced). Vignette
 * shares the grain pass — one fullscreen pass saved.
 *
 * Since r152 the renderer tone-maps only when drawing to the default
 * framebuffer: every pass here works in linear HalfFloat until OutputPass
 * applies ACES + sRGB — the renderer's own toneMapping/outputColorSpace
 * settings are honored by OutputPass, so the non-composer fallback path
 * looks identical in kind.
 *
 * Quality tiers (PLAN §3, wired via stage.forceQualityTier):
 *   tier 0 — full stack (DOF available where a section requests it)
 *   tier 1 — no DOF
 *   tier 2 — no DOF, no bloom (grain + ACES always stay: tiers shed post,
 *            never smoothness, and never the film character)
 */

import {
  Color,
  HalfFloatType,
  Material,
  Mesh,
  MeshBasicMaterial,
  Vector2,
  WebGLRenderTarget,
  type IUniform,
  type Object3D,
  type PerspectiveCamera,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { uClock } from "../core/clock";
import { isEvalMode } from "../core/determinism";
import { GrainVignetteShader, VIGNETTE_STRENGTH_DEFAULT } from "./grain";
import { SCREEN_BLOOM_LAYER } from "./screen";

/** Bloom catches ONLY ≥1.0-luminance sources (the emissive screen). */
const BLOOM_THRESHOLD = 1.0;
const BLOOM_STRENGTH = 0.7;
const BLOOM_RADIUS = 0.35;

/**
 * Look-config post tune (PLAN §3 post-stack constants become look-bible
 * values) — the `postTune` block of the look schema (src/gl/look.ts).
 * Absent field = leave the current value untouched.
 */
export interface PostTune {
  bloomThreshold?: number;
  bloomStrength?: number;
  bloomRadius?: number;
  grainAmount?: number;
  /** Vignette strength used when the Nocturne flag turns the vignette on. */
  vignetteNocturne?: number;
}

/** MSAA on the beauty target (RT rendering bypasses canvas antialiasing). */
const BEAUTY_MSAA_SAMPLES = 4;

/** DOF working defaults — look-dev owns the real per-section values. */
const DOF_FOCUS_DEFAULT = 4.0;
const DOF_APERTURE_DEFAULT = 0.0012;
const DOF_MAXBLUR_DEFAULT = 0.008;

/** Eval determinism: grain time derives from the (freezable) clock scalar. */
const EVAL_GRAIN_TIME_SCALE = 8;

const BLACK = new Color(0x000000);

const BloomMixShader = {
  name: "BloomMixShader",
  uniforms: {
    tDiffuse: { value: null as Texture | null },
    tBloom: { value: null as Texture | null },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tBloom;
    varying vec2 vUv;
    void main() {
      gl_FragColor = texture2D(tDiffuse, vUv) + vec4(texture2D(tBloom, vUv).rgb, 0.0);
    }
  `,
};

export class PostPipeline {
  private readonly beautyComposer: EffectComposer;
  private readonly bloomComposer: EffectComposer;
  private readonly bokehPass: BokehPass;
  private readonly bloomMixPass: ShaderPass;
  private readonly grainPass: ShaderPass;

  // P5 perf-hunt ROOT CAUSE of the desktop hitch cadence: ONE shared dark
  // material swapped across every non-bloom mesh made three re-run
  // getProgram/getParameters/getProgramCacheKey PER MESH PER FRAME (the
  // shared material's currentProgram flip-flopped between geometry-derived
  // parameter sets) — steady string/object churn that grew with the scene
  // (internals attach: 69→146 geometries) and forced growing major-GC
  // pauses (V8.GC_MC_INCREMENTAL_EMBEDDER_TRACING 34→250 ms across a 60 s
  // pass). A PER-MESH dark material keeps every material↔program binding
  // stable, so the bloom darkening render allocates nothing at steady
  // state. WeakMap: a removed mesh releases its stand-in with it.
  private readonly darkMaterials = new WeakMap<Mesh, MeshBasicMaterial>();
  // renderBloom bookkeeping is flat parallel arrays reused across frames
  // (never Maps rebuilt per frame — the earlier P5 churn fix).
  private readonly swapMeshes: Mesh[] = [];
  private readonly swapMaterials: (Material | Material[])[] = [];
  private readonly hideMeshes: Mesh[] = [];
  private readonly hideVisible: boolean[] = [];
  private readonly bloomPass: UnrealBloomPass;

  private tier = 0;
  private dofRequested = false;
  private grainTime = 0;
  private vignetteNocturne = VIGNETTE_STRENGTH_DEFAULT;

  constructor(
    renderer: WebGLRenderer,
    private readonly scene: Scene,
    camera: PerspectiveCamera,
  ) {
    const size = renderer.getSize(new Vector2());
    const pixelRatio = renderer.getPixelRatio();

    // Beauty chain — MSAA HalfFloat target (linear HDR until OutputPass).
    const beautyTarget = new WebGLRenderTarget(
      size.x * pixelRatio,
      size.y * pixelRatio,
      { type: HalfFloatType, samples: BEAUTY_MSAA_SAMPLES },
    );
    this.beautyComposer = new EffectComposer(renderer, beautyTarget);
    this.beautyComposer.addPass(new RenderPass(scene, camera));

    this.bokehPass = new BokehPass(scene, camera, {
      focus: DOF_FOCUS_DEFAULT,
      aperture: DOF_APERTURE_DEFAULT,
      maxblur: DOF_MAXBLUR_DEFAULT,
    });
    this.bokehPass.enabled = false; // OFF by default (PLAN §3)
    this.beautyComposer.addPass(this.bokehPass);

    this.bloomMixPass = new ShaderPass(BloomMixShader);
    this.beautyComposer.addPass(this.bloomMixPass);

    this.beautyComposer.addPass(new OutputPass()); // ACES filmic + sRGB

    this.grainPass = new ShaderPass(GrainVignetteShader);
    this.beautyComposer.addPass(this.grainPass); // last → renders to screen

    // Bloom chain — offscreen, layer-darkened scene, threshold ≥ 1.0.
    this.bloomComposer = new EffectComposer(renderer);
    this.bloomComposer.renderToScreen = false;
    this.bloomComposer.addPass(new RenderPass(scene, camera));
    this.bloomPass = new UnrealBloomPass(
      size.clone(),
      BLOOM_STRENGTH,
      BLOOM_RADIUS,
      BLOOM_THRESHOLD,
    );
    this.bloomComposer.addPass(this.bloomPass);
    this.uniform(this.bloomMixPass, "tBloom").value =
      this.bloomComposer.renderTarget2.texture;

    this.setSize(size.x, size.y, pixelRatio);
  }

  /** Tier rules: 0 = full, 1 = no DOF, 2 = no DOF + no bloom. */
  applyTier(tier: number): void {
    this.tier = tier;
    this.bloomMixPass.enabled = this.bloomEnabled();
    this.bokehPass.enabled = this.dofEnabled();
  }

  /**
   * A scene-pass render target for warm compilation (P5 perf-hunt). Program
   * cache keys differ between rendering to the CANVAS (tone mapping +
   * output colorspace baked in) and rendering into ANY WebGLRenderTarget
   * (NoToneMapping + working colorspace — what every composer pass uses).
   * Warming/compiling with this target bound produces the exact program
   * variants the live pipeline runs; compiling against the canvas produces
   * variants that are never used.
   */
  get sceneRenderTarget(): WebGLRenderTarget {
    return this.beautyComposer.renderTarget1;
  }

  private bloomEnabled(): boolean {
    return this.tier < 2;
  }

  private dofEnabled(): boolean {
    return this.dofRequested && this.tier === 0;
  }

  /**
   * Per-section DOF flag (macro pinned sections opt in; PLAN §3). The
   * request is remembered across tier changes — tiers gate it, never
   * clear it.
   */
  setDof(enabled: boolean, focus?: number): void {
    this.dofRequested = enabled;
    if (focus !== undefined) this.setDofFocus(focus);
    this.bokehPass.enabled = this.dofEnabled();
  }

  /** Rack the DOF focus distance (world units from camera). */
  setDofFocus(focus: number): void {
    const u = this.bokehPass.uniforms as Record<string, IUniform>;
    const f = u["focus"];
    if (f) f.value = focus;
  }

  /**
   * Vignette flag — Nocturne only (PLAN §3); 0 strength = exactly off.
   * Default strength is the look-tunable Nocturne value (`tune()`).
   */
  setVignette(enabled: boolean, strength?: number): void {
    const s = strength ?? this.vignetteNocturne;
    this.uniform(this.grainPass, "uVignette").value = enabled ? s : 0;
  }

  /**
   * Look-config hot-apply (src/gl/look.ts `postTune`) — retunes bloom
   * optics, grain base amount, and the Nocturne vignette strength without
   * touching tier gating or pass order. Absent fields keep current values.
   */
  tune(t: PostTune): void {
    if (t.bloomThreshold !== undefined) this.bloomPass.threshold = t.bloomThreshold;
    if (t.bloomStrength !== undefined) this.bloomPass.strength = t.bloomStrength;
    if (t.bloomRadius !== undefined) this.bloomPass.radius = t.bloomRadius;
    if (t.grainAmount !== undefined) this.setGrainAmount(t.grainAmount);
    if (t.vignetteNocturne !== undefined) {
      this.vignetteNocturne = t.vignetteNocturne;
      // If the vignette is currently on, re-apply so the new strength lands.
      const current = this.uniform(this.grainPass, "uVignette").value as number;
      if (current > 0) this.setVignette(true);
    }
  }

  /** Look-dev dial on the grain base amount (weighting stays luminance). */
  setGrainAmount(amount: number): void {
    this.uniform(this.grainPass, "uGrainAmount").value = amount;
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.beautyComposer.setPixelRatio(pixelRatio);
    this.beautyComposer.setSize(width, height);
    this.bloomComposer.setPixelRatio(pixelRatio);
    this.bloomComposer.setSize(width, height);
  }

  /**
   * Render one frame. Grain time advances on the loop in live mode and is a
   * pure function of the clock scalar in eval mode (frozen clock ⇒ static
   * grain ⇒ byte-stable captures, PLAN §6).
   */
  render(dt: number): void {
    this.grainTime = isEvalMode ? uClock.value * EVAL_GRAIN_TIME_SCALE : this.grainTime + dt;
    this.uniform(this.grainPass, "uTime").value = this.grainTime;

    if (this.bloomEnabled()) {
      this.renderBloom();
    }
    this.beautyComposer.render(dt);
  }

  /**
   * Darken every non-screen material (occlusion-correct selective bloom).
   *
   * TRANSPARENT meshes are HIDDEN instead of darkened: swapping the watch's
   * sapphire crystal (which sits in FRONT of the emissive screen) to opaque
   * black would occlude the display in the bloom buffer and kill the halo.
   * A see-through surface neither blocks nor emits glow, so `visible=false`
   * is the occlusion-correct treatment for it.
   */
  private renderBloom(): void {
    const originalBackground = this.scene.background;
    this.scene.background = BLACK;
    this.scene.traverse(this.darkenForBloom);

    this.bloomComposer.render();

    const { swapMeshes, swapMaterials, hideMeshes, hideVisible } = this;
    for (let i = 0; i < swapMeshes.length; i++) {
      swapMeshes[i]!.material = swapMaterials[i]!;
    }
    for (let i = 0; i < hideMeshes.length; i++) {
      hideMeshes[i]!.visible = hideVisible[i]!;
    }
    // length=0 keeps the backing capacity — steady-state renderBloom
    // allocates nothing (the whole point of the flat-array rewrite).
    swapMeshes.length = 0;
    swapMaterials.length = 0;
    hideMeshes.length = 0;
    hideVisible.length = 0;
    this.scene.background = originalBackground;
  }

  /** Preallocated traverse visitor (no per-frame closure allocation). */
  private readonly darkenForBloom = (obj: Object3D): void => {
    if (!(obj instanceof Mesh) || obj.layers.isEnabled(SCREEN_BLOOM_LAYER)) return;
    const material = obj.material as Material | Material[];
    const anyTransparent = Array.isArray(material)
      ? material.some((m) => m.transparent)
      : material.transparent;
    if (anyTransparent) {
      this.hideMeshes.push(obj);
      this.hideVisible.push(obj.visible);
      obj.visible = false;
    } else {
      this.swapMeshes.push(obj);
      this.swapMaterials.push(material);
      let dark = this.darkMaterials.get(obj);
      if (dark === undefined) {
        dark = new MeshBasicMaterial({ color: 0x000000 });
        this.darkMaterials.set(obj, dark);
      }
      obj.material = dark;
    }
  };

  private uniform(pass: ShaderPass, name: string): IUniform {
    const u = (pass.uniforms as Record<string, IUniform>)[name];
    if (!u) throw new Error(`PostPipeline: missing uniform ${name}`);
    return u;
  }

  dispose(): void {
    this.beautyComposer.dispose();
    this.bloomComposer.dispose();
    // Per-mesh dark stand-ins share a handful of GL programs owned by the
    // renderer's program cache; the material objects themselves are
    // WeakMap-held and die with their meshes — nothing to dispose here.
  }
}
