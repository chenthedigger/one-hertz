# P1.5 lane notes — LOOK A "GALLERY PORCELAIN" (`?look=porcelain`)

Status: **DONE — all six deliverables shipped, live proof zero console errors** · 2026-08-20
Role in the shootout: the safe-beautiful anchor — source-faithful museum grade, closest to thewatch.60fps.fr's grading (porcelain stage, long soft horizontal speculars, near-zero grain). The other two looks must beat this.

## Deliverables (all verified, not claimed)

| # | Deliverable | Where | Evidence |
|---|---|---|---|
| 1 | Authored lightformer env → 2k equirect HDR | `public/assets/looks/porcelain.hdr` (1.1MB) | baked by `research/lookdev/porcelain/scripts/bake_env.py`; equirect preview `env-preview.png` |
| 2 | Material grade (Blender) + per-mat three.js overrides | grade in `scripts/render_look.py`; overrides in the look config | 8 Cycles renders below |
| 3 | Look config per plumbing §2 schema | `public/assets/looks/porcelain.json` | fetch + hot-apply verified live |
| 4 | 8 canonical renders, Cycles 128spp 1280px Metal GPU | `research/lookdev/porcelain/0*.png` | reviewed frame by frame (retakes noted below) |
| 5 | Live proof, headless real Chrome 1600×900 | `live-{hero,midscroll,longpress-zoomed}.png` | `scripts/live-proof.mjs`: state `{look:"porcelain", parts:175, screenAdopted:true}`, longpress `{active:true, intensity:1}`, **CONSOLE_ERRORS 0** |
| 6 | Per-section lighting keyframes | `sectionKeyframes` key in the look config | 15 sections, env rotation + key intensity |

## 1 · The authored environment (NOT a stock HDRI)

Built from scratch as emissive lightformers in Blender, baked via Cycles panorama camera (equirect 2048×1024, scene-linear Radiance out). Five formers over a porcelain gradient world (floor 0.40 → horizon 0.56 → zenith 0.80 linear):

