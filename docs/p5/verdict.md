# P5 lane notes — verdict + gate math (beauty council round 1)

Status: **DONE — BEAUTY GATE PASS (5/5 gates)** · 2026-08-27 · lane: p5/verdict
Law: `evals/rubric.yaml` v1.1.0 §(c) beauty protocol · `docs/LOOKBIBLE.md` ·
`docs/p4/integrate.md` (state at hand-off). No git ops, no new deps.

## What this lane did

1. Recorded the 5 seats' blind ballots verbatim → `evals/judge/ballots.json`
   (copy at `evals/results/beauty-r1/ballots.json` per rubric transparency clause).
2. Unblinded every axis-choice against the sealed key
   `evals/judge/pack/answers.json` (judges never saw it) and computed the gates
   with a deterministic tally script over exactly those two files.
3. Wrote the round record: `evals/results/beauty-r1/report.md` + `report.html`.
4. Ran the finishing gates on the tree: `npm run build` clean (tsc strict + vite;
   only the pre-existing >500 kB chunk advisory) · `evals/engine-smoke.mjs`
   **ALL PASS** (headless real Chrome, vite preview :4661, killed after).

## Gate math (rubric v1.1.0)

120 axis-choices (5 seats × 24 pairs) · 120/120 with concrete evidence →
**0 VOID ballots, no re-runs** · 0 ties.

| Gate | Rule | Result | Verdict |
|---|---|---|---|
| (a) overall | win-or-tie ≥ 60% | **86/120 = 71.7%** | **PASS** |
| (b) axis floor | no axis < 40% win+tie | worst = material 66.7% (light 75.0 / typo 69.6 / comp 67.6 / motion 85.0) | **PASS** |
| (c) exceed | ≥ 3 axes strictly above source | **5/5 axes** (strict wins > source on every axis) | **PASS** |
| (d) deception probe | ours picked as amateur = fail | **5/5 seats picked OURS as the shipping professional site** (seat 4 called source "the imitation"; seat 3 letter-ambiguous but its feature description is unambiguously ours — excluding it the probe is 4/4) | **PASS** |
| (e) agreement | flag < 70% | mean pairwise **77.5%**, modal 86.7%, 13/24 unanimous | **not flagged** |

Per-seat (ours–source): s1 18–6 · s2 15–9 · s3 17–7 · s4 18–6 · s5 18–6 —
every seat independently clears 60%. Round 1 of 4 (two-stops ceiling); no
further beauty round required by the gate.

Exceed-clause levers confirmed in judge language: post stack ("rim light on the
crown knurl … cuts through the dark"), per-part copy ("annotation beats …
Sapphire crystal, LTPO3 OLED … closing thesis line"), screen liveness
("persistent 64 BPM vital chip", cited by 4 seats).

## Loss ledger → advisory tune list (no gate failed; ranked by cross-judge frequency)

34 losses total; **17 of 34 come from four empty/under-composed matched moments**.
Full quotes: `evals/results/beauty-r1/report.md` §Loss ledger.

1. **T1 desktop VerticalText @1.0 — 5/5 unanimous.** Masthead + copy columns have
   exited; lone small watch in an empty field. → Hold the rotated ONE—HERTZ
   masthead + twin columns through progress 1.0.
2. **T2 mobile MovementWatchRight @1.0 — 5/5 unanimous.** Static strap-back view,
   dial hidden, flat light, inert matte band. → End on diagonal composition with
   dial in frame + authored key-light, specular variation on Ti buckle.
3. **T3 mobile Straps @0.75 — 5/5 unanimous.** Band is a washed sliver top-right,
   ~60% of screen empty. → Reframe portrait camera/timeline so the band macro
   fills the frame with headline + caption present.
4. **T4 desktop Footer @0.5 — 4/5.** Ledger top row (ECG ELECTRODES) clipped at
   900px; 4-watch lineup small/flat-lit/detached, no focal point. → Fix clipping;
   scale lineup + interleave with outro type; light finishes to read distinct.
5. **T5 mobile VerticalText @0.75 — 2 losses + 2 grazes (4/5 seats named it; the
   most-named single defect).** Vital chip overprints "Always-On Retina"/"3000
   nits". → Add the spec block (and mobile Hands copy, 1× loss) to the chip's
   ONE-owner getYield policy — same mechanism as the P4 Images/Footer yields.
6. **2× items:** desktop Straps @0.75 band "flat and waxy" + corner framing ·
   colorway_swap video motion-flat first half (add one designed beat on
   band-color commit) · desktop Intro @1.0 ghost lines washed / TIRELESS buried
   (raise outline-register contrast) · desktop MWR @0.25 crystal glare (cap
   reflection intensity).
7. **1× items:** desktop Curves @0.5 blown highlight · mobile Colors @0.75
   shadowless stage · mobile Images @1.0 caption fade at exit · desktop scroll
   video frame-07 empty beat (tighten Hands/Straps hand-off).

## Caveats (honest reporting)

- Matched-moment symmetry: several source losses are the source's own
  mid-transition states at the frozen step (Colors-1 near-empty frame,
  Images-0.5 mid-transition, faded Parts column). Symmetric protocol — ours was
  punished identically at T1/T3 — but read 71.7% as "at these 24 frozen
  moments", not all scroll positions.
- Axis labels were NOT printed on pack images; seats self-assigned axes, so
  per-axis n is uneven (16–34). Aggregate 86/120 is axis-independent and both
  axis gates clear with margin. **Protocol fix for any future round: print the
  axis on each pair sheet.**
- Judges' own in-notes product tallies differ ±1 from the sealed-key unblinding
  (s4 "19-5", s5 "17/24" vs 18–6 both); the sealed key is authoritative.
- Anchored scale (diagnostic only): our best moments placed 7–8 (HM→SOTD),
  weakest captured states 4–5.

## Hand-off

- Beauty gate CLOSED for P5. Remaining P5 items per `docs/p4/integrate.md` /
  CLAUDE.md: LOOKBIBLE co-signs (done — `docs/p5/cosigns.md`), schema v2 (done,
  rubric v1.1.0), real mid-tier device perf round, worker asset prune.
- T1–T5 are the highest-value polish if any later lane touches those sections;
  none is required to ship.
