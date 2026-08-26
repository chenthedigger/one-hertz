# P2 lane notes — section-Colors (`src/sections/colors.ts` + `colors.css`)

Status: **DONE, all gates green** · 2026-08-26 · lane: section-Colors
Law followed: LOOKBIBLE §1.5 #13 (recovery ramp, rot 330 / envInt 1.0 — section invents zero lighting) · §1.6 (render-03 face-on beauty plate as the presentation camera) · §2 (colorway declaration: `--first/second-color` pair) · §4 (type ramp, staggered second-line indent, ghost/dim tones) · §7 (scrims from ground tokens, §7.2 dial-legibility-over-drama, §7.3 light-ground greys) · §8 (copy budgets) · motion-bible whole (source "Colors group" grammar §4: dolly-out .2 @.1 · settle power3.out @.15 · rotation→0 @.5 · parallax ON @.15 / OFF @.5; grey-line lag as §7.10 windows).

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean · **engine-smoke ALL PASS** on the final dist (headless real Chrome, playwright-core `channel:"chrome"`, vite preview :4573) · `?solo=Colors&eval=1` settles at .25/.5/.75 with correct `{active:"Colors", pinState:"pinned", colorway:"natural-titanium", dialMode:"wayfinder"}` and **zero console errors** (solo AND full-page contextual runs) · solo == contextual framing by construction (attitude-chasing pose override).

