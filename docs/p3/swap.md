# P3 lane notes — SWAP / colorway / outro restart (`swap`)

Status: **DONE, all checks pass** · 2026-08-26 · lane: P3 swap
Law followed: `docs/LOOKBIBLE.md` + `docs/p15/motion-bible.md` · contracts `docs/p1/engine.md`,
`docs/p15/plumbing.md`, `docs/p2/infra-gl.md`, `docs/p2/integrate.md` untouched ·
`sections/index.ts` untouched (no registration changes) · spec source: PLAN §1 mechanics 4+5 +
rubric `colorway-5param-1s-tween` / `colorway-dual-placement` / `colorway-config-consumers` /
`colorway-gallery-resrc` / `outro-4watch-lineup` / `outro-swap-restart-loop`.

Verified empirically (not claimed, re-run on the current build): `npm run build` (tsc strict +
vite) clean · **engine-smoke ALL PASS** · **`evals/swap-smoke.mjs` 26/26 ALL PASS** (headless
real Chrome via playwright-core `channel:"chrome"`, vite preview :4573) · zero console errors on
eval AND live pages · captures in `docs/p3/swap/*.png` (below).

## Module map

| Module | Change |
|---|---|
| `src/ui/colorway.ts` (NEW) | `ColorwaySystem` — the CONFIG_CHANGE owner. ONE mutation path: every entry point (Parts picker, Colors rail, outro SELECT+SWAP, `__ONE_HERTZ__.setConfig`, harness) EMITS on the typed bus; this system is the only material writer. 1 s GSAP tween (`power3.inOut`) of all 5 params per affected material; `duration: 0` applies synchronously (the restart path). Owns accents fan-out + `state().config` / `state().materials` providers + the finish-swatch cursor-icon delegation |
| `public/assets/looks/instrument.json` | `+ x_colorway` variant tables — material truth (plumbing §2 schema family): `finishes.{natural, black-dlc}` × `bands.{tide, graphite, ember, midnight}`, each entry a full `{color, roughness, metalness, envMapIntensity, metalnessMapIntensity}` set. `natural`+`tide` mirrors the base materialOverrides (boot state regrades nothing). Supersedes `x_dlcVariant` |
| `src/gl/look.ts` | `LookConfig.x_colorway?` type + passthrough (look loader stays dumb — tables are data) |
| `src/sections/parts.ts/.css` | dual-placement picker **#1**: live picker card in the parts-table CALIBRE slot (`.prt__picker`, `data-colorway-slot="parts"`) — 4 swatches (`data-finish`), name/sub copy + ring-arc + core dot follow the bus; card rise .24–.34 (gate-4 numbers, kept) |
| `src/sections/colors.ts/.css` | dual-placement picker **#3**: the edition rail's slots emit canonical `{config}` payloads; captions, swatch ring, and the section's colorway CSS pair are bus CONSUMERS (same fan-out as everyone) |
| `src/sections/footer.ts/.css` | dual-placement picker **#2** + THE OUTRO (details below): 4-instance lineup, SELECT MODEL preview, SWAP restart, credits slate coexistence, `state().outro` |
| `src/sections/images.ts` | gallery re-src consumer: all five `<picture>` sets re-src to `/assets/gallery/${config}_${n}.webp` on CONFIG_CHANGE (art-direction `min-width:1024` source preserved); caption colorway label follows |
| `public/assets/gallery/*` | 20 stills — `{natural-titanium, black-graphite, natural-ember, black-midnight}_{1..5}.webp` (interim per-config sets via the tune-w3w4 Blender+PIL pipeline; P4 Cycles masters remain drop-in on the same naming contract) |
| `src/core/events.ts` | `ConfigChange` payload: canonical `{config}` + optional `{duration, restart}` + legacy `{finish, band}` (P2 sockets) — `resolveConfig` normalizes every shape |
| `src/core/debug.ts` | `+ ConfigStateSnapshot`, `+ TrackedMaterialSnapshot`, `state()` gains `config` / `materials` / `outro`; `colorway` store axis now written truthfully |
| `src/main.ts` | wires `ColorwaySystem` (stage/store/dial/vital + restart hook = `engine.scrollTo(0, true)`), `colorway.setLook` on every look land, `__ONE_HERTZ__.setConfig(id[, durationS])` → bus emit (the one path — evals move the site exactly like a picker click) |
| `evals/swap-smoke.mjs` (NEW) | 26 assertions: 4 configs + truthful active/colorway axis, in-page tween sampler (mid-flight distinct from both endpoints, 5/5 params interpolate, completes 1 s ± 0.15), 3 picker hosts, consumers (dial accent, `--accent`/`--biosignal`, gallery 5/5 re-src + caption), cross-placement fan-out, outro (4 instances / 0.1 s stagger / preview / restart y=0 + finish applied at duration 0 / selection cleared / credits slate at p=1), cursor labels + finish-swatch icon, zero console errors (eval + live) |

