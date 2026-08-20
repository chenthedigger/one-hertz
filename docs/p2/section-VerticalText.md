# P2 lane notes — section-VerticalText (the vertical rotation beat)

Status: **DONE, all gates green** · 2026-08-21 · lane: section-VerticalText
Law followed: `docs/LOOKBIBLE.md` (§1.5 #3 lighting keyframe · §1.6 face-on beauty plate · §7 scrims/legibility · §8 copy budgets) + `docs/p15/motion-bible.md` (Intro-group tail grammar, VerticalText ±60vw letters, ten laws) · contracts `docs/p1/engine.md` + `docs/p15/plumbing.md` + `docs/p2/infra-gl.md`.

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean · **engine-smoke ALL PASS** (headless real Chrome, playwright-core `channel:"chrome"`, vite preview :4573) · zero console errors on `?solo=VerticalText&eval=1` and `?eval=1` capture pages · `?solo=VerticalText` mounts and scrubs standalone.

**Design-gate evidence** → `docs/p2/VerticalText/`: `solo-25.png` · `solo-50.png` · `solo-75.png` (1600×900@2, `?solo=VerticalText&eval=1`, gotoSection .25/.5/.75) · `full-verticaltext-050.png` (full page `?eval=1`, gotoSection VerticalText 0.5 — the page-truth frame).

## What was built

`src/sections/verticaltext.ts` + `src/sections/verticaltext.css` (scoped, imported by the module — zero style.css contention) replace the VerticalText placeholder (registered in `sections/index.ts`, own lines only). DOM is self-rendered into the track's `.pin` (index.html untouched).

Source grammar → ONE HERTZ translation (Intro-group tail + VerticalText_* reference frames):

| Source (light stage, frontal watch, giant letters) | Ours |
|---|---|
| watch settles toward frontal through the pinned viewport | **two-act turn**: crown-side case profile (act A) → near-frontal beauty plate (act B); the watch travels right-of-center → left-of-center while it rotates |
| giant background letters slide `x:±60vw power3.in` | colossal vertical ghost stacks **C-A-S-E / F-A-C-E** anchored at the left frame edge (the namesake, literally vertical text); outgoing letters depart ±60vw alternating, power3.in, stagger .03, linear opacity; incoming arrive power3.out |
| copy plates | left block **CASE & FINISHES** — "Aerospace-grade titanium / Satin-brushed · 100 m"; right block **FACE & COMPLICATIONS** — "Wide-angle LTPO3 / Always-On Retina / 3000 nits · down to 1 Hz" (the title's first plant; COMPLICATIONS verbatim at display size) |
| grey label reveals | scrub:2 grammar as per-line STAGGERED raw-progress windows (motion-bible §7.10 — no private lerp, Lenis supplies the trailing feel), light-ground colors **#323232 → ink** (§7.3) |
| split-char title reveals | ghost/solid headline pairs, chars `xPercent:-110→0 power3.out` + linear opacity (scrub:true grammar) |

Copy is working copy inside §8 budgets (eyebrows 12–13c · headline lines 6/8 and 6/13c · stack lines ≤24c) — P4 polishes wording. Eyebrows `03 · EXTERIOR` / `03 · DISPLAY`.

State contract (truthful): `requiredEnterState {explode:"assembled"}` · `guaranteedExitState {}` (pose override blends fully out by p=1; no state axis written). Longpress zoom = default 1.35 (law 8 table). No cursor text (the HOVER_POSITION complication-labels mechanic is P3's wall-clock allowance, .8 s per motion-bible §8).

Lighting: entirely the infra-gl keyframe driver's (`instrument.json` VerticalText key: rot 35 · envInt 0.95 · porcelain ground — "light quiets under the word stack"). This lane invented no lighting. Scrims are §7.1 gradients from the live `--porcelain` token, layered OVER the ghost stacks and UNDER the copy (paint order is deliberate — the scrim softens the colossal letters behind the text).

## Camera (reuses the Mechanism/Nocturne override pattern — no new API)

`rig.setPoseOverride` with a recipe scrubbed by a paused fraction-domain timeline; the pose CHASES the dial normal through `caseSpace` + `productAttitude(getClock())` (live == eval == solo). Beats on the fraction grid, all power3.inOut: blend-in `.0–.1` · satin drift `.15–.4` (thetaOff 1.55→1.25 — the streak light crawls the flank under the left copy) · **THE turn `.4–.6`** (thetaOff→0.5, lat −0.28→0.72, standoff 3.35→3.5 — one big rotation paired with a ≤.2-window travel, law 7) · polar settle `.6–.75` (phiOff→−0.15) · blend-out `.9–1`. Parallax stays ON (no macro; the frame breathes). fov 35.

## Pitfalls found this lane (downstream must inherit)

1. **Elements untouched by the playhead render at natural CSS state.** A scrubbed timeline only applies `fromTo` start values to children it has rendered — anything animated ONLY by a later color/`to` tween (our grey lines) is fully visible at p=0. Fade blocks in as units (`fromTo` opacity at the act's start position) or hide in CSS; we fade blocks as units so aria content stays in the DOM.
2. **Never settle the camera ON the dial normal under a bright env.** The exact-normal pose mirrors the rig into the sapphire and washes the dial to a glare sheet — the az-0 mirror law holds for CAMERA azimuth too, live-verified on capture. Settle ≥~0.4 rad off (thetaOff 0.5 + phiOff −0.15 here); dial legibility outranks symmetric drama (§7.2).
3. **Solo-turntable lighting ≠ page lighting** (re-confirms section-Mechanism pitfall 3): solo clock spans 0..1 over one section, so solo .75 has product yaw 270° vs the page's ~65° — the residual crystal sheen in `solo-75.png` does not exist on the page (`full` probes show a full-ink dial at .75). Judge lighting on full-page frames.
4. **COMPLICATIONS (13 chars) outruns `--type-display` in a half-frame column** — the right headline caps at `min(var(--type-display), 5.2vw)` (measured on capture). Budget math (§8 ≤18c/line) is necessary, not sufficient: check long single words against their column, not the viewport.

## Open handoffs

- P3's HOVER_POSITION labels (the recon "Details" mechanic) belong to this track (motion bible §4 track↔group map); the `.vt` pin is the natural host and the .6–.88 frontal hold is the natural window. Wall-clock .8 s per the bible.
- The vertical stacks' `min(var(--type-colossal), 19svh)` cap is tuned for 4-letter words; longer stack words need their own cap.
- Full-page .25/.75 probe frames from this lane's tuning live only in the session scratchpad; the sweep harness (`docs/p2/infra-gl.md` handoff) remains the tool for any future azimuth re-check here.
