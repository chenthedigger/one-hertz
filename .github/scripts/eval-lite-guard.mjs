/* eval-lite guard — decides whether the CI smoke test can run here.
 *
 * Exit codes:
 *   0  — Chrome + playwright-core both available: run the smoke (must pass).
 *   78 — environment can't run it (no Chrome, or playwright-core not yet
 *        installed): caller emits a ::notice and skips. 78 = BSD EX_TEMPFAIL,
 *        chosen so a real crash (exit 1) still fails the job.
 *
 * NOT continue-on-error: a broken smoke on a capable runner fails CI.
 */
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const require = createRequire(import.meta.url);

// 1) playwright-core present? (arrives when the evals lane's
//    evals/package-scripts.json is merged into package.json)
let chromium;
try {
  ({ chromium } = require("playwright-core"));
} catch {
  console.log("guard: playwright-core not installed — skip");
  process.exit(78);
}

// 2) real Chrome present? Ask playwright for the "chrome" channel path,
//    fall back to well-known binaries.
let chromePath = "";
try {
  chromePath = chromium.executablePath({ channel: "chrome" }) ?? "";
} catch {
  /* older playwright-core signature — fall through */
}
if (!chromePath || !existsSync(chromePath)) {
  const candidates = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/opt/google/chrome/chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  chromePath = candidates.find((p) => existsSync(p)) ?? "";
  if (!chromePath) {
    try {
      chromePath = execFileSync("which", ["google-chrome-stable"], { encoding: "utf8" }).trim();
    } catch {
      /* not found */
    }
  }
}
if (!chromePath) {
  console.log("guard: no Chrome binary found — skip");
  process.exit(78);
}

console.log(`guard: OK — chrome=${chromePath}`);
process.exit(0);
