# DEVICE-DECISION — Ultra 3 vs Series 11, by rendered evidence

Date: 2026-08-20 · Lane: asset QA + device decision (P1) · Inputs: Apple official USDZs (SPIKE-A route a)
Method: headless Blender 4.5.12 import → full inventory (`<device>/inventory.json`) → group-ID renders
(`<device>/id/`) → rename pass to GLB naming contract → draft GLB + `gltfpack -tc -kn -cc` → Cycles CPU
turntables (32 samples, 640px, neutral 3-point studio).

## Verdict up front

**Ultra 3 wins — confirmed by renders, not just catalog reasoning.** Natural + Black-DLC titanium are pure
material swaps on the same geometry (both rendered below). The USDZ ships exactly **ONE band: an Ocean Band**
(mint-green fluoroelastomer, tubular, Ti round buckle) — so the **dika3d $30 purchase stands** for Alpine/Trail
band geometry (see §5). Series 11 stays a *reference-asset donor* (2048px dial, spun back anisotropy map), not
the hero.

## 1) Rendered evidence

### Ultra 3 — natural titanium (as shipped)

| front-right | flank / crown | back / buckle |
|---|---|---|
| ![u-nat-01](ultra-3/turntable-natural-01.png) | ![u-nat-11](ultra-3/turntable-natural-11.png) | ![u-nat-04](ultra-3/turntable-natural-04.png) |

### Ultra 3 — black titanium (DLC approximation, material-only swap: base 0.045, rough 0.25–0.45)

| front | three-quarter | back |
|---|---|---|
| ![u-blk-00](ultra-3/turntable-black-00.png) | ![u-blk-01](ultra-3/turntable-black-01.png) | ![u-blk-03](ultra-3/turntable-black-03.png) |

The black front frame is the single strongest asset argument in this file: Wayfinder dial fully legible,
orange crown ring + action button reading as jewelry, crown knurl catching speculars — all from free official
geometry plus one material tweak.

### Series 11 — light/rose aluminum (as shipped)

| front-right | flank / crown | back |
|---|---|---|
| ![s-nat-01](series-11/turntable-natural-01.png) | ![s-nat-11](series-11/turntable-natural-11.png) | ![s-nat-07](series-11/turntable-natural-07.png) |

Series reads *soft*: curved-edge glass swallows the bezel, sport band is one smooth tube, the only specular
event is the crown. Beautiful product, thin macro-lighting story.

## 2) Inventory summary (full data: `*/inventory.json`)

| | Ultra 3 | Series 11 |
|---|---|---|
| Meshes / materials / images (imported) | 67 / 26 / 18 | 47 / 26 / 8 |
| SkelRoot handling | **flattened to static bind pose by Blender 4.5 USD import** — zero armatures, zero vertex groups survive; no bake step needed | same |
| Band inside the USDZ | **ONE**: Ocean Band, mint green, + Ti buckle/keeper hardware | ONE: Sport Band, blush, pin-and-tuck |
| Dial texture | **Wayfinder 1024×1024 JPG** (`ultra-3/textures/rIbiCAQPvhuVClj.jpg`) — 10:09, WEST MARINA, 1.8 FT depth complication. *SPIKE-A said 2048px — corrected: 1024.* | **Flow-style 2048×2048 PNG** (`series-11/textures/CdGUMOYYnHJfiuT.png`) — the true 2048px dial SPIKE-A attributed to Ultra |
| Scale sanity | head width **44.2mm vs 44.0 spec (+0.5%) PASS**; full scene 44.2×93.3×97.0mm = case tilted ~45° inside the band loop (AR pose); 49mm lug-to-lug consistent with tilted bbox diagonals | head width 41.7mm ≈ 46mm-model width (~39.8mm) + crown protrusion — consistent with the 46mm variant, PASS |
| Draft GLB | 8.51MB → **1.24MB** ktx2 (6.9×) | 9.43MB → **1.28MB** ktx2 (7.4×) |

Texture catalog highlights (all extracted to `*/textures/`): Ultra — crown-knurl normal + micro-detail set
(512), speaker-grille masks, case AO pack, orange-accent albedos; Series — **spun-metal back-crystal
anisotropy map**, sport-band albedos. Everything ≤512px except the two dials. Confirms PLAN §3: geometry
donor only, all hero materials re-authored.

## 3) Rename pass — GLB naming contract (INTERNALS-REF §8 style)

Maps: `scripts/rename-map-{ultra-3,series-11}.json` · applied by `scripts/rename_export_turntable.py` ·
**67/67 and 47/47 meshes mapped, 0 unmapped**, verified surviving `gltfpack -kn` in both ktx2 GLBs.

