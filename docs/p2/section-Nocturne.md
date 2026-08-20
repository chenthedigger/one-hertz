# P2 lane notes — section-Nocturne (`src/sections/nocturne.ts` + `nocturne.css`)

Status: **DONE, all gates green** · 2026-08-21 · lane: section-Nocturne
Law followed: LOOKBIBLE §1.5 #12 (continuum 0.35 / bloom 0.85 / bgStage #0A0B0D / inner 0.045 match-cut) · §2 (Nocturne inversion mapping) · §4 (type ramp) · §7 (scrims, greys) · §8 (copy budgets) · motion-bible whole (one addition written into §7 FIRST per law 10 — item 10, grey-line lag-as-windows).

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean · **engine-smoke ALL PASS** (29 reachable local checks = the historic 30/30 figure; CI autoscroll branch is either/or, exit 0 is the gate) · lane proof **8/8 PASS** (headless real Chrome, playwright-core `channel:"chrome"`, 1600×900@2, vite preview :4573): solo .25/.50/.75/.95 token states, full-page .5 AOD live, exit restores into Colors, zero console errors on `?solo=Nocturne&eval=1` and full-page `?eval=1` · **live wall-tick proof** (non-eval `?solo=Nocturne` at p.5): dial.mode aod, displayed seconds == wall seconds, +2 s → +2 ticks, **1 texture upload per second** (dirty-flag economics intact).

**Design-gate evidence** → `docs/p2/Nocturne/`: `solo-25.png` (active luminous dial + DARKNESS, MEASURED. right column) · `solo-50.png` (the AOD match-cut: 0.045 blackout, hollow-hand AOD face, `AOD · REAL SECONDS`) · `solo-75.png` (SLEEP SCORE 92/100, AOD held) · `contextual-50.png` (full page via `gotoSection` — near-identical to solo-50 BY CONSTRUCTION, see camera).

## 1 · Beat sheet (pinned 300svh; DOM = raw progress, fraction-domain paused GSAP timeline + imperative ticks)

