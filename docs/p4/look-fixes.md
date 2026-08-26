# P4 lane notes — look fixes + gate:p3 tunes

Status: **DONE — 13/13 gate items closed, GLB mottling fixed at the source, instrument.json edits co-signed** · 2026-08-26 · lane: P4 look-fixes
Law: `docs/LOOKBIBLE.md` + `docs/p15/motion-bible.md` + founder 2026-08-26 (recolor-only colorway axis) · `sections/index.ts` untouched · evidence in `docs/p4/look-fixes/` (before/after pairs where the defect was visual).

Verified empirically on the FINAL tree (which other P4 lanes were editing concurrently — see "Concurrency" below):
`npm run build` (tsc strict + vite) clean · **all six smokes ALL PASS run serially** (engine 29/29 · dial · cursor · vital · swap · explode — headless real Chrome, playwright-core `channel:"chrome"`, vite preview **:4640**, this lane's own port) · **`node evals/assert.ts` 28/29 PASS, 0 FAIL, 1 SKIP, gate PASS (criticals=0, passRate 0.966)** → `evals/results/p4-look-fixes/assert.json` (the SKIP is the standing `longpress-lenis-stop` schema-v1 item, P5 council) · zero console errors on every capture pass, both viewports.

## 1 · The 13 gate:p3 tune items — disposition

| # | Item | Fix | Evidence |
|---|---|---|---|
| 1 | **Intro** — live entrance numeral bloom | Screen-emissive ramp rides the 2 s entrance chain: 60% → authored 2.1, `power2.in` (soft through the tumble, arrives with the settle), exact restore on complete. Live-only by construction — eval boots settled, captures untouched. `src/sections/intro.ts` | `x-intro-live-350ms-before/after.png` — the match-cut frame goes from blown numerals to a controlled ink dial |
| 2 | **Movement** — NEURAL ENGINE over the board corner | Rail 54%→58% top (+4vh) + per-block feathered porcelain ellipse (§7.1 ground-token grammar — invisible on bare porcelain, manifests exactly where the animated board passes). `src/sections/movement.css` | `d-movement-70-before.png` / `movement-70.png` |
| 3 | **Hands** — flank mottling | Fixed at the GLB source — see §2 | `hands-75-before-mottling.png` / `hands-{50,75,92}.png` |
| 4 | **Straps** — third grey-ramp line at .25 | Per-line ramp floor: line 3 starts at 40%-ink-on-porcelain `0x8f9193` (§7.5, the "WOVEN,"/40% rule) + a feathered porcelain backing on the body block that rides its own opacity (arrives .12, departs .32 — the band macro stays unwashed at every other beat). `src/sections/straps.ts`, `straps.css` | `straps-25.png` |
| 5 | **Images** — gallery Cycles masters | **Delivered by the parallel P4 asset lane during this lane's run** (2026-08-26 21:38: all four config sets re-rendered under the new real-Apple-Ocean ids, `public/assets/gallery/*`). Verified real Cycles frames (crown-knurl DOF etc.). Not re-done here — noted as closed. | gallery files, mtime 21:38 |
| 6 | **Colors** — DAYBREAK tag lozenge | 38%→30% ink + tighter vertical falloff (50%×44% ellipse, still alpha-0 inside the box). `src/sections/colors.css` | `colors-06.png` |
| 7 | **Parts** — picker card under the vital chip | Card rest position dropped 48 px (`top: calc(7svh + 48px)`) — trace/BPM/mute never touch the card bounds at .5–1. Mobile bottom anchor untouched. `src/sections/parts.css` | `d-parts-50-before.png` / `parts-50.png`, `parts-97.png` |
| 8 | **Footer (mobile)** — m-Footer-100 break | Portrait remap in the lineup camera (see §3). Watches sink to ~71% frame height (clear of FIN), row narrows to the 92vw label rail's column grid (labels land under watch centers), per-slot shadows follow. `src/sections/footer.ts` | `m-footer-100-before.png` / `m-footer-100.png`, `m-footer-90.png` |
| 9 | **Footer (desktop)** — chip × TOTAL WEIGHT at ~.9 | Collision-policy yield (see §3) — chip whispers at 0.12 opacity through the Parts-table sweep (p .5–.97), fully restored for the p=1 destination frame. | `d-footer-90-before.png` / `footer-90.png`, `footer-100.png` |
| 10–12 | **debug-API ×3** (deeplink landing, contract surface, cursor probe + bare-vh) | **Already closed by the P3 integrate lane** (docs/p3/integrate.md) — verified here on the final tree: `deeplink-params` 4/4 PASS (?scroll=Timeless lands Timeless), `mobile-svh-dvh` PASS (0 bare-vh, touchResizeFilter exposed), `sections-14-order` PASS (sourceRole), `cursor-text-states` PASS. | `evals/results/p4-look-fixes/assert.json` |
| 13 | **Cursor** — chip parks on labels | Tag-chip placement: the finish-swatch chip always, plus any icon sent with the new additive `place:"tag"` payload field, floats ~58 px above the pointer with the dot kept at 0.6 scale as anchor. MWR rows emit `{icon:"select", place:"tag"}`; explode part-hover keeps the centered default (it hovers geometry, not labels). `src/ui/cursor/cursor.{ts,css}`, `src/core/events.ts`, `src/sections/movementwatchright.ts` | `x-outro-hover-chip.png`, `x-mwr-hover-chip.png` |

## 2 · Case-flank "baked-texture" mottling — root cause was NOT a baked texture

Empirical chain (A/B looks served from dist, one variable each):
1. Every `mat_titanium_case` map in the draft GLB is FLAT (base = solid #a3a3.., mr = 51×51 rough 128–132/metal 255, normal = uniform lavender + fine noise). The "tarnish" could not be albedo.
2. Red-painting `mat_titanium_case` turned the flank red WITH dark smudges intact → the defect lives on that material's surface response.
3. `roughness 0.95` A/B killed the smudges → they are REFLECTION-borne.
4. **Root cause: the 512² noise normal map** — its per-texel jitter, block-compressed by KTX2/UASTC, clumps the instrument env's dark zones into large tarnish-like reflection patches at macro framing. Same defect class as LOOKBIBLE material law 1 (case aniso ban: noisy tangent-space data reads as marbled noise).

**Fix at the source**: `research/asset-qa/scripts/flatten_case_normal.py` — in-place surgery on `ultra-3-draft.glb` (image 7 → 8×8 flat +Z normal PNG, zero-padded in its own slot; no bufferView moves; asserts single-user bufferView + material identity) → `~/.local/bin/gltfpack -tc -kn -cc` → `public/assets/watch/ultra-3.ktx2.glb` (1.186 MB, was 1.239 MB). The machined-satin story stays carried by roughness 0.38 + the streak lightformers + post grain 0.048, per the bible's own doctrine.

Verified: Hands .5/.75/.92 read machined satin titanium (ports, chamfer, orange button own the frame — the target verbatim); Curves .5 / MWR .5–.75 case edges clean; dial + node names + screen UV transform intact (engine-smoke 29/29, dial-smoke PASS, explode roster 39/39 on the re-encoded GLB).

## 3 · Vital-chip collision policy — ONE owner (the gate's continuity ask)

`LivingVital` gains `getYield()` (0..1, pure function of scroll): main.ts probes the measured Footer span each frame — desktop p ∈ [.5, .97] (the Parts table's end-clamped pin sweeping the top-right, TOTAL WEIGHT bar included), portrait p ≥ .85 (end-slate label rail). CSS `.is-yield` dims to 0.12; the 0.35 s transition rides `.is-settled`, added only after the LIVE reveal — under `?eval=1` toggles are instant, so captures stay deterministic. Bounds re-learned on resize-settle. Parts itself needed no dim — dropping the card (item 7) cleared that corner spatially.

## 4 · instrument.json data edits — look-lane co-sign (tune-w3w4 flag 1)

**CO-SIGNED**, both verified on fresh final-tree frames:
- **Hands `envRotationDeg` 245** (225→245, sweep-picked): crystal reads as glass with one controlled specular through .5–.92; arc stays monotonic (MWR 200 < 245 < Straps 250). With the flat case normal the flank now also holds clean at 245 — no re-tune needed. Evidence: `hands-{50,75,92}.png`.
- **Per-key `bloomStrength` dips** — Colors .22 / Parts .25 / Footer .30: ink dials with individually resolvable markers + complication rings at plate standoff (`colors-85.png`), card-slot scale (`parts-50/97.png`), row scale (`footer-90/100.png`). Nocturne 0.85 hot-dial beat unaffected (`nocturne-50.png`).

## 5 · Images bgStage ramp-earlier (keyframe-driver handoff, closed)

Driver schema gains optional per-key **`anchorOffset`** (fractions of the owning section's raw range, added to the center anchor) — `src/gl/lightKeyframes.ts`. `instrument.json` Images key ships `anchorOffset: -0.05`: the porcelain→Nocturne bgStage ramp starts one beat sooner, so the exit strap grounds on a visibly staged ramp at .9 (`images-90.png`). Safe by construction: the Straps→Images segment is value-flat, so only the outgoing ramp moves; Nocturne's own center continuum is untouched (`nocturne-50.png` unchanged).

## 6 · Concurrency note (P4 ran as parallel lanes in ONE working tree)

The copy/colorway lane was live-editing sections and `instrument.json` during this lane (band ids renamed to real Apple Ocean colors — Anchor Blue / Black / Neon Green; Straps copy WOVEN→MOLDED; the asset lane dropped the gallery Cycles masters mid-run). All edits here were made with fresh-read + exact-anchor patches; the final gates (build, six smokes, assert) ran on the COMBINED tree and are green. Baseline captures in the evidence folder predate some copy-lane changes — the before/after pairs isolate this lane's deltas, not theirs.

## Pitfalls found this lane (inherit)

1. **"Baked-texture" gate verdicts deserve a channel A/B before texture surgery** — red-paint + roughness-sweep isolate albedo vs reflection in minutes; the actual culprit (noise normal × KTX2 block compression × dark env zones) had flat albedo. The look-override JSON (`?look=` served from dist) is a free per-material A/B harness — no rebuild per hypothesis.
2. **The colorway system re-seeds its live cache from `x_colorway` tables at look load** — `state().materials` then reports the TABLE values, not the material instance; don't use it to verify a materialOverrides A/B (read the frame instead).
3. **In-place GLB image surgery beats repacking**: writing the replacement PNG + zero padding into the ORIGINAL image slot keeps every bufferView offset valid — no glTF rewrite, and gltfpack re-encodes cleanly on top.
4. **Fixed chrome needs an owner-level yield policy, not per-section dodges** — the vital chip now has one probe (scroll-pure, eval-deterministic) that any future corner conflict can join with a window, instead of a third local hack.
5. **Concurrent-lane trees make single-run FAILs suspect** — assert's explode-tap FAIL mid-session vanished on the final serial re-run; re-run gates on the settled tree before believing them.

## Handoffs / open

- **P5 council**: `longpress-lenis-stop` schema-v2 decision (standing) · beauty council re-captures should refresh `evals/reference/ours` (this lane changed Hands/Movement/Straps/Colors/Parts/Footer/Intro frames by design; reference refresh is the integrate/council lane's canonical step).
- **Copy/colorway lane**: mobile outro model labels wrap to two lines ("ANCHOR BLUE") while others sit one — their label-length call under the new naming.
- Chip yield windows are data in `main.ts` (`getYield`) — if Parts' picker ever moves back up, add a Parts window there rather than re-dropping the card.
