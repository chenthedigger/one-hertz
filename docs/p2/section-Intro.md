# P2 lane notes — section-Intro (the hero, the most-judged frame)

Status: **DONE, all gates green** · 2026-08-21 · lane: section-Intro
Law followed: `docs/LOOKBIBLE.md` (§1.5 #1 hero keyframe · §4 type · §7 scrims · §8 copy budgets) + `docs/p15/motion-bible.md` (Intro-group grammar, loader-exit chain, ten laws) · contracts `docs/p1/engine.md` + `docs/p15/plumbing.md` + `docs/p2/infra-gl.md` (setPoseOverride seam) + `docs/p2/infra-type.md` (type tokens).

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean · **engine-smoke ALL PASS** (headless real Chrome, playwright-core `channel:"chrome"`, vite preview :4573) · zero console errors on `?solo=Intro&eval=1`, `?eval=1`, live `/` and live `?solo=Intro` · `--porcelain` lands exactly `#E8EAED` at Intro (keyframe driver, §1.5 #1) · live entrance settles to the designed frame in ~2.3 s with exact base transforms restored (probe: char/hint opacity 1, no residue).

**Design-gate evidence** → `docs/p2/Intro/`: `solo-25.png` · `solo-50.png` · `solo-75.png` (1600×900@2, `?solo=Intro&eval=1`, gotoSection .25/.5/.75) · `full-intro-000.png` (full page `?eval=1`, gotoSection Intro 0 — THE first-impression frame).

## What was built

`src/sections/intro.ts` + `src/sections/intro.css` (scoped, imported by the module — zero style.css contention) replace the P1 demo IntroSection. DOM is self-rendered into the track's `.pin` (index.html untouched; the old `.hero` markup dies at construction, its style.css rules are now dead code — flagged below).

The frame (instrument-editorial diagonal, the §2 stage grammar): colossal two-line **ONE / HERTZ** lockup upper-left (Clash 300, `--type-colossal`, §4 stagger-indent 0.38em on line 2), the real Ultra 3 composed lower-right standing on its contact shadow (the "Z" deliberately kisses the crystal corner — the type-breaks-the-watch tension, full-ink contrast per §7.5), sub-line beneath, **living-BPM vital** top-right, grey spec lines bottom-left, static SCROLL hint bottom-center. Byline law: eyebrow `CHEN PRESENTS`.

Copy inside §8 budgets: title 3/5 chars (≤14) · sub 36 (≤48) · eyebrow 13 (≤18) · spec labels 16/16 (≤18 caps). Working copy — P4 polishes wording.

State contract (truthful): `requiredEnterState {camera:"intro-hero", explode:"assembled"}` (the page-load defaults) · `guaranteedExitState {}` — pose override blends fully out by p=.9, no state axis written. Longpress zoom = default 1.35. Cursor: `data-cursor-text="holdToExplore"` on the pin.

Lighting: entirely the infra-gl keyframe driver's (instrument.json Intro key: rot 0 · envInt 1.0 · exposure 1.05 — the pose the 9-point sweep confirmed). This lane invented no lighting.

## Timelines (domains declared, motion-bible law 4)

- **DOM (scrub-fraction, PAUSED GSAP timeline padded to 1 + imperative reveals):** hint dies by p≈.15 (linear opacity) · eyebrow/lockup/spec depart power2.in with linear opacity fades (.28/.3/.52) · vital holds longest (out .58–.78) · **scrub:2 grey-line color reveals** on the spec lines, light-ground greys `#BCBCBC→#323232` (§7.3), windows [.05,.20]/[.10,.28] (alternating-offset pattern), 2 s catch-up lag live (`gsap.ticker`, k=2.2) and instant targets under `?eval=1` (Mechanism precedent — settle passes run dt=0).
- **WebGL (scrub-fraction, padded to 1):** hero recipe → `CameraPoseOverride` each frame. Hold the hero frame 0–.4, release `blend→0` over .4–.9 power3.inOut (one big move; override restored before exit, law 7) — Timeless inherits the base rig pose seamlessly. Recipe: radius 5.65 · lat 0.53 (aim left → watch composes right) · sink 0.34 (aim above origin → watch stands on the shadow, in frame) · thetaOff .1 · phiOff −.06 · fov 35 · parallax stays live (the hero is an invitation, not a macro).
- **Wall-clock (loader-exit chain only, §8 slot: .4 + 1.2 + 2.0 + 1.2):** on loader dismiss — watch enters from depth onto the contact shadow (`product.position z −7→0, y 1.35→0` + rotation settle `(−.3π,.45π)→0` on the **watch root**, 2.0 s power3.out, source-exact) · title chars x:−105%→0 1.2 s power3.out stagger .12, opacity linear first half · supporting copy in on the {0.4, 0.8} scale. Live only — `?eval=1` boots at the settled frame.

Camera chases `productAttitude(getClock())` yaw (Mechanism pattern) so the dial faces the camera at any page clock — live == eval == solo. In solo the clock spans 0..1 across this one section (turntable effect, Mechanism lane pitfall #3): `solo-50` is the frontal pose, `solo-75` catches the edge-on crown profile mid-release — judge composition on the full-page frame.

## Named anchors (P3 wiring contract)

- **`LOADER_RINGS_ANCHOR`** = `[data-anchor="loader-rings"]` — invisible 120×120 box at the hero dial's screen position (58%/62%). The loader activity-rings match-cut (P3) morphs the arc here. Exported from `src/sections/intro.ts`.
- **`BPM_VITAL_ANCHOR`** = `[data-anchor="bpm-vital"]` — the top-right vital (ring SVG `pathLength=100` + `[data-vital-value]` numeral, Geist Mono tnum). Placeholder shows 64 (the eval pin); P3 drives value + arc from `core/determinism.ts` `bpm()`/`ecgPhase()` — the sanctioned seam, never wall time (law 9). The SCROLL hint's metronome tick is deliberately STATIC for the same reason.

## Pitfalls found this lane (downstream must inherit)

1. **Solo + unpinned 100svh = maxScroll 0 ⇒ localProgress cannot persist.** `gotoSection` returns the requested progress synchronously, but the next engine frame recomputes from raw scroll (0) and it snaps back — solo captures at .25/.5/.75 silently all show p=0. Fix (reusable for Timeless/Images/Parts/Footer): inject a 100svh runway spacer after the track, **solo-only** (`params.solo === name`), **in the constructor** — before boot's `registry.measure()` + `engine.refresh()`, so Lenis learns the limit (engine pitfall #1) with zero extra wiring.
2. **A clipped radial-gradient scrim reads as a hard rectangle.** A gradient whose stops don't reach alpha 0 inside its box paints a visible seam at the box edge — here it cut a vertical line straight across the watch case. Build §7.1 scrims as an oversized `::before` with `radial-gradient(closest-side, …, transparent 100%)`: alpha hits exactly 0 on every edge, no seam, and the wash still tracks the live `--porcelain` token.
3. **`stage.render` owns `product.rotation` absolutely** — entrance rotation offsets there are clobbered every frame. Put wall-clock rotation settles on `stage.watch.root` (render never touches it), capture the base rotation at arm time, restore it exactly onComplete.
4. **Deep-linked boots must not run the entrance mid-page**: arm on loader dismiss (element removed OR fade started — assets are ready either way), and snap the chain to its end (`tl.progress(1)`) when the section is not in view (also done in `onLeave` if the user scrolls away mid-entrance).
5. The contact shadow at the hero pose is nearly edge-on (phi ≈ 1.29) — it reads as the intended "grounding hint, not a puddle" (instrument.json `{0.3, 1.15, 2.4}`); do not compensate with framing that sinks the watch out of the title's negative space.

## Open handoffs

- P3 loader match-cut: morph the loader arc to `LOADER_RINGS_ANCHOR`, then hand the entrance trigger a real seam (today the section polls loader dismiss in `tickDom` — replace with the match-cut completion callback when it exists).
- P3 living vital: drive `[data-vital-value]` + the ring arc from `bpm()`/`ecgPhase()`; the 1 Hz hint tick may join the same signal then.
- Timeless (next section) inherits the camera at the base rig pose (blend 0 by p=.9) and rides the Intro group's spin per motion bible §4 — no special state required.
- style.css `.hero*` rules + `@keyframes hint-pulse` are dead after this lane (markup replaced at construction; the keyframe was a law-9 violation anyway) — whoever next touches style.css may delete them.
