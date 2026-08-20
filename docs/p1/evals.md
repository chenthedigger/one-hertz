# P1 lane notes — evals harness (`evals/*`)

Status: **DONE, smoke-verified end-to-end** · 2026-08-20
Built against the debug-API contract in `evals/rubric.yaml` `debug_api`, NOT current src state. Every missing API member degrades to a reported SKIP, never a crash.

## What was built

| File | Role |
|---|---|
| `evals/lib.ts` | Shared infra: rubric loader (yaml), real-Chrome launch (playwright-core, `channel:"chrome"`), viewports 1600×900@DPR2 / 390×844@DPR3 (same as frozen source kit), ready condition (loader gone + fonts.ready + assets flag + 3 settled rAF), `gotoSection` + scroll-settle, frame-time math, seeded RNG, arg parsing |
| `evals/capture.ts` | Canonical frames: `__ONE_HERTZ__.sections` × localProgress {0,.25,.5,.75,1} (steps read from rubric) via `?eval=1` + `gotoSection` → `evals/reference/ours/<viewport>/<SectionId>_<p>.png` (source-kit naming, so judge pairing is a filename join). Interaction frames (explode open / each colorway / Nocturne mid / BPM hi+lo) capability-probed; missing API → printed SKIP list + recorded in `reference/ours/manifest.json`. Videos = TODO(P5) (see below) |
| `evals/assert.ts` | All 29 rubric `auto:` items implemented as a check registry keyed by item id. Output `results/<round>/assert.json` `{itemId, pass, evidence, area, severity, skipped}` + gate math (zero CRITICAL + ≥90%, incl. the all-items-in-mechanic-area-fail → CRITICAL escalation). **Exit 1 when CRITICALs > 0** (verified) |
| `evals/perf.ts` | In-page rAF delta recorder around a scripted pass; driver preference `__ONE_HERTZ__.lenis.scrollTo` → `__ONE_HERTZ__.scrollTo` → synthetic-wheel-60Hz fallback (still routed through Lenis; driver recorded in output). `--throttle` = CDP 6× CPU + 390×844 DPR3 mobile proxy with the "GPU unthrottled" caveat written verbatim into the JSON. `--tier n` → `forceQualityTier`. Emits `results/<round>/frametimes-<label>.json` with raw delta array + median fps / p95 ms / frames>50ms + rubric gate verdicts |
| `evals/judge/` | `pairs.ts` (matched-moment builder: role↔source-name map + identity fallback; 20 stills sampled evenly across page+viewports, 4 video pairs = 2 scrolls + explode + colorway_swap; per-judge seeded L/R randomization), `prompts.ts` (per-judge ballot prompt: forced choice per axis, evidence-or-void, deception probe, anchored 1–10 diagnostic), `types.ts` (ballot/manifest/gate shapes), `runner.ts` (writes pairs.json + 5 prompt files, validates ballots, full gate math: win-or-tie ≥60% / axis floor 40% / exceed ≥3 axes / deception / inter-judge agreement — **invocation wiring TODO(P5)**; gate math unit-smoked with a synthetic ballot: PASS) |
| `evals/report.ts` | Merges a round → `results/<round>/report.html` (+ report.md): gates summary, checklist table (PASS/FAIL/SKIP color-coded), perf table with caveats, judge verdict, side-by-side ours·source frame grid. Self-contained, offline, relative paths (all 40 img refs verified resolving) |
| `evals/run.ts` | `pnpm eval` orchestrator: capture → assert → perf ×2 → judge → report, `--only <stage>`, continues through stage failures, exits with worst stage code |
| `evals/package-scripts.json` | **MERGE TARGET for the integrate agent** (see below) |
| `evals/tsconfig.json` | Editor-only config (erasableSyntaxOnly). Root tsconfig does NOT include evals/ — app build unaffected |

## FOR THE INTEGRATE AGENT — merge into package.json

I did not touch `package.json`/`package-lock.json` (verified byte-identical). Merge from `evals/package-scripts.json`:

- **scripts**: `eval`, `eval:capture`, `eval:assert`, `eval:perf`, `eval:report` (all `node evals/*.ts` — Node v24 native type stripping, no tsx/ts-node)
- **devDependencies**: `playwright-core@^1.62.1`, `yaml@^2.9.0` — already present in `node_modules` via `npm i --no-save --no-package-lock` (this session); a normal `npm install` after the merge makes it durable.

Usage: `node evals/run.ts <url> --round r1` · stage scripts take `[url] --round --viewport/--throttle/--tier/--duration/--only`.

## Smoke run results (round `results/r0/`, vs the current skeleton build via `npx vite preview`)

Expected-many-FAILs/SKIPs confirmed; harness itself clean end-to-end:

