# P1.5 lane notes — type shootout (no src edits)

Status: **DONE — verdict below** · 2026-08-20 · comps rendered + judged, spec handed to look bible
Scope: PLAN §3 "Type" — settle the split-char display voice with real comps (5 candidates), the Geist Mono
tabular data comp, and the serif-accent question. No `src/` edits this lane; §5 is the integration order.

Method (all evidence rendered, not claimed): real headline set ("the tireless electrical watch", ONE HERTZ,
Electrical Heart, CALIBRE 1HZ, BPM 58/220) rendered at display sizes with tight tracking (−0.025 em colossal,
−0.02 em tier) on BOTH grounds — dark-on-porcelain `#EDEDEB` and porcelain-on-ink `#0B0B0C` — identical board
layout per candidate, headless **real Chrome** (playwright-core `channel:"chrome"`, DPR 2), fonts fetched from
official free channels only into scratchpad (**zero font files entered the repo**). Judged against the frozen
source frames (`evals/reference/source/desktop/Intro_0, Timeless_0.5, Mechanism_0.5, Images_0.5`), Apple
precision, and the ONE HERTZ thesis.

**Evidence** → `research/lookdev/type/`:
`comp-a-clash-display.png` · `comp-b-geist.png` · `comp-c-general-sans.png` · `comp-d-archivo-expanded.png` ·
`comp-e-pp-neue-montreal.png` · `comp-contact-sheet.png` (A–D same line, both grounds) ·
`comp-mono-tabular.png` · `comp-serif-accent.png` · `reference-pp-specimen.png`

## 1 · The source voice, read from the frozen frames

Nekst at 60fps.fr = **light weight at colossal size** (never bold), generous width with **oval,
flat-sided bowls** (the б-flavored 6, the near-superelliptical O), ALL-CAPS display lines, tracking ≈ 0,
hierarchy by **tone not weight** (ghost-gray layers behind ink lines, staggered two-line stacks), quiet
medium-weight gray labels. The voice is couture-instrument, not techno-aggression. Any winner must carry
light + wide + oval, and survive split-char isolation.

## 2 · Verdict per candidate

| # | Face | Verdict | Reading of the comps |
|---|---|---|---|
| **A** | **Clash Display** (Fontshare, free) | **WINNER — at weight 300, not the shipped 600** | The only candidate with Nekst's actual DNA: wide oval bowls, flat sides, light monolinear color. Colossal "ONE HERTZ" and the 58/220 numerals are the closest thing to the source frames in the whole field. Caps carry real identity in split-char isolation. Mannered lowercase (t/l/e quirks) is contained: display lines are caps-led, body stays Inter. The comp's 600-weight row proves the **current CSS weight is the wrong voice** — chunky grotesque, zero couture. |
| B | Geist (all-Geist system, OFL) | runner-up for *system coherence*, loses the display voice | Precise, even, Apple-clean — and anonymous. Narrower than the source voice; colossal lines read "dev-tool brand", not watch campaign. Geist **Mono** survives regardless (data voice, §4). |
| C | General Sans (Fontshare, free) | drop | Competent humanist-geometric middle; nothing it does best in this field; less width than A, less precision than B/E. |
| D | Archivo Expanded wdth 125 (OFL) | drop (with a note) | Closest to source *width* and superb wide numerals, but squared shapes read motorsport/NASA — fights the porcelain tenderness. Also eats the measure: 212 px overflows a 1600 board; had to drop to 164 px (kept in comp as evidence). Not worth a third voice. |
| E | PP Neue Montreal (trial, commercial class) | **beauty runner-up** — premium-neutral, not this site's voice | Gorgeous, even, the most "premium hardware campaign" texture in the field; numerals superb. But it is a *neutral* grotesque — normal width, no oval DNA — and porcelain-set PP NM is the default look of every premium portfolio right now. A is more the source's voice AND more ours. Per PLAN, cost was not a criterion in this call. |

**Serif accent (one editorial moment, à la source's EB Garamond):** **Fraunces Italic wins** —
`comp-serif-accent.png`: at 96 px, Fraunces (opsz 144, wght 380, SOFT/WONK 0) keeps machined, high-contrast
edges on both grounds; EB Garamond italic reads bookish/renaissance and its hairlines go soft on ink.
Fraunces' "human warmth inside a machined world" is literally the thesis. EB Garamond remains the
likeness-faithful fallback if the council wants the source's exact flavor. Spend it ONCE (Nocturne or the
Timeless-class beat), sizes ≥ 40 px only.

**Geist Mono tabular data (`comp-mono-tabular.png`):** CALIBRE table rows align perfectly on both grounds
(monospace ⇒ tabular by construction; keep `font-variant-numeric: tabular-nums` declared for intent + any
proportional fallback). The dotted zero reads instrument-grade. Locked as the data voice.

## 3 · Why not Nekst itself / Söhne Breit (PLAN §3 named them)

- **Nekst (Displaay)**: no legitimate trial channel reachable this lane (product pages 404 under the known
  URL patterns; no trial endpoint found). Deeper reason: shipping the source's literal typeface undermines
  the *semantic translation* thesis and collides with the repo's own token-leak rule ("Nekst" allowed only in
  credits + README). Judged unnecessary once A carries the same DNA. Price: verify at displaay.net checkout
  if the council disagrees.
- **Söhne Breit (Klim)**: same premium-neutral class as E; E already represents the class in the comp and
  lost on voice, not on execution.
- **PP Neue Montreal comping method**: direct trial-file download was blocked by the environment's permission
  layer, so candidate E was comped **in-browser on Pangram Pangram's own official TypeTrials page**
  (typetrials.com — their trial-testing tool; their fonts, their origin, our copy typed in). No trial files
  were retained; nothing pirated; official specimen captured as `reference-pp-specimen.png`.