## 1 · CONFIG_CHANGE — the material grade

- **The config axis** (founder 2026-08-26, project CLAUDE.md): 2 Ti finishes × Ocean-band COLOR
  recolors → 4 shipped configs: `natural-titanium` (Tide, boot), `black-graphite`,
  `natural-ember`, `black-midnight`. **Alpine/Trail slots reserved**: `CONFIGS` is a data table +
  look `bands` entries + gallery assets — adding a band-geometry config after the dika3d purchase
  touches zero logic.
- **Tween**: one GSAP tween per swap (`power3.inOut`, `SWAP_TWEEN_S = 1`) lerps
  `{color (linear-space Color.lerp), roughness, metalness, envMapIntensity,
  metalnessMapIntensity}` for every material named by the merged finish+band table — a graded
  material transition, never a repaint. Smoke samples mid-flight in-page and proves all 5 channels
  move and land at 1 s ± 0.15.
- **`metalnessMapIntensity`**: three.js has no such scalar — metalness IS the map's multiplier.
  Implemented as a tweened scalar whose product with `metalness` is written to
  `material.metalness` (same math, one uniform); both live values reported in
  `state().materials`.
- Materials are re-read from `stage.watch.materials` on every tick (plumbing pitfall #4 — never
  cached across an applyLook); `setLook` re-learns the tables and re-seeds live params whenever a
  look lands.

## 2 · Consumers (fan-out per swap)

- Hero materials (tween above) · gallery `<picture>`/img re-src (`${config}_${n}` contract) ·
  dial accent (`DialRenderer.setAccent` — second hand + beat dot) · BPM vital accent
  (`LivingVital.setAccent` — trace + QRS flash) · page tokens `--accent` (rubric read) +
  `--biosignal` (cursor HOLD ring, vital chrome). Accents stay in the biosignal red family ON
  PURPOSE — the heart stays red (PLAN §2); the config tempers it (`#ff2d55/#ff453a/#ff5a2d/#ff2d6e`).
- Parts card copy/ring, Colors captions/rail ring, outro labels — each their own bus listener via
  `resolveConfig`; smoke proves an emit from ANY placement moves ALL of them.

## 3 · Dual placement + cursor

- Picker roots: Parts CALIBRE card (#1), Footer outro (#2), Colors rail (#3 — bonus placement,
  rubric asks for two). All swatches carry `data-finish`; a click only EMITS.
