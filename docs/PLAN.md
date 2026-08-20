# PLAN v3 · ONE HERTZ — recreate thewatch.60fps.fr experience, product = Apple Watch

Status: v3 FINAL — council-reviewed (7 judges, 62 findings, all applied) · 2026-08-20 · awaiting founder read
Tier: **showcase** (portfolio-grade, chenthedigger) · Repo: `~/engineer/one-hertz` · becomes `one-hertz/docs/PLAN.md` on approval

## Founder directives (LAW)

1. **Beauty is objective #1.** At or above the source's craft level; every constraint bends to this.
2. **No self-imposed limits.** No caps/hedges that don't serve beauty or correctness. Asset spend: whatever the most beautiful option costs; narrate at purchase, pause only above $250.
3. **Faithful Apple Watch, full fidelity.** Real design, real branding, real materials. Most beautiful asset route wins. (Takedown tail-risk accepted, stated once here.)
4. **No legal/ethics boilerplate.** Credits only as portfolio story: README positioning line + designed film-credits end-slate.

## 0) Goal

Recreate the full scrollytelling experience of https://thewatch.60fps.fr with the product swapped to a faithful Apple Watch — the most beautiful piece in the portfolio, shipped with a reproducible likeness + beauty + perf eval harness. Concept: **ONE HERTZ** (winner of 4-concept judged panel).

## 1) Ground truth (recon complete; evidence scratchpad/watchrecon/)

- **Render**: real-time three.js, ONE GLB (9.0MB) + 2 EXR envmaps. Custom PBR w/ additiveEnvMap.
- **Scroll**: Lenis **duration:4** + GSAP; per-section paused timelines as `{duration, tick(progress)}` scrub adapters; **dual channels per section** — WebGL timeline over offset-extended bounds (webglStart/webglEnd, first/last viewport-clamped) + separate DOM timeline; lifecycle events enter/leave/enterCenter/leaveCenter at ±0.5vh; standalone text ScrollTriggers at two speeds (scrub:true transforms, scrub:2 grey-line color reveals); CSS position:sticky pinning inside 300/400/450vh tracks; ~30-40 viewport heights total.
- **14 sections**: Loader → Intro → Timeless → Vertical → Disassembly → Mechanism → Movement → Curves → Details → Profile → Bracelet → 2D Gallery → Parts table → Colorway outro.
- **5 interaction mechanics**:
  1. Cursor state machine: text (HOLD TO EXPLORE / SELECT MODEL / SWAP) + icon channel (finish swatch, cross, left/right arrows, select) via SET_CURSOR_ICON-style events.
  2. **Longpress hold-zoom (signature)**: hold ≥500ms anywhere → Lenis stops, intensity ramps 0→1 over 2s power3.inOut, camera dolly-in by per-section zoomMultiplier, mouse parallax ×(1+intensity), mechanism rotations accelerate; release reverses. Touch-hold on mobile.
  3. Exploded view: invisible bounding-box proxy hitboxes per part, camera lookAt lerp to clicked part, selected part idle-rotates (rotation.y += dt*0.15), DOM overlay anchored to projected screen position, close button, prev/next part arrows, XPLOD_ALL state, drag-pan gated while selected, 15px mobile tap tolerance.
  4. Colorway swap: per-material 1s GSAP tween of {color, roughness, metalness, envMapIntensity, metalnessMapIntensity}; picker in TWO places (parts-table section + outro); CONFIG_CHANGE consumed by materials + gallery `<picture>` sets + screen canvas + accent tokens.
  5. Outro: 4 watch instances rise staggered (power4.out, 0.7+i*0.1s), SELECT MODEL → SWAP applies config + lenis.scrollTo(0, immediate) — **site restarts in chosen finish** (credits slate overlays this loop point).
