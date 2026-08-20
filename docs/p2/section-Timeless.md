# P2 lane notes — section-Timeless (`src/sections/timeless.ts` + `timeless.css`)

Status: **DONE, all gates green** · 2026-08-21 · lane: section-Timeless
Law followed: LOOKBIBLE §1.5 #2 (rot 15 / envInt 1.0 — zero lighting authored here, the keyframe driver holds the key) · §4 (type ramp, tone hierarchy, 600-ban) · §7 (scrims from the porcelain ground, light-ground greys) · §8 (word-stack + eyebrow + body budgets) · motion-bible whole (scrub:true char grammar §3, scrub:2-as-lag §7.10, fraction grid, one-orbit-per-beat law 7).

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean · **engine-smoke ALL PASS** (fresh run against the final dist) · lane proof **11/11 PASS** (headless real Chrome, playwright-core `channel:"chrome"`, 1600×900@2, vite preview :4573): solo runway bounds [0,1800], solo .25/.50/.75 progress landings, contextual full-page .5, **Intro→Timeless takeover pose continuity at p=.2 (Δ 0.037 world units across .19→.21)**, truthful state (dialMode/explode untouched), roam to Mechanism/Intro clean, zero console errors on `?solo=Timeless&eval=1` and `?eval=1` · live non-eval `?solo=Timeless` full scroll-through: zero console errors.

**Design-gate evidence** → `docs/p2/Timeless/`: `solo-25.png` (hero luminous dial held from the Intro handoff, ghost TIMELESS backdrop, THE / TIRELESS entering from below) · `solo-50.png` (**the signature frame**: dead edge-on down the band-loop axis, the Ocean band an open ring, full tonal stack THE / TIRELESS / ELECTRICAL / WATCH / threading the ring — the Timeless_0.5 source read) · `solo-75.png` (back three-quarter movement side, both info labels revealed flanking — the Timeless_0.75 read) · `contextual-50.png` (full page via `gotoSection` — identical to solo-50 by construction, solo runways + frozen clock).

## 1 · Beat sheet (unpinned 100svh; full-page window [top−vh, top+height] = 200 vh)

DOM = one PAUSED fraction-domain GSAP timeline (padded to 1) + imperative grey reveals:

| p window | Beat |
|---|---|
| 0–1 | **the sweep**: stack wrapper yPercent +22→−22 linear + per-line differential ±(i·30 px) — the source's slower-than-scroll line rates; ghost `TIMELESS` backdrop fades in .04–.14 (9% ink tone layer) |
| .06–.12 / .55–.61 | eyebrow `02 · TIMELESS` arrival power3.out / departure power2.in |
| .14 + k·.08 | word k split-char reveal (chars xPercent −110→0 power3.out dur .09, opacity linear first half, stagger .004): THE .14 · TIRELESS .22 · ELECTRICAL .30 · WATCH / .38 — word-by-word cadence in the scrub domain |
| .56 / .60 | SENSING / SILICON MOVEMENT label blocks arrive (power3.out rise + linear opacity) — after the stack has swept clear of their zone (source shows labels only at .75) |
| .62–.795 | grey-line reveals ×4 (scrub:2 grammar as staggered windows, §7.10): #BCBCBC→**#323232** (light ground, Disassembly precedent), power3.inOut, alternating offsets; live lag k=2.2 on the shared ticker, **eval snaps** (captures = pure function of scroll) |

Copy budgets (§8): stack = 4 words, lines 3/8/10/7 chars (≤34) · eyebrows 13/7/16 (≤18 caps) · label bodies 95/71 chars as 2 lines each (≤220). Tone diagonal (§4): THE 32% ghost → TIRELESS 55% dim → ELECTRICAL 94% ink → WATCH / 32% ghost, staggered indents 34/7/0/21 vw; ELECTRICAL and WATCH lines carry soft porcelain radial scrims (§7.1/§7.5 — the ghost line grazes the bracelet at the late beat), label blocks carry the 55% porcelain gradient scrim.

## 2 · Camera — the Intro handoff seam (READ THIS before touching any section in the Intro group)

**The rig pose-override slot is winner-takes-all and sections tick in canonical order** — Timeless ticks after Intro, so from the first frame Timeless sets a blend > 0, Intro's override is silently discarded whole (they do not compose). A naive blend-in mid-Intro pops the camera. The seam shipped here is a **coordinated pose-matched takeover**:

