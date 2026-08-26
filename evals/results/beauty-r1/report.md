# ONE HERTZ · Beauty round 1 (P5 council) — VERDICT: **GATE PASS**

- **Round**: beauty-r1 (`p5-council` pack, seed 1) · **Date**: 2026-08-27
- **Rubric**: `evals/rubric.yaml` **v1.1.0** (frozen 2026-08-20, amended 2026-08-26) · beauty protocol §(c)
- **Materials**: 20 matched-moment still pairs + 4 scripted video strips, desktop 1600×900 + mobile 390×844, ours vs frozen source captures (`evals/reference/`)
- **Judges**: 5 fresh-context blind vision judges, sides randomized per pair per seat, sealed key `evals/judge/pack/answers.json` (never shown to judges)
- **Raw rationales**: `ballots.json` (this directory; canonical copy `evals/judge/ballots.json`) — published per rubric transparency clause
- **Ballot validity**: 120/120 axis-choices carry concrete visual evidence → **0 VOID ballots**, no seat re-runs

## Gate summary — all five PASS

| Gate | Rule (rubric v1.1.0) | Result | Verdict |
|---|---|---|---|
| (a) Overall | ours win-or-tie ≥ 60% of all axis-choices | **86/120 = 71.7%** (86 wins, 0 ties, 34 source) | **PASS** |
| (b) Axis floor | no axis win+tie < 40% | worst axis: material **66.7%** | **PASS** |
| (c) Exceed clause | ≥ 3 axes scored ABOVE source | **5/5 axes** above (strict wins > source wins on every axis) | **PASS** |
| (d) Deception probe | judges reliably picking ours as amateur = fail | **5/5 seats picked OURS as the shipping professional site** | **PASS** |
| (e) Inter-judge agreement | reported; < 70% flags protocol review | mean pairwise **77.5%** (modal 86.7%, 13/24 pairs unanimous) | **not flagged** |

Rounds used: **1 of 4** (ceiling per house two-stops rule). No further beauty round required by the gate; the loss ledger below is an advisory tune list.

## Per-axis win rates

Axes were **not printed on the pack images**; every seat independently assigned the axis its pair most directly exercises (all four strips scored as motion). Per-axis n therefore varies — a protocol deviation reported honestly below.

| Axis | n | Ours | Source | Tie | Win-or-tie | Floor ≥40% | Above source (strict) |
|---|---|---|---|---|---|---|---|
| light | 16 | 12 | 4 | 0 | **75.0%** | PASS | YES (12 > 4) |
| material | 27 | 18 | 9 | 0 | **66.7%** | PASS | YES (18 > 9) |
| typography | 23 | 16 | 7 | 0 | **69.6%** | PASS | YES (16 > 7) |
| composition | 34 | 23 | 11 | 0 | **67.6%** | PASS | YES (23 > 11) |
| motion | 20 | 17 | 3 | 0 | **85.0%** | PASS | YES (17 > 3) |
| **total** | **120** | **86** | **34** | **0** | **71.7%** | — | **5 axes** |

## Per-judge tables

