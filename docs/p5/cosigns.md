# P5 lane notes — council co-signs + state schema v2

Status: **DONE — 29/29 PASS, 0 SKIP, gate PASS (passRate 1.0)** · 2026-08-26 · lane: P5 cosigns
Law: `docs/LOOKBIBLE.md` (amended this lane, see §2 below) + `evals/rubric.yaml`
(amended v1.0.0 → **v1.1.0** under its own amendment policy) + `docs/p4/integrate.md`
handoffs · no git ops, no new deps · this lane discharges the co-sign debts every
P3/P4 lane flagged for "P5 council" and lands the schema-v2 decision they deferred.

## 1 · State schema v2 + rubric v1.1.0 (the standing SKIP, closed)

**Decision (co-signed): `state().scroll` scalar → `{position, velocity, enabled}` —
`STATE_SCHEMA_VERSION = 2`.**

- Why: schema v1 froze `scroll` as a bare `lenis.scroll` scalar (P1 decision,
  `docs/p1/integrate.md` §6), which made the rubric's `longpress-lenis-stop` read
  (`state().scroll.enabled`) structurally impossible — a permanent SKIP through
  P3/P4 (28/29 every round). The behavior itself was never in doubt (verified via
  `mobile-touch-hold` + cursor smoke); only the read surface was missing.
- Shape: `position` = the Lenis smoothed offset (the old scalar, renamed honest);
  `velocity` = `lenis.velocity` (px/frame, the engine's own idle signal);
  `enabled` = `!lenis.isStopped` — **engine-level truth covering every stopper**
  (longpress hold-zoom AND the explode touch-drag arbitration), not a per-mechanic
  mirror. `state().longpress.scrollEnabled` stays as the longpress-caused mirror
  (cursor smoke asserts it).
- Files: `src/core/debug.ts` (schema bump + `ScrollStateSnapshot`),
  `evals/engine-smoke.mjs` + `evals/cursor-smoke.mjs` (scalar reads →
  `.scroll.position`, schema checks v1 → v2 + shape assert), `evals/assert.ts`
  (`longpress-lenis-stop` skip-guard now names the v2 contract; the check itself
  was already object-shaped and arms automatically).
- Rubric bump: `evals/rubric.yaml` meta **1.1.0** with a `changelog` block carrying
  the rationale (amendment policy: version bump + design-council sign-off — this
  lane is that sign-off, recording the flags raised in `docs/p3/integrate.md` and
  `docs/p4/integrate.md`).

## 2 · LOOKBIBLE housekeeping co-signs (all four flags discharged)

Recorded in the bible itself (header "Amended 2026-08-26" line + in-place edits):

1. **Ocean anchor `#1f6153` → `#283f58` (Anchor Blue)** — §1.3 Ocean block
   superseded by the founder's real-colors decision (Apple sells no green-teal
   Ocean band); §2 token row updated with siblings Black `#202226` / Neon Green
   `#a2df2e`; material truth = `instrument.json` `x_colorway`. Code sync: the two
   stale boot fallbacks (`colors.css --second-color`, `parts.css --prt-core`)
   moved `#1f6153` → `#283f58` so the pre-CONFIG_CHANGE flash matches the boot
   config. Historical `#1f6153` survives only in archived debug looks
   (`default/porcelain/dusk.json`) — bible now says never copy it forward.
2. **§6 frame 4 `side-14mm` → `side-12mm`** — apple.com Ultra 3 depth is 12 mm
   (14.4 was Ultra 2). Page copy shipped `SIDE-12MM` at P4; gallery assets are
   indexed (`${finish}_${n}.webp`) so nothing breaks. Source comments in
   `hands.ts` / `images.ts` updated to the new name.
3. **§1.5 table synced to shipped instrument.json** (P3 tune-w3w4 + P4 look-fixes
   §4/§5 data edits formally recorded): Hands `envRotationDeg` **245** (was 225,
   sweep-picked; arc stays monotonic 200 < 245 < 250) · per-key `bloomStrength`
   dips Colors **0.22** / Parts **0.25** / Footer **0.30** (dial-wash tune; §1.2
   postTune line updated to match) · Images `anchorOffset −0.05` + the
   `anchorOffset` wiring-contract sentence. Table note added: instrument.json is
   the data of record; re-sync, never fork.
4. **§2 Alpine/Trail line closed** — founder 2026-08-26: no purchase, no in-house
   build; axis = 2 finishes × 3 real Ocean colors, four shipped configs named.
   (Also co-signed as recorded decisions: type-credits foundry/license detail
   lives in README, not the 44-char slate — copy lane flag; the loader-role
   rubric interpretation, §3 below.)

