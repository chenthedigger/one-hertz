# P4 lane notes — perf + asset weight

Status: **DONE — first-load 15.96 MB → 3.94 MB (−75%), all gates PASS, beauty pixel-proven untouched** · 2026-08-26 · lane: P4 perf
Law respected: `docs/LOOKBIBLE.md` + `docs/p15/motion-bible.md` (tiers shed post effects, never smoothness; geometry never degraded; zero lighting/timing invented) · founder 2026-08-26 colorway decision untouched · `sections/index.ts` untouched.
Machine: **Apple M5 Pro** (24 GB, macOS 26.4.1), real Chrome headless via playwright-core `channel:"chrome"` — recorded in `evals/results/p4-perf/machine.json` (rubric named-desktop field).

## 1 · Honest measurement first (baseline, this machine, vite preview :4640)

`evals/waterfall.mjs` (new probe, committed): every request from navigation to
networkidle, bucketed against loader-ready. Baseline (`waterfall-baseline.json`):

- **15.96 MB / 54 requests, ALL finishing inside the loader window.**
- The two dominant findings:
  1. **6.5 MB dead HDR every boot** — `stage.ts` unconditionally fetched the TEMP
     Poly Haven `studio_small_03_2k.hdr` (P1 stand-in), PMREM'd it… and ~300 ms
     later `applyLook(instrument)` fetched `instrument.hdr` (395 KB) and replaced
     it. The studio bytes never survived to a judged frame.
  2. **5.2 MB of section GLBs fetched at construction** — all 7 internals
     (4.6 MB, `disassembly.ts`) + the Movement SiP re-fetch (564 KB,
     `movement.ts`) rode the boot window, competing with the hero GLB + env for
     bandwidth, for content first needed at sections 4–6.
- Also observed: the bundled `dist/assets/basis_transcoder-*.{js,wasm}` (584 KB)
  are **never fetched** (runtime loads `/assets/basis/` per
  `BASIS_TRANSCODER_PATH`) — deploy weight only, left alone (removing the emit
  risks the KTX2 worker path for zero user-facing bytes).

At an emulated real-world 350 KB/s + 40 ms (CDP `emulateNetworkConditions`, the
P3 field condition): **pre-P4 prod (vc66bb51f) loader-ready = 84.8 s**.

## 2 · What changed (all levers ship with proof)

| # | Lever | Files | Bytes |
|---|---|---|---|
| 1 | **Boot env = the look's own HDR.** `loadLook` starts at boot; `Stage` takes `bootEnvUrl: Promise<string\|null>` and fetches the look's `envFile` (instrument.hdr, 395 KB) as THE boot env. Studio HDR survives only as the no-look / look-fetch-failure fallback (reviewer-resilience path unchanged; `?look=default` behavior unchanged). `applyLook` skips re-fetching an env the boot path already applied (`stage.appliedBootEnvUrl`), so instrument.hdr is fetched exactly once. | `src/webgl/stage.ts`, `src/gl/env.ts` (none — reused `loadHdrEnv`), `src/main.ts` | **−6.5 MB** |
| 2 | **Internals scroll-distance prefetch.** The 7 internals GLBs (4.6 MB) fetch on the first lifecycle `enter` of a section within two tracks of Disassembly (Timeless/VerticalText above, Mechanism below) — idle visitors fetch nothing; any engaged scroller gets ≥2 tracks (Lenis duration 4 ⇒ many seconds) of lead. Progressive resilience unchanged (stubs keep slots, fan attaches parts on arrival). **Eval mode + `solo=Disassembly` load at construction** — frame determinism vs the frozen references outranks weight under `?eval=1`. | `src/sections/disassembly.ts` | **−4.6 MB** off boot |
| 3 | **Movement SiP same treatment** (prefetch ring Disassembly/Mechanism/Movement/Curves). | `src/sections/movement.ts` | **−0.6 MB** off boot |
| 4 | **Preload the two boot-critical fetches.** `ultra-3.ktx2.glb` + `instrument.json` now start at HTML parse (21 ms) instead of after module boot (~190 ms). Empirically verified: `crossorigin` required on `as="fetch"` preloads (consumers are plain `fetch()` = cors/same-origin) — without it Chrome double-fetches; final build has **zero duplicate fetches, zero preload warnings**. Env HDR deliberately NOT preloaded (URL is `?look=`-dependent data). | `index.html` | ~170 ms earlier start |

