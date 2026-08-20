# P1.5 lane notes — LOOK B "INSTRUMENT LIGHT" (`?look=instrument`)

Status: **DONE** · 2026-08-20 · built against `docs/p15/plumbing.md` §2 (look-config schema), zero src edits
Thesis: precision-tool read — harder key, crisp rims, higher micro-contrast, cooler neutral (5500K key / 7000K fill),
long streak speculars along the chamfers, deep contact read, light that MOVES with the story (full 360° env
revolution over the page, loop-closing at the outro restart).

## Deliverables

| File | What |
|---|---|
| `public/assets/looks/instrument.hdr` | AUTHORED environment — 8-lightformer emissive rig baked to 2k equirect Radiance HDR (Cycles panorama, 128spp). 100% authored, zero stock pixels. 392KB. |
| `public/assets/looks/instrument.json` | Full look config: env + lightRig + postTune + bgTokens + 24 material overrides + `x_dlcVariant` (black-DLC swap payload) + `x_sectionLightKeyframes` (15-section choreography). |
| `research/lookdev/instrument/render-0[1-8]*.png` | 8 canonical Cycles evidence renders (128spp, 1280px, AgX MHC), lit by the SHIPPED instrument.hdr itself. |
| `research/lookdev/instrument/live-{hero,mid,longpress}.png` | Live proof: headless real Chrome on `?look=instrument` — hero, Mechanism mid-scroll, held longpress at intensity 1.0. **Zero console errors.** |
| `research/lookdev/instrument/scripts/{bake_env,grade_and_render}.py` | Reproducible: rig + grade are script-built, `Blender -b --factory-startup -P …`. |
| `research/lookdev/instrument/env-preview.png` | Tonemapped equirect preview of the rig. |

## 1 · The authored rig (bake_env.py — design intent per lightformer)

| # | Former | Position (az/el) | Size | K | Radiance | Job |
|---|---|---|---|---|---|---|
| 1 | `key_hard` | 125° / +42° | 0.95×0.65m @2.2m | 5500 | 42 | hard key — small = crisp falloff, the "instrument" edge |
| 2 | `streak_chamfer_a` | 90° / +9° | 6.0×0.11m @3m | 5600 | 30 | THE signature: continuous spec crawling the case chamfer |
| 3 | `streak_chamfer_b` | 255° / +16° | 4.0×0.09m @3m | 6500 | 22 | rear-left grazing streak (flank read in 3/4) |
| 4 | `rim_main` | 340° / +12° | 0.14×2.4m @2.6m | 7000 | 55 | crisp cool rim, brightest edge in the env |
| 5 | `rim_kicker` | 195° / +8° | 0.12×2.0m @2.8m | 7000 | 32 | opposing rim — dual knurl glints |
| 6 | `top_strip` | 100° / +72° | 1.4×0.18m @2.4m | 5800 | 20 | bezel/knurl top glints |
| 7 | `fill_soft` | 30° / +18° | 3.2×2.2m @3.4m | 7000 | 2.6 | harshness management (the porcelain risk lever) |
| 8 | `bounce_floor` | 90° / −58° | 3.0×2.0m @3m | 5500 | 1.2 | floor return so metal darks keep shape |

Background: near-black→dark-cool-grey gradient (0.004→0.05 linear) — deep env keeps reflections graphic and
the contact feel heavy. Colors via Blackbody nodes (real Kelvin, not eyeballed tints). The rig design is
ROTATION-RELATIVE: formers hold their separations; `envRotationDeg` aims the whole rig (see §4).

**Harshness-on-porcelain (the declared risk)**: managed by lever pairs — fill panel radiance (1.6→2.6 after
first live round lifted metal darks without flattening the key) + floor bounce 0.7→1.2 + zenith 0.03→0.05.
Grain stays near-zero on porcelain automatically (luminance-weighted, gl lane §3); `grainAmount` tuned DOWN
to 0.048 (vs default 0.055) because hard light + grain double-count as "texture".

## 2 · Material grade (the three.js values live in instrument.json — summary)

- **Natural titanium** (case/brushed/polished/crown/knurl/hardware/bezel/case_top): warm-neutral Ti
  `#cfccc6`-class, metalness 1.0, roughness 0.30–0.42 banded by finish, envMapIntensity 1.1–1.3.
- **⚠️ Anisotropy finding (the lane's most important empirical result)**: `anisotropy` on
  `mat_titanium_case`/`mat_case_top`/`mat_titanium_brushed` renders as MARBLED noise in three.js — the
  quantized UV islands give three's computed tangents garbage directions on the case shell (A/B evidence:
  scratchpad tune0 vs tune2). **Removed from the case set; kept on parts where it reads clean (crown 0.7,
  knurl 0.5, bezel 0.8 @ rot 1.5708, polished 0.3, back_spun 0.85, back_ring 0.6).** The brushed-streak
  story is carried by the STREAK LIGHTFORMERS instead — honest "beat the source via lighting". Blender
  evidence renders keep mild case anisotropy (0.35) because Cycles has real tangents; do not copy that to
  the web config.
