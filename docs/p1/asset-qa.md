# P1 lane notes — asset QA + device decision

Status: **DONE** · 2026-08-20 · Decision doc: `research/asset-qa/DEVICE-DECISION.md`
Scope: both Apple USDZs imported headless, inventoried, renamed to the GLB naming contract, draft GLBs
exported + gltfpack-compressed, turntable QA renders for both devices (Ultra in both Ti finishes), device
decision written with embedded rendered evidence.

## What was produced (all under `research/asset-qa/`)

| Artifact | Notes |
|---|---|
| `{ultra-3,series-11}/inventory.json` | per-mesh name/verts/faces/world-bbox/materials/parent-chain + material node dumps + image catalog |
| `{ultra-3,series-11}/textures/` | all textures extracted (18 + 8); Ultra Wayfinder dial = **1024px** (SPIKE-A's "2048" corrected), Series Flow dial = the real 2048px |
| `{ultra-3,series-11}/id/` | flat group-colored ID renders + `id-legend.json` — how the obfuscated prim names were mapped (geometry+position hypotheses verified visually) |
| `scripts/inventory.py` | headless import + inventory + texture extraction |
| `scripts/id_render.py` | Workbench flat ID renders, golden-ratio hue per Xform group |
| `scripts/rename-map-{device}.json` | obfuscated → contract names (objects/groups/materials) — deterministic, reusable |
| `scripts/rename_export_turntable.py` | rename → pack → GLB export → Cycles turntable (`--finish natural|black` swaps Ti materials, unlinking texture-driven Base Color) |
| `ultra-3-draft.glb` 8.51MB → `ultra-3-draft.ktx2.glb` **1.24MB** | `~/.local/bin/gltfpack -tc -kn -cc`; all `part_*`/`mat_*` names verified surviving in the GLB JSON chunk |
| `series-11-draft.glb` 9.43MB → `series-11-draft.ktx2.glb` **1.28MB** | same |
| `{ultra-3}/turntable-{natural×12,black×6}-*.png`, `{series-11}/turntable-natural×12-*.png` | Cycles CPU 32spp 640px, neutral 3-point studio + ground card |
| `DEVICE-DECISION.md` | rendered-evidence comparison, swap-state scoring, purchase rec, P1.5 handoff |

## Decision (short form)

**Ultra 3 hero confirmed.** 2 Ti finishes rendered (black DLC = material-only swap, gorgeous). USDZ ships
**ONE band — Ocean** (not "woven"/Alpine as SPIKE-A guessed): **dika3d $30 Sketchfab purchase stands** for
Alpine + Trail band geometry (exact listing + license in DEVICE-DECISION §5). Series 11 demoted to reference
donor (2048 dial, spun-back anisotropy map).

## Facts downstream lanes must inherit

1. **SkelRoot is a non-issue**: Blender 4.5 factory USD import flattens skinned bands to static bind-pose
   meshes (0 armatures, 0 vgroups survive). No bake/apply step exists in the pipeline; band-flex animation, if
   ever wanted, must be rebuilt by hand.
2. **AR pose**: the case sits tilted ~45° inside the band loop; world axes are NOT case axes. Any "front"
   camera math must use the case group's local frame (or re-orient during P1.5 surgery). Scale is true
   (head width 44.2mm vs 44.0 spec).
3. **Naming contract implemented** on both drafts: `part_case/crystal/screen/crown/sideButton/actionButton/
   backCrystal/bezel` + `part_band_*` segments, `grp_*` groups, `mat_*` materials; 114/114 meshes mapped,
   0 unmapped. gltfpack `-kn` keeps them; remember the unnamed dequantization parent node (TOOLCHAIN gotcha) —
   raycast by name only.
4. **Material defects are catalogued, not fixed** (DEVICE-DECISION §6.4): crystal opacity, back-crystal marbled
   normal/colorspace artifact (both devices), washed Ocean-band color, baked dial. All get re-authored in P1.5 —
   these drafts are geometry + naming trucks, not look-dev inputs.
5. **gltfpack for these UVs needs `-vtf`** (59–86% texcoord quantization error warning) and hero encodes should
   `-tu` the normal/roughness slots; today's 1.24MB is ETC1S-everything, i.e. a floor, not the shipping encode.
6. Dial references: Ultra Wayfinder **1024px** (`ultra-3/textures/rIbiCAQPvhuVClj.jpg`), Series Flow **2048px**
   (`series-11/textures/CdGUMOYYnHJfiuT.png`) — dial subsystem should spec against the Wayfinder layout, using
   the 2048 Series file only as resolution/AA reference.

## Rabbit-hole check

Group-ID renders cost ~3 min and killed two wrong hypotheses (band family misread as Alpine G-hook; black
finish silently not applying because Base Color was texture-linked). Both would have shipped as wrong names /
false evidence without the render check — keep "render before you claim" as the lane rule.
