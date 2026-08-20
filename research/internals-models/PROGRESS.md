# A2 internals — modeling progress

> Workstream A2 (PLAN §3), modeling order per INTERNALS-REF §8 (risk order).
> Status 2026-08-20: **battery DONE (pipeline smoke passed), Taptic Engine DONE.** 2/7 parts.

## Shipped so far

| Part | Blend | GLB (raw → packed) | Renders |
|---|---|---|---|
| `part_battery` (Ultra 3, 599 mAh pouch-in-carrier) | `battery.blend` | 6.35 MB → **1.17 MB** (`glb/part_battery{,.packed}.glb`) | `renders/battery_{a_hero,b_top,c_macro}.png` |
| `part_taptic` (+ child **`taptic_mass`**, the P3 tick-back animatable) | `taptic.blend` | 1.32 MB → **0.37 MB** (`glb/part_taptic{,.packed}.glb`) | `renders/taptic_{a_hero,b_top,c_macro}.png` |

All renders Cycles/Metal GPU, 64 samples + OIDN, 800×800, AgX Medium High Contrast.
Everything is script-built and reproducible: `Blender -b -P scripts/build_battery.py` (same for taptic).
`scripts/internals_lib.py` = shared kit: materials (INTERNALS-REF §8 palette), lightformer studio,
camera/bake/export helpers.

**Pipeline smoke result (the actual point of doing battery first): PASS.**
model → procedural-bump bake → tangent normal map → GLB (Blender exporter) → native
`~/.local/bin/gltfpack -tc -kn` → KHR_texture_basisu + meshopt quantization, node names intact:
- `part_battery.glb`: one node `part_battery`, 10 material slots on one mesh.
- `part_taptic.glb`: `part_taptic` → child `taptic_mass` (survives `-kn`).
- Loadback in three (KTX2Loader + MeshoptDecoder) was verified for this exact gltfpack build in the
  P0 toolchain smoke (`research/smoke/torus.ktx2.glb`) — not re-run per part.

## Technique notes (what worked, what bit us)

1. **Real meters, not mm-units.** Modeling at true scale (battery = 0.030 m) makes light watts
   physical and GLB export scale-free. Two traps at this scale, both hit and fixed in
   `internals_lib.py`:
   - **Camera `clip_start` default is 0.1 m** — an entire 30 mm part sits inside the near plane
     and renders as pure world color. Set 0.001. (Cost one full debug loop; raycast-grid script
     proved the frustum was full while the render was empty.)
   - **Blender thin-lens DOF degenerates when focus distance < focal length.** Tight macro framing
     with a 36 mm sensor forces exactly that (frame 15 mm ⇒ f = 2.4×distance). Fix: macro shots
     drop `sensor_width` to 16 and lens to 40 — real macro optics, valid DOF, free creamy falloff.
2. **Bake shading normals, keep geometry welds.** Cycles NORMAL bake captures procedural bump
   (pouch micro-wrinkle, coil winding ribs) into a tangent map that ships in the GLB. Sub-mm
   details that must survive silhouettes (spot welds, screw ears) are geometry — 20-vert cylinders
   are cheaper than the texture resolution they'd need.
3. **Winding ribs as object-space sine, not UV wave.** Coil turns = `sin(coord·2π/pitch)` along the
   advance axis (pitch 0.14 mm) driving a bump node. Survives booleans (no UV dependency), bakes
   clean, and reads as individual copper turns at macro. The stadium-ring coil itself is just
   bevel-box minus bevel-box — no curve/bevel-profile fragility.
4. **45° section cut sells the cutaway** (REF §3 technique note confirmed): one wedge boolean
   through shell AND the tungsten mass blocks — cut faces on solid tungsten read as density.
   Keep the cutter until every affected object is cut (`keep_cutter=True`).
5. **Studio strips all face −Y** — any detail cluster on the +Y side (battery terrace, taptic
   window) sits in its own shadow. `macro_key()` (small aimed area light, 0.5–1 W) is now part of
   the kit; without it macro shots are dead grey.
6. **Text as geometry**: spec blocks / etch strings are converted Text objects (system font at
   render time, no font files in repo — same rule as the dial). Battery carries the real Ultra
   spec strings; taptic carries TAPTIC ENGINE · FG551251 · 9.8 g.
7. Exposure at this scale: key strip 9 W / rim 7 W / fill 2.5 W, world 0.35. First attempt (60 W)
   blew everything to white — AgX hides clipping until it's everywhere.

## What the P1.5 council should judge (this workstream's gate)

- **Copper**: taptic macro (`taptic_c_macro.png`) — do the winding turns + anisotropy hint hold up
  as "the hero material of the internals set" (REF §3)? This is the single most important verdict.
- **Graphite pouch**: hero + macro — wrinkle scale believable at 30 mm? Sheen-on-ridges reading?
- **Kapton**: amber translucency on the S-fall flex — currently transmission 0.12; judge whether it
  glows when backlit or reads as plastic tape.
- **Steel shell**: weakest material right now — satin + X-streak roughness still leans bright/soft
  under the porcelain key. Needs a verdict: tune here, or defer to the look-bible rig (these parts
  will be re-lit by the P1.5 winning environment anyway).
- **Cutaway language**: is the 45° window + cut tungsten the right level of "designed teardown",
  or should the cut faces get an explicit brighter "milled" material (currently inherit parent)?
- Judge from the QA renders AND a turntable under the candidate look rigs — the studio here is a
  stand-in, not the shipping environment.

## Remaining parts queue (REF §8 risk order, difficulty per REF)

1. ~~battery (1/5)~~ ✓  2. **S-SiP (2/5)** — closed resin plate + connector field + emissive die
   floorplan second-UV (author the emissive mask now, Nocturne needs it).
3. **Display laminate (2/5)** — 3 wafers; MUST derive outline from the A1 hero case top-profile
   curve (shared curve object — coordinate with the Spike A winner before building).
4. **Speaker (3/5)** — racetrack cassette + O-ring; grille as normal/alpha decal, holes never silhouette.
5. ~~Taptic (3/5–4/5)~~ ✓ (opened variant shipped)
6. **Crown (3/5)** — coaxial lathe stack; knurl via radial array; explodes on its own axis.
7. **Sensor array (4/5, flagship)** — radial mandala, budget the most look-dev; emissive LED wells
   (green #30D158 / red #FF453A) must be authored for Nocturne 1 Hz pulsing; peel one foam tile
   to reveal a coil arc (second copper beat).
8. Shared hardware kit as we go: Y000/P5 screws (battery ears already carry the hole geometry),
   flex presets (straight/S-fold done, spiral pending), connector blocks (done ×2).

## Open items / debts

- Battery baked normal is 2048² (PNG dominates the 6.3 MB raw GLB). 1024 would halve it with no
  visible loss at our camera distances — decide when assembling the combined internals GLB.
- gltfpack packed variants add anonymous holder nodes around named ones (normal `-kn` behavior);
  raycast code must match by name, not index — already the plan (REF §8 naming contract).
- `taptic_mass` clearances for the ±0.4 mm @ 8 Hz tick-back: rails have 0.1 mm to the coil in Y —
  animation is along X where clearance is 1.2 mm to the springs. Springs are NOT rigged to
  compress; if P3 wants visible spring squash it's a shader/lattice job, note for later.
- Kapton flex ribbons render slightly bubbly under transmission (visible in taptic top view) —
  candidate fix: drop transmission to 0, fake depth with a subtle fresnel-driven lightening.
