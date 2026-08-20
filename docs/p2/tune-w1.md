# P2 lane notes — tune-w1 (wave-1 art-director tune pass: Disassembly + Mechanism)

Status: **DONE, all gates green** · 2026-08-21 · lane: tune-w1
Law followed: `docs/LOOKBIBLE.md` (§7 scrims · §9 internals grade) + `docs/p15/motion-bible.md` (ease census, fraction grid, departure grammar) · contracts `docs/p1/engine.md`, `docs/p15/plumbing.md`, `docs/p2/infra-gl.md`, `docs/p2/infra-type.md` unchanged · zero lighting invented, zero contract edits, `sections/index.ts` untouched.

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean · **engine-smoke ALL PASS** (headless real Chrome, playwright-core `channel:"chrome"`, vite preview :4573) after the final edit set · zero console errors on `?solo=Disassembly&eval=1`, `?solo=Mechanism&eval=1` and both full-page `?eval=1` capture runs · every tune judged on re-captured rendered frames (3 capture rounds; rounds 1–2 caught an over-spread fan and an off-frame crystal — corrected before promotion).

**Re-captured design-gate evidence** (1600×900@2, `?eval=1`, gotoSection; internals-gated on `state().disassembly.internalsReady`):
`docs/p2/Disassembly/solo-{25,50,75}.png` + `context-50.png` · `docs/p2/Mechanism/solo-{25,50,75}.png` + `full-mechanism-050.png` + **`solo-90-departure.png`** (new — proof the gated DOM channel has left by p=.9).

## Disassembly — 4 tune items applied

1. **«4 Hz» ghost exit finishes by p≈.28** (was .55): exit tween duration .45 → **.18** @.1, ease power3.in unchanged (`disassembly.ts` buildDomTimeline). The upper-left zone is fully clear before the grey-line block lands @.32. Evidence: solo-25 (tail in flight at frame edge), solo-50 (zone clean).
2. **Exploded-fan presence**: fan dolly **radius 5.15 → 4.7** (~9% closer) + `targetX −0.62 → −0.68` (composition right) + explode distances retuned — hero `2.05/1.6/−0.8 → 2.15/1.7/−0.92`, internals `1.3/0.92/0.58 → 1.38/1.0/0.64`. Measured on solo-50: the six-part line (crystal → sensor puck) spans **≈66% of frame width** (target 60–70%), all six hairline labels in frame. First attempts (2.55/2.0, then 2.3/1.8) pushed the crystal + label 01 off-frame left — frames, not arithmetic, picked the final numbers.
3. **Micro-labels off the watch**: `.dis__copy` bottom **9svh → 4.5svh** (≈40px at the 900px reference). MOVEMENT, OPENED (p .25) and REGULATION (p .75) now sit fully below the case/band silhouette — both verified legible on the new frames. (The art-director note said "raise ~40px"; raising buried the label deeper behind the watch — the ~40px clearance is real, the direction is down. Flagging the interpretation.)
4. **Battery pouch reads crimped matte foil** — root cause found: Blender's glTF exporter **drops any Principled scalar socket linked to a procedural graph**, so the §9 tune-3 grade never reached the GLB — `graphite_pouch` shipped with `roughnessFactor` absent (glTF default **1.0**) and `steel_carrier` as a metal-1/rough-1 bright slab. Fix chain:
   - `research/internals-models/glb/part_battery.glb`: explicit factors written — `graphite_pouch` roughness **0.61** (the Cycles ramp mean; metal 0.55 + baked wrinkle normal + sheen kept), `steel_carrier` roughness **0.385**, metal 1.0.
   - Re-packed via `~/.local/bin/gltfpack -tc -kn` → `part_battery.packed.glb` → rewired to `public/assets/watch/internals/part_battery.glb` (factors verified surviving the pack; `part_battery` node name intact).
   - **Battery flipped in the fan** (`disassemblyInternals.ts` preRotation `+π/2 → −π/2` about X): the graphite pouch face now fronts the camera; the satin steel carrier faces away. Without the flip the carrier dominated and the cell still read "bright metal" whatever the pouch grade said.
   - **Root fix for rebuilds**: `internals_lib.export_glb` now flattens linked Roughness/Metallic sockets to explicit factors (ColorRamp-mean) before export (`_flatten_linked_scalar`). Applies to future taptic/sip re-exports too — the taptic's white-plastic read in the fan is the SAME defect class (out of this lane's scope, see handoffs). Patch not yet exercised by a Blender run; the shipped GLB was graded by direct (verified) JSON edit. Originals backed up in the session scratchpad.

