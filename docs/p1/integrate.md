# P1 lane notes — integrate + deploy

Status: **DONE, all checks pass, LIVE** · 2026-08-20 · closes P1 (all lanes wired into one app flow)
Live: **https://one-hertz.ubonranto.workers.dev** · Worker `one-hertz` · Version `99ce7ebc-9b7e-4fa5-ba5b-e80d7941e1da`

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean · **all three lane suites green against the integrated build** — engine-smoke 30/30, dial-smoke 18/18, cursor-smoke 31/31 (headless real Chrome, playwright-core `channel:"chrome"`, 1600×900) · **integrate-smoke 20/20** (below) · dist token-leak scan **0 hits** (`FS 60P` / `Nekst` / `fps-`, including sourcemaps) · live URL 200 + `content-type: text/html`, JS asset 200 `text/javascript` · **engine-smoke re-run 30/30 against the LIVE deployment**.

## What was wired (all in `src/main.ts` boot, additive edits elsewhere)

1. **Dial → stage seam (the P1 money shot).** `new DialRenderer()` at boot; `stage.setScreenTexture(dial.texture)` puts the live watchface in the ONE screen material's emissive slot (`emissiveIntensity 2.8`, `toneMapped=false`, `SCREEN_BLOOM_LAYER`). Frame pipeline order: registry scrub → `setClock` → **dial.update({clockScalar, scrollVelocity: engine.lenis.velocity}, dt)** → rig lerp → render — the geared seconds hand now rehearses the thesis on the hero screen, dirty-flag uploads intact (eval sweep: **1 upload / 102 frames**). Screenshot evidence: `docs/p1/smoke/hero-intro-0.5.png` — Wayfinder face luminous with bloom halo, undistorted, hands at 10:09:30, BPM 64.
2. **StateStore `dialMode` → renderer bridge.** The frame loop forwards store token changes to `dial.applyDialToken` (one owner, no missed writes). P3 mechanics just `store.apply({dialMode})` — the screen follows.
3. **`state().dial` (additive, schema stays v1).** Registered via `extendState("dial", ...)`: `{mode, complication, bpm, accent, seconds, uploads, frames, fontName}`. `DialStats` gained `bpm` + `accent` (additive) so the evals-lane want-list item `state().dial {accent, bpm}` is closed. Eval mode pins: seconds 30, bpm 64 (asserted).
4. **Loader choreography floor 1.2s → 2.5s** (`MIN_DURATION_S`, PLAN §2 source parity). Measured: loader visible ≥2.75s past networkidle on warm cache; still honest (arc = min(real, timeCurve)); `?eval=1` still skips choreography but waits for real readiness.
5. **`history.scrollRestoration = "manual"`** at boot — browser restoration no longer fights Lenis/`?scroll=` after reload (the evals-lane r0 deep-link finding; `?scroll=Mechanism` now verified landing at scroll 7200, activeSection Mechanism).
6. **Placeholder screen plane 0.8→422/514** aspect (gl/screen.ts) so the dial canvas maps undistorted.
7. **package.json merge** (the evals lane's declared merge target): scripts `eval`, `eval:capture/assert/perf/report`; devDeps `playwright-core@^1.62.1`, `yaml@^2.9.0`; `npm install` run — deps now durable in the lockfile, **CI's eval-lite step goes skip → enforcing automatically** (docs/p1/ci.md handoff).

## Mismatches found & fixed

- **Deep link `?scroll=`** (evals r0 FAIL): root cause = browser scroll restoration racing the post-loader jump → fix #5 above.
- **Dial aspect vs placeholder panel**: 0.8 plane × 0.821 canvas = visible squash → fix #6.
- **`state().dial` missing** from the contract gaps list → fixes #3.
- **Nothing else conflicted.** The engine/gl/dial/cursor contracts composed exactly as their lane docs promised — `setScreenTexture`, `extendState`, `Snappable`, the bus, the token bridge all fit first try. flipY stayed default (true) — correct for the manual PlaneGeometry; the GLB adoption note stands in main.ts.

## Integrate-smoke (scratchpad `integrate-smoke.mjs`, 20 checks)

Loader floor · loaderDone flag · zero console errors on 4 boot routes · 15-section manifest order · **`gotoSection(name, 0.5)` sane for all 15** (activeSection match, progressDom 0.5 ± 0.02, finite camera pose, clock ∈ [0,1]) · `state().dial` present/frozen/dirty-flag-clean · font resolved (SF Pro Display) · **tiers force 1→2→0** round-trip · `?scroll=` lands · Disassembly `zoomMultiplier 1.6` followed via enterCenter · **longpress arms, dollies 5.93→4.92, Lenis stopped, relaxes to base ±0.06 after release** · 2 screenshots → `docs/p1/smoke/`.

### Finding: center-line seam semantics (evals lane must know)

`gotoSection(<first unpinned section>, 0.5)` puts the viewport center line EXACTLY on the next track's top (Intro start-clamps to [0, top+height] ⇒ 0.5 → centerLine = 900 = Timeless.top). Registry ownership is half-open `[top, top+height)` ⇒ `state().activeSection` reports the **successor**. The frame and progressDom are correct — this is a reporting convention, not a bug. assert.ts should treat exact-seam landings as belonging to either neighbor (integrate-smoke shows the guard).

## Deploy

- **Root `wrangler.jsonc`**: name `one-hertz` (same worker as the P0 placeholder — replaced, intended, TLS cert already warm), `compatibility_date 2026-08-20`, `assets.directory "dist"`.
- **`.assetsignore` lesson applied**: the ignore file must live INSIDE the assets dir ⇒ ships as `public/.assetsignore` → `dist/.assetsignore` via Vite (verified present in dist; wrangler uploaded 7 files, ignore file consumed not served). Currently excludes `.DS_Store` only.
- Sourcemaps ARE deployed (3.4MB `.js.map`) — deliberate for a showcase (source transparency); fetched only on devtools open. If transfer-size results ever count them, add `*.map` to `.assetsignore`.
- `npx -y wrangler deploy` from repo root · 200 html · JS asset 200 · engine-smoke 30/30 against prod.

## Remaining rough edges for P1.5

1. **Bundle shape unchanged** (SPIKE-B Q5 still open): one 695KB/190KB-gzip chunk (dial preview split out at 3KB). Three.js core vs GLTF/KTX2/meshopt loader split + lazy stage init belongs with the GLB landing.
2. **Screenshot red sliver top-left** (both smoke frames): a placeholder DOM element edge (`.ph`/copy styling) peeking over the canvas — placeholder cosmetics, dies with P2 section builds; not a renderer artifact.
3. **Loader is an arc, not the activity-rings + match-cut** (PLAN §2) — P1.5/P3 own the design; floor + honesty are now to spec. Total perceived time warm-cache ≈ 2.8s + 0.6s fade; if the council wants tighter, the constant is one number.
4. **Dial corner slots static**, complication hover-swap unwired (P3: Details section calls `applyDialToken` / `store.apply`).
5. **`?eval=1` boots at tier 0 by design** — interaction-state frames wanting bloom-on-dial should capture at tier ≤1 with the screen in frame (gl pitfall #5).
6. Evals contract gaps that remain open (P3-shaped, unchanged): `state().explode/config/materials/outro`, `sections[].sourceRole/scrubChannels`, `__ONE_HERTZ__.setConfig`, DOM widget selectors. `state().scroll` stays a scalar (schema v1) — the enabled flag lives at `state().longpress.scrollEnabled`.
7. iOS Safari real-device pin check STILL outstanding (PLAN §4.4 — every lane has flagged it; nothing in this lane de-risks it).
