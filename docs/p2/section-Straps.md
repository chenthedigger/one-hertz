# P2 lane notes — section-Straps ("The Band", BPM catalog card #3)

Status: **DONE, all gates green** · 2026-08-26 · lane: section-Straps
Law followed: `docs/LOOKBIBLE.md` (§1.5 #10 lighting key · §6 shot 8 camera recipe · §7 scrims · §8 copy budgets) · `docs/p15/motion-bible.md` (Straps group grammar §4, ten laws) · contracts `docs/p1/engine.md`, `docs/p15/plumbing.md`, `docs/p2/infra-gl.md`, `docs/p2/infra-type.md`.

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean · **engine-smoke ALL PASS** (headless real Chrome, playwright-core `channel:"chrome"`, vite preview :4573) · `?solo=Straps&eval=1` boots with zero console errors · captures below show identical framing solo vs full-page (the attitude-chase holds).

**Evidence** → `docs/p2/Straps/`: `solo-25.png` (WOVEN, / NOT FORGED over the Ocean loop arc, grey-lines mid-reveal) · `solo-50.png` (**the money frame**: 142 / 220 in Clash 300, count landed exactly on 142, crest in macro focus) · `solo-75.png` (family rail settled, OCEAN live + biosignal tick, TITANIUM MILANESE legible over the crest) · `context-50.png` (contextual `gotoSection("Straps", 0.5)` on the full page — framing byte-comparable to solo).

## What was built

`src/sections/straps.ts` + `straps.css` (scoped, imported by the module — zero style.css contention) + the Straps import/registration pair in `sections/index.ts`. DOM self-rendered into the track's `.pin` (no index.html edits).

- **Composition (source grammar translated):** the source converges steel links into a horizontal band under centered display copy; ours is the **Ocean band crest macro** (LOOKBIBLE §6 shot 8 recipe) under the same centered-copy plate, sequenced over the 400svh pin: headline → BPM card #3 → family callout rail.
- **BPM catalog thread (PLAN §2):** card #3 counts **96 → 142** (from card #2's value to the heart-rate peak) as a pure linear map of progress over window [.4,.5] — lands exactly 142 at the .5 capture. Denominator `/ 220` at the 55% dim tier, `.tnum` + display 300 (the oval bowls).
- **Copy inside §8 budgets:** eyebrow ≤18 caps · headline 2 lines ≤18 chars · 3 body lines ≤60 · card caption ≤60 · family callouts are COPY ONLY ("Ocean · Alpine · Trail · Titanium Milanese") — Ocean is the geometry on stage, Alpine/Trail pending the dika3d purchase.
- **Dual timelines, domains declared (law 4):** DOM = scrub-fraction, paused GSAP padded to 1 — split-char x-slides power3.out + linear opacity (scrub:true grammar), departures power2.in; grey-line reveals = the scrub:2 grammar on the LIGHT ground (**#BCBCBC → #323232**, §7.3), 2 s catch-up via a gsap.ticker smoother live, targets applied directly under `?eval=1` (Mechanism precedent — settle stays synchronous). WebGL = scrub-fraction recipe timeline composed into a `CameraPoseOverride` per frame; the crest anchor **chases `productAttitude(getClock())`** so solo/full-page/live all frame identically.
- **Camera beats on the fraction grid:** converge .0–.1 (power2.out — the source's link-converge arrives-and-settles) · crest graze .1–.5 (the one big move: dolly 2.1→1.7 + theta sweep) · reframe .5–.75 (small paired lift for the card/family plates) · **fling .75–.9 (power2.in — the source's ×6 link fling departs violently)** · blend-out .9–1 hands the rig back. Parallax gated OFF for the macro (law 7); DOF tier-0 only, focus derived from the live camera→crest distance so racks ride the dolly's beats by construction (§7.9).
- **Lighting: none invented.** The infra-gl driver holds instrument.json's Straps key (rot 250 · envInt 1.05 · porcelain stage); in `?solo=` the anchor filter pins that key constantly (infra-gl pitfall 4). Scrim = porcelain gradient 55→38→0 over the top 62% (§7.1, never a hard panel).
- **Truthful state contract:** `requiredEnterState {explode:"assembled"}` (a band macro of an exploded case is nonsense) · `guaranteedExitState {}` — override blends fully out, DOF released (`onLeave` belt-and-braces), no state axis written.

## Design-gate calls made this lane

1. **Family rail = dim-label tier (55%), not ghost (30%)** + a porcelain text-shadow scrim (§7.4 grammar): the rail crosses the band macro and §7.5 bans <40% tone layers over the product; the pending-family callouts are the brief's copy and must read. Live item stays full ink + `--biosignal` tick.
2. **Beat 3 retimed to settle at .75** (family in at .67, stagger .01, last item done exactly .75): the catalog frame is the design-gate capture; the first cut caught the rail mid-entrance at half opacity over the band.

## Cross-lane fix (narrated, engine-smoke shared gate)

`movementwatchright.ts` was missing the placeholder-inherited `is-center` lifecycle toggle (curves.ts had the same gap; its own lane fixed it concurrently mid-session). Added the two-line `onEnterCenter`/`onLeaveCenter` override — the smoke's lifecycle check asserts exactly one `.is-center` track and Straps' half of that check depends on the neighbors behaving. Minimal, contract-documented (engine.md §2), pattern identical to Hands/Straps.

## Pitfalls found this lane (inherit)

1. **A scrub-timeline beat that should be "settled" at a capture fraction must END at that fraction, not straddle it** — evidence captures land on {.25,.5,.75}; an entrance finishing at .8 photographs as a half-faded plate at .75.
2. The `body::after` clock hairline (biosignal, scaleX(--clock)) appears across the top of every capture — global chrome, not section debris; don't chase it.
3. In `?solo=`, `gotoSection(name, p)` + the anchor-filtered light key make repeat captures framing-stable, but live GPU rasterization noise still forbids byte-hash assertions (infra-gl pitfall 1 stands).

## Open handoffs

- P4 copy pass may reword the working copy (budgets already honored; the "woven, not forged" thesis line is the brief's own).
- Alpine/Trail geometry (dika3d purchase) would let the family rail's live-tick walk the rail on CONFIG_CHANGE — wire-ready: the tick is a CSS class on `.strp__fam-item--live`.
- The 9-point azimuth sweep at rot 250 (LOOKBIBLE §7.2) was not re-run this lane: no dial in frame at any Straps beat (band macro only), so dial-legibility sweep evidence is vacuous here; flag if a later tune brings the case into frame.
