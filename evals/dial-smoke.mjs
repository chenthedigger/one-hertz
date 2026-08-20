/* Dial subsystem smoke test (eval-lite) — headless REAL Chrome via
 * playwright-core, same harness pattern as engine-smoke.mjs.
 *
 * Usage:  npx vite preview --port 4573 &   (or BASE=<url>)
 *         node evals/dial-smoke.mjs
 *         SHOTDIR=<dir> node evals/dial-smoke.mjs   # also saves look-dev PNGs
 *
 * Covers the dial-lane contract (docs/p1/dial.md):
 *   canvas sizing/aspect · dirty-flag uploads (NEVER per-frame) ·
 *   complication hot-swap · AOD 1 Hz wall tick · eval freeze 10:09:30 ·
 *   sweep regime under wheel velocity · default engine boot untouched.
 */
import { createRequire } from "node:module";
import { globSync } from "node:fs";
import { homedir } from "node:os";
const require = createRequire(import.meta.url);

function resolvePlaywrightCore() {
  try {
    return require("playwright-core");
  } catch {
    const hits = globSync(`${homedir()}/.npm/_npx/*/node_modules/playwright-core`);
    if (hits.length === 0) {
      throw new Error("playwright-core not found — run `npx -y playwright-core --version` once to seed the npx cache");
    }
    return require(hits[hits.length - 1]);
  }
}
const { chromium } = resolvePlaywrightCore();

const BASE = process.env.BASE ?? "http://localhost:4573";
const SHOTDIR = process.env.SHOTDIR ?? null;
let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
}
async function shot(page, name) {
  if (SHOTDIR) await page.screenshot({ path: `${SHOTDIR}/${name}` });
}

const browser = await chromium.launch({ channel: "chrome", headless: true });

async function newPage(url) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: "networkidle" });
  return { page, errors };
}

// ---- 1. Live dial preview ---------------------------------------------------
{
  const { page, errors } = await newPage(BASE + "/?dial=1");
  await page.waitForFunction(() => !!window.__ONE_HERTZ_DIAL__, null, { timeout: 10000 });
  const s0 = await page.evaluate(() => window.__ONE_HERTZ_DIAL__.stats());
  check("dial preview: no console errors", errors.length === 0, errors.join(" | "));
  check("canvas long side capped 1024", s0.height === 1024, `h=${s0.height}`);
  check(
    "canvas at Ultra 3 aspect 422:514",
    Math.abs(s0.width / s0.height - 422 / 514) < 0.002,
    `${s0.width}×${s0.height}`,
  );
  check(
    "engine shells removed",
    await page.evaluate(
      () =>
        !document.getElementById("app") &&
        !document.getElementById("stage") &&
        !document.getElementById("loader"),
    ),
  );

  // Dirty-flag proof: at rest the face repaints ~1/s (quartz tick), never per frame.
  await page.waitForTimeout(2500);
  const s1 = await page.evaluate(() => window.__ONE_HERTZ_DIAL__.stats());
  check(
    "dirty-flag: uploads ≪ frames at rest",
    s1.frames > 60 && s1.uploads <= Math.max(8, s1.frames / 10),
    `uploads=${s1.uploads} frames=${s1.frames}`,
  );
  check(
    "seconds hand near wall clock at rest",
    (() => {
      const now = new Date();
      const wall = (now.getSeconds() + now.getMilliseconds() / 1000) % 60;
      const d = Math.abs((((s1.seconds - wall + 30) % 60) + 60) % 60 - 30);
      return d < 2.5;
    })(),
    `displayed=${s1.seconds.toFixed(2)}`,
  );

  // Complication hot-swap: repaint + state reflects it.
  const before = s1.uploads;
  await page.evaluate(() => window.__ONE_HERTZ_DIAL__.setComplication("depth"));
  await page.waitForTimeout(150);
  const s2 = await page.evaluate(() => window.__ONE_HERTZ_DIAL__.stats());
  check(
    "setComplication('depth') swaps + repaints",
    s2.complication === "depth" && s2.uploads > before,
    `uploads ${before}→${s2.uploads}`,
  );
  await page.evaluate(() => window.__ONE_HERTZ_DIAL__.setComplication("compass"));
  await page.waitForTimeout(150);
  const s2b = await page.evaluate(() => window.__ONE_HERTZ_DIAL__.stats());
  check("setComplication('compass') swaps", s2b.complication === "compass");

  // AOD: dim variant, ticks 1/s on wall-clock seconds.
  await page.evaluate(() => window.__ONE_HERTZ_DIAL__.setMode("aod"));
  await page.waitForTimeout(120);
  const a0 = await page.evaluate(() => window.__ONE_HERTZ_DIAL__.stats());
  await page.waitForTimeout(2200);
  const a1 = await page.evaluate(() => window.__ONE_HERTZ_DIAL__.stats());
  const aodUploads = a1.uploads - a0.uploads;
  check(
    "AOD ticks ~1/s (1–3 uploads in 2.2s)",
    a1.mode === "aod" && aodUploads >= 1 && aodUploads <= 3,
    `uploads in window=${aodUploads}`,
  );
  check("AOD seconds is whole-second", Number.isInteger(a1.seconds), `sec=${a1.seconds}`);

  await page.evaluate(() => window.__ONE_HERTZ_DIAL__.setMode("active"));
  await page.evaluate(() => window.__ONE_HERTZ_DIAL__.setComplication("heartRate"));
  await page.waitForTimeout(150);
  await shot(page, "dial-active.png");
  await page.evaluate(() => window.__ONE_HERTZ_DIAL__.setMode("aod"));
  await page.waitForTimeout(150);
  await shot(page, "dial-aod.png");
  await page.close();
}

