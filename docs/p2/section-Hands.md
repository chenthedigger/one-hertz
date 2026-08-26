# P2 lane notes — section-Hands (the side-elevation beat: PROUD PROFILE + BPM card #2)

Status: **DONE, all gates green** · 2026-08-26 · lane: section-Hands
Law followed: `docs/LOOKBIBLE.md` (§1.5 #9 lighting keyframe · §6 #4 side-14mm optics · §7 scrims/reveal colors · §8 copy budgets) + `docs/p15/motion-bible.md` (Presentation-group .7 slide-under grammar, ten laws) · contracts `docs/p1/engine.md` + `docs/p15/plumbing.md` + `docs/p2/infra-gl.md` (keyframe driver, setPoseOverride) + `docs/p2/infra-type.md` (type tokens).

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean · **engine-smoke ALL PASS** (headless real Chrome, playwright-core `channel:"chrome"`, vite preview :4573; state schema lists the additive `hands` extension) · zero console errors on `?solo=Hands&eval=1&look=instrument` and the full-page `?eval=1&look=instrument` capture pages · `--porcelain` lands exactly `#E8EAED` at Hands 0.5 in BOTH solo and full page (the Hands key has no bgStage — porcelain center by design) · state truthful at all captures: `{blend:1}` with distinct `{standoff, frameY}` per frame · fov 19 confirmed in `state().cameraPose` at every capture.

**Design-gate evidence** → `docs/p2/Hands/`: `solo-25.png` · `solo-50.png` · `solo-75.png` (1600×900@2, `?solo=Hands&eval=1&look=instrument`, gotoSection .25/.5/.75) · `contextual-50.png` (full page `?eval=1&look=instrument`, gotoSection Hands 0.5 — the page-truth frame). The red hairline at the top of every frame is the site-wide P1 clock hairline — global chrome, not this section's.

## What was built

`src/sections/hands.ts` + `src/sections/hands.css` (scoped, imported by the module) replace the Hands placeholder (registered in `sections/index.ts` — my two lines only; concurrent lanes' registrations untouched). DOM self-rendered into the track's `.pin` (index.html untouched). One additive edit in `core/debug.ts`: `HandsStateSnapshot` + the `hands` key in `StateExtensions` (Movement's precedent; schema stays v1).

Source grammar → ONE HERTZ translation (`Hands_*` reference frames: centered "SLIM PROFILE" plate + centered body + hairline registration crosshairs + the watch riding edge-on under the camera):

| Source | Ours |
|---|---|
| centered 2-line headline "SLIM PROFILE" | **"PROUD / PROFILE"** — the honest inversion (brief): this case is thick and says so. Clash Display 300 at `--type-display`, split-char reveal, the crosshair hairline threading between the lines exactly as the source plate does |
| centered 3-line marketing body | **"14.4 millimetres of titanium, and proud of every one."** (brief copy verbatim) + "The only colour it wears is the button on its flank." — both on the grey-line reveal grammar. "Proud" is also the machinist's word for material standing above a surface — the pun is the thesis |
| technical-plate crosshairs (+, hairlines) | same grammar: center vertical hairline + horizontal hairline + `+` mark, ink at 10–14%, drawn in via the bar-scale reveal |
| slim horizontal side profile sliding under the camera | the **flank elevation** — camera chases the case's Action-Button flank (−caseSpace.xAxis) through `productAttitude`, 105 mm telephoto (fov 19, §6 #4 side-14mm). The case reads DIAGONAL, not horizontal: owned deliberately — it is the ink/porcelain diagonal staging grammar (LOOKBIBLE §2) applied to the object itself, and it keeps the **Action Button orange as the only saturated element in frame** (Hands_* grammar; the DOM carries zero color) |
| — (no card in source) | **BPM catalog card #2** (the ONE HERTZ catalog motif): `BPM CATALOG · 02` / `REST / MAX` / **96 / 220** bpm mono tabular / caption "Assertive Profile" — bottom-right, hairline top rule, §7.1 radial porcelain scrim chip |

Copy inside §8 budgets (eyebrow `09 · PROFILE` 12c · headline 5/7c · bodies 54c/52c ≤220 · card eyebrow 16c · caption 17c ≤60) — P4 polishes wording. Cursor: `data-cursor-text="holdToExplore"` (fixed vocabulary).

State contract (truthful): `requiredEnterState {explode:"assembled"}` (an exploded case has no side elevation) · `guaranteedExitState {}` — the pose override blends fully out by p=1, no state axis written. Longpress zoom = default 1.35 (law 8 table). `is-center` class toggled on enter/leaveCenter (placeholder/engine-smoke parity).

Lighting: entirely the infra-gl keyframe driver's (instrument.json Hands key: rot 225 · envInt 0.9 · no bgStage ⇒ porcelain at center; both chamfer streaks live on the case edge — the §1.1 rig doing the 14.4 mm story's work). Zero lighting invented here.

## Timelines (domains declared, law 4)

- **DOM** (scrub-fraction, paused GSAP padded to 1): registration hairlines draw .02–.14 (scaleX/scaleY, power3.out) · eyebrow .04 · split-char headline at .06 — x:-110%→0 power3.out + linear opacity over the first half, stagger .006 (§3 scrub:true grammar) · bodies .16/.20 power3.out · card .18 power3.out, rule draws .2 · departures power2.in at .84–.93 (copy rises out, card follows) — all resolved before pin release. Imperative in tickDom: 3 grey-line reveals (bodies [.18,.32]/[.23,.45], caption [.28,.44] — half-widths on the alternating 15/25 pattern), LIGHT-ground colors #BCBCBC→#323232 (§7.3), lag k=2.2 live-only on the gsap ticker, instant under `?eval=1`.
- **WebGL** (scrub-fraction, paused GSAP padded to 1, power3.inOut): blend-in + parallax off .0–.12 (telephoto macro, law 7) · **the one big move** .1–.5 — the case crests from the bottom of frame into the flank elevation (frameY .78→.4, standoff 5.9→4.9, lateral aim .55→0 recentring the entry crest) · slide-under .5–.75 (the source's .7 beat: phiOff→−.24, frameY→.18, standoff→4.55 — the camera climbs above the flank, the top edge crests) · ease-off .75–.9 (standoff→4.85, ≈0.6× the opener, law 3 shape) · blend-out .9–1 → base rig owns both handoffs (Straps opens clean). Pose = pure function of {caseSpace, clock scalar, recipe} — wall time banned (law 9), no internal lerp, eval settle is a fixed point.

## Camera plumbing (reusable facts)

- **Flank chase**: side = `caseSpace.xAxis · SIDE_SIGN` rotated by `productAttitude(getClock())`; θ=atan2(side.x, side.z), φ=acos(side.y)+phiOff clamped. `SIDE_SIGN = -1` puts the **Action Button** (orange) toward camera — verified on the captures; the crown flank is the flip of one constant.
- **Screen-space lateral aim**: camera forward = −side ⇒ frame-left ∝ (−side.z, 0, +side.x). `lat` shifts the look-target frame-left so the subject composes frame-right — got the sign wrong first pass; the cross-product derivation in the module comment is the check.
- **105 mm** = fov 19 vertical (2·atan(12/105)); at standoff 4.4–5.9 the frame height is ~1.5–2.0 world units — case-dominant framing on the 2.4-unit watch with real telephoto compression.

## Pitfalls found this lane (downstream must inherit)

1. **phiOff past ≈−.24 sheets the crystal with glare at rot 225** — the camera-above-flank angle mirrors the env stripe off the sapphire and washes the dial (the az-0 law's cousin, found empirically at the .75 beat). §7.2 legibility outranks drama: cap the climb; the −.3 first pass is in the round-2 scratchpad frames if a council wants the comparison.
2. **The Ocean band is a saturated object in ANY full-watch frame** — "Action Button orange as the only saturated element" is enforceable only by framing (tight standoff keeps the band a supporting arc at the frame edge, the case + button dominant). A band-free side elevation would need per-section material dimming — NOT done (colorway state is P3's; noted for the council if the band reads too loud).
3. **The case flank shows baked-texture mottling at 105 mm macro** (dark smudge patches around the speaker ports, visible in every capture) — shipped GLB material under the instrument env, present in all macro lanes, not a section defect. Look-lane's queue if it survives the beauty gate.
4. Concurrent-lane races on the shared surfaces are real: `tsc` failed twice mid-lane on OTHER sections' in-flight `extendState` keys, and engine-smoke's `enterCenter marks Curves only` check failed until the Curves lane landed its own `is-center` toggles (mtime polling beats editing another lane's file). Re-run the gate; never "fix" a sibling's file mid-flight.

## Open handoffs

- Straps enters with the camera back at the base-rig pose (blend 0 by p=1) — its converge beat starts clean; nothing held.
- Per-section 9-point azimuth sweep at rot 225 (§7.2 full scope): reviewed at the three capture poses (dial legible at .5/.75 after the phiOff cap; at .25 the dial is off-frame). The infra-gl sweep harness is ready if the council wants the full grid.
- P3 longpress: the hold dives onto the flank macro at 1.35× — no section-specific wiring needed.
- BPM catalog motif: card #1 lives in Curves (58/220 per its lane), #2 here (96/220 Assertive). A P4 pass may want the card chrome (rule weight, scrim shape) unified across the pair — both are token-built, diff-able in one screen.
