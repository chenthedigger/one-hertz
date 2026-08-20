# P2 lane notes — infra-gl (live look identity: keyframe driver + contact shadow + env plumbing)

Status: **DONE, all checks pass** · 2026-08-21 · builds LOOKBIBLE §1.4 fixes 1–3 + 5–6 and the §1.5 wiring contract; zero contract rewrites (state schema stays v1, additive only)
Scope: per-frame lighting-keyframe driver off the raw scroll · `contactShadow {opacity, radius, falloff}` look-schema key + banding fix · `gl.setEnvIntensity` debug hook · RGBELoader→HDRLoader migration · live 9-point env-rotation sweep for instrument.

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean · **engine-smoke 30/30 · dial-smoke ALL PASS · cursor-smoke ALL PASS** (headless real Chrome, playwright-core `channel:"chrome"`, 1600×900, vite preview :4573) · zero console errors on `?eval=1&look=instrument` across all captures · bgStage keyframe evidence in `docs/p2/infra-gl/*.png` (below) · 9-point sweep frames in `docs/p2/infra-gl/sweep/`.

## Module map (additive)

| Module | Change |
|---|---|
| `gl/lightKeyframes.ts` (NEW) | `LightKeyframeDriver`, `SectionLightKeyframe`, `sampleAnchoredKeys` (pure sampler), `easeLight` (power2.inOut), `lerpHex` |
| `gl/look.ts` | `LookConfig + contactShadow?: ContactShadowTune` + typed `x_sectionLightKeyframes?` (now a first-class schema field; other `x_*` keys stay ignored); `applyLook` applies `contactShadow` |
| `gl/contactShadow.ts` | pixel-wise `(1-r)^falloff` alpha map (512², deterministic interleaved-gradient-noise dither — **no Math.random**, eval-safe) replaces the 4-stop radial gradient (the banded hard ellipse every ballot flagged); `+ tuneContactShadow(mesh, tune)`, `+ ContactShadowTune`, `+ CONTACT_SHADOW_BASE_RADIUS` |
| `webgl/stage.ts` | `+ tuneContactShadow(tune)` (remembered; `adoptWatch` re-applies it over the footprint defaults so apply-order never matters) |
| `gl/env.ts` | `RGBELoader` → `HDRLoader` (three r185 rename, same API/DataTexture — LOOKBIBLE §1.4 fix 6) |
| `core/debug.ts` | `+ gl.setEnvIntensity(intensity)` (fix 3 — symmetric with `setEnvRotation` for sweeps/evals) |
| `src/main.ts` | driver instantiated at boot; `applyLookToStage` → `driver.setLook(look)`; geometry fed at boot + on settled resizes; ticked in `engine.onFrame` before `stage.render` |
| `public/assets/looks/instrument.json` | `+ contactShadow {opacity 0.3, radius 1.15, falloff 2.4}`; keyframes unchanged (sweep confirmed rot 0, below) |

## 1 · Keyframe driver (LOOKBIBLE §1.4 fix 1 / §1.5 wiring contract)

- Reads the ACTIVE look's `x_sectionLightKeyframes.keyframes`; a look without keyframes parks the driver (DEFAULT_LOOK ⇒ inert; applyLook's static lightRig owns the frame).
- Each key anchors at its section's **raw center** (progressDom 0.5 — "section-center keys"); anchors come from the live registry manifest, re-learned on settled resizes, never vh arithmetic.
- Per frame: sample = eased lerp between the two bracketing anchors, `power2.inOut` per segment (light never snaps — motion-bible §1). Clamped to Intro's key before its center and Footer's after (360° ≡ 0° ⇒ the outro SWAP-restart lands on the hero pose).
- Channels: envRotationDeg→`stage.setEnvRotation` · envIntensity→`stage.setEnvIntensity` · exposure→`renderer.toneMappingExposure` · bloomStrength→`post.tune` (absent on a key = look base 0.6) · **bgStage→`stage.setStageColor` + CSS `--porcelain`** (absent = look `bgTokens.stage`) — DOM and WebGL grounds darken as ONE surface (the ink/porcelain split-stage identity + Nocturne continuum both ride this).
- Determinism: `update(scroll)` is a pure function of raw Lenis scroll given fixed geometry+look; it runs inside the engine frame pipeline so eval `gotoSection` settles it synchronously. Verified: Mechanism 0.5 lands **exactly** `--porcelain #101216`, Nocturne 0.5 `#0A0B0D`, Intro `#E8EAED`; ramp frames 0.15/0.9 show interpolated greys (`#37393d`/`#434549`).
- Change-caching: channels write only when the sampled value changes ⇒ at scroll-rest the driver goes quiet and debug pokes (`gl.setEnvRotation` sweeps) survive until the next scroll — that is exactly what makes sweep mode work under a keyframed look.

