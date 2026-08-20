# P1 lane notes — engine (`src/engine` core = `src/core/*` + `src/webgl/*`)

Status: **DONE, all checks pass** · 2026-08-20 · extends Spike B (docs/SPIKE-B.md), zero rewrites of its verified wiring
Scope: PLAN §3 decision record + §1 scroll grammar, hardened for parallel P2/P3 work. **The interfaces below are the build contract for downstream agents.**

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean · 30/30 headless real-Chrome checks (playwright-core, 1600×900): manifest 15/15 in canonical order, budgets @900px exact, dual bounds, eval settle + zero camera drift over 600ms, lifecycle center toggles, `?scroll`/`?solo`/`?autoscroll` (5992px/1.5s at 4000px/s)/`?materials`, sticky pin `top=0` mid-track · contract-conflict logic unit-tested via Node type-stripping.

## Module map

| Module | Exports (the contract) |
|---|---|
| `core/constants.ts` | `SECTION_VH`, `SECTION_ORDER`, `SectionName`, `isSectionName`, `LENIS_DURATION`, `WEBGL_PROGRESS_LERP`, `CENTER_LINE_VH`, `EVAL_*`, `EASE` |
| `core/params.ts` | `params: EngineParams` (frozen, parsed once) |
| `core/determinism.ts` | `isEvalMode`, `random()`, `seedRandom(seed)`, `wallSeconds()`, `bpm(live)`, `ecgPhase(live)` |
| `core/state.ts` | `EngineStateContract`, `PartialState`, `INITIAL_STATE`, `StateStore`, `UiFlags`, `contractConflicts`, `foldExitState` |
| `core/section.ts` | `SectionBase`, `SectionSpec`, `ScrubAdapter`, `timelineAdapter(tl)`, `ScrollDirection` |
| `core/registry.ts` | `SectionRegistry`, `LifecycleEvent`, `SectionManifestEntry`, `PinState` |
| `core/scroll.ts` | `ScrollEngine` (+ `Snappable`) |
| `core/clock.ts` | `setClock`, `getClock`, `freezeClock`, `uClock` (unchanged from Spike B) |
| `core/events.ts` | `EngineEvent` enum (9 recon events), `bus` (unchanged; payloads firm up in P3) |
| `core/debug.ts` | `installDebugApi`, `OneHertzDebugApi`, `EngineStateSnapshot`, `STATE_SCHEMA_VERSION` |
| `core/loader.ts` | `Loader(skip)`, `LoaderTask` |
| `core/inspector.ts` | `installMaterialsInspector(stage)` |
| `sections/index.ts` | `createSection(name, rig)` — **the one file P2 agents edit to register their section class** |

## 1 · Section base + dual progress channels

```ts
new SectionBase({ name, vhBudget?, startOffset?, endOffset?, requiredEnterState?, guaranteedExitState? })
```