Contract nodes present (Ultra): `part_case, part_crystal, part_screen, part_crown, part_sideButton,
part_actionButton, part_backCrystal, part_bezel, part_band_strapLong, part_band_strapShort` + structured
secondaries (`crown_ring_orange`, `band_buckle`, `bandRelease_top/bottom`, `back_lens_array`,
`band_lugScrew_01..08`…). Series mirrors it (`part_band_strapTop/Bottom`, `band_pin`…). Groups renamed
`grp_*`; materials `mat_*` (e.g. `mat_titanium_case`, `mat_band_ocean`, `mat_screen_dial`) — feeds the
`?materials` debug param directly. Mapping was verified visually via flat group-ID renders (`*/id/id-*.png` +
`id-legend.json`), not guessed from bboxes alone.

## 4) "≥4 gorgeous swap states" scoring (rendered, not claimed)

| State | Ultra 3 | Series 11 |
|---|---|---|
| Case finish swaps (material-only) | Natural Ti ✓ rendered · Black DLC ✓ rendered | 4+ aluminum colors (rose ✓ rendered; jet black/silver/space grey = trivial tints) |
| Band families available as GEOMETRY | Ocean ✓ in-file · Alpine ✗ · Trail ✗ (→ dika3d) | Sport ✓ in-file · everything else ✗ (no credible marketplace donor found in SPIKE-A) |
| Macro-lighting jewelry | crown knurl + orange ring, grille slots, raised bezel, buckle hardware, flat sapphire edge | crown, curved glass — little else |
| Story fit (ONE HERTZ) | Wayfinder depth/compass dial = Details/Nocturne beats; action button; 1.8FT complication | Flow dial is abstract, no instrument story |
| **Score** | **2 finishes × 3 band families = 6+ states** (2 rendered today, band geometry $30 away) | 4 states, all case tints on one band silhouette |

## 5) Purchase recommendation (stands, sharpened)

The Ultra USDZ contains **only the Ocean band**. To reach the 6-state matrix, buy exactly:

> **Sketchfab Store · dika3d "Apple Watch Ultra 2 all colors"** — **$30.00**, Sketchfab **Standard** license
> (royalty-free commercial web use) — https://sketchfab.com/3d-models/apple-watch-ultra-2-all-colors-4ace9b0bdea542c3b444f4aa7ab5727d
> Deliverables we need from it: **Alpine Loop geometry** (blue/indigo/olive) + **Trail Loop geometry**
> (orange-beige/blue-black/green-gray) in the native BLEND, 2K PBR. Its Ocean variants become color/material
> reference for recoloring our (better, official) Apple Ocean geometry. Ultra 2 chassis ≈ Ultra 3 for band
> lugs — bands transplant cleanly onto the Apple case.

Named backup unchanged (SPIKE-A #3): TurboSquid 2464895 "$69 Ultra 3 All Colors", trigger = dika3d bands fail
import/quality. Total worst case still $99, well under the $250 pause line.

## 6) What P1.5 look-dev receives

1. **Hero geometry donor**: `ultra-3-draft.glb` (8.5MB, contract-named, static bands) + `ultra-3-draft.ktx2.glb`
   (1.24MB proof of pipeline; final hero re-encodes with `-tu` for normal/roughness slots and `-vtf` — see defects).
2. **Reference kit**: Ultra Wayfinder 1024 dial (dial-subsystem layout reference), Series 2048 Flow dial,
   Series spun-back anisotropy map, crown-knurl + grille + weave normal maps — all in `*/textures/`.
3. **Rename maps + scripts** (`scripts/`): deterministic — re-running import+rename on the pristine USDZ
   reproduces the GLB bit-for-bit workflow; Blender surgery in P1.5 starts from named parts, not archaeology.
4. **Known material defects to re-author (all expected — UsdPreviewSurface ceiling):**
   - `mat_crystal_sapphire` renders semi-opaque grey at face-on angles (USD opacity semantics lost) → needs real transmission/fresnel.
   - Back-crystal cluster renders dark marbled artifact on BOTH devices (normal/AO maps land in wrong slots/colorspace; usdchecker already flagged `sourceColorSpace`) → full re-author, geometry itself is clean.
   - `mat_band_ocean` ships washed mint (0.525, 1.0, 0.45 base, RealityKit shader graph not imported) → author real Ultra 3 Ocean colorways from Apple references.
   - `mat_screen_dial` is a baked still — replaced by the live dial canvas subsystem (PLAN §3), keep as fallback/loading state.
   - gltfpack warns texcoord quantization error 59–86% on these UVs → final encodes add `-vtf`.
5. **Open items**: `back_ti_ring_*`, `lug_channel_*`, `case_inner_*` names are best-effort labels for interior
   shells — confirm during hero surgery; iOS-real-device and in-three.js load checks belong to the engine lane
   (KTX2Loader + MeshoptDecoder wiring per TOOLCHAIN.md).

## 7) Decision

**Ship the Ultra 3 as the hero device.** Geometry donor: Apple official USDZ (renamed draft in this folder).
Finishes: natural + black DLC titanium as material swaps. Bands: Ocean (official geometry, recolored per look
bible) + Alpine + Trail from the $30 dika3d purchase. Series 11 assets stay in-repo as dial/material reference
only. This matches PLAN §10.1's lean with rendered proof behind every row above.
