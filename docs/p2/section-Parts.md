# P2 lane notes — section Parts ("CALIBRE 1HZ" sensing table)

Status: **DONE, all gates green** · 2026-08-26 · lane: section-Parts
Law followed: `docs/LOOKBIBLE.md` (§1.5 #14 lighting keyframe · §4 type · §7 scrims/reveal greys · §8 copy budgets) + `docs/p15/motion-bible.md` (ease census, three domains, slot laws) — zero timings invented.

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean · **engine-smoke ALL PASS** (vite preview :4573, headless real Chrome, playwright-core `channel:"chrome"`) · lane captures 1600×900@2 with **zero console errors** on `?solo=Parts&eval=1&look=instrument` and full-page `?eval=1&look=instrument` · contextual state probe at Parts .5: `{active:"Parts", colorway:"natural-titanium", dialMode:"wayfinder", explode:"assembled", postStack:"default", --porcelain:"#E8EAED"}` (truthful contract: nothing written).

**Design-gate evidence** → `docs/p2/Parts/`: `solo-25.png` (title stack landed, first row rising) · `solo-50.png` (table inking in top-to-bottom, rows 1–5 dark / 6 mid / 7–8 ghost — the staggered scrub:2 ramp visible in one frame) · `solo-75.png` (full roster + the summary punchline `MODEL 1HZ · TOTAL WEIGHT · immaterial`) · `contextual-50.png` (full page via `gotoSection` — verified genuinely captured from the full-page load by its state probe, yet **byte-identical** to solo-50: the chase camera + the full-page-equivalent `freezeClock` in the solo capture reproduce the exact same inputs, and this machine's eval render is fully deterministic — the strongest parity proof available; note infra-gl pitfall #1 says do NOT rely on byte-stability in assertions). Note for readers: the red hairline at the frame top is the site-wide clock consumer (`body::after` scaleX(--clock)), not a section artifact — at Parts the page clock is ≈0.96.

## 1 · Signature inversion (PLAN §2)

The source's Parts table sums component WEIGHTS up to its title (MODEL 146GR, rows "Dial · 01 · Mechanism · 11 Gr"). Ours keeps the exact table grammar — plus glyph · name · index · category · value, rows inking in as the scroll passes, picker card top-right — and inverts the payload: ghost `CALIBRE` over solid colossal `1HZ`, ten SENSING INSTRUMENTS with Hz / g-force / precision values, category column = sensing domain (OPTICAL / ELECTRICAL / THERMAL / INERTIAL ×2 / BAROMETRIC / HYDROSTATIC / SATELLITE / MAGNETIC / ACOUSTIC — no repeated-placeholder shortcut), and the closing line lands the thesis joke: **total weight: immaterial**. All copy inside §8 budgets (labels ≤16, values ≤12, whole table Geist Mono + tnum per the §4 "CALIBRE table always mono" law). The source's static watch PHOTO card top-right becomes the LIVE product: the 3D watch composed into that exact slot.

## 2 · Beat sheet (pinned 200svh; DOM = fraction-domain paused GSAP timeline + imperative reveals)

| p window | Beat |
|---|---|
| .06–.28 | title stack: eyebrow `14 · CALIBRE`, split-char ghost `CALIBRE` (chars xPercent −110→0 power3.out, opacity linear first half, stagger .007) then solid `1HZ` (stagger .014), lead ≤48 |
| .18–.28 | colorway picker card rises (y 44→0 power3.out — the image-grid rise grammar) |
| .22–.625 | rows ×10: row i rises at .22+.035i over .09 (power3.out + linear opacity), hairline rule draws scaleX 0→1 (the --bar-scale reveal) |
| .26–.76 | scrub:2 grey reveals: per-row name+value `#BCBCBC→#323232` (LIGHT-ground law pair §7.3; Intro/Movement precedent) via a per-row `--prt-reveal` custom property, centers .32+.038i, half-widths alternating .06/.10 (the 15/25 window pattern); live-only 2 s catch-up lag (k=2.2 on the gsap ticker), eval applies targets directly — deterministic captures |
| .66–.8 | summary line rises + reveals (`MODEL 1HZ · TOTAL WEIGHT · immaterial`) — resolved before pin release |
| .05–.22 / .82–.97 | camera blend plateau in / out (below); zero at both boundaries |

No departure tweens: the pin releases at p=1 and the whole frame scrolls off physically (source parity — its 161vh Parts is content-scrolled). No wall-time consumers; no state writes; `zoomMultiplier: 1` (DOM-led section, motion-bible law 8).

## 3 · Budget bump (the motion-bible §8 ⚠ case, executed)

`SECTION_VH.Parts` **100 → 200** (`src/core/constants.ts`, comment left at the site). This is the bible's own pre-sanctioned fix ("budget bump, never a local hack"): the source measures Parts at **161vh** content-sized, and at 100svh the unpinned track equals the viewport, so `?solo=Parts` has **zero scrub runway** (track == page ⇒ maxScroll 0 ⇒ degenerate bounds — first capture round proved it: DOM frozen at p≈0, no reveal grammar possible). At 200svh the track pins with a one-viewport sticky range; DOM progress spans [top, top+height−vh] and hits 1 at pin release. Ripple: page maxScroll grew 900px (@900 viewport) — any OTHER lane's capture script with hardcoded full-page scroll constants (e.g. the full-page-equivalent `freezeClock` values from section-Nocturne pitfall #3) shifts by +900 past Colors; address via `gotoSection`, not raw px.

## 4 · Camera — pose override, face-on beauty plate frame-right

Third consumer of `rig.setPoseOverride` (Mechanism established it; Disassembly owns `authorTimeline`). Recipe = LOOKBIBLE §1.6 face-on beauty plate (render-03: straight down the 35° dial normal) chasing `productAttitude(getClock())` per frame, so **solo == full page == any scroll position**: standoff **10.0** (card-scale product read), theta +0.14 (a breath of three-quarter), phi −0.06 (marginally above the normal), aim −1.9 lateral / −1.35 down in world so the watch composes **upper-right** — the slot where the source parks its photo card — clearing title (left) and table band (lower). fov 35, parallax stays live (not a macro, law 7). Blend plateau in .05–.22 / out .82–.97; released on `onLeave` and whenever the GLB is absent. Lighting untouched: the keyframe driver holds instrument's Parts key (rot 350 / envInt 1.0 / porcelain ground) — in solo the anchor filter parks it on this section's light for free (infra-gl pitfall #4).

## 5 · Shared-file edits this lane made

1. `src/sections/index.ts` — `PartsSection` import + case (the sanctioned two lines).
2. `src/core/constants.ts` — the §3 budget bump, one value + comment.

## 6 · State contract (truthful, boot-asserted)

`requiredEnterState { explode: "assembled" }` (a calibre table over an exploded case is nonsense) · `guaranteedExitState {}` — nothing written, override released both directions (`onLeave`). Contract folds clean through the neighboring placeholders (Colors before, Footer after at build time).

## Pitfalls found this lane (downstream must inherit)

1. **Never set `height` on your `.pin` skin class.** `.prt { height: 100% }` (copied from a 100svh section) rebinds the pin to the FULL 200svh track — same specificity, later import order wins — killing the sticky travel and shoving every bottom-anchored block off-frame. `.pin` already owns `height: 100svh`. Symptom: title absolute-top off-screen, table clipped at the frame bottom. (Timeless's `.tml { height: 100% }` is only safe because that track IS 100svh.)
2. **A 100svh section has no solo sandbox.** Unpinned track == viewport ⇒ maxScroll 0 ⇒ `gotoSection(name, p)` can only land p=0 — nothing scrubbable, camera override inert (plateau(0)=0). If your section's grammar must be demonstrable in `?solo=`, it needs pin runway (see §3) — check BEFORE authoring beats against localProgress.
3. **The clock hairline photobombs light sections.** `body::after` (biosignal red, scaleX = page clock) reads as a full-width top bar in captures near the page end. It is the site's designed clock consumer — don't "fix" it, don't crop it out of evidence, just annotate.
4. The per-row reveal rides ONE custom property (`--prt-reveal`) that name + value + dim columns all derive from via `color-mix` — one style write per row per frame, and the whole line inks as a unit (11 writes worst-case; cheap, cached by value).

## Open handoffs

- **P3 colorway SWAP**: the picker card is a live DOM slot — `[data-colorway-slot="parts"]`, `data-cursor-text="swap"` (fixed cursor vocabulary), ring SVG with a quarter-arc + Ocean core dot ready to animate; dual-placement partner is the outro's picker (Footer lane). Wire CONFIG_CHANGE here and re-shoot `solo-50` under DLC (its beauty beat is a different lighting story, LOOKBIBLE §1.3).
- **P4 copy**: all strings are working copy inside §8 budgets (labels 7–14 chars, values 4–11, lead 28, eyebrow 12); the sensing-domain column and `immaterial` punchline are load-bearing to the inversion — polish wording, keep the shape. No em dashes used.
- **9-point azimuth sweep** (LOOKBIBLE §7.2 sign-off duty): rot 350 passes visual read on all four frames (ink dial legible, one continuous bezel-rim specular, no crystal sheet); formal sweep-harness run left to the P3 verify pass alongside the other sections.
- Mobile: ≤720px drops index+domain columns (name/value survive — the source's cut); the picker card docks bottom-right. Not yet screenshot-verified on a device profile — fold into the P3 mobile pass.
