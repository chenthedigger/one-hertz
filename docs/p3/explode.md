# P3 lane notes — explode system (Disassembly full interactivity)

Status: **DONE, all gates green** · 2026-08-26 · lane: P3 explode
Law followed: `docs/LOOKBIBLE.md` (§7 scrims, §8 copy budgets, §10 cursor) + `docs/p15/motion-bible.md`
(§5 interaction pacing: click-zoom 2 s open / 1.6 s close, XPLOD_ALL 2 s / 1 s, idle `rotation.y += dt·0.15`,
lookAt chase k=3 from the §6 table) · contracts `docs/p1/engine.md`, `docs/p15/plumbing.md`,
`docs/p2/infra-gl.md`, `docs/p2/integrate.md` untouched · `sections/index.ts` untouched.
Spec source of truth: `evals/rubric.yaml` structural_checklist (explode ×8) + PLAN §1 mechanic 3.

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean ·
**engine-smoke ALL PASS · cursor-smoke ALL PASS · dial-smoke ALL PASS** (`BASE=http://localhost:4573`)
· **NEW `evals/explode-smoke.mjs` ALL PASS (39 checks: desktop-eval + live + mobile-touch pages)** ·
`node evals/assert.ts` (the real rubric harness): **all 8 explode items PASS**
(`evals/results/p3-explode-lane/assert.json`; remaining criticals are other-lane scope —
colorway/outro mechanics pending, `sections-14-order` is the pre-existing sourceRole SKIP) ·
evidence frames captured to `docs/p3/explode/` (fan, selected+overlay, XPLOD_ALL, Nocturne AOD, mobile tap).

## What shipped

| File | Role |
|---|---|
| `src/sections/disassemblyExplode.ts` (NEW) | The interaction system: proxy hitboxes, raycast select, focus camera, overlay DOM, drag-pan, XPLOD_ALL, taptic tick-back, Nocturne LED, `state().explode` |
| `src/sections/disassembly.ts` | Integration: full 7-part `INTERNAL_LAYOUT` (+`lateral` case-frame offsets), foam-peel scrub beat, interaction composition in `applyExplode`, gate/reset lifecycle |
| `src/sections/disassemblyInternals.ts` | Roster completed: `part_display` / `part_speaker` / `part_sensor_array` / `part_crown_asm` slots (worldSize + preRotation per part) |
| `src/core/debug.ts` | ADDITIVE: `ExplodeStateSnapshot`/`ExplodePartSnapshot` + `explode` extension key; `CameraAuxSnapshot.lookAt` |
| `src/webgl/cameraRig.ts` | ADDITIVE: `aux().lookAt` (live look-at target — rubric lookAt-lerp evidence) |
| `src/main.ts` | 2 wires: Nocturne LED gate on the existing lifecycle listener; `provideLenis(engine.lenis)` (drag arbitration) |
| `evals/explode-smoke.mjs` (NEW) | Lane smoke — every sub-mechanic asserted on 3 page profiles; writes `docs/p3/explode/*.png` |
| `evals/assert.ts` / `evals/capture.ts` | Harness fixes (below) — check SEMANTICS unchanged, rubric intent preserved |

## The 8 rubric sub-mechanics — how each is implemented

1. **Proxy hitboxes** — one invisible `BoxGeometry` Mesh per roster part, sized from the part's
   node-LOCAL bbox ×1.18 with a world-scale-aware floor (0.16 wu) so wafer-thin parts stay generous;
   parented to the part node so it rides every explode/attitude/drag transform for free. The
   raycaster sees ONLY proxies (10 boxes — three-mesh-bvh not needed, noted per brief). Multi-hit
   disambiguation: among all hit proxies, the one whose CENTER projects closest to the pointer wins
   — nearest-hit alone mis-selects a neighbour whose deep box fronts the oblique fan-axis ray
   (bit this lane: display→screen, speaker→sip, taptic→crown before the fix; verified 10/10 after).
