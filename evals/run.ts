/**
 * evals/run.ts — full eval round orchestrator (`pnpm eval`).
 *
 *   node evals/run.ts [url] [--round r1] [--only capture|assert|perf|judge|report]
 *
 * Runs capture -> assert -> perf (desktop + mobile-proxy) -> judge scaffold ->
 * report, CONTINUING through stage failures (a failed gate is a result, not a
 * crash) and exiting with the worst stage code so CI can gate on it.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { EVALS_DIR, log, parseArgs, roundName, targetUrl } from "./lib.ts";

const args = parseArgs();
const url = targetUrl(args);
const round = roundName(args);
const only = args.flags["only"] as string | undefined;

interface Stage {
  name: string;
  script: string;
  extra?: string[];
}

const STAGES: Stage[] = [
  { name: "capture", script: "capture.ts" },
  { name: "assert", script: "assert.ts" },
  { name: "perf", script: "perf.ts" },
  { name: "perf-mobileproxy", script: "perf.ts", extra: ["--throttle"] },
  { name: "judge", script: path.join("judge", "runner.ts") },
  { name: "report", script: "report.ts" },
];

const selected = only
  ? STAGES.filter((s) => s.name === only || s.name.startsWith(only))
  : STAGES;
if (selected.length === 0) {
  log(`unknown --only '${only}' — stages: ${STAGES.map((s) => s.name).join(", ")}`);
  process.exit(2);
}

let worst = 0;
for (const stage of selected) {
  log(`\n──────── eval stage: ${stage.name} ────────`);
  const argv = [path.join(EVALS_DIR, stage.script), "--round", round, ...(stage.extra ?? [])];
  // capture/assert/perf take the target url; judge/report are offline merges
  if (!stage.script.includes("judge") && stage.script !== "report.ts") argv.splice(1, 0, url);
  const res = spawnSync(process.execPath, argv, { stdio: "inherit" });
  const code = res.status ?? 1;
  if (code !== 0) log(`stage ${stage.name} exited ${code} (continuing — gates are results)`);
  worst = Math.max(worst, code);
}

log(`\neval round ${round} complete — worst stage exit code ${worst}`);
process.exit(worst);
