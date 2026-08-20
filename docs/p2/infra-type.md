# P2 lane notes — infra-type + dial (fonts · dial lock tunes · loader arc)

Status: **DONE, all gates green** · 2026-08-21 · lane: infra-type+dial
Law followed: `docs/LOOKBIBLE.md` §2 (tokens) · §4 (type) · §5 (dial tunes) · motion bible untouched (zero timing edits).

Verified empirically (not claimed): `npm run build` (tsc strict + vite) clean · **engine-smoke ALL PASS** (29 reachable checks locally — the CI/local autoscroll branch is either/or, so the historic "30/30" figure counts both; exit 0 is the gate) · **dial-smoke 18/18** with the three tunes in · font-proof 8/8 in headless real Chrome (playwright-core `channel:"chrome"`, 1600×900): `document.fonts.check('300 1rem "Clash Display"')` **true**, Clash 400/500 + Inter + Geist Mono + Fraunces italic all load, Clash metrics ≠ Helvetica (no fallback rendering), hero computed weight 300 · zero console errors on every gated page.

**Evidence** → `docs/p2/infra-type/`: `fonts.png` (hero frame: Clash Display 300 colossal over the real Ultra 3 — the "changes every frame" step, shipped) · `dial-active.png` (tunes 2+3 visible) · `dial-aod.png` (tune 1 visible) · `dial-eval.png` (frozen 10:09:30).

## 1 · Fonts shipped (LOOKBIBLE §4 integration, complete)

`public/assets/fonts/` — six woff2 files, 199 KB total, latin subsets, all fetched from official free channels; **zero cost, no purchases** (founder note in LOOKBIBLE §4 confirmed):

| File | Face / role | License | Source URL |
|---|---|---|---|
| `ClashDisplay-300.woff2` (15.3 KB) | display voice, colossal/hero | **ITF Free Font License** (Fontshare; web self-hosting allowed) | `https://cdn.fontshare.com/wf/2QNEFGROUS53RDOVAHQH4CNZZUWGOWOY/XHI55XFKRZLKG77T3N3QTH2YVHMLJQ5U/KVT4BC5ZH7LF4OBHM2Q7KOOZRRZZY5ZK.woff2` via `https://api.fontshare.com/v2/css?f[]=clash-display@300,400,500` |
| `ClashDisplay-400.woff2` (15.1 KB) | section headlines 300–400 | ITF Free Font License | `https://cdn.fontshare.com/wf/VFMK2COV3DN37JR7JQ4CAOJPZ7KWKNY7/ODD5YJNDLHZZB2MIT3DPVH4EIHAMZ34D/BSY64LPTT3OPLVKAZKL3AHKRWZ3D74AC.woff2` (same API) |
| `ClashDisplay-500.woff2` (15.3 KB) | eyebrows/labels | ITF Free Font License | `https://cdn.fontshare.com/wf/2GQIT54GKQY3JRFTSHS4ARTRNRQISSAA/3CIP5EBHRRHE5FVQU3VFROPUERNDSTDF/JTSL5QESUXATU47LCPUNHZQBDDIWDOSW.woff2` (same API) |
| `Inter-var-latin.woff2` (48.4 KB) | body (`--font-body`), variable 100–900 | **SIL OFL 1.1** | `https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff2` via `https://fonts.googleapis.com/css2?family=Inter:wght@100..900` (latin unicode-range block) |
| `GeistMono-var-latin.woff2` (23.1 KB) | data voice (`--font-mono`), variable | **SIL OFL 1.1** | `https://fonts.gstatic.com/s/geistmono/v6/or3nQ6H-1_WfwkMZI_qYFrcdmhHkjko.woff2` via `https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900` |
| `Fraunces-italic-var-latin.woff2` (81.7 KB) | serif accent (`--font-serif`), italic var with opsz/wght/SOFT/WONK axes | **SIL OFL 1.1** | `https://fonts.gstatic.com/s/fraunces/v38/6NU58FyLNQOQZAnv9ZwNjucMHVn85Ni7emAe9lKqZTnbB-gzTK0K1ChjeveQ7ZXk8g.woff2` via `https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,100..900` |

Wiring (`src/style.css` + `index.html`):

