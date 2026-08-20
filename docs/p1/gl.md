# P1 lane notes — gl (`src/gl/*` + `src/webgl/stage.ts` extensions)

Status: **DONE, all checks pass** · 2026-08-20 · extends the Spike B stage (zero rewrites of its verified wiring; env builder MOVED verbatim to `gl/env.ts`)
Scope: PLAN §3 post stack + lighting pipeline + mobile quality tiers, hardened for P1.5 look-dev and P2 sections. **The interfaces below are the build contract for the dial, look-dev, and section lanes.**

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean · engine smoke suite still 30/30 · 11/11 gl checks in headless real Chrome (playwright-core, 1600×900): HDR served + swapped, frozen-clock frames **byte-identical** across 400ms (grain deterministic), vignette flag on/off round-trips to the exact prior frame, DOF changes the frame at tier 0 and is a **no-op at tier 1**, tier 2 drops the bloom halo, `state().qualityTier` tracks forced tier, env rotation relights the metal, live-mode grain animates, zero console errors. Screenshot evidence: emissive dial blooms, porcelain/metal do NOT.

## Module map

| Module | Exports (the contract) |
|---|---|
| `gl/env.ts` | `buildProceduralEnv(renderer)`, `loadStudioHdr(renderer, onProgress?)`, `ENV_HDR_URL` |
| `gl/post.ts` | `PostPipeline` — `render(dt)`, `setSize(w,h,pr)`, `applyTier(n)`, `setDof(on, focus?)`, `setDofFocus(d)`, `setVignette(on, strength?)`, `setGrainAmount(a)`, `dispose()` |
| `gl/grain.ts` | `GrainVignetteShader`, `GRAIN_AMOUNT_DEFAULT`, `VIGNETTE_STRENGTH_DEFAULT` |
| `gl/quality.ts` | `detectInitialTier(renderer)`, `QualityGovernor`, `TIER_FULL/TIER_NO_DOF/TIER_NO_BLOOM` |
| `gl/screen.ts` | `SCREEN_BLOOM_LAYER (=1)`, `createScreenMaterial`, `createPlaceholderDialTexture`, `createPlaceholderScreenMesh`, `SCREEN_EMISSIVE_INTENSITY (=2.8)` |
| `gl/contactShadow.ts` | `createContactShadow({radius?, opacity?, y?})` |
| `webgl/stage.ts` (extended) | `+ post`, `+ envReady`, `+ setScreenTexture(tex)`, `+ adoptScreenMesh(mesh)`, `+ setEnvRotation(rad)`, `StageOptions {onEnvProgress}` — everything Spike B exported is unchanged |

## 1 · Renderer & color pipeline

ACESFilmicToneMapping + SRGBColorSpace stay ON the renderer, DPR capped 2 (1.5 at tier 2) — unchanged from Spike B. **Subtlety every downstream lane must know:** with the composer active, three r152+ tone-maps only the default framebuffer, so ALL passes run in linear HalfFloat and `OutputPass` applies ACES + sRGB from the renderer's settings. Consequences:

- `material.toneMapped = false` is a **no-op under the composer** (kept on the screen material as documentation-of-intent + non-composer fallback safety). The display stays luminous via `emissiveIntensity 2.8` — ACES maps input ~2.8 to ~0.9 output.
- Custom passes inserted BEFORE OutputPass see linear HDR (>1 values exist); AFTER OutputPass they see display-referred sRGB. Choose accordingly.
- Beauty target has 4× MSAA (`WebGLRenderTarget {type: HalfFloatType, samples: 4}`) — canvas `antialias:true` does nothing for RT rendering. Samples are fixed at construction; if tier-based MSAA shed is ever wanted it needs a composer rebuild (documented tradeoff, not done).

## 2 · Environment (TEMP asset — replaced at P1.5)