Explicitly NOT done, with measured reasons:

- **(b) KTX2 mip-cap pass — no headroom.** Inspected every internals GLB: textures
  are already KTX2/basis (battery 333 KB, sensor 200 KB, speaker 111 KB…); the
  weight is quantized GEOMETRY (battery 949 KB, sensor_array 1.3 MB) and LOOKBIBLE
  law forbids degrading it. Env is 395 KB, gallery is webp ≤86 KB/cell. Nothing
  visually-safe left to squeeze.
- **(c) three.js code-split — measured, declined.** The loader shell is static
  HTML+CSS (65 KB) and paints before/without JS (shell at 2.1 s even at 350 KB/s,
  DCL-gated; JS is a deferred module). Splitting three out of the 1 MB chunk moves
  bytes between files the boot needs anyway — zero first-paint gain, real risk to
  the engine's synchronous boot contract. The 1 MB/290 KB-gzip chunk stays.
- **(d) offline PMREM prefilter — deprioritized.** Was priced against a 6.5 MB
  runtime env; the shipped env is 395 KB and PMREM on this machine is a one-time
  boot cost inside a 3.5 s loader. Still a valid P5 polish (also kills the
  `?eval` PMREM in CI), not a byte lever anymore.
- **(e) font audit — already correct.** 3 critical faces preloaded, 400/500
  CSS-discovered, Fraunces lazy. 185 KB total. No change.

## 3 · Beauty proof (LOOKBIBLE: bytes never outrank pixels)

`evals/ab-proof.ts` (new, committed): captures judged frames via the same eval
addressing as capture.ts into `evals/results/p4-perf/ab/` and pixel-diffs
in-browser against the FROZEN `evals/reference/ours/desktop/` set (never writes
into the reference). On the my-changes-only build:

**10/10 frames IDENTICAL-CLASS: max channel Δ = 1/255, 0.000 % pixels > 2** —
Intro_0.5, Disassembly_0.5, Mechanism_0.5, Curves_0.5, Hands_0.75, Nocturne_0.5,
Colors_0.75, Parts_0.5, Footer_1 (Movement_0.7 has no canonical reference file —
NO-REF, not a diff). Two frames flagged NEAR on a first pass (Hands maxΔ19,
Parts maxΔ26 @0.063 %) **re-captured clean (maxΔ=1)** — one-run settle noise,
not the change. Same env file ⇒ byte-identical PMREM: proven, not assumed.

## 4 · Results — first-load weight

| Metric (localhost, waterfall probe) | Before | After | Δ |
|---|---|---|---|
| Total to networkidle | **15.96 MB** / 54 req | **3.94 MB** / 36 req | **−75 %** |
| Blocking (finished inside loader window) | 15.96 MB | 3.94 MB (all ≤ loader-ready by design: loader floor 2.5 s ≫ local fetch) | |
| Boot 3D payload | studio 6.5 MB + hero 1.2 MB + internals 5.2 MB | hero 1.2 MB + env 0.4 MB | |
| Loader-ready @ 350 KB/s + 40 ms CDP emulation | **84.8 s** (pre-P4 prod vc66bb51f; real network under the throttle — caveat) | **6.1 s** (local preview, same emulation) · idle 7.5 s | **~14×** |

Remaining first-load composition (~3.4 MB non-blob): app JS 1004 KB (290 KB gz) ·
hero GLB 1210 KB · basis transcoder 571 KB · instrument.hdr 395 KB · gallery
natural-set 226 KB · fonts 185 KB · CSS 58 KB · look JSON 11 KB.

## 5 · Results — frame-rate gates (rubric §d, `npm run eval:perf`, 60 s scripted pass, results committed in `evals/results/p4-perf/`)

Desktop (1600×900, 120 Hz-capable machine — deltas reported against rubric floors):

| Run | median fps | p95 frame | frames >50 ms | Gate (≥55 / ≤22 ms / ≤5) |
|---|---|---|---|---|
| desktop tier 0 | **120.48** | 9.2 ms | 5 | **PASS / PASS / PASS** |
| desktop tier 1 | 120.48 | 9.9 ms | 5 | PASS / PASS / PASS |
| desktop tier 2 | 120.48 | 10.0 ms | 2 | PASS / PASS / PASS |