- Intro holds its hero frame at blend 1 through its p .4 = scroll 360 = **Timeless p .2** (the windows align by construction — Intro's blend-out .4–.9 becomes dead machinery on the real page; it still runs in `?solo=Intro`).
- At p .2 Timeless snaps blend 1 (`tl.set`, scrub-revertible) with a pose computed from **Intro's hero formula verbatim** (`theta = rotY + .3, phi 1.29, radius 5.65, lat .53, sink .34` — the `INTRO_HERO` const block): the steal is pixel-continuous (proof: Δ 0.037 wu across the boundary).
- .25–.5: ONE orbit mixes hero → **dead edge-on down the band-loop axis** (case-local +x under `productAttitude(getClock())` — `lerpAngle` mix, power3.inOut, midpoint lands the edge exactly at p .5); radius 5.65→5.2, sink→0, lat→.18 ride along (law 7 small-position pairing).
- .5–.75: `post` swing continues the SAME rotation direction +0.85 past the edge to the back three-quarter (sign chosen empirically — the first build used −0.85 and the orbit visibly rewound between .5 and .75).
- .85–1: blend released to base; VerticalText blends in from its own p 0 (scroll 1800 — no overlap, verified against its guard pattern).

Both anchors chase the clock-derived attitude, so solo == full page == live framing (Nocturne's chase-camera argument, extended to a two-anchor mix).

## 3 · Solo runways (Intro's reusable pattern, extended)

An unpinned 100svh track alone on the page has maxScroll 0 — and this lane found the nastier variant first: **the section's own animated overflow (swept type translated below the track) leaked ~275 px of scrollable area, so solo bounds came out [0,275] and every capture landed on garbage geometry.** Fix = Intro's sandbox runway, doubled: one plain 100svh div **before** the track (restores the enters-from-below traversal, so `top−vh` = 0 exactly as on the real page where Intro precedes) and one **after** (restores maxScroll). Solo geometry then equals the full page **exactly** ([0,1800], proof-asserted). Injected in the constructor before boot's measure, `params.solo === "Timeless"` only. Images/Parts/Footer lanes: unpinned sections that follow another section should take BOTH spacers, not just Intro's trailing one.

## 4 · State contract (truthful, boot-asserted)

`requiredEnterState { explode:"assembled" }` · `guaranteedExitState {}` — Timeless reads the assembled hero and writes nothing; the pose override is released in `onLeave` and at both scrub boundaries (blend 0 before p .2 by Intro ownership, 0 again by 1.0).

## Pitfalls found this lane (downstream must inherit)

1. **Pose overrides do not compose — sequence them.** Two sections with overlapping webgl windows both calling `setPoseOverride` = later tick order wins wholesale. Either align your takeover with the neighbor's held frame (pose-matched snap, §2) or keep windows disjoint. Grep the neighbor's recipe constants before authoring yours.
2. **`activeSection` ≠ "my progress is mine": for an unpinned section, localProgress > .5 puts the viewport center line in the NEXT track** — `state().activeSection` reports the neighbor (or null in solo past the runway). Assert on `progressDom`, not on `activeSection`, for late-beat captures.
3. **Animated overflow silently mutates solo geometry** (§3). Anything you translate below your track's bottom edge adds scrollable area; on the real page it's swallowed by the next track, in solo it becomes a phantom runway. Either keep worst-case transforms inside the track or ship real runways.
4. **Parallel-lane dist races**: `vite preview :4573` serves `dist/` from disk while sibling lanes rebuild it — a capture pair seconds apart can straddle two different builds (this lane burned an hour on a "mystery" attitude difference that was two dists). Re-run `npm run build` immediately before any capture batch you intend to compare.
5. `INTRO_HERO` duplicates Intro's private recipe values by necessity (factory seam passes only the rig). If the Intro lane retunes its hero recipe, this block must move with it — flagged as an open handoff below.

## Open handoffs

- **P4 copy**: all strings are working copy inside §8 budgets; the split-char/reveal mechanics don't care about wording. No em dashes used.
- **Intro lane**: consider exporting the hero recipe constants (or a `heroPose()` helper) from `intro.ts` so the `INTRO_HERO` duplication dies; until then the two blocks are one unit of change.
- **VerticalText handoff**: my blend-out .85–1 returns to the base pose and VT blends in from scroll 1800 — works, but the double gesture (release + re-grab) could become a single coordinated steal like §2 if the VT lane wants it.
- **9-point azimuth sweep** (LOOKBIBLE §7.2 sign-off duty): rot 15 is one keyframe step off the swept-clean rot 0; the .25 hero frame reads dial-legible, the .5/.75 frames are band/back beats with no dial at risk. Formal sweep run left to the P3 verify pass alongside the other sections.
- **P3 colorway swap**: frames verified on natural-Ti × Ocean only; the edge-on ring pass is band-colored wall-to-wall — re-shoot `solo-50` when DLC/Alpine/Trail land.
