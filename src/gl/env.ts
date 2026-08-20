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
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

/** TEMP — Poly Haven CC0, replaced by the authored rig at P1.5 (see above). */
export const ENV_HDR_URL = "/assets/env/studio_small_03_2k.hdr";

/**
 * Synchronous procedural environment: warm key above fading to cool floor,
 * with a bright horizontal band to draw long speculars (lightformer
 * stand-in — carried over from Spike B verbatim).
 */
export function buildProceduralEnv(renderer: WebGLRenderer): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("env: 2d context unavailable for env gradient");

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
  try {
    const equirect = await new RGBELoader().loadAsync(ENV_HDR_URL, (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    });
    equirect.mapping = EquirectangularReflectionMapping;
    const pmrem = new PMREMGenerator(renderer);
    const envMap = pmrem.fromEquirectangular(equirect).texture;
    equirect.dispose();
    pmrem.dispose();
    return envMap;
  } catch (error: unknown) {
    console.warn(`env: studio HDR unavailable (${String(error)}) — keeping procedural fallback`);
    return null;
  }
}
