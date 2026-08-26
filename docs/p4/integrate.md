# P4 lane notes — integrate + deploy

Status: **DONE — full green, deployed v227a44b5** · 2026-08-26 · lane: P4 integrate
Law: `docs/LOOKBIBLE.md` + `docs/p15/motion-bible.md` + founder 2026-08-26 (Ocean-only
recolor axis, real Apple Ocean colors) · `sections/index.ts` untouched · no git ops,
no new deps · spec source: `evals/rubric.yaml` + gate verdicts.

Verified empirically (not claimed), all on the FINAL combined tree:
`npm run build` (tsc strict + vite) clean · **all seven smokes ALL PASS run serially**
(engine 29/29 · dial · cursor · explode 39 · vital 21 · swap 26 · copy 17 — headless
real Chrome, playwright-core `channel:"chrome"`, vite preview **:4660**, this lane's
own port, killed after) · **zero console errors on live full-page walks, both
viewports** (1600×900 + 390×844, 41-step scroll each) · **`npm run eval:assert`
28/29 PASS, 0 FAIL, 1 SKIP, gate PASS** (criticals=0, passRate 0.966 ≥ 0.90) →
`evals/results/p4-integrate/assert.json` · **`evals/reference/ours` fully refreshed**
(150 canonical + 16 interaction frames, zero skips — the real-Ocean world replaces
the stale Tide/Graphite/Ember/Midnight reference frames) · dist token scan clean
(`FS 60P` / `Nekst` / `fps-` zero hits; "60fps" only in the credits slate, the
sanctioned location) · **deployed `npx wrangler deploy` →
https://one-hertz.ubonranto.workers.dev (Version 227a44b5)** · **engine-smoke ALL
PASS against prod** (`NAV_TIMEOUT_MS=180000`, P3 pitfall #3 throughput allowance).

## Gate (why docs/p4/gate.json is authored by this lane)

No P4 gate verdict existed — all four P4 lanes (copy, gallery, look-fixes, perf)
shipped DONE with their own gates green. Per brief, this lane synthesized
`docs/p4/gate.json` from the lane evidence + fresh live judgment (probe frames in
`docs/p4/gate-probe/`, captured by `evals/p4-gate-probe.ts`, a kept lane artifact).
Single-director gate — NOT the beauty council.

## The 4 gate:p4 TUNEs — all applied + verified this lane

| # | Item | Fix | Evidence |
|---|---|---|---|
| 1 | **Vital chip full-strength over the mobile gallery sheet** (crossed cell 05 BACK-CRYSTAL on 390×844 — the last unowned fixed-chrome overlap, pre-existing P3 debt) | Images portrait traversal joins the ONE-owner `getYield` policy in `src/main.ts` — strictly inside the measured section span (`lastRawScroll ∈ [start, end]`), so the clamp can never leak a yield into later sections. Desktop untouched. | `docs/p4/gate-probe/m-Images-5.png` (chip whispers at 0.12 over the cells) |
| 2 | **Mobile outro rail ragged baselines** — ANCHOR BLUE wraps to two lines in slots 1/4 at 92vw/4 columns while BLACK / NEON GREEN sit one | Portrait-only: band labels bottom-align inside a 2.4em two-line box (`src/sections/footer.css`) — all four band bottoms + finish sublabels share one baseline rhythm; title type scale preserved instead of shrinking to force one line. | `m-Footer-1.png` (aligned rail, chip whispering) |
| 3 | **Harness flake: `explode-tap-tolerance-15px`** — FAIL on run 1 (20px gesture "selected" = stale selection from a raced overlay close), PASS solo; same signature look-fixes recorded | `evals/assert.ts`: the close step now retries until `state().explode.selected` actually clears (≤3 attempts, verified wait) instead of a blind 400 ms sleep. Semantics unchanged; engine behavior separately proven by explode-smoke 39/39 both runs. | assert re-runs: 28/29 twice in a row post-fix |
| 4 | **Stale reference set** (gallery lane flag 4) | Full `eval:capture` refresh, both viewports, on the final deployed tree. | `evals/reference/ours/manifest.json` — 166 frames, zero skips |

## Live judgment notes (what the probe confirmed beyond the lane claims)

- All 13 gate:p3 tunes re-verified on fresh frames from the combined tree
  (Movement annotation, Parts card clearance, Hands satin flank, Straps line 3,
  Footer desktop+mobile, chip yield desktop, DAYBREAK tag) — no lane claim
  diverged from the page.
- The m-Footer chip "overlap" in early probe frames was the DESIGNED whisper
  (yield 0.12), not a defect — judged acceptable at 0.12 over the label rail.
- d-Footer-9 shows the desktop yield working exactly as look-fixes described
  (chip ghost beside TOTAL WEIGHT immaterial).

## Deploy

- `npx wrangler deploy` → **https://one-hertz.ubonranto.workers.dev** · Version
  **227a44b5-b50b-40df-9e08-044b0a978a38** (28 assets uploaded, 24 unchanged —
  the real-Ocean gallery sets + re-encoded GLB + new bundle).
- Prod verification: engine-smoke ALL PASS (nav timeout allowance only; app
  itself healthy fast — first load is now 3.94 MB, ~14× lighter than pre-P4).

## Rough edges / handoffs (P5)

- **Beauty council not run** — this was a single-director gate. P5's council
  (5 blind judges vs frozen source captures) is the real beauty gate; the
  refreshed `evals/reference/ours` is ready for it.
- **P5 council co-signs owed**: LOOKBIBLE §1.3/§2 ocean anchor `#1f6153` →
  real-Ocean palette · §6 frame name `side-14mm` vs 12 mm truth ·
  `longpress-lenis-stop` schema-v2 decision (the standing SKIP) · type-credits
  foundry detail lives in README not the slate.
- **Perf**: proxy tier2 median at exactly the 40 fps floor (6× CPU throttle) —
  real mid-tier device round required before ship; founder iPhone = named
  flagship. Offline PMREM prefilter as CI-determinism polish. Expose `lenis` on
  `__ONE_HERTZ__` under eval for the contract scroll driver. Rubric's CDP
  Performance trace crosscheck still unimplemented in perf.ts.
- **Deploy-weight prune (worker-side)**: studio HDR 6.5 MB fallback +
  duplicate bundled basis 584 KB + porcelain/dusk debug HDRs 2.7 MB still ship
  (never fetched on the happy path). `Cache-Control` review for repeat visits.
- **Mobile Straps .5** composes as a type-only beat (band macro exits frame
  right) — reads intentional, but worth one council glance.
- Chip-yield windows are data in `src/main.ts` (`learnFooterSpan` learns both
  spans) — any future fixed-chrome conflict joins there, never a local dodge.
- `evals/p4-gate-probe.ts` kept — cheap re-judgment harness (walks + 16 frames)
  for any future gate.

## Pitfalls found this lane (inherit)

1. **A dimmed-by-design element can read as a defect in a screenshot** — check
   the owning policy's windows before filing a chrome-overlap bug (the Footer
   "overlap" was the designed 0.12 whisper; the Images one was real).
2. **assert.ts takes its target as a positional arg** (`npm run eval:assert --
   <url>`), not `BASE` — the smokes take BASE. Mixing them wastes a run on
   ERR_CONNECTION_REFUSED against :4173.
3. Blind post-action sleeps in harness checks are flake factories — every
   "do X then read state" step should wait on the state predicate itself
   (this lane's tap-tolerance fix; same class as P3's ready-race fix).
