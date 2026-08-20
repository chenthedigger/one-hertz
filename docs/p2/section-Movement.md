# P2 lane notes — section-Movement (word-stack #2 over the S-SiP, the light beat)

Status: **DONE, all gates green** · 2026-08-21 · lane: section-Movement
Law followed: `docs/LOOKBIBLE.md` (§1.5 #6 lighting keyframe · §7 scrims/reveal colors · §8 copy budgets) + `docs/p15/motion-bible.md` (Presentation-group 0–.25 grammar, ten laws) · contracts `docs/p1/engine.md` + `docs/p15/plumbing.md` + `docs/p2/infra-gl.md` (keyframe driver, setPoseOverride) + `docs/p2/infra-type.md` (type tokens).

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean · **engine-smoke ALL PASS** (headless real Chrome, playwright-core `channel:"chrome"`, vite preview :4573; state schema now lists the additive `movement` extension) · zero console errors on `?solo=Movement&eval=1&look=instrument` and the full-page `?eval=1&look=instrument` capture pages · `--porcelain` lands exactly `#e8eaed` at Movement 0.5 in BOTH solo and full page (the Movement key has no bgStage — porcelain center by design) · state truthful at all three captures: `{sipReady:true, sipLoaded:true, blend:1}`, spin distinct per frame (135°/270°/405°).

**Design-gate evidence** → `docs/p2/Movement/`: `solo-25.png` · `solo-50.png` · `solo-75.png` (1600×900@2, `?solo=Movement&eval=1&look=instrument`, gotoSection .25/.5/.75) · `contextual-50.png` (full page `?eval=1&look=instrument`, gotoSection Movement 0.5 — the page-truth frame). The red hairline at the very top of every frame is the site-wide P1 clock hairline (`body::after` scaleX(--clock)) — global chrome, not this section's.

## What was built

`src/sections/movement.ts` + `src/sections/movement.css` (scoped, imported by the module) replace the Movement placeholder (registered in `sections/index.ts` — my two lines only; concurrent lanes' registrations untouched). DOM self-rendered into the track's `.pin` (index.html untouched). One additive edit in `core/debug.ts`: `MovementStateSnapshot` + the `movement` key in `StateExtensions` (Disassembly's precedent; schema stays v1).

Source grammar → ONE HERTZ translation (Movement_* reference frames):

| Source (THE / HIGHLY / PRECISE / AUTOMATIC / MOVEMENT) | Ours |
|---|---|
| giant 5-line ragged word stack riding the scroll past the watch | **THE / ⧸ HIGHLY / ATTENTIVE / SILICON / MOVEMENT** (word-stack #2, PLAN §2 brief) — Clash Display 300 colossal, source-echo ragged indents incl. the slash line, linear scrubbed traversal +55vh→−76vh |
| the automatic movement centered behind the type | the **in-house S-SiP** (`part_sip` GLB, research/internals-models → shipped `/assets/watch/internals/part_sip.glb`) on an invisible turntable — the semantic swap: this watch's movement IS silicon. Die floorplan emissive ramps 1→2.4 mid-beat ("highly attentive"), gold pad ring catches the streak light |
| per-line grey reveals as lines cross | scrub:2 grey-line grammar, **light-ground colors #BCBCBC→#323232** (§7.3), per-line windows on the alternating 15/25 half-width pattern; 2 s catch-up lag live, instant under `?eval=1` (Mechanism dt≤0 precedent) |
| right label blocks (Self-Winding Movement / Reliability) | **NEURAL ENGINE** / `Neural Engine, on a wrist.` · **RELIABILITY** / `Swimproof. Crash and fall detection.` — mono caps labels 55% ink, bodies on the reveal grammar, blocks arrive power3.out |

Copy inside §8 budgets (stack 5 words, ≤34c/line · eyebrow `06 · MOVEMENT` 13c · labels 13c/11c · bodies 26c/36c) — P4 polishes wording.

State contract (truthful): `requiredEnterState {explode:"assembled"}` (the base-rig pose frames the hero at both blend edges) · `guaranteedExitState {}` — the pose override blends fully out by p=1, the SiP is hidden on leave, no state axis written. Longpress zoom = default 1.35 (law 8 table; the hold dives into the SiP macro). Cursor: `data-cursor-text="holdToExplore"`.

Lighting: entirely the infra-gl keyframe driver's (instrument.json Movement key: rot 140 · envInt 0.95 · no bgStage ⇒ porcelain at center; the dark→light ramp out of Mechanism's #101216 is the driver's continuum — the motion-bible "hands back to light" beat, zero lighting invented here). Scrims ride the live `--porcelain` token (§7.1): left gradient 50→0 behind the stack, right gradient 62→0 behind the label rail.

## Timelines (domains declared, law 4)

- **DOM** (scrub-fraction, paused GSAP padded to 1): stack traversal linear over the FULL window (scrubbed position stays ease-free) · split-char line entrances at [.02,.08,.22,.38,.54] — x:-110%→0 power3.out + linear opacity over the first half (§3 scrub:true grammar) · eyebrow .04, label blocks .3/.44 power3.out. Imperative in tickDom: 7 grey-line reveals (5 stack lines centered [.14,.22,.36,.52,.68] half-widths alternating .06/.10 + 2 bodies [.32,.48]/[.46,.62]), lag k=2.2 live-only on the gsap ticker.
- **WebGL** (scrub-fraction, paused GSAP padded to 1, power3.inOut): blend-in + parallax off .0–.15 (macro law 7) · **the one big move** .15–.5 dolly 2.4→1.55 landing frame-center (lat .22→.06), glow 1→2.4 from .3 · orbit drift .5–.75 (θ .55→1.3, φ .95→.84 — the light crawls the pad ring) · ease-off .75–.9 (standoff→2.1, ≈0.6× the opener, law 3 shape) · blend-out .9–1 → base rig owns the handoff to Curves. Turntable spin = `clock·1.6π + progress·1.4π` — pure function of {clock scalar, progress}, wall time banned (law 9); eval settle is a fixed point (no internal lerp anywhere).

## Featured-object plumbing (reusable pattern)

- Own tiny loader (GLTFLoader + KTX2Loader `BASIS_TRANSCODER_PATH` + MeshoptDecoder — the hero stack) for JUST `part_sip.glb`; internals-roster normalization (pre-rotate plate→+z, scale to 0.58 world units, center) then flattened plate-up under `anchor(pos) → spin(rotY) → flat(rotX −π/2)`; added to `stage.scene` (NOT `stage.product` — the SiP must not inherit the hero's clock attitude), anchored at (0.4, −7, 0) so the macro never photobombs the watch. envMapIntensity 0.95 (small parts must not out-spec the hero titanium — internals-tune law). Emissive-bearing materials collected once at load (safe: `applyLook` only retargets `watch.materials`).
- Resilience: load starts at construction, never a loader task (first paint waits on the hero only); on failure the camera override stays inert (`sipLoaded` gates blend application — the base rig keeps the watch framed) and the DOM beat still owns the section. `state().movement = {sipReady, sipLoaded, blend, spinDeg}` — eval captures wait on `sipReady`.

## Pitfalls found this lane (downstream must inherit)

1. **§7.3's light-ground reveal color is a single value (#323232)** — interpreted as the TO color with the shared #BCBCBC as FROM (the symmetric read of the dark pair; a #323232→ink reveal would be invisible). Verified legible on porcelain at every keyframe azimuth this beat sees. If a council reads it otherwise, the constants are two lines (`REVEAL_FROM/TO`).
2. **Downscaled review of thin 300-weight colossal type lies about color** — at gallery zoom the revealed #323232 reads mid-grey and mimics a stuck reveal. Judge reveal colors on a 1:1 crop or probe `style.color`, not on the thumbnail.
3. A scene-level featured object wants `stage.scene`, not `stage.product` — product children inherit `productAttitude` rotation AND the idle clock spin; a turntable there wobbles.
4. The site-wide clock hairline (`body::after`, biosignal red, scaleX(--clock)) appears in every capture's top edge — do not chase it as a section defect (bit this lane an hour).

## Open handoffs

- Curves enters with the camera back at the base-rig pose (blend 0 by p=1) and the watch at clock-yaw — same seam Mechanism hands to us; its `.25` sweep-right beat starts clean.
- The SiP stays in the scene graph (hidden) outside the section; if a future memory pass wants it disposed on distant scroll, the anchor group is the single detach point.
- Per-section 9-point azimuth sweep at rot 140 (§7.2 full scope): reviewed at the three capture poses this lane (dial not in frame during the macro — the constraint is SiP legibility, which holds); the harness (`docs/p2/infra-gl.md` sweep mode) is ready if a council wants the full grid.
- P3 longpress: spin could subscribe to `UPDATE_ROTATIONS {speed}` for the hold-accelerates-rotations parity (source Movement rides the global rotor). Not wired — the brief's beat is scroll-owned; one listener if P3 wants it.