- `public/assets/env/studio_small_03_2k.hdr` · **Poly Haven "Studio Small 03" · CC0 · https://polyhaven.com/a/studio_small_03** · 6.7MB, 2k Radiance HDR. Chosen for long horizontal tube softboxes (closest stock match to the authored lightformer rig that draws speculars along case chamfers). **Marked TEMP: PLAN bans stock HDRIs from the P1.5 look shootout — this is the sanctioned P1 stand-in only.**
- Boot sequence: procedural gradient env (Spike B's, moved verbatim to `gl/env.ts`) is PMREM'd **synchronously** — never an unlit first frame — then the HDR is fetched with real byte progress (feeds loader task, weight 2), PMREM'd, swapped in, old env disposed. Fetch failure ⇒ console.warn + fallback stays; `stage.envReady` resolves EITHER way (loader honesty: the stage is settled, `?eval=1` capture waits for final light).
- **Plan of record**: P1.5 authored rig gets prefiltered OFFLINE (Blender/cmft-style bake of the PMREM chain) and shipped as a prefiltered env — runtime `PMREMGenerator` then disappears from the boot path entirely.
- `stage.setEnvRotation(rad)` / `__ONE_HERTZ__.gl.setEnvRotation` — the per-section lighting-keyframe hook (scene.environmentRotation, r163+). Light moves with the story at P1.5; the hook is live now.

## 3 · Post chain (order + rationale)

```
beauty: RenderPass → BokehPass(DOF, opt-in) → bloom-mix → OutputPass(ACES+sRGB) → Grain/Vignette
bloom:  [separate composer] RenderPass over layer-darkened scene → UnrealBloomPass(threshold 1.0)
```

- **Selective bloom = layer isolation AND threshold** (belt and suspenders). The bloom composer renders the scene with every material NOT on `SCREEN_BLOOM_LAYER` swapped to black basic (occlusion stays correct — a case in front of the screen still blocks its glow), background black, then UnrealBloom at threshold 1.0 / strength 0.7 / radius 0.35. HDR-env speculars on titanium can exceed luminance 1.0 — threshold alone would NOT have isolated the screen; the layer darkening is what guarantees "bloom affects ONLY the emissive screen".
- **Known & accepted**: the mix adds the bloom composer's full output (unblurred screen + halo) onto beauty — the official three.js selective-bloom recipe — so the display runs effectively ~2× emissive when bloom is on. Reads as a lit AOD panel. **Dial lane: judge dial contrast with bloom ON (tier 0/1), not just in `?solo`+tier 2.** Bloom strength/radius are look-bible constants.
- **Grain runs AFTER OutputPass** (display-referred sRGB) so its luminance weighting is perceptual: `weight = (1−luma)^1.6` → porcelain #EBEBEB ≈ 0.05 weight (near-zero, as specced), shadows ≈ 0.9. Nocturne gets heavier grain for free as the stage darkens; `setGrainAmount` remains a look-dev dial on top. Noise is hash(gl_FragCoord + f(uTime)) — no texture asset, no resolution uniform.
- **DOF (BokehPass) sits BEFORE grain deliberately** (PLAN's list order enumerates effects, not pass order): grain must sit on top of blur — blurred grain reads as codec noise. OFF by default; `setDof(true, focus?)` is the per-section flag; **honored only at tier 0** (see §4). Working defaults focus 4.0 / aperture 0.0012 / maxblur 0.008 — look-dev owns real values; `setDofFocus` racks focus for the macro sections.
- **Vignette is folded into the grain pass** (one fullscreen pass saved): `uVignette 0` = mathematically off; `setVignette(true)` = 0.32 (subtle, Nocturne only per PLAN). Vignette applies before the grain term so grain thickens into darkened corners (film behavior).

## 4 · Quality tiers (`gl/quality.ts` — PLAN §3 mobile table, defined P1)

| Tier | DOF | Bloom | Grain+ACES | DPR cap |
|---|---|---|---|---|
| 0 full | per-section flag | ✓ | ✓ | 2 |
| 1 | ✗ | ✓ | ✓ | 2 |
| 2 | ✗ | ✗ | ✓ | 1.5 |

Tiers shed post/resolution, **never smoothness, never the film character** (grain + ACES survive tier 2). PLAN's "DOF disabled below quality tier 2" is interpreted per its own tier table: DOF exists at tier 0 only.

- **Boot heuristic** `detectInitialTier`: GPU renderer-string buckets (Mali/old-Adreno/PowerVR/A≤12 → tier 2; Apple M/A16+/RTX class → tier 0), else coarse-pointer → tier 1, `navigator.deviceMemory` ≤4GB → ≥1, ≤2GB → 2, coarse+DPR≥3.5 → 2.
- **fps governor**: 2.5s warmup (loader/compile spikes exempt per PLAN §6 perf method), then 2s windows; window fps < 45 sheds ONE tier; never upgrades (no flip-flop mid-scroll); self-terminates after 3 windows or tier 2. Pathological deltas (>0.5s: tab switch) ignored.
- **`forceQualityTier(n)` retires the governor for the session** — evals measure each tier separately. **`?eval=1` ⇒ tier 0, no heuristic, no governor** (deterministic captures; force is the only control). `state().qualityTier` may therefore change mid-session in live mode — additive semantics, schema untouched.

## 5 · Screen-material contract (dial ↔ stage seam, PLAN §3)

```ts
stage.setScreenTexture(tex)   // CanvasTexture → emissive slot; sets colorSpace SRGB;
                              // caller OWNS the texture + its dirty-flag updates
stage.adoptScreenMesh(mesh)   // GLB's named screen mesh takes the material +
                              // SCREEN_BLOOM_LAYER; placeholder panel dies
```

One `MeshStandardMaterial` ("screen_emissive"): black base, roughness 0.35 (env sheen on the cover glass), emissive white, `emissiveIntensity 2.8` (the 2–4 band: luminous under ACES AND above the bloom threshold), `toneMapped=false` (see §1 caveat). Only the built-in placeholder dial texture is ever disposed by the stage — caller textures are never touched. Until the dial lane calls in, a static deterministic placeholder dial (10:09 face, matches `EVAL_DIAL_TIME`) rides the chain on a panel parented to the product group — it orbits with the torus knot, which stress-tests bloom on a moving emitter.

## 6 · Contact shadow + debug API

- `createContactShadow()` — radial-gradient alpha quad (ink #0B0B0C, peak 0.38) under the pedestal, depthWrite off, renderOrder −1. A grounding STUB: the upgrade path is an ortho depth-blur catcher; P1.5 decides if it earns the pass.
- `__ONE_HERTZ__.gl` (ADDITIVE on the debug API): `setDof / setVignette / setGrainAmount / setEnvRotation` — for look-dev and the eval interaction-state frames ("Nocturne mid" wants vignette+DOF states without scripting a section). Sections drive the same flags via their stage reference in P2.

## Pitfalls found this lane (P2/P3/dial must inherit)

1. **Threshold-only selective bloom is a trap here.** The studio HDR pushes titanium speculars past luminance 1.0 in linear space — without layer darkening the case would bloom. Anything added to the scene that should NEVER bloom must simply stay off layer 1; anything that should bloom must `layers.enable(SCREEN_BLOOM_LAYER)` AND exceed 1.0 luminance.
2. **`material.toneMapped=false` does nothing under the composer** (r152+ RT rendering skips tone mapping; OutputPass maps the whole buffer). Don't "fix" dial brightness by toggling it — use emissiveIntensity.
3. **Grain must not sample wall time.** It derives from accumulated dt in live mode and from `uClock` in eval mode — that's what makes frozen frames byte-identical. Any new animated pass must follow the same split (`isEvalMode ? f(uClock) : accumulate(dt)`).
4. **Every resize/tier path must resize BOTH composers with the pixel ratio** (`post.setSize(w, h, renderer.getPixelRatio())` — already wired via `stage.resize()`). Sizing the renderer alone leaves stale-res render targets that look like mysterious softness.
5. **Screen visibility ≠ bloom correctness.** In camera beats where the screen is off-frame (Disassembly macro), tier 1 vs 2 frames are identical — eval assertions about bloom must use a frame where the display is visible (hero works).
6. All engine-lane and Spike B pitfalls stand.

## Open handoffs

- **P1.5 look-dev**: authored lightformer rig replaces the TEMP HDR (delete `public/assets/env/` asset + this note's TEMP marker); offline PMREM prefilter kills the runtime PMREMGenerator; bloom strength/radius, grain amount, DOF optics, contact-shadow treatment all become look-bible constants; per-section lighting keyframes drive `setEnvRotation` (+ future intensity hook) off the clock scalar.
- **Dial lane**: call `stage.setScreenTexture(canvasTex)`; judge contrast with bloom ON (§3 double-add note); placeholder dial + panel die via `adoptScreenMesh` when the GLB lands.
- **Sections (P2)**: DOF flag on macro pinned sections (`stage.post.setDof`), vignette on Nocturne entry/exit (`setVignette`) — declare `postStack` tokens in your state contract and map them to these flags in the section, not in the engine.
- **Perf lane**: bloom currently renders the scene twice at full res (tier <2). If it shows up in the frame budget: half-res bloom composer is the first lever (blur hides it), MSAA shed at tier 2 the second (needs composer rebuild).
- Named-device mobile check of the tier table (PLAN §6) still outstanding — heuristic buckets are educated guesses until then.
