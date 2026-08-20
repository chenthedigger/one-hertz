# SPIKE-A — Hero exterior asset hunt (catalog pass, no purchases)

Date: 2026-08-20 · Status: catalog + free downloads complete · Purchases: NONE (recommendation below)

## 1) Apple official USDZ — FOUND, both devices, downloaded

Hour-1 existence check: **positive for both.** AR Quick Look USDZs live in product-page HTML
(no `ar-quick-look` attribute match; raw `.usdz` path in markup). Shop /buy-watch pages carry none.

| | Ultra 3 | Series 11 |
|---|---|---|
| Source URL | `https://www.apple.com/105/media/us/apple-watch-ultra-3/2025/dabb0ca4-1556-466c-a314-ae3ba2cc088e/ar/watch-ultra-3.usdz` | `https://www.apple.com/105/media/us/apple-watch-series-11/2025/cb7dae4b-d675-49db-8fe3-d4f635c1a345/ar/watch-series-11.usdz` |
| Local file | `research/assets-candidates/apple-watch-ultra-3.usdz` (8.8 MB) | `research/assets-candidates/apple-watch-series-11.usdz` (9.2 MB) |
| Meshes / Materials / Shaders | 67 / 26 / 95 | 47 / 26 / 105 |
| Verts / faces | 67,011 / 63,474 | 69,963 / 66,388 |
| Rig | 2× SkelRoot + Skeleton (bands are **skinned**) | same |
| Textures | 26 maps, 256–2048px, PNG+JPG | 16 maps, up to 2048px |
| Shader model | UsdPreviewSurface + UsdUVTexture (+1 RealityKit MaterialX node) | same |
| usdchecker | fails on cosmetics only: `wrapS/wrapT` string-vs-token, normal-map `sourceColorSpace` not `raw` | same class |

**Inventory notes (from extraction):**
- **Ultra 3 ships a real 2048px Wayfinder dial texture** (10:09, WEST MARINA, satellite/waypoint layout, depth `1.8 FT` complication) — direct reference gold for the dial subsystem (PLAN §3 dial workstream).
- Speaker-grille micro-perforation maps, crown knurling normals, woven band weave normals present. Series 11 includes a beautiful spun-metal back-crystal anisotropy map and sport-band segment albedos.
- Textures are largely grayscale mask/AO/normal packs — confirms plan assumption: **geometry donor only, ALL hero materials re-authored** (UsdPreviewSurface has no clearcoat/anisotropy).
- **Prim names are obfuscated** (`QQOFUksZCFObocz`…). Blender surgery must include a renaming pass (identify parts visually → rename for `gltfpack -kn` raycast names). Meshes ARE segmented (crown, buttons, grille, band links in separate Xform groups) so renaming is labeling work, not re-cutting.
- Skinned bands → flatten/apply skel on import, or keep for band-flex animation.
- Variant coverage per file: ONE finish + ONE band each (Ultra 3: natural Ti + woven band; S11: light aluminum + sport band). Finish swaps must come from re-authored materials (cheap) — extra band GEOMETRY must come from elsewhere.
- License: Apple provides these for AR Quick Look viewing; no redistribution license. Takedown tail-risk accepted once in PLAN founder directive 3; ship processed GLB only, never raw source archives (PLAN §P6).
- `usdrecord` renders blank (RealityKit shader graph); `qlmanage` thumbnailing hung. Visual QA needs the P0 Blender import smoke test — first real render gate.

## 2) Marketplace sweep — ranked by expected hero visual quality