| p window | Beat |
|---|---|
| .02–.35 | **Darkness radiates outward from the dial**: radial veil, transparent hole (centered on the held camera pose's watch head) closes 130%→26%, power3.inOut; the keyframe driver simultaneously rides the Images→Nocturne continuum (env 1.05→0.35, bg → #0A0B0D) |
| .04–.25 | headline beat: eyebrow `NOCTURNE · 22:00`, split-char `DARKNESS, / MEASURED.` (chars xPercent −105→0 power3.out, opacity linear first half, stagger .005), lead ≤44 chars; exits .30–.38 (power2.in departure) |
| .26–.50 | grey-line reveals ×3 (≤44 chars each): #BCBCBC→#FFFFFF power3.inOut in staggered windows (L1 .30–.40 · L2 .325–.425 · L3 .35–.45) — motion-bible §7.10 grammar; gone by .50 so the match-cut frame is clean |
| .42–.88 | **AOD window** (value-based, jump-safe): store → `{dialMode:"aod", postStack:"nocturne"}`; vignette flag ramps in .42–.50 (strength 0.36×curve), out .78–.88 (restored before .9, stage-restore law) |
| .43–.50 → .56–.66 | **the 0.045 match-cut dip** (porcelain graft): `setSectionEnvDip` blends the driver's continuum → 0.045 → back, power2.inOut both ways; back on the 0.35 continuum by .66 — Nocturne stays the ONLY section handing a dimmed continuum into Colors' recovery ramp |
| .45–.62 | `AOD · REAL SECONDS` caption (the wall-clock moment, biosignal-nocturne accent) |
| .50–.83 | Sleep Score: fades in .52, **counts 0→92 linearly on section progress over .53–.74** (Geist Mono, tnum), caption ≤60; departs .83–.88 |
| .02–.18 / .85–1 | camera blend in / out (below) |

Wall time: this section adds ZERO wall-time consumers — the AOD tick + ≤1-tick phase-align handoff live entirely in the dial subsystem (`dial/renderer.ts` aod branch + `dial/gear.ts` rest regime); the section only flips the `dialMode` token. Eval stays frozen at 10:09:30 by construction (verified: aod seconds 30 in every eval state probe).

## 2 · Camera — pose override chasing the dial normal (the multi-section rig seam)

**Do NOT scrub `rig.setProgress` for a new section beat**: Disassembly OWNS the rig's authored master timeline (`rig.authorTimeline`, ONE owner — cameraRig.ts contract), so master values mean different poses depending on which build authored them (this lane's first attempt proved it: a master chosen against the Spike-B beats framed a strap-back once Disassembly's real timeline landed). The seam for everyone else is **`rig.setPoseOverride`** (Mechanism established it; Nocturne is the second consumer).

Nocturne's recipe (LOOKBIBLE §6 `nocturne-aod`: "50mm, slight low angle, dial emission carries the room"): per frame, rotate `caseSpace.zAxis`/`origin` by `productAttitude(getClock())` and place the camera ON the dial normal — standoff 3.2, theta +0.12 (slight three-quarter), phi +0.10 (slight LOW angle), lateral aim +0.55 (watch composes left, copy column right), fov 35. Because the pose CHASES the clock-derived product attitude, **solo == full page == any scroll position** — `contextual-50.png` and `solo-50.png` are near-identical frames. Blend rides a plateau (in by .18, hold, out .85→1; zero at both boundaries) so entry/exit hand off to whatever base pose the neighborhood holds; released on `onLeave` and whenever the GLB is absent.

## 3 · Shared-file edits this lane made (both additive, both narrow)

1. **`gl/lightKeyframes.ts` — `setSectionEnvDip(amount, target)`** (module-level channel composed inside `LightKeyframeDriver.update`). The driver runs AFTER section ticks and rewrites envIntensity on every scrolled frame, so an in-section blackout MUST compose inside it — a section writing `stage.setEnvIntensity` directly is overwritten the same frame while scrolling (this was infra-gl's declared open handoff to this lane). Pure function of section progress ⇒ eval `gotoSection` settles it synchronously; participates in the change-cache, so sweeps/debug pokes still survive at scroll-rest. Inert when the active look has no keyframes (driver parked — `?look=default`).
2. **`core/debug.ts` — `api.applyState(partial)`** → `store.apply`. Sections write contract axes through the ONE store owner; the boot frame loop already bridges `dialMode` token changes to the dial renderer. `state()` shape untouched (schema stays v1). Any P2/P3 lane needing store writes: use this, don't add another seam.

Also written FIRST per motion-bible law 10: **§7 item 10** — the scrub:2 grey-line lag expressed as staggered progress windows (engine has ONE smoothing owner and sections get raw progress without dt; Lenis's 4 s glide carries the trailing feel).

## 4 · State contract (truthful, boot-asserted)

`requiredEnterState { explode:"assembled", dialMode:"wayfinder" }` · `guaranteedExitState { explode:"assembled", dialMode:"wayfinder", postStack:"default" }` — active → aod → active. Token flips are a pure value-window of progress (in at .42, restored at .88), so eval jumps land correct on the first settled tick; `onLeave` re-restores tokens + dip + vignette + camera override in both directions (verified: jump Nocturne .5 → Colors .3 restores everything).

## Pitfalls found this lane (downstream must inherit)

1. **`--porcelain` is the STAGE token, not a color.** The keyframe driver rewrites it to `#0A0B0D` across this beat (bgStage channel) — any dark-stage section deriving TYPE color from `var(--porcelain)` renders dark-on-dark (bit this lane: first captures had near-invisible copy). Nocturne scopes a literal `--noc-porcelain: #E8EAED` (LOOKBIBLE §2 value) for type; if a look ever re-tokens porcelain, that literal (and the 0.36 vignette literal in nocturne.ts) must move to a look-fed seam — flagged as an open handoff.
2. **`*/` inside CSS comments** terminates them and lightningcss hard-fails the build (`--type-*/--track-*` → write `--type-* / --track-*`). Same trap as plumbing pitfall #1, now proven in CSS too.
3. **Solo clock scalar is a sandbox artifact**: it spans 0..1 over ONE track, so clock-derived product attitude (`productAttitude`) differs wildly from the full page. Capture method: `freezeClock((26100 + 1800·lp)/33750)` = the full-page-equivalent value, then re-settle — solo frames then show the live page's attitude. (With the chase camera the FRAMING no longer depends on it, but lighting/reflections do.)
4. **Rig master values are not portable across timeline owners** — see §2. Sections other than the master-timeline owner must use `setPoseOverride`.
5. The veil rides two CSS custom properties (`--noc-hole/--noc-soft`, one radial-gradient repaint per scrolled frame, values rounded to 0.1 to stop churn at rest) — cheap in practice, but don't multiply the pattern per-element.

## Open handoffs

- **P4 copy**: all strings are working copy inside §8 budgets (headline 9/9 chars, beat lines 41/34/36, eyebrow 16, caption 44); polish freely — budgets and the split-char/grey-line mechanics don't care about wording. No em dashes used.
- **P3 colorway swap**: AOD + blackout were only verified on natural-Ti × Ocean; re-shoot `solo-50` once DLC lands (LOOKBIBLE says DLC's beauty beat is a different lighting story).
- **Look-fed literals**: `--noc-porcelain` (#E8EAED) and `VIGNETTE_NOCTURNE` (0.36) duplicate look values by necessity (pitfall 1; post's tuned strength isn't readable from sections). If a second look ever ships, add a `bgTokens.porcelainType` / vignette getter seam.
- **9-point azimuth sweep** (LOOKBIBLE §7.2 sign-off duty): the AOD frame is dial-emission-lit (env 0.045), so azimuth glare risk is minimal at the match-cut; the .25 active-face frame passes visual read at rot 290. Formal sweep harness run left to the P3 verify pass alongside the other sections.