- **Sapphire crystal** (defect #1): web = alpha route per plumbing §6.1 — opacity 0.16, roughness 0.02,
  clearcoat 1.0, envMapIntensity 1.4 (IOR stays the in-code 1.76 — schema gap below). Blender renders =
  real transmission IOR 1.77.
- **Back cluster** (defect #2, on top of plumbing's re-seat): spun `#34363a` aniso 0.85 radial-intent,
  ceramic `#121316` + clearcoat 0.7, lens `#08090b` gloss, ring polished Ti.
- **Ocean band** (defect #3): `#2a5f55` roughness 0.56, envMapIntensity 0.4 — judged against RENDERED
  frames under THIS env (cool rig lifts fluoroelastomer differently than the default studio HDR).
- **Baked dial** (defect #4): untouched in the config — the live dial subsystem owns `part_screen`
  (plumbing §3). Offline renders wire the baked texture into emission strength 3.0 (AOD read) as the
  render-only stand-in.
- **Orange accents**: crown ring `#e04f18` (metallic 0.4), action button `#d94a16` — instrument-orange
  against cool light.
- **Black DLC variant** (`x_dlcVariant.materialOverrides`, loader-ignored by design): same geometry,
  8 titanium slots swapped to `#14–1e` band, roughness −0.03 vs natural (DLC seals slicker), same
  anisotropy topology. This is a ready CONFIG_CHANGE payload for P3 colorway swap.

## 3 · Evidence

Canonical renders (Cycles 128spp / 1280px / AgX Medium High Contrast — note: web is ACES; AgX chosen for
consistency with the internals workstream QA set):
`render-01-hero34` · `render-02-crown-knurl` (macro optics sensor 16 / lens 40, f3.2) · `render-03-dial-faceon`
· `render-04-side-profile` (105mm, the 14.4mm read) · `render-05-band-macro` · `render-06-back-crystal`
· `render-07-dlc-hero` · `render-08-nocturne` (env strength 0.10, screen emission 8 — dial carries the frame).

Live (headless real Chrome, 1600×900, dev server): `live-hero.png` (Intro, Wayfinder legible through
corrected crystal), `live-mid.png` (Mechanism, back cluster clean — no marble), `live-longpress.png`
(held ≥3s, `state().longpress = {active:true, intensity:1, scrollEnabled:false}`). Zero console errors on
`?look=instrument`.

## 4 · Per-section lighting choreography (`x_sectionLightKeyframes`)

Full table in instrument.json. Shape: one clean 360° env revolution across the 15 sections (Intro 0° →
Footer 360°) so the outro SWAP-restart lands back on the hero pose seamlessly. Highlights: Disassembly 70°
@ envIntensity 1.1/exposure 1.1 (hardest read, key crosses the exploded parts) · Curves 170° (streak strip
grazes the chamfer at the section about case curvature — light rehearses the copy) · Nocturne 290° @
envIntensity 0.12/exposure 0.9 (env hands light to the emissive dial; vignette flag on) · Colors ramps back
to 1.0. Wiring: P2 sections interpolate between section-center keys off the clock scalar via
`stage.setEnvRotation` (live) + `setEnvIntensity` + `toneMappingExposure`; values are DATA here so the
section agents never invent lighting.

## Pitfalls found this lane

1. **Anisotropy ≠ free on this GLB** — see §2 finding. Any look/colorway touching `anisotropy` on the case
   set must A/B a live frame first; Cycles renders will NOT show the artifact.
2. **`mat_crown_gasket` doesn't exist at runtime** (exists in the GLB JSON but attached to no rendered
   mesh after load) — overriding it warns `unknown material`; dropped from the config. Author looks from
   the runtime `watch.materials` map, not the GLB material table.
3. **Loader choreography races headless captures**: `state().uiFlags.loaderDone` flips BEFORE the ring
   choreography finishes — gate screenshots on `!document.getElementById("loader")`, then settle ≥2s.
   And `gotoSection` in live mode rides Lenis duration 4 — wait ~7s before the frame.
4. Dev-server port collisions between parallel lanes (5199 was another lane's vite; killing/racing it
   yields unstyled-DOM screenshots) — this lane runs its own on 5177 (`--port 5177 --strictPort`).
5. Emissive-plane HDRI bakes are ~free (10s at 2k/128spp) — iterate the rig, don't precious it.
6. **Back-crystal camera must sit INSIDE the band loop** (AR pose: the case back faces into the loop —
   any camera outside it shoots strap). 35mm at ~28mm standoff clears the strap and macro-crops the
   engraved ring (DIVE-40M … SAPPHIRE CRYSTAL fully legible in render-06). Same constraint will hit the
   P2 Disassembly/Details camera beats.

## Schema gaps → blockers/handoffs (no src edited, per lane rules)

1. **`MaterialOverride.ior` missing** — crystal wants the 1.77 sapphire read as config; today it inherits
   the in-code 1.76 from plumbing §6.1. One-line additive schema change (`if (o.ior) material.ior = o.ior`
   under the physical branch).
2. **Contact shadow unreachable from look config** — "deeper contact shadow" is spec'd for this look, but
   radius/opacity/ink live in `createContactShadow()` defaults. Wanted: `contactShadow {opacity, radius}`
   top-level key (plumbing already flagged the ink-color variant of this).
3. **`envIntensity` has no per-section runtime hook on the debug API** (`gl.setEnvRotation` exists,
   `stage.setEnvIntensity` is stage-only) — keyframe wiring in P2 will want `gl.setEnvIntensity` exposed
   for eval scripting symmetry.
4. **Anisotropy tangent quality**: if a future re-encode adds real tangents to the hero GLB
   (`gltfpack` keeps them; the exporter must write them), re-test case anisotropy — the marble may
   disappear and the config can then claim the full brushed read in-engine.