- Cursor: `data-cursor-text` gives Parts/Colors "swap", the outro pin "SELECT MODEL", the commit
  control "SWAP" (nearest-ancestor wins); the finish-swatch ICON rides a passive `pointerover`
  delegation over `[data-finish], [data-outro-model]` tinted per-config `bandHex` — and clears
  ONLY when leaving our own elements (never stomps another system's icon — explode pitfall #1).

## 4 · The outro (Footer)

- **Lineup**: 4 clones of the assembled hero GLB (`watch.root.clone(true)` — live dial texture +
  bloom membership ride for free), each wrapper counter-rotated by the inverse of
  `caseSpace.quaternion` into a face-on plate; per-clone skins clone ONLY the materials the
  colorway tables touch (geometry + textures stay shared — DPR-conscious), then
  `applyColorwayParams` — instance i REALLY wears config i.
- **Rise**: source-exact wall-clock leg on enter — all four start at t=0, `power4.out`, durations
  `0.7 + i·0.1 s` (stagger via duration, not offset), from `y = min(−3.5, targetY − visH/2 − 0.9)`
  (auto-deepens on tall/portrait frames — ≈ −7 on mobile, matching recon). In eval the same
  stagger is scrub-mapped (deterministic captures — law 9: no wall-clock in eval). Per-slot
  contact shadows (`footer_slot_shadow_i` — renamed so `setHeroVisible`'s lookup can't grab one)
  ride each slot's rise.
- **Pick → SWAP**: SELECT MODEL on a lineup watch/label previews via canonical CONFIG_CHANGE
  (1 s grade, `state().outro.selected` set); SWAP emits `{config, restart: true}` → the system
  applies at duration 0 and fires the restart hook: `engine.scrollTo(0, {immediate: true})` —
  scrollY lands 0, the site replays from Intro in the chosen finish, selection clears for the
  next loop. **The full site is the swap preview** (rubric outro-swap-restart-loop).
- **Credits slate** coexists at the loop point: slate assembles .78–.97 (gate-4 geometry — the
  slate DOM rides (1−p)·vh, so late assembly is the truthful window) over/with the lineup; smoke
  proves slate AND model labels both visible at p=1.

## 5 · state() / eval surface

- `state().config` `{active, finish, band, accent, tweening, finishes[4]}` ·
  `state().materials` `[mat_titanium_case, mat_band_ocean]` (name/preset/5 live params — never a
  lie: falls back to reading the live three.js material until tables land) ·
  `state().outro` `{instances, stagger: 0.1, selected}` · `state().colorway` axis mirrors
  `config.active`.
- `__ONE_HERTZ__.setConfig(id[, durationS])` — bus emit, the one mutation path.

## Captures (evidence)

`docs/p3/swap/`: `parts-picker-graphite.png` (Parts card mid-table, graphite live) ·
`colors-rail-ember.png` (Colors rail slot 3 active) · `gallery-graphite.png` (5 cells re-src'd) ·
`outro-lineup-75.png` (4 instances risen, labels under centers) · `outro-slate-p1.png` (credits
slate + lineup coexisting at p=1) · `restart-intro-midnight.png` (post-SWAP: Intro at scrollY 0
in black-midnight).

## Deviations / interpretation flags (honest)

1. **Band axis = Ocean recolors** (founder 2026-08-26) — the task's "Alpine/Trail slots
   reserved pending purchase" is honored as data-shape, not dead UI: no greyed-out fake slots.
2. `x_dlcVariant` superseded by `x_colorway`; its anisotropy values are dropped from the tween
   (5-param law) — look lane may re-add them as a static physical-upgrade pass.
3. Legacy `{finish, band}` CONFIG_CHANGE payloads (P2 sockets) still resolve — normalized, not
   removed, so old emitters can't silently no-op.
4. Gallery stills for the 3 new configs are interim conversions on the P4 naming contract
   (`${config}_${n}.webp`) — TEMP-per-finish is sanctioned until P4's Cycles masters.
5. Colors rail is a third placement beyond the rubric's two — same bus, zero extra state.

## Handoffs

- **P4**: gallery Cycles masters ×20 (drop-in on the naming contract) · verify real
  finish×Ocean-color combos against Apple constants · family-callout copy review (founder's
  recolor-only decision).
- **Look lane**: co-sign the `instrument.json` `x_colorway` tables (data, not module code);
  optional static anisotropy re-add for black-DLC.
- **Post-purchase (if ever)**: Alpine/Trail = new `CONFIGS` rows + look band entries + gallery
  sets + band-geometry swap plumbing (the only real work — geometry, not this lane's material
  path).

## Pitfalls found this lane (inherit)

1. **Tween `from` must never alias the live (mutated) params** — clone at capture or every tick
   lerps from its own last output and the 1 s grade collapses into an exponential snap (bit this
   lane on the first smoke; `cloneLive` in colorway.ts).
2. **`metalnessMapIntensity` doesn't exist in three.js** — don't invent a uniform; tween a scalar
   and write `metalness × mmi` to `material.metalness` (the map multiplier IS metalness).
3. **Icon-channel hygiene**: a document-level hover delegation must remember whether the last
   icon was OURS and clear only then — clearing unconditionally stomps explode's magnifier.
4. **Restart inside eval must settle synchronously** (`scrollTo(0, immediate)` + engine settle)
   or the smoke's post-restart assertions race the Lenis tail.
5. **Per-clone re-skin discipline**: clone ONLY the materials the variant tables name; cloning
   the whole material set quadruples uniforms/textures for zero visual gain (DPR budget).
