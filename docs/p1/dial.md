# P1 lane notes — dial subsystem (`src/dial/*`)

Status: **DONE, all checks pass** · 2026-08-20 · extends the engine contract (docs/p1/engine.md), zero rewrites
Scope: PLAN §3 "dial subsystem" — the live watchface as ONE module, consumed later by hero / Details / Nocturne / loader match-cut. Layout roughed at correct Wayfinder proportions; beauty pass is P1.5 (edit `src/dial/spec.ts`, the artboard).

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean · **18/18 headless real-Chrome checks** (`evals/dial-smoke.mjs`, playwright-core npx-cache route, 1600×900): canvas 841×1024 (Ultra 3 aspect, 1024 cap) · **dirty-flag proof: 4 uploads / 362 frames at rest** · complication hot-swap repaints exactly once · AOD ticks 1/s on wall seconds · `?eval=1` → seconds locked 30 (10:09:30), BPM 64, **1 upload total, wheel input cannot move the hand** · sweep regime travels with wheel velocity · default engine boot untouched (15 sections, no errors). Screenshots eyeballed (active / AOD / eval): SF Pro Display resolved, grid + hands + complications render as intended.

## Module map

| Module | Exports (the contract) |
|---|---|
| `dial/spec.ts` | **THE ARTBOARD** — `DialMode`, `ComplicationId`, `GRID`, `PALETTE`, canvas caps, gearing + font constants. P1.5 edits this file only. |
| `dial/renderer.ts` | `DialRenderer`, `createDialScreenMaterial`, `DialStats` (re-exports `DialGear`, `DialVitals`, mode/complication types) — the one import consumers need |
| `dial/gear.ts` | `GearedSeconds`, `DialGear` — sweep↔tick regimes + phase-align handoff |
| `dial/face.ts` | `paintFace`, `polar` — cached static layer (bezel ring, minute track, numerals, corner slots) |
| `dial/complications.ts` | `paintComplication`, `DialVitals`, `DEFAULT_VITALS` — depth / heartRate / compass painters |
| `dial/font.ts` | `resolveDialFont`, `setDialFont` — SF probe chain, no font files shipped |
| `dial/preview.ts` | `mountDialPreview` — `?dial=1` look-dev page + `window.__ONE_HERTZ_DIAL__` |

## 1 · DialRenderer contract (consumers: hero, Details, Nocturne, loader match-cut)

```ts
const dial = new DialRenderer();               // 422:514 aspect, long side min(1024, logical×max(2,dpr)), SRGB
mesh.material = createDialScreenMaterial(dial); // MeshBasicMaterial, toneMapped=false (luminous under ACES), transparent
engine.onFrame((_, dt) =>
  dial.update({ clockScalar: getClock(), scrollVelocity: engine.lenis.velocity }, dt));
```

