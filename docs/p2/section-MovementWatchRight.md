# P2 lane notes — section-MovementWatchRight (the annotated instrument plate, hover-swap graft)

Status: **DONE, all gates green** · 2026-08-26 · lane: section-MovementWatchRight
Law followed: `docs/LOOKBIBLE.md` (§1.5 #8 lighting keyframe · §7 scrims/reveal colors/sweep law · §8 copy budgets) + `docs/p15/motion-bible.md` (Presentation-group .5–.75 grammar "top-down macro held", ten laws) · contracts `docs/p1/engine.md` + `docs/p15/plumbing.md` + `docs/p2/infra-gl.md` (keyframe driver, setPoseOverride, sweep harness) + `docs/p2/infra-type.md` (type tokens).

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean · **engine-smoke ALL PASS** (headless real Chrome, playwright-core `channel:"chrome"`, vite preview :4573; state schema lists the additive `movementWatchRight` extension) · zero console errors on `?solo=MovementWatchRight&eval=1` and the full-page `?eval=1` capture pages · `--porcelain` lands exactly `#E8EAED` at section center in BOTH solo and full page (the MovementWatchRight key has no bgStage — porcelain by design) · state truthful at all captures: `{anchorsReady:true, blend:1, active:null}` · hover-swap round-trip proven live: pointerenter LIQUID GLASS → `state().dialMode === "depth"` AND `state().dial.complication === "depth"` (the sub-dial repaints 12.4 M with the gauge ring); pointerleave → `"wayfinder"` restored.

**Design-gate evidence** → `docs/p2/MovementWatchRight/`: `solo-25.png` · `solo-50.png` · `solo-75.png` (1600×900@2, `?solo=MovementWatchRight&eval=1`, gotoSection .25/.5/.75) · `contextual-50.png` (full page `?eval=1`, gotoSection MovementWatchRight 0.5 — the page-truth frame) · `solo-55-hover-glass.png` (the graft firing: DEPTH complication live under the pointer) · `sweep-p75-rot200-veiled.png` vs `sweep-p75-rot180-clean.png` (the glare-band evidence pair behind the camera decision below). The red hairline at the top of every frame is the site-wide P1 clock hairline — global chrome, not this section's.

## What was built

`src/sections/movementwatchright.ts` + `src/sections/movementwatchright.css` (scoped, imported by the module) replace the MovementWatchRight placeholder (registered in `sections/index.ts` — my two lines only). DOM self-rendered into the track's `.pin` (index.html untouched). One additive edit in `core/debug.ts`: `MovementWatchRightStateSnapshot` + the `movementWatchRight` key in `StateExtensions` (schema stays v1).

Source grammar → ONE HERTZ translation (MovementWatchRight_* reference frames):

| Source (Refined Dial / Polished Hands / Premium Bezel) | Ours |
|---|---|
| watch settled top-down right of center, detail stack left with decorative leader lines | watch composed right (`lat` −.42→−.55), right-aligned detail rail on the left; the leader lines made **load-bearing** |
| static labels | **RETINA DIAL / LIQUID GLASS / TITANIUM BEZEL** — 3D-projected DOM callouts: dots anchored in case space (bezel-radius units), rotated through `productAttitude(clock)`, projected through the live camera every frame (the HOVER_POSITION pattern); SVG hairlines from each row to its tracked dot |
| no interaction | **the hover-swap graft**: hovering a row writes the StateStore `dialMode` axis (`heart` / `depth` / `compass`) — main.ts's frame loop forwards to `dial.applyDialToken` (one owner); the dial answers the copy live. Wayfinder restored on hover-out AND on section leave, both directions |

Copy inside §8 budgets (eyebrow `08 · IN DETAIL` 14c · headline 8c/10c · sub-lines 26c/24c · hover labels ≤14c + mono spec lines ≤17c) — P4 polishes wording. Headline hierarchy by tone (§4): ghost `READ THE` 30% ink, solid `INSTRUMENT` full ink, 0.52em stagger indent.

State contract (truthful): `requiredEnterState {explode:"assembled", dialMode:"wayfinder"}` · `guaranteedExitState {dialMode:"wayfinder"}` — hover writes are transient, `onLeave` restores wayfinder and clears the pose override; no other axis touched. Longpress zoom = default 1.35 (law 8 — a plate, not a macro).

Lighting: entirely the infra-gl keyframe driver's (instrument.json key #8: rot 200 · envInt 1.0 · no bgStage). Zero lighting invented here. Scrim §7.1: left gradient from live `--porcelain` 55→0 behind the copy column; reveals use the light-ground pair #BCBCBC→#323232 (§7.3); dots/hairlines are ink-on-tokens (bloom never aids legibility, §7.6).

## Timelines (domains declared, law 4)

- **DOM** (scrub-fraction, paused GSAP padded to 1): scrim/rays/eyebrow arrive ≤.1 · split-char headline x:−110%→0 power3.out + linear opacity (§3 scrub:true grammar) at .06 · annotation rows power3.out staggered .26/.33/.40, each row's reveal proxy (dot+hairline opacity) rides the same window · grey-line sub reveals imperative windows [.18,.30]/[.24,.36], scrub:2 catch-up k=2.2 live-only on the gsap ticker, instant under `?eval=1` (motion-bible §7.10 pattern) · departures power2.in from .86 before pin release.
- **WebGL** (scrub-fraction, paused GSAP padded to 1, power3.inOut): blend-in .0–.1 · THE move .1–.4 (descend onto the lit dial, standoff→3.0; paired lateral `lat`→−.42 inside a .2 window, law 7) · parallax quiets to .55 at .25 (hover targets hold steady; not zero — the frame still breathes) · **annotated crawl .5–.75**: slow crown-side quarter-orbit `thetaOff .32→.85, phiOff −.14→−.3, lat→−.55` · settle .75–.85 (standoff 3.12, ≈0.5× opener, law 3) · blend-out .9–1 → base rig owns the handoff to Hands. Pose chases the dial normal through caseSpace + productAttitude — pure function of {clock, progress}; eval settle is a fixed point.

## The glare hunt (why the hold is a quarter-orbit — sweep evidence, not taste)

First capture pass: solo p=.75 sheeted the crystal into a white veil (dial illegible). Systematic findings, all on rendered frames:

1. Fine progress sweep .55–.9: veil onset between .70 and .75 with near-identical recipe values ⇒ the driver is the **product attitude** (`productAttitude` yaw), not the camera offsets. In solo the clock spans the whole section — the product turns ~90° between p .5 and .75 (live: ~9°). Any fixed env rotation will catch a mirror band at SOME solo capture point.
2. Env-rotation sweep at p=.75 (`gl.setEnvRotation`, the infra-gl harness; driver change-caching keeps the poke alive at scroll-rest): rot 200 (the key) veiled · 180 clean · 220 clean · 160/240 hazy. Cross-checked at p .25/.5/.85: **no single rotation clears all four attitudes** (180 fails .25+.85, 220 fails .25, 200 fails only .75). Key stays **rot 200** — it passes the section CENTER (the keyframe's actual pose, §7.2) and the most points overall. instrument.json untouched.
3. Camera phi is nearly useless against this veil (tested −0.14→−0.66: veil persists) — the 6 m streak formers subtend ~90° of mirror band on the domed crystal; elevation slides you along the band, not off it.
4. What works: a **large relative-azimuth move** — the hold became a slow quarter-orbit toward the crown side (thetaOff→.85) with `lat` deepened so the composition stays right-of-center. Verified ink-dark dial at p .55/.6/.65/.7/.75/.85/.92 under rot 200, and the crawl doubles as the beat's "streak crawls the bezel" drama.

## Pitfalls found this lane (downstream must inherit)

1. **Solo attitude ≠ live attitude.** Solo's clock scalar runs 0→1 across ONE section ⇒ the product does a full revolution inside your sandbox; live it turns `SECTION_VH/Σ · 360°` (~29° here). Camera recipes that chase the product are composition-safe, but LIGHTING readings differ per progress point in solo. Verify legibility across the whole solo beat, not just your center — your eval captures live at solo attitudes forever.
2. **Never fight a mirror band with elevation.** The instrument rig's streak formers are angularly huge; if a pose veils the crystal, move azimuth (camera or, with sweep evidence at the section center, the section key) — phi sweeps along the reflection, not off it.
3. Never clip a display headline: `.mwr__head { width: max-content }` lets line masks (overflow:hidden for the char slides) size to their words — the first build clipped INSTRUMENT to "INSTRUM" inside the copy column. Solid ink kissing the case during transit is source grammar (Timeless); §7.5 bans only GHOST layers over the watch.
4. Hairline anchors must be height-ordered to their rows (top row → highest dot) or the leader lines cross — the anchor offsets are free case-space choices, so order them.
5. Annotation projection uses the LAST rendered frame's camera matrices (sections tick before rig.update) — one frame of dot lag at 60 fps, invisible live; capture scripts should render one extra settled frame (double `gotoSection` + a beat) before screenshotting, and wait ~1 s for the .8 s dot/hairline CSS transitions when the frame is evidence.
6. `evals/engine-smoke.mjs` can flake if `dist/` is rebuilt under the live :4573 preview mid-run (lifecycle check reported an empty center list twice, then passed 3× consecutively untouched). Re-run before believing a failure that a targeted probe can't reproduce.

## Open handoffs

- P3 polish (per the brief "wire what the dial module already supports, P3 polishes"): richer complication transitions (dial-side crossfade), `HOVER_POSITION`-driven cursor magnetism on the rows, touch affordance for the hover-swap (tap-to-cycle?) — the rows are `<button>`s with focus parity already.
- P4 copy: working copy is placeholder-grade inside budgets; the RETINA DIAL spec line (`LTPO3 · 3000 NITS`) is the natural home for real panel numbers.
- The per-section 9-point azimuth duty (§1.4 fix 5) is discharged for this section at its center pose (rot 200 confirmed); the p-dependent findings above are extra evidence for whichever lane runs the full-page light pass.
