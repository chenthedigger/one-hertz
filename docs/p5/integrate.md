# P5 lane notes — integrate + deploy

Status: **DONE — full green, deployed v5ce3e87a (with asset prune)** · 2026-08-27 · lane: P5 integrate
Law: `docs/LOOKBIBLE.md` · `evals/rubric.yaml` v1.1.0 · `docs/p4/integrate.md` (state at
hand-off) · `docs/p5/verdict.md` (beauty gate) · no git ops, no new deps.

## Beauty gate → no edits (step 1)

`docs/p5/verdict.md`: **BEAUTY GATE PASS, 5/5 gates** (71.7% win-or-tie · worst axis
66.7% · exceed on 5/5 axes · deception probe 5/5 seats · agreement 77.5%, not flagged).
Round 1 of 4 — no further round required. **Per brief, PASS ⇒ zero beauty edits this
lane.** The T1–T5 loss-ledger items remain advisory polish only (none gate-required).

## Full green (step 2 — all empirical, this tree, vite preview **:4690** — this lane's own port, killed after)

- `npm run build` (tsc strict + vite): **clean** — only the pre-existing >500 kB chunk
  advisory.
- **All seven smokes serial ALL PASS** (engine · dial · cursor · explode · vital ·
  swap · copy — headless real Chrome, playwright-core `channel:"chrome"`, BASE=:4690).
- **`node evals/assert.ts :4690 --round p5-integrate` → 29/29 PASS · 0 FAIL · 0 SKIP ·
  gate PASS (criticals=0, passRate 1.0)** → `evals/results/p5-integrate/assert.json`.
  Second consecutive fully-clean scorecard under schema v2 / rubric v1.1.0.
- **`eval:perf` one confirming desktop run: median 120.48 fps · p95 9.9 ms · 1 frame
  >50 ms — all three gates PASS** → `evals/results/p5-integrate/frametimes-confirm.json`.
  Matches the perf-hunt lane's 5/5 stability table (median 120.48 every run,
  1–4 frames >50 ms); driver `lenis.scrollTo`, prePassQuiet 249 ms.

## Reference refresh (step 3)

The cosigns lane's Nocturne portrait re-frame was a fresh visual change captured only
partially → full `eval:capture --viewport both` re-run on the settled tree:
**150 canonical + 16 interaction frames, zero skips**, `manifest.json` capturedAt
2026-08-26T19:50Z. (The 8 stale pre-Ocean `colorway_*` interaction PNGs flagged by the
materials lane are still on disk — capture overwrites, never deletes; sweep needs an OK.)

## Token scan (step 4)

dist: **zero hits** for `FS 60P` / `Nekst` / `fps-`; `60fps` appears only inside the
credits-slate table in the bundle — the sanctioned location. Clean.

## Deploy + prod smoke (step 5)

- **`npx wrangler deploy` → https://one-hertz.ubonranto.workers.dev · Version
  `5ce3e87a-36d0-4395-8d10-018da80a6f55`** — 4 new assets (new bundle/css/html/preview),
  41 unchanged. **The perf-hunt prune is live**: manifest = 45 files = 52 uploadable
  − 7 ignored via `dist/.assetsignore` (P4 manifest was 52). Deployed weight ~8.7 MB
  (was 21.7).
- Prune verified on prod after propagation: `studio_small_03_2k.hdr`, `porcelain.hdr`,
  `dusk.hdr`, `index-*.js.map` all **404**; runtime `/assets/basis/` transcoder still 200.
- **engine-smoke ALL PASS against prod** (`NAV_TIMEOUT_MS=180000`), incl. the schema-v2
  shape check and autoscroll pace.

## Pitfalls found this lane (inherit)

1. **Workers Assets edge cache serves the PREVIOUS deploy for ~3 min after
   `wrangler deploy` reports success** (`cf-cache-status: HIT` on the old index.html;
   query-string cache-busting does NOT work — the assets cache key normalizes the query
   away). A prod smoke fired immediately after deploy fails against the stale bundle
   with confusing symptoms (here: `state().scroll` scalar ⇒ schema-v2 FAIL +
   autoscroll `moved NaNpx`). **Poll `/` for the new bundle hash before any prod
   verification** (this lane: fresh after ~170 s).
2. Upload math is the authoritative prune check, not URL probes: `new + unchanged`
   must equal `uploadable files − ignored`. A pruned file can keep 200-ing from edge
   cache long after it left the manifest.
3. (Re-confirmed) zsh eats a bare `===` in command strings — quote it
   (materials-lane pitfall 4; bit this lane once, cosmetic).

## Rough edges / handoffs (P6 — README / demo-reel / ship list)

- **README to portfolio grade** (house rule: problem → demo → architecture → results,
  live demo link) + `ARCHITECTURE.md`. Two co-signed placements land there: type-credits
  foundry/license detail (README, not the 44-char slate) and the eval-harness story
  (beauty council protocol + 29/29 rubric + perf tables are the senior signal — publish
  the numbers, incl. the verdict's honest "24 frozen moments" caveat).
- **Demo reel**: raw material already exists — `evals/reference/ours/{desktop,mobile}/
  videos/scroll_60s.webm` + `desktop/interactions/{explode,colorway_swap}.webm`
  (vp8 25fps, the council's own clips).
- **Ship list before repo-public**: sanitizer scan (secrets / PII / internal refs —
  house rule), LICENSE already MIT, repo currently private on chenthedigger.
- **Real mid-tier device perf round** still owed for the rubric `real_device` field
  (proxy tier2 now 120.48 = 3× the 40 fps floor; founder iPhone = named flagship).
- Open from earlier lanes, unblocking nothing: `Cache-Control` review for repeat
  visits · offline PMREM prefilter (CI determinism) · 3× KTX2Loader instances warning ·
  `flags.assetsReady` late-settle on table-less debug looks · stale pre-Ocean
  interaction PNGs sweep (needs OK) · T1–T5 advisory beauty polish list
  (`docs/p5/verdict.md` §Loss ledger) if any later lane touches those sections.
