# P4 lane notes — gallery Cycles masters + real-Ocean colorway axis

Status: **DONE — all gates green on the final build** · 2026-08-26 · lane: P4 gallery
Law: `docs/LOOKBIBLE.md` §6 (shot list) + §1.3 (materials) + founder decision
2026-08-26 (project CLAUDE.md): NO Alpine/Trail — colorway axis = 2 Ti finishes ×
**real Apple Ocean COLOR recolors only**. `sections/index.ts` untouched.

Verified empirically on the final build: `npm run build` clean (tsc strict +
vite) · **engine-smoke ALL PASS** · **swap-smoke 26/26 ALL PASS** (vite preview
:4640, headless real Chrome) · capture walk Images/Footer × 4 configs, desktop
1600×900 + mobile 390×844, **zero console errors** → evidence
`docs/p4/gallery/*.png` (14 frames).

## 1 · The config set (founder decision executed, verified on apple.com)

Apple sells the Ocean Band for Ultra 3 in exactly THREE colors — **Black,
Anchor Blue, Neon Green** (apple.com buy pages, checked 2026-08-26; every
combo below is a real orderable configuration, e.g.
`/shop/buy-watch/apple-watch-ultra/49mm-cellular-natural-titanium-anchor-blue-ocean-band`).
The invented Tide/Graphite/Ember/Midnight names are GONE. Three real colors
across four slots forces one repeat; Anchor Blue carries it on OPPOSITE
finishes at opposite ends of the lineup (slots 1/4), so the outro 4-up stays
visibly distinct — and every label is now a real Apple name:

| # | id (asset token) | finish | Ocean band | accent |
|---|---|---|---|---|
| 1 | `natural-anchor-blue` (boot) | natural | Anchor Blue `#283f58` | #ff2d55 |
| 2 | `black-dlc-black` | black-DLC | Black `#202226` | #ff453a |
| 3 | `natural-neon-green` | natural | Neon Green `#a2df2e` | #ff5a2d |
| 4 | `black-dlc-anchor-blue` | black-DLC | Anchor Blue `#283f58` | #ff2d6e |

Band albedos were judged on RENDERED frames under the instrument env
(LOOKBIBLE §1.3 law 4) via a low-spp sweep, not copied from swatches.

### Files changed for the axis

- `src/ui/colorway.ts` — CONFIGS table (ids, real labels, chip hexes) +
  `DEFAULT_CONFIG_ID`; order still alternates finishes (tracked-material law).
- `src/core/state.ts` — boot `colorway: "natural-anchor-blue"`.
- `public/assets/looks/instrument.json` — `x_colorway.bands` re-keyed
  {anchor-blue, black, neon-green} (param structure inherited from the old
  tables, colors re-judged); base `materialOverrides` band colors mirror the
  boot config (the mirror law in the x_colorway comment).
- `src/sections/images.ts` — gallery caption now prints the config table's
  honest label (`Natural Titanium · Anchor Blue`) instead of id-derived words;
  boot still + caption follow `DEFAULT_CONFIG_ID`.
