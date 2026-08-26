# P4 lane notes — final copy pass

Status: **DONE — full green** · 2026-08-26 · lane: P4 copy
Law: `docs/LOOKBIBLE.md` §8 budgets + §4 type · `docs/p15/motion-bible.md` · founder
2026-08-26 (Ocean-only recolor axis, real Apple Ocean colors) · PLAN §2 beats + §5 P4
adversarial-review clause. `sections/index.ts` untouched · no new deps · no git ops.

Verified empirically on the FINAL tree: `npm run build` (tsc strict + vite) clean ·
**engine-smoke ALL PASS** · **swap-smoke ALL PASS** · **copy-smoke (new, this lane)
17/17 ALL PASS** — all on vite preview :4640 (lane port, killed after), headless real
Chrome via playwright-core `channel:"chrome"` · evidence frames re-captured →
`docs/p4/copy/*.png` (11 deterministic `?eval=1` frames @1600×900 DPR2 + 1 interaction
frame), Nocturne/Straps/Footer eyeballed on the actual pixels.

## Adversarial review (PLAN P4 law) — what was checked, what was wrong

**Apple specs, verified against apple.com via live fetch 2026-08-26**
(`/apple-watch-ultra-3/specs/`, `/shop/buy-watch/apple-watch-ultra`, overview page):

| Claim in src | apple.com truth | Verdict |
|---|---|---|
| Ultra 3 depth 12 mm (hands.ts) | "Depth: 12mm" | ✅ (14.4 was Ultra 2) |
| gallery cell `SIDE-14MM` / "14.4 millimetres" (images.ts) | 12 mm | ❌ **FIXED** → `SIDE-12MM` / "12 millimeters" |
| "Titanium case, Grade 5" (verticaltext) | verbatim on specs page | ✅ |
| 3000 nits · LTPO3 · wide-angle OLED · 1 Hz | verbatim | ✅ |
| 42-hour cell · "12 hours in a 15-minute charge" | "15 minutes for up to 12 hours" | ✅ |
| S10 SiP (disassembly/explode copy) | "S10 chip" | ✅ |
| WR 100 m · dive 40 m (±1 m, EN13319) | verbatim | ✅ |
| 49 mm · titanium (intro spec line) | verbatim | ✅ |
| ECG 512 Hz, wrist temp ±0.1 °C, accel 256 g (parts table) | Apple-published | ✅ |
| Ocean colors Black / Anchor Blue / Neon Green (colorway.ts) | exactly those three, both finishes | ✅ |
| "Swimproof" (movement.ts) | Series-tier word; not Ultra vocabulary | ❌ **FIXED** (see below) |
| MIL-STD 810H (considered for reliability line) | NOT found on fetched pages | not used |
| mic "0–130 dB" (parts) | Noise app "up to 130 dB"; no mic hears 0 dB SPL | ❌ **FIXED** → "to 130 dB" |
| watchOS 26 only (footer lineup line) | 27 announced, unshipped — excluded per brief | ✅ |

**Horology glossary check** (tourbillon / calibre / complication / power reserve +
the full strikethrough grammar): hesalite (real acrylic-crystal term), guilloché,
mainplate, mainspring barrel (specced by reserve → "42-hour cell" is the correct
analogy), hammer & gongs → Taptic, going train, balance wheel 4 Hz (28,800 vph class —
correct modern beat), "jewel bearing", CALIBRE table, power-reserve-as-sleep — all used
in their reference senses; no fake-deep found. Two REAL vocabulary defects found+fixed:

1. **"WOVEN, / NOT FORGED" (Straps)** — the Ocean Band is molded fluoroelastomer;
   *woven* is Alpine/Trail's craft. → **"MOLDED, / NOT FORGED"** (antithesis stays
   materials-true: molded polymer vs the source bracelet's forged links); body line 1
   "drawn under tension" → "molded without a seam".