- `@font-face` per face, **`font-display: block`** (the loader owns first paint via `document.fonts.ready` — no swap frame ever shows). The loader's existing fonts task now waits on REAL font bytes, not an instant no-op.
- **Metric-matched local fallbacks** `"Clash Display Fallback"` (Helvetica Neue), `"Inter Fallback"` (Helvetica Neue), `"Geist Mono Fallback"` (Menlo) with `size-adjust` / `ascent-override` / `descent-override` **measured in real Chrome against the shipped woff2s** (canvas width-ratio + fontBoundingBox per the web.dev recipe; script preserved in the session scratchpad): Clash 103.62%/85.89%/24.13% · Inter 104.19%/93.1%/23.03% · Geist Mono 99.66%/101.35%/29.1%.
- `index.html` head: **preload** for the three critical faces (Clash 300, Geist Mono var, Inter var) with `crossorigin` (fonts always fetch anonymous-CORS — omit it and Chrome double-fetches). Fraunces and Clash 400/500 deliberately NOT preloaded: nothing references them until P2 sections / the single P4 accent moment; they lazy-load on first use (proven in font-proof).
- Tokens: full LOOKBIBLE §4 ramp in `:root` — `--type-colossal/display/headline/title/lead/body/micro` (212/104/46/30/26/22/15 px @1600 ref as `clamp()`, vw term exact at 1600) · `--track-colossal/display/title/caps/caps-wide` (−0.025/−0.02/−0.01/+0.08/+0.14 em) · `.tnum` utility (`font-variant-numeric: tabular-nums`) for the data voice.
- **600 → 300 flip done**: `.hero__title` (now `--type-colossal` + `--track-colossal`) and `.copy h2` (now `--type-headline` + `--track-title`) — no `font-weight: 600` remains at display sizes anywhere in shipped CSS.
- Ground tokens updated to the bible: `--porcelain #E8EAED` · `--ink #0A0B0D` · `--biosignal-nocturne #FF375F` added — static CSS now agrees byte-for-byte with `instrument.json` `bgTokens` (no first-frame token flash when the look applies).
- Hero/copy/scrim colors migrated to `color-mix(in srgb, var(--ink|--porcelain) N%, transparent)` so the §4 tone hierarchy (55% dim labels etc.) tracks live token rewrites from `applyLook`.

## 2 · Dial lock tunes (LOOKBIBLE §5 — spec/face constants + renderer guards)

1. **AOD drops the seconds hand entirely** (`src/dial/renderer.ts` `paintHands`): seconds baton, counterweight ball AND the red axle pin skip in AOD; hollow-rim batons stay; the dimmed compass/N red stays. The dirty key still includes seconds, so AOD keeps its 1/s repaint cadence — dial-smoke's "AOD ticks ~1/s" check stays true by construction (verified 18/18).
2. **Corner gauge words → unit glyphs** (`src/dial/face.ts` `CORNER_ROUGHS`): `PWR`→`%`, `AIR`→`°C` (big value drops its duplicate `°`). Adjacent initiative, narrated: `ALT`→`M` and `SET`→`UTC` too — the council named PWR/AIR as "the one un-Apple tell", but ALT/SET were the same tell; UTC is the native world-clock label so all four corners now read Apple-honest. Rough values only — P3 owns live data.
3. **Dark hand stems** (`src/dial/spec.ts` `GRID.hands.stemDark {len 0.115, wScale 0.5}` + palette `handStem #15181d`): active hour/minute hands = full-length ink outline → narrow dark metal stem to `stem+0.115R` → lume baton from there — never solid white to the hub. AOD hands unchanged (hollow rims, tune 1's grammar).

`DialPalette` gained one field (`handStem`) — additive, module contracts unchanged, no consumer breaks (tsc strict clean).

## 3 · Loader arc restyle

Stub kept honest, colors pulled onto tokens only (full activity-rings design remains P3 match-cut work by law): track = `color-mix(in srgb, var(--ink) 8%, transparent)` (was a hardcoded ink rgb) · fill stays `--biosignal` · label = Geist Mono 500, `--track-caps-wide`. No off-token color remains in the loader.

## Pitfalls found this lane (inherit)

1. `document.fonts.check()` is false for any face **no DOM node uses yet** even though the file is fine — probe unreferenced faces with `document.fonts.load()` first (bit the font-proof on Clash 400/500).
2. Fontshare's CSS API emits protocol-relative `//cdn.fontshare.com/...` URLs — prefix `https:` before curling.
3. Google Fonts CSS v2 only serves woff2 + unicode-range subsets to a real-Chrome UA string; the latin block is the one whose ranges start `U+0000-00FF`.
4. Font preloads without `crossorigin` double-fetch (fonts are always anonymous-CORS); with it, zero warnings.
5. The impeccable design hook flags Inter/Geist/Fraunces as "overused" — false positive here: the face system is council-locked law (LOOKBIBLE §4, 3/3 ballots). Left un-suppressed deliberately; founder can add a config ignore if the nag annoys.

## Open handoffs

- ~10 `rgb(11 11 12 / …)` literals remain in `.ph__*` / `#materials-inspector` / `#dial-preview` styles — placeholder + dev-only surfaces that die as P2 sections land; each replacing agent should use `color-mix` on tokens as above.
- P2 section agents: build type on the `--type-*` / `--track-*` tokens, never raw px; ghost/tone layers per §4 (30–32% ghost, 55% dim); data numerals get `.tnum` + `--font-mono`.
- P4 copy: the ONE Fraunces moment — `--font-serif`, italic, `font-variation-settings` opsz 144 display / 60 sub, wght 380; ≥40 px.
- engine-smoke check count: 29 reachable locally (CI branch either/or) — if anyone wants the literal "30", split the autoscroll assert; the gate is exit 0 / ALL PASS.
