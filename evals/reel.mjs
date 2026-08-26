/* P6 demo reel — scripted fixed-velocity capture of the live experience.
 *
 *   node evals/reel.mjs [--url <base>] [--vp desktop|mobile]
 *
 * ONE continuous playwright-core recordVideo take (real Chrome channel, same
 * method as evals/videos.ts / the frozen source kit), beats timestamped in
 * video time and written to <out>.beats.json; ffmpeg assembly (docs/p6 lane)
 * cuts on those marks. No ?eval= — the reel shows the live clock/liveness
 * (loader, real-seconds Nocturne tick, SWAP restart), like the source clips.
 *
 * Cut (desktop, ~27s after assembly):
 *   A  loader rings -> match cut -> hero hold
 *   B  fixed-velocity descent: hero -> Timeless -> VerticalText -> Disassembly mid
 *   C  Disassembly: drag-rotate the cluster, XPLOD_ALL full fan, close
 *   D  Nocturne drift (AOD, real seconds)
 *   E  outro lineup -> select BLACK DLC -> SWAP -> site restarts in the finish
 */
import fs from "node:fs";
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
    if (hits.length === 0) throw new Error("playwright-core not found (local or npx cache)");
    return require_(hits[hits.length - 1]);
  }
}
const { chromium } = resolvePlaywrightCore();

const EVALS_DIR = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = path.join(EVALS_DIR, "..", "docs", "media");
const TMP = path.join(MEDIA_DIR, ".takes");

const args = process.argv.slice(2);
const flag = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const URL_ = flag("url", "https://one-hertz.ubonranto.workers.dev");
const VP = flag("vp", "desktop");

const VIEWPORTS = {
  desktop: { viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
      "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  },
};

const log = (m) => console.log(`[reel] ${m}`);
fs.mkdirSync(TMP, { recursive: true });

/** Loader gone + fonts + assetsReady (inlined evals/lib.ts waitReady). */
async function waitReady(page, timeoutMs = 90_000) {
  await page.waitForFunction(
    () => {
      const l = document.querySelector("#loader");
      if (!l) return true;
      const s = getComputedStyle(l);
      return s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0;
    },
    undefined,
    { timeout: timeoutMs },
  );
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page
    .waitForFunction(
      () => {
        const api = window.__ONE_HERTZ__;
        if (!api || typeof api.state !== "function") return true;
        const f = api.state().flags;
        return !f || f.assetsReady !== false;
      },
      undefined,
      { timeout: timeoutMs },
    )
    .catch(() => {});
}

/** Y for (sectionId, localProgress) from the live track rects. */
async function sectionY(page, id, p) {
  return page.evaluate(
    ([sid, pp]) => {
      const el = document.querySelector(`[data-section="${sid}"]`);
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return Math.round(r.top + window.scrollY + pp * (r.height - innerHeight));
    },
    [id, p],
  );
}

/** Fixed-velocity descent: linear rAF ramp of the native scroll target;
 *  Lenis (the ONE smoothing owner) eases it into real motion. */
async function descend(page, fromY, toY, durationS) {
  await page.evaluate(
    ([y0, y1, d]) =>
      new Promise((done) => {
        const t0 = performance.now();
        const step = (t) => {
          const k = Math.min(1, (t - t0) / (d * 1000));
          window.scrollTo(0, y0 + (y1 - y0) * k);
          if (k < 1) requestAnimationFrame(step);
          else done(undefined);
        };
        requestAnimationFrame(step);
      }),
    [fromY, toY, durationS],
  );
}

async function jumpTo(page, y, settleMs = 2600) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(settleMs);
}

const emit = (page, ev, payload) =>
  page.evaluate(([e, pl]) => window.__ONE_HERTZ__.bus.emit(e, pl), [ev, payload]);

// ---------------------------------------------------------------------------

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--hide-crash-restore-bubble", "--disable-features=Translate"],
});
const ctx = await browser.newContext({
  ...VIEWPORTS[VP],
  recordVideo: { dir: TMP, size: VIEWPORTS[VP].viewport },
});
const page = await ctx.newPage();
const t0 = Date.now();
const now = () => (Date.now() - t0) / 1000;
const beats = {};
const mark = (name, data) => {
  beats[name] = { ...data };
  log(`${name}: ${JSON.stringify(data)}`);
};