Mobile proxy (390×844 DPR3 + **CDP 6× CPU throttle — GPU unthrottled**, caveat
published verbatim per rubric):

| Run | median fps | p95 frame | Gate (mid-tier ≥40) |
|---|---|---|---|
| proxy tier 0 | 53.76 | 26.7 ms | PASS |
| proxy tier 2 (mid-tier stand-in) | **40.0** | 59.4 ms | **PASS — zero margin** |

Honest caveats: (1) the scroll driver fell back to the synthetic 60 Hz wheel
stream — `__ONE_HERTZ__.lenis`/`scrollTo` not exposed under `?eval=1`
(harness-noted contract gap, pre-existing); still Lenis-routed, slightly noisier
input timing. (2) proxy tier2 median is exactly at the 40 fps floor with a heavy
p95 — the 6× CPU throttle punishes the tier-2 pixel-ratio resize path; a real
mid-tier device round (rubric real_device field) must confirm before ship.
(3) The rubric's once-per-round CDP Performance trace crosscheck is still not
implemented in perf.ts (pre-existing harness debt).

## 6 · Gates at finish (final multi-lane dist, all empirical)

`npm run build` clean (one transient red from another lane's in-flight
`images.ts` edit — theirs, cleared on their save; final build green) ·
engine-smoke **ALL PASS** · explode-smoke **ALL PASS** · vital-smoke **ALL PASS**
(loader honesty intact: completion 3.56 s ≥ 2.5 s floor, byte-progress now
tracks instrument.hdr) · final waterfall committed (`waterfall-final.json`).

## 7 · Harness changes (semantics preserved)

- `evals/waterfall.mjs` — NEW first-load probe (request timings vs loader-ready).
- `evals/ab-proof.ts` — NEW pixel A/B proof vs frozen references (never mutates them).
- `evals/explode-smoke.mjs` live-page block: arrive at Disassembly BEFORE waiting
  for the 10-part roster (the roster assertions all run at Disassembly anyway;
  the old order asserted an idle-at-Intro fetch that P4 deliberately removed).
  Same class as P3's stale-read fixes. Both `?eval=1` blocks untouched — eval
  mode still loads internals at construction.

## 8 · Handoffs / rough edges

- **P5 council**: proxy tier2 at exactly 40 fps — schedule the real-device
  mid-tier round (founder iPhone = named flagship; mid-tier device TBD).
  Offline PMREM prefilter as CI-determinism polish. Expose `lenis` on
  `__ONE_HERTZ__` under eval for the contract scroll driver.
- **Deploy-weight (not first-load)**: studio HDR 7 MB still ships as the
  fallback asset; bundled basis duplicates 584 KB never fetched; porcelain/dusk
  HDRs (2.7 MB) ship for `?look=` debug. A wrangler-side prune is P5's call —
  removing shipped fallbacks was out of this lane's blast radius.
- **Cache-Control on the worker** (P3 handoff) — untouched here; still worth a
  P5 look for repeat visits.
- Deep-link `?scroll=Disassembly` fetch timing: internals kick on the landing
  `enter` event (verified via smoke goto-walks), i.e. the fan can be seconds
  late on a slow link right after a cold deep link — progressive stubs cover
  it, and the source site behaves the same way (progressive parity).

## Pitfalls found this lane (inherit)

1. **`<link rel="preload" as="fetch">` without `crossorigin` silently
   double-fetches** for plain `fetch()` consumers (credentials-mode mismatch) —
   Chrome downloads the asset twice and warns 3 s after load. Always verify
   preloads with a duplicate-request count, not just the waterfall shape.
2. A pixel A/B can flag phantom diffs from ONE unsettled capture — re-run the
   flagged frame before blaming the change (Hands/Parts here: maxΔ26 first
   pass, maxΔ1 on re-run).
3. Playwright request maps keyed by URL hide duplicate fetches — count per-URL.
4. Another lane's mid-edit tsc break can redden YOUR build gate — check
   `git status` + file mtime before assuming your change broke the build; the
   preview server keeps serving the last good dist meanwhile (stale-verify trap).
