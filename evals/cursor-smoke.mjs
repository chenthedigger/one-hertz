/* P1 cursor+longpress smoke (eval-lite) — headless REAL Chrome via playwright-core.
 *
 * Usage:  npx vite preview --port 4574 &   (or BASE=<url>)
 *         node evals/cursor-smoke.mjs
 *
 * Companion to engine-smoke.mjs; covers mechanic 1 (cursor) + mechanic 2
 * (longpress hold-zoom) against the firm payload contract in
 * docs/p1/cursor-events.md. */
import { createRequire } from "node:module";
import { globSync } from "node:fs";
import { homedir } from "node:os";
const require = createRequire(import.meta.url);

function resolvePlaywrightCore() {
  try {
    return require("playwright-core");
  } catch {
    const hits = globSync(`${homedir()}/.npm/_npx/*/node_modules/playwright-core`);
    if (hits.length === 0) throw new Error("playwright-core not found");
    return require(hits[hits.length - 1]);
  }
}
const { chromium } = resolvePlaywrightCore();

const BASE = process.env.BASE ?? "http://localhost:4574";
const results = [];
let failures = 0;
function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
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

// ---- 1. Cursor mount + state machine ---------------------------------------
{
  const { page, errors } = await newPage(BASE + "/");
  await page.waitForFunction(() => !document.getElementById("loader"), null, { timeout: 20000 });

  const mq = await page.evaluate(() => window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  check("headless Chrome reports fine pointer", mq === true, String(mq));

  const mounted = await page.evaluate(() => ({
    cursorEl: document.querySelector(".cursor") !== null,
    htmlClass: document.documentElement.classList.contains("has-custom-cursor"),
    st: window.__ONE_HERTZ__.state().cursor,
  }));
  check("cursor mounts on fine pointer", mounted.cursorEl && mounted.htmlClass, JSON.stringify(mounted.st));
  check("state().cursor initial none", mounted.st && mounted.st.mode === "none" && mounted.st.label === null && mounted.st.icon === null, JSON.stringify(mounted.st));

  // follow: first move appears AT the pointer
  await page.mouse.move(800, 450);
  await page.waitForTimeout(120);
  const follow = await page.evaluate(() => {
    const el = document.querySelector(".cursor");
    const t = el.style.transform;
    return { active: el.classList.contains("is-active"), t };
  });
  check("cursor active + positioned after pointermove", follow.active && /translate3d\(8\d\d(\.\d+)?px, 4\d\d(\.\d+)?px/.test(follow.t), follow.t);

  // hover text channel on Disassembly (demo-wire)
  await page.evaluate(() => window.__ONE_HERTZ__.gotoSection("Disassembly", 0.5));
  await page.waitForTimeout(300);
  await page.mouse.move(801, 451);
  await page.waitForTimeout(200);
  const label = await page.evaluate(() => window.__ONE_HERTZ__.state().cursor.label);
  check("hover Disassembly → HOLD TO EXPLORE", label === "HOLD TO EXPLORE", String(label));

  // icon channel round-trip (eval token contract)
  const icons = ["finish-swatch", "cross", "arrow-left", "arrow-right", "select"];
  const seen = [];
  for (const icon of icons) {
    const got = await page.evaluate((i) => {
      window.__ONE_HERTZ__.bus.emit("SET_CURSOR_ICON", { icon: i });
      return window.__ONE_HERTZ__.state().cursor.icon;
    }, icon);
    if (got === icon) seen.push(icon);
  }
  check("SET_CURSOR_ICON round-trips 5/5 tokens", seen.length === 5, seen.join(","));
  const iconMode = await page.evaluate(() => window.__ONE_HERTZ__.state().cursor.mode);
  check("icon takes precedence over hover text", iconMode === "icon", iconMode);
  const cleared = await page.evaluate(() => {
    window.__ONE_HERTZ__.bus.emit("SET_CURSOR_ICON", { icon: null });
    return window.__ONE_HERTZ__.state().cursor;
  });
  check("icon:null falls back to hover text", cleared.icon === null && cleared.mode === "text" && cleared.label === "HOLD TO EXPLORE", JSON.stringify(cleared));

  check("no console errors (cursor)", errors.length === 0, errors.join(" | "));
  await page.close();
}

// ---- 2. Longpress mechanics --------------------------------------------------
{
  const { page, errors } = await newPage(BASE + "/");
  await page.waitForFunction(() => !document.getElementById("loader"), null, { timeout: 20000 });
  await page.evaluate(() => window.__ONE_HERTZ__.gotoSection("Disassembly", 0.5));
  await page.waitForTimeout(300);
  const lp0 = await page.evaluate(() => window.__ONE_HERTZ__.state().longpress);
  check("state().longpress initial", lp0 && lp0.active === false && lp0.intensity === 0 && lp0.scrollEnabled === true, JSON.stringify(lp0));

  // short press never arms
  await page.mouse.move(800, 450);
  await page.mouse.down();
  await page.waitForTimeout(300);
  await page.mouse.up();
  await page.waitForTimeout(100);
  const short = await page.evaluate(() => window.__ONE_HERTZ__.state().longpress.active);
  check("300ms press does not arm", short === false, String(short));

  // long press arms at ≥500ms, ramps, stops lenis, dollys camera
  const baseDolly = await page.evaluate(() => window.__ONE_HERTZ__.state().camera.dolly);
  await page.mouse.down();
  await page.waitForTimeout(450);
  const at450 = await page.evaluate(() => window.__ONE_HERTZ__.state().longpress.active);
  await page.waitForTimeout(150);
  const at600 = await page.evaluate(() => window.__ONE_HERTZ__.state().longpress);
  check("hold arms after 500ms (450ms=false, 600ms=true)", at450 === false && at600.active === true, JSON.stringify({ at450, at600 }));
  check("scrollEnabled false while armed", at600.scrollEnabled === false, JSON.stringify(at600));

  // wheel during hold: page must not move
  const y0 = await page.evaluate(() => window.__ONE_HERTZ__.state().scroll);
  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(400);
  const y1 = await page.evaluate(() => window.__ONE_HERTZ__.state().scroll);
  check("wheel inert during hold", Math.abs(y1 - y0) < 2, `moved ${Math.abs(y1 - y0)}px`);

  // intensity ramps toward 1 over ~2s; dolly-in follows
  await page.waitForTimeout(1700); // ~2.25s into ramp
  const held = await page.evaluate(() => window.__ONE_HERTZ__.state());
  check("intensity ≈1 at ramp end", Math.abs(held.longpress.intensity - 1) <= 0.05, String(held.longpress.intensity));
  check("camera dolly-in during hold (per-section 1.6×)", baseDolly - held.camera.dolly > 0.1, `base=${baseDolly} held=${held.camera.dolly} mult=${held.camera.zoomMultiplier}`);
  check("parallaxGain ×(1+intensity)", Math.abs(held.camera.parallaxGain - (1 + held.longpress.intensity)) < 1e-6, String(held.camera.parallaxGain));
  check("cursor HOLD ring mirrors intensity", Math.abs(held.cursor.holdProgress - held.longpress.intensity) < 0.05, `ring=${held.cursor.holdProgress}`);
  check("Disassembly zoomMultiplier=1.6 live", held.camera.zoomMultiplier === 1.6, String(held.camera.zoomMultiplier));

  // release: lenis restarts immediately, intensity decays to 0
  await page.mouse.up();
  await page.waitForTimeout(150);
  const justReleased = await page.evaluate(() => window.__ONE_HERTZ__.state().longpress);
  check("release restores scrollEnabled immediately", justReleased.active === false && justReleased.scrollEnabled === true, JSON.stringify(justReleased));
  await page.waitForTimeout(2400);
  const decayed = await page.evaluate(() => window.__ONE_HERTZ__.state());
  check("intensity decays to 0 after release", decayed.longpress.intensity <= 0.02, String(decayed.longpress.intensity));
  check("dolly returns to base after release", Math.abs(decayed.camera.dolly - baseDolly) < 0.05, `base=${baseDolly} now=${decayed.camera.dolly}`);

  // wheel works again after release
  const y2 = await page.evaluate(() => window.__ONE_HERTZ__.state().scroll);
  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(600);
  const y3 = await page.evaluate(() => window.__ONE_HERTZ__.state().scroll);
  check("wheel scrolls after release", y3 - y2 > 50, `moved ${Math.round(y3 - y2)}px`);

  // LONGPRESS_TOGGLE + UPDATE_ROTATIONS emitted through the bus
  const evCounts = await page.evaluate(async () => {
    const counts = { toggle: 0, rot: 0, lastSpeed: 0 };
    const H = window.__ONE_HERTZ__;
    H.bus.on("LONGPRESS_TOGGLE", () => counts.toggle++);
    H.bus.on("UPDATE_ROTATIONS", (p) => { counts.rot++; counts.lastSpeed = p.speed; });
    return counts;
  });
  await page.mouse.move(800, 450);
  await page.mouse.down();
  await page.waitForTimeout(1200);
  await page.mouse.up();
  await page.waitForTimeout(300);
  const evAfter = await page.evaluate(() => {
    // piggyback: counts object captured in page scope above is gone; re-check via fresh listeners is overkill —
    return true;
  });
  void evAfter;
  check("no console errors (longpress)", errors.length === 0, errors.join(" | "));
  await page.close();
}

// ---- 3. Bus event flow (recorded) -------------------------------------------
{
  const { page, errors } = await newPage(BASE + "/");
  await page.waitForFunction(() => !document.getElementById("loader"), null, { timeout: 20000 });
  await page.evaluate(() => {
    const rec = { toggles: [], speeds: [] };
    window.__REC__ = rec;
    window.__ONE_HERTZ__.bus.on("LONGPRESS_TOGGLE", (p) => rec.toggles.push({ a: p.active, i: p.intensity }));
    window.__ONE_HERTZ__.bus.on("UPDATE_ROTATIONS", (p) => rec.speeds.push(p.speed));
  });
  await page.mouse.move(800, 450);
  await page.mouse.down();
  await page.waitForTimeout(1300);
  await page.mouse.up();
  await page.waitForTimeout(1600);
  const rec = await page.evaluate(() => ({
    n: window.__REC__.toggles.length,
    firstActive: window.__REC__.toggles[0]?.a,
    maxI: Math.max(...window.__REC__.toggles.map((t) => t.i)),
    lastI: window.__REC__.toggles[window.__REC__.toggles.length - 1]?.i,
    maxSpeed: Math.max(...window.__REC__.speeds),
  }));
  check("LONGPRESS_TOGGLE stream (many ticks, active first, ramps, decays)",
    rec.n > 20 && rec.firstActive === true && rec.maxI > 0.2 && rec.lastI < 0.05,
    JSON.stringify(rec));
  check("UPDATE_ROTATIONS speed = 1 + 2×intensity", Math.abs(rec.maxSpeed - (1 + 2 * rec.maxI)) < 0.1, `maxSpeed=${rec.maxSpeed} maxI=${rec.maxI}`);
  check("no console errors (bus)", errors.length === 0, errors.join(" | "));
  await page.close();
}

// ---- 4. Eval mode unaffected (determinism guard) -----------------------------
{
  const { page, errors } = await newPage(BASE + "/?eval=1");
  await page.waitForFunction(() => window.__ONE_HERTZ__?.state().uiFlags.loaderDone, null, { timeout: 20000 });
  const s1 = await page.evaluate(() => {
    window.__ONE_HERTZ__.gotoSection("Mechanism", 0.5);
    return window.__ONE_HERTZ__.state();
  });
  await page.waitForTimeout(600);
  const s2 = await page.evaluate(() => window.__ONE_HERTZ__.state());
  check("eval: camera pose still drift-free with parallax fields", JSON.stringify(s1.cameraPose) === JSON.stringify(s2.cameraPose),
    `t0=${JSON.stringify(s1.cameraPose.position)} t600=${JSON.stringify(s2.cameraPose.position)}`);
  check("eval: longpress/cursor/camera additive fields present", !!s2.longpress && !!s2.cursor && !!s2.camera, Object.keys(s2).join(","));
  check("eval: schema still v1", s2.schema === 1, String(s2.schema));
  check("no console errors (eval)", errors.length === 0, errors.join(" | "));
  await page.close();
}

await browser.close();
console.log(results.join("\n"));
console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
