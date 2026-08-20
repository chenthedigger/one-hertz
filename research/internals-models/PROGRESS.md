# A2 internals — modeling progress

> Workstream A2 (PLAN §3), modeling order per INTERNALS-REF §8 (risk order).
> Status 2026-08-21: **battery DONE + TUNED, Taptic DONE + TUNED (LOOKBIBLE §9 tune list applied,
> re-shot under the instrument rig), S-SiP DONE.** 3/7 parts.

## Shipped so far

| Part | Blend | GLB (raw → packed) | Renders |
|---|---|---|---|
| `part_battery` (Ultra 3, 599 mAh pouch-in-carrier) | `battery.blend` | 7.38 MB → **1.31 MB** (`glb/part_battery{,.packed}.glb`) | `renders/battery_{a_hero,b_top,c_macro}.png` |
| `part_taptic` (+ child **`taptic_mass`**, the P3 tick-back animatable) | `taptic.blend` | 1.32 MB → **0.37 MB** (`glb/part_taptic{,.packed}.glb`) | `renders/taptic_{a_hero,b_top,c_macro}.png` |
| `part_sip` (S10-class SiP, InFO-PoP, emissive die floorplan on TEXCOORD_1) | `sip.blend` | 1.49 MB → **0.58 MB** (`glb/part_sip{,.packed}.glb`) | `renders/sip_{a_hero,b_top,c_macro}.png` |

All renders Cycles/Metal GPU, 64 samples + OIDN, 800×800, AgX Medium High Contrast, **lit by the
shipped `public/assets/looks/instrument.hdr`** (LOOKBIBLE §9 tune 4 — parts inherit the shootout's
specular grammar; the white-void studio is retired for QA shots).
Everything is script-built and reproducible: `Blender -b --factory-startup -P scripts/build_<part>.py`.
`scripts/internals_lib.py` = shared kit: materials (INTERNALS-REF §8 palette), instrument-env world,
camera/bake/export helpers.

**Pipeline smoke (battery, P1): PASS** — model → procedural-bump bake → tangent normal map → GLB →
native `~/.local/bin/gltfpack -tc -kn` → KHR_texture_basisu + meshopt quantization, node names intact.
Verified again 2026-08-21 on all three packed files by parsing the JSON chunk:
- `part_battery.packed.glb`: one node `part_battery`.
- `part_taptic.packed.glb`: `part_taptic` → child `taptic_mass` (survives `-kn`, anon mesh holders as documented).
- `part_sip.packed.glb`: node `part_sip`, **TEXCOORD_0 + TEXCOORD_1**, `emissiveTexture {texCoord: 1}`
  on `resin_sip`, emissiveFactor 0.35 (faint ember; web runtime cranks intensity for Nocturne).

## LOOKBIBLE §9 tune pass (2026-08-21) — what changed and why

Council verdict was TUNE, not pivot; all four items applied:

1. **Taptic shell** → `steel_bead_mat` in the lib: bead-blasted steel `#AAB0B4`, metalness 1.0,
   roughness 0.37–0.47 micro variation (two-noise MapRange stack), mild aniso 0.3, granular
   micro-normal, **parting/weld band as a material Z-band** (follows bevels and the 45° cut — no
   fragile seam geometry), dark laser-annealed etch `#1E2023` (contrast raised).
2. **FPC ribbons (both models)** → `kapton_film_mat`: transmission 0 (the P1 "bubbly" debt is paid —
   fresnel-driven facing/grazing amber fakes the film depth), thickness 0.12 → 0.06 mm, flattened
   S-profiles, fine trace-line stripes (0.3 mm pitch, ±3% + micro bump).
3. **Battery pouch** → matte wrinkled foil: metallic 0.55 / rough 0.5–0.72 riding the wrinkles /
   sheen 0.06, wrinkle bump raised to 0.5. Carrier got a dedicated linear-brushed steel with
   **anisotropy 0** — the spun-metal radial highlight on `battery_b_top` was Principled aniso
   WITHOUT an authored tangent (UV-radial default on flat plates). `steel_satin_mat` now defaults
   aniso 0 for exactly this reason (same law class as LOOKBIBLE §1.3 material law 1).
