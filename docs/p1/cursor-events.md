# P1 lane notes — cursor+events (`src/core/events.ts` + `src/ui/cursor/*`)

Status: **DONE, all checks pass** · 2026-08-20 · extends docs/p1/engine.md (zero rewrites of its verified wiring)
Scope: typed event payloads (PLAN §1 event fabric), cursor state machine (mechanic 1), longpress hold-zoom (mechanic 2, the signature), demo-wired on the Disassembly slice. **The payload shapes + snapshot fields below are the contract for P3 mechanics.**

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean · **31/31 lane checks** in headless real Chrome (playwright-core, 1600×900): cursor mount/gating, follow transform, hover→`HOLD TO EXPLORE`, 5/5 icon-token round-trips, icon>text precedence + null fallback, 300ms press never arms / arms in (500, 600]ms, wheel inert during hold (0px) and live after release (522px), intensity 1±0.05 at ramp end, dolly 2.444→1.522 under the Disassembly 1.6× multiplier and back to base ±0.05 after release, parallaxGain = 1+intensity, ring = intensity, 151-tick LONGPRESS_TOGGLE stream (active-first, ramps, decays to 0), UPDATE_ROTATIONS = 1+2×intensity, eval-mode pose drift-free over 600ms with the new fields present · **engine-smoke.mjs still 30/30** · visual: blend dot, ring mid-fill, icon chip screenshotted and inspected.

## Module map

| Module | Exports (the contract) |
|---|---|
| `core/events.ts` | `EngineEvent` (unchanged), **firm `EnginePayloads`**, `CursorIconName`, `EventBus.on/off/emit`, `bus` |
| `ui/cursor/cursor.ts` | `installCursor()` (null on touch), `CursorSystem` (`setText`, `snapshot`, `dispose`), `CURSOR_TEXT`, `CursorTextKey` |
| `ui/cursor/longpress.ts` | `LongpressSystem(engine)` (self-installing; `dispose`) |
| `ui/cursor/icons.ts` | `iconMarkup(icon, color?)` — 24×24 stroke set + validated-hex swatch |
| `ui/cursor/cursor.css` | module-scoped styles; `html.has-custom-cursor` (native cursor off), `html.is-longpressing` (selection off) |

## 1 · Typed payloads (FIRM — engine.md's "stay loose until P3" handoff is closed)

```ts
CONFIG_CHANGE               { finish: string; band: string }
SET_CURSOR_ICON             { icon: CursorIconName | null; color?: string }   // color tints finish-swatch
SET_CLICKED_MESH            { part: string }                                  // GLB node name
LEAVE_CLICKED_MESH          undefined                                         // bus.emit(ev) — no arg needed
NEXT_PREVIOUS_CLICKED_MESH  { direction: 1 | -1 }
XPLOD_ALL                   { on: boolean }
LONGPRESS_TOGGLE            { active: boolean; intensity: number }            // every ramp frame
HOVER_POSITION              { x: number; y: number; part: string }            // viewport px
UPDATE_ROTATIONS            { speed: number }                                 // multiplier, 1 = base
```

- `CursorIconName = "finish-swatch" | "cross" | "arrow-left" | "arrow-right" | "select"` — kebab-case ON PURPOSE: evals/assert.ts `cursor-icon-states` round-trips these exact strings.
- `EventBus` gained `off(event, handler)`; `on` still returns an unsubscriber. Payload-less events emit without an argument (typed via conditional tuple).
- **`bus` is now on the debug API** (`__ONE_HERTZ__.bus`) — evals/assert.ts and capture.ts already probe `api.bus.emit/on`; this makes them live.

## 2 · Cursor system (mechanic 1)

- **Gate**: `installCursor()` mounts only when `(hover: hover) and (pointer: fine)` — touch/coarse gets null, no DOM, no `state().cursor` (eval cursor checks skip gracefully by design).
- **Designed object** (working default; P1.5 look bible owns the final): 12px white dot in `mix-blend-mode: difference` (self-inverting over porcelain and ink), HOLD ring in biosignal `--biosignal` with NO blend (the signal color never inverts), 40px porcelain icon chip + ink glyph, mono micro-caps label with porcelain text-shadow scrim. Layer transitions are GSAP `power3.inOut` 0.4s (motion-census default); follow is `1−exp(−dt·CURSOR_FOLLOW_LERP)` on `gsap.ticker` (same single rAF loop). First pointermove appears AT the pointer (never flies in from 0,0); `mouseleave` on `<html>` hides it.
- **State machine** — one visible state from three inputs, fixed precedence **icon > text > none**:
  - `busIcon` ← `SET_CURSOR_ICON` (P3 mechanics, eval),
  - `textOverride` ← `cursor.setText(key)` (programmatic),
  - `hoverKey` ← **`[data-cursor-text="<key>"]` hover delegation** — the way P2 sections request text WITHOUT importing anything. Keys: `holdToExplore | selectModel | swap` (`CURSOR_TEXT` maps to the recon strings). Demo-wired: Disassembly `.pin` → holdToExplore, Footer placeholder → selectModel.
