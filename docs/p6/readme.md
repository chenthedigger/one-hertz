# P6 lane notes — README

Status: DONE · 2026-08-27 · lane: P6 README (portfolio moment)
Law: PLAN §5 P6 above-the-fold order + §7 credits · LOOKBIBLE badge tokens (ink `#0B0B0C`, biosignal `#FF2D55`) · positioning sentence verbatim (fixed by orchestrator).

## What shipped

- **README.md** — full rewrite of the house stub, PLAN P6 order exactly:
  1. Title + taxonomy line (`showcase · shipped · 2026-08-20`) + positioning sentence verbatim + CHEN byline (links chenthedigger).
  2. Demo reel block: poster GIF → mp4 relative links (`docs/media/{poster.gif,demo-reel.mp4}`) + HTML comment telling the editor how to drag-upload the mp4 on github.com for true inline playback (GitHub does not play repo-relative mp4s). Live link with `?scroll=Nocturne` + hold-to-zoom teasers. CI/MIT/live badges from `docs/p1/ci.md` snippet — **live subdomain corrected** `one-hertz.workers.dev` → `one-hertz.ubonranto.workers.dev` per ci.md's own verify-against-infra note (wrangler name is `one-hertz`; account subdomain is `ubonranto`, confirmed live 200).
  3. Story: problem (two builds in one — site + harness) → what was built (15 sections, 5 mechanics, engine from scratch, 7 in-house internals, dial subsystem, authored look) → ARCHITECTURE.md link.
  4. RESULTS: beauty council gate table (71.7%, worst axis 66.7%, 5/5 exceed, probe 5/5, agreement 77.5%, method 1-liner + report link + the frozen-moments caveat quoted honestly) · structural 29/29 (assert.json link, rubric v1.1.0 link) · perf 5-run stability table on named hardware (Apple M5 Pro, Chrome 151 headless) + tier2 proxy with GPU-unthrottled caveat verbatim + transfer table (15.96→3.94 MB, 21.7→8.7 MB) · repro commands (`npm run eval` / `eval:assert` / `eval:perf`).
  5. Run locally: clone / install / dev (3 commands) + build-preview + real-Chrome note.
  6. Credits & licensing per PLAN §7: 60fps design-language study (never presented as original), Apple nominative + USDZ-geometry-donor provenance, in-house env (Poly Haven CC0 = dev fallback, deploy-excluded), fonts (Fontshare FFL + SIL OFL, self-hosted), code MIT. No legal boilerplate (founder directive 4).
  7. `watchOS 26, August 2026` datestamp footer.
- **LICENSE** — copyright line `chenthedigger` → `CHEN (chenthedigger)` to match the byline everywhere; MIT text untouched.
- Created `docs/media/` (empty) — reel lane drops `demo-reel.mp4` + `poster.gif` here; README links are already correct.

## Facts verified empirically (source of every number)

| Claim | Source |
|---|---|
| beauty gates 5/5, 71.7%, axis 66.7%, probe 5/5, 77.5% | `evals/results/beauty-r1/report.md` |
| assert 29/29, 0 fail/skip, passRate 1.0, rubric 1.1.0 | `evals/results/p5-integrate/assert.json` (parsed) |
| perf 5×120.48 median, p95 10.0–10.3, >50ms 1–4; tier2 120.48 | `docs/p5/perf-hunt.md` + `evals/results/p5-perf-hunt/frametimes-stability-*.json`, `machine.json` |
| 15.96→3.94 MB first load | `docs/p4/perf.md` |
| 21.7→8.7 MB deploy | `docs/p5/perf-hunt.md` §6 |
| `npm run eval` stage order | `evals/run.ts` header |
| hero = Apple USDZ geometry donor, materials re-authored | `research/asset-qa/DEVICE-DECISION.md` |
| 7 internals in-house from iFixit refs | `docs/p2/internals-continue.md` (7/7) + PLAN A2 |
| fonts + licenses | `docs/LOOKBIBLE.md` §type (Fontshare FFL, SIL OFL) |
| env zero stock pixels; Poly Haven CC0 stand-in | LOOKBIBLE §1.1 + `docs/p1/gl.md` |
| 15 sections | `src/sections/index.ts` roster (Intro…Footer, 15) = perf note "15-track page" |
| live URL 200 | `curl` https://one-hertz.ubonranto.workers.dev |

## Handoff

- **Reel lane**: put `demo-reel.mp4` (20–30 s) + `poster.gif` (<5 MB loop) in `docs/media/`. After repo is public, optionally drag-upload the mp4 in the GitHub editor at the marked comment for inline playback.
- **ARCHITECTURE.md lane**: README links it in the story section; keep the provenance/pipeline story there per PLAN §7.
- **Sanitizer**: README mentions source-identity string "60fps" only in positioning/credits (sanctioned locations per compliance rule); no "FS 60P"/"Nekst"/"fps-" tokens introduced.
- No `src/` files touched — build/engine-smoke gates not triggered by this lane.
