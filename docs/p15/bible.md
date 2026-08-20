# P1.5 lane notes — LOOKBIBLE synthesis + look-lock (`docs/LOOKBIBLE.md`)

Status: **DONE** · 2026-08-21 · council lane (3 judge ballots in) → bible written → winner applied as boot default
Deliverables: `docs/LOOKBIBLE.md` (the P2/P3 build law) · merged-graft `public/assets/looks/instrument.json` · `src/main.ts` default-look flip · proof `docs/p15/final-look.png`.

## 1 · Verdict math (why INSTRUMENT)

Three independent full-evidence ballots ranked the looks:

| Ballot | instrument | dusk | porcelain |
|---|---|---|---|
| 1 | **7.8** (1st) | 7.2 | 7.0 |
| 2 | **7.5** (1st) | 6.0 | 6.5 |
| 3 | 7.2 (2nd) | **7.6** (1st) | 7.0 |
| aggregate | **22.5** | 20.8 | 20.5 |

Majority first-place (2/3) AND highest aggregate → instrument. Consistent across ballots: instrument is the only lane whose renders hit jewelry grade (crown-knurl, back-crystal, true-DLC, ink-dial-with-bezel-specular-line) and the only stage with an editorial point of view; its one systemic failure — live≠render parity (black-chrome case, glare dial, Blender-only dark stage) — was judged config-fixable, not geometric. Dusk lost on gold-drift identity violation in its money shots + worst live parity; porcelain on failing its own specular thesis (safe e-commerce, "cannot win by its own rule").

## 2 · Grafts merged into `instrument.json` (unanimous or 2/3 council items)

1. `mat_crystal_sapphire`: **+ ior 1.77** (dusk's schema field) and **envMapIntensity 1.4 → 0.7** (dusk's dampener — the fix for live-hero dial glare; "sapphire mirror owns az 0").
2. `mat_band_ocean`/`mat_band_tab`: **#2a5f55 → #1f6153** (porcelain's grade; instrument's read over-saturated teal).
3. `mat_case_ao`: **dead-override** `{roughness 1, metalness 0, envMapIntensity 0}` — was a live override (0.34/1.1) in the shipped config; now the permanent camo-AO law.
4. Case-set satin nudge: `mat_titanium_case` 0.34→**0.38**, `mat_titanium_brushed` 0.30→**0.34**, `mat_case_top` 0.32→**0.36** roughness (ballot-2 graft "tame live chrome one notch toward the renders' satin").
5. Nocturne keyframe (inert data, `x_sectionLightKeyframes`): envIntensity **0.12 → 0.35** + exposure 0.95 + `bloomStrength 0.85` (dusk's continuum + hot-dial-bloom graft); the porcelain **0.045 blackout** survives as the AOD match-cut beat *inside* the section only. Added `bgStage` fields (Mechanism #101216, Nocturne #0A0B0D) — the per-section stage-darkening data for the live-parity fix; P2's keyframe driver consumes them.

NOT changed (documented in the bible instead): contact-shadow key, `gl.setEnvIntensity` hook, RGBELoader→HDRLoader — all schema/src work assigned to P2 (bible §1.4 + appendix). DLC warm-rim treatment is a lighting beat, not a material edit (bible §1.3).

## 3 · Default-look flip (smallest change)

`src/main.ts` only, two lines: `currentLookName` fallback `"default"` → `"instrument"`, and boot resolution `params.look !== null ? loadLook(params.look) : DEFAULT_LOOK` → `loadLook(params.look ?? "instrument")`. `DEFAULT_LOOK` remains the in-code catch fallback (fetch failure still never leaves the stage unstyled — reviewer-resilience preserved). `default.json` untouched (`?look=default` still addresses the TEMP studio look for A/B).

## 4 · Verification (empirical, not claimed)

- `python3 json.load` on the edited instrument.json → OK.
- `npm run build` (tsc strict + vite) → **clean** (pre-existing 870KB chunk warning only, plumbing-lane handoff).
- `vite preview` on dist :4188 + headless real Chrome (playwright-core `channel:"chrome"`, 1600×900), **NO `?look` param**: `state().watch = {look:"instrument", parts:175, screenAdopted:true}`, loader-gone gate + 2.5s settle, **CONSOLE_ERRORS 0** → `docs/p15/final-look.png`. Script: scratchpad `final-look-proof.mjs` (pattern = dusk's live-proof.mjs).
- Frame read (honest): case now reads bright satin Ti (the black-chrome divergence is gone), Wayfinder legible through the crystal with a manageable top-edge sheen, band deep teal. Still visible and expected: banded contact-shadow ellipse (bible §1.4 fix 2, needs the schema key), Helvetica fallback type (fonts still unshipped — bible §4 / appendix item 4), light stage at hero (correct — the dark stage is per-section via `bgStage`, driver is P2 item 1).

## 5 · Council items routed into the bible (so nothing is lost)

Dial: PASS 3/3, locked with 3 spec.ts-only tunes (AOD drops seconds hand · PWR/AIR labels → icons/unit glyphs · hand stem ink) — bible §5. Type: Clash Display 300 confirmed 3/3, 600 banned at display, $0 licensing, ship-the-fonts is the highest-value single fix — §4. Internals: TUNE not pivot, taptic steel-shell flag CONFIRMED, 4-item tune list + queue order — §9. Motion bible imported whole as law — §3. Gallery shot list (8 frames w/ optics), scrims, copy budgets, cursor ref — §6–§10.

## Pitfalls added this lane

1. Ballot disagreement is signal: dusk won ballot 3 on *atmosphere* while both others disqualified it on *identity* (gold watch). Identity violations trump beauty ceilings in a brand-faithful build — encode identity constraints (neutral-albedo law) in the bible so P4 gallery renders can't drift either.
2. When applying a judged "one notch" material fix, land it in the same pass as a screenshot proof — the roughness nudge was verifiable in the very frame the default-flip required anyway (zero extra cost).
3. `x_`-prefixed config blocks being loader-ignored makes keyframe grafts free — merge council keyframe changes into data immediately, don't leave them prose-only in the bible.