- **HOLD ring is an overlay, not a state**: `LONGPRESS_TOGGLE` drives `stroke-dashoffset` directly (`pathLength=1` trick) while the dot presses to 0.5× and any label yields.
- `state().cursor = {mode, label, icon, holdProgress}` (additive, provider-registered).

## 3 · Longpress hold-zoom (mechanic 2)

Pipeline: pointerdown (primary mouse OR touch, scrollbar-drag guarded) → 500ms timer (`LONGPRESS_HOLD_MS`); >15px travel before arming cancels (scroll intent, `LONGPRESS_CANCEL_MOVE_PX`) → **arm**: `lenis.stop()`, non-passive `touchmove` preventDefault + `html.is-longpressing` (selection off) + contextmenu suppressed (OS long-press menu), gsap ramp 0→1 over `LONGPRESS_RAMP_S`=2s `power3.inOut`, emitting `LONGPRESS_TOGGLE` + `UPDATE_ROTATIONS` (`1 + intensity × LONGPRESS_ROTATION_GAIN`) every tick → **release / pointercancel / window blur**: `lenis.start()` IMMEDIATELY, guards removed, intensity ramps back `power3.out` over `2s × value` with `active:false` — scroll returns while the zoom relaxes (the source's feel). Re-press mid-decay resumes from the current value at constant rate.

Consumers (wired in main.ts through the bus — P3 joins without touching boot):

- **CameraRig** (`setLongpress` / `setZoomMultiplier` / `setPointer`): dolly = `radius / (1 + intensity·(zoomMultiplier−1))`; mouse parallax (new: `PARALLAX_BASE_RAD` orbital nudge, own `PARALLAX_LERP` smoothing) is amplified **×(1+intensity)**; `snap()` now also snaps parallax so eval settling stays a fixed point.
- **Per-section `zoomMultiplier`**: additive `SectionSpec.zoomMultiplier` (default `LONGPRESS_ZOOM_DEFAULT`=1.35, `1` = no dolly), followed via registry lifecycle `enterCenter`. Disassembly declares 1.6 (macro beat).
- **Stage** `setRotationSpeed(speed)` ← `UPDATE_ROTATIONS` (eval-mode rotation stays clock-derived — determinism untouched).
- `state().longpress = {active, intensity, scrollEnabled}` and `state().camera = {dolly, parallaxGain, zoomMultiplier}` (additive).

## 4 · `state()` extension mechanism (schema stays v1)

`core/debug.ts` gained `extendState(key, provider)` + a typed `StateExtensions` interface — additive top-level snapshot fields, providers called lazily per snapshot. **P3 mechanics (explode, colorway, outro) should register their eval-visible state the same way** instead of widening the core snapshot builder.

## Pitfalls found this lane (P2/P3 must inherit)

1. **`state().scroll` must stay a scalar in schema v1** — engine-smoke does arithmetic on it. assert.ts `longpress-lenis-stop` wants `state().scroll.enabled` and currently SKIPs; the flag is exposed as `state().longpress.scrollEnabled` instead. Evals lane: either point the check there (one line) or bump `STATE_SCHEMA_VERSION` + every consumer together. Do NOT convert `scroll` to an object casually.
2. **Lenis stopped ≠ page frozen for eval `gotoSection`**: `scrollTo(..., {force: true})` (already used by the engine) bypasses `isStopped` — eval transport keeps working mid-hold. Don't remove `force`.
3. **Movement-cancel applies only BEFORE arming.** After arming, pointer travel feeds the amplified parallax — cancelling on move would kill the mechanic's whole point. Touch scroll intent is caught by the 15px pre-arm window + `touchmove` preventDefault after.
4. **Never emit `SET_CURSOR_ICON` with ad-hoc strings** — the icon vocabulary is `CursorIconName`; assert.ts round-trips the exact kebab-case tokens. finish-swatch `color` must be a hex (validated before touching innerHTML; anything else falls back to titanium).
5. **`cursor: none` is scoped** under `html.has-custom-cursor` (only added when the cursor mounts) — don't add blanket `cursor:` rules in section CSS; they'd be dead on desktop and wrong on touch.

## Open handoffs

- evals/capture.ts emits `CONFIG_CHANGE {config: fid}` (old stub shape) — payload is now `{finish, band}`; evals/P3-colorway lane should emit the firm shape (runtime-only mismatch, nothing breaks today).
- `cursor-text-states` eval wants a third distinct label (`SWAP` on `[data-colorway-picker]`) — lands with the P3 colorway picker; the delegation channel is ready (`data-cursor-text="swap"`).
- Cursor label legibility over dark metal is scrim-only (ink + porcelain halo) — P1.5 look bible should decide label treatment (blend vs chip) with the real watch materials.
- Touch longpress verified by code-path only (headless Chrome has no touch) — the iOS Safari real-device session (PLAN §4.4, still outstanding in engine.md) should also confirm `touchmove` preventDefault + `lenis.stop()` under momentum (SPIKE-B Q8).
- `zoomMultiplier` per section: only Disassembly (1.6) is authored; the look bible owns the per-section table (default 1.35 elsewhere, `1` for DOM-only sections like Parts/Images if the dolly reads wrong there).
- Lane smoke script: scratchpad `cursor-lane-smoke.mjs` (31 checks) — worth folding into `evals/` alongside engine-smoke as eval-lite grows.
