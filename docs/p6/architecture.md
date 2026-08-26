# P6 lane notes — ARCHITECTURE.md

Status: **DONE** · 2026-08-27 · lane: P6 ship, architecture doc
Law honored: PLAN §5 P6 spec (~2 pages, 2 mermaid diagrams: registry/scrub + clock flow, asset pipeline incl. provenance) · PLAN §7 (provenance as pipeline story, positioning sentence verbatim, no disclaimers/boilerplate) · LOOKBIBLE tokens (ink/porcelain grammar named, no invented values).

## Delivered

- **`/ARCHITECTURE.md`** (repo root, 142 lines / ~1,370 words ≈ 2 pages, 4 sections + 2 mermaid diagrams):
  1. **Engine** — Lenis single-smoothing-owner, CSS sticky pinning, registry (15 tracks, frozen budgets, lifecycle, dormancy), dual progress channels (raw DOM / offset-extended WebGL), scrub adapter contract `{duration, tick(progress)}`, paused-GSAP-driven-by-progress law, ONE clock scalar → uClock uniform + dial dirty-flag upload + CSS, keyframe driver → bgStage writing scene.background + `--porcelain` as one surface, state contracts (5 axes, boot-throw fold) + `?solo` sandbox. Diagram 1: scroll → engine → {DOM timelines, WebGL stage, dial, keyframe driver}.
  2. **Asset pipeline** — Apple AR Quick Look USDZ donor → Blender headless surgery (deterministic rename maps, 114/114 meshes → `part_*`/`mat_*`, ID-render verified) → 7 in-house internals (SiP, battery, Taptic, display, speaker, sensor array, crown — list confirmed against `src/sections/disassemblyInternals.ts` INTERNAL_SLOTS) → gltfpack meshopt+KTX2 (hero 8.5→1.24 MB, `-kn`, KHR_texture_transform trap named) → lazy residency + `flags.assetsReady`. Provenance told straight: processed GLBs ship, raw USDZ archives + reference photos never committed. Diagram 2: pipeline with "never committed" subgraph.
  3. **Determinism + eval** — `?eval=1` kit, `__ONE_HERTZ__` API (synchronous gotoSection settle, versioned state), harness inventory (capture 150+16, assert 29/29, perf, pixel A/B), blind-council protocol 1 paragraph (5 judges, 24 sealed-key randomized pairs, evidence-or-void, deception probe, gates) + link to `evals/results/beauty-r1/report.md` with round-1 result (PASS 5/5, 71.7%).
  4. **Perf** — GC/bloom/compile hunt as 1-paragraph war story: 15 ms vs 165–341 ms forced-GC probe, program cache-key/tone-mapping compile trap, dormancy (blanket rule rejected by pixel A/B), per-mesh WeakMap bloom darks, correct-variant warm; 11–14 → 1–4 frames >50 ms, median 120.48, proxy 40.0 → 120.5, links `docs/p5/perf-hunt.md`.

## Verified empirically (not claimed)

- **Both mermaid diagrams PARSE + RENDER** in real Chrome (playwright-core `channel:"chrome"`, mermaid@11 from jsdelivr, svg 27,737 / 19,762 bytes) — scratchpad `mermaid-check.mjs`.
- **All 8 relative link targets exist** on disk (docs/, LOOKBIBLE, PLAN, p1/engine, p15/plumbing, p2/infra-gl, p5/perf-hunt, beauty-r1 report).
- **Zero token-leak strings** in the file ("FS 60P", "Nekst", "fps-" all 0 hits; "60fps" attribution is PLAN-§7-sanctioned and the dist scan doesn't cover docs anyway).
- No `src/` files touched ⇒ build/engine-smoke gates not triggered (rule honored, nothing to re-run).

## Decisions made in-lane

1. **Positioning sentence verbatim in the doc header blockquote** — the doc is a portfolio entry point in its own right (people land on ARCHITECTURE.md from HN/GitHub directly); recognition-as-intent belongs here too, not only in README.
2. **Compressed, not pasted**: every section links its lane note for depth; the doc carries only the numbers that make the systems argument (1.24 MB, 29/29, 71.7%, 15 vs 341 ms, 120.48).
3. Named exactly TWO pipeline traps (KHR_texture_transform tiling, program-cache-key warm miss) — the ones a reader replicating this stack will actually hit; the rest stays in lane notes.
4. Diagram labels use quoted strings + `<br/>` only (no braces/parens tricks) — the subset that renders identically on GitHub and in mermaid@11.

## Coordination

- **README lane**: link target is **`ARCHITECTURE.md` at repo root** (e.g. `[ARCHITECTURE.md](ARCHITECTURE.md)` from README's Architecture section). This lane did NOT touch README.
- Sanitizer lane: file is clean by grep; include it in the final sweep anyway.
- Demo-reel lane: §3's council paragraph cites beauty-r1 — if the reel embeds council clips, the same report link serves both.

## Rough edges / handoffs

- ARCHITECTURE.md says "150+16 canonical frames" (current refreshed set) — if a later capture round changes the count, it's one number in §3.
- The doc states round-1 beauty numbers as final; if a future council round supersedes beauty-r1, update the §3 link + figures together.