- Small signatures: word-stack appears twice (Timeless + Movement) with gallery echo · Details = 3 hover labels as 3D-projected DOM annotations (HOVER_POSITION) · Mechanism has live two-digit seconds readout · catalog cards are consecutive pages with shared denominator · gallery images are per-colorway sets (`${config}_${n}.webp`) with min-width:1024 art direction, live-rewritten on CONFIG_CHANGE.
- Type: Nekst + Inter (+ EB Garamond serif accent) · stage #EBEBEB · silent · mobile same-experience (svh/dvh, watch scale 20 vs 25, breakpoint-forked timings).
- Event-bus fabric (adopt as typed enum): CONFIG_CHANGE, SET_CURSOR_ICON, SET_CLICKED_MESH, LEAVE_CLICKED_MESH, NEXT_PREVIOUS_CLICKED_MESH, XPLOD_ALL, LONGPRESS_TOGGLE, HOVER_POSITION, UPDATE_ROTATIONS.
- Debug params to replicate (also our eval transport): `?scroll=<section>` deep link, `?autoscroll`, `?materials`.
- Source shortcut to outdo: 6 exploded parts share one placeholder description.

## 2) Creative direction — ONE HERTZ

Thesis: haute horlogerie worships the 4 Hz balance wheel; this site is built on **1 Hz** — where the Always-On LTPO3 floor meets a resting human heart. Movement = S-series SiP, complication = your blood, power reserve = your sleep. All 14 sections kept in order; every break additive or semantic.

Beats: Activity-rings loader (smoothed blend of real bytes-progress + choreographed ~2.5s minimum, completes only when assets ready) with ring→3D-screen **match cut** → hero "ONE HERTZ · the watch regulated by a human heart" → word-stack "the tireless electrical watch" → horology-to-silicon exploded view (struck-through "tourbillon" over "optical heart sensor, 1 Hz continuous"; **Taptic tick-back**: hover oscillates the part ±0.4mm @8Hz — visual effect primary, navigator.vibrate as Android-only garnish) → "Electrical Heart" split-title over live scrubbed ECG + two-digit seconds readout → second word-stack in Movement ("the silent electrical seventy-hour movement") → catalog cards as BPM pages with shared denominator: **58 / 220 → 96 / 220 → 142 / 220 bpm** (220 = max heart rate) on Curves/Profile/Bracelet → Details hover labels live-swap the dial complication (depth gauge / heart rate / compass) → per-finish editorial gallery → **1 Hz Nocturne**: darkness radiates outward from the dial (radial mask on the clock scalar), ambient light handed to the emissive screen; the Always-On dial ticks on REAL seconds — the only moment the WATCH ITSELF moves on wall-clock time (handoff = phase-align lerp ≤1 tick both directions); Sleep Score counts to 92 → "CALIBRE 1HZ" sensing table (Hz / g-force / precision units; "total weight: immaterial") + colorway picker → outro 4-watch line-up + SWAP restart loop + film-credits slate.

Living BPM: persistent mono vital (top-right), ECG trace draws with scroll progress, scroll velocity lerps simulated HR 58↔142, each beat = QRS spike + one-frame 1.006 canvas scale tick. **Opt-in sound** (additive break): sub-audible 1 Hz tick + heartbeat low end, default OFF, toggle styled into the vital.

Scroll-geared second hand rehearses the thesis in every pinned section (sweeps with velocity, ticks 1/s at rest).

## 3) Architecture

**Stack**: Vite + vanilla TypeScript + three.js + GSAP + Lenis → Cloudflare Workers static. The engine IS the portfolio point.