- **KEY** — 14m × 1.5m strip at 30° elevation, strength 15, warm-neutral: THE long soft horizontal specular along the case chamfers (titanium-jewelry read; source's steel-bracelet grammar).
- **WRAP** — 11m opposing horizon strip, strength 4.5, cool: far-chamfer second line, no dead side.
- **DOME** — 9×7m overhead card, strength 2.6: museum ambience + sapphire top sheen.
- **KICKER** — 0.9×5m vertical strip on the crown side, strength 9: per-tooth knurl catches (horizontal strips alone leave knurl dead).
- **FLOOR BOUNCE** — faint wide strip at −24°: porcelain stage bouncing into lugs/band underside.

**Technique that mattered:** emitters are Emission mixed to **Transparent BSDF** by a spherical object-space gradient — strips feather into the world instead of punching hard-edged silhouettes. First bake (pure emission + gradient strength) left black rims around every strip that would have read as dark smears in every reflection. Re-authoring an env? Keep the transparent-mix pattern.

## 2 · Material grade (defect list DEVICE-DECISION §6.4 → closed for this look)

Offline (Cycles, `render_look.py`) and live (JSON overrides) use the same values; where the two renderers diverge the JSON is the shipping truth:

- **Titanium natural**: warm Ti base `#cfccc6`-class, metallic 1.0, roughness 0.30–0.42 by role (knurl tightest, brushed loosest), **anisotropy 0.45–0.6** (physical upgrade via `ensurePhysical`). Black **DLC variant** = color `#2e2e31`-class + roughness clamp 0.28–0.36 — recorded as `finishVariants["black-dlc"]` in the config (P3 CONFIG_CHANGE payload shape; ignored by the v1 loader).
- **Sapphire crystal**: offline = real transmission IOR **1.77**, roughness 0.02. Live schema has **no `ior` field** (see schema gaps) — web keeps the code-level alpha route (watch.ts ships ior 1.76) and the override adds roughness 0.03 + clearcoat 1.0 + opacity 0.2 + envMapIntensity 1.2 for the fresnel read.
- **Back-crystal cluster**: mis-slotted normal/AO stripped; spun metal re-authored aniso 0.9, ceramic near-black w/ clearcoat, lens as transmissive sapphire (offline) / opacity 0.35 (live). Render 06: engraved DIVE-40M / WR-100M ring fully legible, zero marble.
- **Ocean band**: deep marine `#1f6153` (keeps the plumbing-lane DEFAULT_LOOK correction), dielectric, roughness 0.6, sheen 0.15 offline, envMapIntensity 0.5 live (pitfall: fluoroelastomer lifts hard under a bright env — judged on rendered frames).
- **Screen**: offline = baked Wayfinder rewired to emission 3.2 (nocturne 7.0); live = the dial subsystem (untouched).
- **`mat_case_ao` (NEW defect found this lane)**: the USDZ's baked-AO overlay shells catch env speculars under a brighter-than-default env and read as **camo mottling on the case**. Fixed via override `{roughness:1, metalness:0, envMapIntensity:0}`. A/B: `scratchpad sweep-rot-120.png` (mottled) vs live-hero.png (clean). **Dusk/instrument lanes: you need this override too if your env is bright anywhere.**

## 3 · Light rig + keyframes

- `envRotationDeg: -120` chosen by a **9-point live rotation sweep** (`live-proof.mjs sweep` mode): keeps the dial legible under a soft diagonal sheen while both chamfers hold specular lines. (−40 was the drama alternative: stronger flank fire, but the key washes the lower dial through the crystal.)
- `sectionKeyframes` (config, top-level): base −120 at Intro, sweeping ~−13°/section to −320 at Footer so the key strip walks around the case as the story advances; `keyIntensity` dips 1.0→0.12 for Nocturne and recovers to 1.05 for Colors. Drive `stage.setEnvRotation` off the clock scalar; intensity needs the `setEnvIntensity` hook (stage has it — `applyLook` uses it; a per-frame section driver is P2 wiring).
- Post: bloom 1.0/0.55/0.3 (slightly under default strength — porcelain wants a lit AOD, not a lamp), **grain 0.018 (near-zero, per look brief)**, Nocturne vignette 0.26.

## 4 · Render evidence (`research/lookdev/porcelain/`)

01 hero 3/4 natural · 02 crown-knurl macro (sensor 16/lens 40, f/3.2) · 03 dial face-on (along measured dial normal — 35° elevation, matches plumbing §4) · 04 side profile 14.4mm read · 05 Ocean band macro · 06 back crystal · 07 black-DLC hero · 08 nocturne test (env 0.045, dial carries the room).

Retakes (lessons for the other look lanes):
- **05 took 3 takes**: a curved strap's bbox center sits *inside the loop* — focusing there gives 100% bokeh; framing the loop center puts the case in front. Fix: pick the strap vertex nearest a camera-side probe, aim + focus there.
- **06 took 2**: the back normal points 35° *below* horizon (AR pose), so a back shot at 0.26m puts the camera underground — hide the floor for back shots.
- All PROGRESS.md scale gotchas confirmed live: clip_start 0.001 everywhere, macro = sensor 16 + lens 40.

## 5 · Live proof

`scripts/live-proof.mjs` (playwright-core `channel:"chrome"`, headless, 1600×900) against vite dev on :5199 → `live-hero.png` (Intro, porcelain stage + clean case), `live-midscroll.png` (`gotoSection("Mechanism", 0.5)` — back engraving legible in motion), `live-longpress-zoomed.png` (real 3.2s pointer hold: ramp hit intensity 1.0, dolly-in + HOLD ring visible). **Zero console errors, zero page errors.**

## Schema gaps / blockers (noted, no src edits per lane rules)

1. **`MaterialOverride` has no `ior`** — the "sapphire IOR 1.77" read can only be *approximated* live (clearcoat+opacity). If P1.5 council wants true fresnel dispersion on the crystal, `ior` (and maybe `specularIntensity`) need adding to `gl/look.ts` + schema.
2. **No `envIntensity` per-section driver yet** — `sectionKeyframes` is authored data waiting for a P2 consumer; the loader ignores unknown top-level keys by design, so it ships inert.
3. **`npm run build` currently fails on `src/dial/renderer.ts` tsc errors** (dial-art lane mid-flight: unused `paintGlass`/`glassCtx`/`glassMode`, `HAND.tail` missing). Not mine to fix; live proof used the vite dev server (no typecheck). Re-verify `?look=porcelain` against a real build once the dial lane lands.
4. Alpine/Trail band colorways still pending the $30 dika3d purchase — this look grades Ocean only (as scoped).
5. A vite dev server was left running on :5199 (other look lanes were observed using it mid-session — not killed on purpose).

## Files owned by this lane

`public/assets/looks/porcelain.{hdr,json}` · `research/lookdev/porcelain/**` (8 renders, 3 live frames, env preview, `scripts/{bake_env.py,render_look.py,live-proof.mjs}`) · this note.
