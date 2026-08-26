# P6 · sanitizer + repo hygiene — gate to public

Date: 2026-08-27 · Lane: sanitizer · Scope: working tree + **full git history** (32 commits, `--all`)
Method: `git grep` over tracked tree; `git log -p --all` patch-stream sweeps (binaries excluded);
`git rev-list --objects --all` blob inventory; live-prod curl checks.

## Verdict up front

**5 PASS · 1 FLAG (repo weight) · 3 founder decision items.** No secrets, no PII, no internal
refs, no raw third-party archives anywhere in history. The one real problem is size: the public
clone is **~885 MB** (evidence PNGs in `docs/`, research renders, eval refs). Everything safely
fixable was fixed in the working tree (uncommitted — this lane does not commit); the rest is
listed as decisions below.

## 1) Secrets / PII — **PASS**

- **Secret tokens**: zero hits, tree AND full history patch-stream. Patterns: OpenAI `sk-`,
  GitHub `ghp_`/`github_pat_`, AWS `AKIA`, Slack `xox*`, Google `AIza`, private-key blocks,
  bearer tokens, CF-token shapes. Only hit repo-wide: the commented placeholder in
  `.env.example` (`# EXAMPLE_API_KEY=`).
- **.env**: never committed (history object list: `.env.example` only). Ignore rules correct
  (`.env`, `.env.*`, `!.env.example`, `*.pem`, `*.key`).
- **Emails**: zero non-intended addresses in tree or history. The only email anywhere is the
  CHEN noreply (`63953889+chenthedigger@users.noreply.github.com`) as author+committer on all
  32 commits — authorship 32/32 correct, no personal email ever used.
- **CI**: `.github/workflows/ci.yml` references no secrets (only `BASE: http://localhost:4573`).
- **Absolute paths**: 4 occurrences of `/Users/simon` in committed sources — **FIXED** (paths
  now derived from script location; syntax-checked, resolve verified):
  - `evals/reference/source/capture-scripts/lib.mjs` (`OUT` via `import.meta.url`)
  - `research/lookdev/instrument/scripts/{grade_and_render,postprocess_gallery,render_gallery_masters}.py`
    (`REPO` via `__file__`)
  - History still carries the 4 old blobs. `/Users/simon` in a personal repo = accepted;
    flagged count: **4 blobs, 4 files, nothing else** (no other usernames, no paths outside
    the repo).

## 2) Internal refs (RANTO / Miska / DAIJAI / startup) — **PASS**, 1 decision

- Standalone `RANTO` / `Miska` / `DAIJAI` / `~/startup`: **ZERO** in tree and in full history.
- The only `ranto` substring is the deploy domain **`one-hertz.ubonranto.workers.dev`**
  (personal Cloudflare account subdomain): 10 tree occurrences (`CLAUDE.md`×3, docs lane
  notes ×7) + README/badges + 15 in history diffs.
- **DECISION D1 (founder)**: the workers.dev subdomain publicly ties the CHEN portfolio
  identity to "ubonranto". Risk: LOW (account name, not client data — only legible to
  insiders). Options: (a) accept as-is; (b) attach a neutral custom domain to the worker and
  make it the canonical README link before flipping public (workers.dev subdomain rename
  affects every worker on the account — not recommended). Text-scrubbing is pointless while
  the live URL itself carries the string.

## 3) Asset provenance — **PASS**, 1 decision

- `research/assets-candidates/` (raw Apple USDZs + any archives): **zero commits touch it**
  (`git log --all --full-history -- research/assets-candidates` = empty). Ignored since
  commit `e4c86a4` (pre-asset work). The only `.usdz` ever committed is
  `research/smoke/torus.usdz` — a self-made toolchain smoke primitive.
- **dika3d / marketplace purchases: never made** (founder decision 2026-08-26, no
  Alpine/Trail) → zero marketplace-licensed bytes anywhere in the repo, tree or history.
- Internals `.blend`/`.glb`: in-house modeled (CHEN, from iFixit references). Clean.
- Stock HDRI `public/assets/env/studio_small_03_2k.hdr`: Poly Haven **CC0**, attributed in
  `src/gl/env.ts`, excluded from deploy (`public/.assetsignore`; **confirmed 404 on prod**,
  site 200). Consistent with the "zero stock pixels in the shipped env" credit — it is a
  dev-only fallback. No action needed (CC0 needs no attribution; we attribute anyway).
- **DECISION D2 (founder)**: `research/asset-qa/{ultra-3,series-11}/textures/` contains raw
  texture maps **extracted verbatim from the Apple USDZs** (incl. Wayfinder 1024px dial JPG,
  Series Flow 2048px dial PNG), tracked and public-bound. This is inside the accepted
  takedown tail-risk (founder directive 3) but goes beyond PLAN's "ship processed GLB only,
  never raw source archives" letter. Options: (a) accept — it is the pipeline-evidence story
  ARCHITECTURE.md tells; (b) drop the two `textures/` dirs before public (true purge needs
  the D3 history rewrite anyway). Recommendation: fold into the D3 decision.

## 4) Heavy-dir hygiene — **FLAG** (main finding), 1 decision