// --- Beat A · loader -> match cut -> hero ----------------------------------
await page.goto(`${URL_}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
const tNav = now();
await waitReady(page);
const tReady = now();
await page.mouse.move(VIEWPORTS[VP].viewport.width * 0.62, VIEWPORTS[VP].viewport.height * 0.45);
await page.waitForTimeout(2400); // hero hold (title + ticking dial)
mark("A_loader_hero", { nav: tNav, ready: tReady, end: now() });

// --- Beat B · fixed-velocity descent to Disassembly mid --------------------
// Land just before the fan opens; Beat C scrubs the fan open on camera.
const yDis = await sectionY(page, "Disassembly", 0.3);
const descentS = VP === "desktop" ? 8 : 6;
const tB0 = now();
await descend(page, 0, yDis, descentS);
// Lenis (duration 4) lags the target ramp — wait for REAL settle, not a
// fixed pause (first-take lesson: XPLOD fired while the scrub was still
// below the fan-open range).
await page
  .waitForFunction(
    (target) => {
      const s = window.__ONE_HERTZ__?.state?.().scroll;
      return s && Math.abs(s.position - target) < 3 && Math.abs(s.velocity) < 0.05;
    },
    yDis,
    { timeout: 8000, polling: 100 },
  )
  .catch(() => {});
const arrived = await page.evaluate(() => {
  const s = window.__ONE_HERTZ__.state();
  return { y: s.scroll.position, mode: s.explode?.mode };
});
mark("B_descent", { start: tB0, end: now(), toY: yDis, durationS: descentS, arrived });

// --- Beat C · explode: scrub the fan open, then an XPLOD_ALL pulse ---------
// Take-2/3 lessons: a big drag turns the fan axis into the camera, and a
// HELD XPLOD_ALL (×1.65) pushes every part out of frame at this standoff.
// The beat is therefore: deterministic scrub-open (the section's own
// choreography), then a quick API pulse — parts fly out and return.
const tC0 = now();
const yFan = await sectionY(page, "Disassembly", 0.52);
await descend(page, yDis, yFan, 4); // fan opens on camera
await page.waitForTimeout(1200); // Lenis tail + hold on the open cascade
await emit(page, "XPLOD_ALL", { on: true });
await page.waitForTimeout(1500); // parts fly outward (2s tween, cut mid-flight)
await emit(page, "XPLOD_ALL", { on: false });
await page.waitForTimeout(1600); // they come home
log(
  `explode state: ${JSON.stringify(
    await page.evaluate(() => {
      const e = window.__ONE_HERTZ__.state().explode;
      return { mode: e.mode, xplodAll: e.xplodAll };
    }),
  )}`,
);
mark("C_explode", { start: tC0, end: now() });

// --- Beat D · Nocturne drift (AOD, real seconds) ---------------------------
const yNoc0 = await sectionY(page, "Nocturne", 0.35);
const yNoc1 = await sectionY(page, "Nocturne", 0.6);
await jumpTo(page, yNoc0, 2800);
const tD0 = now();
await descend(page, yNoc0, yNoc1, 4);
await page.waitForTimeout(600);
mark("D_nocturne", { jumped: tD0 - 2.8, start: tD0, end: now() });

// --- Beat E · outro lineup -> select BLACK DLC -> SWAP restart -------------
const bottom = await page.evaluate(
  () => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - innerHeight,
);
await jumpTo(page, bottom, 3800); // outro raise + lineup stagger
const tE0 = now();
const btn = page.locator("[data-outro-model]").nth(1); // BLACK · BLACK DLC
await btn.hover();
await page.waitForTimeout(1100);
await btn.click({ delay: 60 });
await page.waitForTimeout(2400); // 1s preview grade + hold
await page.click("[data-outro-swap]", { delay: 60 }).catch(() => {});
await page.waitForTimeout(3600); // duration-0 apply + hard restart at top
mark("E_swap_restart", { jumped: tE0 - 3.8, start: tE0, end: now() });

// ---------------------------------------------------------------------------
const vid = page.video();
await ctx.close();
await browser.close();
const outWebm = path.join(TMP, `take-${VP}.webm`);
if (vid) fs.renameSync(await vid.path(), outWebm);
fs.writeFileSync(
  path.join(TMP, `take-${VP}.beats.json`),
  JSON.stringify({ capturedAt: new Date().toISOString(), url: URL_, vp: VP, beats }, null, 2),
);
log(`take -> ${outWebm}`);
log(`beats -> ${path.join(TMP, `take-${VP}.beats.json`)}`);
