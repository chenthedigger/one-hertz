# P2 lane notes — section-Mechanism ("Electrical Heart", the dark beat)

Status: **DONE, all gates green** · 2026-08-21 · lane: section-Mechanism
Law followed: `docs/LOOKBIBLE.md` (§1.5 #5 lighting keyframe · §1.6 back-crystal camera · §7 scrims · §8 copy budgets) + `docs/p15/motion-bible.md` (Particles-group grammar, ten laws) · contracts `docs/p1/engine.md` + `docs/p15/plumbing.md`.

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean · **engine-smoke ALL PASS** (headless real Chrome, playwright-core `channel:"chrome"`, vite preview :4573, includes the Mechanism-addressed settle + no-drift checks) · zero console errors on `?solo=Mechanism&eval=1` and `?eval=1` capture pages · dial seconds pinned 30 and `--porcelain` lands exactly `#101216` at Mechanism 0.5 in BOTH solo and full page.

**Design-gate evidence** → `docs/p2/Mechanism/`: `solo-25.png` · `solo-50.png` · `solo-75.png` (1600×900@2, `?solo=Mechanism&eval=1`, gotoSection .25/.5/.75) · `full-mechanism-050.png` (full page `?eval=1`, gotoSection Mechanism 0.5 — the page-truth frame).

## What was built

`src/sections/mechanism.ts` + `src/sections/mechanism.css` (scoped, imported by the module — zero style.css contention) replace the Mechanism placeholder (registered in `sections/index.ts`). DOM is self-rendered into the track's `.pin` (index.html untouched).

Source grammar → ONE HERTZ translation (Mechanism_* reference frames):

| Source (MECHANICAL HEART) | Ours |
|---|---|
| movement disc center-right on black | Ultra 3 **back-crystal macro** inside the band loop — engraved `WATCH ULTRA · 49MM TITANIUM & CERAMIC CASE · DIVE-40M · WR-100M` ring legible, crown knurl glints |
| particle trails drawn by scroll | **ECG trace** (SVG, `--biosignal` #FF2D55) + two porcelain echo strands, dash-drawn linearly over the FULL window; deterministic (authored path constants, no RNG) |
| ghost/solid split title | `ELECTRICAL` (ghost 31%) / `HEART` (porcelain, 0.4em stagger indent) — split-char scrub:true reveal, x:-110%→0 power3.out + linear opacity |
| grey label/value rail | SAMPLING / `continuous · 1 Hz` + body ≤220c + CASE / `49 mm` — scrub:2 grey-line reveals `#BCBCBC→#FFFFFF` (2 s catch-up lag live, instant under `?eval=1` per the dial-gear dt≤0 precedent) |
| giant `25'` seconds bottom-right | giant `30′` Geist Mono 300 tnum, **geared to the dial's second hand** via `readStateExtension("dial").seconds` (motion bible §5: dial gear, never UPDATE_ROTATIONS); ghost→full tone reveal |

Copy is working copy inside §8 budgets (eyebrow 14c · title 10/5c · body 77c) — P4 polishes wording.

State contract (truthful): `requiredEnterState {explode:"assembled"}` · `guaranteedExitState {}` (pose override blends fully out by p=1; no state axis written). Longpress zoom = default 1.35 (law 8 table). Cursor: `data-cursor-text="holdToExplore"`.

Lighting: entirely the infra-gl keyframe driver's (`instrument.json` Mechanism key: rot 110 · envInt 1.05 · bgStage #101216). This lane invented no lighting; scrims ride the live `--porcelain` ground token (§7.1), which the driver rewrites to the bgStage ink.

## Camera architecture (new, additive — other section lanes can reuse)

1. **`CameraRig.setPoseOverride(CameraPoseOverride)`** (`webgl/cameraRig.ts`): a section-computed pose blended over the base timeline (`blend` 0→1→0 inside the section's scrub window; shortest-path angular lerp; longpress dolly + parallax apply on top; `parallaxScale` gates parallax off during the macro — law 7). Composes with `authorTimeline` — it does not steal the rig. No internal lerp ⇒ eval settling stays a fixed point.
2. **`stage.productAttitude(clock)`** (exported): the ONE formula for the hero's idle pose. **Motion-law parity fix**: live idle rotation now derives from the clock scalar exactly like eval (the old live `+= dt` accumulation violated motion-bible law 9 — wall time banned). The longpress "rotations accelerate" visual survives as a decaying additive offset in the interaction-intensity domain (`holdSpin`), so composition-critical beats stay predictable at rest. Live == eval attitude everywhere (LOOKBIBLE §1.4 live-parity theme).
3. The Mechanism recipe **chases** `productAttitude(getClock())`: back normal = product-rotated `-caseSpace.zAxis`; aim = product-rotated case-back center (`caseSpace.origin - zAxis·0.35`); camera = aim + spherical(standoff, chased θφ + recipe offsets), frame-lateral shift via look-at target. Settle-safe (settleSync's double pass converges the clock), verified by the smoke's no-drift check.
4. **`readStateExtension(key)`** (`core/debug.ts`, additive): read ONE registered state() extension per frame without building a full snapshot.

WebGL beats (scrub-fraction domain, padded to 1, all power3.inOut): blend-in sweep past the crown through the loop opening `.0–.15` (+parallax off) · settling orbit onto the ring macro `.15–.35` (standoff→0.92) · light-crawl drift `.55–.75` · ease-off `.75–.9` (standoff→1.06) · blend-out `.9–1`.

## Pitfalls found this lane (downstream must inherit)

1. **Band-loop cavity law (measured):** the strap inner wall sits ~**1.15 world units** from the case-back center along the back normal. Any parked back-shot camera must sit at standoff **≤ ~1.08** or the strap swallows the frame ("outside it shoots strap" — LOOKBIBLE §1.6 — is true from BOTH sides of the wall). Enter through the crown-side loop opening (thetaOff ≈ 1.15 rad), never through the strap.
2. **Never set `position` on a `.pin` content class** — `.pin` is `position:sticky`; a later-in-cascade `position:relative` silently kills the pin (bit this lane: all DOM rendered 1350px above the viewport). The sticky box is already the containing block for absolute children.
3. Solo-sandbox lighting ≠ page lighting for yaw-chasing cameras: solo clock spans 0..1 across ONE section (product turns a full revolution), while on the page Mechanism spans clock ≈ .21–.31 — and the env-rotation keyframes nearly track the product yaw there, holding the relative light almost constant through the beat. Judge lighting on the full-page frame; solo frames are a 3-pose turntable (still legible at every azimuth — §7.2 spirit; 9-point solo sweep frames reviewed at 0.5 during this lane).
4. `gsap.ticker`-driven catch-up lags (scrub:2 grammar) must be disabled under `?eval=1` and targets applied directly in tickDom — the settle passes run with dt=0.

## Open handoffs

- Movement (next section) inherits the camera at the base-rig pose (blend is 0 by p=1) with the watch at clock-yaw — no special state required.
- If a future lane needs the sensor-dome lit (the back lens reads as a deep ink disc under the shipped env — deliberate here, echoes the source's black stage), that is a keyframe-azimuth question for the §1.4-fix-5 sweep, constrained to the 70–140° corridor by the monotonic 360° revolution law.
- The `holdSpin` decay constant (0.8/s) is a feel knob nobody has judged on-device yet; P3's longpress pass should look at it once the rotor mechanic exists.