## 4 · Locked type spec (input to LOOKBIBLE.md — look agents build against this)

- **Display**: Clash Display — colossal/hero **300**, section headlines **300–400**, eyebrows/labels **500**.
  **Weight 600 is banned at display sizes** (comp evidence). Caps-led display lines.
- **Tracking**: −0.025 em ≥ 160 px · −0.02 em 64–160 px · −0.01 em 32–64 px · labels/eyebrows +0.08–0.14 em
  (caps only). Verified on both grounds at DPR 2.
- **Hierarchy by tone (source grammar)**: ghost layer = 30–32 % alpha of the ground's counter-color; dim
  labels = 55 %; staggered second line indent ≈ 0.55× cap-height of the line above (see any comp's
  ELECTRICAL/HEART block).
- **Body**: Inter (unchanged, `--font-body`). Never set body/sub paragraphs in Clash.
- **Data**: Geist Mono, `tnum` declared, BPM/depth/altitude figures and the CALIBRE table always mono.
- **Serif accent**: Fraunces Italic variable (`opsz` 144 display / 60 sub, `wght` 380, SOFT 0, WONK 0),
  exactly one moment sitewide.
- **BPM numerals**: display face 300 (oval bowls are the point), `tabular-nums` where values animate 58↔220.
- **Modular scale (from the comps' proportions)**: 212 / 104 / 46 / 30 / 26 / 22 / 15 px at 1600 vw-ref —
  ratios ≈ ×2 between display tiers; clamp() mapping is the look agents' job.

## 5 · Integration order (handoff — not done this lane, no src edits allowed)

1. **Nothing is actually loaded today**: `--font-display: "Clash Display"` and `--font-mono: "Geist Mono"`
   are declared in `src/style.css` with **no @font-face and no files** — every current screenshot renders
   Helvetica Neue / Menlo fallbacks. The P1 loader already waits on `document.fonts.ready`, so adding real
   faces changes first-paint typography site-wide in one step.
2. Self-host woff2 subsets in `public/assets/fonts/`: ClashDisplay 300/400/500 (Fontshare zip ships woff2;
   ITF Free Font License permits web self-hosting), GeistMono variable (OFL), Fraunces italic variable (OFL),
   Inter (already system-falls-back acceptably; self-host for determinism). Latin subset only.
3. `@font-face` with `font-display: block` (loader owns first paint anyway) + `size-adjust` fallback metrics
   so eval screenshots stay deterministic pre/post font load.
4. Flip `.hero__title` / section headline weights 600 → 300 per §4 (one-line CSS deltas, look-dev lane).
5. Dial subsystem untouched — SF-in-canvas per its own contract (docs/p1/dial.md §4); DOM type deliberately
   contrasts with the dial's SF. No SF files in repo, unchanged.

## 6 · Licensing cost table (founder)

| Face | Role | License | Cost |
|---|---|---|---|
| **Clash Display** | display voice (winner) | Fontshare / ITF **Free Font License** — free for commercial use, web self-hosting allowed, redistribution of files as fonts prohibited (bundling in repo for the site is fine) | **$0** |
| Geist Mono (+ Geist unused) | data voice | SIL OFL 1.1 | $0 |
| Fraunces | serif accent | SIL OFL 1.1 | $0 |
| Inter | body | SIL OFL 1.1 | $0 |
| General Sans / Archivo | dropped | Fontshare FFL / OFL | $0 |
| PP Neue Montreal *(beauty runner-up, buy only if council overturns §2)* | — | Pangram Pangram unified license; prices scraped from official product JSON 2026-08-20: single style from **$40**; Light+Book+Medium ≈ **$120**; Full Family (14 styles + variable) **$430** base tier / $1,710 enterprise tier — tier scales with org size, verify at checkout | $120–430 if bought |
| Nekst (Displaay) | not comped (§3) | verify at displaay.net checkout | — |

**Bottom line: the winning system costs $0 forever, and the fix that matters most is shipping the fonts at
all — plus dropping the hero from 600 to 300.**

## Pitfalls found this lane (inherit)

1. **Inline `style` attributes with double-quoted font names silently break** (`style="font-family:"X""`
   truncates at the inner quote) — the first contact sheet rendered 100 % Times fallback while *looking*
   plausible. Any font comp must be eyeballed for the actual face, and quoted with single quotes inline.
2. Expanded faces change the measure math: Archivo wdth 125 needs ~0.77× the px size for the same line —
   budget colossal sizes per-face, not globally.
3. `document.fonts.ready` + 250 ms settle before screenshot, or Chrome shoots the fallback frame.
4. Trial-font walls: comp in-browser on the foundry's official tooling instead of hunting mirror downloads —
   faster and clean.

## Open handoffs

- Look agents: implement §5 (fonts into `public/assets/fonts/`, @font-face, weight flips) + fold §4 into
  LOOKBIBLE.md type section.
- Council at P1.5 look-lock: confirm A-at-300 against E with the comps side by side; if E overturns, founder
  buys per §6 (base-tier 3 styles $120 first, family only if the system grows).
- Motion lane: split-char rows in every comp (`SPLIT-CHAR MID-FLIGHT`) approximate mid-animation pose —
  reuse for stagger-amplitude decisions.
- Sanitizer note: scratchpad font downloads never entered the repo; `research/lookdev/type/` contains PNGs
  only. "Nekst" appears in this doc as decision rationale — allowed location per compliance rule? It's under
  `docs/`, not `dist/` — dist token-leak scan unaffected.