2. **Tap/click → SET_CLICKED_MESH** — pointerup with ≤15 px travel and hold < 500 ms (the longpress
   system owns longer holds) raycasts and emits on the typed bus (single mutation path; evals drive
   `api.bus` identically). Camera lookAt LERPS: pose override (`rig.setPoseOverride`, parallax 0 —
   macro law) with target = live part position, blend tweened 0→1 over 2 s power3.inOut (close 1.6 s,
   re-open resumes at constant rate — longpress resume pattern); reselect pans the frozen-blend
   target with the k=3 chase (source lookAt constant, bible §6). Selected part idle-rotates
   `rotation.y += dt·0.15` composed AFTER `applyExplode` re-seats the base pose each frame (never
   accumulates). Overlay `[data-explode-overlay]`: 0-size ROOT anchored exactly at the projected part
   center (assert measures left-middle ≤8 px — worst 0.1 px); card hangs right with hairline
   connector, unique Name/Function copy per part (all 10 within §8's 90–140 chars — the "outdo the
   source's shared placeholder" clause), close (cross icon) + prev/next (arrow icons,
   NEXT_PREVIOUS_CLICKED_MESH, wraps in manifest order). HOVER_POSITION emitted per projection frame.
3. **XPLOD_ALL** — bus event ramps 2 s on / 1 s off (power3.inOut), dist ×1.65 at full (source
   constants); composed as `eff = max(scrubExplode, xplodRamp)`. `mode` reports `"all"` at eff ≥ 0.7
   — the scroll-driven fan beat hits it at p=0.5 (`gotoSection` path the rubric drives).
4. **Drag-pan gating** — horizontal-dominant pointer travel >15 px yaws the cluster
   (`dragYaw`, composed into the authored-attitude yaw); gated OFF while selected
   (`dragEnabled=false`, Δrot=0 under synthetic drag), ON after close (Δrot>0). Applied direct —
   no added lerp (single-smoothing-owner law; declared here per §6 duty).
5. **Mobile** — same 15 px tolerance on touch (10 px-move tap selects, 20 px never); vertical travel
   stays a scroll (direction lock), horizontal becomes the drag with `lenis.stop()` +
   non-passive `touchmove` preventDefault for the drag's lifetime, `lenis.start()` on release.
   `e.cancelable` guarded (Chrome logs an intervention error otherwise — bit this lane).
   Card clamps inside the viewport via `--xpl-shift` (root stays on the anchor).
6. **Full roster in the fan (7/7)** — `INTERNAL_LAYOUT` now: display (lateral below the screen line)
   · sip · battery · speaker (battery plane, fanned low-left) · taptic · sensor_array (low, coil
   toward camera) · crown_asm (+X off the case flank, per internals-continue slots). `lateral`
   case-frame offsets scale with eff. **`sensor_foam_peel`** closes to identity at fan-rest and
   re-peels to its shipped −72° rest across eff 0.55→0.9 (rotation only — contract). Verified on
   zoom crops: peel tab visibly mid-peel at p=0.5, coil arc legible.
