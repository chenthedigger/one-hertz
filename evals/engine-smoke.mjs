/* P1 engine smoke test (eval-lite) — headless REAL Chrome via playwright-core.
 *
 * Usage:  npx vite preview --port 4573 &   (or BASE=<url>)
 *         node evals/engine-smoke.mjs
 *
 * playwright-core is resolved from local node_modules, then the npx cache
 * (Playwright MCP is unusable on this machine — see dev-tooling notes).
 * Chrome channel "chrome" = the real installed browser, per PLAN §6 method.
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
const results = [];
let failures = 0;

function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
}

// CI runners have no GPU: allow software WebGL (SwiftShader) and give the
// loader (env decode + PMREM compile) far more time. Locally: real GPU, 15s.
const IS_CI = !!process.env.CI;
const LOADER_TIMEOUT_MS = IS_CI ? 60000 : 15000;
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: IS_CI ? ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] : [],
});

// No WebGL at all (some locked-down runners) → skip, not fail: exit 78 is the
// eval-lite sentinel ci.yml converts to a ::notice. typecheck+build still gate.
{
  const probe = await browser.newPage();
  const hasWebgl = await probe.evaluate(() => {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  });
  await probe.close();
  if (!hasWebgl) {
    console.log("SKIP: no WebGL context available on this runner — structural smoke skipped");
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

// ---- 1. Default load -------------------------------------------------------
{
  const { page, errors } = await newPage(BASE + "/");
  await page.waitForFunction(() => !document.getElementById("loader"), null, { timeout: LOADER_TIMEOUT_MS });
  const m = await page.evaluate(() => window.__ONE_HERTZ__.state());
  check("no console errors (default)", errors.length === 0, errors.join(" | "));
  check("15 sections in manifest", m.sections.length === 15, `got ${m.sections.length}`);
  const order = m.sections.map((s) => s.name).join(",");
  check(
    "canonical order incl. Nocturne after Images",
    order ===
      "Intro,Timeless,VerticalText,Disassembly,Mechanism,Movement,Curves,MovementWatchRight,Hands,Straps,Images,Nocturne,Colors,Parts,Footer",
    order,
  );
  const budgets = m.sections.every((s) => Math.abs(s.height - (s.vhBudget / 100) * 900) < 2);
  check("track heights match vh budgets @900px", budgets,
    m.sections.map((s) => `${s.name}:${s.height}`).join(" "));
  const dis = m.sections.find((s) => s.name === "Disassembly");
  check("Disassembly webgl bounds extended ±0.25vh",
    Math.abs(dis.webglStart - (dis.rawStart - 225)) < 1 && Math.abs(dis.webglEnd - (dis.rawEnd + 225)) < 1,
    JSON.stringify({ rawStart: dis.rawStart, webglStart: dis.webglStart, rawEnd: dis.rawEnd, webglEnd: dis.webglEnd }));
  const intro = m.sections[0];
  check("first section rawStart clamped to 0", intro.rawStart === 0, String(intro.rawStart));
  const footer = m.sections[14];
  const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  check("last section rawEnd clamped to maxScroll", Math.abs(footer.rawEnd - maxScroll) < 1,
    `rawEnd=${footer.rawEnd} maxScroll=${maxScroll}`);
  check("activeSection at boot = Intro", m.activeSection === "Intro", String(m.activeSection));
  check("state schema v1 + shape", m.schema === 1 && typeof m.pinState === "string" &&
    Array.isArray(m.cameraPose.position) && typeof m.colorway === "string" &&
    typeof m.dialMode === "string" && typeof m.uiFlags === "object", JSON.stringify(Object.keys(m)));
  await page.close();
}

// ---- 2. Eval mode: determinism + synchronous settle ------------------------
{
  const { page, errors } = await newPage(BASE + "/?eval=1");
  await page.waitForFunction(() => window.__ONE_HERTZ__ !== undefined);
  await page.waitForFunction(() => window.__ONE_HERTZ__.state().uiFlags.loaderDone, null, { timeout: LOADER_TIMEOUT_MS });
  check("eval: loader element removed immediately",
    await page.evaluate(() => document.getElementById("loader") === null));
  // Synchronous settle: pose captured in the SAME evaluate as gotoSection.
  const s1 = await page.evaluate(() => {
    window.__ONE_HERTZ__.gotoSection("Mechanism", 0.5);
    return window.__ONE_HERTZ__.state();
  });
  check("eval gotoSection settles synchronously (active=Mechanism, dom p=0.5, pinned)",
    s1.activeSection === "Mechanism" &&
      Math.abs(s1.sections.find((x) => x.name === "Mechanism").progressDom - 0.5) < 1e-6 &&
      s1.pinState === "pinned",
    JSON.stringify({ active: s1.activeSection, pin: s1.pinState }));
  await page.waitForTimeout(600); // camera must NOT drift afterwards
  const s2 = await page.evaluate(() => window.__ONE_HERTZ__.state());
  check("eval: camera pose stable after settle (no drift)",
    JSON.stringify(s1.cameraPose) === JSON.stringify(s2.cameraPose),
    `t0=${JSON.stringify(s1.cameraPose.position)} t600=${JSON.stringify(s2.cameraPose.position)}`);
  check("eval: uiFlags.evalMode + evalMode true", s2.uiFlags.evalMode === true && s2.evalMode === true);
  // freezeClock + pin check
  const fc = await page.evaluate(() => {
    window.__ONE_HERTZ__.freezeClock(0.25);
    return {
      clock: window.__ONE_HERTZ__.state().clock,
      css: getComputedStyle(document.documentElement).getPropertyValue("--clock").trim(),
    };
  });
  check("freezeClock(0.25) reflected in state + CSS", fc.clock === 0.25 && fc.css === "0.25000", JSON.stringify(fc));
  const tier = await page.evaluate(() => {
    window.__ONE_HERTZ__.forceQualityTier(2);
    return window.__ONE_HERTZ__.state().qualityTier;
  });
  check("forceQualityTier(2)", tier === 2, String(tier));
  check("no console errors (eval)", errors.length === 0, errors.join(" | "));
  await page.close();
}

// ---- 3. Lifecycle: center class toggles once per crossing ------------------
{
  const { page, errors } = await newPage(BASE + "/?eval=1");
  await page.waitForFunction(() => window.__ONE_HERTZ__?.state().uiFlags.loaderDone, null, { timeout: LOADER_TIMEOUT_MS });
  const r = await page.evaluate(() => {
    const H = window.__ONE_HERTZ__;
    H.gotoSection("Curves", 0.5);
    const curvesCenter = document.querySelector('[data-section="Curves"]').classList.contains("is-center");
    const others = [...document.querySelectorAll("[data-section].is-center")].map((e) => e.dataset.section);
    H.gotoSection("Straps", 0.5);
    const afterMove = document.querySelector('[data-section="Curves"]').classList.contains("is-center");
    const strapsCenter = document.querySelector('[data-section="Straps"]').classList.contains("is-center");
    const inCenterCount = H.state().sections.filter((s) => s.inCenter).length;
    return { curvesCenter, others, afterMove, strapsCenter, inCenterCount };
  });
  check("lifecycle: enterCenter marks Curves only", r.curvesCenter && r.others.length === 1 && r.others[0] === "Curves", JSON.stringify(r.others));
  check("lifecycle: leaveCenter fires on jump away, Straps gains center",
    r.afterMove === false && r.strapsCenter === true && r.inCenterCount === 1, JSON.stringify(r));
  check("no console errors (lifecycle)", errors.length === 0, errors.join(" | "));
  await page.close();
}

// ---- 4. Deep link ?scroll= --------------------------------------------------
{
  const { page, errors } = await newPage(BASE + "/?eval=1&scroll=Nocturne");
  await page.waitForFunction(() => window.__ONE_HERTZ__?.state().uiFlags.loaderDone, null, { timeout: LOADER_TIMEOUT_MS });
  const active = await page.evaluate(() => window.__ONE_HERTZ__.state().activeSection);
  check("?scroll=Nocturne lands on Nocturne", active === "Nocturne", String(active));
  check("no console errors (?scroll)", errors.length === 0, errors.join(" | "));
  await page.close();
}

// ---- 5. Solo sandbox --------------------------------------------------------
{
  const { page, errors } = await newPage(BASE + "/?eval=1&solo=Mechanism");
  await page.waitForFunction(() => window.__ONE_HERTZ__?.state().uiFlags.loaderDone, null, { timeout: LOADER_TIMEOUT_MS });
  const r = await page.evaluate(() => ({
    tracks: document.querySelectorAll("[data-section]").length,
    manifest: window.__ONE_HERTZ__.state().sections.map((s) => s.name),
    solo: window.__ONE_HERTZ__.state().uiFlags.soloSection,
  }));
  check("solo: only Mechanism mounted", r.tracks === 1 && r.manifest.join() === "Mechanism" && r.solo === "Mechanism", JSON.stringify(r));
  check("no console errors (solo)", errors.length === 0, errors.join(" | "));
  await page.close();
}

// ---- 6. Autoscroll ----------------------------------------------------------
{
  const { page, errors } = await newPage(BASE + "/?eval=1&autoscroll&autoscrollspeed=4000");
  await page.waitForFunction(() => window.__ONE_HERTZ__?.state().uiFlags.loaderDone, null, { timeout: LOADER_TIMEOUT_MS });
  const s0 = await page.evaluate(() => window.__ONE_HERTZ__.state().scroll);
  await page.waitForTimeout(1500);
  const s1 = await page.evaluate(() => window.__ONE_HERTZ__.state().scroll);
  check("autoscroll advances at requested pace", s1 - s0 > 3000, `moved ${Math.round(s1 - s0)}px in 1.5s`);
  check("no console errors (autoscroll)", errors.length === 0, errors.join(" | "));
  await page.close();
}

// ---- 7. Materials inspector -------------------------------------------------
{
  const { page, errors } = await newPage(BASE + "/?eval=1&materials");
  await page.waitForFunction(() => window.__ONE_HERTZ__?.state().uiFlags.loaderDone, null, { timeout: LOADER_TIMEOUT_MS });
  const rows = await page.evaluate(() => document.querySelectorAll("#materials-inspector tbody tr").length);
  check("?materials inspector renders rows", rows >= 2, `rows=${rows}`);
  check("no console errors (materials)", errors.length === 0, errors.join(" | "));
  await page.close();
}

// ---- 8. Non-eval sticky pin sanity -----------------------------------------
{
  const { page, errors } = await newPage(BASE + "/");
  await page.waitForFunction(() => !document.getElementById("loader"), null, { timeout: LOADER_TIMEOUT_MS });
  await page.evaluate(() => window.__ONE_HERTZ__.gotoSection("Disassembly", 0.5));
  await page.waitForTimeout(400);
  const pinTop = await page.evaluate(
    () => document.querySelector('[data-section="Disassembly"] .pin').getBoundingClientRect().top,
  );
  check("sticky pin at top mid-track (no ScrollTrigger)", Math.abs(pinTop) < 1, `top=${pinTop}`);
  check("no console errors (pin)", errors.length === 0, errors.join(" | "));
  await page.close();
}

await browser.close();
console.log(results.join("\n"));
console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
