# P1.5 lane notes — dial art pass (`src/dial/*` only)

Status: **DONE, all checks pass** · 2026-08-20 · beauty pass over the P1 rough (docs/p1/dial.md); module contracts untouched
Verified empirically: `npm run build` clean · **dial-smoke 18/18** after the pass · dirty-flag economics IDENTICAL (rest: 4 uploads / 346 frames · eval: exactly 1 upload · AOD: 1/s) — the art pass costs zero extra uploads.

## Reference study (proportion/grid truth — the face stays ORIGINAL)

Two REAL extracted watchOS dial textures were measured, never copied:

- **Ultra Wayfinder 1024px** (`research/asset-qa/ultra-3/textures/rIbiCAQPvhuVClj.jpg`) — structure truth:
  ticks are **stubby rounded-cap dashes** (capsules, ≈3.5:1), not hairlines · degree numerals AND cardinals
  are **rotated tangentially** (tops outward, like a physical compass bezel; bottom ones upside-down —
  instrument-honest) and sit **outside** the dash band · the band is contained by **hairline rings**
  (Wayfinder double-ring signature) · corner complications are open-ring gauges nestled against the bezel ·
  secondary ink sampled at **#91AFBA-class slate-teal** (not neutral gray), primary near-white #E2E2E2.
- **Series Flow 2048px** (`research/asset-qa/series-11/textures/CdGUMOYYnHJfiuT.png`) — Liquid Glass
  language truth: rim-lit edges (bright top-left → dark bottom-right), inner specular catches, soft
  transmission glow, top-lit slabs.

Our face = analog Wayfinder-class instrument rendered in that glass language: original layout
(12/3/9 + hot sub-dial owning the 6 sector, date pill, 4 corner gauges), native reading at a glance.

## What changed, by module

| Module | Art pass |
|---|---|
| `spec.ts` | Artboard restructured: bezel = ringOuter/ringInner hairlines + numeralR **0.905 outside** the dash band [0.845→0.802, majors →0.786] + dashW 0.014 capsules · minute track = minor **dots** (r 0.006) + major dashes · date **pill** spec (padX/padY) · corner gauges (sweep 280°, gap faces the display corner) · hands get stem/outline/ballR/aodRim/shadow constants · NEW `GLASS` block (rim/sheen/bloom/vignette, aodScale 0.25) · NEW `LABEL_TRACKING` 0.08em · palette shifted to sampled slate `rgba(145,175,190,…)`, bg #05060A; accents unchanged: **#FF2D55** active / **#FF375F-class** AOD (PLAN §3 discipline: N cardinal, seconds hand, heart data — nothing else) |
| `face.ts` | Rotated ring glyphs (`ringGlyph`, tangential) · hairline containment rings · long/short capsule dash rhythm · dot-minor minute track · corner slots redesigned as **open-ring gauges** (track faint + progress dim, round caps, value fg + tracked small-caps label) · NEW **`paintGlass`** (see below) · exports `arcRad`, `roundedRectPath` |
| `complications.ts` | `slotBase` = **Liquid Glass slab**: top-lit radial fill + gradient rim (bright top-left) + inner specular arc catch; AOD = skeleton rim only · depth gauge gains a white progress-head jewel · QRS trace clipped to the slab · compass rose densified (15° minors / 45° winds / 90° cardinals) + tapered orange blade needle, white tail + pin · labels use LABEL_TRACKING |
| `renderer.ts` | NEW cached **glassLayer** (per mode × size, like faceLayer) composited **after the hands** — crystal physically in front; zero per-frame cost · hands rebuilt: **shadow pass** (canvas shadow at redraw time only) + ink-**outlined batons** (active) / **hollow rim batons** (AOD — native watchOS AOD grammar) · seconds = hairline + counterweight **ball jewel** (0.021R) · hub = white collar → ink gap → red pin · date = hairline capsule pill (active), bare in AOD |
| `font.ts` | `setDialFont` gains optional `tracking` param (letterSpacing guarded; every call resets state, no leaks) |

## Glass depth illusion (PLAN §3 sanctioned: prebaked sprites, no real-time refraction)

`paintGlass` bakes, once per (mode × size): radial edge **vignette** (OLED under curved glass) → diagonal
**sheen** across the upper-left → **specular bloom** hugging the top-left corner radius → top-weighted inner
**rim light** along the display edge. Clipped to the rounded rect — the alpha-0 glass mask for the hero mesh /
loader match-cut stays clean. AOD multiplies all glass alphas by 0.25 (glass barely reads in the dark;
sheen/bloom drop entirely). Composite order is now: face → complication → date → hands → **glass**.

## Economics proof (contract unchanged)

Redraw = same single `texture.needsUpdate` per dirty-key change; the glass layer adds one `drawImage` per
REDRAW, nothing per frame. Post-pass smoke: rest 4 uploads/346 frames · complication swap = exactly one
repaint · AOD 2 uploads/2.2 s · eval frozen at 1 upload with wheel input dead. 18/18.

## Evidence — `research/lookdev/dial/`

`{active-depth, active-heartRate, active-compass, aod}-{1x, 2x-bezel, 2x-comp}.png` — 1x = full canvas at
device pixels (841×1024, the actual texture), 2x = nearest-neighbor zoom crops (bezel type + corner gauge /
hot slab + hub). All captured from `?dial=1&eval=1` (frozen 10:09:30 marketing pose, BPM 64) via
`research/lookdev/dial/capture.mjs` (playwright-core + real Chrome, canvas readback — re-runnable for the
council). Before-state kept in session scratchpad only.

## Pitfalls added this lane

1. **Canvas `letterSpacing` is persistent state.** Any tracking set for a label leaks into every later
   `fillText` unless the font setter always resets it — `setDialFont` now owns that reset; never set
   `ctx.letterSpacing` directly.
2. **Glass must composite above the hands from its own cached layer.** Painting highlights into the face
   layer puts the crystal *behind* the hands and kills the depth read; a third cached canvas costs one
   `drawImage` per redraw and nothing per frame.
3. **Tangential ring glyphs**: rotate by the dial angle itself (`ctx.rotate(deg·π/180)` at the polar point).
   Do NOT flip the bottom sector — a compass bezel rotates with heading, upside-down bottom numerals are the
   native/instrument-honest read (verified against the Wayfinder texture).
4. **AOD hollow hands** = wide fg stroke + narrower bg stroke inset on the same segment (true capsule
   outlines need path math for zero visible gain). The bg fill is opaque — acceptable because the hands
   sweep over empty ink; revisit only if a P2/P3 layout puts face detail under the 10:09 pose.

## Open handoffs

- **Look council (P1.5)**: judge `research/lookdev/dial/*.png` against the two reference textures; further
  tuning = `spec.ts` only (GRID / GLASS / PALETTE / GEAR_PAGE_REVS).
- **Hero integration**: unchanged contract (`createDialScreenMaterial`, flipY note in docs/p1/dial.md §1).
  The glass sprite layer is inside the texture — the 3D crystal material adds its own real reflections on
  top; if the doubled highlight reads too hot on the stage, dial `GLASS.sheen/bloom` down in spec.ts.
- **P3 corner data**: corner gauges take `frac` per slot in `CORNER_ROUGHS` (face.ts) — when corners go
  live, move value+frac into `setVitals`-style quantized state so they join the dirty key (pitfall §2 of
  docs/p1/dial.md).
- Series Flow 2048 texture remains untapped as a Nocturne-gradient reference if the council wants a softer
  AOD variant.
