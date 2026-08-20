/* Dial evidence capture — reads the DialRenderer canvas at device pixels
 * (the actual texture truth) and writes:
 *   <state>-1x.png            full canvas (841×1024)
 *   <state>-2x-bezel.png      2× zoom crop, top-left quadrant (bezel type + corner slot)
 *   <state>-2x-comp.png       2× zoom crop, bottom-center (hot complication + hub)
 * States: active-depth, active-heartRate, active-compass, aod.
 * Usage: OUT=<dir> BASE=http://localhost:4573 node dial-capture.mjs
 */
import { createRequire } from "node:module";
import { globSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
const require = createRequire(import.meta.url);

function resolvePlaywrightCore() {
  try { return require("playwright-core"); }
  catch {
    const hits = globSync(`${homedir()}/.npm/_npx/*/node_modules/playwright-core`);
    if (!hits.length) throw new Error("playwright-core not found");
    return require(hits[hits.length - 1]);
  }
}
const { chromium } = resolvePlaywrightCore();

const BASE = process.env.BASE ?? "http://localhost:4573";
const OUT = process.env.OUT ?? "shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
await page.goto(BASE + "/?dial=1&eval=1", { waitUntil: "networkidle" });
await page.waitForFunction(() => !!window.__ONE_HERTZ_DIAL__, null, { timeout: 10000 });

async function grab(state) {
  await page.waitForTimeout(250);
  const shots = await page.evaluate(() => {
    const canvas = document.querySelector("#dial-preview canvas");
    const w = canvas.width, h = canvas.height;
    const crop = (sx, sy, sw, sh, scale) => {
      const t = document.createElement("canvas");
      t.width = Math.round(sw * scale);
      t.height = Math.round(sh * scale);
      const c = t.getContext("2d");
      c.imageSmoothingEnabled = false;
      c.drawImage(canvas, sx, sy, sw, sh, 0, 0, t.width, t.height);
      return t.toDataURL("image/png");
    };
    return {
      full: canvas.toDataURL("image/png"),
      bezel: crop(0, 0, w * 0.55, h * 0.45, 2),
      comp: crop(w * 0.22, h * 0.42, w * 0.56, h * 0.5, 2),
    };
  });
  const save = (name, dataUrl) =>
    writeFileSync(`${OUT}/${name}`, Buffer.from(dataUrl.split(",")[1], "base64"));
  save(`${state}-1x.png`, shots.full);
  save(`${state}-2x-bezel.png`, shots.bezel);
  save(`${state}-2x-comp.png`, shots.comp);
  console.log(`saved ${state}`);
}

for (const comp of ["depth", "heartRate", "compass"]) {
  await page.evaluate((c) => {
    window.__ONE_HERTZ_DIAL__.setMode("active");
    window.__ONE_HERTZ_DIAL__.setComplication(c);
  }, comp);
  await grab(`active-${comp}`);
}
await page.evaluate(() => window.__ONE_HERTZ_DIAL__.setMode("aod"));
await grab("aod");

await browser.close();
console.log("DONE →", OUT);
