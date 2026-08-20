# P1 lane — CI + repo hygiene

Status: DONE · 2026-08-20 · owner: ci lane agent

## What shipped

| File | Role |
|---|---|
| `.github/workflows/ci.yml` | push/PR pipeline: npm ci → `tsc --noEmit` → `vite build` → eval-lite |
| `.github/scripts/eval-lite-guard.mjs` | environment detector for the eval-lite step |

- **Runner**: `ubuntu-latest`, Node 22, npm cache. No macOS, no Blender in CI — asset
  pipeline is local-only (docs/TOOLCHAIN.md); CI gates the engine.
- **Eval-lite** = `evals/engine-smoke.mjs` (the P1 structural smoke) against
  `vite preview --port 4573` in headless real Chrome (`channel: "chrome"` — ubuntu
  runners ship Google Chrome preinstalled).
- **Skip semantics, not continue-on-error**: the guard exits **78** (EX_TEMPFAIL) when
  Chrome or `playwright-core` is unavailable → the step emits a `::notice` and passes;
  any other nonzero (guard crash, smoke failure) **fails the job**. So a capable runner
  can never green-wash a broken engine, and the workflow stays green until the
  integrate agent merges `evals/package-scripts.json` deps into package.json.
- `concurrency` cancels superseded runs per ref; job timeout 15 min.

## Verified (empirically)

- `ruby -ryaml YAML.load_file` on ci.yml: parses clean.
- Guard run locally: exit 0, finds real Chrome.
- Full step script rehearsed locally verbatim (`bash -e`, preview boot, curl wait,
  smoke, kill, exit propagation): **ALL PASS, 28/28 checks, exit 0**.

## Activation note

Remote not connected yet (chenthedigger auth pending). The workflow is inert until
the first `git push` to GitHub; nothing else needed — `on: push` + `pull_request`
covers all branches.

## README snippet (for the P6 rewrite — do NOT edit README.md before P6)

Badges + live-link block, above the fold, after the positioning sentence
(PLAN §5 P6 order: title → taxonomy → positioning → demo video → live link + badges):

```markdown
[![ci](https://github.com/chenthedigger/one-hertz/actions/workflows/ci.yml/badge.svg)](https://github.com/chenthedigger/one-hertz/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-0B0B0C)](LICENSE)
[![live](https://img.shields.io/badge/live-one--hertz.workers.dev-FF2D55)](https://one-hertz.workers.dev)

**Live demo:** [one-hertz.workers.dev](https://one-hertz.workers.dev) · desktop + mobile ·
try `?scroll=Nocturne`, hold anywhere to zoom
```

(Badge colors are the look-bible tokens: ink `#0B0B0C`, biosignal `#FF2D55`. If the
P6 agent finds the workers.dev subdomain differs from `one-hertz`, fix both the badge
and the link — verify against `infra/`.)

## Handoff notes

- Integrate agent: after merging eval deps + running `npm i`, CI's eval-lite goes
  from skip → enforcing automatically; no workflow change needed.
- If `pnpm eval` (full harness, PLAN §6) later gets a CI-safe subset, add it as a
  separate job — do not fold heavy capture/judge rounds into this fast gate.
- Deploy (wrangler) intentionally NOT in CI yet; deploys are narrated local actions
  until auth + secrets story is decided (never put CF tokens in the repo).
