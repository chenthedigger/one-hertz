/* P4 copy-lane smoke — final copy pass truths on the live DOM.
 *
 * Usage:  npx vite preview --port 4640 &   (or BASE=<url>)
 *         node evals/copy-smoke.mjs
 *
 * Asserts (adversarial copy review, PLAN §5 P4 + founder 2026-08-26):
 *   - Apple spec truth: gallery edge-on cell reads SIDE-12MM (apple.com
 *     Ultra 3 "Depth: 12mm" — 14.4 was the Ultra 2), no 14mm residue;
 *   - Ocean-only truth: Straps rail lists exactly the three REAL Ocean
 *     colors (Black / Anchor Blue / Neon Green), live tick follows the
 *     active config across a swap, no Alpine/Trail/Milanese pseudo-options;
 *   - Colors lead says "Three Ocean colors" (three real colors, four
 *     finish×color editions);
 *   - Fraunces: exactly ONE serif moment sitewide (Nocturne lead), the
 *     italic variable font actually loads, computed size ≥40px (§4 law);
 *   - MWR annotation: FLAT SAPPHIRE (no "Liquid Glass" on hardware);
 *   - credits slate: 60fps design-language credit, built by CHEN,
 *     "as of watchOS 26 · August 2026", every row ≤44 chars (§8);
 *   - cursor vocabulary untouched (fixed: HOLD TO EXPLORE/SELECT MODEL/SWAP);
 *   - zero console errors.
 *
 * Captures → docs/p4/copy/*.png (evidence frames, ?eval=1 deterministic).
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
const SHOTS = "docs/p4/copy";
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
    console.log("SKIP: no WebGL context available on this runner — copy smoke skipped");
    await browser.close();
    process.exit(78);
  }
}

const page = await browser.newPage({
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 2,
});
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(BASE + "/?eval=1", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__ONE_HERTZ__?.state().uiFlags.loaderDone, null, {
  timeout: LOADER_TIMEOUT_MS,
});

const goto_ = (id, p) =>
  page.evaluate(([i, pp]) => window.__ONE_HERTZ__.gotoSection(i, pp), [id, p]);
const settle = () => page.waitForTimeout(400);
const text = (sel) =>
  page.evaluate((s) => document.querySelector(s)?.textContent?.trim() ?? null, sel);
const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}.png` });

// ---- 1. Gallery: SIDE-12MM spec truth --------------------------------------
await goto_("Images", 0.5);
await settle();
const galLabels = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".gal__label")).map((el) => el.textContent.trim()),
);
check(
  "gallery: edge-on cell reads SIDE-12MM (apple.com Ultra 3 depth)",
  galLabels.some((l) => l.includes("SIDE-12MM")) && !galLabels.some((l) => l.includes("14")),
  `labels=[${galLabels.join(" | ")}]`,
);
await shot("d-Images-50");

// ---- 2. Straps: MOLDED title + Ocean color rail ----------------------------
await goto_("Straps", 0.25);
await settle();
const strapGhost = await page.evaluate(
  () => document.querySelector(".strp__t-ghost")?.getAttribute("aria-label") ?? null,
);
check("straps: ghost title is MOLDED, (materials-true)", strapGhost === "MOLDED,", `ghost=${strapGhost}`);
await shot("d-Straps-25");

await goto_("Straps", 0.5);
await settle();
const cardEyebrow = await text(".strp__card .strp__eyebrow");
const cardUnit = await text(".strp__unit");
check(
  "straps: card grammar unified (CATALOG 03/03 · bpm)",
  cardEyebrow === "CATALOG 03/03" && cardUnit === "bpm",
  `eyebrow=${cardEyebrow} unit=${cardUnit}`,
);
await shot("d-Straps-50");

await goto_("Straps", 0.75);
await settle();
const rail = await page.evaluate(() => ({
  label: document.querySelector(".strp__family .strp__eyebrow")?.textContent.trim(),
  items: Array.from(document.querySelectorAll(".strp__fam-item")).map((el) => ({
    label: el.textContent.trim(),
    band: el.dataset.band,
    live: el.classList.contains("strp__fam-item--live"),
  })),
  caption: document.querySelector(".strp__family .strp__caption")?.textContent.trim(),
}));
check(
  "straps rail: exactly the 3 real Ocean colors, no Alpine/Trail/Milanese",
  rail.label === "OCEAN BAND" &&
    rail.items.length === 3 &&
    rail.items.map((i) => i.label).join(",") === "ANCHOR BLUE,BLACK,NEON GREEN",
  JSON.stringify(rail),
);
check(
  "straps rail: boot live tick on the boot config's band (anchor-blue)",
  rail.items.find((i) => i.live)?.band === "anchor-blue",
  JSON.stringify(rail.items),
);
await shot("d-Straps-75");

// Live tick follows a swap (CONFIG_CHANGE consumer truth).
await page.evaluate(() => window.__ONE_HERTZ__.setConfig("natural-neon-green"));
await page.waitForTimeout(1300); // 1 s tween + margin
const railAfter = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".strp__fam-item")).map((el) => ({
    band: el.dataset.band,
    live: el.classList.contains("strp__fam-item--live"),
  })),
);
check(
  "straps rail: live tick follows the active band across a swap",
  railAfter.find((i) => i.live)?.band === "neon-green" &&
    railAfter.filter((i) => i.live).length === 1,
  JSON.stringify(railAfter),
);
await shot("x-straps-rail-swap");
await page.evaluate(() => window.__ONE_HERTZ__.setConfig("natural-anchor-blue"));
await page.waitForTimeout(1300);

// ---- 3. Colors: three-real-colors lead -------------------------------------
await goto_("Colors", 0.5);
await settle();
const colorsLead = await text(".col__lead");
check(
  "colors: lead says Three Ocean colors (3 real colors, 4 editions)",
  colorsLead === "Two finishes. Three Ocean colors. One heart.",
  `lead=${colorsLead}`,
);
await shot("d-Colors-50");

// ---- 4. Nocturne: THE Fraunces moment --------------------------------------
await goto_("Nocturne", 0.25);
await settle();
const fraunces = await page.evaluate(() => {
  const lead = document.querySelector(".noc__lead");
  const cs = lead ? getComputedStyle(lead) : null;
  const serifCount = Array.from(document.querySelectorAll("body *")).filter((el) =>
    getComputedStyle(el).fontFamily.startsWith("Fraunces"),
  ).length;
  return {
    family: cs?.fontFamily ?? null,
    sizePx: cs ? parseFloat(cs.fontSize) : 0,
    style: cs?.fontStyle ?? null,
    loaded: document.fonts.check(`italic 380 ${cs?.fontSize ?? "48px"} Fraunces`),
    serifCount,
    text: lead?.textContent?.trim() ?? null,
  };
});
check(
  "nocturne: Fraunces italic loads and renders the lead at ≥40px",
  fraunces.family?.startsWith("Fraunces") &&
    fraunces.style === "italic" &&
    fraunces.sizePx >= 40 &&
    fraunces.loaded,
  JSON.stringify(fraunces),
);
check(
  "fraunces: exactly ONE serif moment sitewide (§4 law)",
  fraunces.serifCount === 1,
  `elements=${fraunces.serifCount}`,
);
await shot("d-Nocturne-25");

// ---- 5. MWR: hardware vocabulary -------------------------------------------
await goto_("MovementWatchRight", 0.75);
await settle();
const mwr = await page.evaluate(() => document.body.textContent);
check(
  "mwr: FLAT SAPPHIRE annotation, no 'LIQUID GLASS' on hardware",
  mwr.includes("FLAT SAPPHIRE") && !mwr.includes("LIQUID GLASS"),
);
await shot("d-MWR-75");

// ---- 6. Hands: working-rate card -------------------------------------------
await goto_("Hands", 0.75);
await settle();
const handsCard = await page.evaluate(() => ({
  zones: document.querySelector(".hnd__card-zones")?.textContent.trim(),
  caption: document.querySelector(".hnd__card-caption")?.textContent.trim(),
  body: document.querySelector(".hnd__body--a")?.textContent.trim(),
}));
check(
  "hands: tempo/max zones + working-rate caption + 12mm body (US spelling)",
  handsCard.zones === "tempo / max" &&
    handsCard.caption === "Working rate. The case keeps its posture." &&
    handsCard.body === "Twelve millimeters of titanium, and proud of every one.",
  JSON.stringify(handsCard),
);
await shot("d-Hands-75");

// ---- 7. Movement: verified reliability line --------------------------------
await goto_("Movement", 0.55);
await settle();
const reliability = await text(".mvt__body--reliability");
check(
  "movement: reliability line uses verified features only",
  reliability === "Crash and fall detection. It calls when you can't.",
  `line=${reliability}`,
);
await shot("d-Movement-55");

// ---- 8. Parts: honest microphone row ---------------------------------------
await goto_("Parts", 0.75);
await settle();
const partsText = await page.evaluate(() => document.body.textContent);
check(
  "parts: microphone reads 'to 130 dB' (Noise-app truth)",
  partsText.includes("to 130 dB") && !partsText.includes("0–130"),
);
await shot("d-Parts-75");

// ---- 9. Footer: credits slate ----------------------------------------------
await goto_("Footer", 1);
await settle();
const credits = await page.evaluate(() => ({
  rows: Array.from(document.querySelectorAll(".outro__row")).map((r) => ({
    role: r.querySelector(".outro__role")?.textContent.trim(),
    value: r.querySelector(".outro__value")?.textContent.trim(),
  })),
  fin: document.querySelector(".outro__fin")?.textContent.trim(),
}));
const values = credits.rows.map((r) => r.value ?? "");
check(
  "credits: 60fps credit + CHEN + watchOS 26 lineup line present",
  values.some((v) => v.includes("60fps")) &&
    values.some((v) => v === "CHEN") &&
    values.some((v) => v === "as of watchOS 26 · August 2026"),
  JSON.stringify(credits.rows),
);
check(
  "credits: ≤7 lines, every line ≤44 chars (§8 budget)",
  credits.rows.length + 1 <= 7 &&
    values.every((v) => v.length <= 44) &&
    (credits.fin?.length ?? 99) <= 44,
  `rows=${credits.rows.length} maxLen=${Math.max(...values.map((v) => v.length))}`,
);
await shot("d-Footer-100");

// ---- 10. Cursor vocabulary untouched ---------------------------------------
const vocab = await page.evaluate(() => {
  const els = document.querySelectorAll("[data-cursor-text]");
  return Array.from(new Set(Array.from(els).map((el) => el.dataset.cursorText))).sort();
});
check(
  "cursor: fixed vocabulary only (holdToExplore/selectModel/swap tokens)",
  vocab.every((t) => ["holdToExplore", "selectModel", "swap"].includes(t)),
  `tokens=[${vocab.join(", ")}]`,
);

check("no console errors", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
console.log(results.join("\n"));
console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
