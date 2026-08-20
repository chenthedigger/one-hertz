# P1.5 — MOTION BIBLE (LAW for P2/P3)

Status: **DONE — extracted, not invented** · 2026-08-20 · lane: motion bible (writing lane, zero src edits)
Sources: minified app chunk `the-watch.D6O26wKS.js` (200,648 B) + `bundle.js` + shipped CSS (scratchpad `watchrecon/`), frozen reference kit `evals/reference/source/` (frame grid + interaction clips + sections.json), our shipped P1 code (`src/core/constants.ts`, `src/ui/cursor/longpress.ts`, `src/dial/gear.ts` via docs/p1/*.md).
Every number below was grepped or read out of those artifacts. Where the shipped source contradicts the recon folklore, the source wins and the contradiction is flagged. **P2 builds against this file; P3 verifies against it; nobody invents timings.**

Verification method: all ease/duration counts are `grep -o | sort | uniq -c` over the chunk; all quoted expressions are verbatim minified source; camera grammar cross-checked against 9 stills from the frozen desktop frame grid (`desktop/<Section>_<p>.png`).

---

## 1 · Ease census (exact counts, the-watch chunk)

| Ease | Count | Where it is used (attributed by context extraction) |
|---|---|---|
| `power3.inOut` | **98** (97 × `ease:"…"` + 1 × longpress class default param) | THE default. All WebGL scrub beats (camera radius, watch rotation/position, part explode z-slides, screw unscrew, AO/shadow fades, laser/overlay uniform fades), colorway material timeline default (`defaults:{duration:s,ease:"power3.inOut"}`), explode click-zoom in/out, XPLOD_ALL, longpress ramp, scrub:2 color reveals, CSS-var color swaps |
| `power3.out` | 13 | **Exits/arrivals of things entering frame**: intro title chars `x:"-100%"→0`, standalone scrub:true text slides, `--bar-scale` reveals, image-grid `y:300` rise (stagger .1), colorway transition text IN (`y:"200%"→0`, stagger .07), loader→watch entrance (`position.z from 10, dur 2` + `rotation from (−.3π,.45π), dur 2`), watch rotation settle in Colors (`dur .15 @.15`), screw/glass micro-settles (.2/.25), AO restore (.13) |
| `power2.in` | 10 | **Exit-accelerations (things leaving)**: colorway transition text OUT (`y:"-300%"`, stagger .04), Straps fling-out block (×6 spread, 6 tweens `dur ht=.3 @lt=.6`), Straps `hoverIntensity` ramps, particles camera push-in (`z:.1 dur .4`) |
| `power2.out` | 8 | **Arrive-and-settle**: Straps links converge block (6 tweens `dur ct=.4 @at=0`), env-light sweep start (`euler x→−.15π dur .05`), screw z-settle |
| `power3.in` | 5 | Departures that build speed: VerticalText background letters `x:±60vw` (dur `tlD·.5 + n·tlD·.03`), Disassembly strap drop (`z:−.2 dur .5`), glass lift (`z:.15 dur .45`), dialXplod nudge (.2) |
| `power4.out` | 5 | **Hero entrances**: outro 4-watch rise (`from y:−3.5 desktop / −7 mobile, duration .7+i·.1`, all at t=0 — stagger via duration, not offset), cursor `quickTo` x AND y (`duration 1.3`), colorway overlay sweep phase 1 (`y:0→−200vh dur 1`), catalog title chars (`y:"50%"→0`, px-domain, stagger `tlD·.005`) |
| `power2.inOut` | 4 | Environment-light rotations only (`globalEnvmapEuler.x` tweens, dur .1–.2) — light moves gently, never snaps |
| `power1.inOut` | 4 | Near-linear uniform fades: overlayPlane/disassemblyOverlay `uProgress`/`uOpacity` (dur .15–.45), intro first rotation nudge (`y→.2π x→−.15π dur .1`) |
| `linear` | 4 | Scrubbed opacities (text char opacity under scrub:true, particles `uProgress` 0→1 over full section), explode hover-label wrapper opacity |
| `none` | 3 | Loader bar fade (`#loader div` opacity, dur .4), colorway config-text opacity crossfade (.5/.5) |
| `power4.in` | 2 | Aggressive exits: catalog title chars OUT (`y:"-50%"`, stagger from:"end"), colorway overlay sweep phase 2 (`y:→−400vh`) |
| `sine.out` | 1 | `?autoscroll` velocity ramp (additive px 0→20/frame over 4 s, delay 2.5 s) |
| `power1.in` | 1 | Loader panel fade-out (`#loader` opacity 0, display none, dur 1.2) |

GSAP global default in bundle: `.defaults({ease:"none",duration:.5})` — irrelevant in practice; every authored tween sets its ease or inherits a timeline default.

**CSS transitions (shipped stylesheets):**

| Bezier | Count | Use |
|---|---|---|
| `cubic-bezier(.215,.61,.355,1)` (= easeOutCubic) | 4 | colorway picker `circle-svg` transform 1 s; `stroke-dasharray`/`stroke-dashoffset` **3 s** ring draw; config-label transform 1 s |
| `cubic-bezier(.645,.045,.355,1)` (= easeInOutCubic) | 1 | config-label color 1 s (paired with transform easeOutCubic + opacity 1 s linear in one rule) |

**Law:** default `power3.inOut`; exits `power3.out` when the element ARRIVES from off-frame, `power2.in`/`power4.in` when it LEAVES; entrances of hero objects `power4.out`; light `power2.inOut`; scrubbed opacity `linear`. Our `EASE` constant (`src/core/constants.ts:88`) already encodes the first three — extend it at look-lock with `heroEnter: "power4.out"` and `lightSweep: "power2.inOut"` rather than scattering strings.

---

## 2 · Duration scale — THREE unit domains, never confuse them

The source runs timelines in three unit domains. Misreading this is the #1 way to ship wrong feel:

1. **WebGL scrub domain — progress fractions.** Every `data-webgl` group's timeline is padded to duration **1** (`e.call(()=>{},null,1)`), so `duration:.2` = 20 % of that group's scroll window. Observed beat sizes cluster at **.05 / .1 / .15 / .2 / .25** (fine beats), **.4 / .5** (half-window moves), **.75** (long explodes). Chunk-wide `duration:` counts (both domains; the sub-1 values live overwhelmingly in scrub timelines): `.1`×19 · `.2`×29 · `.15`×9 · `.25`×9 · `.5`×11 · `.75`×4 · `.4`×5 · `.05`×4.
2. **DOM scrub domain — pixels.** DOM component timelines use `duration: window.innerHeight` or fractions of `tlD = el.offsetHeight + viewport.height`. Observed: `tlD·.2/.25/.3/.35/.5/.6/.65`, staggers `tlD·.005`–`.05`, `innerHeight·.5` offsets.
3. **Wall-clock domain — seconds.** Event-driven timelines only (interactions, loader, colorway, outro). This is where PLAN §3's "0.4/0.8/1.2/2.0" lives. Observed wall-clock durations, clustered:

| Class | Observed values | Uses |
|---|---|---|
| **0.4 s** | .3, .4, .5 | Straps converge (.4) / fling (.3), loader bar fade (.4), config text crossfade (.5), cursor layer transitions (ours, .4) |
| **0.8 s** | .7–1.0 | Details hover label + overlay uniforms (.8), outro first watch rise (.7, +.1/instance), explode label fades (1, linear), colorway transition overlay/text (1) |
| **1.2 s** | 1.2, 1.3, 1.5 | loader panel out (1.2), intro title chars (1.2, stagger .12), CSS-var color swap (1.2), cursor quickTo (1.3), word-stack fade (1.5, stagger .4) |
| **2.0 s** | 1.6, 2 | explode click-zoom IN (2) / OUT (**1.6** — closes at 0.8× open), XPLOD_ALL on (2) / off (1), longpress ramp (2), intro watch entrance (2), colorway material tween = payload duration (picker sends **1**, outro restart sends **0**) |
| out-of-scale | 3, 4 | CSS picker-ring draw (3 s), autoscroll ramp (4 s), Lenis duration (4 s) |

**Law:** wall-clock tween durations must land on {0.4, 0.8, 1.2, 2.0} ±25 %; a closing/reversing tween may run 0.5–0.8× its opener (source: 2→1.6, 2→1, 1→.5). Anything ≥3 s is reserved for ambient/system motion (ring draw, autoscroll, Lenis).

---

## 3 · Scroll transport & scrub-lerp findings (source of truth for feel parity)

- **Lenis:** `new Lenis({duration: 4})` — everything else default: easing `t => Math.min(1, 1.001 − 2^(−10t))` (expo-out), `lerp` mode disabled when duration is set, `syncTouchLerp:.075` / `touchInertiaMultiplier:35` defaults untouched. **The 4 s expo-out glide IS the site's entire smoothing personality.**
- **THE dead-lerp finding.** The section base has a per-frame scrub smoother — and then kills it:
  ```js
  isNaN(this.progressWebgl)||(this.lerpedProgressWebgl-=(this.lerpedProgressWebgl-this.progressWebgl)*.1),
  this.lerpedProgressWebgl=this.progressWebgl,          // ← overwrites the lerp, every frame
  this.timeline.progress(this.lerpedProgressWebgl)
  ```
  The `0.1/frame` factor is **vestigial dead code**: the shipped site scrubs WebGL timelines with RAW mapped progress, single-smoothed by Lenis. This independently confirms our PLAN §3 "ONE smoothing owner" decision record — the source authors converged on the same answer and left the scaffolding in.
- **Offsets ship as zeros.** `startOffset`/`endOffset` exist (`webglStart = start + vh·startOffset`) but no section assigns a non-zero value anywhere in the chunk. The recon's "offset-extended bounds" is real machinery, unused in production. Our engine keeps the mechanism (Disassembly −0.25/+0.25 is OUR authored choice, sanctioned; see §7).
- **Bounds formulas (base class `resize()`):** `start = rect.top + scrollY − vh` · `end = rect.top + scrollY + height`. So every scrub window opens **one viewport before the section's top edge** and closes at its bottom edge. First section: mapping start clamps `+vh` (begins at scroll 0). Last section: mapping end clamps `−vh`.
- **The overlap chaining rule (verbatim):**
  ```js
  let s=0; domSections.forEach(n=>{ e.add(n.component.setupTimeline(), s);
    n.component.isFirstSection || (s += tl.duration() - g.tools.viewport.height) })
  ```
  DOM sub-timelines are pixel-domain (`tlD = offsetHeight + vh`, padded via `t.add(()=>{}, tlD)`); consecutive components inside one webgl group **overlap by exactly one viewport height** — the outgoing text exits during the same viewport of scroll in which the incoming text enters. This is the transition-zone law: **hand-offs cost 100 vh and are always shared, never sequential.**
- **Two scrub speeds (standalone text ScrollTriggers):**
  - `scrub: true` ×4 — transform reveals, immediate: char slides `x:"-100%"→0 power3.out` + opacity `linear` over the first half, `--bar-scale` `power3.out`, image rise `y:300, stagger .1, power3.out`. Windows: `start:"start 90%" end:"bottom 50%"` (or `"start bottom"→"bottom 50%"`).
  - `scrub: 2` ×3 — grey-line color reveals with **2 s catch-up lag** (the ONLY sanctioned second smoothing in the site, text color only): `from color grey → to color, power3.inOut`, per-line trigger windows `start:"-100% ${50+o}%" end:"100% ${50−o}%"` with `o` alternating **15/25** per line (arrays `[15,25,15,25,…]`, greys `#BCBCBC/#FFFFFF` on dark, `#323232` on light).
- **Autoscroll (`?autoscroll`):** additive `window.scrollTo(0, scrollY + px)` per rAF, `px` tweened 0→**20** (or `?autoscrollspeed=`) over **4 s sine.out after a 2.5 s delay**. At 60 fps ≈ 1200 px/s ≈ 29 s full page. OUR eval transport instead targets ~60 s full page (`AUTOSCROLL_DEFAULT_DURATION_S`) — deliberate: capture pace, not source pace.

---

## 4 · Camera grammar (per webgl group — from the chunk, verified on the frozen frame grid)

**The camera model** (verbatim, one spherical orbit rig):

```js
position = dragOffset·dragIntensity
         + spherical(radius·radiusMultiplier, phi+animationPhi, theta+animationTheta)
position.z -= longpress.intensity · 3 · parallaxIntensitySum · longpressZoomMultiplier
mouse.target = pointer · (1 + longpress.intensity·…)      // parallax amplified under hold
```

Grammar vocabulary that actually occurs: **dolly** = `camera.radius` tween (10↔6↔4) or `watch.position.z` tween; **orbit** = `watch.rotation` tween (the OBJECT turns, the camera almost never orbits itself); **light-sweep** = `globalEnvmapEuler.x` tween (power2.inOut/out — relighting as a camera-grade move); **stage-dim** = post `uBackgroundMultiplier` 1↔.3; **parallax gating** = `parallaxIntensityMultiplier` 0/1 per beat. There is NO real rack-focus in the source (no DOF) — ours (PLAN §3 post stack) is an authored addition, macro sections only.

Beat tables (t = fraction of the group's scrub window; all `power3.inOut` unless noted):

**Track↔group mapping (still-frame + copy-bundle verified):** the 9 `data-webgl` wrappers cover the 14 tracks as — Intro group = Intro + Timeless + **VerticalText** (3 DOM comps in its wrapper) · Disassembly = Disassembly · Particles = **Mechanism** (the dark beat: `Mechanism_0.5.png` is the "MECHANICAL HEART" copy block, `h` in the copy bundle) · Presentation = Movement + Curves + MovementWatchRight + Hands (4 tracks ≈ the .25 beat grid; alignment ±.1 because bounds come from the wrapper rect, so the frozen frame grid — not arithmetic — is the per-track truth for P2 verify) · Straps/Images/Colors/Parts/Footer = 1:1. Note for P3: the HOVER_POSITION 3-label mechanic (recon "Details") lives in **VerticalText** — light stage, frontal watch, hover dots (verified `VerticalText_0.5.png`); the drag+click explode lives in Disassembly.

**Intro group** (Intro + Timeless + VerticalText; watch enters from loader at wall-clock `z:10→, (−.3π,.45π)→0` 2 s power3.out):

| t | Move |
|---|---|
| 0–.1 | rotation nudge `y→.2π x→−.15π` (power1.inOut) — hero settles off-axis |
| .1–.5 | **full spin** `y→2π, x→0` — the Timeless edge-on pass (verified: `Timeless_0.5.png` shows the watch at 90°, type occluding through the bracelet ring) |
| .5–1 | `y→1.55π` — settle toward frontal for VerticalText's hover beat (giant background letters slide `x:±60vw, power3.in, dur tlD·.5+n·tlD·.03` in the DOM channel) |
| .75–.9 | `rotorRotationMultiplier→0` — mechanism spin-down before the explode |

**Particles group** (Mechanism — the dark beat): stage-dim `uBackgroundMultiplier→.3 @0 (dur .1)` and back `→1 @.9`; particle trails `uOpacity→1 dur .1`, `uProgress 0→1 linear over the FULL window` (the drawing-with-scroll signature); watch turns to its movement side `y→1.9π (dur .15 @0)`, `x→−.2π (dur .3 @0)`; light-sweep `euler.x→.5π @0 (dur .2) → .7π @.35 (dur .1)` (power2.inOut); mobile-only x-shunt `.25→0`; the two-digit seconds readout subscribes to UPDATE_ROTATIONS on `enter()` here.

**Disassembly group**: drag enabled `dragPosition.intensity→1 (dur .5 @0)` then off `→0 @.75`; parallax OFF for the macro (`parallaxIntensityMultiplier→0 dur .5 @0`); **dolly `radius→6 (dur .75 @0)`**; longpress dolly gain **reduced to .3** for the whole beat (`longpressZoomMultiplier→.3 @0, →1 @.9` — camera is already close, hold-zoom is damped); strap drops `z:−.2 power3.in`, glass lifts `z:.15 power3.in` then hidden; parts fan out `xplodPos.z=(n+1−mid)·.013 (dur .75)`, `xplodRotation.y→.1π`; screws counter-rotate `y−=2π (dur .1, cascade offset .05·k)` and lift `z+=.15 (dur .5+.25·k)`; laser + overlay uniforms fade in/out at .2–.3/.7; **re-assembly of everything at .75 over .25** (except dialXplod). Verified: `Disassembly_0.5.png` = face-on horizontal explode line.

**Presentation group** (Movement → Curves → MovementWatchRight → Hands, 4 tracks on the .25 beat grid):

| t | Move | Reads as |
|---|---|---|
| 0–.05 | light-sweep `euler.x→−.15π` power2.out, back `→0 @.25` power2.inOut | Movement: dark Mechanism hands back to light; word-stack #2 rides the DOM channel |
| .25 | `rotation.y→2π` + `position.x→.6` (dur .2) + `yTranslateAspectIntensity→0` | watch sweeps frame-right entering Curves (the "watch right" composition; centered again by .5) |
| .5 | `position.y→−1.15, x→0`, `rotation.z→−.5π x→−.6π`, **dolly `radius→4`**, `crown.rotation.x→−2π (dur .3)`, `yTranslate→1.5` | top-down three-quarter macro, crown visibly winding (verified `Curves_0.5.png` mid-move, `MovementWatchRight_*.png` settled) |
| .7 | `position→(0,−1.25,3.8)` (dur .25), `rotation.x→−.35π` | Hands: case slides under the camera, edge-on profile (verified `Hands_0.5.png`) |
| .95 | `.set()` snap to `(z:3.8,y:0) / rot(−.5π,−.5π→2π) / radius 4` | teleport-reset while off-frame for Straps |

**Straps group** (bracelet macro, constants `at=0, ct=.4, lt=.6, ht=.3` — wall-clock-ish beats inside the scrub): links converge to a single horizontal band (`scrollPos.x→singlePosX`, 6 properties, **power2.out dur .4 @0**), hold the macro, then **fling ×6 apart (power2.in dur .3 @.6)**; `hoverIntensity` 1→0 mirrors it; link meshes toggled visible only inside the window (verified `Straps_0.5.png`: full-frame link band).

**Images group**: webgl class is EMPTY (watch hidden, pure DOM gallery). **Colors group**: `set position z=4`, stage-dim `→.3 @0 / →1 @.8`; `set rotation y=.5π`; **dolly-out `radius→10 (dur .2 @.1)`**; settle `y→.2π x→−.15π power3.out @.15`; parallax ON `@.15`, OFF + rotation→0 `@.5 (dur .4)`; `overlayPlane.uProgress→1 (dur .45 power1.inOut @.55)` wipes to the picker; watch hidden at 1. (Verified `Colors_0.5.png`: drag-tilted hero inside the dial ring.) **Parts group**: empty webgl. **Footer group**: 4 watches `from y:−3.5 (mobile −7), duration .7+i·.1, power4.out` all at t=0 (verified `Footer_0.5.png`).

**Grammar laws for P2:** one dolly OR one orbit per beat, never both large at once (source pairs a big rotation with ≤.2-window position moves); parallax is gated OFF during macros and drag beats; every group that dims the stage restores it before exit (`.3→1` by t≈.9); `.set()` teleports happen only ≥.95, while the object is provably off-frame; longpress zoom gain is a per-section author knob (source precedent: 1 default, .3 in Disassembly — OUR table: default 1.35, Disassembly 1.6, DOM-only sections 1).

---

## 5 · Interaction motion (wall-clock, the mechanics P3 verifies against)

- **Longpress (source, class `Zn`):** defaults `{activationDelay:400, maxStartDelta:∞, duration:3000, lockAfterDelay:false, lockingDelay:2000, ease:"power3.inOut"}`; instantiated `new Zn(app, cb, {activationDelay:500, duration:2000, ease:"power3.inOut"})` → **hold 500 ms, ramp 2 s power3.inOut**. One lazily-built timeline `tl.to(this,{intensity:1, duration:2, ease:"power3.inOut"})`; press = `.play()`, release = **`.reverse()`** — decay retraces the same inOut curve at 1× from the current position. Consumer callback: intensity → `uLongpress` post uniform; on first RISING tick `lenis.stop()` + `LONGPRESS_TOGGLE true`; on first FALLING tick `lenis.start()` + `LONGPRESS_TOGGLE false` (scroll returns the instant decay starts). Source `LONGPRESS_TOGGLE` payload is a **boolean**; intensity rides a uniform.
- **Explode (SET_CLICKED_MESH `clickTl`):** open = **2 s** power3.inOut block: `radiusMultiplier→.6`, per-part `zoomPos.z = (h−clicked)·.001 ± .02`, `zoomProgress` 1/0, overlay `uZoomProgress→1`, `xplodMouseIntensity.zoom→0`; close = same block back at **1.6 s**; prev/next reuses open pacing; label DOM opacity 1 s linear; XPLOD_ALL: `{xplodAllProgress: on?1:0, xplodedPosMultiplier: on?1.65:1}` **2 s open / 1 s close**; selected part idles `rotation.y += dt·0.15`.
- **Colorway swap (CONFIG_CHANGE):** payload carries the duration — picker emits `{configName, duration:1}`, outro restart emits `{duration:0}` (instant re-skin before `lenis.scrollTo(0,{immediate:true})`). Material timeline `defaults:{duration:<payload>, ease:"power3.inOut"}` tweens `{color,roughness,metalness,envMapIntensity,metalnessMapIntensity}` per material; CSS vars `--first/second-color` 1.2 s power3.inOut; full-screen transition overlay `y:0→−200vh power4.out (1 s)` then `→−400vh power4.in`; transition text in `y:200%→0 power3.out stagger .07`, out `y:→−300% power2.in stagger .04` (both 1 s). Picker ring: CSS 3 s easeOutCubic dasharray draw + 1 s transform.
- **Cursor:** `gsap.quickTo(el,"x"/"y",{duration:1.3, ease:"power4.out"})` — a long soft tail (that famous float). Icon/text layer swaps ≈.4 s.
- **Details hover labels (`hoverTl`):** overlay `uProgress` and `uOpacityMultiplier` 0↔1, **.8 s power3.inOut** both directions.
- **Outro:** rise per §4 Footer; hover spread on the 4-watch line: `intersectPoint` lerp `5·dt`, per-instance offsets `dur .4 power2.out` in / `dur .3 power2.in` out (same `ct/ht` constants as Straps).
- **UPDATE_ROTATIONS (source semantics — differs from ours):** the scene emits it with the mechanism's ROTATION ANGLE (throttled, or every frame while `longpress.intensity > 0`); the Mechanism DOM two-digit seconds readout subscribes to it (`enter(){on(UPDATE_ROTATIONS, updateSeconds)}`). It is a rotation *broadcast*, not a speed command. OURS re-defines it as `{speed}` multiplier (typed in cursor-events.md §1) — sanctioned redesign; P3's seconds readout must subscribe to the clock scalar/dial gear instead, NOT expect angles on this event.

---

## 6 · Smoothing constants (every per-frame lerp in the shipped build)

| Target | Expression (verbatim) | Rate |
|---|---|---|
| WebGL scrub master | `lerped -= (lerped−progress)·.1` **then overwritten = RAW** | dead code (see §3) |
| Lenis scroll | duration 4, expo-out easing | the one smoothing owner |
| Text color reveals | ScrollTrigger `scrub: 2` | 2 s catch-up (text color ONLY) |
| Parallax intensity gate | `damp(v, target, dt·(target===0 ? .1 : 7))` | fast in (τ≈.14 s), very slow out (τ≈10 s) |
| Parallax mouse vector | `mouse.value.lerp(target, dt)` | τ≈1 s |
| Orbit phi/theta | `damp(phi, f(mouse), dt·2)` | τ≈.5 s |
| Drag position | `.lerp(target, dt·4)` | τ≈.25 s |
| LookAt (dragging) | `.lerp(ui, dt·1.5)` | τ≈.67 s |
| LookAt (normal) | `.lerp(target, dt·3)` | τ≈.33 s |
| Outro hover point | `.lerp(target, dt·5)` | τ≈.2 s |
| Particles pointer / global uMouse | `.lerp(target, dt·1)` | τ≈1 s |

OUR rig (all frame-rate-independent `1−exp(−dt·k)`): camera master **k=8** (`WEBGL_PROGRESS_LERP`), parallax **k=6** (`PARALLAX_LERP`), cursor follow **k=12** (`CURSOR_FOLLOW_LERP`). Equivalence note: source's `lerp(target, dt·k)` ≈ our `k` at small dt, so the table above converts directly; anything we add sits in the k=1–8 band, with k≥12 reserved for cursor-grade snap.

---

## 7 · OUR deltas (authored deviations — spec'd here, most already implemented)

1. **Nocturne wall-clock exception (PLAN §2, dial.md §2 — LAW).** Everything in the experience derives motion from `{clock scalar, scroll velocity, interaction intensity}` — never wall time — with exactly ONE exception: the AOD dial in Nocturne ticks on real seconds (`seconds = floor(wallSeconds())`, one redraw per second). Handoff both directions = phase-align glide converging in **≤1 tick period** (implemented in `dial/gear.ts`; the same grammar the geared hand uses leaving a sweep). Eval mode pins wallSeconds to 10:09:30 so the exception itself stays deterministic. P2's Nocturne section must not add any other wall-time consumer.
2. **Longpress ramp (implemented, `src/ui/cursor/longpress.ts` + constants):** hold **500 ms** (`LONGPRESS_HOLD_MS`), pre-arm cancel travel **15 px** (`LONGPRESS_CANCEL_MOVE_PX`), ramp **0→1 over 2 s power3.inOut** (`LONGPRESS_RAMP_S`, `EASE.default`) — source-exact. **Release differs from source**: ours is a fresh tween to 0 over `2 s × currentValue` with **power3.out** (`EASE.exit`) and `lenis.start()` fired immediately at pointerup; source reverses the inOut tween. Feel target preserved (scroll live while zoom relaxes, decay time proportional to depth); the exit ease is our motion-census exit applied consistently. Re-press mid-decay resumes upward at constant rate (`2 s × (1−value)`), source resumes by `.play()` from the same position. Emission: `LONGPRESS_TOGGLE {active, intensity}` every tick + `UPDATE_ROTATIONS {speed: 1 + intensity·2}` (`LONGPRESS_ROTATION_GAIN`).
3. **Longpress dolly formula:** source subtracts `intensity·3·parallaxSum·sectionMultiplier` from camera z (additive world units); ours divides `radius / (1 + intensity·(zoomMultiplier−1))` (normalized, per-section `zoomMultiplier`: default **1.35**, Disassembly **1.6**, DOM-only sections **1**). Parallax amplification ×(1+intensity) matches source exactly.
4. **UPDATE_ROTATIONS semantics** re-typed as `{speed}` (see §5 last bullet). Mechanism seconds readout binds to the dial gear, not this event.
5. **Cursor follow:** exponential `k=12` (τ≈83 ms) instead of source `quickTo 1.3 s power4.out`. Ours reads more precise/instrumental (fits ONE HERTZ); the HOLD ring fill is driven directly by longpress intensity (= 2 s inOut fill, source parity). If the P1.5 council wants the source's floatier tail, the change is ONE constant.
6. **Scrub offsets are authored, not zero:** Disassembly declares `−0.25/+0.25` (engine.md §1) — the mechanism the source ships disabled, used deliberately for the macro reach-in. Any P2 section wanting offsets must declare them in its `SectionSpec` and justify against this file.
7. **Autoscroll pace:** ours defaults to full page in ~60 s (eval capture pace) vs source ~29 s; `?autoscrollspeed` overrides.
8. **Loader floor:** choreography minimum **2.5 s** (`MIN_DURATION_S`, integrate.md #4; source parity ~2.5 s delay before autoscroll implies the same idle beat), arc still honest (min(real, curve)); `?eval=1` skips choreography, never readiness.
9. **DOF rack (ours only):** source has no DOF. Ours exists at tier 0 on macro pinned sections (`setDof(true)`, `setDofFocus` racks). Motion law: focus racks ride the SAME beat fractions as the dolly they accompany (a rack without a dolly is noise), duration ≥.2 of the window, power3.inOut.
10. **Grey-line reveal lag expressed as windows, not a second smoother (Nocturne, P2).** The source's `scrub: 2` catch-up is ScrollTrigger machinery our engine deliberately lacks (ONE smoothing owner, law 5; section ticks receive raw progress, no dt, and any private lerp would need Snappable access sections don't have). Nocturne's grey-line color reveals keep the grammar's essence — per-line STAGGERED windows (offsets alternating on the 15/25 pattern), `#BCBCBC→#FFFFFF` on dark, power3.inOut — driven directly by raw progress; Lenis's 4 s glide supplies the trailing feel. Any later section wanting the literal 2 s lag must add an engine-level smoothed channel (registry-owned, Snappable), never a per-section lerp.

---

## 8 · Per-slot duration budget table (P2 section agents build against THIS)

Columns: track budget (our `SECTION_VH`, svh) · source measured height (desktop 900 px viewport, sections.json) · scrub window = budget + 100 vh (one-viewport-early rule, §3) · WebGL beat budget (fractions available after the source grammar in §4) · wall-clock allowance (event tweens this section may own).

| # | Section | Ours (svh) | Source | Scrub window | WebGL beats (fractions) | Wall-clock allowance |
|---|---|---|---|---|---|---|
| 1 | Intro | 100 | 100vh | 200 vh | settle .1 · spin .4 · settle .5 | loader-exit chain: .4 + 1.2 + 2.0 (entrance) + 1.2 title |
| 2 | Timeless | 100 | **209vh** ⚠ | 200 vh | rides Intro group's spin (edge-on at its center) | word-stack: 1.5 fade (stagger .4) |
| 3 | VerticalText | 300 | 300vh | 400 vh | Intro-group tail: settle toward frontal · DOM letters `x:±60vw power3.in (tlD·.5+n·.03)` | HOVER_POSITION labels .8 · (ours) complication hover-swap .8 — this is the recon "Details" beat |
| 4 | Disassembly | 300 | 300vh | 400 vh (+authored −.25/+.25) | dolly .75 · explode .75 · re-assemble .25 @.75 · uniform fades .15–.3 | explode click 2.0 open / 1.6 close · labels 1.0 |
| 5 | Mechanism | 400 | 400vh | 500 vh | Particles group: dim .1 in / restore @.9 · trails `uProgress` linear over FULL window · turn to movement side .15/.3 · light-sweep .2/.1 | seconds readout (dial gear, ours) |
| 6 | Movement | 300 | 300vh | 400 vh | Presentation 0–.25: light-sweep .05 out / .2 back | word-stack 1.5/.4 |
| 7 | Curves | 300 | 300vh | 400 vh | Presentation .25–.5: sweep right .2 → recenter · dolly→4 + crown spin .3 land @.5 | — |
| 8 | MovementWatchRight | 300 | 300vh | 400 vh | Presentation .5–.75: top-down macro held | — |
| 9 | Hands | 300 | 300vh | 400 vh | Presentation .7 slide-under .25 · reset `.set()` @.95 | — |
| 10 | Straps | 400 | 400vh | 500 vh | converge .4@0 (p2.out) · macro hold · fling .3@.6 (p2.in) | — |
| 11 | Images | 100 | **201vh** ⚠ | 200 vh | EMPTY webgl (watch hidden) | gallery re-src on CONFIG_CHANGE instant |
| 12 | Nocturne (ours) | 300 (provisional) | — | 400 vh | authored: radial dim in ≤.2 · AOD handoff at center · restore by .9 (stage-restore law §4) | clock handoff ≤1 tick · sleep-score count ≈2.0 |
| 13 | Colors | 450 | 450vh | 550 vh | dolly-out .2 · settle .15 · overlay wipe .45@.55 · dim .2 in/out | swap 1.0 · CSS ring 3.0/1.0 · overlay sweep 1+1 · text 1/1 |
| 14 | Parts | 100 | **161vh** ⚠ | 200 vh | EMPTY webgl | picker = Colors constants |
| 15 | Footer | 100 | 100vh | 200 vh | rise .7+i·.1 power4.out (wall-clock inside scrub enter) | SWAP restart: swap 0 s + scrollTo immediate · credits slate (ours) |

⚠ = our frozen budget deviates from the measured source height (Timeless 209vh, Images 201vh, Parts 161vh — content-sized in the source). The constant lives in ONE place (`core/constants.ts SECTION_VH`); if a P2 agent cannot fit the beat grammar into 100 svh for these three, the fix is a look-bible-sanctioned budget bump, never a local hack.

**Slot laws:** (a) scrub beats land on the fraction grid {.05,.1,.15,.2,.25,.4,.5,.75}; (b) DOM hand-offs overlap exactly 1 viewport (§3) — never author a gap; (c) stage-dim restores before exit; (d) `.set()` snaps only ≥.95 off-frame; (e) wall-clock tweens only from the §2 scale; (f) any new per-frame lerp declares its k against the §6 table and registers `Snappable` if eval must settle it.

---

## 9 · Ten laws (the shortest form P2/P3 can be held to)

1. `power3.inOut` unless this file names another ease for the exact move class.
2. Arrivals from off-frame `power3.out`; departures `power2.in` (violent: `power4.in`); hero entrances `power4.out`; light `power2.inOut`; scrubbed opacity `linear`.
3. Wall-clock durations ∈ {0.4, 0.8, 1.2, 2.0} s ±25 %; closers run 0.5–0.8× their opener.
4. Three unit domains (§2); every timeline states its domain; WebGL group timelines are padded to 1.
5. ONE smoothing owner: Lenis (duration 4). No scrub-position lerp — the source's is dead code. `scrub:2` grammar is text-color reveals only.
6. Scrub windows open 1 vh early; DOM sub-timelines overlap 1 vh; first/last clamp.
7. Camera: one big move per beat; parallax off during macros; dim restored by .9; snaps ≥.95 off-frame.
8. Longpress: 500 ms arm · 2 s power3.inOut ramp · release decay ∝ depth (power3.out, ours) · scroll live at release instant · per-section zoom table (1.35 / 1.6 Disassembly / 1 DOM-only).
9. Wall time is banned everywhere except the Nocturne AOD tick (≤1-tick phase-align handoff, eval-frozen).
10. Deviations from the source (§7) are the ONLY sanctioned ones; new deviations get written here first, built second.
