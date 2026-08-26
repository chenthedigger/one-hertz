# P2 lane notes — integrate + deploy (gate-tune absorption, full-page pass, prod)

Status: **DONE, all gates green, deployed** · 2026-08-26 · lane: P2 integrate+deploy
Law followed: `docs/LOOKBIBLE.md` + `docs/p15/motion-bible.md` · contracts `docs/p1/engine.md`,
`docs/p15/plumbing.md`, `docs/p2/infra-gl.md`, `docs/p2/infra-type.md` untouched ·
`sections/index.ts` untouched (no registrations owned by this lane).

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean ·
**engine-smoke ALL PASS** against :4573 AND against prod · **dial-smoke ALL PASS** ·
**cursor-smoke ALL PASS** (`BASE=http://localhost:4573`; the script's default port is 4574 —
inherit that flag) · `npm run eval:capture -- http://localhost:4573 --viewport both` →
**150 canonical frames + 6 interaction frames** refreshed in `evals/reference/ours/` (manifest
updated); 4 interaction frames still capability-SKIPPED (explode-open, colorway — P3 mechanics
not yet exposed in state, expected) · dist token-leak scan **clean** (zero hits for `FS 60P`,
`Nekst`, `fps-` anywhere in dist — nothing even needed the credits/README exemption).

## Deploy

- `npx wrangler deploy` from repo root → **https://one-hertz.ubonranto.workers.dev** · HTTP 200
- **Version ID `5c1c1554-1e35-4184-9f1b-48cee6e7ed66`** · 34 assets uploaded (includes the two
  re-exported internals GLBs below)
- Engine smoke re-run against the live URL: ALL PASS.

## Gate inputs

`docs/p2/gate-2.json` was the only gate file present (wave-2: Intro/Timeless/VerticalText/
Movement). No `gate-3.json`/`gate-4.json` existed; per the lane brief the wave-3/4 tune load
was extracted from the section docs' own pitfalls/handoffs + live capture judgment — every
wave-3/4 open item audits as **P3/P4 scope** (SWAP mechanic, copy pass, formal sweep harness,
mobile device pass), no unabsorbed section-level TUNE items found. Gate-2's four tunes and its
actionable scope-concern were all still unabsorbed; all applied below and judged on
re-captured frames.

## Tunes applied (each verified on a re-captured rendered frame)

