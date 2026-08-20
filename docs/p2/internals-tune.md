# P2 lane notes — internals-tune (A2)

Lane: LOOKBIBLE §9 tune pass on taptic + battery, S-SiP modeled · 2026-08-21
Law followed: LOOKBIBLE §9 (verdict: TUNE, not pivot) · contracts: docs/p1/engine.md §6,
docs/p15/plumbing.md §2/§4 (node-name raycast, gltfpack `-kn`) · full detail:
`research/internals-models/PROGRESS.md`.

## Delivered

1. **§9 tune list 1–4 applied** to `research/internals-models/scripts/{internals_lib,build_taptic,build_battery}.py`:
   - Taptic shell: bright/plasticky → **bead-blasted steel** (`steel_bead_mat`: #AAB0B4, metal 1.0,
     rough 0.37–0.47 micro variation, aniso 0.3, granular micro-normal), parting/weld band as a
     material Z-band (follows the bevels + 45° cut), dark laser-annealed etch (contrast raised).
   - FPC ribbons (both parts): **kapton film** — transmission 0 (P1 "bubbly" debt paid), 0.06 mm
     thickness, flattened S-bends, fresnel facing/grazing amber + trace-line stripes.
   - Battery: pouch → **matte wrinkled foil** (metal-fresnel dark at grazing, matte rough riding the
     wrinkles, bump 0.5); the a_hero acrylic rim/skirt is gone; the b_top **spun-metal radial
     highlight is killed at the root** — it was Principled anisotropy without an authored tangent
     (UV-radial default on flat plates); `steel_satin_mat` now defaults aniso 0 (same law class as
     LOOKBIBLE §1.3 material law 1: no aniso without real tangents).
   - Re-shoot: all QA renders now lit by the shipped **`public/assets/looks/instrument.hdr`**
     (Cycles 64spp, 800px, AgX MHC, hero/top/MACRO per part). DOF reined in (hero f/32, macro f/16).
2. **QA set re-rendered** (6 frames) + **S-SiP QA set** (3 frames): `research/internals-models/renders/`.
3. **`part_sip` modeled + shipped** (`build_sip.py`, `sip.blend`): closed InFO-PoP resin plate
   (REF §4 honest 2/5 choice), connector field + stamped bracket, **gold ENIG pad ring**, screw
   bosses, silkscreen/etch strings ("Apple S10 · TMQW67 · N4P · InFO-PoP"), lamination edge line,
   and the **emissive die floorplan authored now** (numpy-composed 512² abstraction of the
   TechInsights S9 layout: 2 P-cores / 4-core NE / GPU / SLC banks / fabric) on a second UV.
   GLB: `glb/part_sip{,.packed}.glb` (1.49 MB → 0.58 MB via `gltfpack -tc -kn`).
4. `PROGRESS.md` queue updated: **3/7 parts** — next is Display laminate (BLOCKED on the A1 hero
   case top-profile curve — coordinate before building), then speaker → crown → sensor array.

## Contract facts downstream agents need

- **`part_sip` emissive contract**: `resin_sip` material, `emissiveTexture {texCoord: 1}`
  (TEXCOORD_0 + TEXCOORD_1 both survive gltfpack — verified by parsing the packed JSON chunk),
  emissiveFactor 0.35 = faint ember for beauty shots. **Nocturne wants the glow hot: raise
  `emissiveIntensity` on the re-authored three.js material, do not re-bake.** Texture corner (0,0)
  is black by design — joined sub-meshes without the floorplan UV emit nothing.
- Node contract intact after pack: `part_battery` · `part_taptic` → child `taptic_mass` ·
  `part_sip`. Anonymous holder nodes still appear (resolve by NAME, never index — plumbing §4).
- New lib helpers for the remaining parts: `steel_bead_mat` (parting-band option),
  `kapton_film_mat`, `instrument_world` (HDR lighting + authored near-black camera-ray stage — the
  baked HDR contains the emitter cards, so downward cameras need the Light Path split),
  `ink_floor` (unused in QA; available for grounded comps).

## Judgment calls (flag if the council disagrees)

- Floorplan glow color = copper-semantic amber (electricity moves there), not biosignal red — red
  stays reserved for 1 Hz elements per REF §9 palette discipline.
- Battery/taptic macros keep a physically-correct grazing lift on rough metals under the 6 m
  streak former (same behavior the shipped titanium shows) — documented in PROGRESS so it isn't
  re-litigated as a defect.
- SiP markings are text-as-geometry (PROGRESS technique note 6, same rule as the dial), not a
  silkscreen texture decal — consistent with the shipped battery/taptic pipeline.
