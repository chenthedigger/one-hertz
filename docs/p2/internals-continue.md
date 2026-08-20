# P2 lane notes — internals-continue (A2 queue 4–7: the explode roster completed)

Lane: display laminate · Digital Crown assembly · speaker · sensor-array back dome · 2026-08-21
Law followed: LOOKBIBLE §1 (materials/optics), §9 precedents (instrument-rig QA, kapton/steel
grammar) · INTERNALS-REF §1/§2/§6/§7 · contracts: docs/p15/plumbing.md §4 (node-name raycast,
gltfpack `-kn`), docs/p1/engine.md. Full detail: `research/internals-models/PROGRESS.md`.
Gates verified empirically: `npm run build` (tsc strict + vite) clean · `node
evals/engine-smoke.mjs` against the :4573 preview **ALL PASS** · packed-GLB JSON chunks parsed
to prove every named node + hierarchy + emissive extension.

## Delivered — A2 is CONTENT-COMPLETE (7/7 parts)

1. **The display blocker is closed.** `scripts/extract_case_profile.py` derives the case
   top-profile curve from the A1 hero's plain-glTF ancestor (`research/asset-qa/ultra-3-draft.glb`
   — the shipped hero GLB needs EXT_meshopt/basisu and cannot enter Blender), PCA-framed off
   `part_crystal`, scale-anchored to the 49.0 mm lug-to-lug spec →
   `profiles/case_top_profile.json` (208-pt hull, real meters, +X = crown side; plus measured
   crown-element boxes). A1 was never touched.
2. **`part_display`** — 3 visibly distinct wafers off that hull (sapphire lid / OLED / stamped
   shield with kapton patches, two crown-edge flex tails, adhesive bead). Children
   `display_oled` + `display_shield` so P3 can fan the laminate — REF §1's "whole show".
3. **`part_crown_asm`** — coaxial stack sized from the hero's own measured crown (knurl ring
   Ø9.4, 72-tooth star-profile prism; orange anodized end-face ring exactly where the hero
   wears it; polished ECG dome vs brushed flanks). Children `crown_gasket` / `crown_stem` /
   `crown_encoder` (striped optical drum, stripes as geometry) / `crown_bracket` — the stack
   fans along its own +X axis, the exploded view's watchmaking beat.
4. **`part_speaker`** — racetrack cassette + elastomer O-ring riding the same outline offset
   (shared curve = free precision); grille = woven-steel normal BAKED to
   `textures/spk_mesh_nrm.png` (KHR_texture_basisu in the pack) — holes never silhouette;
   3 gold spring pads + kapton flex; "the speaker is also the pump" copy hook stands.
5. **`part_sensor_array`** (flagship, most look-dev) — outside: dark-ceramic disc, engraved
   tangential spec ring, sapphire dome, 4+4 lens bosses with the iFixit "bubbly" diffusion
   (baked normal), **emissive wells `led_green` #30D158 / `led_red` #FF453A**, depth-gauge
   port. Inside: blue-grey foam tile ring (baked normals), central shield can, copper jumper
   wires, gold pads, band-release cutouts, P5 seats — and the **peel beat**: child node
   `sensor_foam_peel`, hinge-origin at its outer arc, rest pose peeled −72° over a 5-turn
   charging-coil arc (the second copper beat).
6. **16 QA frames** under the shipped instrument rig (`renders/{display,crown,speaker,sensor}_
   {a,b,c,d}_*.png`, Cycles/Metal 64spp 800px AgX MHC, 3 angles + macro per part).
7. **GLBs**: raw + `gltfpack -tc -kn` packed in `research/internals-models/glb/`; packed
   copies shipped to **`public/assets/watch/internals/`** as `part_display.glb`,
   `part_crown_asm.glb`, `part_speaker.glb`, `part_sensor_array.glb` (same convention as the
   wave-1 three). No src/ change — wiring the roster into Disassembly's `INTERNAL_LAYOUT` and
   the P3 explode is the section lane's move.

## Contract facts downstream agents need

- **Node map (resolve by NAME, never index — packed files add anonymous holders):**
  `part_display` → `display_oled`, `display_shield` · `part_crown_asm` → `crown_gasket`,
  `crown_stem`, `crown_encoder`, `crown_bracket` · `part_speaker` (single) ·
  `part_sensor_array` → `sensor_foam_peel`. All verified in the packed JSON chunks.
- **Nocturne 1 Hz pulse**: crank `emissiveIntensity` on materials **`led_green` / `led_red`**
  (KHR_materials_emissive_strength ships; find by material name after `applyLook` — material
  identity law, LOOKBIBLE §1.3 law 5).
- **`sensor_foam_peel` animation**: local rotation 0 = tile flush/closed; shipped rest =
  peeled (−72° about its hinge tangent, TRS survives `-kn`). Closing tween = rotate toward
  identity; do NOT translate.
- **`crown_encoder`** may spin about its own X for a crown-turn beat (coaxial with the stack).
- **Sapphire in these GLBs is transmission-flagged** (Cycles route). Web re-author swaps to
  the alpha route + ior 1.77 per LOOKBIBLE §1.3 law 3 — transmission stays banned live.
- Suggested explode-line slots (top→bottom stacking, REF §0): display above the case, crown
  fans +X off the case flank, speaker joins the battery plane, sensor array below the SiP.

## Judgment calls (flag if a council disagrees)

- **Sensor rest pose ships peeled** — same authored-cutaway language as the Taptic's 45° open
  shell; the coil beat exists without waiting for a P3 animation.
- Sensor ceramic offline grade departs from the web config (rough .34/coat .35 vs .24/.7):
  the web values render liquid-chrome under the Cycles streak formers. Web configs unchanged.
- Ring engraving adds `ONE HERTZ` + `GPS · L1 + L5` to the REF strings — on-thesis, but P4
  owns final copy.
- Crown knurl is straight fluting (REF: "not diamond knurl"), 72 teeth; encoder stripes are
  geometry so they survive quantized export without a texture.