- `texture` is a `THREE.CanvasTexture`; **`needsUpdate` is set exactly once per redraw** and a redraw happens only when the dirty key changes (mode, complication, quantized vitals, quantized hand angles). `stats().uploads` vs `.frames` is the machine-checkable proof — CI asserts it.
- **glTF consumers: set `dial.texture.flipY = false` BEFORE the first render** (glTF UV convention; default true is correct for manual PlaneGeometry).
- Canvas corners outside the rounded display rect are alpha-0 — the glass mask stays clean for the hero mesh AND for DOM compositing in the loader match-cut.
- `setMode("active" | "aod")` · `setComplication("depth" | "heartRate" | "compass")` — hot-swap, one repaint each.
- `setVitals({bpm?, depthMeters?, headingDeg?})` — P3 feeds live data; values quantized here (1 bpm / 0.1 m / 1°) so data participates in the dirty key without churn. bpm passes through determinism `bpm()` → eval pins 64.
- `applyDialToken(token)` bridges the StateStore `dialMode` axis verbatim: `"wayfinder"`→active default · `"aod"`→aod · `"depth" | "heart" | "compass"`→active + that complication (note: the state token is `"heart"`, the complication id is `"heartRate"` — the bridge owns the mapping, don't spread it).

## 2 · Seconds hand gearing (the thesis rehearsed on the dial)

Two regimes, one displayed value (`dial/gear.ts`):

- **SWEEP** (|lenis.velocity| ≥ 0.5 px/frame): hand position = `offset + clockScalar × GEAR_PAGE_REVS × 60`. Derived from the **clock scalar**, not integrated from velocity ⇒ deterministic, reversible (scroll up = hand runs backward), and — because raw Lenis scroll is already the ONE smoothed value — adds **no second smoothing owner** (engine doctrine honored). `offset` is captured at regime engage so the hand never jumps.
- **REST**: within 1 tick of the wall clock the hand **steps instantly** (the quartz tick — exactly one redraw per second); farther than 1 tick (fresh out of a sweep) it phase-align glides shortest-path, converging inside one tick period — the same "≤1 tick both directions" grammar P3's Nocturne clock handoff formalizes.
- **AOD ignores gearing entirely**: seconds = `floor(wallSeconds())` — the Always-On dial ticking on REAL time is the Nocturne organ (PLAN §2), the only moment the watch moves on wall clock.
- **Eval** (`?eval=1`): both regimes bypassed; hands come straight from frozen `wallSeconds()` = 10:09:30 (marketing pose, second hand at 30). dt≤0 (settleSync) snaps the glide.

## 3 · Layered draw

face layer (cached per mode: bg slab → bezel degree ring w/ N-E-S-W, N in biosignal → minute track → numerals 12/3/9) → hot complication sub-dial → date → hands → hub. **The 6 numeral is deliberately dropped** — the hot complication owns that sector (authentic watchOS behavior, avoids the collision instead of shrinking the sub-dial). Corner slots are static roughs (`87/PWR · 23°/AIR · 214M/ALT · 18:42/SET`) — live corner data is P3's if wanted.

AOD variant = reduced elements (no bezel numerals, no minute minors, no corner slots, no complication labels/fills) + dim palette; accent is the brightened Nocturne red `#FF375F`-class per PLAN §3 color spec.

## 4 · Typography (PLAN §3: no font files in repo — honored)

Probe chain `'SF Pro Display' → 'SF Compact Display' → '-apple-system'`, each via `document.fonts.check()` then a measureText width-differencing probe (candidate backed by monospace vs serif; resolved iff both collapse to the same non-generic width). Fallback: `Inter` with tight tracking via canvas `letterSpacing` (guarded — not all engines have it). Resolved ONCE at construction; surfaced in `stats().fontName` and the preview header. On this machine: **SF Pro Display resolves**.

## 5 · Look-dev page — `?dial=1`

Routes in `main.ts` BEFORE `boot()` (dynamic import — dial preview is its own 13 kB chunk, main bundle untouched). Removes `#loader/#stage/#app`, mounts the canvas **device-pixel 1:1** on an ink plinth. Controls: wheel = synthetic geared scroll (velocity decay + fake clockScalar + living-BPM sketch 58↔142) · buttons/keys `1/2/3` complication · `A` AOD. Header shows resolved font, canvas px, and the live `uploads/frames` ratio — the dirty-flag contract made visible. `?dial=1&eval=1` = the frozen deterministic face. Debug handle: `window.__ONE_HERTZ_DIAL__ {setMode, setComplication, stats}` (additive; the frozen `__ONE_HERTZ__` schema untouched).

## 6 · Shared-file touches (all additive, engine lane conventions kept)

- `core/params.ts`: `+ dial: boolean` (`?dial=1`).
- `core/determinism.ts`: `+ calendarDay()` — the ONE source for the dial's date slot, frozen `TUE 9` in eval (wallSeconds has no date; anything on-screen must freeze).
- `main.ts`: 5-line early route (coexists with the look-dev lane's env-task changes — verified against the updated file).
- `style.css`: appended `.dp__*` preview block (token-consistent).
- `evals/dial-smoke.mjs`: NEW eval-lite, same harness pattern as `engine-smoke.mjs` (`BASE=` env, exit code, optional `SHOTDIR=` for look-dev PNGs). Candidate for CI alongside engine-smoke.

## Pitfalls found this lane (P2/P3/P1.5 must inherit)

1. **A "ticking" hand must not be an exponential lerp.** First implementation eased every tick over ~0.5 s ⇒ ~30 redraws/s at rest — dirty-flag contract quietly destroyed while looking correct. At-rest tick is an instant step (1 upload/s); ease is reserved for the >1-tick phase-align. If P1.5 wants a designed tick-snap animation, budget it in FRAMES (2–3) and keep the uploads assertion green.
2. **Quantize data at the SETTER, not the painter.** `setVitals` rounds before storing so the dirty key sees stable values; feeding raw floats (living BPM lerp!) through to the key would repaint every frame. Any new data channel must follow this pattern.
3. **The dirty key must include everything painted.** Hour/minute hands move on `floor(wallSeconds())`; forget that term and the minute hand freezes between other invalidations. Corollary: anything you paint, you key.
4. **glTF flipY** — CanvasTexture default `flipY=true` is wrong for GLB screen meshes; set false before first upload (documented in renderer header; will bite the hero integration otherwise).
5. `document.fonts.check()` alone is not trustworthy for local faces cross-browser — keep the measureText probe as the deciding fallback (both are cheap, run once).

## Open handoffs

- **P1.5 dial look-lock**: judge `?dial=1` against real Wayfinder screenshots; edit `spec.ts` only (grid fractions, palette, gear feel `GEAR_PAGE_REVS=12`). Prebaked glass sprites + emissive tuning (PLAN §3) belong to that pass too.
- **Hero integration** (look-dev/stage lane): screen mesh + `createDialScreenMaterial` + flipY note; per-section `dial.update` wiring is one `engine.onFrame` line.
- **Details hover-swap** (P3): call `applyDialToken` from the section's HOVER handler; the store write (`store.apply({dialMode})`) and the renderer call should happen together — suggest a tiny glue helper when P3 lands.
- **Nocturne** (P3): entry = `applyDialToken("aod")`; the phase-align grammar is already in gear.ts — extend, don't reimplement.
- **Loader match-cut**: DialRenderer's canvas can be drawn into the loader's DOM directly (same module, 2D) before the 3D texture takes over — that's why corners are alpha-0.
- Corner slots show static roughs; decide in P2/P3 whether they go live or stay editorial.
- `evals/dial-smoke.mjs` not yet in CI — integrate agent should chain it after engine-smoke (same `vite preview` server).
