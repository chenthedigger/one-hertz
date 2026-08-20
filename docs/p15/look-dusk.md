# P1.5 lane notes — LOOK C "LUMINOUS DUSK" (`?look=dusk`)

Status: **DONE — all deliverables shipped, live proof against a REAL build, zero console errors** · started 2026-08-20 (lane died on session limit after the 8 renders), completed 2026-08-21
Thesis: warm porcelain going down for the night — one low amber key raking the case, deep soft shadows, the emissive dial carrying more of the frame than in any other look, nocturne-continuum grading (the Nocturne section is where this look *arrives*, not a detour), grain stronger in the shadows.
This is the only look lane authorized to touch src — it closed the shared `ior` schema gap for all three looks (§5).

## Deliverables (all verified, not claimed)

| # | Deliverable | Where | Evidence |
|---|---|---|---|
| 1 | Authored dusk env → 2k equirect Radiance HDR | `public/assets/looks/dusk.hdr` (594KB) | `research/lookdev/dusk/scripts/build_dusk_env.py`; preview `env-equirect-preview.png` |
| 2 | Material grade (Blender) + per-mat three.js overrides | grade in `scripts/grade_dusk.py`; overrides in the config | 8 Cycles renders below |
| 3 | Look config per plumbing §2 schema | `public/assets/looks/dusk.json` | fetch + hot-apply verified live |
| 4 | 8 canonical renders, Cycles 128spp 1280px Metal GPU | `research/lookdev/dusk/*.png` | reviewed frame by frame |
| 5 | Live proof, headless real Chrome 1600×900, **`vite preview` on the production `dist`** (not dev) | `live-{hero,midscroll,longpress}.png` | `scripts/live-proof.mjs`: state `{look:"dusk", parts:175, screenAdopted:true}`, longpress `{active:true, intensity:1}`, **CONSOLE_ERRORS 0** |
| 6 | Per-section lighting keyframes | `sectionKeyframes` in the config | 15 sections, env rotation + key intensity |
| 7 | **src: `MaterialOverride.ior`** (this lane only) | `src/gl/look.ts` + plumbing §2 schema updated | `npm run build` (tsc strict + vite) clean |

## 1 · The authored environment (NOT a stock HDRI)

Seven feathered emissive lightformers over an authored dusk sky dome (ink zenith `#131120` → lifted mauve `#3a3750` → narrow amber horizon glow `#7d5233` → deep warm ground; strength **0.24** — the sky stays quiet on purpose, the dial is meant to out-shine it). Baked by Cycles panorama camera, 2048×1024 scene-linear Radiance.

