/* P3 swap-lane smoke — CONFIG_CHANGE / colorway / outro restart loop.
 *
 * Usage:  npx vite preview --port 4573 &   (or BASE=<url>)
 *         node evals/swap-smoke.mjs
 *
 * Asserts (rubric colorway ×4 + outro ×2, PLAN §1 mechanics 4+5):
 *   - state().config: 4 finishes, active id truthful (== colorway axis);
 *   - 1 s 5-param tween: mid-flight sample distinct from both endpoints,
 *     completion at 1 s ± 0.15 (in-page sampler — explode pitfall #4);
 *   - dual placement: picker roots in Parts + Footer (+ Colors), every
 *     entry point drives the same config through the one bus path;
 *   - consumers: materials preset, dial accent, --accent/--biosignal,
 *     gallery <picture> re-src (art-direction source preserved);
 *   - outro: 4 instances, 0.1 s stagger manifest, SELECT MODEL previews,
 *     SWAP restarts — scrollY 0 immediate, site replays in the finish,
 *     credits slate visible at the loop point;
 *   - cursor: SELECT MODEL / SWAP labels + finish-swatch icon;
 *   - zero console errors everywhere.
 *
 * Captures → docs/p3/swap/*.png (evidence frames).
 */
import { createRequire } from "node:module";
import { globSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
const require = createRequire(import.meta.url);

function resolvePlaywrightCore() {
  try {
    return require("playwright-core");
  } catch {
    const hits = globSync(`${homedir()}/.npm/_npx/*/node_modules/playwright-core`);
    if (hits.length === 0) {
      throw new Error("playwright-core not found — run `npx -y playwright-core --version` once");
    }
    return require(hits[hits.length - 1]);
  }
}
const { chromium } = resolvePlaywrightCore();

const BASE = process.env.BASE ?? "http://localhost:4573";
const SHOTS = "docs/p3/swap";
mkdirSync(SHOTS, { recursive: true });

const results = [];
let failures = 0;
function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
}

const IS_CI = !!process.env.CI;
const LOADER_TIMEOUT_MS = IS_CI ? 60000 : 20000;
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: IS_CI ? ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] : [],
});

// No WebGL → eval-lite sentinel skip (mirrors engine-smoke).
{
  const probe = await browser.newPage();
  const hasWebgl = await probe.evaluate(() => {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  });
  await probe.close();
  if (!hasWebgl) {
    console.log("SKIP: no WebGL context available on this runner — swap smoke skipped");
    await browser.close();
    process.exit(78);
  }
}

async function newPage(url) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: "networkidle" });
  return { page, errors };
}

const state = (page) => page.evaluate(() => window.__ONE_HERTZ__.state());
const goto_ = (page, id, p) =>
  page.evaluate(([i, pp]) => window.__ONE_HERTZ__.gotoSection(i, pp), [id, p]);