**Design-gate evidence** → `docs/p2/Colors/`: `solo-25.png` (colossal split-char `ONE HEART, / FOUR LIGHTS.` occluding through the tilted wide hero — the source's Timeless type-through-watch grammar on the recovery ground) · `solo-50.png` (grey-line reveal block center-left, first line landed `#323232`, watch settling right of center) · `solo-75.png` (THE plate: near-symmetric face-on hero inside the scroll-drawn edition ring, editions rail with active `01 NATURAL/OCEAN`, reserved `03 ALPINE` / `04 TRAIL` ghosted, dial fully legible with the red seconds discipline) · `contextual-50.png` (full page via `gotoSection` — matches solo-50).

## 1 · Beat sheet (pinned 450svh — the longest beat; DOM = fraction-domain paused GSAP timeline + imperative ring/grey ticks)

| p window | Beat |
|---|---|
| entry | ground = the keyframe driver's Nocturne→Colors ramp (#0A0B0D→#E8EAED between section centers) — the source's stage-dim in/out IS this ramp in our build; the section adds no lighting |
| .02–.12 | dawn tag `DAYBREAK · 06:00` (Nocturne's `NOCTURNE · 22:00` bookend) — porcelain micro-caps on an INK scrim so it reads on the dark tail AND in solo (where the anchor filter holds porcelain constantly); gone before the ground lightens |
| .13–.33 | headline beat: eyebrow `13 · EDITIONS`, colossal split-char `ONE HEART, / FOUR LIGHTS.` (chars xPercent −105→0 power3.out, opacity linear first half, stagger .004; second line indented 0.4em per §4), lead 41 chars; departs .36–.42 power2.in |
| .40–.60 | grey-line reveals ×3 (35/29/26 chars) center-left: `#BCBCBC→#323232` power3.inOut in §7.10 staggered windows (.42–.52 / .445–.575 / .47–.57 — 15/25-style alternating widths), raw progress, Lenis carries the lag; block departs .60 power2.in |
| .58–.84 | edition ring: scroll-drawn dash (linear over the window — the drawing-with-scroll signature; the source's 3 s wall-clock ring draw belongs to P3's SWAP) around the settling plate |
| .62–.78 | editions rail rises (y 26→0 power3.out, stagger .02) with per-slot `--bar-scale` hairlines (scaleX 0→1 power3.out); caption in @.72 |
| .92–.97 | rail + ring depart power2.in before the pin releases into Parts |

## 2 · Camera — recipe-scrubbed pose override chasing the dial normal

`rig.setPoseOverride` (the multi-section seam — Disassembly owns `authorTimeline`; Mechanism/Nocturne precedent), driven by a PAUSED fraction-domain recipe timeline: blend-in .0–.15 (arrive on the drag-tilted wide hero, thetaOff .85 / phiOff −.3 / lat .65 — watch composes right, copy column left) · **dolly-out standoff 5.2→8 (dur .2 @.1, source-exact — the recovery breath)** · settle thetaOff→.42 power3.out @.15 with parallax ON (source parity) · **recenter @.5 (dur .2): lat→0, parallax OFF, plate held .7–.9** · small press-in 8→7.5 @.75 · blend-out .9–1. Per frame the recipe composes into the override by rotating `caseSpace.zAxis/origin` through `productAttitude(getClock())` — solo == full page == eval at any clock.

**Empirical §7.2 finding (this lane): the dead-on plate washes the dial.** thetaOff/phiOff 0/0 puts the crystal at normal incidence and the emissive screen + bloom sheet white (first-capture evidence). The plate keeps a residual off-axis **thetaOff .12 / phiOff −.05** — still reads symmetric, dial fully legible (final `solo-75.png`). Any future face-on beat should inherit this: never park exactly on the dial normal under bloom.

## 3 · Editions + CONFIG_CHANGE consumer (the P3 socket, wired live)

`EDITIONS` table (open colorway tokens the P3 emitter should speak): `01 natural-titanium×ocean` (live, = INITIAL_STATE) · `02 black-dlc×ocean` (payload ready — instrument.json `x_dlcVariant`) · `03 natural-titanium×alpine` / `04 black-dlc×trail` (**reserved** — blocked on the $30 dika3d band geometry; ghost-tone slots, dashed hollow chips). Chip hexes are the LOOKBIBLE §1.3 material anchors — UI chips only, never material truth (band colors are judged on rendered frames).

`bus.on(CONFIG_CHANGE, {finish, band})` → active-slot class swap (CSS `.5 s linear` label crossfade — the source's config-text grammar), section-scoped `--first-color/--second-color` rewrite (§2 colorway declaration), and the ring indicator dot walks to the slot via `--col-arc-rot` (CSS `transform 1 s cubic-bezier(.215,.61,.355,1)` — the source picker's circle-svg ease, motion-bible CSS census). Unknown ids are ignored (P3 owns the vocabulary). Not wired here on purpose: the 1.2 s power3.inOut colorway CSS-var tween, material tweens, transition overlay/text sweeps — all the SWAP mechanic's wall-clock allowance (§8 row 13), P3's to ship. This section never writes the store; it only listens.

Rail carries `data-cursor-text="swap"` (fixed vocabulary, declarative channel) so the cursor context is live the day P3 lands.

## 4 · State contract (truthful, boot-asserted)

`requiredEnterState {explode:"assembled", dialMode:"wayfinder"}` (a colorway plate of an exploded or AOD watch is nonsense; Nocturne guarantees exactly this hand-off) · `guaranteedExitState {}` — scroll changes nothing here; `onLeave` releases the pose override both directions. Zoom multiplier stays the default 1.35 (neither macro nor DOM-only).

## Pitfalls found this lane (downstream must inherit)

1. **Dead-on dial normal = washed dial** (§2 above). Keep ≥~0.1 rad off-axis on any face-on beat while bloom is on the screen layer.
2. **The recovery ramp makes the section double-grounded**: p<~.15 the live ground is mid-grey (full page) but PORCELAIN in solo (infra-gl pitfall #4 — the anchor filter holds the section key). Anything shown early must read on BOTH — the dawn tag does it by carrying its own ink scrim; ink display type is deferred to p≥.13. Don't trust solo captures alone for entry-window legibility.
3. `noUncheckedIndexedAccess` is on: `EDITIONS[i]`/`querySelectorAll` loops need guards — write them up front, tsc strict is the gate.
4. sections/index.ts is hot: two other lanes (Images, Parts) landed between read and edit this session — Edit tool with your own anchor lines only, exactly as briefed.

## Open handoffs

- **P3 SWAP mechanic**: emit `CONFIG_CHANGE {finish, band}` with the table's ids; add the wall-clock choreography (swap 1.0 material tween via payload duration, CSS pair 1.2 power3.inOut, overlay sweep 1+1, transition text 1/1, ring draw 3.0) — the DOM sockets (slots, chips, `--first/second-color`, `--col-arc-rot`, cursor text) are live. When DLC swaps in, the LOOKBIBLE §1.3 DLC signature lighting (streak_chamfer_a onto the top edge) is the colorway mechanic's env-rotation keyframe, not this section's.
- **Alpine/Trail**: on the dika3d purchase, fill slots 03/04 (`ready:true`, real chip hexes judged under the shipped env) — no structural work left.
- **P4 copy**: all strings inside §8 budgets (headline 10/12, lead 41, grey lines 35/29/26, caption 52, eyebrow 13, dawn 16); mechanics are wording-agnostic. No em dashes used.
- **9-point azimuth sweep** (§7.2 sign-off duty): the plate passed visual read at the section key (rot 330) after the off-axis fix; the formal sweep-harness run rides the P3 verify pass with the other sections.