**Scroll architecture decision record (write before P1; binds all engine agents)**:
- ONE smoothing owner: Lenis (duration:4 baseline). Engine reads lenis.scroll raw — no second lerp on scroll position (WebGL master progress may keep the source's lerpedProgress smoothing).
- Pinning via CSS position:sticky exactly like source. ScrollTrigger demoted to text-effect progress only (or hand-rolled mapper).
- Wiring: lenis.raf driven from gsap.ticker, lenis.on('scroll', ScrollTrigger.update), gsap.ticker.lagSmoothing(0).
- Per-section vh budget table (300/400/450vh from recon CSS) in the engine constants file; deviations only for deliberately longer beats (Nocturne).
- Sections sized in svh; refresh debounced to scroll-idle; height-only resizes <120px ignored on touch (iOS URL-bar churn).
- Section base class: {name from data-webgl, startOffset/endOffset, webgl+dom timelines, lifecycle events}; typed event enum from §1.
- **Section sandbox + state contract (P1 gate, before ANY P2 work)**: every section declares required enter-state and guaranteed exit-state for {camera, explode, colorway, dial mode, post stack}; registry asserts contract continuity; any section runnable standalone with stubbed enter-state.

**3D asset track — TWO workstreams**:
- **A1 Hero exterior** (Spike A shootout, ranked purely by visual quality): (a) Apple product-page USDZ → GLB — hour-1 existence check for BOTH Ultra 3 and Series 11; treat as geometry donor only (UsdPreviewSurface has no clearcoat/anisotropy — ALL hero materials re-authored regardless); (b) best marketplace mesh — paid fine, narrate price and buy in the same turn (pause only >$250); (c) in-house Blender build. Scoring criteria include "supports ≥4 gorgeous swap states" (drives device choice: Ultra = 2 Ti finishes × bands Ocean/Alpine/Trail; Series = 4 case finishes).
- **A2 Internals** (ALWAYS in-house, critical path, starts P0 in parallel): Taptic Engine, S-SiP, battery, sensor array modeled from iFixit teardown references, beauty bar of its own, ~2-3 agent-days, gate at P1.5. Pre-declared pivot: if internals fail the P1.5 council, switch to a **designed stylized-cutaway language** — a style choice declared now, not a retreat.
- Pipeline: Blender surgery (segment named part meshes) → `npx gltfpack -tc -kn` (meshopt + KTX2; -kn preserves raycast node names) → verified load via KTX2Loader + MeshoptDecoder. Size ~9MB is guidance (source parity), not a cap. Envmaps pre-PMREM'd offline. Raycast via three-mesh-bvh or low-poly proxies. Gesture arbitration: lenis.stop() + preventDefault during holds.

**Lighting & materials (beauty lever #1)**: custom-authored studio environment (lightformers/emissive planes) designed to draw long horizontal speculars along case chamfers and crown knurling — unmodified stock HDRIs banned from the shootout; soft contact-shadow/AO grounding on the stage; **per-section lighting keyframes (key/rim intensity, env rotation, background luminance) driven by the clock scalar — light moves with the story**; material spec sheet (brushed vs bead-blasted titanium roughness/anisotropy, sapphire fresnel, ceramic back subsurface hint).

**Dial subsystem (named workstream — the emotional center)**: one canvas-renderer module consumed by hero/Details/Nocturne/loader match-cut. Real watchOS face reference (Wayfinder / Modular Ultra class), complication layout + AOD dim variant specced against Apple screenshots; canvas ≥2× device pixels, capped 768-1024px, dirty-flag uploads only (never per-frame), SRGB, material.toneMapped=false (or emissiveIntensity 2-4) so the display stays luminous under ACES; technique = layered canvas + prebaked glass sprites (no real-time refraction). Dial typography: SF-look glyphs RENDERED into the canvas from a locally-installed face or metric-compatible substitute — no font files shipped in the repo (fidelity + repo-credibility both satisfied). Own P1 spike + P1.5 look-lock artboard.

**Post stack (guardrailed)**: ACES filmic tonemapping · selective bloom (emissive/screen pass only, luminance threshold ≥1.0) · DOF only on macro pinned sections via quality-gated bokeh, off on mobile tier · animated luminance-weighted grain (stronger in Nocturne, near-zero on porcelain) · vignette Nocturne-only · source's text-legibility scrim gradients behind every text-over-3D moment.

**Type**: working default Clash Display + Inter + Geist Mono, NOT a lock — P1.5 type shootout with real comps MUST include commercial faces (Nekst itself, PP Neue Montreal / Söhne Breit / Neue Haas class) and an all-Geist system; serif italic accent considered (source uses EB Garamond); license cost never a criterion, only beauty. Geist Mono tabular figures for all data. Full type spec (modular scale, tracking, tnum) locked in look bible.

**Color**: token ramp in look bible — porcelain #EDEDEB stage with barely-there radial floor gradient, ink #0B0B0C, biosignal red #FF2D55 (Nocturne variant brightened #FF375F-class), ring colors spent once in loader; SWAP colorways from real Apple finishes/bands, each with explicit light→Nocturne token mapping (inversion designed, not filtered).

**Motion bible (P1.5, from recon ease census)**: default power3.inOut, exits power3.out, entrances power2.in, CSS cubic-bezier(.215,.61,.355,1); duration scale 0.4/0.8/1.2/2.0s; camera grammar (dolly/orbit/rack-focus per section type); scrub-lerp constant; overlap rules. P2 builds against it; P3 verifies, never invents.

**Cursor spec**: designed object — geometry, blend mode, magnetic easing, HOLD progress ring in biosignal red; icon states per §1; hidden on touch.

**Reviewer resilience**: loader shell first-paint <1s; WebGL-init-failure and prefers-reduced-motion path swaps in demo video + stills (never a black canvas); cold-load tested under throttled network.

**Mobile quality tiers (defined P1, not P5)**: tier2 drops DOF then bloom (keeps grain+ACES), KTX2 mip caps, dial canvas half-res; tiers shed post effects, NEVER smoothness; forceQualityTier(n) testable.

## 4) Riskiest assumptions → kill tests

1. **Toolchain absent (verified: no Blender, no brew, no gltf tools, no wrangler)** → P0 toolchain bootstrap FIRST: Blender 4.x LTS arm64 DMG via curl + hdiutil, headless `-b --version` + scripted USDZ-import→GLB-export smoke test; one verified `npx gltfpack -tc -kn` encode loaded back in three; `npx wrangler deploy` placeholder to **claim one-hertz workers.dev + warm the TLS cert** (known cert-delay quirk).
2. **Hero asset beauty** → Spike A shootout: all routes rendered as identical turntable + macro shots, judged by design council; includes 4-hour agent-Blender feasibility probe (scripted segmentation + material edit on a test GLB, rendered and judged).
3. **Internals** → workstream A2 with own gate + pre-declared stylized-cutaway pivot (§3).
4. **Scroll-feel parity** → Spike B: loader + hero + 1 pinned section calibrated against the frozen reference recordings; pass/fail includes no pin jitter on iOS Safari (one real-device check). GO/NO-GO.
5. **Sept 2026 Apple refresh** → spec strings in one constants file; 1-hour patch.

## 5) Build phases

- **P0 Bootstrap** (~10 agents): scaffold repo (`scripts/new-project.sh one-hertz showcase`) · toolchain bootstrap (§4.1) · placeholder deploy · **reference capture kit TODAY**: 60fps-locked scroll-through video (desktop+mobile viewports) + (sectionId, localProgress) frame grid + interaction clips (hold-explore, swap, cursor) of the live source, frozen under evals/reference/source/ with manifest — all downstream evals run against these, never the live site · **freeze evals/rubric.yaml** (§6) · Spike A ∥ Spike B ∥ A2 internals start. Gate: GO/NO-GO.
- **P1 Engine core** (~8): scroll engine per decision record, WebGL stage + post pipeline, loader, cursor system, clock scalar, typed event bus, section sandbox + state contract, deep-link/debug params (?scroll/?autoscroll/?materials/?eval), `window.__ONE_HERTZ__` debug API {sections manifest, gotoSection(id, localProgress), state() snapshot, freezeClock(seed), forceQualityTier(n)}, evals/ harness code (capture/assert/perf/judge-runner), **CI from day 1** (typecheck, lint, build, headless eval-lite; badges), mobile tier table, dial subsystem spike.
- **P1.5 Look development** (~8): 3 competing looks (authored lighting rig × material grade × post stack × stage treatment) + dial artboard + type shootout as running prototypes; design council picks; locked as **LOOKBIBLE.md in-repo** (lighting keyframes/section, material sheet, motion bible, type spec, color token ramp, cursor spec, gallery shot list, scrim rules, copy-length budgets). Internals A2 beauty gate here (pivot decision).
- **P2 Sections ×14** (~22, pipeline build→verify→fix): **risk-descending order** — Disassembly, Mechanism, Nocturne first; 2D Gallery, Parts-table last (cheap DOM sections are the schedule buffer). Per-section verify = that section's 5 canonical frames pass structural assertions + design gate (fixed-offset still + 5s scroll capture judged against look bible) + section perf within 10% of baseline. **Standing art-director agent** owns cross-section continuity P1.5→P5. Checkpoint after section 4: avg section wall-time × remaining > budget ×1.5 → stop and re-plan.
- **P3 Interactions** (~10): longpress hold-zoom system, exploded view full sub-mechanics checklist (§1.3), SWAP dual placement + CONFIG_CHANGE consumers, outro 4-watch line-up + restart loop, living BPM + opt-in sound, Nocturne entry moment + clock handoff, Taptic tick-back, complication hover-swap, match cut. Verified against motion bible.
- **P4 Content** (~6): copy deck within P1.5 length budgets; **adversarial copy review** (horology terms vs reference glossary; Apple specs vs constants file) · **gallery = Blender Cycles renders of the hero GLB under look-bible lighting, per finish × desktop/mobile crops, one shared LUT** across offline+realtime; GPT Image restricted to background plates/context, never the watch; fidelity crop-check (crown/logo/dial) in verify.
- **P5 Full eval + councils** (adaptive): full-page likeness run, beauty council (§6), perf rounds, cross-section continuity confirmation (not first discovery).
- **P6 Ship** (~6): **demo reel** — scripted fixed-velocity capture → 20-30s MP4 at README top + <5MB looping GIF poster + hero stills + OG image/meta tags for link unfurl · **ARCHITECTURE.md** (~2 pages, 2 mermaid diagrams: registry/scrub contract, clock scalar flow, asset pipeline incl. provenance story — ship processed GLB only, never raw source archives) · README above-the-fold order: title → taxonomy line → positioning sentence ("a web-craft study of 'The Watch' by 60fps, product swapped to a faithful Apple Watch, with a measured likeness + beauty eval") → demo video → live link + CI badges → Results table (named hardware, fps medians, transfer size, likeness grid thumbnail) · sanitizer scan · redeploy · verify live URL in clean incognito + on phone · wiki /save · public.

**Commit narrative rule (binding all phases)**: conventional commits with narrative messages scoped per section/spike; phase branches merged with summary messages; no WIP spam on main; go-public gate includes `git log --oneline` reading as a coherent build story.

Compliance each phase: dist token-leak scan — source-identity strings ("FS 60P", "Nekst", "fps-") only in credits slate + README.

## 6) Eval harness (evals/ in repo; rubric.yaml frozen at P0)

**Repo layout**: evals/{rubric.yaml, capture.ts, assert.ts, perf.ts, judge/, reference/{source,ours}/, results/<round>/report.md} · one command `pnpm eval` → committed HTML report (side-by-side grids, checklist pass/fail, perf traces, judge verdicts + raw rationales + prompts published) · README links final report. The harness itself is a portfolio artifact.

**Determinism**: `?eval=1` seeds RNG, freezes clock (dial 10:09:30, BPM 64, ECG phase 0), skips loader; capture after fonts.ready + GLB loaded + 3 settled rAF frames. Addressing = (sectionId, localProgress {0,.25,.5,.75,1}) via registry → 70 canonical frames × 2 viewports (1600×900 @DPR2, 390×844 @DPR3) + ~10 interaction-state frames (explode open, each colorway, Nocturne mid, BPM hi/lo).

**Structural likeness (gate)**: rubric.yaml enumerates ~25 binary items from recon (5 mechanics incl. longpress + outro restart + gallery re-src + cursor icon states + explode sub-behaviors, dual scrub speeds, lifecycle events, 14/14 order, loader honesty, svh handling…) each with an automated assertion via __ONE_HERTZ__.state() or marked judge-verified. Severity: CRITICAL = missing/broken section/mechanic/crash/desktop-perf-floor; HIGH = checklist fail; MEDIUM = tolerance miss. Gate: zero CRITICAL + ≥90% checklist. CLIP-similarity vs source frames tracked as trend only, never gated.

**Beauty (gate, replaces any /10 average)**: 5 vision judges, fresh context per round; materials = 20 matched-moment still pairs + 4 scroll-video pairs (identical scripted 60s scroll, ours vs source, both viewports — same videos serve P3 motion tuning and the demo reel); left/right randomized per pair per judge; per axis (light, material, typography, composition on stills; motion on videos) forced choice A/B/tie + one sentence of concrete evidence (evidence-less ballot void, re-run). **Gate: win-or-tie ≥60% of all axis-choices AND no axis below 40% AND ≥3 named axes where ours is scored ABOVE the source** (exceed clause — post stack, per-part copy, screen liveness are the claimed levers). Deception probe: "which is the shipping professional site?" — if judges reliably pick ours as the amateur, loop. Anchored numeric scale kept as diagnostics (5 = competent agency, 7 = Awwwards HM, 8 = SOTD, 9 = source craft, 10 = exceeds); inter-judge agreement reported, <70% flagged.

**Perf (beauty floor)**: in-page rAF delta recorder during scripted `lenis.scrollTo(end, ~60s)` (never window.scrollTo) → JSON frame-time array per round. Gates: desktop median ≥55fps AND p95 ≤22ms AND ≤5 frames >50ms per pass (loader shader-precompile exempt); recent-flagship mobile ≥55fps; mid-tier mobile ≥40fps. Mobile method: named real device via remote debugging once per round (recorded in rubric.yaml); inner loop = desktop real Chrome + CDP 6× CPU throttle @390×844 DPR3 with "GPU unthrottled" caveat published in the report. Once per round: CDP Performance trace cross-check. Each quality tier measured separately via forceQualityTier(n). Lighthouse tracked, not gating.

**Two stops (house rule)**: likeness+beauty loop — success = gates above; ceiling 4 rounds then report. Perf loop ceiling 3 rounds then ship with published deltas. Project ceiling: no asset route yields a council-beautiful hero within Spike A + 3 agent-days in-house exterior work → stop, report, re-scope (A2 internals has its own gate + declared pivot instead).

## 7) Credits (portfolio strategy)

README positioning sentence above the fold (recognition lands as intent, not theft) + designed film-credits end-slate: "The Watch" by 60fps · asset/HDRI/type sources · "built by CHEN". House rule kept: never present cloned work as original. Provenance told as pipeline story in ARCHITECTURE.md. Nothing else — no disclaimers, badges, or health notices (founder directive 4).

## 8) Success criteria

0. Beauty gate passed (§6 pairwise protocol incl. exceed-clause).
1. Live demo: 14/14 sections in order, all 5 mechanics, desktop + mobile.
2. Likeness gate: zero CRITICAL, checklist ≥90%, published in README results.
3. Perf gates met on named hardware, methodology published.
4. README portfolio-grade (demo reel, architecture doc, results table, CI badges); `git log` reads as a build story; sanitizer clean; live URL verified; public.

## 9) Budget & timeline (estimates, not caps)

~7-10 days · ~110-140 agents · ~20-30M tokens · asset spend: most beautiful option wins (pause only >$250) · GPT Image: as needed for plates (device never AI-generated).

## 10) Remaining founder decisions

1. Device: **Spike A shootout decides by rendered evidence** (both USDZs grabbed; "≥4 gorgeous swap states" scored) — lean Ultra 3 titanium × band-swap.
2. Name `one-hertz` stands unless vetoed.
