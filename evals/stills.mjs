/* P6 hero stills — deterministic ?eval=1 frames (frozen 10:09:30 face,
 * seeded RNG, loader skipped), desktop 1600x900@2, saved to docs/media/.
 *
 *   node evals/stills.mjs [--url <base>]
 */
import path from "node:path";
import { createRequire } from "node:module";
import { globSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const require_ = createRequire(import.meta.url);
function resolvePlaywrightCore() {
  try {
    return require_("playwright-core");
  } catch {
    const hits = globSync(`${homedir()}/.npm/_npx/*/node_modules/playwright-core`);
    if (hits.length === 0) throw new Error("playwright-core not found");
    return require_(hits[hits.length - 1]);
  }
}
const { chromium } = resolvePlaywrightCore();

const EVALS_DIR = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = path.join(EVALS_DIR, "..", "docs", "media");
const args = process.argv.slice(2);
const i = args.indexOf("--url");
const URL_ = i >= 0 ? args[i + 1] : "https://one-hertz.ubonranto.workers.dev";

/** (sectionId, localProgress, outfile) — the three P6 frames. */
const SHOTS = [
  ["Intro", 0.0, "still-hero.png"],
  ["Disassembly", 0.42, "still-disassembly-fan.png"],
  ["Nocturne", 0.5, "still-nocturne.png"],
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await (
  await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 })
).newPage();
await page.goto(`${URL_}/?eval=1`, { waitUntil: "domcontentloaded", timeout: 120_000 });
await page.waitForFunction(
  () => window.__ONE_HERTZ__?.state?.().flags.assetsReady,
  undefined,
  { timeout: 90_000 },
);
for (const [id, p, out] of SHOTS) {
  await page.evaluate(([sid, pp]) => window.__ONE_HERTZ__.gotoSection(sid, pp), [id, p]);
  await page.waitForTimeout(1200);
  const file = path.join(MEDIA_DIR, out);
  await page.screenshot({ path: file });
  console.log(`[stills] ${id}@${p} -> ${file}`);
}
await browser.close();