| Seat | Ours | Source | Tie | Win rate | Void choices | Deception probe (unblinded) |
|---|---|---|---|---|---|---|
| 1 | 18 | 6 | 0 | 75.0% | 0 | picked **ours** ("square smartwatch ONE HERTZ world … reads as the shipping professional site") |
| 2 | 15 | 9 | 0 | 62.5% | 0 | picked **ours** ("side carrying the square smartwatch … shipped professional site") |
| 3 | 17 | 7 | 0 | 70.8% | 0 | picked **ours** by system description (eyebrow labels, mono data chips, resolved specific copy — ours' system); letter-level ambiguous, see caveat 3 |
| 4 | 18 | 6 | 0 | 75.0% | 0 | picked **ours** ("the electrical-watch experience … persistent 64 BPM vital chip … shipping professional studio site") |
| 5 | 18 | 6 | 0 | 75.0% | 0 | picked **ours** ("titanium square-watch side with the persistent red ECG vital chip"); seat 5's stated letter mapping matches the sealed key exactly on all six pairs it names |

Every seat scored ours at or above the 60% bar independently — the aggregate pass is not carried by one seat.

## Unblinded outcome matrix (24 pairs × 5 seats)

| pair | s1 | s2 | s3 | s4 | s5 | ours wins | pairwise agreement |
|---|---|---|---|---|---|---|---|
| still-desktop-Colors-1 | OURS | OURS | OURS | OURS | OURS | 5/5 | 100% |
| still-desktop-Curves-0.5 | src | OURS | OURS | OURS | OURS | 4/5 | 60% |
| still-desktop-Footer-0.5 | OURS | src | src | src | src | 1/5 | 60% |
| still-desktop-Images-0.5 | OURS | OURS | OURS | OURS | OURS | 5/5 | 100% |
| still-desktop-Intro-1 | OURS | OURS | src | OURS | src | 3/5 | 40% |
| still-desktop-Mechanism-0.25 | OURS | OURS | OURS | OURS | OURS | 5/5 | 100% |
| still-desktop-MovementWatchRight-0.25 | src | src | OURS | OURS | OURS | 3/5 | 40% |
| still-desktop-Parts-1 | OURS | OURS | OURS | OURS | OURS | 5/5 | 100% |
| still-desktop-Straps-0.75 | OURS | src | src | OURS | OURS | 3/5 | 40% |
| still-desktop-VerticalText-1 | src | src | src | src | src | **0/5** | 100% |
| still-mobile-Colors-0.75 | OURS | src | OURS | OURS | OURS | 4/5 | 60% |
| still-mobile-Disassembly-0 | OURS | OURS | OURS | OURS | OURS | 5/5 | 100% |
| still-mobile-Disassembly-1 | OURS | OURS | OURS | OURS | OURS | 5/5 | 100% |
| still-mobile-Hands-0.75 | OURS | src | OURS | OURS | OURS | 4/5 | 60% |
| still-mobile-Images-1 | OURS | OURS | OURS | src | OURS | 4/5 | 60% |
| still-mobile-Mechanism-0.25 | OURS | OURS | OURS | OURS | OURS | 5/5 | 100% |
| still-mobile-MovementWatchRight-0 | OURS | OURS | OURS | OURS | OURS | 5/5 | 100% |
| still-mobile-MovementWatchRight-1 | src | src | src | src | src | **0/5** | 100% |
| still-mobile-Straps-0.75 | src | src | src | src | src | **0/5** | 100% |
| still-mobile-VerticalText-0.75 | src | OURS | OURS | src | OURS | 3/5 | 40% |
| video-desktop-colorway_swap | OURS | src | src | OURS | OURS | 3/5 | 40% |
| video-desktop-explode | OURS | OURS | OURS | OURS | OURS | 5/5 | 100% |
| video-desktop-scroll | OURS | OURS | OURS | OURS | src | 4/5 | 60% |
| video-mobile-scroll | OURS | OURS | OURS | OURS | OURS | 5/5 | 100% |

Unanimous OURS: 10 pairs (both Mechanism macros, both Disassembly mobiles, desktop Colors-1 / Images-0.5 / Parts-1, mobile MWR-0, video explode + mobile scroll). Unanimous SOURCE: 3 pairs (desktop VerticalText-1, mobile MWR-1, mobile Straps-0.75) — the tune list's top three.

## Deception probe (gate d) — detail

Question posed: *"Which of these is the shipping professional site?"* Fail rule: judges reliably picking ours as the amateur build.

Result: **zero seats picked ours as the amateur build; all five identified the ONE HERTZ side as the professional site.** Recurring reasons across seats: the persistent live vital chip, mono spec ledgers with spec-true microcopy ("512 Hz", "LTPO3", "3000 nits · down to 1 Hz"), numbered catalog eyebrows, the set credits colophon, and zero broken captured states — while the source side's matched-moment frames showed clipped headlines, occluded captions, and mid-transition emptiness. The probe inverted in our favor: seat 4 explicitly called the source side "the imitation."

## Exceed clause (gate c) — claimed levers vs judge evidence

Rubric names three claimed levers; all three surface verbatim in winning rationales:

- **Post stack / lighting**: "A's rim light on the crown knurl and the engraved DIVE-40M caseback ring cuts through the dark" (seat 5, Mechanism); "grades the gray backdrop around the case and gives the blue loop a soft studio falloff" (seat 1, mobile Images).
- **Per-part copy**: "B stages the explode with annotation beats (Sapphire crystal, LTPO3 OLED cards at frames 06-10) and a closing thesis line" (seat 2, explode video); "authored copy line about twelve millimeters of titanium" (seat 1, mobile Hands).
- **Screen liveness**: "persistent 64 BPM vital chip" (seat 4 probe); "the 58 / 220 BPM stat numeral" cited as a hierarchy asset by seats 2, 3, 4, 5 (Curves).

Strict-above-source held on all five axes (needed 3).

## Inter-judge agreement (gate e) — detail

- Mean pairwise agreement on unblinded outcome: **77.5%** (threshold flag at <70% — not flagged)
- Mean modal agreement: 86.7% · unanimous pairs: 13/24 (10 ours, 3 source)
- Lowest-agreement pairs (40%, 3–2 splits): desktop Intro-1, desktop MWR-0.25, desktop Straps-0.75, mobile VerticalText-0.75, colorway_swap video — every one appears in the tune list below; disagreement tracks genuinely contested frames, not judge noise.

## Loss ledger — all 34 source wins, ranked by frequency (ADVISORY tune list; no gate failed)

Diagnostic anchored-scale placement from seat notes: our best moments 7–8 (Awwwards HM → SOTD), weakest captured states 4–5. The 34 losses concentrate: **17 of 34 (50%) come from just four "empty/under-composed matched moments"** — beats where the capture progress lands after our composition has exited or before it assembles.

### T1 · still-desktop-VerticalText-1 — 5/5 losses (composition, typography)
At progress 1.0 ours is a lone small watch in a mostly empty light field; the rotated masthead and caption columns have already left. Source still composes its full rotated-glyph lockup at the same moment.
> "A strands one small watch left of center and leaves two-thirds of the frame vacant" (s1) · "a lone centered product on an otherwise empty field" (s2) · "A's frame carries almost no typography beyond the tiny BPM chip" (s3) · "a lone watch adrift in an otherwise empty light field" (s4) · "A strands a small watch in a mostly empty light field" (s5)

**Tune**: hold the rotated ONE—HERTZ masthead + twin copy columns through section exit (progress 1.0), or retime their out-choreography past the last capture step.

### T2 · still-mobile-MovementWatchRight-1 — 5/5 losses (material ×3, composition, light)
Ours at mobile MWR end is a static centered strap-back view: dial hidden, uniform matte band, flat even light. Source shows a diagonal bracelet sweep with link-by-link speculars and guilloché dial.
> "uniform matte rear of the band where the buckle is the only material event" (s1) · "A's matte band and dark caseback stay inert" (s2) · "a static centered strap-back view that hides the dial entirely" (s3) · "B's plain matte rear-band view" (s4) · "B is even, flat studio gray with only a faint floor shadow" (s5)

**Tune**: at MWR progress 1.0 mobile, end on a diagonal composition keeping the dial in frame; add an authored key-light raking the case/band with specular variation on the Ti buckle hardware.

### T3 · still-mobile-Straps-0.75 — 5/5 losses (composition ×3, material, light)
Ours at mobile Straps 0.75 is a near-empty frame — band reduced to a washed gray sliver in the top-right corner, middle ~60% of the screen empty.
> "middle sixty percent of the screen empty with the band reduced to a desaturated corner silhouette" (s1) · "a near-empty frame with only a sliver of band at the top-right corner" (s2) · "a small gray sliver of band in the top corner of an empty page" (s3) · "washed to a shapeless gray silhouette with almost no modeling" (s4) · "two-thirds of the frame empty with the band clipped to the top-right corner" (s5)

**Tune**: reframe the mobile Straps camera/timeline so the band macro fills the frame at 0.75 with headline + caption present (portrait framing currently inherits a desktop-tuned beat).

### T4 · still-desktop-Footer-0.5 — 4/5 losses (material, typography, composition ×2)
Three distinct faults: spec-ledger top row (ECG ELECTRODES) clipped at the viewport edge; four-watch lineup too small and flat-lit to differentiate finishes; lineup detached below the table with a dead gray band and no focal point (vs source's type-as-scenery poster gesture).
> "its top row (ECG ELECTRODES) is clipped by the viewport edge" (s3) · "A's four-watch lineup floats detached below its spec table with a dead gray band between the two zones" (s4) · "A's four small watches are flat-lit and material-indistinct at this size" (s2) · "B stacks a spec table over a small, evenly spaced product row with no focal point" (s5)

**Tune**: fix ledger top-row clipping at 900px; scale the lineup up and interleave it with the outro type (scale contrast); light the four finishes so each reads distinct.

### T5 · still-mobile-VerticalText-0.75 — 2 losses + 2 "graze" notes in wins (typography)
The vital chip overprints the "Always-On Retina" / "3000 nits" spec lines. Seats 3 and 5 still gave us the win but both flagged the same graze — **4/5 seats named this collision**, making it the most frequently named single defect.
> "B's vitals chip overprints the Always-On Retina and 3000 nits spec lines into an unreadable collision" (s1) · "the 64 BPM chip collides directly with the 'Always-On Retina' spec line, breaking the block" (s4)

**Tune**: add the mobile VerticalText spec block to the chip's ONE-owner `getYield` policy (same mechanism as the P4 Images/Footer yields). Related 1× loss: mobile Hands-0.75 chip/copy collision (s2) — same owner fix should cover both.

### T6 · still-desktop-Straps-0.75 — 2 losses (material)
Ours' blue band reads "flat and waxy" / confined to the top-right of an empty canvas at this beat — desktop sibling of T3's framing fault plus an elastomer shading gap.
**Tune**: same reframing lever as T3; plus sheen/subsurface falloff on the Ocean band at this camera distance (the winning seats 1/4/5 frames prove the material can read — it's beat-specific).

### T7 · video-desktop-colorway_swap — 2 losses (motion)
"B's frames 01-07 are a nearly static spec sheet before the endcard zoom" (s3); "mild slot crossfade and slow zoom" vs the source's designed snap-to-black interstitial beat (s2). Seats 1/4/5 scored our continuous move the winner — contested, not broken.
**Tune**: add one designed beat to the swap choreography (e.g. a hard cut or pulse on band-color commit) so the first half of the clip is not motion-flat.

### T8 · still-desktop-Intro-1 — 2 losses (typography)
Ghost/outline lines of the intro stack wash out at progress 1.0: "top line 'THE' is washed nearly invisible against the light ground" (s3); "buries TIRELESS behind the band ring and muddies legibility" (s5).
**Tune**: raise outline-register contrast at Intro end and nudge the band-ring overlap so TIRELESS keeps its silhouette.

### T9 · remaining losses
- **desktop MWR-0.25** (material, s1+s2 — 2 losses): screen glare / "one smeary gray reflection" washes the dial at this beat → cap crystal reflection intensity at MWR first quarter.
- **desktop Curves-0.5** (light, s1): product "blown out to a milky haze that erases the case edges" under GUARDED CONTOURS → pull exposure/bloom at Curves midpoint.
- **mobile Colors-0.75** (light, s2): "even, shadowless catalog lighting" → add gradient/specular atmosphere to the mobile picker stage.
- **mobile Images-1** (composition, s4): gallery caption row bottom-right "faded to illegibility" at end state → hold caption opacity through exit.
- **video-desktop-scroll** (motion, s5): "frame 07 on a near-empty beat with only a faint 'PR' ghost" → tighten the Hands/Straps hand-off so no scripted-scroll beat lands empty.

## Caveats (reported per honesty rule)

1. **Matched-moment capture symmetry**: several source losses are the *source's* mid-transition states at the frozen progress step (e.g. desktop Colors-1 source frame near-empty; desktop Images-0.5 source caught mid-transition; "Mechanism" column faded in Parts). The protocol is symmetric — ours was punished identically at VerticalText-1 / Straps-0.75 — but the 71.7% should be read as "at these 24 frozen moments," not a claim over every scroll position.
2. **Axis self-assignment**: axis labels were not printed on pack images; seats assigned axes to pairs themselves, so per-axis n is uneven (16–34) rather than the uniform design. The aggregate 86/120 is axis-independent; both axis gates clear with wide margin under the judge-tagged axes. Future packs should print the axis on the pair sheet.
3. **Seat 3 probe letter ambiguity**: seat 3 answered "A" but ours was A in exactly 12/24 of its pairs; its *feature description* of the professional side (eyebrow labels, mono data chips, resolved specific copy) is unambiguously ours' system, so it is counted as picking ours. Excluding seat 3 entirely, the probe is still 4/4 in our favor.
4. Judges' own in-notes product tallies (seat 4 "19-5", seat 5 "17/24") differ by ±1 from the sealed-key unblinding (18-6 both) — judge-side attribution guesses; the sealed key is authoritative for all math in this report.
5. Anchored scale remains diagnostic only, per rubric — no /10 averaging entered any gate.

## Repro

- Ballots (verbatim, as returned by the 5 seats): `evals/judge/ballots.json`
- Sealed key: `evals/judge/pack/answers.json` (never shown to judges)
- Gate math: deterministic unblind + tally over the two files above; every number in this report is recomputable from them.
- Finishing gates this lane: `npm run build` clean (tsc strict + vite; pre-existing >500 kB chunk advisory only) · `evals/engine-smoke.mjs` **ALL PASS** (headless real Chrome, vite preview :4661).