2. **"LIQUID GLASS" (MWR annotation)** — Liquid Glass is the watchOS 26 SOFTWARE
   material (it legitimately lives on the rendered dial, dial/spec.ts); the physical
   part_crystal is Apple's "flat sapphire crystal". → label **"FLAT SAPPHIRE"**, spec
   **"CORUNDUM · IOR 1.77"** (ties to the explode copy's "synthetic corundum").

## Family callout decision (founder: Ocean-only) — executed

- **Straps rail rewritten to the Ocean color story**: `THE FAMILY / OCEAN · ALPINE ·
  TRAIL · MILANESE / "Four bands. One heartbeat."` → **`OCEAN BAND / ANCHOR BLUE ·
  BLACK · NEON GREEN / "Three waters. One heartbeat."`** Labels DERIVE from
  `ui/colorway CONFIGS` (one table, real apple.com names); the dimmed
  pseudo-option cue is gone — dim tier now just means "not the band on stage".
- **Live tick is now stateful**: `strp__fam-item--live` tracks the ACTIVE config's
  band over CONFIG_CHANGE (same `resolveConfig` bus path as gallery/Colors rail);
  boot tick = boot config's band. Verified across a swap (x-straps-rail-swap.png).
- **Colors lead honesty**: "Two finishes. Four band colors. One heart." claimed four
  colors; the table ships THREE real colors across four finish×color editions →
  **"Two finishes. Three Ocean colors. One heart."**
- Footer lineup labels were already config-driven (band+finish per instance) — no
  change needed; MILANESE no longer appears anywhere user-visible.

## Fraunces — THE one editorial moment (§4 law closed)

Placed on the **Nocturne lead**: *"Light leaves the page. The dial remains."* —
`--font-serif` italic, wght 380, `"opsz" 144, "SOFT" 0, "WONK" 0`,
`clamp(2.5rem, 3.2vw, 3.2rem)` (40 px floor, **51.2 px measured** @1600), porcelain
92% on the ink ground under DARKNESS, MEASURED. Font VERIFIED loading
(`document.fonts.check` true; the woff2 was shipped but previously unused — every
prior frame rendered zero Fraunces). Smoke asserts **exactly one** element sitewide
computes to Fraunces (the §4 "spent once" law is now machine-checked). The old P3
note "Fraunces immaterial ~28px" was stale — `.prt__summary-value` was Inter italic;
it stays Inter (no second serif moment).

## Site-wide polish (voice pass, budgets re-measured)

- Catalog card grammar unified: Straps card `BPM · CARD 03/03` → **`CATALOG 03/03`**;
  unit line `"bpm — the band"` → **`"bpm"`** (caption carries the story).
- Hands card: caption "Assertive Profile" (filler, broke the caption sentence
  grammar) → **"Working rate. The case keeps its posture."**; zones line
  `rest / max` → **`tempo / max`** (96 bpm is not a resting rate — data honesty).
- Movement reliability: "Swimproof. Crash and fall detection." → **"Crash and fall
  detection. It calls when you can't."** (verified features only).
- Spelling unified to American (site voice: "Colors", "colorway"): hands
  "millimetres/colour" → "millimeters/color"; images alt likewise.
- Credits slate final (task list ✓✓✓): built by CHEN · "The Watch" by 60fps ·
  Apple USDZ · authored 8-former HDRI · type row (all four faces, all now truly on
  page) · **"as of watchOS 26 · August 2026"** · fin line. 6 rows + fin = 7 ≤ 7,
  max line 40 ≤ 44 (machine-checked).
- Sound-toggle micro-copy audited: already stateful + correct ("enable heartbeat
  sound" / "mute heartbeat sound" / reduced-motion variant) — no change.
- Cursor vocabulary untouched (fixed set enforced by smoke).
- Stale comment examples ("· Tide") in colorway.ts/parts.ts updated in passing.

## Harness fix (integrate pitfall #1 class — harness bug, not engine)

`swap-smoke.mjs` cross-placement check still expected the pre-recolor placeholder
name **"Ember"** at slot 2; the engine truthfully reports "Ocean · Neon Green"
(config `natural-neon-green`). Expectation updated to the real color name —
semantics preserved, re-run ALL PASS.

## New lane artifact

`evals/copy-smoke.mjs` — 17 copy-truth assertions (spec truth, Ocean-only rail +
live tick across swap, single-Fraunces law + font-load + ≥40px, credits budget,
cursor vocab, zero console errors) + captures the 12 evidence frames. Run:
`npx vite preview --port 4640 & BASE=http://localhost:4640 node evals/copy-smoke.mjs`.

## Handoffs / flags

- **P5 council**: LOOKBIBLE §6 frame #4 is NAMED `side-14mm` ("the 14.4mm story") —
  stale vs apple.com (12 mm; 14.4 was Ultra 2). Page copy now says 12; the LOCKED
  bible + any Cycles master filenames using `side-14mm` need a council-signed rename
  (gallery assets are `${finish}_${n}.webp` by index, so nothing breaks meanwhile).
- **P5 council**: type credits row lists faces only; foundry/license detail
  (Fontshare/ITF FFL, SIL OFL) intentionally lives in README, not the 44-char slate.
- Straps ghost "MOLDED," verified composed at .25 (frame in docs/p4/copy/); the
  concurrent look-lane REVEAL_FROM_BAND contrast tune on body line 3 coexists —
  capture shows both.
- Fraunces lead wraps to 2 lines at 1600×900 (max 3 allowed by §8 Nocturne budget) —
  authored, looks right on the frame; mobile re-check rides the next mobile pass.