- `evals/swap-smoke.mjs` — id constants + caption assert refreshed
  (semantics identical; same class as prior lanes' harness id refreshes).
  All consumers (Colors rail, Parts card, Footer lineup + labels, cursor
  swatch) render from CONFIGS at runtime — zero further edits needed.

## 2 · Cycles masters (20 renders — 4 configs × §6 frames 1–5)

`research/lookdev/instrument/scripts/render_gallery_masters.py` (pattern
parent: `grade_and_render.py`, the P1.5 council evidence script — same
`ultra-3-draft.glb` import, same shipped `instrument.hdr` world, same §1.3
grade incl. Cycles-only mild case aniso). Cycles Metal GPU, **128 spp**,
OIDN, AgX MHC, `clip_start 0.001`. §6 optics per frame: hero 50 mm 3/4
(native portrait 1408×2624 master), crown macro 40 mm/sensor 16 f/3.2,
dial-faceon 35°-normal symmetric, side 105 mm (1280×960), back-crystal
35 mm inside the band loop f/5.6. Env vars for partial runs:
`ONLY_CONFIGS / ONLY_SHOTS / SPP / SCALE / OUT_DIR / DLC_BACK_ROT / TEST_ROT`.

**Film is transparent; grounds live in post** (`postprocess_gallery.py`) —
the task-sanctioned compositing route. One shared treatment for all 20:
authored ground per cell (ink field + porcelain wedge for hero, ink/porcelain
split at 0.685 h for face-on, dark gradients for the macros, porcelain accent
bar for back-crystal — geometry sampled off the accepted P2 stills so the
drop-in is seamless), wedge/split edges drawn at 3× and LANCZOS-downsampled
(**the render-01 stair-step class is dead by construction** — gate-4 wedge-AA
law), alpha-derived contact shadow onto light grounds, fine centered grain
(masks gradient banding), webp q80/method 6.

**DLC back-crystal recipe**: at rot 0 the DLC back murks to illegible on the
dark ground. A 4-point env-rotation sweep (40/90/140/200) picked **rot 40**
for `(dlc, shot 5)` — engraving legible, sensor-dome structure back. This is
the §1.3 DLC law applied ("steal the lighting": one env-rotation move), kept
as `DLC_BACK_ROT=40` in the script.

Masters live in `research/lookdev/instrument/gallery-masters/` (PNG+alpha);
shipped webp → `public/assets/gallery/${id}_{1..5}.webp`.

## 3 · Weight (P4 asset-weight lever respected)

New per-set 168–222 KB ≈ the old TEMP natural set (229 KB); gallery dir total
**812 KB for 4 fully-real sets** (was ~840 KB for 1 real + 3 fake). First-load
cost unchanged; the interim 2D-recolored sets (visibly softer in cells 02/05,
gate-4 flag) are **deleted** — every gallery pixel is now a per-config Cycles
render. Single master serves both breakpoints via the existing CSS cover-crop
contract (min-width:1024 art direction preserved — swap-smoke asserts it;
mobile composition attested in `m-images-50-*.png`).

## 4 · Verification detail

- swap-smoke 26/26: boot state `natural-anchor-blue`, 5-param 1 s tween,
  dual+triple placement, gallery 5/5 re-src to `black-dlc-black` with caption
  `Black Titanium · Black`, outro 4-up + SELECT/SWAP/restart loop, cursor
  labels/icons, zero console errors (eval + live pages).
- Captures: `d-images-50-<cfg>` ×4 (live-swapped real sets),
  `d-footer-75/100-<cfg>` ×4 (the 4-up: blue/natural · black/DLC ·
  green/natural · blue/DLC — four honestly distinct clones with real-name
  labels; per-clone skins pull the new x_colorway tables),
  `m-images-50-*` ×2 (mobile sheet whole).

## 5 · Deviations / flags (honest)

1. **LOOKBIBLE §1.3/§2 ocean anchor `#1f6153` superseded** by the founder's
   real-colors decision (Apple sells no green-teal Ocean band). instrument.json
   + colorway.ts carry the new truth; LOOKBIBLE text itself untouched
   (amendments need council) — **P5 co-sign flag**.
2. **§6 frame 4 is named `side-14mm` but Ultra 3 depth is 12 mm** (14.4 was
   the Ultra 2 lineage). The Images cell label ships as `SIDE-12MM`
   (spec-truth fix, images.ts); the LOOKBIBLE frame NAME + asset index are
   unchanged — **P5 naming co-sign flag**.
3. §6 frames 6–8 (`dlc-warm-rim`, `nocturne-aod`, `band-ocean-macro`) are not
   Images cells and were not re-rendered this lane; the P1.5 evidence renders
   stand. If a future surface consumes them, `render_gallery_masters.py`
   already carries the rig (add three SHOT entries).
4. **`evals/reference/ours` colorway frames still show the old Tide/Graphite/
   Ember/Midnight world** — the next integrate pass must refresh the
   reference set (same handoff class as the explode lane's).
5. The masters keep the GLB's baked Apple Wayfinder dial as the screen
   emissive (grade_and_render pattern; the accepted P2/P3 stills used it too).
   Baking the SITE's own dial art into the render screen is a possible future
   polish — flagged, not owed.
6. Pre-existing, not this lane: fixed vital chip overlaps gallery cell 5 on
   the 390×844 sheet (the P3 gate's one-owner chip-collision debt).

## Pitfalls found this lane (inherit)

1. **DLC × dark ground needs its own light move** — a config axis that
   recolors materials can silently kill a shot's legibility contract
   (engraving law); sweep env rotation per finish-class, don't re-expose.
2. **Grain is a byte multiplier in webp** — strength 5 grain tripled file
   size vs strength 2.5 at indistinguishable 1× viewing; tune grain against
   the compressor, not the master.
3. Blender `sensor_fit` defaults to AUTO (fits the LARGER dimension) — for
   portrait masters set `VERTICAL` explicitly or margin math silently changes
   meaning.
4. The old stills' stage geometry (wedge intercepts, split heights, bar
   bounds) is recoverable by scanning the shipped webps for luma transitions
   — sample the accepted art, don't eyeball reconstruction.
