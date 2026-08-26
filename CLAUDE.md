# one-hertz · project notes

> Tier: **showcase** · created 2026-08-20 · doctrine inherited from `~/engineer/CLAUDE.md`
> Site: **ONE HERTZ** · byline **CHEN** everywhere (wordmark credit, README, end-slate)
> Build contract: `docs/PLAN.md` (v3, council-reviewed — 7 judges, 62 findings applied). PLAN.md outranks this file on any detail it covers.

## What done looks like (two stops)

- **Success condition**: live demo at one-hertz workers.dev renders 14/14 sections in source order with all 5 interaction mechanics on desktop + mobile; likeness gate (zero CRITICAL, checklist ≥90%), beauty gate (pairwise win-or-tie ≥60%, no axis <40%, ≥3 axes above source), perf gates on named hardware — all published via `pnpm eval` HTML report; README portfolio-grade with demo reel + ARCHITECTURE.md; sanitizer clean; repo public.
- **Hard ceiling**: likeness+beauty council loop max 4 rounds, perf loop max 3 rounds (then ship with published deltas). Asset track: if no route yields a council-beautiful hero exterior within Spike A + 3 agent-days in-house, stop and re-scope. Internals (A2) gate at P1.5 with pre-declared pivot to designed stylized-cutaway. P2 checkpoint after section 4: avg section wall-time × remaining > budget ×1.5 → stop and re-plan.

## Plan

- **Goal**: recreate the full scrollytelling experience of thewatch.60fps.fr with the product swapped to a faithful Apple Watch — the most beautiful piece in the portfolio, with a reproducible likeness+beauty+perf eval harness. Full criteria: PLAN.md §8.
- **Riskiest assumptions + tests**: toolchain absent → P0 bootstrap (Blender headless, gltfpack, wrangler); hero asset beauty → Spike A shootout (USDZ/marketplace/in-house, rendered evidence); internals exist nowhere → A2 in-house workstream + P1.5 gate; scroll-feel parity → Spike B slice vs frozen reference recordings; Sept 2026 Apple refresh → spec constants file.
- **Approach + tradeoffs**: Vite + vanilla TS + three.js + GSAP + Lenis (no framework: more wiring, but the engine IS the portfolio point); live GLB over frame sequences (needed for explode/swap/longpress; costs mobile perf discipline); structural clone + semantic translation "ONE HERTZ" (trades pixel-likeness points for an authored thesis; eval rubric weights structure over pixels by design).

## Working rules (binding, from PLAN v3)

- Beauty is objective #1; founder directives at top of PLAN.md are law.
- ONE smoothing owner (Lenis, duration 4); CSS sticky pinning; no ScrollTrigger pins.
- Section sandbox + enter/exit state contract before any parallel section work.
- Commit narrative rule: conventional commits, no WIP spam on main, `git log --oneline` must read as a build story.
- Dist token-leak scan every phase: "FS 60P" / "Nekst" / "fps-" only in credits + README.
- Dial glyphs rendered into canvas; no SF font files shipped in repo.
- Device in gallery stills is always a real render; AI images only for background plates.

## Decisions

- 2026-08-26 · **No Alpine/Trail bands** (founder): no purchase, no in-house build. Colorway axis = 2 Ti finishes × Ocean-band COLOR recolors (pure material swaps on existing geometry; Apple sells multiple Ocean colors — verify real combos from constants at P4). Outro keeps 4 instances via finish×band-color. Straps-section family callouts copy reviewed at P4.

- 2026-08-20 · Concept **one-hertz** chosen by 4-concept judged panel (34/40); grafts merged from all losers · tradeoff: semantic breaks lower naive pixel similarity, rubric weights structure instead.
- 2026-08-20 · Name: repo/site **one-hertz / ONE HERTZ**, **CHEN** as byline (founder delegated; keeps thesis as brand, person as author).
- 2026-08-20 · Device: decided by Spike A rendered evidence, criterion includes "≥4 gorgeous swap states" (lean Ultra 3 titanium × band swap).
- 2026-08-20 · Founder directives: beauty #1, no self-imposed limits, faithful Apple Watch full fidelity (takedown tail-risk accepted), no legal boilerplate — credits as portfolio story only.

