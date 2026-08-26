# P5 lane notes — perf-hunt

Status: **DONE — root-caused + fixed; 5/5 consecutive desktop runs ALL gates PASS; tier2 proxy 40.0 → 120.5 median; deploy 21.7 → 8.7 MB** · 2026-08-27 · lane: P5 perf-hunt
Law: `docs/LOOKBIBLE.md` + `evals/rubric.yaml` · no gate-gaming (every fix is a cause fix, pixel-proven) · no git ops, no new deps.
Machine: Apple M5 Pro · 24 GB · macOS 26.4.1 · Chrome 151 headless via playwright-core `channel:"chrome"` (`evals/results/p5-perf-hunt/machine.json`).

## 1 · Reproduction (the P4 gate discrepancy, confirmed)

`eval:perf` desktop on the pre-fix tree: **frames>50ms = 11–14 on fresh runs**
(gate floor ≤5), hitches every ~7–10 s growing **60 → 121 → 191 → 285 ms**
(`frametimes-probe-{A,B}.json`; a 120 s pass grew them to 572 ms with
*growing intervals* — probe-C). Matches the gate's report exactly. The lane's
committed 3-hitch run was a lucky draw, not the distribution.

## 2 · Root cause (three layers, each empirically pinned)

Method: CDP `Tracing` (devtools.timeline + v8 + v8.gc) · CDP
`HeapProfiler.startSampling` allocation stacks (minified + unminified via the
dev server) · forced-GC pause probes (`HeapProfiler.collectGarbage` mid-pass)
· `renderer.info` counters via the new eval-only `__ONE_HERTZ__.gl.info()`.

Every large hitch is a **V8 major GC** (`V8.GC_MC_INCREMENTAL_EMBEDDER_TRACING`
steps of 34→250 ms + `MajorGC` finalize 54–128 ms landing inside rAF/scroll
tasks). Three stacked causes:

1. **Full-page style/layout churn made GC marking ~20× slower.** The decisive
   experiment: a forced full GC on the loaded page takes **15 ms at rest** and
   **~22 ms while scrolling `?solo=Intro`**, but **165–341 ms while scrolling
   the full 15-track page** — same 28 MB live heap. Blink-side per-frame
   style/layout work across all 15 tracks (sticky scroll + idle scrubs) is
   what V8's embedder (Oilpan) marking contends with. This also explains the
   *growth*: later sections = busier frames = slower marking.
2. **Shared bloom dark-material program thrash.** `renderBloom` swapped ONE
   `MeshBasicMaterial` across every non-bloom mesh; its
   `materialProperties.currentProgram` flip-flopped between geometry-derived
   parameter sets, re-running `getProgram`/`getParameters`/
   `getProgramCacheKey` (string-join churn) per mesh per frame — churn that
   grew when internals attached (69 → 146 geometries).