Evidence (`docs/p2/infra-gl/`): `keyframes-intro-0.5.png` (porcelain hero) · `keyframes-mechanism-0.15.png` (mid-ramp slate — transition in flight) · `keyframes-mechanism-0.5.png` (full ink #101216, metal against dark ground) · `keyframes-mechanism-0.9.png` (exit ramp) · `keyframes-nocturne-0.5.png` (#0A0B0D + envInt 0.35 dip + bloom 0.85 — the dial carries the frame, the dusk-graft continuum live).

## 2 · Contact shadow (fix 2)

Schema key `contactShadow {opacity, radius, falloff}`: opacity→material, radius→absolute world radius (overrides the adoptWatch footprint default `span×0.6`), falloff→exponent on the pixel-wise `(1−r)^falloff` curve; falloff changes repaint the SAME CanvasTexture in place (one re-upload). Banding fix = smooth per-pixel curve + deterministic dither (Jimenez interleaved-gradient-noise on integer pixel coords — byte-stable captures, no wall time, no RNG). Close-up evidence `contact-shadow-closeup.png`: no rings, no hard rim. Instrument ships `{0.3, 1.15, 2.4}` — grounding hint, not a puddle; per-section P2 sign-off may retune via the look JSON without code.

## 3 · Env-rotation sweep (fix 5, instrument, hero pose)

`docs/p2/infra-gl/sweep/sweep-rot{0,40,…,320}.png` (9 points, `?eval=1&look=instrument`, Intro 0.5). Read on rendered frames: **rot 120/160 sheet the crystal with glare** (re-confirms the az-0 mirror-direction law empirically); 200/280/320 murk the lower dial; 40/80 acceptable; **rot 0 is the cleanest ink dial + the one continuous bezel-rim specular line** (the §1.1 rig was authored around this pose). Final: `envRotationDeg 0` CONFIRMED — instrument.json keyframe table unchanged (Intro 0 → Footer 360 loop stands). Per-section azimuth passes at the remaining keyframes are the owning section agents' sign-off duty (LOOKBIBLE §7.2), with this sweep harness ready.

## Pitfalls found this lane (downstream must inherit)

1. **Live captures were never byte-stable, driver or not.** Same-page repeat captures at an identical settled position hash differently under `?look=default` (driver inert) exactly as under instrument — pre-existing GPU/AA rasterization noise in the live path. The eval harness asserts structural state + pose (correct); do NOT write byte-hash image assertions against live frames.
2. Driver overrides applyLook's static `lightRig` values on the next scroll movement whenever the look has keyframes — a keyframed look's `lightRig` block is effectively the t=boot pose only. Author section lighting in the keyframes, not in `lightRig`.
3. `stage.tuneContactShadow` merges (absent field = keep) and is remembered across watch adoption; a look's `radius` is ABSOLUTE world units, unlike the footprint default.
4. Solo mode: only the mounted section's keyframe survives the anchor filter ⇒ the sandbox holds that section's lighting constantly (by design — section agents get their beat's light for free in `?solo=`).

## Open handoffs

- Nocturne's inner AOD blackout beat (env 0.045 match-cut dip INSIDE the section) is the Nocturne section agent's wall — the driver holds the section-center continuum (0.35); the deep dip + vignette flag ride the section's own timeline (LOOKBIBLE §1.5 note).
- Per-section 9-point azimuth verification at each keyframe (fix 5's full scope) — run per section as each P2 section signs off; sweep script pattern: scratchpad `infra-gl-proof.mjs` (mode `sweep`), or graduate it into `evals/`.
- DLC reveal keyframe (streak_chamfer_a onto the top edge — LOOKBIBLE §1.3) waits on the P3 colorway mechanic.
