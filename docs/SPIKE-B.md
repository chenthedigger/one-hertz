# Spike B — engine vertical slice

Status: **DONE, all checks pass** · 2026-08-20 · seeds the real P1 codebase (typed, zero framework)
Scope: PLAN §3 scroll architecture decision record, implemented exactly; loader + hero + one pinned 300svh section.

## What was built

Vite + vanilla TypeScript (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) + three.js + GSAP + Lenis. No ScrollTrigger import anywhere.

| File | Role |
|---|---|
| `src/core/constants.ts` | `LENIS_DURATION=4`, per-section vh budget table (`SECTION_VH`, recon 300/400/450), WebGL lerp constant, iOS resize guard px, motion-bible default eases |
| `src/core/scroll.ts` | `ScrollEngine`: Lenis(duration 4), `lenis.raf` driven from `gsap.ticker`, `lagSmoothing(0)`, RAW `lenis.scroll` read per frame, debounced resize with <120px height-only ignore on touch |
| `src/core/registry.ts` | `SectionRegistry` + `Section {name, duration, tick(progress)}`; local progress from raw scroll; `(sectionId, localProgress)` → absolute scroll (eval transport) |
| `src/core/clock.ts` | Single clock scalar → CSS `--clock` custom property + shared `uClock` uniform object; `freezeClock(seed)` |
| `src/core/events.ts` | Typed `EngineEvent` enum (all 9 recon events) + typed payload map + minimal `EventBus` |
| `src/core/loader.ts` | SVG arc loader fed by REAL weighted task progress (fonts.ready, stage/env build, 3 settled frames); arc = `min(real, timeCurve)`, never lies; resolves only when all tasks done |
| `src/core/debug.ts` | `window.__ONE_HERTZ__ {sections, gotoSection, state, freezeClock, forceQualityTier}` |
| `src/webgl/stage.ts` | Renderer (ACES filmic, SRGB), PMREM env from generated gradient with horizontal specular band (lightformer stand-in), torus-knot placeholder in clearcoat "titanium", quality-tier pixel-ratio shed |
| `src/webgl/cameraRig.ts` | Orbit+dolly as PAUSED GSAP timeline (3 beats), scrubbed via `.progress()`; WebGL master progress lerps (`1-exp(-dt·8)`), scroll position never re-lerped |
| `src/sections/hero.ts` | Unpinned 100svh intro, DOM channel only |
| `src/sections/one.ts` | Pinned 300svh: WebGL channel (rig) + DOM channel (copy windows on raw progress) — dual-channel pattern from recon |
| `src/style.css` | CSS `position:sticky` pinning (track 300svh / pin 100svh), porcelain/ink/biosignal tokens, `--clock` hairline consumer, Lenis CSS subset |
| `index.html` | Loader shell + two tracks; `?scroll=<section>` deep link honored after load |

## Verified (empirically, not claimed)

- `npm run build` (tsc --noEmit + vite build): **clean**, 0 errors. Bundle 617KB / 166KB gzip (one chunk — see P1 questions).
- `npx vite preview` + curl: index 200 (1.8KB), JS asset 200. "ONE HERTZ" present.
- Headless real-Chrome smoke (playwright-core, npx cache route per tooling notes): **zero console errors**; loader resolves and removes itself; `gotoSection("one", 0.5)` → scroll 1800, section progress exactly `0.5`; sticky pin `getBoundingClientRect().top === 0` mid-track (no ScrollTrigger, no jitter at 1600×900); `freezeClock(0.25)` reflected in state + CSS hairline; `forceQualityTier(2)` applied. Screenshot: ACES metal macro shot renders as intended.

## Integration pitfalls found (P1 must inherit these)