- **KEY** — `lf_key_amber`: 16m low warm-amber strip at elev 18°, az +100° off the dial axis, strength 30, plus a hotter core strip (`#ffc87e`, 60) nested at nearer radius. THE "last light of the day" line along chamfers and case flanks.
- **RIM** — `lf_rim_lavender`: cool dim lavender strip high behind (az 195 / elev 38): the counter-chamfer line so the silhouette never dies into the dusk (**murk control #1**).
- **PICK ×2** — small vertical strips on both flanks (az ±90, elev 10): perpendicular knurl-ridge sparkle whichever way the env is rotated onto the asset.
- **FILL** — broad **neutral-cool** panel (az −45, elev 30, `#6a6a70`, strength 7): lifts the shadowed half one stop above black (**murk control #2**) without re-gilding the titanium.
- **POOL** — faint warm floor bounce below the horizon.

Empirical findings baked into the rig (round-1/2 retakes):
- **Azimuth convention: az 0 = the direction the dial faces.** Nothing bright may sit near az 0 at low elevation — that is the sapphire's mirror direction from the hero/dial cameras, and any big source there washes the dial to a glare sheet. The key rakes at +100° instead.
- **A 360° warm band re-gilds the bezel**: the amber horizon glow had to be narrowed and desaturated, with the warm cast concentrated in the KEY strip; ambient stops stay near-neutral (`#191715`/`#2b2624` ground) or the whole case reads gold (see also §2).
- Emitters are spherical-gradient feathered (Emission mixed to Transparent BSDF) — independently the same lesson porcelain recorded: hard-edged cards leave black rims in every reflection.

## 2 · Material grade

Offline (`grade_dusk.py`) and live (JSON overrides) share values; where the renderers diverge **the JSON is the shipping truth**:

- **Titanium**: neutral silver `#c3c4c6`, metalness 1.0, roughness banded 0.30 (bezel) – 0.38 (case shell), polished 0.12. **The dusk warmth comes from the LIGHT, never the albedo** — a warm Ti base under the amber key reads as a gold watch (found empirically, round 1; the other lanes' warmer `#cfccc6` base is wrong under THIS env).
- **Anisotropy** (instrument lane's A/B finding applied): **removed from the case set** — `mat_titanium_case` / `mat_titanium_brushed` / `mat_case_top` / `mat_titanium_hardware` carry NO aniso in the config (quantized-UV tangents render it as marbled noise in three.js). Kept where it reads clean: crown 0.45, knurl 0.4, bezel 0.5, polished 0.3, back_spun 0.9. The Cycles evidence renders keep mild case aniso (real tangents offline) — do not copy that to the web.
- **`mat_case_ao`** (porcelain lane's finding applied): dead-override `{roughness:1, metalness:0, envMapIntensity:0}` — the USDZ's baked-AO overlay shells catch env speculars as camo mottling under any env with bright strips. Verified live: no mottling, no `unknown material` warn (the mat exists at runtime).
- **Sapphire crystal**: alpha route (plumbing §6.1) with **real `ior: 1.77` from config** — this lane added the field (§5). Plus opacity 0.22, roughness 0.03, clearcoat 1.0, envMapIntensity **0.7** (dropped below 1: the amber key otherwise sheets across the crystal and murks the dial — the brief's "manage murkiness" lever #3). Offline = true transmission IOR 1.77.
- **Back cluster**: spun `#2c2c2f` aniso 0.9, ring polished Ti 0.35, ceramic `#141517` + clearcoat, lens `#0a0b0d` gloss — plumbing re-seat inherited, no marble (see `back-crystal.png`).
- **Ocean band**: **`#124e47` abyss teal, deliberately blue-shifted** — the amber key drags any neutral teal toward olive; judged on rendered frames under THIS env (same lesson as both peer lanes, opposite correction direction). Roughness 0.52, envMapIntensity 0.5, clearcoat 0.12 micro-sheen.
- **Screen (offline only)**: baked Wayfinder at emission **7.0** (nocturne test 9.0) — the dusk look runs the dial hotter than porcelain (3.2) or instrument (3.0) because the dial carries the frame. Live = the dial subsystem, untouched; the higher read comes from bloomStrength 0.85 + the dim env, not from touching the screen.
- **Black DLC variant**: `finishVariants.blackDlc.materialOverrides` — ready P3 CONFIG_CHANGE payload (loader-ignored by design), `#232426`, polished roughness 0.3 / rest 0.4, **same aniso case-set ban as the natural grade**.

## 3 · Light rig, post, keyframes

- `lightRig`: envRotation 0 (the HDR is baked dial-relative — az 0 IS the dial azimuth), envIntensity 1.15, exposure 1.0.
- `postTune`: bloom 1.0 / **0.85** / 0.4 (hottest of the three looks — the dial halo is the thesis), **grain 0.07** (strongest of the three; the luminance-driven weighting concentrates it in the dusk shadows per brief), Nocturne vignette 0.34.
- `bgTokens`: stage `#E8E1D8` warm porcelain, ink `#0E0C0A`.
- `sectionKeyframes` (15 sections): −20°/section-ish sweep 0 → −300 so the amber key walks around the case as the story advances; Mechanism peaks 1.25 (hardest read), **Nocturne dips keyIntensity to 0.35 at −220** — not the near-blackout of the other looks (0.045/0.12), because dusk grades *into* nocturne on a continuum rather than cutting to it; Footer settles at 0.85 (the day ends dimmer than it began). Same wiring contract as the peer lanes: P2 lerps section-center keys off the clock scalar via `stage.setEnvRotation`/`setEnvIntensity`.

## 4 · Evidence

Canonical renders (Cycles 128spp / 1280px / AgX MHC, lit by the shipped dusk.hdr): `hero-34` (amber key on the chamfers, dial carrying the frame) · `macro-crown` (sensor 16 / lens 40 f2.0 — PROGRESS.md macro optics) · `dial-face` (down the measured 35° dial normal) · `side-profile` (100mm, 14.4mm story, band loop as a ring of dusk-lit teal) · `band-ocean-macro` (focus on a real band-crest vertex — bbox centers sit inside the loop and give 100% bokeh) · `back-crystal` (floor hidden, small aimed warm area light reveals the sensor array without breaking the mood) · `hero-dlc` · `nocturne-test` (env 0.3 rotated +140°, emission 9 — the continuum end-state).

Live (headless real Chrome, 1600×900, **production build**: `npm run build` → `npx vite preview --port 4180`): `live-hero.png` (Intro — warm porcelain stage, amber-rimmed case, luminous Wayfinder through the crystal), `live-midscroll.png` (Mechanism @0.5 — deep-shadow silhouette with the amber rim holding the edge), `live-longpress.png` (real 3.2s pointer hold, `{active:true, intensity:1, scrollEnabled:false}`, crown macro with amber accents). **Zero console errors, zero page errors.** Two warnings only: `RGBELoader has been deprecated` ×2 (three r185 deprecation, fires for ANY `envFile` look incl. porcelain/instrument — upstream `loadHdrEnv` should move to HDRLoader; not lane-caused, flagged as handoff).

## 5 · The src change (this lane only): `MaterialOverride.ior`

Closes porcelain blocker #1 / instrument gap #1 for all looks. `src/gl/look.ts`:
- `MaterialOverride` gains optional `ior?: number` (MeshPhysicalMaterial.ior, default 1.5);
- `ior` joins the `needsPhysical` upgrade triggers (`ensurePhysical`);
- applied under the physical branch: `if (o.ior !== undefined) material.ior = o.ior;`.
Plumbing §2 schema block updated in place. Additive and optional — `default.json`/`porcelain.json`/`instrument.json` untouched and unaffected; porcelain/instrument may now claim their 1.77 by adding one field. Verified: `npm run build` (tsc strict + vite) clean; live apply exercises the path (dusk's crystal override carries `"ior": 1.77`).

## Pitfalls found this lane (beyond the inherited ones)

1. **Warmth placement is a failure axis**: warm albedo + warm key = gold watch; warm 360° horizon band = gilded bezel. Keep titanium albedo neutral and concentrate ALL warmth in one raking key strip.
2. **The sapphire mirror direction owns az 0**: bake env rigs dial-relative and keep bright formers ≥~90° off the dial azimuth, or the crystal turns to glare and murks the dial — the brief's murkiness risk is mostly *this*, not exposure.
3. **Don't nuke node trees on materials with packed textures** (`mat_screen_dial`): orphaning the packed image renders missing-image magenta. Grade values on the existing Principled instead (`grade_dusk.py` round-2 lesson).
4. Session-limit deaths mid-lane are survivable when everything is scripted: the 8 renders + both .py scripts were re-runnable state; only config polish, the src edit, live proof, and this doc were lost. Keep lanes script-first.

## Open handoffs

- `loadHdrEnv` (gl/env.ts) should migrate RGBELoader → HDRLoader (three r185 deprecation warning on every HDR look; cosmetic, zero functional impact today).
- Contact shadow still unreachable from look config (instrument gap #2 stands — dusk would deepen it too if the key ever gets a `contactShadow` block).
- `sectionKeyframes` remain authored-but-inert until the P2 per-frame driver lands (all three looks share the wiring contract).

## Files owned by this lane

`public/assets/looks/dusk.{hdr,json}` · `research/lookdev/dusk/**` (8 renders, env preview, 3 live frames, `scripts/{build_dusk_env,grade_dusk,hdr_preview}.py`, `scripts/live-proof.mjs`) · `src/gl/look.ts` (ior addition) · plumbing §2 schema line · this note.