- `name: SectionName` — canonical, binds to `[data-section="<Name>"]` in index.html. The constructor sets the track's height to `vhBudget` **svh** (never hardcode heights in CSS; `min-height:100svh` only guards pre-JS paint).
- `vhBudget` defaults from `SECTION_VH` — do not pass it unless you are the look bible.
- **DOM channel** — `tickDom(progressDom)`, raw bounds, RAW every frame (never lerp it — Spike B pitfall #8):
  - pinned (budget > 100): `[top, top + height − vh]` — progress 1 exactly at pin release.
  - unpinned: `[top − vh, top + height]` (viewport traversal); **first** section start-clamped to 0, **last** end-clamped to maxScroll so progress really reaches 0/1.
- **WebGL channel** — `tickWebgl(progressWebgl)`, offset-extended bounds:
  - `webglStart = rawStart + vh·startOffset`, `webglEnd = rawEnd + vh·endOffset`.
  - **Sign convention (frozen; SPIKE-B Q1 answered): offsets are in viewport-heights; negative `startOffset` starts the WebGL timeline EARLIER (reaches into the previous section), positive `endOffset` ends LATER.** First section's `webglStart` clamps to 0, last section's `webglEnd` to maxScroll.
  - Consumers may lerp their own master (CameraRig keeps `1−exp(−dt·8)`); the scroll value itself is raw Lenis, single smoothing owner.
- **Scrub adapters**: `{duration, tick(progress)}`. `addDomAdapter(a)` / `addWebglAdapter(a)`; `timelineAdapter(gsapTimeline)` wraps a PAUSED GSAP timeline (it force-pauses; `.progress()` is the only driver). Overriding `tickDom`/`tickWebgl` is fine for imperative work — call `super` to keep adapters ticking. `IntroSection` shows the timeline pattern, `DisassemblySection` the imperative + offsets (−0.25/+0.25) + rig handoff pattern.

## 2 · Lifecycle events

Registry-owned (one ordered owner — SPIKE-B Q2 answered). Override on your section:

```ts
onEnter(dir) · onLeave(dir) · onEnterCenter(dir) · onLeaveCenter(dir)   // dir: 1 down, −1 up
```

- `enter`/`leave`: track intersects the viewport `[scroll, scroll+vh]`.
- `enterCenter`/`leaveCenter`: the **viewport center line** `scroll + 0.5·vh` (`CENTER_LINE_VH`) is inside `[top, top+height)`.
- Fired exactly once per crossing (boolean transition), with the live scroll direction. In-view state starts false ⇒ first frame fires `enter`/`enterCenter` for whatever is on screen (deep-link and solo boots initialize the same way). A jump that lands PAST a section without ever rendering inside it fires nothing for it — lifecycle is state-transition, not path-integration.
- Observers (cursor system, eval harness): `registry.onLifecycle(cb)` → `{section, type, direction}`. The 9-event recon `bus` is untouched; lifecycle is a separate channel by design.

## 3 · Budgets (frozen from recon, `core/constants.ts`)

`Intro 100 · Timeless 100 · VerticalText 300 · Disassembly 300 · Mechanism 400 · Movement 300 · Curves 300 · MovementWatchRight 300 · Hands 300 · Straps 400 · Images 100 · Nocturne 300 (ours, additive, sanctioned deviation) · Colors 450 · Parts 100 · Footer 100` — 15 tracks, source order with Nocturne inserted after the gallery (`Images`). Key order in `SECTION_VH` IS page order; `SECTION_ORDER` derives from it. Names are recon-verbatim so eval addressing matches `evals/reference/source/sections.json`.

## 4 · Sandbox + state contract (P2 gate)

Contract axes: `{camera, explode, colorway, dialMode, postStack}` — open string tokens (vocabularies belong to P1.5/P2); equality is the contract. Defaults: `INITIAL_STATE = {camera:"intro-hero", explode:"assembled", colorway:"natural-titanium", dialMode:"wayfinder", postStack:"default"}`.

- Declare `requiredEnterState` (what you assume) and `guaranteedExitState` (what you leave) as **partials** — absent key = don't-care / unchanged.
- `registry.register()` folds exit states over canonical order and **throws at boot** if your requirement contradicts the fold (also throws on out-of-order registration). Broken handoffs fail in CI, not mid-scroll.
- **Standalone**: `?solo=<Name>` mounts ONLY your track (others removed from DOM), stubs your `requiredEnterState` into the live `StateStore`, skips continuity asserts. Combine with `?eval=1` for deterministic section screenshots. This is your dev page; no separate harness.
- Runtime truth lives in `StateStore` (`store.apply(partial)` on swap/explode/etc. — P3 mechanics own the writes); the static contracts are promises about that store.

## 5 · Deep-link / debug params (`core/params.ts` — import `params`, never reparse)

`?scroll=<Name>` jump after load (raw-bounds progress 0) · `?autoscroll[&autoscrollspeed=<px/s>]` linear-eased `lenis.scrollTo` to end, default full page in ~60s (= eval capture pace) · `?materials` read-only PBR table overlay (stub; look-dev grows it) · `?solo=<Name>` sandbox · `?eval=1` determinism kit.

**`?eval=1`** (PLAN §6): loader skipped (still WAITS for real asset readiness, skips only choreography) · RNG seeded (`EVAL_RNG_SEED`) · dial frozen 10:09:30 · BPM 64 · ECG phase 0 · idle WebGL motion derives from the clock scalar, never wall time. Downstream MUST use `core/determinism.ts` — `random()` not `Math.random()`, `wallSeconds()`/`bpm(live)`/`ecgPhase(live)` not `Date` — or your section will not freeze and will fail eval capture.

## 6 · `window.__ONE_HERTZ__` (frozen shape — `STATE_SCHEMA_VERSION = 1`, additive changes only; breaking ⇒ bump + update evals/assert.ts together)

```ts
sections: SectionManifestEntry[]   // {name, vhBudget, pinned, startOffset, endOffset, top, height,
                                   //  rawStart, rawEnd, webglStart, webglEnd,
                                   //  progressDom, progressWebgl, inView, inCenter}
gotoSection(id, localProgress=0)   // addresses RAW bounds (inverse of progressDom).
                                   // eval mode: SYNCHRONOUS settle — scroll set immediate,
                                   // targets propagated, all Snappables snapped, final frame
                                   // rendered BEFORE return (verified: zero pose drift after 600ms)
state(): {
  schema, activeSection,           // section owning the center line (null before first frame)
  pinState,                        // "before" | "pinned" | "after" | "unpinned" (of activeSection)
  cameraPose: {position:[x,y,z], quaternion:[x,y,z,w], fov},   // rounded 1e-5
  colorway, dialMode, explode, postStack,                      // from StateStore
  uiFlags: {loaderDone, evalMode, autoscroll, materialsInspector, soloSection, soundOn},
  scroll, clock, qualityTier, evalMode, sections
}
freezeClock(seed)                  // freezes the page-progress scalar AND re-seeds the RNG
forceQualityTier(n)                // tiers shed post/resolution, never smoothness
```

Anything holding an internal lerp that eval settling must finish: implement `Snappable {snap()}` and `engine.registerSnappable(it)` (CameraRig is the model).

## 7 · Mobile discipline

Tracks sized in **svh** by SectionBase; geometry measured from `getBoundingClientRect()+scrollY` after layout (never `innerHeight × budget`). Resize: height-only deltas < 120px ignored on touch (iOS URL bar); accepted resizes debounced 150ms **then deferred to scroll-idle** (`|lenis.velocity| < 0.05`) before re-measure — geometry never shifts mid-glide. Re-measure chain is `stage.resize() → registry.measure() → engine.refresh()`.

## Pitfalls found this lane (P2/P3 must inherit)

1. **Stale Lenis limit (new, bit us live).** Lenis snapshots page height at construction; SectionBase sizes tracks afterwards ⇒ every `scrollTo` silently clamped to the old limit (deep links landed mid-page; autoscroll crawled). **Any code that changes document height MUST call `engine.refresh()`** (wraps `lenis.resize()`). Boot and the resize chain already do; P2 sections injecting DOM (gallery images!) must too.
2. `?scroll=X&solo=Y` is contradictory — solo wins, `?scroll` ignored (guarded in main.ts).
3. Placeholders are contract-neutral (no requires/guarantees) so continuity folds through them — replace a placeholder, inherit its neighbors' expectations, and declare YOUR contract; boot will tell you if you broke the chain.
4. All Spike B pitfalls stand (seconds→ms ticker wiring, lagSmoothing(0), no autoRaf, Lenis CSS subset, `overflow-x: clip` never `hidden` above a `.pin`, rect-based measurement, raw-DOM/lerped-WebGL split, loader honesty).

## Open handoffs

- `?materials` is a stub by spec — look-dev lane owns the editing inspector.
- `EnginePayloads` in events.ts stay loose until each P3 mechanic lands.
- Nocturne budget 300svh is provisional pending the look bible (constant lives in one place).
- iOS Safari real-device pin check still OUTSTANDING (PLAN §4.4) — nothing in this lane de-risks it.
- Smoke test script: scratchpad `engine-smoke.mjs` — worth graduating into `evals/` as eval-lite for CI.
