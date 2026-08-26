/* P3 vital-lane smoke — living BPM + opt-in sound + loader match-cut.
 *
 * Usage:  npx vite preview --port 4573 &   (or BASE=<url>)
 *         node evals/vital-smoke.mjs
 *
 * Asserts (lane brief + rubric `loader-honesty` + PLAN §2 "Living BPM"):
 *   - loader honesty: three-ring arc monotonic, >=~2.5s even warm, never
 *     completes before the GLB bytes are in;
 *   - match-cut: rings land on the projected hero screen within tolerance;
 *   - vital: BPM lerps 58↔142 off scroll velocity, beats fire at rest;
 *   - eval pins: bpm 64 / phase 0 / zero beats; Nocturne dark variant;
 *   - sound: OFF by default, ZERO AudioContext before first opt-in, one
 *     context ever, prefers-reduced-motion disables the toggle.
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
      throw new Error("playwright-core not found — run `npx -y playwright-core --version` once");
    }
    return require(hits[hits.length - 1]);
  }
}
const { chromium } = resolvePlaywrightCore();

const BASE = process.env.BASE ?? "http://localhost:4573";
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
    console.log("SKIP: no WebGL context available on this runner — vital smoke skipped");
    await browser.close();
    process.exit(78);
  }
}

/** Instrumentation injected before any page script runs. */
const INIT = `
  window.__AC_N__ = 0;
  for (const key of ["AudioContext", "webkitAudioContext"]) {
    const Real = window[key];
    if (!Real) continue;
    window[key] = class extends Real {
      constructor(...a) { super(...a); window.__AC_N__++; }
    };
  }
  window.__LOADER_GONE_AT__ = null;
  window.__RING_SAMPLES__ = [];
  const sampler = setInterval(() => {
    const fill = document.querySelector(".ring-fill--a");
    if (fill) window.__RING_SAMPLES__.push(parseFloat(fill.style.strokeDashoffset || "100"));
    if (!document.getElementById("loader") && window.__LOADER_GONE_AT__ === null) {
      window.__LOADER_GONE_AT__ = performance.now();
      clearInterval(sampler);
    }
  }, 80);
`;

async function newPage(url, { init = false, reducedMotion = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  if (reducedMotion) await page.emulateMedia({ reducedMotion: "reduce" });
  if (init) await page.addInitScript(INIT);
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: "networkidle" });
  return { page, errors };
}

// ---- 1. Live page: loader honesty + match-cut + vital + sound --------------
{
  const { page, errors } = await newPage(BASE + "/", { init: true });
  await page.waitForFunction(() => window.__LOADER_GONE_AT__ !== null, null, {
    timeout: LOADER_TIMEOUT_MS,
  });

  // Loader honesty: floor + monotonic + assets-before-completion.
  const honesty = await page.evaluate(() => {
    const glb = performance
      .getEntriesByType("resource")
      .find((r) => r.name.includes("ultra-3"));
    return {
      goneAt: window.__LOADER_GONE_AT__,
      samples: window.__RING_SAMPLES__,
      glbEnd: glb ? glb.responseEnd : null,
    };
  });
  check(
    "loader honesty: completion >= 2.5s floor (-10%)",
    honesty.goneAt >= 2250,
    `gone at ${Math.round(honesty.goneAt)}ms`,
  );
  let monotonic = honesty.samples.length >= 3;
  for (let i = 1; i < honesty.samples.length; i++) {
    if (honesty.samples[i] > honesty.samples[i - 1] + 0.001) monotonic = false;
  }
  check(
    "loader honesty: ring progress monotonic",
    monotonic,
    `${honesty.samples.length} samples`,
  );
  check(
    "loader honesty: GLB bytes complete before loader",
    honesty.glbEnd !== null && honesty.glbEnd <= honesty.goneAt,
    `glb ${Math.round(honesty.glbEnd ?? -1)}ms vs gone ${Math.round(honesty.goneAt)}ms`,
  );

  // Match-cut landing (flight = dismiss + 1.2s).
  await page.waitForFunction(() => window.__ONE_HERTZ_MATCHCUT__ !== undefined, null, {
    timeout: 8000,
  });
  const cut = await page.evaluate(() => window.__ONE_HERTZ_MATCHCUT__);
  check(
    "match-cut: rings landed on the projected screen",
    cut.mode === "screen" && cut.dist <= 8,
    `mode=${cut.mode} dist=${cut.dist.toFixed(1)}px target=${JSON.stringify(cut.target)}`,
  );

  // Vital chrome revealed, readout live, sound off, zero AudioContexts.
  await page.waitForFunction(
    () => window.__ONE_HERTZ__.state().vital?.revealed === true,
    null,
    { timeout: 5000 },
  );
  const v0 = await page.evaluate(() => {
    const s = window.__ONE_HERTZ__.state();
    return {
      vital: s.vital,
      soundFlag: s.uiFlags.soundOn,
      acN: window.__AC_N__,
      pressed: document.querySelector(".vital__sound")?.getAttribute("aria-pressed"),
      // NOTE: [data-vital-value] alone would match the Intro section's
      // hidden placeholder first — scope to the live chrome.
      text: document.querySelector(".vital .vital__value")?.textContent,
      visible: !!document.querySelector(".vital.is-live"),
    };
  });
  check("vital: mounted + revealed after loader", v0.visible && v0.vital.revealed);
  check(
    "vital: readout numeric in 58..142",
    Number(v0.text) >= 58 && Number(v0.text) <= 142,
    `"${v0.text}"`,
  );
  check(
    "sound: OFF by default, zero AudioContext pre-opt-in",
    v0.acN === 0 && v0.soundFlag === false && v0.pressed === "false",
    `contexts=${v0.acN} flag=${v0.soundFlag}`,
  );

  // Beats fire at rest (~58 bpm ⇒ ~1/s) — measured as a delta, not a total.
  const beats0 = await page.evaluate(() => window.__ONE_HERTZ__.state().vital.beats);
  await page.waitForTimeout(3200);
  const beats1 = await page.evaluate(() => window.__ONE_HERTZ__.state().vital.beats);
  check(
    "vital: beats fire at rest (>=2 in 3.2s)",
    beats1 - beats0 >= 2,
    `Δbeats=${beats1 - beats0}`,
  );

  // BPM lerp: wheel blast raises the simulated HR, idle recovers it.
  await page.mouse.move(800, 450);
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(60);
  }
  const hot = await page.evaluate(() => window.__ONE_HERTZ__.state().vital.rawBpm);
  check("vital: BPM rises under scroll velocity", hot > 72, `rawBpm=${hot}`);
  await page.waitForTimeout(5000);
  const cool = await page.evaluate(() => window.__ONE_HERTZ__.state().vital.rawBpm);
  check("vital: BPM recovers toward rest at idle", cool < hot - 5, `${hot} → ${cool}`);

  // Opt-in sound: exactly ONE context ever; toggle round-trips the flag.
  await page.click(".vital__sound");
  const on = await page.evaluate(() => ({
    acN: window.__AC_N__,
    flag: window.__ONE_HERTZ__.state().uiFlags.soundOn,
    pressed: document.querySelector(".vital__sound")?.getAttribute("aria-pressed"),
  }));
  check(
    "sound: opt-in creates exactly one AudioContext + sets flags",
    on.acN === 1 && on.flag === true && on.pressed === "true",
    JSON.stringify(on),
  );
  await page.click(".vital__sound");
  const off = await page.evaluate(() => ({
    acN: window.__AC_N__,
    flag: window.__ONE_HERTZ__.state().uiFlags.soundOn,
  }));
  check(
    "sound: toggle off keeps the single context",
    off.acN === 1 && off.flag === false,
    JSON.stringify(off),
  );

  check("no console errors (live)", errors.length === 0, errors.join(" | "));
  await page.close();
}