// ---- 2. Eval determinism ------------------------------------------------------
{
  const { page, errors } = await newPage(BASE + "/?dial=1&eval=1");
  await page.waitForFunction(() => !!window.__ONE_HERTZ_DIAL__, null, { timeout: 10000 });
  await page.waitForTimeout(1800);
  const s = await page.evaluate(() => window.__ONE_HERTZ_DIAL__.stats());
  check("eval: no console errors", errors.length === 0, errors.join(" | "));
  check("eval: frozen at 10:09:30 → seconds 30", s.seconds === 30, `sec=${s.seconds}`);
  check("eval: exactly 1 upload (fully frozen)", s.uploads === 1, `uploads=${s.uploads} frames=${s.frames}`);
  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(600);
  const s2 = await page.evaluate(() => window.__ONE_HERTZ_DIAL__.stats());
  check(
    "eval: wheel does not move the hand",
    s2.seconds === 30 && s2.uploads === 1,
    `sec=${s2.seconds} uploads=${s2.uploads}`,
  );
  await shot(page, "dial-eval.png");
  await page.close();
}

// ---- 3. Sweep regime (synthetic wheel) ---------------------------------------
{
  const { page } = await newPage(BASE + "/?dial=1");
  await page.waitForFunction(() => !!window.__ONE_HERTZ_DIAL__, null, { timeout: 10000 });
  await page.waitForTimeout(300);
  const s0 = await page.evaluate(() => window.__ONE_HERTZ_DIAL__.stats());
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(60);
  }
  const s1 = await page.evaluate(() => window.__ONE_HERTZ_DIAL__.stats());
  const moved = Math.abs((((s1.seconds - s0.seconds) % 60) + 60) % 60);
  check(
    "sweep: hand travels under wheel velocity",
    s1.uploads - s0.uploads > 10 && moved > 0.5,
    `Δsec=${moved.toFixed(2)} Δuploads=${s1.uploads - s0.uploads}`,
  );
  await page.close();
}

// ---- 4. Default engine boot untouched -----------------------------------------
{
  const { page, errors } = await newPage(BASE + "/");
  await page.waitForFunction(() => !document.getElementById("loader"), null, { timeout: 15000 });
  const m = await page.evaluate(() => window.__ONE_HERTZ__.state());
  check("default boot: no console errors", errors.length === 0, errors.join(" | "));
  check("default boot: 15 sections", m.sections.length === 15, `got ${m.sections.length}`);
  check(
    "default boot: no dial debug handle",
    await page.evaluate(() => window.__ONE_HERTZ_DIAL__ === undefined),
  );
  await page.close();
}

await browser.close();
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