1. **Dial hot-glow (gate-2 Intro tune 1)** — `src/gl/screen.ts` `SCREEN_EMISSIVE_INTENSITY`
   **2.8 → 2.1**. *Interpretation flag, honest*: the gate named `src/dial/spec.ts`
   GLASS.sheen/bloom "+ hand/subdial glow constants", but spec.ts has no such glow constants
   and the GLASS sprite alphas (0.055/0.07) are near-invisible at 1x (LOOKBIBLE §5's own
   note) — they are not the blob source. The blobs were post-bloom energy: white dial pixels
   at 2.8 emissive = 1.66 luminance over the bloom threshold (1.0, law-fixed). 2.1 cuts the
   over-threshold energy ~45% while ACES keeps the display luminous (≈0.87 out). The knob is
   the declared screen-contract constant and stays inside its documented 2–4 band; dial paint
   code untouched, bloomThreshold/Strength laws untouched. Verified: `Intro_0` — hands read
   as batons with a tight halo, HEART RATE "64" legible inside its ring; Nocturne continuum
   and AOD beats still read (the .5/.75 dim frames are the section's designed AOD match-cut,
   not a regression — the old infra-gl evidence predates the section's AOD handoff).
2. **VT scrim seam (gate-2 VT tune 1)** — `verticaltext.css`: both `.vt__scrim--a/--b`
   gradients now hit alpha 0 at **78%** (mid-stop pulled to 45%). The 10° gradient tilt
   projects ≈19% of the axis onto the far edge, so the old `transparent 100%` stop clipped
   at the box edge = the x=768 hard seam. Verified gone at `VerticalText_0.5/0.75`.
3. **VT .5 dead beat (gate-2 VT tune 2)** — `verticaltext.ts`: act-B copy chain shifted
   0.04 earlier (scrim/block .48, eyebrow .50, headline chars .52, grey-lines base .58).
   Page-truth .5 now carries the spec block + eyebrow; headline complete by ≈.62. The
   named-stale evidence `docs/p2/VerticalText/full-verticaltext-050.png` was **replaced**
   from the new build (as the gate demanded); `docs/p2/Intro/full-intro-000.png` refreshed
   too (dial-glow change re-grades it).
4. **Movement die emissive (gate-2 Movement tune 1)** — `movement.ts` mid-beat glow peak
   **2.4 → 4.5**. Verified: visible glow step .25 (unlit die) → .5 (lit orange floorplan).
5. **SiP silver caps (gate-2 Movement tune 2)** — *root cause differed from the gate's
   hypothesis*: fresh Blender export proved the SiP GLB never had the linked-socket
   dropped-roughness defect (all factors present; `_flatten_linked_scalar` found nothing to
   flatten). The caps were simply polished grades (0.25/0.30) clipping under the instrument
   env. Fix: `build_sip.py` now satin-grades its two bright steels part-locally
   (`nickel_tab` 0.30→**0.42**, `steel_bare` 0.25→**0.38**; kit defaults untouched for other
   parts) → Blender headless re-export → `gltfpack -tc -kn` → rewired
   `public/assets/watch/internals/part_sip.glb`. Factors verified surviving the pack
   (`nickel_tab.001 rough=0.42`, `steel_bare.001 rough=0.38` — note the `.001` rename from
   the local override; nothing resolves these by name, checked). Verified: `Movement_0.75`
   caps read satin steel, no clipped white.
6. **Taptic re-export (tune-w1 open handoff, same Blender session as #5 per gate-2 scope
   concern 2)** — `build_taptic.py` re-run under the patched `export_glb`:
   `[glb] flatten steel_shell.Roughness -> 0.500` fired (ColorRamp mean; the authored band's
   center was 0.40 — 0.5 ships, reads bead-blasted, slightly matter than the §9 0.35–0.45
   band's center; flagged, judged acceptable on frames) → packed → rewired
   `public/assets/watch/internals/part_taptic.glb`. Verified: `Disassembly_0.5` — the Taptic
   reads grey bead-blasted steel in the fan, white-plastic read gone.
7. **Cursor label chip (gate-2 scope concern 5 / LOOKBIBLE §7.4)** — `cursor.css`:
   `.cursor__label` now a porcelain chip (literal `rgb(235 235 235 / 92%)` — deliberately NOT
   `var(--porcelain)`, which the keyframe driver rewrites to ink on dark beats and would
   invert the chip) matching the icon-chip treatment. Legible over porcelain, metal, and ink
   grounds. Deviation from §7.4's two-treatment scheme (halo on light / chip on dark): the
   chip ships on BOTH grounds — one treatment, zero section-awareness plumbing; flag if the
   P3 council wants the literal split.

Comment hygiene: stale `2.8` reference in `webgl/stage.ts` updated to name the constant.

## Honest rough edges for P3

- **Dial glow is a taste knob now, not a defect**: 2.1 keeps a visible (intended) luminous
  halo. If a council wants crisper still, next legal notch is 2.0 (band floor); below that
  the Nocturne "dial carries the frame" thesis starts paying.
- **Evidence refresh scope**: page-truth evidence (150 frames, both viewports) is fully
  refreshed from this one final build in `evals/reference/ours/`; the older per-section
  `docs/p2/<Section>/solo-*.png` frames from wave lanes were NOT re-shot (their capture
  scripts lived in per-lane scratchpads). Gate-2 scope concern 3's blanket re-capture is
  therefore satisfied for page truth only — solo evidence re-shoots ride the P3 verify pass.
- **Formal 9-point azimuth sweeps** at the non-hero keyframes remain un-run (each lane did
  visual reads; infra-gl's sweep harness is ready) — P3 verify duty, LOOKBIBLE §7.2.
- **Interaction frames**: explode-open + colorway eval frames still SKIP (P3 mechanics).
- **Credits slate**: dist currently contains zero source-token credits; the credits slate
  (Footer, ≤7 lines) is P4 copy — when it lands, the token scan exemption becomes relevant.
- **Taptic shell aniso/parting-line detail** (§9 tune 1's full wish list): the re-export
  ships the flattened 0.5 roughness + existing seams; the finer micro-variation pass was not
  re-authored here.
- Chunk-size warning (984 kB main JS) stands — code-split is a P5 perf-loop candidate, not
  attacked here.

## Pitfalls found this lane (inherit)

1. **The gate's named knob can be wrong while its diagnosis is right** — gate-2 pointed at
   spec.ts constants that don't exist (dial glow) and a defect class that wasn't there (SiP
   linked sockets). Verify the mechanism (parse the GLB JSON, compute the luminance) before
   editing where the gate points.
2. `cursor-smoke.mjs` defaults to :4574 — run with `BASE=http://localhost:4573` against the
   shared preview.
3. Local material overrides in a Blender build script (`lib.simple_mat` re-creation) export
   with `.001`-suffixed names — safe only while nothing resolves those materials by name;
   check `src/` before relying on it.
4. Blender headless + the patched `export_glb` is fast (~minutes incl. renders) — prefer a
   real re-export over surgical GLB JSON edits when the build script is the source of truth.
