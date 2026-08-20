# P2 lane notes — section-Disassembly (horology-to-silicon exploded view)

Status: **DONE, all gates green** · 2026-08-21 · lane: section-Disassembly
Law followed: `docs/LOOKBIBLE.md` (§1.5 keyframe = data, §1.6 camera, §7 scrims, §8 copy budgets) · `docs/p15/motion-bible.md` (grid fractions, ease census, dual domains) · contracts `docs/p1/engine.md` + `docs/p15/plumbing.md` unchanged.

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean · **engine-smoke ALL PASS (30 checks) · dial-smoke ALL PASS · cursor-smoke ALL PASS** (headless real Chrome, playwright-core `channel:"chrome"`, 1600×900, vite preview :4573/:4574) · zero console errors on `?solo=Disassembly&eval=1` and full-page `?eval=1` captures · `state().disassembly = {internals:3, internalsReady:true, explode}` live.

**Evidence (design gate)** → `docs/p2/Disassembly/`: `solo-25.png` (struck 4 Hz ghost + assembled hero + copy A) · `solo-50.png` (full explode line: live dial · S10 SiP amber floorplan · battery · taptic · opened case · sensor puck, 6 hairline labels with struck horology terms, grey-line reveals mid-catchup) · `solo-75.png` (labels out, copy B char-rise in, re-assembly imminent) · `context-50.png` (full page via `gotoSection`, instrument keyframe rot 70 live). Captured desktop 1600×900@2 with the scratchpad harness (waits `loaderDone` + `disassembly.internalsReady` before `gotoSection`).

## What shipped

| File | Role |
|---|---|
| `src/sections/disassembly.ts` | The section (DOM self-rendered into the existing `.pin`, dual timelines, explode engine, label projection) |
| `src/sections/disassemblyInternals.ts` | Internals roster loader (KTX2+meshopt, per-slot normalize/orient; **contract-named empty stubs on failure** — layout/labels keep slots) |
| `src/sections/stageRef.ts` | NEW seam: `provideStage(stage)` (main.ts, 1 line) / `getStage()` — sections that need scene/renderer/watch use THIS, not a factory-signature change. **Other section lanes: reuse it.** |
| `public/assets/watch/internals/part_{sip,battery,taptic}.glb` | Shipped copies of `research/internals-models/glb/*.packed.glb` (0.58 + 1.31 + 0.37 MB) — all three A2 parts live, none stubbed in practice |
| `src/webgl/cameraRig.ts` (additive) | `authorTimeline(build)` (section-authored beat timeline replaces the Spike-B constructor beats — engine.md anticipated this) · `OrbitProxy` exported + `targetX` (frame decentering) + `parallaxMultiplier` (macro parallax gate, law 7) |
| `src/core/debug.ts` (additive) | `DisassemblyStateSnapshot` + `state().disassembly` (eval captures gate on `internalsReady`) |
| `index.html`, `sections/index.ts` | **ZERO edits** (registration line existed from P1; DOM rebuilt from JS; styles injected as a section-scoped `<style>`) |

## Beat map (motion bible §8 row 4, nothing invented)

