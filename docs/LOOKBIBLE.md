# LOOKBIBLE.md — the P2/P3 build law

Status: **LOCKED** · 2026-08-21 · P1.5 council closed (3 independent judges, full-evidence ballots)
Amended: **2026-08-26 · P5 council co-sign** (docs/p5/cosigns.md) — four housekeeping supersedes, all already shipped + gate-verified by P3/P4 lanes, formally recorded here: ① §1.3/§2 ocean anchor `#1f6153` → real-Ocean palette, anchor `#283f58` Anchor Blue (founder real-colors decision 2026-08-26; gallery lane flag 1) · ② §6 frame 4 `side-14mm` → `side-12mm` (apple.com Ultra 3 depth truth; copy lane flag) · ③ §1.5 table synced to shipped instrument.json (Hands rot 245, per-key bloom dips, Images anchorOffset — look-fixes §4/§5 co-sign) · ④ §2 Alpine/Trail line closed (founder: no purchase, recolor axis only).
Verdict: **INSTRUMENT wins** — first place on 2 of 3 ballots and highest aggregate (22.5 vs dusk 20.8, porcelain 20.5) — with grafts merged from both losing lanes (§1.3) and the live-parity fixes all three ballots demanded (§1.4).
Shipped: `?look=instrument` is now the **boot default** (`src/main.ts`); `public/assets/looks/instrument.json` carries the merged grafts. Proof frame: `docs/p15/final-look.png`.

Precedence: this file outranks the lane notes it synthesizes (`docs/p15/*.md`). PLAN.md founder directives outrank everything. Where a P2/P3 agent needs a number, it is here or in `docs/p15/motion-bible.md` (imported whole as law, §3) — **nobody invents lighting, timing, type, or copy lengths.**

---

## 1 · The Look — INSTRUMENT LIGHT

Thesis: precision-tool read. Hard cool key, crisp rims, long streak speculars crawling the chamfers, ink/porcelain diagonal staging, light that MOVES with the story (one full 360° env revolution over the page, loop-closing at the outro restart). The council found it the only lane whose best frames touch source craft: per-tooth knurl glints (render-02), the continuous bezel-rim specular line over an ink-black dial (render-03), the best back-crystal and true-DLC frames of the shootout (render-06/07).

### 1.1 · Environment + rig (authored, zero stock pixels)

Asset: `public/assets/looks/instrument.hdr` — 8-lightformer emissive rig baked to 2k equirect Radiance (Cycles panorama, 128spp). Rebuild script: `research/lookdev/instrument/scripts/bake_env.py`. Colors via Blackbody nodes (real Kelvin). The rig is ROTATION-RELATIVE: formers hold their separations; `envRotationDeg` aims the whole rig.

| # | Former | az/el | Size | K | Radiance | Job |
|---|---|---|---|---|---|---|
| 1 | `key_hard` | 125°/+42° | 0.95×0.65m @2.2m | 5500 | 42 | hard key — small = crisp falloff |
| 2 | `streak_chamfer_a` | 90°/+9° | 6.0×0.11m @3m | 5600 | 30 | THE signature: continuous chamfer spec |
| 3 | `streak_chamfer_b` | 255°/+16° | 4.0×0.09m @3m | 6500 | 22 | rear-left grazing streak (flank read) |
| 4 | `rim_main` | 340°/+12° | 0.14×2.4m @2.6m | 7000 | 55 | crisp cool rim, brightest edge |
| 5 | `rim_kicker` | 195°/+8° | 0.12×2.0m @2.8m | 7000 | 32 | opposing rim — dual knurl glints |
| 6 | `top_strip` | 100°/+72° | 1.4×0.18m @2.4m | 5800 | 20 | bezel/knurl top glints |
| 7 | `fill_soft` | 30°/+18° | 3.2×2.2m @3.4m | 7000 | 2.6 | harshness management |
| 8 | `bounce_floor` | 90°/−58° | 3.0×2.0m @3m | 5500 | 1.2 | floor return — metal darks keep shape |