- **assert**: 3 PASS (dual-channel-timelines, sticky-pinning-vh-budget, loader-honesty) / 2 FAIL / 24 SKIP → gate FAIL, 6 CRITICALs (sections-14-order + 5× mechanic-missing escalations), exit 1. ✓
- **capture**: 150 canonical frames (15 sections × 5 × 2 viewports), all real WebGL renders (spot-checked), 6 interaction frames SKIPped with reasons. ✓
- **perf**: desktop 60s → median 120.5fps, p95 9.7ms, 0 frames >50ms (all gates PASS on the placeholder scene); mobile-proxy 6× throttle runs with caveat. ✓
- **judge**: 20/20 still pairs + 4 video pairs built, 5 prompts written, verdict `pending` (no ballots). 10 unmatched = Nocturne ×2 viewports (additive section, correctly pairless). ✓
- **report**: `results/r0/report.html` renders gates/checklist/perf/grid. ✓

## Contract gaps the SRC/ENGINE lanes must close (harness is ready to consume them)

`state()` members needed (rubric assertions currently SKIP without them):
1. `state().scroll` → object `{position, enabled}` (now a scalar) — longpress-lenis-stop
2. `state().cursor {label, icon}` · `state().longpress {active, intensity}` · `state().camera {dolly, parallaxGain, lookAt{x,y,z}}`
3. `state().explode {mode, selected, selectedRotationY, selectedScreenPos{x,y}, clusterRotation, parts[{id, hasProxyHitbox, screenPos{x,y}, offsetFromRest}]}`
4. `state().config {active, finishes[]}` · `state().materials` (tracked material: color/roughness/metalness/envMapIntensity/metalnessMapIntensity + preset) · `state().dial {accent, bpm}` · `state().outro {instances, stagger}`
5. `state().flags {eval, materialsDebug, touchResizeFilter, assetsReady}` · `state().activeSection` · `state().bpm`
6. sections manifest: add `sourceRole` (assert sections-14-order), `scrubChannels` (scrub-dual-speeds) — `webglStart/webglEnd/domStart/domEnd` already exposed ✓
7. **event bus on the debug API**: `__ONE_HERTZ__.emit(event, payload)` + `__ONE_HERTZ__.on(event, cb)` — required by rubric ("assertions may subscribe/emit") for cursor-icon-states, lifecycle-events, colorway swaps; lifecycle payloads should carry the section id
8. **perf driver**: expose `lenis` (or `scrollTo(y, {duration})`) on `__ONE_HERTZ__` so the scripted pass is the rubric's `lenis.scrollTo(end, ~60s)` instead of the wheel fallback
9. optional but useful: `__ONE_HERTZ__.setConfig(finishId)` (capture + colorway checks use it before falling back to bus/DOM)

DOM contract (selectors assert.ts queries — add these attributes when building the widgets):
`[data-colorway-picker]` (+ `[data-finish]` swatches) in parts-table AND outro · `[data-explode-overlay]` `[data-explode-close]` `[data-explode-next]` `[data-explode-prev]` · `[data-gallery]` around the `<picture>` sets · `[data-outro-swap]` + `[data-outro-model="<finish>"]` · sticky pin = `.pin` or `[data-pin]` inside each `[data-section]` track.

## Findings for other lanes (from the smoke run — real signal, not harness noise)

- **`?scroll=<section>` deep link doesn't land**: with `?scroll=Timeless`, `state().activeSection` stays `Intro` (scroll restores to ~0 after load). Same failure mode the source site had (see reference manifest method notes). deeplink-params will keep failing until the jump is applied post-measure.
- **`?eval=1`, `?materials`, `flags.*` not implemented yet** — determinism kit is P1 scope (SPIKE-B open question 7).
- **mobile-svh-dvh**: 1 bare `height:*vh` rule in the current stylesheet; also `flags.touchResizeFilter` not exposed. Fix in CSS + debug API.
- **loader min-choreography** currently 2.35s warm-cache — passes the 2.25s floor but is below the source's ~2.5s target (SPIKE-B deliberately shipped 1.2s×2 beats; retune when loader is finalized).

## TODO(P5) — marked in code

- Judge invocation wiring: seat 5 fresh-context vision judges with the prompt files + image/video pairs from `results/<round>/judge/`, collect ballots into `judge/ballots/judge<N>.json`, re-run `runner.ts` (validation + gate math already done).
- Ours scroll/interaction videos: playwright-core lacks the ffmpeg sidecar for `recordVideo`; reuse the frozen kit's approach (`evals/reference/source/capture-scripts/videos.mjs`) or add the playwright ffmpeg package at P5. Pairs builder already flags missing ours-videos.
- Per-round CDP Performance trace cross-check (rubric perf.method) — one trace per round.
- Named real-device mobile run (rubric perf.method.real_device).
- assert refinements once state grows: measured 2× scrub catch-up ratio, per-section exactly-once lifecycle ordering, byte-honesty loader run under network throttle, per-section zoomMultiplier proportionality.

## Conventions kept

- Frame naming/layout identical to frozen source kit → pairing is a filename join (`ROLE_TO_SOURCE` in `judge/pairs.ts` maps canonical roles → source section names; ambiguity note: source `Colors` has no canonical role — identity-matched when our build names a section `Colors`).
- No new tooling: playwright-core + real Chrome channel per house notes (Playwright MCP unusable; no npx WASM tools involved).
- Erasable-syntax TS only — everything runs under plain `node` (v24), zero build step for the harness.