- Ignore rules verified live (`git status --ignored`): `research/assets-candidates/`, source
  reference captures (`evals/reference/source/{desktop,mobile,videos,interactions}`),
  `evals/reference/ours/`, judge packs, draft GLBs, `dist/`, `node_modules/` — all excluded. ✔
- **Repo weight: `.git` was 918 MB of loose objects (never gc'd). Ran `git gc` (safe — packs
  objects, no history change): now 1 pack, `size-pack` = 885.38 MiB** → public clone ≈ 885 MB.
- Where it lives (tracked at HEAD = 859 MB): `docs/` **464 MB** (p2 247 + p4 191 — gate
  evidence PNGs), `research/` **209 MB**, `evals/` **164 MB**, `public/` 18 MB, `src/` ~0.
  487 PNGs, 27 GLBs, 7 `.blend` + **7 `.blend1` Blender auto-backups (27 MB, pure waste)**.
  No single file >50 MB → GitHub hard limits fine; clone UX is the cost.
- **FIXED** (working tree): `.gitignore` now blocks `*.blend1`, `.wrangler/`, `.impeccable/`.
  (Tracked `.blend1` stay tracked until removed — see D3.)
- **DECISION D3 (founder — never rewriting history without OK)**:
  - (a) **Ship as-is**: honest full history, ~885 MB clone. Zero risk, heavy UX.
  - (b) **`git filter-repo` slim before public** (force-push; invalidates clones): strip
    `*.blend1` + superseded heavy evidence (e.g. `docs/p2`/`docs/p4` PNG dumps, old draft
    GLB generations) with a curated keep-list of the stills README/ARCHITECTURE actually
    link. Est. clone well under 200 MB. Keeps the commit narrative intact (messages
    unchanged).
  - (c) Squash-fresh public history — rejected: kills the build-story log (commit-narrative
    rule).
  - Recommendation: **(b)**; if authenticity-of-bytes outranks clone weight, (a) is
    defensible for a showcase whose evidence *is* the point.
- **Cross-lane note**: `docs/media/` is empty; README already links
  `docs/media/{poster.gif,demo-reel.mp4}` (dangling until the reel lane lands). Keep the
  in-repo mp4 small or use the GitHub drag-upload embed the README comment already plans —
  don't add another 50 MB right after slimming.

## 5) Token-leak final (`FS 60P` / `Nekst` / `fps-`) — **PASS**

- `src/` + `index.html` + `public/`: zero `FS 60P`, zero `Nekst`, zero `fps-` identity
  strings. (One innocuous frame-rate comment "approximate at 60fps" in `src/dial/preview.ts`.)
- `dist/` (shipped bundle): exactly **one** `60fps` occurrence = the credits end-slate line
  `design language · "The Watch" by 60fps` — the intended credit. Nothing else.
- `evals/**/ballots.json` mention "FS 60P"/"60P glyphs" as blind-judge evidence *describing
  source frames* — eval data, allowed bucket (docs/evals), not product surface.

## 6) Commit narrative — **PASS**

`git log --oneline` (32 commits) reads as a clean build story: scaffold → PLAN v3 → founding
docs → engine spike → infra claim → rubric freeze → research/toolchain → engine/gl/ui/dial →
eval harness → CI hardening (3 honest `fix(ci)` commits, root-caused not spammed) → asset QA →
P1 integrate → P1.5 lookdev council → P2 waves → P3 mechanics → P4 hardening → P5 gates.
Conventional-commit prefixes throughout, every message carries outcomes/numbers, **zero WIP
spam**, no reverts, single branch `main`. Nothing to fix.

## 7) GitHub repo settings readiness — **DONE** (reversible metadata, repo still private)

- Default branch: `main` ✔ (only branch; local `main` is **1 commit ahead of origin** —
  P5 commit `610abd9` unpushed; push is the integrate lane's call).
- **Description set**: "ONE HERTZ — a web-craft study of 'The Watch' by 60fps, product
  swapped to a faithful Apple Watch, with a measured likeness + beauty eval. Vanilla TS +
  three.js + GSAP + Lenis, no framework."
- **Topics set** (10): `scrollytelling threejs webgl gsap lenis typescript vite
  creative-coding apple-watch evals`.
- Homepage URL: **left empty pending D1** (set to the canonical live URL once decided).
- Visibility: PRIVATE ✔ — flip to public only after D1–D3 resolved + README/reel lanes land.

## Fix list (state)

| # | Item | State |
|---|---|---|
| F1 | 4× `/Users/simon` absolute paths in committed scripts | **fixed** (working tree, verified) |
| F2 | `.gitignore`: `*.blend1`, `.wrangler/`, `.impeccable/` | **fixed** (working tree) |
| F3 | Loose-object bloat, never gc'd | **fixed** (`git gc`: 918 MB loose → 885 MB pack) |
| F4 | GitHub description + topics empty | **fixed** (set via `gh repo edit`) |
| D1 | `ubonranto.workers.dev` ties portfolio to account name | founder decision |
| D2 | Apple-extracted raw textures in `research/asset-qa/*/textures/` | founder decision (fold into D3) |
| D3 | 885 MB public clone → filter-repo slim vs ship-as-is | founder decision (**never rewritten without OK**) |