- **WebGL channel** (fraction domain, padded to 1): camera dolly 6→5.15 + `targetX→−0.62` decenter, dur .75 @0 (ONE big move) · pull-back handoff radius 5.9 @.75 dur .25 · parallax gated 0 @0/.1, restored @.9 (law 7) · explode fan 0→1 dur .75 @0 · lug-screws counter-rotate −2π + lift, cascade window .1–.35 · **re-assembly @.75 over .25** · authored attitude in .25 @0 / out .1 @.9 (stage-restore law class). Longpress zoom 1.6 (law 8) — unchanged from P1.
- **DOM channel** (raw-fraction domain, padded to 1): hint .03–.85 · ghost «4 Hz» departs power3.in @.1 · «1 Hz» arrives power3.out @.3 · copy A char-rise .055 stagger .0035 (catalog-title y-clip grammar; exit power2.in @.28) · grey-lines .32–.62 · labels .36–.74 (linear opacity, source label grammar) · copy B in @.70 · everything off by .93.
- **scrub:2 grammar**: grey-line color reveals `#BCBCBC→#323232` (LOOKBIBLE §7.3 light-ground pair) on a SEPARATE lagged timeline — live catch-up `k=1.8` (τ≈0.55 s ≈ the source's 2 s visual catch-up), **eval mode snaps** (pure function of scroll ⇒ no Snappable needed; per §6-table declaration duty).
- Lighting: instrument.json Disassembly key {rot 70°, envInt 1.1, exposure 1.10} via the infra-gl driver — this lane wrote **zero** lighting code. Azimuth read at rot 70 verified on the rendered evidence frames: floating live dial fully legible, no crystal glare (crystal separates from the screen during the beat; assembled read at .25 also clean).

## The attitude trick (why captures are pose-exact)

The stage's product group idle-spins (clock-derived in eval). The section counter-rotates `watch.root` per frame: `root.q = slerp(identity, productQ⁻¹ · authored(yaw,pitch) · caseSpace.q⁻¹, attitudeWeight)` with weight 0 at both webgl ends — neighbours and out-of-window frames see the watch untouched. Product quaternion is read one frame stale: exact at scroll-rest (all captures), <0.15°/frame while scrolling live. Authored yaw drifts −0.55→−0.95 rad across the beat (the object turns — source orbit vocabulary; camera keeps ONE dolly).

Explode directions are captured once at init in **parent-local space** (world-dir pushed through each parent's inverse matrixWorld at a consistent snapshot, so the product rotation cancels and gltfpack's ×0.01 group scales are absorbed). Screws twist about the case dial-normal expressed in node-local frame.

## Copy grammar (working copy, §8 budgets — P4 polishes)

Struck horology → silicon truth, 6 labels ≤22 chars: `hesalite dome→sapphire crystal` · `guilloché dial→LTPO3 OLED · 1 Hz` · `mainplate→S10 SiP` · `mainspring barrel→35.3 mAh cell` · `hammer & gongs→Taptic Engine` · `tourbillon→optical heart sensor`. Ghost layer carries the thesis (struck «4 Hz» exits, «1 Hz» arrives). Headlines: "Every mechanism has a pulse." / "This one beats at 1 Hz.". Labels are DOM: hairline + vertical-rl caption **projected from the live part positions every frame** (hairlines track their parts through the fan).

## State contract

`requiredEnterState {explode:"assembled"}` · `guaranteedExitState {explode:"assembled"}` — truthful: scrub explode is transient, fully re-assembled by webgl 1; the section writes no StateStore axis (P3 raycast drag/tap explode owns that). Camera/colorway/dialMode/postStack untouched.

## Pitfalls found this lane (downstream must inherit)

1. **`rig.setProgress` has ONE base owner.** Disassembly is the base holder (writes every frame, clamped outside its window — that hold IS what parks the camera for the whole neighbourhood). Nocturne's interior-only write (`if 0<p<1`) composes; Mechanism's `setPoseOverride` composes. A second unconditional writer would fight — use `setPoseOverride` or interior-gated writes.
2. **Solo mode clamps BOTH webgl offsets away** (single section = first AND last ⇒ webglStart/End viewport-clamped): in `?solo=` the −.25/+.25 reach-in does not exist, webgl≈dom. Verify offset-dependent feel on the full page, not solo.
3. **Split-char x-slides look broken in stills** (clip reveals right glyph halves ⇒ mirrored shapes mid-scrub). Char rises (`yPercent 110→0` in an overflow-clip span, source catalog-title grammar) read clean at every scrub position. Recommend for all P2 headline reveals.
4. Blender-authored plates arrive glTF **+Y face-up**; wrapper pre-rotation π/2 about X + `caseSpace.quaternion` puts the face on the dial normal. Emissive faces (SiP floorplan) may land on either side — verify on a rendered frame, flip pre-rotation sign if hidden.
5. The GLB's opened case reads as a glossy black cavity (`mat_cavity_black` interior) once `part_screen`/`part_crystal` leave — correct storytelling for free, do not "fix" it with a fake interior.
6. Internals are **not** loader tasks (first paint never waits) ⇒ eval captures MUST gate on `state().disassembly.internalsReady`, not `loaderDone` alone.

## Open handoffs

- P3 explode interaction: drag (`dragPosition.intensity` grammar), tap-to-zoom (2 s open / 1.6 s close), per-part 90–140-char descriptions (§8), XPLOD_ALL — the part roster, label DOM and `resolvePartName` raycast surface are ready; `data-cursor-text="holdToExplore"` already live on the pin.
- Display-laminate / speaker / crown internals (A2 queue 4–7) join `INTERNAL_SLOTS` as they land — a slot with `url:null` stubs cleanly today.
- P4 copy pass inside the §8 budgets; the Fraunces accent moment is NOT spent here.
- Full 9-point sweep at rot 70 with the infra-gl harness if the council asks — evidence frames already show a clean read at the shipped azimuth.