3. **Lazy-content first-draw compile bursts mid-scroll.** Internals GLBs
   (attach inside `applyExplode` at Disassembly's first tick), Movement SiP,
   and the Footer lineup (4× hero deep-clone + ~40 skinned materials, built on
   the Footer's *first tick*) each paid shader compile + `cloneUniforms` +
   KTX2/texture upload + VAO creation at first visible draw. **The boot
   `renderer.compile()` never helped**: program cache keys bake in tone
   mapping + output colorspace, which differ between the canvas (ACES+sRGB)
   and the composer render targets the pipeline actually draws into — every
   boot-compiled variant was one the page never uses.

## 3 · Fixes (cause, not metric)

| # | Fix | Files |
|---|-----|-------|
| 1 | **Track dormancy** — a track >2 viewports from the view span gets `.track--dormant` (`content-visibility: hidden`; wake at 1.5 — hysteresis, registry-driven). NOT blanket `content-visibility:auto`: the design's ghost type deliberately bleeds across tracks (TIMELESS into the Intro frame — a blanket rule clipped it, caught by ab-proof). Track heights are explicit svh, so geometry is untouched. Forced-GC-mid-scroll: **250 ms → ~40 ms**. | `src/core/registry.ts`, `src/style.css` |
| 2 | **Idle tick-skip** — an out-of-view section whose clamped progress hasn't moved for ~2 s stops re-scrubbing its GSAP timelines (ticks are pure functions of progress by motion-bible law; wall-clock behaviors ride `gsap.ticker`). In-view sections always tick (interactions compose over static progress). | `src/core/registry.ts` |
| 3 | **Per-mesh bloom dark materials** (WeakMap-cached) — every material↔program binding stable; bloom darkening allocates nothing at steady state. | `src/gl/post.ts` |
| 4 | **Correct-variant warm** — `stage.requestWarm(root?)`: coalesced idle warm that binds `post.sceneRenderTarget` **before** `compileAsync` (the variants the pipeline actually runs) + `initTexture` pre-uploads. Boot compile now also binds the composer target. Triggered post-look, on internals arrival, on SiP arrival. | `src/webgl/stage.ts`, `src/gl/post.ts` (`sceneRenderTarget`), `src/main.ts` |
| 5 | **Footer lineup prebuild at idle** — built hidden once hero + colorway tables are ready (500 ms poll, 60-try ceiling; tick-path build stays as fallback; visibility still blend-gated so frames stay pure functions of progress). | `src/sections/footer.ts` |
| 6 | **Asset-residency contract closed** — `state().flags.assetsReady` (additive, schema unchanged): AND of registered residency providers (internals, SiP, lineup prebuild, warm queue). `evals/lib.ts waitReady()` was already polling this exact flag (rubric "assets resident") — it was just never fed; under `?eval=1` the loader skips choreography, so boot-tail bursts used to land inside the measured pass nondeterministically. | `src/core/debug.ts` (`registerResidency`), providers in the three sections + stage |
| 7 | **`__ONE_HERTZ__.lenis` under `?eval=1`** (pre-existing contract gap; landed with the earlier perf-hunt session in this tree, kept + verified) — perf.ts now drives the real Lenis, `driver: "lenis.scrollTo"` recorded in every result. Also eval-only `gl.info()` (renderer resource counters — warm-residency proof). | `src/core/debug.ts` |

Beauty proof: `evals/ab-proof.ts` vs the FROZEN references — **10/10 frames
IDENTICAL-CLASS (maxΔ ≤1, 0.000 % >2)** after the final tree (the blanket
content-visibility draft was rejected exactly because this proof caught
Intro_0.5 at maxΔ22/1.6 % — the clipped TIMELESS bleed).

## 4 · Stability proof — 5 consecutive `eval:perf` desktop runs (final tree)

Gates: median ≥55 fps · p95 ≤22 ms · frames>50ms ≤5. Driver `lenis.scrollTo`,
results committed in `evals/results/p5-perf-hunt/frametimes-stability-*.json`.

| Run | median fps | p95 frame | frames >50 ms | Verdict |
|---|---|---|---|---|
| stability-1 | 120.48 | 10.0 ms | **1** | PASS / PASS / PASS |
| stability-2 | 120.48 | 10.0 ms | **4** | PASS / PASS / PASS |
| stability-3 | 120.48 | 10.1 ms | **1** | PASS / PASS / PASS |
| stability-4 | 120.48 | 10.3 ms | **4** | PASS / PASS / PASS |
| stability-5 | 120.48 | 10.1 ms | **2** | PASS / PASS / PASS |

Pre-fix on the same machine/port: 11–14. Every run also carries the new
in-page `PerformanceObserver` longtask record (`longtasks[]`) as an
independent crosscheck of the rAF deltas, plus `prePassQuiet` (bounded 10 s
quiet wait, recorded; typical ~250 ms).

## 5 · tier2 exact-40fps margin (task 6)

No post shed was needed (LOOKBIBLE: tiers shed post, never smoothness — and
nothing had to be shed): the root-cause fixes moved the mobile proxy (390×844
DPR3 + CDP 6× CPU throttle, GPU unthrottled — caveat verbatim) from P4's
**median 40.0 (zero margin, p95 59.4 ms)** to:

| Run | median fps | p95 | Gate (mid-tier ≥40) |
|---|---|---|---|
| proxy tier 0 | 119.05 | 17.0 ms | PASS |
| proxy tier 2 | **120.48** | 10.9 ms | **PASS — 3.01× the floor** |

Throttle verified real (busy-loop calibration 11 → 70 ms ≈ 6.4×). The P4
"tier-2 pixel-ratio resize path" pain was actually the same full-page
style/layout churn — dormancy killed it. A real mid-tier device round remains
the rubric's field item (P5 council).

## 6 · Deploy prune (task 5)

`public/.assetsignore` (ships into dist; wrangler filters at upload — P0
placeholder lesson). Debug-log dry-run confirms all 7 files ignored:

- `assets/env/studio_small_03_2k.hdr` (7.1 MB studio fallback)
- `assets/looks/porcelain.hdr` (2.1 MB) + `assets/looks/dusk.hdr` (0.6 MB)
- `assets/basis_transcoder-*` (bundled duplicates, 1.1 MB — runtime loads `/assets/basis/`, kept)
- `assets/*.js.map` (4.4 MB sourcemaps)

**dist 21.7 MB → deployed ~8.7 MB (−13.0 MB).** Dev + `vite preview` still
serve everything (files stay in `public/`). `?look=porcelain` with the HDR
missing verified **graceful**: look's material overrides apply, console notes
`env: HDR /assets/looks/porcelain.hdr unavailable … keeping current env`,
zero errors, page fully interactive. NOT deployed — integration lane's call.

## 7 · Harness changes (semantics preserved or contract-closing)

- `evals/perf.ts`: pre-pass quiet wait (30 settled frames <25 ms, 10 s
  ceiling, recorded as `method.prePassQuiet`) · in-page longtask crosscheck
  (`longtasks[]`, `method.trace_crosscheck` updated honestly) · results carry
  the real driver.
- `evals/assert.ts` `cursor-text-states`: hovers the picker from ITS OWN
  section (dormant far tracks are correctly un-hoverable, like for a real
  user; the Footer picker root is `pointer-events:none` by design). With
  this + schema-v2: **`eval:assert` 29/29 PASS, 0 fail, 0 SKIP** — first
  fully-green rubric run (the standing `longpress-lenis-stop` SKIP is
  closed).

## 8 · Gates at finish (final tree, all empirical)

`npm run build` clean · **engine-smoke 29/29 ALL PASS** · all seven smokes
serial ALL PASS (engine · dial · cursor · explode 39 · vital · swap · copy)
· `eval:assert` **29/29, gate PASS (passRate 1.0)** · ab-proof 10/10
IDENTICAL-CLASS · 5/5 perf stability table above · wrangler dry-run prune
verified.

## 9 · Handoffs / rough edges

- **Real mid-tier device round** still owed for the rubric `real_device`
  field (proxy now has 3× margin; founder iPhone = named flagship).
- `flags.assetsReady` settles late (~30 s bounded ceiling) on alt looks
  without colorway tables (`?look=porcelain`) — harmless for debug routes;
  a table-less look could short-circuit the lineup-prebuild provider if it
  ever matters.
- Three `KTX2Loader` instances warn about multiple active loaders (watch /
  internals / movement each construct one; pre-existing) — a shared
  transcoder would also drop worker spin-up on the live prefetch path.
- Chrome logs verbose "Rendering was performed in a subtree hidden by
  content-visibility" when boot-time code measures inside dormant tracks —
  one-off forced renders, not per-frame; cosmetic.
- Offline PMREM prefilter (CI determinism) still open from P4.
- The 1–4 residual >50 ms frames per pass are the now-rare major GCs
  (~40–90 ms) — further shrinking means hunting the remaining ~0.5 MB/s
  steady churn (Lenis `onNativeScroll`, GSAP scrub internals); diminishing
  returns at 5× headroom under the floor.

## Pitfalls found this lane (inherit)

1. **`renderer.compile()`/`compileAsync()` against the canvas warms nothing
   for a composer pipeline** — tone mapping + output colorspace are baked
   into the program cache key; bind a scene render target first or every
   "warmed" program is a variant the page never runs.
2. **One shared override material across heterogeneous meshes = per-draw
   program re-resolution** (`currentProgram` flip-flop). Override materials
   want to be per-mesh (WeakMap) for any recurring pass (bloom darkening,
   custom depth…).
3. **A forced-GC probe at idle vs mid-scroll is the cheapest way to split
   "heap too big" from "marking contended"** — 15 ms vs 300 ms on the same
   live set pointed straight at Blink style/layout churn, which no JS heap
   profile shows.
4. **`content-visibility` clips designed cross-container bleeds** — a
   pixel A/B against frozen references is the ONLY reliable guard when
   touching rendering-skip CSS (numbers first flagged it; eyes confirmed the
   TIMELESS ghost type cut in half).
5. **An eval loader that skips choreography also skips the natural boot
   window** — anything scheduled "at idle" races the harness; a residency
   flag the ready-wait polls (`flags.assetsReady`) is the deterministic fix,
   and the rubric's ready condition already demanded it.
