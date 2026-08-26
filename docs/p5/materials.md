# P5 lane notes — council materials (blind pack)

Status: **DONE — complete blind pack built + integrity-verified** · 2026-08-26 · lane: P5 materials
Law: `docs/LOOKBIBLE.md` + `evals/rubric.yaml` §c (beauty protocol) · state source: `docs/p4/integrate.md`
Rules kept: no git ops · no new npm deps · no sudo (ffmpeg already at `~/.local/bin/ffmpeg`, Pillow 11.3 present — nothing downloaded).

## Deliverables

| Artifact | Where | Contents |
|---|---|---|
| Ours beauty videos (4) | `evals/reference/ours/{desktop,mobile}/videos/scroll_60s.webm` + `evals/reference/ours/desktop/interactions/{explode,colorway_swap}.webm` | vp8 25fps, same codec/dims as the frozen source clips; paired 1:1 with `reference/source/videos/*.webm` + `reference/source/interactions/*.webm` by `judge/pairs.ts` (its four `[MISSING — TODO(P5)]` flags are now closed) |
| Video metadata | `evals/reference/ours/videos.json` | per-clip scroll/interaction-phase windows in video time (strip alignment bookkeeping) |
| Pairs manifest | `evals/results/p5-council/judge/pairs.json` | built by `runner.ts --round p5-council --seed 1`: **20 still pairs** (deterministic stride across both viewports) + **4 video pairs**, per-judge seeded L/R, 10 unmatched = the additive Nocturne frames (by design — no source counterpart) |
| **Blind pack** | `evals/judge/pack/seat-{1..5}/pair-<id>.png` | 5 seats × (20 still composites + 4 motion-strip composites) = **120 PNGs**, labels `A`/`B` only |
| Pack manifest (judge-visible) | `evals/judge/pack/manifest.json` | pair ids, kind, viewport, axes, strip rule — zero origin info |
| **Sealed answers** | `evals/judge/pack/answers.json` | which side is ours, per seat per pair — judges never see this file |
| Capture tool (kept) | `evals/videos.ts` | `node evals/videos.ts [url] [--only scroll|interactions]` |
| Pack tool (kept) | `evals/judge/build_pack.py` | `python3 evals/judge/build_pack.py --round p5-council` |

## Method (why it's a fair fight)

- **Videos = the source kit's own method**: playwright-core `recordVideo`, real
  Chrome channel, viewports from `lib.ts` (the exact `capture-scripts/videos.mjs`
  + `interactions.mjs` recipe used to freeze the source). No `?eval` — the source
  clips show the live site's real clock/liveness, so ours do too.
- **Pace parity**: ours uses the site's own `?autoscroll` default (full page in
  ~60s, linear — `AUTOSCROLL_DEFAULT_DURATION_S`), vs source's calibrated scroll
  phases of 64.1s/56.6s (their manifest `videoRuns`). Measured ours: 60.2s both
  viewports. Interaction clips mirror the source beats: explode = arrive
  Disassembly mid (hard `scrollTo` + Lenis settle, the source-kit arrival) →
  drag-rotate → select part (debug-API `screenPos` hit) → next part → close;
  colorway = outro → hover model #3 → select (1s preview grade) → SWAP → hard
  restart at top in the chosen finish (verified on-frame: Neon Green intro).
- **Motion strips**: 12 stills per side per video pair, numbered 01→12, so
  judges without video playback still judge motion. Sampling: scroll clips at
  equal steps across each clip's scroll phase (ours window from `videos.json`,
  source from its `videoRuns` metadata + 2s tail); interaction clips from
  content onset (loader end — same luma-stddev rule applied to BOTH sides) to
  0.5s before the end. First build sampled whole clips and wasted 5/12 source
  explode frames on the loader; the onset rule fixed it (source explode onset
  10.5s, colorway 14.5s; ours 3.5s both).
- **Stills**: fresh post-P4 refresh confirmed — nothing under `src/ public/
  index.html vite.config.ts` is newer than `reference/ours/manifest.json`
  (captured 2026-08-26T16:14Z on the deployed tree, 150+16 frames, zero skips).
  No re-capture needed.
- **Blindness**: composites re-encode through PIL (no EXIF/tEXt survives),
  filenames carry only the pair id, L/R comes from the seeded per-judge
  assignments in `pairs.json` (seed 1 → reproducible). Source-site branding
  visible INSIDE frames (FS 60P slate etc.) is sanctioned by the rubric:
  "no branding … beyond what the frames themselves show".

## Verification (empirical, on the final tree)

- `npm run build` clean (tsc strict + vite; chunk-size notice only).
- `BASE=:4661 node evals/engine-smoke.mjs` → **ALL PASS** (incl. autoscroll pace check).
- Integrity script (run, PASS — zero issues):
  5 seats × exactly 20 stills + 4 strips · zero filename leaks
  (`ours|source|60fps|thewatch|nekst|fs.?60p` case-insensitive) · PNG chunk scan
  across all 122 pack files: no `tEXt/iTXt/zTXt/eXIf/tIME` · `answers.json`
  matches the seeded `pairs.json` ground truth for all 5×24 entries and lives
  only at pack root · pack `manifest.json` contains no origin tokens ·
  randomization sane (ours-as-A 38–67% per seat; 23/24 pairs differ in L/R
  across seats — the 1 stable pair is legal under per-seat coin flips).
- Videos spot-checked visually: mid-scroll render frame, explode overlay with
  part card (`02/10 LTPO3 OLED·1Hz`), swap-restart top frame in Neon Green.

## Handoffs (to the council-seating lane)

- Seat wiring: give each fresh-context judge ONLY `pack/seat-<n>/*.png` +
  `pack/manifest.json` + its prompt (`results/p5-council/judge/judge<n>-prompt.md`).
  Gate math: drop ballots in `results/p5-council/judge/ballots/judge<n>.json` and
  re-run `node evals/judge/runner.ts --round p5-council --seed 1`.
  **Never attach `pack/answers.json`.**
- Judge prompts were written by runner.ts before this pack existed — they
  reference the raw pair files. Seating should present the pack composites
  (already blind) or re-point the prompts; either is compatible with the ballot
  schema.
- Ours interaction clips are tighter than source (16.4s vs 26.4s, 18.4s vs
  32.0s): same beats, less dwell. Strips normalize this, but a judge watching
  the raw clips will notice pacing density — call it in the round report if it
  draws comment.
- `evals/reference/ours/{desktop,mobile}/interactions/` each still hold 4 stale
  pre-Ocean PNGs (`colorway_black-graphite`, `colorway_black-midnight`,
  `colorway_natural-ember`, `colorway_natural-titanium`) — not referenced by the
  manifest or pairs, left in place (no deletions without OK). A future capture
  refresh may sweep them.

## Pitfalls found this lane (inherit)

1. **`[data-outro-model]` buttons are only visible/stable at the true page
   bottom** — a Lenis wheel-ride can undershoot and playwright's hover then
   times out on "element is not visible". Arrive like the source kit: hard
   `window.scrollTo` + settle, then interact.
2. **Whole-clip strip sampling wastes frames on the loader head** — sample from
   content onset (cheap luma-stddev scan) with the SAME rule on both sides, or
   the strip silently biases against the clip with the longer head.
3. **Write run-metadata JSON before the last capture step, or merge on write** —
   the first video run crashed on the colorway hover and lost the scroll-window
   metadata for the three clips already saved (`videos.ts` now merges prior
   `videos.json` content on every write).
4. zsh eats a bare `===` in scripts (`=cmd` expansion) — quote it.
