# P6 · final tune — hiring-manager gate fix list applied

> Lane: applies the full tune list from the fresh-eyes P6 gate (`docs/p6/gate.json`),
> 2026-08-27. Nine items: 6 docs/harness, 1 real prod bug, 2 site polish.
> Deployed **v3108f93f** (one-hertz.ubonranto.workers.dev). No commits made in this
> lane (tree left for the founder's P6 landing); CI badge greens on the next main push.

## What changed

### 1 · CI autoscroll smoke: zero-movement under software rAF → notice-skip (the red badge)

`evals/engine-smoke.mjs` — the CI branch of check 6 (autoscroll) asserted movement
even though Lenis autoscroll rides rAF and a GPU-less runner's software cadence can
collapse to zero ticks (the P4/P5 main failures: "moved 0px in ≤10s", run
33010140663). Zero movement there is an environment limitation, same class as the
WebGL-absent path, so it now records a notice instead of a FAIL; a run with notices
and zero failures exits **78** (the existing eval-lite sentinel). `ci.yml`'s smoke
notice message broadened to name both skip reasons. The local branch still
hard-asserts real pace (`moved 6024px in 1.5s` this round). The badge itself flips
on the next push to main — this lane makes no commits.

### 2 · Reproduce path: preview-server step + friendly ECONNREFUSED

- `README.md` Reproduce now opens with `npm run build` + `npm run preview &` and
  names the default target (`http://localhost:4173`). Same steps added to
  `evals/README.md` "One command".
- `evals/lib.ts` `openTarget()` catches `ERR_CONNECTION_REFUSED` and prints
  `start the preview server: npm run preview` (3 actionable lines, exit 1) instead
  of a playwright stack trace. Verified against a dead port.

### 3 · Command consistency — `npm run eval` everywhere

`evals/README.md` had `pnpm eval` twice; package.json and the root README say
`npm run eval`. Standardized, including the partial-run form
(`npm run eval -- --only capture|assert|perf|judge` — the `--` matters with npm).

### 4 · Perf table: the five identical medians explained

One clause under the desktop stability table: the median is **pinned at the 120 Hz
display cap (rAF quantization)** — it reads 120.48 whenever most frames hit vsync,
so p95 + frames>50ms carry the between-run signal.

### 5 · Source captures scope note

One line each in `README.md` (Results intro) and `evals/README.md` (layout tree):
frozen source captures of thewatch.60fps.fr are **not committed** (heavy media,
gitignored, regenerable via `evals/reference/source/capture-scripts/`); `npm run
eval` regenerates the ours side only; beauty-gate math stays independently
recomputable from the committed `evals/judge/ballots.json` + sealed
`evals/judge/pack/answers.json`.

### 6 · evals/README results layout naming sync

`results/r1/` example replaced with the real round naming (`beauty-r1`,
`p5-perf-hunt`, `p6-integrate`; `r0` documented as the frozen first assert baseline).

### 7 · REAL BUG — prod deep-jump gray knot in Nocturne (root-caused + fixed)

**Root cause:** the hero pipeline (watch GLB adopt + look apply, `src/main.ts`) was
the ONE deferred load with **no residency provider** feeding
`state().flags.assetsReady` (providers existed for stage warm, Disassembly
internals, Movement SiP, Footer). Under `?eval=1` the loader element is removed at
construction, so the harness's `waitReady()` had nothing left to hold it: on a slow
prod uplink `assetsReady` read true while the hero GLB was still in flight, and a
`gotoSection` deep-jump captured the **placeholder torus knot** ("giant gray
knot"). Natural scroll gave the fetch time; local preview loads in ms — which is
exactly the observed symptom triangle.

**Fix (`src/main.ts`):** `registerResidency(() => heroSettled)` where `heroSettled`
flips true in a `.finally` after the watch-adopt → look-apply → `requestWarm()`
chain settles (success, failure, or give-up — provider law, never wedges;
`requestWarm`'s synchronous `pendingWarms++` means the stage's `warmSettled`
provider takes over before `heroSettled` flips, so there is no gap).

**Prod verification (after v3108f93f):** `?eval=1` + `gotoSection("Nocturne", p)`
for p ∈ {.25, .5, .75} against prod — `watchLoaded:true, screenAdopted:true`, real
watch in every frame, 0 console errors. Evidence:
`docs/p6/fixes/nocturne-deepjump-after.png` (= prod @0.5) and
`docs/p6/fixes/prod-nocturne-deepjump-{25,5,75}.png` (0.75 = the Sleep Score beat
that was previously the knot; matched local set `local-nocturne-deepjump-*.png`).

### 8 · `?scroll=<name>` lands on the money moment

`src/core/params.ts` + `src/main.ts`: deep links now land at **localProgress 0.5**
over the RAW bounds (via `registry.scrollPositionFor`) instead of the track top —
the README's advertised `?scroll=Nocturne` lands on the radiating-darkness AOD
beat, not the flat mid-grey entry frame. Optional suffix `?scroll=<name>:<p>`
(0..1, clamped; malformed → 0.5 default). Mid-track landing also keeps
`activeSection` in the linked section (rubric `deeplink-params` passed: 4/4).
Verified on prod: `?scroll=Nocturne` → `progressDom 0.5`
(`docs/p6/fixes/prod-scroll-nocturne-landing.png`); `?scroll=Nocturne:0.75` →
`progressDom 0.75`.

### 9 · Straps→Images hand-off: scrim retired before the case re-enters

The "case semi-transparent mid-crossfade" was the Straps top legibility scrim
(`.strp__scrim`, top 62% height, 50–60% porcelain gradient — the gate's "desktop
62% stop") held at full strength for the whole pin while the base-rig case
re-enters top-center from p≈.9. Smallest timing change (`src/sections/straps.ts`):
the DOM timeline fades the scrim out at **.68–.74**, right after the BPM card — the
last copy it protects — departs (beat 3's family rail lives bottom-left on bare
porcelain). Gone by .74, a .16 margin before the case re-entry; scrub restores it
symmetrically scrolling back up. Paused-frame evidence at the old weak points:
`docs/p6/fixes/{local,prod}-straps-{75,9,95,1}.png` + `...-images-05.png` — case
fully opaque in all of them.

## Verification (all run this round, in order)

| Gate | Result |
|---|---|
| `npm run build` (tsc + vite) | clean, 0 errors |
| `evals/engine-smoke.mjs` vs local preview :4573 | **ALL PASS** (incl. new ?scroll landing; autoscroll pace 6024px/1.5s) |
| `node evals/assert.ts http://localhost:4573 --round p6-tune` | **29/29 PASS, 0 fail, 0 skip, gate PASS** (criticals=0, passRate=1) → `evals/results/p6-tune/assert.json` |
| ECONNREFUSED UX | friendly 3-line message, no stack trace (dead-port run) |
| Deploy | `npx wrangler deploy` → **v3108f93f**, new bundle `index-XUzWgrpV.js` confirmed serving |
| `engine-smoke.mjs` vs prod (`NAV_TIMEOUT_MS=120000`) | **ALL PASS**, 0 console errors |
| Prod probe (deep-jump + hand-off + landing captures) | all frames real watch, `assetsReady` honest, 0 console errors |
| `?scroll=Nocturne:0.75` on prod | `{active:"Nocturne", prog:0.75}` |

Note: `r0` baseline untouched (assert ran with `--round p6-tune`). Preview server
killed after the round.

## Left for the founder (unchanged from gate.json / integrate.md)

D1–D3 decisions, P6 tree commit+push (greens the badge via item 1), the public
flip, wiki /save. The 885 MB clone slim (D3) and history rewrite remain
safety-floor items outside any lane's authority.
