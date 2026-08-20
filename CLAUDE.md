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

- 2026-08-20 · Concept **one-hertz** chosen by 4-concept judged panel (34/40); grafts merged from all losers · tradeoff: semantic breaks lower naive pixel similarity, rubric weights structure instead.
- 2026-08-20 · Name: repo/site **one-hertz / ONE HERTZ**, **CHEN** as byline (founder delegated; keeps thesis as brand, person as author).
- 2026-08-20 · Device: decided by Spike A rendered evidence, criterion includes "≥4 gorgeous swap states" (lean Ultra 3 titanium × band swap).
- 2026-08-20 · Founder directives: beauty #1, no self-imposed limits, faithful Apple Watch full fidelity (takedown tail-risk accepted), no legal boilerplate — credits as portfolio story only.

## Current state

- P0 GO (all 7 lanes) · P1 shipped + deployed (dial live on stage screen, 99/99 checks) · repo on GitHub (chenthedigger/one-hertz, private, CI active).
- **iOS Safari real-device check PASSED 2026-08-20**: founder scrolled the live P1 build on iPhone — pinned sections do not jitter (clears PLAN §4.4 GO/NO-GO carried item; founder's iPhone = named real device candidate for rubric perf field).
- CI eval-lite on GPU-less runners: notice-skip when boot can't complete under SwiftShader (typecheck+build still gate; smoke enforced locally + against prod).
- P1.5 look-dev running: plumbing (real Ultra 3 on stage) → 3 looks ∥ dial art ∥ type ∥ motion bible → council → LOOKBIBLE.md.
- Pending founder: $30 Sketchfab dika3d purchase (Alpine+Trail band geometry donor).
