# P1 lane notes — internals modeling start (A2)

Lane: internals modeling, first two parts (battery pipeline-smoke, Taptic Engine) · 2026-08-20
Contract: PLAN §3 A2 workstream, INTERNALS-REF.md §3/§5/§8. Full detail in
`research/internals-models/PROGRESS.md` — this file is the lane summary for P1 integration.

## Delivered

- `research/internals-models/scripts/{internals_lib,build_battery,build_taptic}.py` — fully
  scripted, headless-reproducible (`~/Applications/.../Blender -b -P <script>`; Blender 4.5.12,
  Cycles Metal GPU, ~3 s per 800px/64-sample frame).
- `research/internals-models/{battery,taptic}.blend`
- `research/internals-models/glb/part_battery{,.packed}.glb` (6.35 → 1.17 MB) and
  `part_taptic{,.packed}.glb` (1.32 → 0.37 MB) — native gltfpack `-tc -kn`, KTX2/BasisU confirmed
  in the packed JSON, node contract intact: `part_battery`; `part_taptic` → child `taptic_mass`.
- 6 QA renders in `research/internals-models/renders/` (hero / top / MACRO per part).
- Reference photos mirrored to scratchpad `internals-ref/` (not committed, per REF caching rule).

## What P1/P1.5 needs from this lane

1. **GLB node contract holds after gltfpack**, with one caveat: packed files gain anonymous
   holder nodes — engine raycast/explode code must resolve parts **by node name**, never index.
2. **`taptic_mass` is a real child node** — P3 Taptic tick-back can animate it directly
   (X axis has 1.2 mm clearance; Y only 0.1 mm — animate along X only).
3. Materials export with `KHR_materials_{anisotropy,transmission,sheen,ior}` — the three.js
   material re-author (PLAN: all hero materials re-authored) should treat these as hints, not truth.
4. Camera/optics gotchas for anyone rendering these parts (blend files carry correct cameras):
   `clip_start` 0.001 and macro = small-sensor optics, both documented in PROGRESS §technique.

## Council asks (P1.5 gate)

Judge copper winding (taptic macro) as the internals hero material; graphite wrinkle scale;
kapton translucency; steel shell is the known weak point (tune vs. defer to look-bible rig);
cutaway language (45° section + cut tungsten faces). Queue after gate: SiP → display laminate
(needs A1 case profile curve!) → speaker → crown → sensor array (flagship, most look-dev).