## Current state (2026-08-27)

- **P6 SHIP-READY: portfolio surface complete + all gates green, deployed vd0ce4c3c — public flip is the only step left, pending 3 founder decisions** (one-hertz.ubonranto.workers.dev) · README rewritten portfolio-grade (PLAN P6 above-the-fold order, positioning sentence verbatim, every results number source-verified) + ARCHITECTURE.md at root (~2 pages, 2 mermaid diagrams verified rendering in real Chrome) · demo reel shipped: 30.1s desktop mp4 4.4 MB + 7.8s poster GIF 4.4 MB (<5 MB spec) + mobile bonus + 3 hero stills in docs/media/, authored 5-beat cut captured LIVE on prod (real loader, real 1 Hz Nocturne tick, SWAP restart ending) · OG unfurl LIVE: 10 og: tags + twitter summary_large_image + 1200×630 og.jpg (56 KB, 200 on prod), og:description = positioning sentence · sanitizer swept tree + full 32-commit history: secrets/PII/internal-refs/provenance/token-leak all PASS, F1–F4 fixed (abs paths, .gitignore, git gc 918→885 MB, GH description+topics) · integrate full green: build clean, **7/7 smokes ALL PASS, assert 29/29 0 fail 0 skip gate PASS** (evals/results/p6-integrate/), zero console errors, dist token scan clean · deployed vd0ce4c3c (only index.html+og.jpg changed; engine bundle byte-identical to P5's v5ce3e87a) · prod engine-smoke ALL PASS + clean-context verify (fresh profile, desktop+mobile) 15 tracks 0 console errors · frozen r0 assert baseline restored after a lane's round-less clobber · lane notes docs/p6/{readme,architecture,demo-reel,sanitizer,integrate}.md · **left before public** (docs/p6/integrate.md checklist): founder D1 (ubonranto URL identity) / D2 (Apple-extracted textures in research) / D3 (885 MB clone: filter-repo slim vs as-is, needs explicit OK), git commit+push (P6 tree uncommitted, main 1 ahead of origin), the flip itself, wiki /save; honest caveat: real mid-tier device perf round still owed (tier2 = desktop proxy).

## Prior state (P5)

- **P5 COMPLETE: beauty gate PASSED + fully-clean rubric + perf root-caused, live on prod** (v5ce3e87a, one-hertz.ubonranto.workers.dev) · **beauty council round 1 (5 blind seats, 24 pairs, sealed key): PASS 5/5 gates** — 71.7% win-or-tie (gate ≥60), worst axis 66.7% (floor 40), exceed clause 5/5 axes strictly above source, deception probe 5/5 seats picked ours as the professional site, agreement 77.5% not flagged; honest caveat: score = "at these 24 frozen moments", several losses are matched mid-transition states; T1–T5 tune list advisory only, zero beauty edits made · **rubric assert 29/29 PASS, 0 FAIL, 0 SKIP, gate PASS (passRate 1.0)** — schema v2 (`scroll={position,velocity,enabled}`) + rubric v1.1.0 closed the standing longpress-lenis-stop SKIP · **perf: 5/5 consecutive desktop runs all gates PASS (median 120.48 fps, 1–4 frames >50 ms; pre-fix 11–14)** + integrate confirm run (p95 9.9 ms, 1 frame >50 ms) — root causes fixed (track dormancy, per-mesh bloom materials, correct-variant warm, lineup prebuild, assetsReady residency), ab-proof 10/10 pixel-identical vs frozen refs · tier2 mobile proxy 40.0 → 120.48 median (3× floor; **real mid-tier device round still owed**) · deploy prune live: 21.7 → ~8.7 MB (dist/.assetsignore, pruned files 404 on prod) · LOOKBIBLE co-signs done (Ocean anchor #283f58, side-12mm, §1.5 sync, Alpine/Trail closed) + Nocturne portrait fix · evals/reference/ours refreshed on settled tree (150+16, zero skips) · dist token scan clean · all seven smokes + prod engine-smoke ALL PASS (pitfall: Workers edge cache serves the old deploy ~3 min; poll for new bundle hash first) · lane notes docs/p5/{materials,cosigns,perf-hunt,verdict,integrate}.md · next: **P6 ship** (README portfolio-grade + ARCHITECTURE.md, demo reel from council clips, sanitizer scan → repo public, real-device perf field).

## Prior state (P4)

- **P4 COMPLETE: real-Ocean colorway world + look/copy/perf hardening live on prod** (v227a44b5, one-hertz.ubonranto.workers.dev) · colorway axis = 2 Ti finishes × real Apple Ocean colors (Anchor Blue / Black / Neon Green, every combo orderable on apple.com; Tide/Graphite/Ember/Midnight deleted) · gallery = 20 Cycles masters (812 KB for 4 real sets) · copy spec-true vs live apple.com (12mm, MOLDED, FLAT SAPPHIRE) + Fraunces §4 one-moment machine-checked · 13/13 gate:p3 tunes closed (flank mottling fixed at GLB source; vital chip has ONE yield owner incl. mobile gallery window) · first load **15.96 MB → 3.94 MB (−75%)**, 10/10 pixel-identical A/B vs frozen refs · gate:p4 (docs/p4/gate.json, single-director) 4 TUNEs all applied · rubric assert **28/29 PASS, 0 FAIL, gate PASS** (1 SKIP = longpress-lenis-stop, P5 schema call) · all seven smokes serial ALL PASS + zero console errors both viewports · evals/reference/ours refreshed (150+16 frames, zero skips, real-Ocean world) · dist token scan clean · prod engine-smoke PASS · lane notes docs/p4/{copy,gallery,look-fixes,perf,integrate}.md · next: **P5 council** (beauty gate vs source, LOOKBIBLE co-signs, schema v2, real mid-tier device perf round, worker asset prune) — caveats: beauty council NOT run at this gate; perf proxy tier2 at exactly the 40 fps floor.

## Prior state (P3)

- **P3 COMPLETE: all 5 interaction mechanics live on prod** (vc66bb51f, one-hertz.ubonranto.workers.dev) · rubric structural checklist **28/29 PASS, 0 FAIL, gate PASS** (criticals=0, passRate 0.966; the 1 SKIP = longpress-lenis-stop, schema-v1 scroll-scalar constraint — P5 council) · evals/reference/ours refreshed (150+16 frames, zero skips) · all six smokes + zero console errors both viewports · lane notes docs/p3/{tune-w3w4,explode,swap,vital,integrate}.md · next: P4 (asset weight ~13MB first-load is lever #1, gallery Cycles masters, copy review) + P5 council items listed in docs/p3/integrate.md.

## Prior state (P2)

- **P2 COMPLETE: 15/15 sections live on prod** (v5c1c1554) · internals 7/7 · gate verdicts: zero REBUILD across 4 waves · gate-3/4 tune lists (28 items) frozen in docs/p2/gate-{3,4}.json, applied in P3.

## Prior state

- P0 GO (all 7 lanes) · P1 shipped + deployed (dial live on stage screen, 99/99 checks) · repo on GitHub (chenthedigger/one-hertz, private, CI active).
- **iOS Safari real-device check PASSED 2026-08-20**: founder scrolled the live P1 build on iPhone — pinned sections do not jitter (clears PLAN §4.4 GO/NO-GO carried item; founder's iPhone = named real device candidate for rubric perf field).
- CI eval-lite on GPU-less runners: notice-skip when boot can't complete under SwiftShader (typecheck+build still gate; smoke enforced locally + against prod).
- P1.5 look-dev running: plumbing (real Ultra 3 on stage) → 3 looks ∥ dial art ∥ type ∥ motion bible → council → LOOKBIBLE.md.
- Pending founder: $30 Sketchfab dika3d purchase (Alpine+Trail band geometry donor).