## 3 · `sections-14-order` loader-role reconciliation (rubric = assert, codified)

The frozen role list includes `loader`, but the rubric's own frozen enumeration
(`evals/reference/source/sections.json`) has **no loader dataSection** — 15 scroll
sections Intro..Footer incl. Colors; the loader is a pre-scroll phase on the source
and here. The P3 harness resolution (loader satisfied from the shipped boot HTML
`id="loader"`, behavior still gated by `loader-honesty`; additive non-canonical
roles like `"colorway"` pass through the ordered-subsequence walk) ran as an
interpretation flag for two phases. **v1.1.0 writes that resolution into the
rubric assertion text itself** — rubric and `assert.ts` now state the same
contract verbatim; the interpretation flag is retired.

## 4 · Mobile debts

1. **ANCHOR BLUE outro label — REDESIGN co-signed (two-line box stands).**
   Fit was measured, not assumed: the 4-column rail is geometry-locked to the
   watch centers (92vw/4 ≈ 89.7px at 390px); "ANCHOR BLUE" needs ~99px at the
   portrait scale (0.8rem / `--track-caps` 0.08em — already the §4 caps tracking
   floor, so tighter tracking leaves the token system, and a smaller size breaks
   the 4-label shared scale). The P4 treatment (band label bottom-aligned in a
   2.4em two-line box, all four band bottoms + finish sublabels on one baseline)
   is hereby the designed answer, verified on the live rail this lane.
2. **Fraunces Nocturne lead at 390×844 — REAL DEFECT, fixed.** No portrait block
   existed in `nocturne.css`: the desktop right column (40vw → 156px) forced the
   40 px Fraunces floor (§4 law — the one serif moment never shrinks) into
   **7 one-word lines** colliding with the vital chip, and the char-split
   headline broke mid-word (DARK/NESS,). Fix: house 720px portrait block —
   beats widen (head 78vw · lines 74vw · score 72vw, scrims scale with them),
   lead wraps at authored sentence boundaries ≤3 lines (§8 budget), headline
   lines render as unbroken words. Verified by DOM line-count probe + frames.

## 5 · Verification (evidence, not claims — all on the settled combined tree)

- `npm run build` (tsc strict + vite): **clean** (re-verified after the perf
  lane's post.ts refactor settled; zero TS errors).
- **engine-smoke ALL PASS** (headless real Chrome, playwright-core
  `channel:"chrome"`, vite preview **:4680** — this lane's own port, killed
  after) incl. the new `state schema v2 + shape` check
  (`scroll={"position":0,"velocity":0,"enabled":true}`).
- **cursor-smoke ALL PASS ×2 serial** (32 checks, incl. `eval: schema v2` and
  the `.scroll.position` reads). Honest note: one earlier invocation flaked
  1 check while the perf lane was actively rebuilding the shared tree —
  vanished on both serial re-runs (P4 look-fixes pitfall 5 class).
- **`node evals/assert.ts` (both viewports internally): 29/29 PASS · 0 FAIL ·
  0 SKIP · gate PASS (criticals=0, passRate 1.0 ≥ 0.90)** →
  `evals/results/p5-cosigns/assert.json` (rubricVersion 1.1.0).
  `longpress-lenis-stop` now PASSES with live evidence: "enabled
  during=false/after=true, wheel moved 0px during hold, LONGPRESS_TOGGLE
  events=73" — first fully-clean scorecard of the project (every prior round
  was 28/29 + 1 SKIP).
- Nocturne portrait fix verified on the real built dist: lead = **3 lines** at
  the 40 px Fraunces floor (was 7), headline lines unbroken; frames captured
  at 390×844 (`Nocturne` 0.2/0.45, `Footer` 0.9 label rail).

## Concurrency note

The P5 perf lane was live-editing `src/gl/post.ts` in this working tree mid-lane
(renderBloom flat-array refactor); one tsc red window was theirs, not this lane's
(this lane never touched gl/). Final gates ran on the settled combined tree —
same discipline as `docs/p4/look-fixes.md` §6.

## Handoffs / open

- Beauty council round proper (5 blind judges vs frozen source captures) still
  owed — this lane cleared its co-sign pre-reqs; `evals/reference/ours` should be
  re-captured AFTER the beauty round's tree settles (look-fixes handoff class).
- Nocturne portrait re-frame is a fresh visual change — include Nocturne mobile
  frames in the next reference refresh + give the beauty council one glance
  (same class as Mobile Straps .5).
- Debug looks (`default/porcelain/dusk.json`) intentionally keep pre-supersede
  band teal — archived evidence, never shipped on the happy path.