// ---- 2. Eval determinism: pins + dark-ground variant -----------------------
{
  const { page, errors } = await newPage(BASE + "/?eval=1");
  await page.waitForFunction(
    () => window.__ONE_HERTZ__?.state().uiFlags.loaderDone === true,
    null,
    { timeout: LOADER_TIMEOUT_MS },
  );
  const e0 = await page.evaluate(() => {
    const s = window.__ONE_HERTZ__.state();
    return {
      vital: s.vital,
      text: document.querySelector(".vital .vital__value")?.textContent,
      matchcut: window.__ONE_HERTZ_MATCHCUT__ ?? null,
    };
  });
  check(
    "eval: BPM pinned 64, phase 0, zero beats",
    e0.vital.bpm === 64 && e0.vital.phase === 0 && e0.vital.beats === 0 && e0.text === "64",
    JSON.stringify({ bpm: e0.vital.bpm, phase: e0.vital.phase, beats: e0.vital.beats }),
  );
  check("eval: no match-cut flight (loader skipped)", e0.matchcut === null);

  const dark = await page.evaluate(() => {
    window.__ONE_HERTZ__.gotoSection("Nocturne", 0.5);
    const s = window.__ONE_HERTZ__.state();
    return { dark: s.vital.dark, signal: s.vital.signal.toLowerCase() };
  });
  check(
    "eval: Nocturne ground flips the signal token (#FF375F)",
    dark.dark === true && dark.signal === "#ff375f",
    JSON.stringify(dark),
  );
  const light = await page.evaluate(() => {
    window.__ONE_HERTZ__.gotoSection("Intro", 0);
    const s = window.__ONE_HERTZ__.state();
    return { dark: s.vital.dark, signal: s.vital.signal.toLowerCase() };
  });
  check(
    "eval: back on porcelain the signal returns (#FF2D55)",
    light.dark === false && light.signal === "#ff2d55",
    JSON.stringify(light),
  );
  check("no console errors (eval)", errors.length === 0, errors.join(" | "));
  await page.close();
}

// ---- 3. prefers-reduced-motion: sound path sealed ---------------------------
{
  const { page, errors } = await newPage(BASE + "/", { init: true, reducedMotion: true });
  await page.waitForFunction(() => window.__LOADER_GONE_AT__ !== null, null, {
    timeout: LOADER_TIMEOUT_MS,
  });
  const rm = await page.evaluate(() => ({
    disabled: document.querySelector(".vital__sound")?.disabled === true,
    flagged: window.__ONE_HERTZ__.state().vital.reducedMotion,
    acN: window.__AC_N__,
  }));
  check(
    "reduced-motion: sound toggle disabled, no context possible",
    rm.disabled && rm.flagged && rm.acN === 0,
    JSON.stringify(rm),
  );
  check("no console errors (reduced-motion)", errors.length === 0, errors.join(" | "));
  await page.close();
}

await browser.close();
console.log(results.join("\n"));
console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