| # | Candidate | Price | License (exact) | Geometry | Formats | Swap-state coverage | Judgment |
|---|-----------|-------|-----------------|----------|---------|--------------------|----------|
| 1 | **Apple USDZ Ultra 3** (above) | $0 | Apple AR asset, no formal license (risk accepted) | 63.5k faces, 67 segmented meshes | USDZ→GLB via Blender | 1 finish × 1 band as-shipped; finishes = material swaps | Canonical proportions, official-grade bake, real dial. Geometry donor of record. |
| 2 | **Sketchfab Store · dika3d "Apple Watch Ultra 2 all colors"** [link](https://sketchfab.com/3d-models/apple-watch-ultra-2-all-colors-4ace9b0bdea542c3b444f4aa7ab5727d) | **$30.00** | Sketchfab **Standard** (royalty-free commercial use in apps/web; no asset resale) — NOT editorial | 1.196M tris / 659k verts | **BLEND native**, FBX, OBJ, GLB | **9 band variants**: Alpine (blue/indigo/olive) + Ocean (blue/white/orange) + Trail (orange-beige/blue-black/green-gray), 2K PBR | Band-geometry donor king. Ultra 2 chassis ≈ Ultra 3 exterior (same 49mm Ti case; U3 diff = slimmer display bezel — hidden behind our re-authored screen anyway). Hi-poly = LOD source. |
| 3 | **TurboSquid 2464895 "Apple Watch Ultra 3 All Colors"** [link](https://www.turbosquid.com/3d-models/apple-watch-ultra-3-all-colors-3d-model-2464895) | $69 | TurboSquid Standard 3D Model License (royalty-free; page 403s bots — verify editorial flag at checkout) | unknown poly (page blocked); quads/tris, unwrapped UVs | **C4D 2024 native** (+exports) | "All colors", separated named objects (frame, screen, glass, back) | Ultra-3-exact + separation already named. C4D-native = conversion friction (no Blender file). Backup if dika3d bands disappoint on import. |
| 4 | **Apple USDZ Series 11** (above) | $0 | as #1 | 66.4k faces, 47 meshes | USDZ→GLB | 1 finish × 1 band; 4+ case finishes = pure material swaps | Beautiful spun back. Loses on band variety + story fit. |
| 5 | TurboSquid 2468999 "Ultra 3 Ocean Band" ($199) / "Ultra 3 Black" ($179) / "Ultra 3 Trail Loop" ($30) | $30–199 | TurboSquid standard (unverified per-item) | unknown | mixed | single-variant each | Poor $/swap-state vs #2/#3. Trail Loop $30 only as à-la-carte band patch. |
| 6 | Sketchfab · polyman Ultra 2 [link](https://sketchfab.com/3d-models/apple-watch-ultra-2-f33263c457664b43909200c5ed5e6fa2) | $0 | **CC Attribution** | 140.9k tris / 100.9k verts | glTF via Sketchfab download (login-walled) | 1 variant | Best free non-Apple fallback; also dannzjs Ultra (176.9k tris, CC-BY), keshavV20 (50.7k, CC-BY). All behind Sketchfab account wall — no anonymous download API (verified: 401). |
| 7 | CGTrader kaspergadgets "Ultra 3-2025" [link](https://www.cgtrader.com/3d-print-models/hobby-diy/electronics/apple-watch-ultra-3-2025) | $22.80 | "Royalty Free License (no AI)" | 113k tris (STL) | BLEND/OBJ/FBX/STL/+CAD | n/a | **3D-print model, no PBR materials** — geometry emergency spare only. |
| 8 | Sketchfab Store · Wittybacon "Ultra (2022)" | $5.99 | **EDITORIAL — flagged, unusable** for a portfolio piece | 145.3k tris | blend incl. | 1 (orange Alpine) | Rejected on license. |
| 9 | CGTrader "Series 11 Jet Black" [link](https://www.cgtrader.com/3d-models/electronics/other/apple-watch-series-11-jet-black-sleek-smartwatch) | unlisted (page JS-walled) | unverified | unknown | OBJ/FBX/STL/BLEND/GLTF | 1 finish | Thin evidence; only matters if Series route wins (it doesn't). |
| 10 | Fab.com sweep | — | — | — | — | — | Only an "Apple Watch Series 9 in Graphite" listing surfaced; no Ultra 3 / Series 11 coverage. Dead end. |

## 3) Free downloads secured

- `research/assets-candidates/apple-watch-ultra-3.usdz` — official Apple, 8.8 MB
- `research/assets-candidates/apple-watch-series-11.usdz` — official Apple, 9.2 MB
- Sketchfab CC models: **login wall confirmed** (`/v3/models/{uid}/download` → 401 without OAuth). No anonymous grab possible; GitHub mirror search: zero hits. If a CC fallback is ever needed, a free Sketchfab account unlocks polyman/dannzjs in one click — deferred, not blocking.

## 4) Device choice implication (">=4 gorgeous swap states")

**Ultra 3 wins.**
- Ultra: 2 Ti finishes (Natural / Black DLC — **pure material swaps**, zero extra geometry) × 3 band families (Ocean/Alpine/Trail — geometry from dika3d's 9 variants) = 6+ gorgeous states from $30. Bonus: the Apple USDZ's own Wayfinder dial (depth/compass complications) is exactly the ONE HERTZ Details/Nocturne story; Ultra's chunky crown + grille + knurling give the exploded view and macro shots real jewelry to light.
- Series 11: 4+ case finishes are also just material swaps, but marketplace band-geometry coverage is thin (one Jet Black listing, JS-walled), and the slim case offers fewer macro-lighting features. Loses on both swap richness and story fit.

## 5) Recommendation + next action

1. **Adopt Apple Ultra 3 USDZ as geometry donor of record** (already in repo path). P0 Blender smoke test = import this exact file, render one turntable frame, rename-pass feasibility check on obfuscated prims.
2. **Buy Sketchfab dika3d "Apple Watch Ultra 2 all colors" — $30, Sketchfab Standard license** (band-geometry donor: Ocean/Alpine/Trail × 3 colors, BLEND native, 2K PBR, hi-poly LOD source). Well under the $250 pause line; narrate at purchase per PLAN. Requires a Sketchfab account at checkout.
3. Hold TurboSquid $69 "Ultra 3 All Colors" as the named backup — trigger: dika3d bands fail the Blender import/quality look, or Ultra-3-exact bezel matters in a shot the screen doesn't cover.
4. In-house route stays what PLAN says: materials are in-house REGARDLESS (UsdPreviewSurface ceiling); full in-house exterior modeling only if both purchases fail the shootout render — unlikely given #1's official geometry.
5. Shootout render matrix for the council: Apple-geometry × re-authored materials vs dika3d-geometry × same materials, identical turntable + macro shots (per PLAN §4.2).

**Spend ask: $30 now, $69 contingent. Total worst case $99.**
