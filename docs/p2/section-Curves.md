# P2 lane notes — section-Curves (BPM catalog card #1: 58 / 220 — Guarded Contours)

Status: **DONE, all gates green** · 2026-08-26 · lane: section-Curves
Law followed: `docs/LOOKBIBLE.md` (§1.5 #7 lighting keyframe rot 170 · §7 scrims/reveal colors · §8 catalog-card copy budgets) + `docs/p15/motion-bible.md` (Presentation-group .25–.5 grammar, ten laws) · contracts `docs/p1/engine.md` + `docs/p15/plumbing.md` + `docs/p2/infra-gl.md` (keyframe driver, setPoseOverride) + `docs/p2/infra-type.md` (type tokens).

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean · **engine-smoke ALL PASS** (headless real Chrome, playwright-core `channel:"chrome"`, vite preview :4573; the lifecycle check asserts `is-center` on Curves specifically — see pitfall 1) · zero console errors on `?solo=Curves&eval=1` and the full-page `?eval=1` capture pages · state truthful at all captures: `{blend:1, standoff:5.299→3.5, bpm:0→58}` — the BPM count lands exactly 58 by the .5 macro hold · contextual frame == solo frame at 0.5 (solo/live parity holds by construction: the pose chases `{caseSpace, clock}` only).

**Design-gate evidence** → `docs/p2/Curves/`: `solo-25.png` · `solo-50.png` · `solo-75.png` (1600×900@2, `?solo=Curves&eval=1`, gotoSection .25/.5/.75) · `context-50.png` (full page `?eval=1`, gotoSection Curves 0.5 — the page-truth frame). The red hairline at the top of every frame is the site-wide P1 clock hairline — global chrome, not this section's. Dial legibility at the rot-170 keyframe read on the rendered frames per §7.2: ink dial fully legible at all three beats (the streak strip grazes the chamfer without sheeting the crystal); the 9-point sweep harness (`infra-gl` scratchpad pattern) stays available if a council wants comparative azimuth evidence.

## What was built

`src/sections/curves.ts` + `src/sections/curves.css` (scoped, imported by the module) replace the Curves placeholder (registered in `sections/index.ts` — my two lines only; concurrent lanes' registrations untouched). DOM self-rendered into the track's `.pin` (index.html untouched). One additive edit in `core/debug.ts`: `curves` key in `StateExtensions` via `extendState` (Disassembly's precedent; schema stays v1).

Source grammar → ONE HERTZ translation (Curves_* reference frames):

| Source (ELEGANT CONTOURS catalog page) | Ours |
|---|---|
| hairline crosshair guides with small "+" registration marks | same technical-drawing grammar: vertical + horizontal hairlines draw in via scale transforms (the `--bar-scale` reveal, power3.out), "+" marks fade with stagger |
| centered pre-title index over a two-line display headline | `CATALOG · 01/03` mono caps → **GUARDED / CONTOURS** split-char Clash Display 300 (display tier, not colossal — the colossal voice stays with the word-stacks) |
| two-line sub-copy under the headline | "The sapphire dome falls away into a titanium chamfer. / A raised lip guards the glass, machined from the case." — the semantic swap: the source celebrates elegance, ONE HERTZ reads the case as armor (the raised guarding lip, brief-verbatim) |
| watch rising into the lower half as a macro | dial-normal macro chase — the dome/chamfer/guarding-lip read, watch composed low under the headline |
| (no source equivalent — PLAN §2 addition) | **BPM figure block** bottom-left: numerator counts 0→58 (Clash 300 tabular numerals) over `/ 220 bpm` mono + caption + the 01/02/03 page rail (01 active, underlined) |

Copy inside §8 budgets: pre-title 15c caps · headline 7/8c per line · sub ≤54c each · card = value + unit mono, caption 42c — P4 polishes wording.

**Page-flip grammar (shared denominator, PLAN §2):** Curves=01/58 → Hands=02/96 → Straps=03/142, all over the fixed `/220` (max heart rate). This card is the grammar's first instance; Hands and Straps carry the same figure-block anatomy (mono eyebrow · numerator/denominator baseline row · caption) so the three read as consecutive pages of one catalog. The page rail (01 02 03, active in full ink) makes the flip legible on every card.

State contract (truthful): `requiredEnterState {explode:"assembled"}` (an exploded fan has no dome/chamfer macro) · `guaranteedExitState {}` — the pose override blends fully out by p=1, no state axis written. Longpress zoom = default 1.35 (law 8 table). Cursor: `data-cursor-text="holdToExplore"` (fixed vocabulary).

Lighting: entirely the infra-gl keyframe driver's (instrument.json Curves key: rot 170 · envInt 1.0 · no bgStage ⇒ porcelain ground — "streak strip grazes the chamfer, light rehearses the copy"). Zero lighting invented here. Scrims ride the live `--porcelain` token (§7.1): top vertical gradient 55→0 behind the card copy, local radial 52→0 behind the figure block — never a hard panel.

## Timelines (domains declared, law 4)

- **DOM** (scrub-fraction, paused GSAP padded to 1): guides draw .06/.08 power3.out, marks .1 · pre-title .04 · split-char headline lines at .07/.11 — xPercent −105→0 power3.out + linear opacity over the first half (§3 scrub:true grammar) · sub block .18, figure block .36 power3.out (just ahead of the count window) · departures power2.in from .84, fully gone by ≈.89 (before the .9 camera blend-out — wave-1 gating grammar). Imperative in `tickDom`: 2 grey-line reveals (centers .27/.36, half-widths alternating .06/.10 — the 15/25 pattern) `#BCBCBC→#323232` (§7.3 light-ground pair), lag k=2.2 live-only on the gsap ticker, instant under `?eval=1` (Movement's dt-lag precedent — no second smoothing owner) · BPM numerator = pure linear map of progress over [.38,.5] (the number IS the scroll; Nocturne's Sleep Score precedent).
- **WebGL** (scrub-fraction, paused GSAP padded to 1, power3.inOut): blend-in + parallax off .0–.12 (macro law 7), watch composed frame-RIGHT (the source's sweep-right entering Curves) · recenter .1–.4 (lat −0.6→0 — centered by .5, source shape) · **the one big move** .15–.5 dolly 5.4→3.5 down the dial normal onto the dome/chamfer macro · theta drift .5–.75 (+0.2 — the rot-170 streak crawls the chamfer under a moving eye; paired small move ≤.25, law 7) · ease-off .75–.9 (→4.2, ≈0.5× the opener, law 3 shape) · blend-out .9–1 → the base rig owns both handoffs (Movement in, MovementWatchRight out). Pose chases the dial normal through `caseSpace` + `productAttitude(clock)` — pure function of {clock scalar, progress}, wall time banned (law 9); eval settle is a fixed point (no internal lerp anywhere). If the GLB failed (`caseSpace` null) the override never activates — the DOM card still owns the beat (degrade, never break).

## Pitfalls found this lane (downstream must inherit)

1. **Replacing a placeholder drops its `is-center` duty silently.** The `.is-center` track class is applied by each section's OWN `onEnterCenter`/`onLeaveCenter` (placeholder behavior — there is no base-class default), and `engine-smoke` asserts it on Curves by name. A real section that overrides lifecycle without re-adding the toggles passes visually and fails the gate. Fix shipped in `curves.ts`; every future placeholder replacement must carry the two-line toggle forward (Timeless/Nocturne/Straps already do).
2. `onLeave` ≠ `onLeaveCenter`: releasing the pose override belongs in `onLeave` (viewport exit), the class toggle in the center-line pair — conflating them either leaks the class or drops the override early.

## Open handoffs

- **Hands lane**: `src/sections/hands.ts` currently lacks the `is-center` toggles (same pitfall 1; the smoke gate only asserts Curves + Straps so it passes today). Two-line fix per the pattern above.
- P4 copy pass owns final wording inside the §8 budgets; the figure-block anatomy is the shared page-flip contract — change it in all three cards or none.
