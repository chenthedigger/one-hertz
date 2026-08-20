/**
 * Film grain + vignette — one custom ShaderPass, LAST in the chain, running
 * on the display-referred (post-OutputPass, sRGB) buffer where perceptual
 * luminance weighting is straightforward.
 *
 * PLAN §3 post stack:
 *   - grain is LUMINANCE-WEIGHTED: weight = (1 − luma)^uGrainShadowPower —
 *     near-zero on bright porcelain (#EBEBEB → luma ≈ .85 → weight ≈ .05),
 *     strong in shadows (Nocturne gets its heavier grain for free as the
 *     stage darkens; uGrainAmount stays a look-dev dial on top).
 *   - vignette is a FLAG (Nocturne only): uVignette 0 = exactly off.
 *
 * Animation: uTime advances on the render loop in live mode and derives
 * from the frozen clock scalar in eval mode (PLAN §6 determinism — grain is
 * static in a frozen capture, byte-stable across runs). The hash is seeded
 * from uTime + gl_FragCoord, so no texture asset and no resolution uniform.
 */

import type { IUniform } from "three";

export interface GrainVignetteUniforms {
  [uniform: string]: IUniform;
  tDiffuse: IUniform<null>;
  uTime: IUniform<number>;
  uGrainAmount: IUniform<number>;
  uGrainShadowPower: IUniform<number>;
  uVignette: IUniform<number>;
}

/** Default grain amount — subtle at 1× porcelain, present in shadow. */
export const GRAIN_AMOUNT_DEFAULT = 0.055;

/** Falloff shaping the luminance weight (higher = tighter to shadows). */
export const GRAIN_SHADOW_POWER_DEFAULT = 1.6;

/** Nocturne vignette strength when the flag is on ("subtle" per PLAN). */
export const VIGNETTE_STRENGTH_DEFAULT = 0.32;

export const GrainVignetteShader = {
  name: "GrainVignetteShader",

  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrainAmount: { value: GRAIN_AMOUNT_DEFAULT },
    uGrainShadowPower: { value: GRAIN_SHADOW_POWER_DEFAULT },
    uVignette: { value: 0 },
  } satisfies GrainVignetteUniforms,

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrainAmount;
    uniform float uGrainShadowPower;
    uniform float uVignette;
    varying vec2 vUv;

    // Cheap animated hash — pixel-locked via gl_FragCoord, re-rolled per
    // frame via uTime. Good-enough spectral quality for sub-6% amplitudes.
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Vignette first, so grain weighting sees the darkened corners and
      // thickens into them (film behavior, not a flat overlay).
      float d = distance(vUv, vec2(0.5));
      color.rgb *= 1.0 - uVignette * smoothstep(0.3, 0.85, d);

      float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      float weight = pow(1.0 - clamp(luma, 0.0, 1.0), uGrainShadowPower);
      float noise = hash(gl_FragCoord.xy + vec2(fract(uTime * 13.7) * 511.0,
                                                fract(uTime * 7.3) * 379.0)) - 0.5;
      color.rgb += noise * uGrainAmount * weight;

      gl_FragColor = color;
    }
  `,
};