7. **Taptic tick-back** — hovering `part_taptic` oscillates `taptic_mass` ±0.4 mm (±0.0004 in the
   part's authored metres) at ~8 Hz, local X only; phase = `wallSeconds()` → real-time live,
   **frozen under `?eval=1`** (smoke: live distinct offsets amp ≤0.4 mm; eval offset constant).
   `navigator.vibrate(10)` once per hover entry where supported (Android garnish; visual primary).
8. **Nocturne LED** — gate = Nocturne enterCenter/leaveCenter (wired in main.ts's existing lifecycle
   listener). While gated, `led_green` (found by MATERIAL NAME in the sensor GLB —
   KHR_materials_emissive_strength base preserved) pulses at real 1 Hz wall-clock
   (`exp(-5·frac(wallSeconds()))` shape ×1.6 peak); `led_red` forced dark at adoption. Eval-frozen
   (wallSeconds pinned). Live smoke measures the swing (0.48↔~2.4) + red=0. Note: the sensor sits
   inside the assembled case during Nocturne, so the pulse is state/mechanics truth (asserted), not
   a visible beat — flagged for the council if they want a visible LED moment.

## state() decision every downstream agent must know

**`state().explode` is now the rubric's rich object, not the P1 placeholder string.** The rubric
(frozen at P0, the mechanics contract) addresses `state().explode.parts/selected/mode/...` — the
extension key deliberately replaces the string; the StateStore axis token rides inside as
`explode.token` (assembled / exploded / part-focus — written via `api.applyState`, closed out by
`onLeave`/`onLeaveCenter` so the `guaranteedExitState {explode:"assembled"}` contract stays
truthful). Grep confirmed zero consumers of the string form; schema stays v1 (the shape the harness
was built against). `EngineStateSnapshot.explode` is typed `string | ExplodeStateSnapshot`.

## Harness fixes (evals/, semantics preserved)

1. **Stale screenPos reads** — explode checks read `parts[].screenPos` BEFORE `gotoSection`, then
   clicked the dead coordinates. Fixed in `assert.ts` (proxy-hitboxes per-iteration re-read,
   lookat-lerp, tap-tolerance) and `capture.ts` (explode-open): projections re-read after the goto.
2. **lookAt sampling** — now IN-PAGE (CDP round-trips stretched the cadence) and spanning the full
   2 s lerp + settled tail (13×165 ms; power3.inOut mid-slope 1.5/s ⇒ ~25% peak per sample vs the
   30% bound). A shorter window only sees the flat head and skews the ratio.
3. **drag-gating self-selects** a part when none is selected (previous checks legitimately close
   theirs; the check needs the selected-vs-closed contrast).
4. **anchored-overlay parks the pointer first** — hovering the card FREEZES its anchor by design
   (buttons must not slide out from under the cursor while the focus lerp settles).
5. **tap-tolerance (mobile) waits for the roster** (internals are not loader tasks — engine.md
   pitfall class: gate on `explode.parts`, not `loaderDone`).
6. Close-button clicks guarded with `selected != null` + 2 s timeouts (playwright hangs 30 s on a
   hidden overlay otherwise).

## Pitfalls found this lane (downstream must inherit)

1. **Compat event order**: `mouseenter` fires BEFORE the same gesture's `pointermove` — a window
   pointermove hover-raycast that clears the cursor icon over UI stomps the button's icon the same
   instant it was set. Over UI targets, don't touch the hover channel.
2. **Nearest-raycast-hit is wrong for deep overlapping proxies** — disambiguate by projected-center
   proximity (see sub-mechanic 1). Any future hover/click surface with generous hitboxes inherits this.
3. **The overlay must freeze while hovered** — an anchored overlay that keeps tracking a settling
   camera slides its buttons away from the pointer (playwright reproduces it as flaky hovers; humans
   feel it as a chase).
4. **Playwright CDP round-trips ≈ 40–80 ms** — never assert per-frame motion bounds through
   per-sample `page.evaluate` loops; sample in-page.
5. Internals wrapper quaternions are written ONCE at attach — anything composing rotations on them
   per-frame must re-base first (`applyExplode` now re-copies `cs.quaternion` every frame).
6. `preventDefault` on touchmove needs the `e.cancelable` guard (intervention error in console
   otherwise — it fails the zero-console-error gates).

## Honest rough edges (P3 verify / council)

- **Mid-fan density**: 10 parts at p=0.5 read dense around the case (crown knob near the taptic
  zone; speaker partially behind the battery from the authored angle). Every part is individually
  clickable (10/10) and legible in crops; final composition is the design gate's call —
  `INTERNAL_LAYOUT` dist/lateral values are the knobs, clicks stay robust under re-tuning.
- **Selected-part idle rotation is dt-driven** (rubric demands 0.15 rad/s over wall frames) — the
  ONE explode value that advances during an eval capture with a selection open. Captures select
  synchronously and shoot immediately; live captures were never byte-stable anyway (infra-gl
  pitfall 1). Everything else (fan, foam, attitude, LED/taptic phases) is scroll/clock-pure.
- **Nocturne LED is not visible** while assembled (see sub-mechanic 8).
- `?eval=1` capture of the `explode-open` interaction frame now works (capture.ts SKIP resolves);
  the full `evals/reference/ours` refresh rides the next integrate pass, not this lane.
- Mobile real-device pass (iOS Safari gesture arbitration feel) still the P3-verify duty.