4. **Re-shoot under the instrument rig**: `instrument_world()` in the lib — HDR drives lighting and
   reflections; **camera rays see the authored near-black gradient** (bake_env.py's exact stage) via
   a Light Path mix, because the baked HDR contains the emitter cards and any downward camera
   otherwise frames the 3×2 m bounce_floor card as a cream wall. DOF reined in: hero f/32,
   macros f/16 (small-sensor macro optics unchanged).

## Technique notes (what worked, what bit us)

1. **Real meters, not mm-units.** Modeling at true scale makes light watts physical and GLB export
   scale-free. Two traps, both fixed in `internals_lib.py`:
   - **Camera `clip_start` default is 0.1 m** — a 30 mm part sits inside the near plane. Set 0.001.
   - **Blender thin-lens DOF degenerates when focus distance < focal length.** Macro shots drop
     `sensor_width` to 16 and lens to 40 — real macro optics, valid DOF.
2. **Bake shading normals, keep geometry welds.** Cycles NORMAL bake captures procedural bump into
   a tangent map that ships in the GLB. Sub-mm details that must survive silhouettes are geometry.
3. **Winding ribs as object-space sine, not UV wave.** Survives booleans, bakes clean, reads as
   individual copper turns at macro.
4. **45° section cut sells the cutaway** — cut faces on solid tungsten read as density. Keep the
   cutter until every affected object is cut (`keep_cutter=True`).
5. **Never trust Principled anisotropy without an authored tangent** — flat plates get UV-radial
   tangents and render a spun-metal disc highlight (bit `battery_b_top`). Aniso now opt-in per mat.
6. **Text as geometry**: spec blocks / etch strings are converted Text objects (system font at
   render time, no font files in repo — same rule as the dial).
7. **Baked env HDRs contain their emitter cards.** Any camera that frames below-horizon sees the
   bounce-floor card as a wall. Fix: Light Path `Is Camera Ray` picks the authored background
   gradient; lighting/reflection rays keep the HDR. Specular grammar unchanged, stage stays ink.
8. **Dielectric grades lift milky-white at grazing** under the big streak formers (frosted-acrylic
   read on the pouch). Aluminized laminate wants partial METAL fresnel (0.55) so grazing stays
   dark; matte roughness carries the foil read.
9. **Second UV through join**: only the emissive-carrying objects get the `"floorplan"` layer;
   after `join()` the other meshes' loops land at UV (0,0) — author the texture with a black
   corner and they contribute zero emission. Exporter maps the layer to TEXCOORD_1 by order.

## Remaining parts queue (REF §8 risk order, difficulty per REF)

1. ~~battery (1/5)~~ ✓ tuned  2. ~~S-SiP (2/5)~~ ✓ (emissive floorplan mask authored, TEXCOORD_1)
3. **Display laminate (2/5) — NEXT** — 3 wafers; MUST derive outline from the A1 hero case
   top-profile curve (shared curve object — coordinate with the Spike A winner before building).
4. **Speaker (3/5)** — racetrack cassette + O-ring; grille as normal/alpha decal, holes never silhouette.
5. ~~Taptic (3/5–4/5)~~ ✓ tuned (opened variant shipped)
6. **Crown (3/5)** — coaxial lathe stack; knurl via radial array; explodes on its own axis.
7. **Sensor array (4/5, flagship)** — radial mandala, budget the most look-dev; emissive LED wells
   (green #30D158 / red #FF453A) must be authored for Nocturne 1 Hz pulsing; peel one foam tile
   to reveal a coil arc (second copper beat).
8. Shared hardware kit as we go: Y000/P5 screws, flex presets (straight/S-fold done, spiral
   pending), connector blocks (done ×6), gold pad ring recipe (sip).

## Open items / debts

- Battery baked normal is 2048² (PNG dominates the 7.4 MB raw GLB). 1024 would halve it with no
  visible loss at our camera distances — decide when assembling the combined internals GLB.
- gltfpack packed variants add anonymous holder nodes around named ones (normal `-kn` behavior);
  raycast code must match by name, not index — already the plan (REF §8 naming contract).
- `taptic_mass` clearances for the ±0.4 mm @ 8 Hz tick-back: animate along X only (1.2 mm
  clearance; Y has 0.1 mm). Springs are NOT rigged to compress.
- ~~Kapton flex ribbons render bubbly under transmission~~ FIXED (tune 2: transmission 0 + fresnel).
- Battery/taptic macro shots still show physically-correct grazing lift on rough metals under the
  6 m streak former — same behavior the shipped titanium exhibits; not a defect, noted for the
  council so nobody re-litigates it.
- SiP die-mound top could carry a micro "wire-bond shadow" normal pass if the Disassembly camera
  ever macro-crops it — skipped as invisible at current QA distances (REF: don't model de-lidded).