Background: near-black → dark-cool-grey gradient (0.004→0.05 linear). Env authoring laws (all lanes' findings, permanent): emitters feathered via Emission-mixed-to-Transparent gradient (hard cards leave black rims in every reflection) · **az 0 = the dial's mirror direction — nothing bright near az 0 at low elevation** or the sapphire washes to a glare sheet (dusk's empirical law) · any future re-bake that lifts the ambient floor uses porcelain's DOME + FLOOR-BOUNCE strategy at reduced strength (the direct fix for dark-case live parity, §1.4).

### 1.2 · Rig + post stack (shipped in instrument.json)

- `lightRig`: envRotationDeg 0 · envIntensity 1.0 · exposure 1.05
- `postTune`: bloomThreshold **1.0** (never lower — HDR metal speculars would bloom) · bloomStrength **0.6** base (per-key overrides in §1.5: Nocturne **0.85** hot dial, dips Colors **0.22** / Parts **0.25** / Footer **0.30** for ink-dial legibility — gate-4 dial-wash tune, co-signed) · bloomRadius 0.3 · grainAmount **0.048** (hard light + grain double-count as texture; luminance weighting stays gl-lane law) · vignetteNocturne **0.36**
- DOF: macro pinned sections only, tier 0 only; focus racks ride the same beat fractions as their dolly (motion bible §7.9)
- Contact shadow: current defaults are a stub; final treatment blocked on the `contactShadow {opacity, radius, falloff}` config key (§1.4 fix 2)

### 1.3 · Material sheet (FINAL values = `public/assets/looks/instrument.json`, grafts merged)

**Permanent material laws (all colorways, all variants):**

1. **No anisotropy on the case set** — `mat_titanium_case` / `mat_titanium_brushed` / `mat_case_top` / `mat_titanium_hardware`. The GLB's quantized-UV tangents render it as marbled noise in three.js (A/B-proven). The brushed-streak story is carried by the streak lightformers instead. Cycles renders may keep mild case aniso (real tangents offline) — never copy that to web configs. Re-test only if a re-encode ships real tangents.
2. **`mat_case_ao` dead-override** `{roughness 1, metalness 0, envMapIntensity 0}` — the USDZ's baked-AO shells catch env speculars as camo mottling under any env with bright strips. Now in the shipped config (porcelain's find, council law).
3. **Sapphire = alpha route + `ior: 1.77` from config** (dusk closed the schema gap) with **envMapIntensity 0.7** — the dampener that stops the env sheeting across the crystal and murking the dial (dusk graft; fixes instrument's live-hero glare). Transmission stays banned (extra full scene render + breaks selective bloom).
4. Band colors are judged on RENDERED frames under THIS env, never swatches.
5. Material identity is not stable across overrides (`ensurePhysical` replaces instances) — re-read `watch.materials` after any `applyLook`; colorway tweens target the map's current values.

**Natural titanium (default finish):**

| mat | color | rough | metal | envInt | aniso |
|---|---|---|---|---|---|
| `mat_titanium_case` | #cfccc6 | 0.38 | 1.0 | 1.15 | — (law 1) |
| `mat_titanium_brushed` | #d2cfc9 | 0.34 | 1.0 | 1.2 | — |
| `mat_case_top` | #cfccc6 | 0.36 | 1.0 | 1.15 | — |
| `mat_titanium_hardware` | #c5c2bc | 0.42 | 1.0 | 1.1 | — |
| `mat_titanium_polished` | #dcdad6 | 0.10 | 1.0 | 1.3 | 0.3 |
| `mat_titanium_crown` | #cfccc6 | 0.32 | 1.0 | 1.2 | 0.7 |
| `mat_crown_knurl` | #c9c6c0 | 0.36 | 1.0 | 1.25 | 0.5 |
| `mat_bezel` | #b9b6b0 | 0.30 | 1.0 | 1.2 | 0.8 @ rot 1.5708 |
| `mat_case_ao` | — dead-override (law 2) | 1.0 | 0.0 | 0.0 | — |

(Case-set roughness sits one notch above the P1.5 renders' values — the council's "tame the live chrome toward the renders' satin" fix, applied 2026-08-21 and verified on the proof frame.)

**Crystal / back / sensors:** `mat_crystal_sapphire` #f4f6f9, opacity 0.16, rough 0.02, clearcoat 1.0/0.03, **ior 1.77, envInt 0.7** · `mat_back_spun` #34363a, rough 0.32, aniso 0.85 @1.5708 · `mat_back_ceramic` #121316, rough 0.24, clearcoat 0.7/0.12 · `mat_back_lens` #08090b, rough 0.06, clearcoat 1.0/0.02, envInt 1.3 · `mat_back_ring` #d5d3cf, rough 0.18, aniso 0.6 @1.5708 · `mat_back_matte` #17181a, rough 0.8 · `mat_sensor_dark` #0c0d0f 0.5 · `mat_sensor_trim` #9fa0a3 metal 0.3 · `mat_cavity_black` #060708 0.9.

**Ocean band — SUPERSEDED 2026-08-26 (P5 co-sign; founder real-colors decision):** the P1.5 green-teal `#1f6153` (porcelain graft) is dead — Apple sells no green-teal Ocean band. The band axis is now the three REAL apple.com Ultra 3 Ocean colors, judged on rendered frames under this env (law 4): **Anchor Blue `#283f58`** (the new ocean ANCHOR — boot band), **Black `#202226`**, **Neon Green `#a2df2e`**. Material truth lives in `instrument.json` `x_colorway` band tables (roughness/envInt per color); `mat_band_hardware_dark` #3a3c40, metal, rough 0.35 unchanged. Historical `#1f6153` survives only in the archived debug looks (`default/porcelain/dusk.json`) — never copy it forward.

**Accents:** `mat_accent_orange_ring` #e04f18 (metal 0.4, rough 0.42) · `mat_actionButton_orange` #d94a16 (rough 0.5) · `mat_button_trim` #b6b3ad (metal, rough 0.35).

**Black-DLC variant** (`x_dlcVariant.materialOverrides` in instrument.json — the ready P3 CONFIG_CHANGE payload): 8 titanium slots in the #14–1e band, roughness −0.03 vs natural (DLC seals slicker), same aniso topology, same case-set aniso ban. **Signature shot law (dusk graft):** DLC's beauty beat is the single warm raking rim strip on the top edge + luminous dial (dusk's hero-dlc recipe) — steal the lighting, never the gold titanium. In-engine: one env-rotation keyframe that lands `streak_chamfer_a` on the top edge during the DLC reveal.

### 1.4 · Live-parity fixes (all three ballots; BINDING before P2 section sign-off)

The look's identity (dark graphic stage, satin Ti) must exist LIVE, not only in Cycles:

1. **Per-section stage darkening** — the ink/porcelain split-stage grammar (§2) is wired by the keyframe driver: `bgStage` fields in `x_sectionLightKeyframes` (Mechanism #101216, Nocturne #0A0B0D) drive `stage.setStageColor` + `--porcelain` alongside env rotation. Without this the dark env reflects into metal against a light page and the case reads as an incoherent black-chrome cutout (every ballot's #1 finding).
2. **Contact shadow config key** — add `contactShadow {opacity, radius, falloff}` to the look schema (`gl/look.ts` + `createContactShadow`); every live frame in the shootout shows a hard-edged dithered ellipse. Soften the gradient falloff (banding fix) in the same pass.
3. **`gl.setEnvIntensity` debug hook** — expose alongside `gl.setEnvRotation` for keyframe wiring + eval symmetry.
4. **Crystal glare** — fixed via material law 3 (envInt 0.7 + ior 1.77), already shipped.
5. **Live env-rotation re-tune** — after fixes 1–2 land, re-run porcelain's **9-point rotation sweep** (`live-proof.mjs` sweep mode) per section to verify dial legibility at every keyframe azimuth. Sweep evidence, not taste, picks the final envRotationDeg deltas.
6. `loadHdrEnv`: migrate RGBELoader → HDRLoader (three r185 deprecation; cosmetic, do in passing).

### 1.5 · Per-section lighting keyframes (all 15 — clock-scalar driven, DATA in instrument.json)

Shape: one clean 360° revolution Intro 0° → Footer 360° so the outro SWAP-restart lands back on the hero pose seamlessly (the loop-closing shape the council grafted over dusk's −300° jump). Wiring contract: P2's per-frame driver lerps between section-center keys off the WebGL master progress via `stage.setEnvRotation` + `stage.setEnvIntensity` + `renderer.toneMappingExposure` (+ `stage.setStageColor` for `bgStage`, + `post.tune` for per-beat `bloomStrength`, + optional per-key `anchorOffset` shifting that key's center anchor by a fraction of its section's raw range — gate-4 Images handoff). Section agents never invent lighting.

*Table synced to shipped `instrument.json` 2026-08-26 (P5 co-sign of the P3 tune-w3w4 + P4 look-fixes data edits — `docs/p4/look-fixes.md` §4/§5). instrument.json remains the DATA of record; on any future divergence, re-sync this table, never fork it.*

| # | Section | rot° | envInt | exposure | Extra / note |
|---|---|---|---|---|---|
| 1 | Intro | 0 | 1.0 | 1.05 | hero pose — key upper-left, rim behind right |
| 2 | Timeless | 15 | 1.0 | 1.05 | |
| 3 | VerticalText | 35 | 0.95 | 1.05 | light quiets under the word stack |
| 4 | Disassembly | 70 | 1.1 | 1.10 | hardest read — key crosses the exploded parts |
| 5 | Mechanism | 110 | 1.05 | 1.05 | dark beat: `bgStage #101216` (fix 1) |
| 6 | Movement | 140 | 0.95 | 1.05 | |
| 7 | Curves | 170 | 1.0 | 1.05 | streak strip grazes the chamfer — light rehearses the copy |
| 8 | MovementWatchRight | 200 | 1.0 | 1.05 | |
| 9 | Hands | **245** | 0.9 | 1.05 | *was 225 — sweep-picked (gate-3 Hands tune 1, co-signed look-fixes §4): at 225 the crystal mirrors `streak_chamfer` into a blown sheet through .5–.92; 245 holds the ink read, arc stays monotonic (200 < 245 < 250)* |
| 10 | Straps | 250 | 1.05 | 1.05 | band macro — fluoroelastomer stays matte |
| 11 | Images | 250 | 1.05 | 1.05 | DOM section — hold; `anchorOffset −0.05` starts the porcelain→Nocturne bgStage ramp one beat sooner (gate-4 exit handoff; Straps→Images segment is value-flat, so only the outgoing ramp moves) |
| 12 | **Nocturne** | 290 | **0.35** | 0.95 | **dusk graft**: continuum dip, NOT blackout; `bloomStrength 0.85` (hot dial halo), vignette flag on, `bgStage #0A0B0D`. The deep **0.045 blackout** (porcelain graft) survives only as the AOD **match-cut beat inside the section** — dip at the handoff moment, back to 0.35 by the section's own exit. Entry/exit grade on the continuum (dusk's thesis), the moment itself on porcelain's ink. |
| 13 | Colors | 330 | 1.0 | 1.05 | recovery ramp out of Nocturne; `bloomStrength 0.22` — ink dial resolvable at plate standoff (gate-4 dial-wash tune, co-signed) |
| 14 | Parts | 350 | 1.0 | 1.05 | `bloomStrength 0.25` — card-slot dial reads ink at standoff 10 (gate-4 dial-wash tune, co-signed) |
| 15 | Footer | 360 | 1.0 | 1.05 | full revolution — restart lands on the Intro pose; `bloomStrength 0.30` for row-scale lineup dials (gate-4 dial-wash tune, co-signed) |

Light-motion laws: env-rotation tweens use `power2.inOut` (motion bible — light never snaps); stage-dim restores before section exit (by t≈0.9); Nocturne is the ONLY section that may hold a dimmed exit into Colors' recovery ramp.

### 1.6 · Camera recipes the look owns (engine facts, adopt verbatim)

- **Back-crystal / Mechanism framing:** camera INSIDE the band loop (AR pose: case back faces into the loop — outside it shoots strap), 35mm at ~28mm standoff; macro-crops the engraved DIVE-40M ring. This constraint binds the P2 Disassembly/Details camera beats too.
- **Face-on beauty plate:** porcelain's render-03 camera recipe (straight down the measured 35° dial normal, symmetric framing) — the cleanest instrument read of the shootout; canonical for marketing frames.
- Back shots: the back normal points 35° below horizon — hide the floor or the camera is underground. Macro optics everywhere: sensor 16 / lens 40, clip_start 0.001.

---

## 2 · Color tokens, Nocturne mappings, colorway accents

**Ramp (CSS custom properties; `bgTokens` in instrument.json):**

| Token | Value | Role |
|---|---|---|
| `--porcelain` (stage) | **#E8EAED** | cool porcelain ground (instrument's, cooler than PLAN's #EDEDEB — deliberate) |
| `--ink` | **#0A0B0D** | ink ground + type on light |
| `--biosignal` | #FF2D55 | HOLD ring, ECG, red discipline |
| `--biosignal-nocturne` | #FF375F | brightened Nocturne variant |
| accent orange | #e04f18 / #d94a16 | crown ring / action button — instrument-orange against cool light |
| ocean band | **#283f58** | Anchor Blue — the Ocean colorway anchor + boot band (superseded #1f6153, P5 co-sign 2026-08-26; siblings Black #202226 / Neon Green #a2df2e, §1.3) |
| dial secondary ink | #91AFBA-class slate-teal | sampled from the real Wayfinder texture (dial spec §5) |

**Stage grammar (the look's editorial signature, council-adopted as the site's section-background law):** the ink/porcelain **diagonal split-stage** — sections alternate light/dark grounds exactly as the source alternates its section plates. Live wiring = `bgStage` keyframes (§1.4 fix 1). Render wiring = the diagonal wedge backdrop (fix the stair-step aliasing on the wedge edge before gallery re-renders — filter/AA the wedge, noted from render-01/07/08).

**Nocturne mapping (inversion designed, not filtered):** stage → #0A0B0D · type → porcelain 92% alpha · biosignal → #FF375F · dial = the light source (bloom 0.85, emissive carries the frame) · grain thickens automatically (luminance-weighted) · vignette 0.36 on. Every other token dims by tone, never hue-shifts.

**Colorway accents (P3 CONFIG_CHANGE — axis final per founder 2026-08-26):** FOUR shipped configs = 2 Ti finishes × 3 real Ocean colors (Anchor Blue carries the repeat on opposite finishes): `natural-anchor-blue` (boot) · `black-dlc-black` · `natural-neon-green` · `black-dlc-anchor-blue`. **Alpine/Trail: CLOSED, never building** — no purchase, no in-house geometry (supersedes the "$30 dika3d blocked" line). Each colorway declares: band mat values in `instrument.json` `x_colorway` (judged under the shipped env), CSS `--first/second-color` pair, gallery `<picture>` set, dial accent unchanged (red discipline is not a colorway).

---

## 3 · Motion — imported as law

**`docs/p15/motion-bible.md` is incorporated into this bible by reference, whole and binding.** P2 builds against it; P3 verifies against it; nobody invents timings. Its ten laws, restated for the section agent who reads nothing else:

1. `power3.inOut` unless the bible names another ease for the exact move class.
2. Arrivals from off-frame `power3.out` · departures `power2.in` (violent: `power4.in`) · hero entrances `power4.out` · light `power2.inOut` · scrubbed opacity `linear`.
3. Wall-clock durations ∈ {0.4, 0.8, 1.2, 2.0} s ±25%; closers run 0.5–0.8× their opener.
4. Three unit domains (scrub fraction / DOM px / wall-clock seconds); every timeline states its domain; WebGL group timelines padded to 1.
5. ONE smoothing owner: Lenis duration 4. No scrub-position lerp. `scrub:2` = text-color reveals only.
6. Scrub windows open 1 vh early; DOM sub-timelines overlap exactly 1 vh; first/last clamp.
7. Camera: one big move per beat; parallax off during macros; dim restored by .9; `.set()` snaps ≥.95 off-frame only.
8. Longpress: 500 ms arm · 2 s power3.inOut ramp · release decay ∝ depth (power3.out) · scroll live at release instant · zoom table: default 1.35 / Disassembly 1.6 / DOM-only 1.
9. Wall time banned everywhere except the Nocturne AOD tick (≤1-tick phase-align handoff, eval-frozen).
10. New deviations get written into motion-bible §7 first, built second.

Scrub beats land on the fraction grid {.05,.1,.15,.2,.25,.4,.5,.75}; per-slot duration budgets = motion-bible §8's table (SECTION_VH is the single constant; budget bumps are bible-sanctioned, never local hacks). Cursor follow stays **k=12** (instrumental snap fits INSTRUMENT; the council did not overturn — the source's 1.3 s floaty tail remains a one-constant change if P5 councils demand it).

---

## 4 · Type spec (council-confirmed 3/3: Clash Display at 300)

The comp evidence (`research/lookdev/type/`) confirmed candidate A on all three ballots: the only face carrying the source's light + wide + flat-sided-oval DNA; PP Neue Montreal is premium-neutral portfolio-default; **weight 600 is banned at display sizes**; and the highest-value fix is that **no fonts are loaded at all today** — every live frame renders Helvetica fallback.

- **Display**: Clash Display — colossal/hero **300**, section headlines 300–400, eyebrows/labels 500. Caps-led display lines. Never body text.
- **Tracking**: −0.025 em ≥160 px · −0.02 em 64–160 px · −0.01 em 32–64 px · caps labels +0.08–0.14 em.
- **Hierarchy by tone, not weight**: ghost layer 30–32% alpha of the ground's counter-color · dim labels 55% · staggered second line indent ≈0.55× cap-height of the line above.
- **Body**: Inter (`--font-body`).
- **Data**: Geist Mono, `font-variant-numeric: tabular-nums` declared; BPM/depth/altitude figures and the CALIBRE table always mono.
- **Serif accent**: Fraunces Italic variable (opsz 144 display / 60 sub, wght 380, SOFT 0, WONK 0) — exactly ONE moment sitewide, ≥40 px.
- **BPM numerals**: display face 300 (the oval bowls are the point), tabular-nums where 58↔220 animates.
- **Modular scale**: 212 / 104 / 46 / 30 / 26 / 22 / 15 px @1600 ref; clamp() mapping is the implementing agent's job.
- **Integration (type.md §5, now look-lane work)**: self-host woff2 latin subsets in `public/assets/fonts/` (ClashDisplay 300/400/500, GeistMono var, Fraunces italic var, Inter) · `@font-face` with `font-display: block` + size-adjust fallback metrics · flip hero/headline CSS 600 → 300 · dial stays SF-in-canvas (its own contract; no font files for it in repo).
- **Licensing (founder note)**: entire winning system **$0 for commercial use** — Clash Display under Fontshare/ITF Free Font License (web self-hosting allowed), Geist Mono / Fraunces / Inter under SIL OFL. No purchases needed unless a council overturns for PP NM ($120–430).

---

## 5 · Dial spec — LOCKED, ship with three spec.ts-only tunes

Council: **native-at-a-glance PASS, 3/3** — tangential rotated bezel numerals (upside-down bottom sector, instrument-honest), capsule dash band inside hairline double rings, corner open-ring gauges, date pill, slate-teal secondary ink, Liquid Glass slab on the hot sub-dial (top-lit rim, inner specular arc, clipped QRS), red discipline held. The `docs/p15/dial-art.md` spec is final; the P1 module contracts unchanged.

Tune list (all in `src/dial/spec.ts` / face constants — no contract changes):

1. **AOD drops the seconds hand entirely** (real watchOS AOD grammar; the orange compass needle dims, hollow-rim batons stay).
2. Corner gauge labels PWR/AIR → **icons or unit glyphs** (Apple never words there; the one un-Apple tell).
3. Active hour/minute batons gain a **dark stem segment near the pivot** (real Ultra hands don't run solid white to the hub).

Glass note: the baked sheen is near-invisible at 1x — acceptable and intended; the 3D crystal adds real reflections on top. If the doubled highlight ever reads hot on stage, dial `GLASS.sheen/bloom` down in spec.ts (never in the renderer).

---

## 6 · Gallery shot list (P4 Cycles renders — hero GLB under §1.1's rig, one shared LUT with realtime)

All: Cycles 128spp+, 1280px+ masters, AgX MHC to match the QA set until the shared LUT lands; macro = sensor 16 / lens 40; clip_start 0.001; diagonal split-stage with AA'd wedge edge.

| # | Frame name | Optics | Crop / subject |
|---|---|---|---|
| 1 | `hero-diagonal` | 50mm, 3/4 hero | full watch on the ink/porcelain diagonal — the site's signature plate (instrument render-01 recipe, wedge edge AA'd) |
| 2 | `crown-knurl` | macro 40mm f/3.2 | crown + knurl, per-tooth glints, dial bokeh behind (render-02 — the council's jewelry-grade proof) |
| 3 | `dial-faceon` | 35° dial-normal, symmetric | full face; bezel rim carries one continuous specular line, ink dial fully legible (porcelain's render-03 camera, instrument's light) |
| 4 | `side-12mm` | 105mm | edge-on profile — the 12 mm story; both chamfer streaks live. *(Renamed from `side-14mm`, P5 co-sign 2026-08-26: apple.com Ultra 3 depth is 12 mm; 14.4 was the Ultra 2. Page copy shipped `SIDE-12MM` at P4; gallery assets are `${finish}_${n}.webp` by index, so no filenames break.)* |
| 5 | `back-crystal` | 35mm @ ~28mm, inside band loop, floor hidden | engraved DIVE-40M/WR-100M ring legible, sensor dome radial structure |
| 6 | `dlc-warm-rim` | 50mm 3/4 | black-DLC variant, single warm raking rim strip on the top edge + luminous dial (dusk's hero-dlc lighting — what makes DLC read ceramic, not plastic) |
| 7 | `nocturne-aod` | 50mm, slight low angle | env 0.045, dial emission carries the room, vignette on — the porcelain-blackout beat (dusk's continuum grades the section, this frame is the moment) |
| 8 | `band-ocean-macro` | macro 40mm f/2.8 | Ocean band crest — focus on the strap VERTEX nearest a camera-side probe (bbox centers give 100% bokeh; both losing lanes proved the failure) |

Desktop + mobile crops per finish; device always a real render (PLAN law); AI images background plates only.

---

## 7 · Scrim & legibility rules

1. Every text-over-3D moment carries the source's scrim grammar: a gradient scrim from the nearest ground token (porcelain or ink per §2 stage state) at 0→~55% behind the text block — never a hard panel.
2. Dial legibility outranks drama: any keyframe azimuth must pass the 9-point sweep (§1.4 fix 5) before a section signs off.
3. Grey-line color reveals (scrub:2) use the motion-bible greys: #BCBCBC/#FFFFFF on dark, #323232 on light.
4. Cursor label = mono micro-caps with ground-colored text-shadow scrim on porcelain; over ink/dark-metal sections the label swaps to the porcelain chip treatment (the dot stays difference-blend, the HOLD ring stays unblended biosignal — the signal color never inverts). This closes the cursor lane's open handoff.
5. Ghost/tone type layers (§4) never sit over the watch itself at <40% contrast moments — offset the stagger or raise the scrim.
6. Bloom never aids legibility: threshold stays 1.0; if type needs light it gets tokens, not glow.

## 8 · Copy-length budgets per slot (P4 writes INSIDE these; adversarial review measures)

| Slot | Budget |
|---|---|
| Hero title | 2 lines · ≤14 chars/line (split-char animated) + 1 sub-line ≤48 chars |
| Word-stack (Timeless / Movement) | 4–6 words · ≤34 chars total per stack line |
| Section headline | ≤3 lines · ≤18 chars/line at colossal, ≤28 at tier-2 |
| Section body block | ≤2 paragraphs · ≤220 chars each (one thought per paragraph) |
| Eyebrow/label | ≤18 chars caps |
| Explode part label | name ≤22 chars · description 90–140 chars, **unique per part** (outdo the source's shared placeholder — PLAN §1 named shortcut) |
| Details hover label | ≤26 chars |
| Catalog/BPM card | value + unit mono · caption ≤60 chars |
| CALIBRE table row | label ≤16 · value ≤12 mono |
| Nocturne beat lines | ≤44 chars each, max 3 lines on screen |
| Credits slate | ≤7 lines · ≤44 chars/line |
| Cursor text | fixed vocabulary only: HOLD TO EXPLORE / SELECT MODEL / SWAP |

## 9 · Internals (A2) — verdict: TUNE, do not pivot

Council 3/3: the stylized-cutaway pivot is **NOT taken**. `taptic_c_macro` (crisp copper voice-coil windings, legible TAPTIC/FG551251 etch) proves the assets reach the bar; the failures are material grades, not design. The maker's steel-shell flag is **CONFIRMED**.

Tune list (blocking order):

1. **Taptic shell** (blocks the Taptic): bright glossy white-plastic read → bead-blasted steel ~#b0b6ba, metalness 1.0, roughness 0.35–0.45 with micro variation, mild brushed aniso, add parting-line/weld-seam darks, raise etch contrast.
2. **FPC ribbons, both models**: salmon taffy-thick blobs → thin to kapton film thickness, flatten bend profiles, slight translucency + trace lines (`taptic_b_top`, `battery_c_macro`).
3. **Battery pouch face**: kill the clear-acrylic rim/skirt on `battery_a_hero` (should read crimped foil) and the spun-metal radial highlight on `battery_b_top` (pouch laminate is matte wrinkled foil — add wrinkle micro-normal).
4. **Re-shoot under the instrument rig** (§1.1), not the white void — parts inherit the shootout's specular grammar; rein in DOF (`taptic_a_hero` is majority out-of-focus).

Keeps: coil, engraving, gold tab lugs, kapton strip, orange tape, tungsten masses. **Queue**: battery passes to queue after tune 3; Taptic blocked on tunes 1–2; then both join the Disassembly/Mechanism part roster.

## 10 · Cursor spec (reference)

Contract + implementation: `docs/p1/cursor-events.md` §2 (state machine, icon vocabulary, HOLD ring) — unchanged by the council except: label treatment per §7.4 above; follow constant stays k=12 (§3); HOLD ring color = `--biosignal`, never blended, fill = longpress intensity (2 s inOut, source parity). Icon set: `finish-swatch | cross | arrow-left | arrow-right | select` — kebab-case is eval-frozen.

---

## Appendix · What P2 must build first (the bible's own dependency list)

1. Keyframe driver (env rotation/intensity/exposure/bgStage/bloom off the clock scalar) — §1.5 wiring contract; unblocks the look's live identity.
2. `contactShadow` schema key + softened falloff — §1.4 fix 2.
3. `gl.setEnvIntensity` debug hook — §1.4 fix 3.
4. Fonts shipped + 600→300 flip — §4 (one step, changes every frame).
5. Dial tunes 1–3 — §5 (spec.ts only).
6. Then: sections in PLAN's risk-descending order, each signed off against §1.5 keyframes + §7 scrims + motion law + the 9-point sweep.
