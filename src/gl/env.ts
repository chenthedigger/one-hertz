/**
 * Environment pipeline — PMREM (PLAN §3 lighting lever #1).
 *
 * Two stages, one contract:
 *   1. `buildProceduralEnv` — the Spike B gradient-with-specular-band env,
 *      generated synchronously so the stage NEVER renders un-lit (also the
 *      offline fallback if the HDR fetch fails).
 *   2. `loadStudioHdr` — a real 2k studio HDR, PMREM'd once at init.
 *      Byte progress is reported to the loader (real progress, PLAN §2
 *      loader honesty).
 *
 * TEMP ASSET (PLAN §3: unmodified stock HDRIs are banned from the P1.5 look
 * shootout — this is the sanctioned P1 stand-in only):
 *   public/assets/env/studio_small_03_2k.hdr
 *   Poly Haven "Studio Small 03" · CC0 · https://polyhaven.com/a/studio_small_03
 *   Chosen for its long horizontal tube softboxes — the closest stock match
 *   to the authored lightformer rig (long speculars along case chamfers)
 *   that replaces it at P1.5. The plan of record is to pre-filter (PMREM)
 *   the authored rig OFFLINE and ship the prefiltered env, skipping this
 *   runtime PMREM entirely.
 */

import {
  EquirectangularReflectionMapping,
  CanvasTexture,
  PMREMGenerator,
  SRGBColorSpace,
  type Texture,
  type WebGLRenderer,
} from "three";
// HDRLoader is the r185+ name for the Radiance loader (RGBELoader is the
// deprecated alias — LOOKBIBLE §1.4 fix 6). Same API, same DataTexture out.
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

/** TEMP — Poly Haven CC0, replaced by the authored rig at P1.5 (see above). */
export const ENV_HDR_URL = "/assets/env/studio_small_03_2k.hdr";

/**
 * Parameters for the procedural gradient env — the `envParams` half of the
 * look-config schema (src/gl/look.ts). All fields optional; defaults are
 * the Spike B values verbatim.
 */
export interface ProceduralEnvParams {
  /** 4 sky gradient stops, top → bottom (CSS colors). */
  sky?: [string, string, string, string];
  /** Horizontal specular band (lightformer stand-in). */
  band?: {
    /** Band center as a 0..1 fraction of env height (0 = zenith). */
    y?: number;
    /** Band height as a 0..1 fraction of env height. */
    height?: number;
    /** Peak band alpha 0..1. */
    alpha?: number;
  };
}

const ENV_SKY_DEFAULT: [string, string, string, string] = [
  "#ffffff",
  "#dfe3e8",
  "#9aa1ab",
  "#3c4048",
];

/**
 * Synchronous procedural environment: warm key above fading to cool floor,
 * with a bright horizontal band to draw long speculars (lightformer
 * stand-in — carried over from Spike B; now parameterizable for look
 * configs, defaults unchanged).
 */
export function buildProceduralEnv(
  renderer: WebGLRenderer,
  envParams: ProceduralEnvParams = {},
): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("env: 2d context unavailable for env gradient");

  const stops = envParams.sky ?? ENV_SKY_DEFAULT;
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0.0, stops[0]);
  sky.addColorStop(0.35, stops[1]);
  sky.addColorStop(0.62, stops[2]);
  sky.addColorStop(1.0, stops[3]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Horizontal specular band (lightformer stand-in). Defaults reproduce the
  // Spike B band exactly (y 88..128 of 256 ⇒ center .421875, height .15625).
  const bandY = (envParams.band?.y ?? 108 / 256) * canvas.height;
  const bandH = (envParams.band?.height ?? 40 / 256) * canvas.height;
  const bandA = envParams.band?.alpha ?? 0.95;
  const band = ctx.createLinearGradient(0, bandY - bandH / 2, 0, bandY + bandH / 2);
  band.addColorStop(0, "rgba(255,255,255,0)");
  band.addColorStop(0.5, `rgba(255,255,255,${bandA})`);
  band.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY - bandH / 2, canvas.width, bandH);

  const texture = new CanvasTexture(canvas);
  texture.mapping = EquirectangularReflectionMapping;
  texture.colorSpace = SRGBColorSpace;

  const pmrem = new PMREMGenerator(renderer);
  const envMap = pmrem.fromEquirectangular(texture).texture;
  texture.dispose();
  pmrem.dispose();
  return envMap;
}

/**
 * Load + PMREM the studio HDR. Resolves to the prefiltered env texture, or
 * `null` when the fetch fails (offline dev, missing asset) — callers keep
 * the procedural env in that case and the page stays presentable
 * (reviewer-resilience rule). `onProgress` receives real byte progress 0..1
 * when the server exposes Content-Length.
 */
export async function loadStudioHdr(
  renderer: WebGLRenderer,
  onProgress?: (p: number) => void,
): Promise<Texture | null> {
  return loadHdrEnv(renderer, ENV_HDR_URL, onProgress);
}

/**
 * Generalized HDR env loader — same pipeline as `loadStudioHdr` but for an
 * arbitrary served .hdr URL (the `envFile` half of the look-config schema).
 */
export async function loadHdrEnv(
  renderer: WebGLRenderer,
  url: string,
  onProgress?: (p: number) => void,
): Promise<Texture | null> {
  try {
    const equirect = await new HDRLoader().loadAsync(url, (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    });
    equirect.mapping = EquirectangularReflectionMapping;
    const pmrem = new PMREMGenerator(renderer);
    const envMap = pmrem.fromEquirectangular(equirect).texture;
    equirect.dispose();
    pmrem.dispose();
    return envMap;
  } catch (error: unknown) {
    console.warn(`env: HDR ${url} unavailable (${String(error)}) — keeping current env`);
    return null;
  }
}
