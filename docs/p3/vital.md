# P3 lane notes — living BPM + opt-in sound + loader match-cut (`vital`)

Status: **DONE, all checks pass** · 2026-08-26 · lane: P3 vital
Law followed: `docs/LOOKBIBLE.md` + `docs/p15/motion-bible.md` · contracts `docs/p1/engine.md`,
`docs/p15/plumbing.md`, `docs/p2/infra-gl.md` untouched · `sections/index.ts` untouched ·
spec source: PLAN §2 "Living BPM" / "Opt-in sound" / "Activity-rings loader … match cut" +
rubric `loader-honesty`.

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean ·
**engine-smoke ALL PASS · dial-smoke ALL PASS · cursor-smoke ALL PASS**
(`BASE=http://localhost:4573`) · **NEW `evals/vital-smoke.mjs` 21/21 ALL PASS** (headless real
Chrome, playwright-core `channel:"chrome"`) · captures in `docs/p3/vital/*.png` (below).

## Module map (additive)

| Module | Change |
|---|---|
| `src/ui/vital/vital.ts` (NEW) | `LivingVital` — persistent top-right chrome: mono tnum BPM readout, 2px ECG canvas trace drawn by the clock scalar, simulated HR 58↔142 off raw Lenis velocity, beat → QRS flash + ONE-FRAME 1.006 scale tick on `#stage`, bgStage-aware signal/counter-color, sound toggle. Mounts hidden at boot, reveals on `loader.ready` |
| `src/ui/vital/vital.css` (NEW) | chip styles; `body.vital-live .intro__vital { display:none }` retires the Intro placeholder (one instrument, never two); dark-ground variant; mobile bottom-right (mirrors the Intro anchor's ≤720px spec) |
| `src/ui/vital/sound.ts` (NEW) | `HeartAudio` — synthesized 1 Hz sub-audible tick + tempo-synced "lub-dub" low end (oscillator+envelope, zero audio files). AudioContext constructed LAZILY inside `enable()` — zero contexts until first opt-in |
| `src/ui/loaderMatchCut.ts` (NEW) | `runLoaderMatchCut` — flies the lifted rings SVG onto the hero screen, re-projecting the GLB `part_screen` bounding sphere through the live camera EVERY tween tick (tracks the entrance); resilience ladder screen → DOM anchor → fade-in-place; result in `window.__ONE_HERTZ_MATCHCUT__ {mode, dist, target}` |
| `src/core/loader.ts` | single arc → three activity rings (`.ring-fill--a/b/c`, `pathLength=100`); honest value unchanged (`min(real, timeCurve)`, 2.5 s floor); inner rings close on `shown^1.18` / `shown^1.4` (monotonic, never ahead, all close at 1); `+ onDismissStart?(rings)` lift hook; `?eval=1` path unchanged |
| `index.html` | loader block: 3 track + 3 fill circles (r 52/42.5/33) |
| `src/style.css` | ring triad colors scoped to `#loader-rings` (`--ring-move #ff2d55 / --ring-exercise #9bec2f / --ring-stand #00cde0`) — spent ONLY here (PLAN §2 color law) |
| `src/gl/lightKeyframes.ts` | `+ stageHex()` getter (last applied bgStage — the vital's dark-ground feed) |
| `src/core/debug.ts` | `+ VitalStateSnapshot`, `+ StateExtensions.vital`, `+ EngineStateSnapshot.vital?` (additive, schema stays v1) |
| `src/main.ts` | wires: `loader.onDismissStart → runLoaderMatchCut`, `LivingVital` construction, `vital.update(dt)` in the frame pipeline (after `lightDriver.update` — reads its applied ground), `vital.reveal()` on `loader.ready`, `extendState("vital", …)` |
| `evals/vital-smoke.mjs` (NEW) | 21 assertions: loader floor/monotonic/assets-first, match-cut landing ≤8px, BPM lerp up + recovery, beats at rest, eval pins (64/phase 0/0 beats), Nocturne signal flip, sound off-by-default + single-context + reduced-motion seal |

## 1 · Vital signal model

- HR sim: `velEnv ← |lenis.velocity|/55` (k=3 envelope) → target `58 + 84·velEnv` → asymmetric
  chase (rise k=1.4, recovery k=0.3 — cardio-shaped; measured live: rest 58, wheel-blast → 141,
  −54 bpm over 5 s idle).
- Beat phase integrates `dt·HR/60`; each wrap: QRS flash at the trace head (0.22 s decay) +
  `#stage` transform `scale(1.006)` applied for EXACTLY one engine frame (cleared at the top of
  the next `update`) + `HeartAudio.beat(hr)` when sound is on.
- ECG trace: PQRST waveform (5 complexes), reveal head = clock scalar; undrawn remainder is an
  18% hairline. Canvas repaints only when {clock, phase, flash, dark} change (dirty-flag
  discipline, byte-stable captures at rest).
- **Determinism**: display value through `bpm(live)` (eval → 64), phase through `ecgPhase`
  (eval → 0), sim fully inert under `?eval=1` (no beats between captures — gsap ticker keeps
  running in eval, so guarding on `isEvalMode`, not dt alone, is load-bearing).
- bgStage awareness: `lightDriver.stageHex()` luminance < 0.35 ⇒ `.is-dark` — signal flips to
  `--biosignal-nocturne` #FF375F, text to literal porcelain 92% (cursor-chip precedent:
  `--porcelain` is rewritten to the DARK value on those beats, so the token cannot be the
  counter-color). Verified: Nocturne 0.5 → `{dark:true, signal:"#ff375f"}`, Intro → back.

## 2 · Opt-in sound

- Default OFF, muted icon. First click constructs the ONE AudioContext (user gesture), toggle
  off suspends it (never a second construction — smoke-asserted via a wrapped constructor).
- Voices: 1 Hz triangle micro-click at gain 0.02 (sub-audible, scheduled on integer audio-clock
  seconds with 0.3 s lookahead pumped per frame) + two-stroke heartbeat (sine thumps 52→34 Hz /
  44→30 Hz, exponential decay, S1–S2 gap `min(0.32, 19/HR)` — shortens as HR climbs).
- `prefers-reduced-motion`: toggle renders disabled, no context possible; beat flash + scale
  tick also suppressed (trace still draws — it is scroll-driven, not autonomous).
- `store.uiFlags.soundOn` round-trips through `state()` (the flag existed in the P1 contract).

## 3 · Loader + match-cut

- Honesty preserved verbatim: `target = min(realProgress, elapsed/2.5s)`, smoothed pursuit,
  completes only when every task is done. Ring stagger uses POWERS of the honest value —
  monotonic, never ahead of it, all three close together at 1. Measured: gone at 3.6 s warm,
  41 monotonic samples, GLB bytes at 154 ms ≪ completion.
- Dismiss: rings lifted to `position:fixed` at their exact rect → handed to
  `runLoaderMatchCut` → shell fades 0.6 s (`ready` resolves there, boot behaviors never wait
  for the flight) → flight 1.2 s power3.inOut toward the LIVE projected screen center + px
  diameter (`boundingSphere` through `stage.camera`), crossfade from p=0.5, element removed at
  end. Landing measured `dist=0.0px`, `mode:"screen"`, projected dial ⌀≈351px.
- Fallbacks: watch missing → Intro `[data-anchor="loader-rings"]` rect; no anchor (solo of
  another section) or reduced-motion → 0.4 s fade in place. Handler throw → rings removed,
  loader continues (never a stuck overlay).

## 4 · Captures (`docs/p3/vital/`)

`loader-rings-mid.png` (triad closing, staggered) · `matchcut-mid-flight.png` (rings chasing
the entrance tumble — the money frame) · `matchcut-landing.png` (crossfade tail on the dial) ·
`vital-live-intro.png` (live chrome, 58 BPM) · `vital-eval-intro.png` (eval pin 64) ·
`vital-eval-nocturne-dark.png` (#FF375F variant over the AOD beat) · `vital-chip-midpage.png`
(trace ~77% drawn) · `vital-chip-sound-on.png` (opt-in state) · `vital-eval-mobile.png`
(390×844 — bottom-right placement).

## Pitfalls found this lane (inherit)

1. **Detached-canvas sizing**: a canvas measured before `document.body.append` reads 0×0 → 1×1
   backing store → CSS stretches it into a solid color block. Size AFTER insertion; a
   ResizeObserver keeps it honest.
2. **`[data-vital-value]` is ambiguous**: the Intro placeholder (display:none) matches first in
   document order — smoke selectors must scope to `.vital .vital__value`.
3. **Screenshot probes catch the custom cursor**: after `page.click` the difference-blend
   cursor dot parks over the target — move the mouse away before capturing UI states.
4. **Eval ≠ frozen time**: the gsap ticker runs under `?eval=1` with real dt; any live
   simulation must gate on `isEvalMode` explicitly or it drifts between captures.
5. `dial-smoke` "hand travels under wheel velocity" is timing-flaky near its Δsec≥0.5
   threshold (0.42 on one run, 0.55 on rerun) — pre-existing, unrelated to this lane.

## Open handoffs

- **Outro SWAP restart**: the restart lands on Intro with the vital already live (it never
  unmounts) — no work needed, but the outro lane should verify the trace head snapping to
  clock 0 reads intentional on the restart cut.
- **Nocturne section**: `state().vital.dark` flips from the driver's bgStage continuum; if the
  section's inner AOD dip wants the vital dimmed further, drive it via a CSS class on
  `body`, not by touching the vital's internals.
- **Perf lane**: vital adds one 2D canvas repaint per frame while scrolling (128×26 @≤2dpr) —
  negligible, but it is in the frame pipeline; `forceQualityTier` does not shed it.
- **Copy/P4**: sound toggle aria-labels are EN micro-copy ("enable heartbeat sound" /
  "mute heartbeat sound") — pass through the copy review with the credits slate.
