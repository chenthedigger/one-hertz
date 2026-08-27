# Git history slim — surgical filter-repo pass (D3)

Date: 2026-08-27 · Tool: git-filter-repo 2.47.0 (pip3 --user) · Local rewrite only, nothing pushed.
Resolves sanitizer finding D3 (`docs/p6/sanitizer.md`): superseded heavy blobs pinned in
pack history + Apple-extracted raw texture dirs + `.blend1` Blender auto-backups.

## What was done

One `git filter-repo` pass over the full history (36 commits):

1. **`--strip-blobs-with-ids`** — 122 blobs ≥ 512 KB whose object IDs are **not** reachable
   from the HEAD tree (superseded historical versions only: old capture PNGs, replaced
   GLB/blend exports, old A/B render takes). HEAD content untouched by this filter —
   verified by construction (strip set ∩ HEAD blob set = ∅, asserted before rewrite).
2. **`--invert-paths`** on `research/asset-qa/series-11/textures/`,
   `research/asset-qa/ultra-3/textures/`, and glob `*.blend1` — removed from **all**
   history *including* HEAD (intentional: Apple-extracted raw textures must not ship in a
   public repo; `.blend1` are pure backup waste, already gitignored since the sanitizer pass).

Then `git reflog expire --expire=now --all && git gc --prune=now --aggressive`.
`origin` re-added (filter-repo removes it by design). Backup of the complete pre-slim
history: `../one-hertz-preslim.bundle` (882 MB, `git bundle verify` OK, all 3 refs).

## Before / after

| Metric | Before | After |
|---|---|---|
| `.git` size | 945 MB | **630 MB** (single 620 MB pack ≈ clone transfer) |
| Commits | 36 | 36 (messages + order byte-identical) |
| HEAD | `ef8b2652505c` | `91cc347525bf` (sha changes; content identical minus removals) |
| Tracked files | 786 | 753 (−26 textures, −7 `.blend1`, nothing else) |
| History-only blobs stripped | — | 122 blobs, 265.5 MB uncompressed |
| Removed from HEAD | — | 33 files, 34.1 MB (textures 7.0 MB + `.blend1` 27.1 MB) |

### Stripped history blobs by area (122 blobs, 265.5 MB uncompressed)

| Area | Blobs | Size |
|---|---|---|
| `docs/p2` | 41 | 107.6 MB |
| `research/internals-models` | 24 | 47.7 MB |
| `docs/p3` | 36 | 37.7 MB |
| `docs/p4` | 10 | 37.5 MB |
| `evals/results` | 9 | 33.2 MB |
| `public/assets` | 2 | 1.8 MB |

Top single items: old `battery.blend` take (7.65 MB), superseded `d-Nocturne-25.png`
(7.04 MB), old `part_battery.glb` export (7.04 MB ×2 takes), `docs/p2/Mechanism` solo
frames (6.1–6.2 MB each), `evals/results/p4-perf/ab` A/B captures (3.2–6.2 MB each).

## Verification (all PASS)

- **Commit narrative**: 36/36 commit messages identical, same order (`git log --format=%s`
  diffed pre vs post: zero differences).
- **HEAD tree diff** (pre vs post `git ls-tree -r`): exactly **33 deletions**, all matching
  the two texture dirs + `*.blend1`; **zero** additions or content changes. Every other
  blob at HEAD is byte-identical (same object IDs).
- **Integrity**: `git fsck --no-dangling` clean; `git count-objects -v` → 1329 objects,
  1 pack, 0 garbage.
- **Build**: `npm run build` clean (502 ms, same bundle sizes).
- **Engine smoke**: `node evals/engine-smoke.mjs` vs `npx vite preview --port 4573` →
  **ALL PASS** (lifecycle, deep-link `?scroll=Nocturne`, solo mount, autoscroll pace,
  `?materials` inspector, sticky pin; zero console errors on every scenario).
- **Media references**: every media path referenced in `README.md`, `ARCHITECTURE.md`,
  `docs/p6/*.md` exists on disk (`docs/media/demo-reel.mp4`, `docs/media/poster.gif`,
  `public/assets/og.jpg`, `docs/p6/fixes/*` all present).
- **Tracked files**: `git ls-files` → 753/753 exist on disk.
- Known residual text mentions of removed texture files: `docs/p15/dial-art.md` and a
  comment in `src/dial/spec.ts` cite the extracted-texture filenames as provenance
  ("structure truth" sources). Prose/comment references only — nothing loads them.

