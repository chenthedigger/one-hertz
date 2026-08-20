# A2 · INTERNALS REFERENCE PACK

> Workstream A2 (PLAN.md §3): exploded-view internals modeled **in-house** — no marketplace or Apple asset contains them.
> Purpose: one self-sufficient reference per part — images, proportions, shape language, finish notes, Blender approach — plus the pre-declared stylized-cutaway pivot language (§9).
> Compiled 2026-08-20 from iFixit teardowns/guides, TechInsights, Lumafield CT, Apple spec sheets. All image URLs verified HTTP 200 on 2026-08-20.

---

## 0) Generation mapping — what each reference actually shows

No full public teardown exists yet for **Ultra 3** or **Series 11** internals (iFixit did an Ultra 3 lens/scratch piece + battery note only; TechInsights' Ultra 3 deep dive is paywalled). Mapping used throughout:

| Our target | Nearest teardown gen | Fidelity of mapping |
|---|---|---|
| **Ultra 3 (49 mm)** | Ultra (2022) + Ultra 2 (2023) iFixit teardowns | **HIGH for layout** — iFixit found Ultra 2 "barely any internal changes" vs Ultra 1; same 49×44×14.4 mm case carries to Ultra 3. Deltas to fake in: battery 2.178→2.313 Wh (~599 mAh), 5G RedCap modem + satellite antenna (invisible at our abstraction), LTPO3 display with ~12 px slimmer bezel. |
| **Series 11 (46 mm)** | Series 10 iFixit/TechInsights teardowns | **HIGH** — same 9.7 mm chassis, same S10 SiP (Apple kept the S10 name in Series 11), battery bump 1.266→1.403 Wh (46 mm). |
| **S-series SiP** | S9 (TechInsights TMQW67 die analysis) | **EXACT for die** — S10 is the same TMQW67-class die/package family; Ultra 3 and Series 11 both ship S10. |

**Device decision hedge**: Spike A leans Ultra 3 — this pack is written Ultra-first, with Series deltas noted inline where they matter.

**Master proportions (the ruler everything is scaled against)**
- Ultra case: **49.0 mm (H, lug-to-lug) × 44.0 mm (W) × 14.4 mm (D)**, titanium, 61.6 g.
- Internal cavity (est. from teardown photos): ~42 × 36 mm footprint, ~9 mm usable depth under the display.
- Ultra display active area: 410×502 px @ 338 ppi → **~30.8 × 37.7 mm** (1.92″ diagonal). Ultra 3: 422×514 px, same glass, slimmer bezel.
- Stacking order top→bottom: sapphire+display laminate → (battery ‖ Taptic Engine ‖ speaker, one plane) → S-SiP plate → back-crystal sensor array. This 4-layer sandwich IS the exploded view's vertical rhythm.
- Sanity cross-check: Lumafield CT of Ultra 3 confirms "every component packed tight" — no air gaps; exploded spacing is our invention, the packed state is real.

**Image caching rule**: before modeling, mirror every URL below into `scratchpad/internals-ref/` (curl). Do **not** commit third-party teardown photos to the repo (go-public sanitizer would flag them); the URLs in this doc are the durable citation.

---

## 1) Sapphire / display laminate

**Reference images**
1. https://valkyrie.cdn.ifixit.com/media/2022/09/26104947/Apple-Watch-Ultra-Opening.jpg — Ultra display lifted, edge-on view of the laminate thickness (Ultra 1)
2. https://valkyrie.cdn.ifixit.com/media/2022/09/26105003/Apple_Watch_Ultra-Open-screen.jpg — display swung open: underside of laminate + cavity beneath (Ultra 1)
3. https://guide-images.cdn.ifixit.com/igi/axQNAc5eTRFbbnkA.huge — screen swung open on flex, underside shield plate visible (Ultra 1, iFixit battery guide step 13)
4. https://valkyrie.cdn.ifixit.com/media/2022/09/26104910/Apple-WAtch-Ultra-Opening-pick.jpg — pick in the seam: shows how proud the sapphire sits above the bezel (Ultra 1)
5. https://valkyrie.cdn.ifixit.com/media/2022/09/24173955/macro_v1_med.jpg — macro of internals through the opened edge (Ultra 1)

**Dimensions / proportions vs 49 mm case**
- Glass slab: full top face of the case minus the raised bezel ring — ~40 × 34 mm, flat (Ultra's sapphire is FLAT, guarded by the raised titanium bezel; Series 10/11 is curved-edge glass, only Ti models sapphire).
- Laminate stack ~2–2.5 mm total (est. from edge photos): sapphire (~1 mm) → OLED laminate with integrated antenna ring (iFixit: antenna is IN the display assembly) → stamped metal backing plate with two flex tails (display + touch) exiting near the crown edge.
- Gap tolerance is character: Series 10 glass-to-case gap is 0.176 mm — visually, glass meets metal with zero shadow line.

**Shape language**: one crisp rectangular slab with a tight corner radius matching the case (Ultra corner R ≈ 7–8 mm est.); underside is NOT glass — it's a brushed/stamped steel plate with kapton patches and two amber flex ribbons. Exploded, it should read as *lid + screen + shield* laminated into one wafer.

**Material / finish (beauty pass)**
- Top: sapphire — near-zero roughness, strong fresnel, faint blue-green edge tint on thickness; screen area = emissive plane (dial subsystem canvas), toneMapped off.
- OLED off-state: pure ink black #060608, slightly warm specular.
- Underside: matte cold-rolled steel (roughness ~0.4, weak anisotropy), 2 orange kapton flexes (see §10 palette), hairline adhesive bead around perimeter (black, matte).

**Blender difficulty: 2/5** — Technique: derive outline from the case's top profile curve (shared curve object with A1 hero!), Solidify + bevel for the slab, separate thin solids for OLED and shield plate; flexes as beveled curves with a subtle S-fall. The laminate must be 3 visibly distinct wafers when exploded — that's the whole show.

---

## 2) Digital Crown assembly

**Reference images**
1. https://guide-images.cdn.ifixit.com/igi/m3ZgASqpEAFYDgaa.huge — crown removed, encoder spindle visible (2015 teardown step 22 — mechanism unchanged in principle)
2. https://guide-images.cdn.ifixit.com/igi/WqSKa24KY4U1TRKk.huge — crown stem + shaft detail (2015 step 22)
3. https://guide-images.cdn.ifixit.com/igi/iexSg4T2BVg1D4uh.huge — crown bracket over the SiP (2015 step 19)
4. https://guide-images.cdn.ifixit.com/igi/Li1O4IwSll513KwU.huge — bracket removed, crown port in case wall (2015 step 19)
5. https://valkyrie.cdn.ifixit.com/media/2022/09/24172826/case_45_corner_3-1-1200x800.jpg — Ultra case corner machining incl. crown-guard region (Ultra 1)

**Dimensions / proportions vs 49 mm case**
- Ultra crown: Ø ~9.5–10 mm × ~4 mm proud of the guard (est. — visibly ~2× the mass of a Series crown), sitting inside a machined crown guard that bulges ~3 mm off the right flank; coaxial knurled outer ring.
- Stem: Ø ~1.5–2 mm shaft passing through a gasketed port; inside: encoder spindle + bracket, total interior depth ~6–8 mm.
- Placement: right side, upper position; side button below it, integrated in the guard; Ultra's orange Action Button lives on the LEFT flank (separate part, not in this assembly, but model the button cap for the exploded line-up).

**Shape language**: a **coaxial stack**: knurled cap → smooth collar with engraved orange ring (Ultra signature) → gasket washer → thin stem → encoder spindle (small striped drum) → L-shaped retaining bracket. Knurl is fine-pitch straight fluting (~60–80 teeth visually), not diamond knurl. Apple patents (US10655988, US11002572) confirm optical encoder: IR emitter + photodiodes reading stripes ON the spindle — a striped micro-drum is authentic, not invented.

**Material / finish**
- Cap + guard: same titanium grade as case (brushed circumferentially on cap face, bead-blasted flanks); **orange anodized ring** inset on the crown collar = the single loudest accent in the whole exploded view (Ultra 1/2/3 signature).
- Gasket: matte black elastomer torus. Encoder spindle: white/black stripe pattern (emissive-adjacent under our light rig). Bracket: bare stamped steel.
- ECG electrode: the crown cap face is itself an electrode — justify a polished (mirror) end face vs brushed sides. Beautiful and true.

**Blender difficulty: 3/5** — Technique: lathe (Screw modifier / spin) for every element; knurl via radial Array of a single groove cutter (boolean or beveled-profile spin with a wave), or displacement on a high-seg cylinder baked to normals. Keep every element a separate object — the crown explodes along its own axis perpendicular to the main stack, which is the exploded view's best "watchmaking" beat.

---

## 3) Taptic Engine

**Reference images**
1. https://guide-images.cdn.ifixit.com/igi/O2r5KUFwY4HHc51F.huge — display off: Taptic Engine + battery in situ (2015 step 9; layout principle identical in Ultra)
2. https://guide-images.cdn.ifixit.com/igi/4CwRmpPTEYEwoVkw.huge — Taptic Engine extracted, joined to speaker (2015 step 14)
3. https://guide-images.cdn.ifixit.com/igi/2KCG6Oao4DERiLsf.huge — Taptic Engine module alone: shell, flex tail (2015 step 14)
4. https://valkyrie.cdn.ifixit.com/media/2022/09/26105003/Apple_Watch_Ultra-Open-screen.jpg — Ultra open: the big Taptic block beside the battery (Ultra 1)
5. OEM part photos (white background, both faces): https://www.ebay.de/itm/146562161764 and https://www.ebay.de/itm/146850665210 (Ultra 2 Taptic Engine listings — mirror images before they rot)

**Dimensions / proportions vs 49 mm case**
- Ultra: **9.8 g — 16% of the watch's weight, 50% heavier than Series 8's 6.4 g** (iFixit). Visually a rounded-rect brick ~28 × 12 × 6 mm (est. from in-situ photos) running the full height of the case's left interior, flank-to-flank against the battery.
- It is the **densest-looking part** in the exploded view — treat it as the "movement barrel" of our horology story.

**Shape language**: rectangular **linear resonant actuator**: seam-welded stainless shell with rounded ends, one long face carrying a stamped part-number relief + spot welds; amber flex tail with a micro connector exiting one corner. Interior (if we open one face for the cutaway): **copper voice coil** (racetrack-shaped, visible winding), **tungsten counterweight block** riding on two **leaf springs** at either end, magnet stack beneath — a piston that shakes a mass side-to-side. iFixit 2015: "Apple's take on the linear actuator… creates motion in a straight line."

**Material / finish**
- Shell: drawn stainless, satin, roughness ~0.35, faint weld-seam darkening at the perimeter; laser-etched matte-white part string.
- Interior: bright wound **copper** (the hero material of the whole internals set — give it the best anisotropy), gunmetal tungsten mass, blued spring steel leafs, one kapton-orange insulator patch.
- Ours ticks at 1 Hz in the Mechanism section (Taptic tick-back, PLAN §2) — the counterweight is the animatable child mesh; name it `taptic_mass` in the GLB.

**Blender difficulty: 3/5 closed / 4/5 opened** — Technique: box-model shell with 2 mm corner bevels; interior coil as a racetrack curve with rectangular bevel profile + Array for winding ribs (bake to normal map for the realtime GLB); counterweight = beveled block; springs = flattened S-curves. Open one long face at a 45° section cut rather than lifting a lid — sells "cutaway", saves modeling the underside.

---

## 4) S-series SiP (S9/S10 class)

**Reference images**
1. https://valkyrie.cdn.ifixit.com/media/2022/09/26102204/Apple_Watch_Ultra-SIP-bracket-1.jpg — Ultra SiP bracket/plate in the case (Ultra 1)
2. https://guide-images.cdn.ifixit.com/igi/AenIEBc3hDC2qIjw.huge — S1 SiP extracted: full resin-potted plate, the canonical "SiP as one part" look (2015 step 20)
3. https://guide-images.cdn.ifixit.com/igi/VSgtiKlDfQ4LTGLK.huge — SiP lift-out, connector field on top (2015 step 20)
4. TechInsights S9 die/floorplan (page-level ref, images paywalled): https://www.techinsights.com/blog/apple-watch-series-9-s9-sip-digital-floorplan-analysis and package analysis: https://www.techinsights.com/blog/apple-watch-series-9-system-package-tsmc-info-pop-package-technology-advanced-packaging-quick
5. S10 package quick-look (die photographs anchor): https://library.techinsights.com/public/hg-asset/278726ab-7506-4184-85d8-05785bc90d20?anchor=Die+Photographs

**Hard facts (for the CALIBRE 1HZ copy + engraving pass)**
- S9/S10 die = Apple **TMQW67**, TSMC **N4P**, **5.6 B transistors** (~60% more than S8), dual Sawtooth cores + 4-core Neural Engine.
- Package: TSMC **InFO-PoP**, PMIC die co-packaged UNDER the processor (a first for Apple), 2 GB DRAM on top, 64 GB NAND on module.
- Ultra 3 & Series 11 both ship **S10** = same die class. Copy can honestly say "5.6 billion transistors at one hertz."

**Dimensions / proportions vs 49 mm case**
- The SiP is not a chip — it's the **entire logic board potted in resin**: a plate spanning nearly the full internal footprint (~38 × 32 mm est.) × ~2–2.5 mm, with connector cutouts, screw bosses, and the crown/button flexes lapping onto it. In the stack it's the thin dark wafer between battery plane and sensor array.

**Shape language**: matte charcoal monolith with softly rounded edges — deliberately mute next to the copper and titanium; top face carries a connector field (3–5 rectangular micro connectors + bracket), laser-etched Apple mark + "S10 SiP" string; edges show a faint layered lamination line (board core peeking through resin).

**Material / finish**
- Body: near-black epoxy **#17181A**, roughness 0.6 — the one intentionally light-absorbing part.
- Accents: bright tin-silver connector blocks, one gold ENIG test-pad row along an edge (PCB gold reads instantly), etched white text.
- **Beauty move**: on longpress/Nocturne, an **emissive die floorplan** glows faintly through the resin at the die's true location (rectangular CPU/NPU block pattern à la TechInsights floorplans) — abstraction, but grounded in the real die layout. Author as a second UV set / emissive texture.
- PCB color decision: real S-SiP shows almost NO green — resin black wins. Save "PCB green" for the stylized pivot (§9) only.

**Blender difficulty: 2/5 (closed plate) — the honest choice.** Technique: plate from the cavity outline curve, inset connector blocks as kit-bashed cubes with 0.2 mm bevels, all markings/floorplan as texture decals (paint in Krita/Photoshop from TechInsights layout refs), normal-map the lamination edge. Do NOT model a de-lidded die (4/5, invisible at our camera distances).

---

## 5) Battery

**Reference images**
1. https://valkyrie.cdn.ifixit.com/media/2022/09/26105338/Apple_Watch_Ultra-battery-removal.jpg — Ultra metal-can battery, Y000 screw tabs (Ultra 1)
2. https://valkyrie.cdn.ifixit.com/media/2022/09/26102339/Apple_Watch_Ultra-Series-7-Comparison.jpg — Ultra vs Series 7 battery size comparison (Ultra 1)
3. https://guide-images.cdn.ifixit.com/igi/VBVmhYbeCRugKdyV.huge — battery lifted from the Ultra cavity (Ultra battery guide step 19)
4. https://guide-images.cdn.ifixit.com/igi/EtfUneRXNhGvP6Qf.huge — battery connector + bracket detail (Ultra battery guide step 15–16)
5. https://valkyrie.cdn.ifixit.com/media/2022/09/26105328/Apple_Watch_Ultra-connector.jpg — battery flex connector macro (Ultra 1)

**Hard numbers (constants file candidates)**
| Model | Capacity | Notes |
|---|---|---|
| Ultra (2022) | **542 mAh / 2.1 Wh** | metal hard-shell can, 4× Y000 screws, adhesive-free |
| Ultra 2 | **564 mAh / 2.178 Wh** | same can, +4% |
| **Ultra 3** | **~599 mAh / 2.313 Wh** | +6% vs U2 (the5krunner/iFixit); Lumafield CT calls it a soft pouch cell — render as pouch in a thin metal carrier |
| Series 9 (45) | 308 mAh / 1.091 Wh | soft pouch |
| Series 10 (46) | 327 mAh / 1.266 Wh | soft pouch, thinner + longer/wider than S9, simple adhesive |
| **Series 11 (46)** | **1.403 Wh** | +10–11% vs S10, largest non-Ultra ever |

**Dimensions / proportions vs 49 mm case**
- Occupies roughly **half the internal footprint** (~30 × 25 × 5.5 mm est.) — the widest single block in the stack, sharing its plane with the Taptic Engine (left) and speaker (edge).
- One corner carries a **case cutout for the flex + pressure relief** (iFixit) — keep that asymmetric notch; it makes the part instantly "real."

**Shape language**: Ultra = rounded-rect **machined/drawn metal can** with two protruding screw ears per side (screw-mounted — unique among Apple wearables), top face carrying a printed spec block + regulatory glyphs, flex ribbon folding over one edge to a board connector. Series = soft **graphite pouch** with crimped side seams, terrace fold at top edge, kapton strips.

**Material / finish**
- Ultra can: light satin steel/aluminum, roughness 0.4, silkscreen white text block (capacity, "Assembled in China", CE glyphs — real text from photos, half-tone size).
- Pouch variant: **graphite** #3A3C3E with micro-wrinkle normal map, specular sheen along wrinkles, **kapton-orange** terminal tape, silver crimp seams.
- Screws: 4 tiny Y000 tri-points — model once, reuse across parts (shared hardware kit).

**Blender difficulty: 1/5 (can) / 2/5 (pouch)** — Technique: rounded cube + inset ears; text/regulatory block entirely as a decal texture; pouch wrinkles = Noise displacement baked to normals. Cheapest part — schedule it first as the A2 pipeline smoke test (model → gltfpack → three.js loadback).

---

## 6) Speaker module

**Reference images**
1. https://guide-images.cdn.ifixit.com/igi/CVbnxTLhLAN5KkBq.huge — speaker module with O-ring (2015 step 15)
2. https://guide-images.cdn.ifixit.com/igi/HkPTfIQ16HEf6a1p.huge — speaker underside, diaphragm side (2015 step 15)
3. https://guide-images.cdn.ifixit.com/igi/4CwRmpPTEYEwoVkw.huge — speaker + Taptic Engine as a joined unit (2015 step 14)
4. https://valkyrie.cdn.ifixit.com/media/2022/09/24170323/Apple_Watch_Ultra-80-edited-1200x800.jpg — Ultra internals rear view, speaker region vs case ports (Ultra 1)
5. Context page (Ultra dual-speaker/86 dB siren claims): https://www.ifixit.com/News/65598/apple-watch-ultra-is-beautiful-rugged-and-repairability-is-just-within-reach

**Dimensions / proportions vs 49 mm case**
- Ultra: **dual drivers, ~50% larger array than Series 8** (iFixit) — a slim bar ~22 × 8 × 4 mm (est.) seated against the LEFT case wall behind the two machined speaker slots; drives phone calls plus the **86 dB siren**.
- Series: single driver, about ⅔ that length.

**Shape language**: flat oblong cassette with a racetrack perimeter, **black elastomer O-ring/gasket** tracing its outline (the water seal — Ultra is the "bilge pump": 165 Hz tones physically pump water out through the grille). One face = fine mesh/ported openings matching the case's exterior slots; short flex with spring-contact pads rather than a connector. Reads as "sealed instrument," pairs visually with the Taptic brick.

**Material / finish**
- Body: glass-filled black polymer, roughness 0.55, faint mold parting line; steel mesh insert (normal-mapped weave, slight moiré is fine at macro).
- O-ring: soft matte black, roughness 0.9 — one of the few pure-soft materials, nice contrast beat.
- Water story hook: in the exploded view, the speaker's callout line can carry the copy "the speaker is also the pump" — real, and on-thesis (a heart pumps).

**Blender difficulty: 3/5** — Technique: racetrack profile curve → solidify; grille = Array of capsule cutters (boolean) OR pure normal/alpha decal (preferred for the realtime GLB — the holes never silhouette); O-ring = beveled curve following the same profile (shared curve = free precision). Diaphragm face only if a camera ever sees the underside — check the section's camera path first.

---

## 7) Back-crystal sensor array

**Reference images**
1. https://guide-images.cdn.ifixit.com/igi/PbMQVa33wlHuB1Ol.huge — Ultra sensor assembly removed, full module (Ultra sensor guide step 14)
2. https://guide-images.cdn.ifixit.com/igi/gaEHKXFWYhvYxWHW.huge — sensor assembly swung open: inside face, coil + flexes (Ultra sensor guide step 12)
3. https://guide-images.cdn.ifixit.com/igi/451XcGJaUyAr1bTr.large — assembly lifted, showing the two cables and cavity seat (Ultra sensor guide step 11; `.huge` 403s for this one GUID — use `.large`)
4. https://valkyrie.cdn.ifixit.com/media/2022/09/24165540/apple_watch_ultra_back_buttons.jpg — exterior: back crystal, lens bosses, band-release buttons (Ultra 1)
5. https://guide-images.cdn.ifixit.com/igi/I3nqM5aK1XSdDDfn.huge — the original "pulse-pounding sensor action. And lenses." macro (2015 step 23 — optical layout lineage)
6. Ultra 2 rear-case macro + 240× sensor-lens diffusion coating photos: https://www.ifixit.com/News/83225/apple-watch-series-9-and-ultra-2-teardowns

**Dimensions / proportions vs 49 mm case**
- The whole back is the part: a disc ~36 mm Ø (est.) rising ~1.5 mm domed at center, sitting in the case's rear opening on a foam ring (Ultra 2 revised to a **substantial full foam ring** — iFixit).
- Center cluster: raised circular sapphire island ~18–20 mm Ø carrying **4 LED clusters + 4 photodiode windows arranged radially** around a center (3rd-gen optical heart sensor: green/red/IR), each under its own small convex lens boss with a **bubbly diffusion coating** (iFixit 240× macro).
- Around the cluster: the **wireless-charging coil** — a flat copper annulus visible from the inside face; on the Ultra the ring zone is ceramic composite with the engraved spec text ring.
- Ultra extra: **depth-gauge port** — a tiny gasketed aperture; keep it, it's the diver-instrument detail.

**Shape language**: a **radial mandala** — the only circular composition in a rectangular product, and the natural hero of the exploded view's final layer (it's also our Nocturne organ: the 1 Hz heart sensor). Outside face: concentric rings (ceramic ring → engraved text ring → sapphire dome → 4+4 lens bosses in X arrangement). Inside face (verified against guide photo PbMQVa33wlHuB1Ol): **segmented dark blue-grey foam tiles** covering most of the plate (Ultra 2-style substantial foam ring), a central round sensor stack with fine **copper jumper wires**, gold contact pads at the rim, oblong band-release cutouts top/bottom, P5 screw holes at 4 corners — the charging coil sits BENEATH the foam, so show copper only at the central stack unless we peel a foam tile as a cutaway beat (recommended: peel one tile, reveal a coil arc).

**Material / finish**
- Sapphire island: glassy, IOR 1.77, slight green-edge; lens bosses get the diffusion micro-normal ("bubbly" per iFixit) so highlights bloom softly.
- LED wells: emissive — **green #30D158 clusters, red/IR as deep #FF453A + near-black maroon** — these literally light up at 1 Hz in Nocturne; author emissive masks now.
- Ceramic ring: warm off-white subsurface hint (matches PLAN's material spec sheet), engraved text as normal decal ("49MM · WR100 · EN13319" ring, verbatim from rear-case photos).
- Inside face: **copper coil** (second copper beat, rhymes with the Taptic coil), silver shield can, white polymer carrier.

**Blender difficulty: 4/5 — the flagship part.** Technique: everything is a surface of revolution + radial Array — build one lens-boss + LED-well group, Array ×4 around Z with a 45° offset for photodiodes; coil = Archimedean spiral curve with rectangular bevel (bake to normals for realtime); engraved ring text via Curve-on-path text → boolean at high res, baked down. Budget the most look-dev time here: it must survive the Nocturne close-up.

---

## 8) Shared kit + naming (build once, reuse)

- **Hardware kit**: Y000 tri-point screw, P5 pentalobe screw, 3 flex-ribbon presets (straight / S-fold / spiral), micro board-connector block, black gasket profile. One blend-file library.
- **Kapton orange** (#C77E3A→#E8963F ramp w/ translucency), **copper** (anisotropic 0.6, tint #B0673F→#E2A15C), **graphite pouch**, **resin black**, **bare steel** — author as 5 shared materials; per-part materials inherit.
- GLB node names (raycast contract, PLAN §3 `-kn`): `part_display`, `part_crown`, `part_taptic` (+child `taptic_mass`), `part_sip`, `part_battery`, `part_speaker`, `part_sensor`. Suffix `_proxy` for hitbox meshes.
- Modeling order = risk order: battery (pipeline test) → SiP → display laminate → speaker → Taptic → crown → sensor array (hardest, most look-dev).
- Source beat we must outdo: the original site ships **one placeholder description for all 6 exploded parts** (PLAN §1). Every part above already carries a true, specific fact for its copy line — hand this table to P4.

---

## 9) STYLIZED CUTAWAY PIVOT (pre-declared fallback — a style, not a retreat)

Trigger: A2 fails the P1.5 beauty council. What ships instead is a **designed schematic language** — think *horology catalog plate × patent drawing × Swiss instruction diagram*, executed in 3D. Declared now so the pivot is a costume change, not a redesign.

**Abstraction level**
- Every part becomes its **platonic solid + one signature feature**: Taptic = brick + visible copper racetrack coil; sensor = disc + 4+4 lens bosses; crown = knurled cylinder stack; SiP = wafer + glowing floorplan; battery = pouch silhouette + terrace fold; speaker = racetrack + grille hatching; display = 3 offset wafers.
- Rule: **silhouette must identify the part at 100 px**. No sub-part smaller than 0.8 mm survives; fasteners drop entirely except ONE ceremonial screw per part.
- All bevels one radius family (0.4 / 0.8 / 1.6 mm) — the "drawn with one pen" feel.

**Materials & palette** (subset of the look-bible ramp + two semantic chips)
- Body ceramic: matte porcelain **#EDEDEB** (the stage color — parts feel carved from the site itself), AO-only shading, zero texture.
- Ink linework: **#0B0B0C** — edge/crease lines rendered as geometry-follow curves or an inverted-hull line pass, plus dimension leaders and section-hatch (45° hatching on every cut face — THE cutaway signifier).
- Semantic chips (color = meaning, used nowhere else): **copper #C97E4F** wherever electricity moves (coils, contacts), **kapton #E8963F** wherever a flex bends, **biosignal red #FF2D55** exclusively for the 1 Hz elements (LED wells, taptic mass, ECG crown face).
- Optional 4th: PCB **green #1E5C48** for the SiP wafer edge — the one place "circuit board green" is allowed in the whole project.

**Typography & annotation** (inherits site type system)
- Geist Mono tabular for dimension callouts (`Ø9.8 · 9.8 g · 1 Hz`), hairline leader lines with 90° elbows, part numbers as engraved-style labels (`01 CROWN`, `02 TAPTIC`…).
- Annotations are DOM (projected via HOVER_POSITION like the source's Details labels) — the 3D stays clean.

**Light & motion**
- Single soft top-key + faint floor bounce; NO env reflections (matte world) — shadows do the modeling.
- Parts explode along drafting axes only (pure X/Y/Z, no arcs); hover = the part's ink lines redraw (stroke-dashoffset feel in 3D via a dash-texture scroll); the 1 Hz elements pulse the red chip.
- Section cuts always 45°, always hatched, always facing camera-left — consistency IS the style.

**Why this can win the council**: it trades photoreal risk for authored graphic confidence — the same trade the source site makes with its flat #EBEBEB stage. It also makes the copy table (§8) carry more of the beauty load, which is already built.

---

## Sources

- iFixit — Apple Watch Ultra teardown: https://www.ifixit.com/News/65598/apple-watch-ultra-is-beautiful-rugged-and-repairability-is-just-within-reach
- iFixit — Series 9 / Ultra 2 teardowns: https://www.ifixit.com/News/83225/apple-watch-series-9-and-ultra-2-teardowns
- iFixit — original Apple Watch teardown (Taptic/crown/speaker construction): https://www.ifixit.com/Teardown/Apple+Watch+Teardown/40655
- iFixit guides — Ultra battery: https://www.ifixit.com/Guide/Apple+Watch+Ultra+Battery+Replacement/153358 · Ultra sensor assembly: https://www.ifixit.com/Guide/Apple+Watch+Ultra+Sensor+Assembly+Replacement/153483 · open procedure: https://www.ifixit.com/Guide/How+to+Open+Your+Apple+Watch+Ultra/153357
- MacRumors — Ultra teardown summary: https://www.macrumors.com/2022/09/26/apple-watch-ultra-teardown-ifixit/ · Ultra 2/S9: https://www.macrumors.com/2023/09/24/apple-watch-ultra-2-and-series-9-teardowns/ · Series 10: https://www.macrumors.com/2024/10/07/ifixit-shares-apple-watch-series-10-teardown/
- 9to5Mac — Series 10 teardown: https://9to5mac.com/2024/10/07/ifixit-teardown-shows-whats-inside-the-apple-watch-series-10/
- the5krunner — Ultra 3 teardown notes (battery 2.313 Wh, DLC/PVD 6 Mohs): https://the5krunner.com/2026/02/05/apple-watch-ultra-3-teardown/
- TechInsights — S9 floorplan (TMQW67, N4P, 5.6 B transistors): https://www.techinsights.com/blog/apple-watch-series-9-s9-sip-digital-floorplan-analysis · S9 InFO-PoP package: https://www.techinsights.com/blog/apple-watch-series-9-system-package-tsmc-info-pop-package-technology-advanced-packaging-quick · S10 die photos: https://library.techinsights.com/public/hg-asset/278726ab-7506-4184-85d8-05785bc90d20?anchor=Die+Photographs · Series 10 teardown: https://www.techinsights.com/blog/apple-watch-series-10-teardown · Ultra 3 deep dive (paywalled): https://www.techinsights.com/blog/apple-watch-ultra-3-5g-a3281-deep-dive-teardown
- Lumafield CT of Ultra 3 (599 mAh pouch, packed construction) via Cybernews: https://cybernews.com/tech/ct-scan-devices-dupes/
- Macworld — Series 11/SE3 battery Wh from safety filings: https://www.macworld.com/article/2910975/apple-watch-series-11-and-se-3-significantly-larger-batteries-than-their-predecessors.html
- Apple — Ultra 3 tech specs: https://support.apple.com/en-us/125095 · Series 11 tech specs: https://support.apple.com/en-us/125093
- Apple optical-encoder patents (crown mechanism): US10655988, US11002572, US10936071 (image-ppubs.uspto.gov)
- Engadget — Ultra teardown (speaker/siren context): https://www.engadget.com/apple-watch-ultra-teardown-repairability-194119750.html
