# P6 lane · demo reel + link unfurl

Status: **DONE** 2026-08-27 · captured against live prod (one-hertz.ubonranto.workers.dev) · build clean · engine-smoke ALL PASS (built dist via vite preview)

## Deliverables

| File | What | Size | Spec |
|---|---|---|---|
| `docs/media/demo-reel.mp4` | 30.1 s desktop reel, 1600×900 H.264 25 fps, faststart | 4.4 MB | ≤10 MB ✓ |
| `docs/media/poster.gif` | 7.8 s loop, 800×450 @12 fps, palettegen `stats_mode=diff` + bayer dither | 4.4 MB | <5 MB ✓ |
| `docs/media/demo-reel-mobile.mp4` | 11.3 s mobile bonus, 390×844 | 0.85 MB | bonus |
| `docs/media/still-hero.jpg` | Intro@0, 3200×1800 (eval-frozen 10:09:30 face) | 268 KB | |
| `docs/media/still-disassembly-fan.jpg` | Disassembly@0.42 full cascade + part labels | 464 KB | |
| `docs/media/still-nocturne.jpg` | Nocturne@0.5 AOD | 348 KB | |
| `public/assets/og.jpg` | 1200×630 unfurl card | 56 KB | in dist ✓, not pruned by `.assetsignore` ✓ |
| `index.html` head | og:* (10 tags) + twitter:card summary_large_image | — | verified in built dist ✓ |

## The cut (desktop, 30.1 s)

Authored beats, not a scroll-through — one continuous `recordVideo` take
(`evals/reel.mjs`), beat marks written to `docs/media/.takes/take-desktop.beats.json`,
assembled by `docs/media/.takes/assemble.sh` (trim + xfade on the marks):

1. **Loader → match cut** — activity rings fill on porcelain, ring→dial match cut,
   band-knot hero entrance, hero hold (title + live 1 Hz dial).
2. **Fixed-velocity descent** — linear rAF `scrollTo` ramp, Lenis (the one smoothing
   owner) renders it as real motion; Timeless → VerticalText (CASE & FINISHES)
   → Disassembly; one interior dissolve trims the slowest stretch.
3. **Disassembly** — scrub opens the six-part cascade on camera (deterministic
   section choreography), then an `XPLOD_ALL` bus pulse (on 1.5 s → off): parts fling
   outward and come home.
4. **Nocturne** — AOD drift, dial the only light, REAL-seconds tick on wall clock
   (the reel is captured live, no `?eval=`, so the tick is genuine).
5. **Outro** — lineup raised, hover+select **BLACK DLC** (cursor SWAP vocabulary),
   SWAP → duration-0 apply + hard restart: the film ends on the hero it opened with,
   re-materialized in the chosen finish. White fade in/out bookends.

OG card = the live hero rendered at a 1200×630 viewport under `?eval=1`
(real Clash Display 300 wordmark + watch — LOOKBIBLE §4 type is the site's own),
downscaled 2× → jpg. og:description = the fixed positioning sentence (PLAN §7).

## Repro

```
node evals/reel.mjs [--vp desktop|mobile] [--url <base>]   # take + beats json
zsh docs/media/.takes/assemble.sh                          # mp4 from the marks
node evals/stills.mjs                                      # 3 stills (?eval=1)
```

ffmpeg = static arm64 6.0 at `~/.local/bin/ffmpeg`. Raw takes are deleted after
assembly (re-recordable); beats jsons + assemble.sh stay as the cut's record.
Re-recorded takes shift beat marks a few hundred ms — re-check the trim points
against the new beats json before reassembling (video time ≈ mark + ~0.8 s).

## Lessons (paid for, filed)

- **Lenis settle is not a fixed pause.** An 8 s linear target ramp lands ~2–4 s
  before Lenis does (duration 4). Poll `state().scroll.{position,velocity}` for real
  settle before the next beat — the first take fired XPLOD while the scrub was still
  below the fan-open range and shot an assembled cluster.
- **XPLOD_ALL framing is standoff-dependent.** Live at Disassembly mid the ×1.65
  spread pushes every part OUT of frame (`explode.parts[].screenPos` |x| > 1100).
  A held XPLOD is an empty frame; a 1.5 s pulse reads as a fling-and-return. The
  in-frame beauty composition is the scrub fan itself (arrive ~0.42).
- **A 340 px drag ≈ 90° cluster yaw** — turns the fan axis into the camera and hides
  the cascade behind the case. Reel keeps drags out of the explode beat.
- **60 fps not feasible from `recordVideo`** — Chromium screencast caps at 25 fps.
  The 25 fps capture is smooth at reel velocities. True-60 route (frame-stepped
  `?eval=1` gotoSection renders) was rejected: it kills the live-clock beats
  (loader, real-seconds Nocturne, SWAP restart) that make the film honest.
- Playwright video time runs ~0.8–1.0 s behind `Date.now()` marks taken after
  `newPage()` (recording starts at page creation); cut on holds, not on edges.

## Verification

- demo-reel.mp4: 30.12 s, 1225 kb/s, yuv420p faststart — frames spot-checked at
  every beat (loader rings open, match cut, descent, fan open, pulse, Nocturne,
  credits slate, BLACK DLC restart, white fade-out).
- poster.gif: 7.83 s, 800×450 @12 fps, loops, no visible dither artifacts.
- Meta: `dist/index.html` carries 10 `og:` tags + twitter card; `dist/assets/og.jpg`
  present (55.9 KB); `.assetsignore` audited — og.jpg is uploaded.
- Gates: `npm run build` clean (tsc + vite) · `node evals/engine-smoke.mjs` vs the
  built preview: **ALL PASS**.
- NOTE for the redeploy lane: unfurl goes live only after the next `wrangler deploy`
  (og.jpg + meta are in dist, not yet on prod).
