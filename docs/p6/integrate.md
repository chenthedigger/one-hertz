# P6 lane notes — integrate (final gates + deploy)

Status: **DONE** · 2026-08-27 · lane: P6 integrate
Inputs: gate verdict = empty placeholder (no TUNEs issued) → applied from lane evidence
(docs/p6/{readme,architecture,demo-reel,sanitizer}.md). All four lanes reported DONE;
sanitizer fix list F1–F4 already applied in working tree; D1–D3 are founder decisions,
surfaced below, not resolved here.

## What this lane did

1. **Cross-lane consistency audit** — README media links (`docs/media/{poster.gif,demo-reel.mp4}`)
   match delivered files; ARCHITECTURE.md at root where README links it; og tags in
   `index.html` point at prod URL + `/assets/og.jpg`; `.assetsignore` does not prune og.jpg.
2. **Restored frozen baseline** `evals/results/r0/assert.json` — a P6 lane ran a round-less
   assert (default round r0, target :4173 preview) and clobbered the committed r0 artifact.
   `git checkout --` restored it; this lane's own run went to a fresh round instead.
3. **Full green** (all empirical, this session):
   - `npm run build` (tsc + vite) **clean**.
   - All **seven smokes ALL PASS** vs built preview :4674 (engine, copy, cursor, dial,
     explode, swap, vital) — every smoke's console-error assertions green.
   - **assert 29/29 PASS, 0 fail, 0 skip, gate PASS** (criticals=0, passRate=1.0)
     → `evals/results/p6-integrate/assert.json`.
   - Dist token scan on the rebuilt bundle: `FS 60P`=0, `Nekst`=0, `fps-`=0; `60fps` only in
     the credits end-slate line + the positioning sentence in og/twitter descriptions
     (sanctioned) + one frame-rate comment in a `.js.map` that `.assetsignore` excludes
     from deploy anyway.
4. **Final deploy**: `npx wrangler deploy` → **vd0ce4c3c** (only `index.html` + `assets/og.jpg`
   new — engine bundle byte-identical to v5ce3e87a, no src changed in P6, as intended).
5. **Prod verification**:
   - Edge cache: new index.html live on first poll (no 3-min wait this time).
   - **OG unfurl**: 10 `og:` tags + `twitter:card summary_large_image` on prod;
     `og:image` → `/assets/og.jpg` **200 image/jpeg 55.9 KB**; og:description =
     the fixed positioning sentence + "Built by CHEN."
   - **engine-smoke vs prod: ALL PASS**.
   - **Clean-context verify** (fresh real-Chrome profile, no cache, desktop 1440×900 +
     mobile 390×844 touch UA): http 200, canvas up, 15 tracks, **0 console errors both
     viewports** (scratchpad clean-verify.mjs, live boot, no `?eval`).

Working-tree note: the smoke scripts write their evidence frames into `docs/p3/{explode,swap}`
and `docs/p4/copy` by design, so this lane's gate run refreshed 13 evidence PNGs (byte-level
re-render deltas, same content). They are the evidence of the final green run — commit them
with the P6 work.

## Ship checklist — one line each

**DONE (this repo is ship-ready):**
- [x] README portfolio-grade (PLAN P6 order, positioning sentence verbatim, results tables sourced) — docs/p6/readme.md
- [x] ARCHITECTURE.md ~2 pages, 2 mermaid diagrams verified rendering — docs/p6/architecture.md
- [x] Demo reel 30.1s mp4 (4.4 MB) + poster GIF (4.4 MB <5 MB) + 3 hero stills in docs/media/ — docs/p6/demo-reel.md
- [x] OG image + 10 og: tags + twitter card LIVE on prod, unfurl-ready (curl-verified)
- [x] Sanitizer: secrets/PII/internal-refs/provenance/token-leak all PASS over tree + full 32-commit history; F1–F4 fixed — docs/p6/sanitizer.md
- [x] Build clean · 7/7 smokes ALL PASS · assert 29/29 gate PASS (round p6-integrate) · zero console errors
- [x] Deployed vd0ce4c3c · prod engine-smoke ALL PASS · clean-context desktop+mobile PASS
- [x] GitHub description + 10 topics set (repo still private)

**LEFT before the public flip (orchestrator/founder, not this lane):**
- [ ] **D1** (founder): accept `ubonranto.workers.dev` URL as-is vs custom domain first; then set GitHub homepage URL
- [ ] **D2** (founder): Apple-extracted raw textures in `research/asset-qa/*/textures/` — keep as pipeline evidence vs drop (fold into D3)
- [ ] **D3** (founder, needs explicit OK — history rewrite): ~885 MB public clone — `git filter-repo` slim vs ship-as-is
- [ ] **git commit + push** — local main is 1 commit ahead of origin AND all P6 work is uncommitted working tree (this lane is barred from git ops)
- [ ] Flip repo public (after D1–D3) · then optional: drag-upload demo-reel.mp4 in the GitHub editor for inline playback (marked comment in README)
- [ ] wiki `/save` (PLAN P6 lists it; orchestrator's)
- [ ] Honest caveat carried from P5: **real mid-tier device perf round still owed** (tier2 numbers are desktop-proxy, GPU-unthrottled)