// ---- 1. Eval page: config shape, tween, placements, consumers, outro -------
{
  const { page, errors } = await newPage(BASE + "/?eval=1");
  await page.waitForFunction(() => window.__ONE_HERTZ__?.state().uiFlags.loaderDone, null, {
    timeout: LOADER_TIMEOUT_MS,
  });

  // config snapshot shape + truthful boot state
  const st0 = await state(page);
  check(
    "config: 4 finishes exposed, boot active = natural-anchor-blue",
    st0.config?.finishes?.length === 4 && st0.config.active === "natural-anchor-blue",
    `finishes=${st0.config?.finishes?.length} active=${st0.config?.active}`,
  );
  check(
    "state(): colorway axis mirrors config.active",
    st0.colorway === st0.config?.active,
    `colorway=${st0.colorway}`,
  );
  check(
    "materials: tracked snapshot present (mat_titanium_case first)",
    Array.isArray(st0.materials) && st0.materials[0]?.name === "mat_titanium_case",
    `m0=${st0.materials?.[0]?.name}`,
  );

  // dual placement: picker roots + host sections
  const placement = await page.evaluate(() =>
    Array.from(document.querySelectorAll("[data-colorway-picker]")).map(
      (el) => el.closest("[data-section]")?.getAttribute("data-section") ?? "unknown",
    ),
  );
  check(
    "dual placement: picker roots in Parts AND Footer (+ Colors)",
    placement.includes("Parts") && placement.includes("Footer"),
    `hosts=[${placement.join(", ")}]`,
  );

  // Parts picker click → 1 s 5-param tween (in-page sampler, 100 ms cadence)
  await goto_(page, "Parts", 0.5);
  await page.click('[data-colorway-slot="parts"] [data-finish="black-dlc-black"]');
  const tween = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const t0 = performance.now();
        const samples = [];
        const iv = setInterval(() => {
          const m = window.__ONE_HERTZ__.state().materials[0];
          samples.push({ t: (performance.now() - t0) / 1000, ...m });
          if (performance.now() - t0 > 1400) {
            clearInterval(iv);
            resolve(samples);
          }
        }, 100);
      }),
  );
  const first = tween[0];
  const last = tween[tween.length - 1];
  const key = (s) =>
    [s.color, s.roughness, s.metalness, s.envMapIntensity, s.metalnessMapIntensity].join("|");
  const mid = tween.find((s) => s.t > 0.4 && s.t < 0.6);
  check(
    "tween: mid-flight sample distinct from both endpoints (graded, not instant)",
    mid && key(mid) !== key(first) && key(mid) !== key(last),
    `t=${mid?.t.toFixed(2)} mid=${mid && key(mid)}`,
  );
  const PARAMS = ["roughness", "metalness", "envMapIntensity", "metalnessMapIntensity"];
  const changed = PARAMS.filter((p) => first[p] !== last[p]).length + (first.color !== last.color ? 1 : 0);
  check("tween: all 5 params interpolate on the case material", changed === 5, `${changed}/5`);
  // completion time: last sample whose key differs from the final value
  let doneAt = 0;
  for (const s of tween) if (key(s) !== key(last)) doneAt = s.t;
  check(
    "tween: completes at 1 s ± 0.15 (rubric tolerance)",
    doneAt >= 0.8 && doneAt <= 1.15,
    `last motion at t=${doneAt.toFixed(2)}s`,
  );
  const stSwap = await state(page);
  check(
    "swap landed: config.active + materials.preset + colorway axis all black-dlc-black",
    stSwap.config.active === "black-dlc-black" &&
      stSwap.materials[0].preset === "black-dlc-black" &&
      stSwap.colorway === "black-dlc-black",
    `active=${stSwap.config.active} preset=${stSwap.materials[0].preset}`,
  );

  // consumers: dial accent + page accent tokens + vital signal
  const accents = await page.evaluate(() => ({
    dial: window.__ONE_HERTZ__.state().dial.accent,
    css: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
    bio: getComputedStyle(document.documentElement).getPropertyValue("--biosignal").trim(),
  }));
  check(
    "consumers: dial accent + --accent + --biosignal follow the config",
    accents.dial === "#ff453a" && accents.css === "#ff453a" && accents.bio === "#ff453a",
    JSON.stringify(accents),
  );
  await page.screenshot({ path: `${SHOTS}/parts-picker-black.png` });

  // gallery re-src (probe image load is async — wait for the rewrite)
  await goto_(page, "Images", 0.5);
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll("[data-gallery] img")).every((i) =>
        i.getAttribute("src")?.includes("black-dlc-black"),
      ),
    null,
    { timeout: 5000 },
  );
  const gallery = await page.evaluate(() => {
    const pics = Array.from(document.querySelectorAll("[data-gallery] picture"));
    return {
      total: pics.length,
      resrc: pics.filter((p) =>
        [
          ...Array.from(p.querySelectorAll("source")).map((s) => s.getAttribute("srcset") ?? ""),
          p.querySelector("img")?.getAttribute("src") ?? "",
        ].every((u) => u.includes("black-dlc-black")),
      ).length,
      art: pics.filter((p) =>
        Array.from(p.querySelectorAll("source")).some((s) =>
          (s.getAttribute("media") ?? "").includes("min-width: 1024"),
        ),
      ).length,
      caption: document.querySelector("[data-colorway]")?.textContent ?? "",
    };
  });
  check(
    "gallery: 5/5 <picture> sets re-src'd to the config token",
    gallery.total === 5 && gallery.resrc === 5,
    `${gallery.resrc}/${gallery.total}`,
  );
  check("gallery: min-width:1024 art-direction preserved", gallery.art === 5, `${gallery.art}/5`);
  check(
    "gallery: caption label follows",
    gallery.caption === "Black Titanium · Black",
    `caption='${gallery.caption}'`,
  );
  await page.waitForTimeout(300); // decoded paint
  await page.screenshot({ path: `${SHOTS}/gallery-black.png` });

  // Colors rail (dual-placement #3) drives the same config
  await goto_(page, "Colors", 0.75);
  await page.click('[data-colorway-slot="colors"] [data-finish="natural-neon-green"]');
  await page.waitForTimeout(1200);
  const stEmber = await state(page);
  const crossFan = await page.evaluate(() => ({
    partsName: document.querySelector(".prt__picker-name")?.textContent ?? "",
    partsSub: document.querySelector(".prt__picker-sub")?.textContent ?? "",
    activeSlot: Array.from(document.querySelectorAll(".col__slot")).findIndex((s) =>
      s.classList.contains("col__slot--active"),
    ),
  }));
  check(
    "Colors rail: click emits canonical CONFIG_CHANGE (active=natural-neon-green)",
    stEmber.config.active === "natural-neon-green",
    `active=${stEmber.config.active}`,
  );
  check(
    "cross-placement fan-out: Parts card + Colors rail follow the same bus",
    crossFan.partsName === "Natural Titanium" &&
      // Slot 2 = natural-neon-green (real apple.com Ocean color names —
      // founder 2026-08-26; "Ember" was the pre-recolor placeholder name).
      crossFan.partsSub.includes("Neon Green") &&
      crossFan.activeSlot === 2,
    JSON.stringify(crossFan),
  );
  await page.screenshot({ path: `${SHOTS}/colors-rail-neon.png` });

  // Outro: lineup manifest + slate at the loop point
  await goto_(page, "Footer", 0.75);
  await page.screenshot({ path: `${SHOTS}/outro-lineup-75.png` });
  await goto_(page, "Footer", 1);
  const stOutro = await state(page);
  check(
    "outro: 4 instances, 0.1 s stagger manifest, nothing selected",
    stOutro.outro?.instances === 4 &&
      Math.abs(stOutro.outro.stagger - 0.1) < 0.001 &&
      stOutro.outro.selected === null,
    JSON.stringify(stOutro.outro),
  );
  const slate = await page.evaluate(() => ({
    slate: parseFloat(getComputedStyle(document.querySelector(".outro__slate")).opacity),
    models: parseFloat(getComputedStyle(document.querySelector(".outro__models")).opacity),
  }));
  check(
    "outro: credits slate + model labels both visible at the loop point (p=1)",
    slate.slate > 0.9 && slate.models > 0.9,
    JSON.stringify(slate),
  );
  await page.screenshot({ path: `${SHOTS}/outro-slate-p1.png` });

  // SELECT MODEL previews → SWAP hard-restarts in the chosen finish
  await page.click('[data-outro-model="black-dlc-anchor-blue"]');
  const stSel = await state(page);
  check(
    "outro: SELECT MODEL previews (outro.selected + config grade start)",
    stSel.outro.selected === "black-dlc-anchor-blue" && stSel.config.active === "black-dlc-anchor-blue",
    `selected=${stSel.outro.selected} active=${stSel.config.active}`,
  );
  await page.click("[data-outro-swap]");
  const restart = await page.evaluate(() => ({
    y: window.scrollY,
    active: window.__ONE_HERTZ__.state().config.active,
    section: window.__ONE_HERTZ__.state().activeSection,
    tweening: window.__ONE_HERTZ__.state().config.tweening,
    m0: window.__ONE_HERTZ__.state().materials[0],
    selected: window.__ONE_HERTZ__.state().outro.selected,
  }));
  check(
    "restart: scrollY 0 (immediate) + site replays from Intro",
    restart.y === 0 && restart.section === "Intro",
    `y=${restart.y} section=${restart.section}`,
  );
  check(
    "restart: chosen finish applied at duration 0 (no tween in flight)",
    restart.active === "black-dlc-anchor-blue" &&
      restart.tweening === false &&
      restart.m0.preset === "black-dlc-anchor-blue",
    `active=${restart.active} tweening=${restart.tweening}`,
  );
  check(
    "restart: outro selection cleared for the next loop",
    restart.selected === null,
    `selected=${String(restart.selected)}`,
  );
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SHOTS}/restart-intro-anchor.png` });

  check("no console errors (eval page)", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

// ---- 2. Live page: cursor vocabulary + immediate restart under Lenis -------
{
  const { page, errors } = await newPage(BASE + "/");
  await page.waitForFunction(() => window.__ONE_HERTZ__?.state().uiFlags.loaderDone, null, {
    timeout: LOADER_TIMEOUT_MS,
  });
  await page.waitForTimeout(2200); // loader dismiss + match-cut flight clear

  await goto_(page, "Footer", 1);
  await page.waitForTimeout(600); // live settle (lenis owns the scroll)

  // SELECT MODEL over the lineup (pin-wide cursor text)
  await page.mouse.move(800, 380);
  await page.waitForTimeout(200);
  const label1 = (await state(page)).cursor.label;
  check("cursor: SELECT MODEL over the outro", label1 === "SELECT MODEL", `label=${label1}`);

  // finish-swatch icon over a model button
  const btn = await page.$('[data-outro-model="natural-neon-green"]');
  const box = await btn.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(200);
  const icon = (await state(page)).cursor.icon;
  check("cursor: finish-swatch icon over a model", icon === "finish-swatch", `icon=${icon}`);

  // select → the pin's resting label flips to SWAP
  await btn.click();
  await page.mouse.move(800, 380);
  await page.waitForTimeout(200);
  const label2 = (await state(page)).cursor.label;
  check("cursor: SWAP after a model is selected", label2 === "SWAP", `label=${label2}`);

  // live restart: immediate scroll home + instant re-skin
  await page.click("[data-outro-swap]");
  await page.waitForTimeout(400);
  const live = await page.evaluate(() => ({
    y: window.scrollY,
    active: window.__ONE_HERTZ__.state().config.active,
    tweening: window.__ONE_HERTZ__.state().config.tweening,
  }));
  check(
    "live restart: scrollY 0 without smooth animation, finish applied",
    live.y === 0 && live.active === "natural-neon-green" && live.tweening === false,
    JSON.stringify(live),
  );

  check("no console errors (live page)", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

await browser.close();
console.log(results.join("\n"));
console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
