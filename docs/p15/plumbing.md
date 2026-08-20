# P1.5 lane notes — hero plumbing (`src/webgl/watch.ts`, `src/gl/look.ts`)

Status: **DONE, all checks pass** · 2026-08-20 · extends the gl/dial/engine contracts (docs/p1/*.md), zero rewrites
Scope: the REAL Ultra 3 on stage — GLB load path (KTX2+meshopt), live dial on the GLB screen mesh, name-based raycast + case-local axes, `?look=<name>` config system, first-pass material-defect fixes. **§2 (look-config schema) is the build contract for the three look agents.**

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean · **engine-smoke 30/30 · dial-smoke 18/18 · cursor-smoke 31/31** against the integrated build (headless real Chrome, playwright-core `channel:"chrome"`, 1600×900) · zero console errors on `?eval=1`, `?eval=1&materials`, `?eval=1&look=default`, `?eval=1&look=<nonexistent>` (warn + fallback, no crash) · `state().watch = {loaded:true, parts:175, screenAdopted:true, caseTiltDeg:35, look:"default"}` · dial dirty-flag intact on the GLB mesh (**1 upload / 113 frames** in eval) · `?look=default` fetch round-trips and `__ONE_HERTZ__.look.apply("default")` hot-applies · **screenshot evidence `docs/p15/plumbing-hero.png`**: real Ultra 3, live Wayfinder dial luminous with bloom halo, hands 10:09:30, transparent crystal, Ocean band corrected; Disassembly macro cross-check showed the back-crystal cluster clean (engraved ring legible, no marble).

## Module map

| Module | Exports (the contract) |
|---|---|
| `webgl/watch.ts` | `loadWatch(renderer, onProgress?)`, `WatchAsset`, `CaseSpace`, `resolvePartName(obj)`, `ensurePhysical(watch, matName)`, `retargetScreenTexture(tex, baked)`, `WATCH_GLB_URL`, `BASIS_TRANSCODER_PATH`, `WATCH_WORLD_HEIGHT (2.4)` |
| `gl/look.ts` | `LookConfig`, `MaterialOverride`, `LightRigParams`, `BgTokens`, `DEFAULT_LOOK`, `loadLook(name)`, `applyLook(stage, watch, look)` |
| `webgl/stage.ts` (extended) | `+ adoptWatch(watch)`, `+ watch` getter, `+ swapEnvironment(tex)`, `+ setEnvIntensity(i)`, `+ setStageColor(css)` — everything prior unchanged |
| `gl/post.ts` (extended) | `+ tune(PostTune)`, `+ PostTune`; bloom darkening now **hides transparent meshes** (see §5) |
| `gl/env.ts` (extended) | `buildProceduralEnv(renderer, params?)` (parameterized, defaults verbatim), `+ loadHdrEnv(renderer, url, onProgress?)`, `+ ProceduralEnvParams` |
| `webgl/cameraRig.ts` (extended) | `+ setCaseSpace(cs)`, `+ caseSpace` getter (null until GLB adoption) |
| `core/params.ts` | `+ look: string \| null` (`?look=<name>`, basename-sanitized) |
| `core/debug.ts` | `+ state().watch` (WatchStateSnapshot, additive), `+ api.look {apply(name), current()}` (additive; schema stays v1) |

Assets shipped: `public/assets/watch/ultra-3.ktx2.glb` (1.24MB, copy of `research/asset-qa/ultra-3-draft.ktx2.glb`) · `public/assets/basis/basis_transcoder.{js,wasm}` (KTX2 transcoder, from three/examples) · `public/assets/looks/default.json`.

## 1 · Load path + adoption (main.ts boot)

```
loadWatch(stage.renderer, p => watchTask.report(p))     // loader task weight 2, REAL byte progress
  .then(watch => {
    retargetScreenTexture(dial.texture, watch.bakedScreenTexture);  // BEFORE adoption
    stage.adoptWatch(watch);        // torus knot + pedestal die; part_screen adopted
    rig.setCaseSpace(watch.caseSpace);
  })
  .catch(() => null)                // placeholder stays, warn — never a black canvas
```

- GLTFLoader + `KTX2Loader.setTranscoderPath("/assets/basis/").detectSupport(renderer)` + `MeshoptDecoder` (bundled module import, no served file). KTX2 loader disposed after load (its workers), decoded textures unaffected.
- The loader (arc) now waits on fonts + stage + HDR env + **GLB bytes** — loader honesty preserved; GLB failure settles the task anyway (reviewer-resilience: placeholder + warn, never a hang or black canvas).
- `adoptWatch`: placeholder body/pedestal removed AND disposed; `watch.root` joins `stage.product` (inherits idle rotation + rig choreography exactly as the placeholder did); contact shadow re-grounds at the watch's real bbox bottom (radius = footprint × 0.6, opacity 0.3 — grounding hint, not a puddle; look-dev owns the final treatment).
- Normalization (inside `loadWatch`): whole piece centered on the origin, uniformly scaled to `WATCH_WORLD_HEIGHT = 2.4` world units (camera-rig framing preserved from the torus era: radius 6 hero → 3.78 visible height at fov 35).

## 2 · Look-config schema (BUILD CONTRACT for the 3 look agents)

`?look=<name>` fetches **`/assets/looks/<name>.json`** and hot-applies it; `__ONE_HERTZ__.look.apply("<name>")` does the same at runtime (look-dev inner loop: edit JSON → `apply` → screenshot, no rebuild). No param ⇒ in-code `DEFAULT_LOOK` (= the TEMP studio look + Ocean correction); `default.json` mirrors it. **Every field at every level is OPTIONAL — absent = leave the live value untouched.** Unknown material names warn + skip; unknown top-level keys are ignored.

```jsonc
{
  "name": "nocturne-a",              // optional; defaults to the file basename

  // ENV — exactly one of the two (envFile WINS if both present):
  "envFile": "/assets/env/my_rig_2k.hdr",   // Radiance .hdr, fetched + PMREM'd + swapped
  "envParams": {                             // OR procedural gradient env (gl/env.ts)
    "sky": ["#ffffff", "#dfe3e8", "#9aa1ab", "#3c4048"],  // 4 stops top→bottom
    "band": { "y": 0.42, "height": 0.16, "alpha": 0.95 }  // horizontal lightformer band
  },                                         // fractions of env height; defaults = Spike B values

  "lightRig": {
    "envRotationDeg": 0,             // scene.environmentRotation.y (degrees)
    "envIntensity": 1.0,             // scene.environmentIntensity
    "exposure": 1.0                  // renderer.toneMappingExposure (pre-ACES)
  },

  "postTune": {                      // maps onto PostPipeline.tune()
    "bloomThreshold": 1.0,           // keep ≥1.0 or non-screen HDR speculars bloom
    "bloomStrength": 0.7,
    "bloomRadius": 0.35,
    "grainAmount": 0.055,            // base amount; weighting stays luminance-driven
    "vignetteNocturne": 0.32         // strength used when the Nocturne vignette FLAG is on
  },

  "bgTokens": {
    "stage": "#EBEBEB",              // scene.background + CSS --porcelain
    "ink": "#0B0B0C"                 // CSS --ink
  },

  "materialOverrides": {             // keyed by mat_* name (naming contract, §4)
    "mat_titanium_case": {
      "color": "#c8c9cd",            // CSS hex → material.color
      "roughness": 0.35,
      "metalness": 1.0,
      "envMapIntensity": 1.2,
      "anisotropy": 0.6,             // OPTIONAL — triggers upgrade to MeshPhysicalMaterial
      "anisotropyRotation": 1.57,    // radians (physical upgrade too)
      "clearcoat": 0.4,              // physical upgrade too
      "clearcoatRoughness": 0.25,
      "opacity": 1.0,                // <1 sets transparent:true (crystal lever)
      "emissive": "#000000",
      "emissiveIntensity": 1.0
    }
  }
}
```

Semantics the look agents must know:
- **Env swap** disposes the previous env and **locks the boot HDR out**: if a look's env lands before the studio-HDR fetch finishes, the late HDR is discarded (no race clobber). A look WITHOUT env fields keeps whatever is live.
- **Anisotropy/clearcoat upgrade**: GLB materials arrive as MeshStandardMaterial (or Physical where the GLB had clearcoat/specular extensions). Requesting a physical-only property upgrades the named material to `MeshPhysicalMaterial` in place across the asset (`ensurePhysical` — standard slots transferred explicitly). Anisotropy needs tangents; the GLB ships normals+UVs so three computes what it needs — verify visually per material.
- **bgTokens.stage** feeds BOTH `scene.background` and CSS `--porcelain` (DOM + WebGL stay one surface); `ink` is CSS-only for now (contact-shadow ink is baked into its canvas — flag if a look needs it).
- **applyLook is async only for `envFile`** (fetch+PMREM); everything else lands synchronously before the promise resolves.
- **Application order at boot**: watch adoption → look apply (material overrides need their mat_* targets; `applyLook(stage, null, look)` tolerates a missing watch by skipping overrides with a warn).
- Current DEFAULT_LOOK values ARE the gl-lane constants (bloom 1.0/0.7/0.35, grain 0.055, vignette 0.32, stage #EBEBEB) + the Ocean correction (§6.3).

## 3 · Dial ↔ GLB screen seam (the trap that will bite anyone who re-wires it)

**gltfpack quantized the UVs and compensated per-texture with `KHR_texture_transform`** — the screen mesh's UVs span ~1/16 of unit space and the baked emissive texture carries `repeat ≈ ×16.0037, offset ≈ 0`. A texture swapped onto that mesh WITHOUT the transform renders 16×16 tiled thumbnails. `retargetScreenTexture(dial.texture, watch.bakedScreenTexture)` copies offset/repeat/rotation/center from the baked map AND sets `flipY = false` (glTF convention — dial-lane pitfall #4) + `needsUpdate` (flipY is an upload-time property). Call it BEFORE `stage.adoptWatch` (which puts the GLB mesh in front of the camera on the very next frame). The dial canvas (422:514) maps undistorted — the UV rect matches the physical display aspect (the BAKED square texture was the pre-stretched one). The baked `mat_screen_dial` material + texture stay in the GLB as fallback/loading state (DEVICE-DECISION §6.4) — unused after adoption, never uploaded.

## 4 · Raycast + case-local axes (P3 consumers)

- **Node names, NEVER indices**: gltfpack inserts anonymous holder nodes — every named contract node (`part_screen`, `crown_ring_orange`, …) parents ONE anonymous child that carries the mesh, so `intersection.object.name` is `""`. Use `resolvePartName(intersection.object)`: climbs ancestors, returns the nearest `part_*` name if one exists on the way up, else the first named node (secondaries are legitimate hits), null above `watch_root`. Lookup direction: `watch.parts: Map<string, Object3D>` (175 named nodes) · `stage.watch` exposes the asset.
- **Case-local axes** (`watch.caseSpace`, registered on the rig via `rig.setCaseSpace`): the case sits tilted inside the band loop (USDZ AR pose; root chain +90°X · ×0.01 · +55°X · z−0.164). Frame derived at load from the `part_screen` geometry: `zAxis` = area-mean world normal (dial normal — measured **35° above horizontal**, i.e. 55° off vertical), `yAxis` = world-up projected onto the dial plane (dial-12 direction), `xAxis = y×z` (crown side), `origin` = screen center, `quaternion` case→world, `toWorld(v)`/`toCase(v)` helpers. Beat authors: express "dolly along the dial normal" as `rig.caseSpace.toWorld(new Vector3(0,0,1))` — null-guard until adoption. Axes are valid for the watch at rest in its wrapper; the product group's idle rotation carries watch and beat together.

## 5 · Post-chain change every lane must know

**Bloom darkening now HIDES transparent meshes instead of black-swapping them** (`gl/post.ts renderBloom`). The old opaque-black swap would have occluded the emissive screen behind the now-transparent sapphire crystal and killed the halo. Rule inherited by P2/P3: anything transparent in front of the screen keeps the glow alive automatically; anything OPAQUE still occludes correctly; anything that must bloom stays on `SCREEN_BLOOM_LAYER` (unchanged). gl-lane pitfall #1 still stands for opaque meshes.

## 6 · Material-defect first passes (DEVICE-DECISION §6.4 → this lane)

1. **`mat_crystal_sapphire`** (shipped opaque black): replaced with transparent `MeshPhysicalMaterial` — opacity 0.22, roughness 0.04, clearcoat 1.0, ior 1.76, `depthWrite:false` (screen must render behind it). **Alpha route chosen over transmission** deliberately: transmission adds a full extra scene render per frame AND interacts badly with the dual-composer selective bloom; the live dial reads through it and env fresnel carries the glass. P1.5 look-dev may revisit with measured cost.
2. **Back-crystal cluster marble** (normal/AO in wrong slots/colorspace): `mat_back_spun` re-seated opaque dark spun metal (shipped alphaMode BLEND α0.1 — that WAS the marble); normal/AO stripped from `mat_back_ceramic`/`mat_back_lens`/`mat_back_matte`; ceramic re-colored near-black. Verified clean at the Disassembly macro angle (engraved DIVE-40M ring legible).
3. **`mat_band_ocean` washed mint**: corrected via the DEFAULT_LOOK override hook (NOT hardcoded) — `{color:"#1f6153", roughness:0.58, envMapIntensity:0.45}` + same for `mat_band_tab` (one colorway, one correction). The bright studio env lifts fluoroelastomer hard — judge band colors against RENDERED frames, not swatches. Look agents own the final Apple-reference colors.

## Pitfalls found this lane (look agents + P2/P3 must inherit)

1. **`*/` inside block comments**: the naming contract literally contains `part_*/grp_*` — written verbatim in a TS doc comment it TERMINATES the comment (`*_*/`). Write `part_* / grp_*`. (Bit this lane twice.)
2. **KHR_texture_transform on EVERY texture slot** (gltfpack quantization) — §3. Any future texture swap on ANY GLB mesh (colorway maps!) must copy the original map's offset/repeat first.
3. **Env swap race**: anything replacing `scene.environment` outside `stage.swapEnvironment` will fight the boot-HDR promise. Use the stage method — it owns the lock.
4. **Material identity is not stable across overrides**: `ensurePhysical` REPLACES the material instance; never cache `watch.materials.get(...)` across an `applyLook` — re-read from the map.
5. **`mat_band_ocean`/`mat_band_tab` load as MeshPhysicalMaterial already** (KHR_materials_specular) with a dark `specularColorFactor` — a pure color override still reads bright under a white env; tune envMapIntensity with color (§6.3).
6. The GLB's `?materials` inspector rows show mesh names `mesh_N` (anonymous holders) — material NAME is not in the table yet; the look-dev editing inspector should add it (open handoff below).

## Open handoffs

- **3 look agents**: build against §2. Env authoring replaces `envFile`/`envParams` per look; `public/assets/looks/<name>.json` + one screenshot each; `__ONE_HERTZ__.look.apply` is your hot loop. Ocean/Alpine/Trail colorway colors from Apple references (Alpine/Trail geometry pending the $30 dika3d purchase — Ocean-only until then).
- **P3 explode/raycast**: `resolvePartName` + `watch.parts` are ready; proxy hitboxes or three-mesh-bvh still P3's call (PLAN §3).
- **P3 colorway swap**: tween targets = `watch.materials` values (mind pitfall #4); `MaterialOverride` shape is a natural CONFIG_CHANGE payload.
- **Materials inspector**: add the material-name column + live editing (look-dev lane owns it, docs/p1/gl.md handoff stands).
- **Perf**: bundle grew to 865KB/244KB gzip (GLTFLoader+KTX2+meshopt in the main chunk); the loader-split + lazy-stage-init item from docs/p1/integrate.md #1 now has its natural seam (`webgl/watch.ts` is dynamic-import-ready). Not done this lane.
- Deploy NOT done (lane spec) — next deploy ships the GLB + basis + looks assets automatically (they're in `public/`).