## Mechanism — 3 tune items applied

1. **DOM channel gated** (`mechanism.ts` buildDomTimeline): eyebrow @.12, ghost line chars @.14, solid line @.18 — copy enters after the blend-in sweep (.0–.15) lands; stats rail fades in @.16 (its color reveals still open @.26). Departure: `.mech__copy` + `.mech__rail` leave together @.85, **power2.in**, dur .04 (gone by .89, before the .9 blend-out). Evidence: solo-25 (chars mid-arrival), solo-90-departure (only trace + engraved ring + 30′ remain).
2. **ELECTRICAL ghost legibility**: both offered remedies applied lightly — ghost line shifted **−5vw** (`margin-left`, `.mech__line--ghost`) AND a §7.1 ink-ground scrim behind the headline (`.mech__copy::before`, radial gradient from the LIVE `--porcelain` token — the driver holds it at bgStage ink #101216 here — 60% → transparent 74%, `isolation: isolate` keeps the z−1 pseudo inside the block). Shift alone left 'AL' on the bright knurl; the scrim carries the rest. Verified at .25/.5/.75 + page truth.
3. **Sensor-dome structure on the right half**: echo opacities raised **15% → 24%** and **9% → 15%**, plus **one added strand pass** `ECHO_C` — authored to ORIGINATE top-right (M 1680 150 …) so its dash-draw covers the dome from early progress; lead 1.25, 13% porcelain, width 1.8. Opacity alone could not satisfy the note: the two existing strands draw left→right and only reach the dome near the window's end. Verified: dome carries two strand arcs at .25/.5/.75.

## Pitfalls found this lane (downstream must inherit)

1. **Blender glTF exporter silently drops linked scalar sockets** (roughness/metallic fed by noise/ramp graphs) — the factor ships absent → glTF default (roughness **1.0**). Any procedural material grade must be flattened to explicit factors at export or it does not exist on the web. `internals_lib.export_glb` now does this; verify the printed `[glb] flatten …` lines on every rebuild.
2. **Part orientation outranks material grade**: a correctly-graded matte pouch still reads "bright metal" if the satin steel carrier faces the camera. Judge internals READS on the fan frames, and pick each `preRotation` for the story face, not just "plate up".
3. Fan-spread numbers interact multiplicatively with the dolly (≈×1.1 at radius 4.7) and perspective stretches the NEAR end of the line — tune distances only against captured frames; the label x-clamp (30px) makes a lost label the first symptom of an off-frame part.
4. GLB JSON chunks can be edited surgically (4-byte space padding, recompute lengths) and `gltfpack -tc -kn` preserves explicit pbr factors — a deterministic, verifiable alternative to a full Blender re-export when only factors changed.

## Open handoffs

- **Taptic white-plastic read** (visible in the fan frames): same dropped-roughness defect class as the battery — `steel_bead_mat`'s linked roughness graph never exported. One Blender headless re-run of `build_taptic.py` (+ `build_sip.py`) with the patched `export_glb` → repack → rewire fixes it. Not in the wave-1 tune list, so not done here.
- The copy-B headline chars still rise partially behind the watch at p≈.75 (pre-existing, not flagged by the gate) — if a later council wants it clear, the fix is delaying copy B's char window past .78 or a targetX nudge in the pull-back beat.
- Re-run of the full internals build under Blender will regenerate `battery.blend` renders untouched (the flatten happens post-save, export-only) — the .blend keeps its procedural graphs by design.