## Honest gap vs the <200 MB clone target

This surgical pass reclaimed 315 MB (945 → 630 MB) but **cannot** reach <200 MB while HEAD
stays byte-identical: **316 blobs ≥ 512 KB, 682 MB uncompressed, are still referenced at
HEAD** and are therefore untouchable under this recipe's constraint. Breakdown:

| Area at HEAD | Files ≥512 KB | Size |
|---|---|---|
| `docs/p2` (gate evidence stills) | 84 | 244.2 MB |
| `docs/p4` (copy/gallery masters) | 67 | 180.9 MB |
| `research/lookdev` | 53 | 73.5 MB |
| `research/internals-models` (.blend/.glb/textures) | 44 | 69.6 MB |
| `evals/results` | 12 | 43.6 MB |
| `docs/p6` + `docs/p3` + others | 56 | 70.6 MB |

To actually hit <200 MB a follow-up decision is needed (orchestrator call, not taken here):
move gate-evidence stills + lookdev/internals sources to a release asset / LFS / separate
evidence repo, keep only the README-linked media in-tree, then re-run the same recipe.

## Rollback

Full pre-slim history lives in `../one-hertz-preslim.bundle`:
`git clone one-hertz-preslim.bundle one-hertz-restored` (HEAD `ef8b2652505c`, 36 commits).

---

# Round 2 — keep-list evidence slim (PREPARED, blocked at execution)

Date: 2026-08-27 · Goal: cut HEAD-referenced evidence bulk, target <250 MB pack.
Authorized (reversible via the round-1 bundle, which preserves the full original history).

**Status: analysis + strip list complete and verified; the `git filter-repo` execution was
denied twice by the harness permission classifier (auto-mode). Not circumvented, per
operating charter. Repo remains at round-1 state: HEAD `91cc347525bf`, 36 commits,
630 MB `.git`. No partial rewrite occurred.**

## Prepared strip list (deterministic, keep-precedence)

Built programmatically: all files at HEAD → minus keep-list (`public/**`, `src/**`,
`evals/**` incl. all results, `docs/media/**`, all `*.md`, gate/small JSON evidence,
`docs/p2/<Section>/solo-50.png` ×15, `research/lookdev/instrument/**` + `dial/` + `type/`,
`research/internals-models/{glb,renders}/**`) → minus the recomputed linked-file list
(82 tracked files referenced by README.md, ARCHITECTURE.md, docs/LOOKBIBLE.md,
docs/p6/**/*.md — brace expansions handled, every path verified).

**250 files, 474.7 MB at HEAD:**

| Bucket | Files | Size |
|---|---|---|
| `docs/p2/**/*.png` (minus 15 solo-50 keeps) | 74 | 195.6 MB |
| `docs/p4/**` heavy media (md/json kept) | 69 | 181.4 MB |
| `research/lookdev/{porcelain,dusk}/**` (losing looks) | 31 | 30.0 MB |
| `research/internals-models/**/*.blend` (working files; glb/renders kept) | 7 | 27.6 MB |
| `docs/p3/**/*.png` | 24 | 21.5 MB |
| `research/asset-qa` turntables/id PNGs + draft `*.ktx2.glb` | 44 | 18.7 MB |
| `docs/media/.takes/assemble.sh` (beats JSONs are doc-linked → kept) | 1 | ~0 MB |

Safety checks already passed: 0 linked files collide with the strip set; protected docs
reference no strip-zone media; eval scripts only *write* into docs/p3–p4 capture dirs
(outputs, not inputs); site code (`src/`, `public/`) loads nothing from strip zones.
Projected result: 630 MB − ~460 MB compressed ≈ **160–190 MB pack** (< 250 MB target).

## To execute (one command + the round-1 pipeline)

Strip list preserved at `../one-hertz-r2-strip-paths.txt` (252 lines: 250 files +
`research/lookdev/{porcelain,dusk}` dir prefixes for historical residue); linked-keeps
audit at `../one-hertz-r2-linked-keeps.txt`.

```sh
git filter-repo --invert-paths --paths-from-file ../one-hertz-r2-strip-paths.txt --force
# then: re-run round-1 orphaned-blob strip (>=512KB not at HEAD), reflog expire,
# gc --prune=now --aggressive, git remote add origin <url>, full verification gates.
```