1. **gsap.ticker seconds vs lenis.raf milliseconds.** `gsap.ticker` callbacks receive `time` in **seconds**; `lenis.raf` expects **ms**. Wiring is `gsap.ticker.add((t) => lenis.raf(t * 1000))`. Get this wrong and Lenis "works" at 1/1000 speed — looks like a dead page, not an error.
2. **`lagSmoothing(0)` is not optional.** With lag smoothing on, a long frame makes GSAP compress its clock while Lenis keeps wall time → the scrub visibly rubber-bands against the smoothed scroll. Two time authorities = fight; zero it.
3. **Lenis `autoRaf` must stay false** (its default). Enabling it while also driving from gsap.ticker double-steps the animation — subtle 2× glide that's hard to diagnose. One rAF loop, owned by gsap.ticker, full stop.
4. **Lenis needs its CSS.** Without `html.lenis { height auto }` / `.lenis-smooth { scroll-behavior: auto !important }` a UA `scroll-behavior: smooth` (or anchor jump) stacks a second easing on top of Lenis. Inlined the required subset in `style.css` instead of importing `lenis/dist/lenis.css` — fewer moving parts.
5. **`overflow-x: hidden` on body breaks sticky.** Any overflow other than `visible`/`clip` on an ancestor turns it into the scroll container and kills `position: sticky` inside it (and confuses Lenis's measurements). Use `overflow-x: clip`. This WILL bite P2 sections with horizontal overflow — rule: clip, never hidden, on anything above a `.pin`.
6. **Unpinned tracks are a degenerate registry case.** `(scroll-top)/(height-vh)` is 0-length for a 100vh track. Spike rule: pinned → range `height - vh`, unpinned → range `height`. The real fix is the P1 section base class with explicit `startOffset/endOffset` (source's `webglStart/webglEnd` viewport-clamped bounds) — the spike's special case should die there.
7. **Measure after layout, from rects.** Geometry is measured from `getBoundingClientRect() + scrollY`, so svh-sized tracks are measured as the browser actually resolved them — do NOT compute from `innerHeight × vhBudget` (wrong under iOS URL-bar states). Re-measure is debounced 150ms; height-only deltas <120px ignored on touch.
8. **Raw DOM channel + lerped WebGL channel is the right split.** Verified visually: text scrubs 1:1 with the (already Lenis-smoothed) scroll, camera trails it by the `1-exp(-dt·8)` lerp — that slight channel separation is a big part of the source's feel. Anyone "fixing" the lag by lerping the DOM too (or un-lerping the camera) breaks it.
9. **Loader honesty needs a min-time clamp, not a fake tween.** `shown → min(realProgress, elapsed/minDuration)` gives choreography without lying; the arc can stall (real) but never overshoot. Resolution requires all tasks done AND smoothed value ≥0.995 — otherwise it pops.

## Feel notes (against the frozen reference recordings — calibrate in P1)

- `duration: 4` produces the source's heavy-cream glide: one wheel flick coasts ~2.5s. It reads luxurious over a 300svh pin; over a 100svh hero it means the reader can fly past copy — hero copy windows must front-load (hint dies by p=0.25 here; keep that pattern).
- WebGL lerp constant 8 feels right at 60fps desktop for this camera; the dolly-in beat (radius 3.6→2.1 with fov 30) gets seasick-close on the placeholder. Real watch framing needs the per-section `zoomMultiplier` idea from recon plus a framing pass per beat — do NOT ship a global constant.
- Copy fade ramp 0.08 of a 300svh track ≈ 24svh of fade ≈ ~0.6s at coast speed — matches the source's text cadence surprisingly well; candidate motion-bible constant.
- steps(2) 1 Hz pulse on the scroll hint is a cheap thesis-carrier; keep the family (everything idle should tick at 1 Hz).
- Sticky pinning is rock-solid in desktop Chrome. iOS Safari real-device check (PLAN §4.4 GO/NO-GO condition) is still OUTSTANDING — nothing in this spike de-risks it.

## Open questions for P1

1. **Offset-extended bounds**: registry clamps progress to a section's own track; the source runs WebGL timelines over `webglStart/webglEnd` extended bounds for cross-section camera handoffs. Section base class needs `startOffset/endOffset` + first/last viewport clamping — decide the sign convention before any P2 section is written.
2. **Lifecycle events** (enter/leave/enterCenter/leaveCenter at ±0.5vh): emitted by the registry (one owner, ordered) or by each section (local)? Registry-owned looks right — it already sees every progress crossing.
3. **Two-speed text channel** (source: scrub:true transforms + scrub:2 color reveals): hand-roll a second lerp channel per section, or allow ScrollTrigger for text-only progress per the decision record's escape hatch? Hand-rolled keeps the "one smoothing owner" story clean — recommend deciding by prototyping the grey-line reveal.
4. **Clock scalar semantics**: currently global page progress. Nocturne's lighting keyframes want an authored curve, not raw progress. Proposal: keep `--clock` as raw global progress; per-section lighting reads its own local progress; a separate `--nocturne` scalar is set by the Nocturne section. Decide before the lighting-keyframe table exists.
5. **Bundle shape**: vite 8 (rolldown) emits one 617KB chunk. P1 should split three.js core / loaders (GLTF+KTX2+meshopt land soon) and lazy-init the stage after loader shell first-paint (<1s reviewer-resilience rule).
6. **Real bytes progress**: `THREE.LoadingManager.onProgress` is item-granular, not byte-granular. For the 9MB GLB, fetch with `ReadableStream` + `Content-Length` and feed the loader task manually; keep LoadingManager only as fallback.
7. **`freezeClock(seed)`** freezes the scalar only. P1 `?eval=1` needs the full determinism kit: seeded RNG, dial 10:09:30, BPM 64, ECG phase 0, loader skip.
8. **Gesture arbitration** (longpress → `lenis.stop()`): verify Lenis 1.3.x `stop()/start()` retains scroll position under momentum on touch — spike did not exercise touch at all.
9. **`state()` shape** is the eval-harness contract — freeze it early (P1) and version it; assert.ts will be written against it.

## Deviations from task spec (deliberate, small)

- Loader min-choreography is 1.2s (source ~2.5s) — spike-speed; constant is one number in `loader.ts`.
- `?scroll=` deep link included (was P1 scope) — it fell out of `gotoSection` for free and is the eval transport, so it earned its place now.
