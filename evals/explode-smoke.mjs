/* P3 explode-system smoke (lane gate) — headless REAL Chrome via playwright-core.
 *
 * Usage:  npx vite preview --port 4573 &   (or BASE=<url>)
 *         node evals/explode-smoke.mjs
 *
 * Asserts every rubric explode sub-mechanic (evals/rubric.yaml mechanic 3)
 * plus the lane grafts: full 7-part internals roster, sensor foam peel,
 * taptic tick-back (live 8 Hz osc + eval freeze), Nocturne 1 Hz LED.
 * Captures interaction evidence frames into docs/p3/explode/.
 */
import { createRequire } from "node:module";
import { globSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
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
const SHOTS_DIR = path.join(import.meta.dirname, "..", "docs", "p3", "explode");
mkdirSync(SHOTS_DIR, { recursive: true });

const PART_ORDER = [
  "part_crystal", "part_screen", "part_display", "part_sip", "part_battery",
  "part_speaker", "part_taptic", "part_sensor_array", "part_crown_asm", "part_backCrystal",
];

const results = [];
let failures = 0;
function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
}

const browser = await chromium.launch({ channel: "chrome", headless: true });

async function newPage(url, opts = {}) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, ...opts });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: "networkidle" });
  return { page, errors };
}

const st = (page) => page.evaluate(() => window.__ONE_HERTZ__.state());
const goto = (page, id, p) =>
  page.evaluate(([i, lp]) => window.__ONE_HERTZ__.gotoSection(i, lp), [id, p]);
const emit = (page, ev, payload) =>
  page.evaluate(([e, pl]) => window.__ONE_HERTZ__.bus.emit(e, pl), [ev, payload]);
const shoot = (page, name) => page.screenshot({ path: path.join(SHOTS_DIR, name) });

// ============================================================================
// A · Eval page — deterministic structural checks
// ============================================================================
{
  const { page, errors } = await newPage(BASE + "/?eval=1");
  await page.waitForFunction(() => window.__ONE_HERTZ__?.state().uiFlags.loaderDone, null, {
    timeout: 20000,
  });
  // Full roster: internals are not loader tasks — gate on readiness + parts.
  await page.waitForFunction(
    () => {
      const s = window.__ONE_HERTZ__.state();
      return s.disassembly?.internalsReady === true && s.explode?.parts?.length === 10;
    },
    null,
    { timeout: 20000 },
  );

  // -- 1 · roster + proxy hitboxes -------------------------------------------
  {
    const s = await st(page);
    const ids = s.explode.parts.map((p) => p.id);
    check("roster: 10 parts in manifest order", ids.join() === PART_ORDER.join(), ids.join());
    check(
      "all parts report hasProxyHitbox",
      s.explode.parts.every((p) => p.hasProxyHitbox === true),
    );
    check("internals attached 7/7", s.disassembly.internals === 7, String(s.disassembly.internals));
  }

  // -- 2 · XPLOD_ALL beat on the scrub timeline ------------------------------
  {
    await goto(page, "Disassembly", 0.5);
    const s = await st(page);
    const offsets = s.explode.parts.map((p) => p.offsetFromRest);
    check("gotoSection(Disassembly,.5): mode==='all'", s.explode.mode === "all", s.explode.mode);
    check(
      "all parts offset from rest at the fan beat",
      offsets.every((o) => o > 0),
      offsets.map((o) => o.toFixed(4)).join(","),
    );
    check("store token bridged to 'exploded'", s.explode.token === "exploded", s.explode.token);
    await shoot(page, "fan-open-05.png");
  }

  // -- 3 · click each part's projected center → SET_CLICKED_MESH -------------
  {
    let ok = 0;
    const misses = [];
    for (let i = 0; i < PART_ORDER.length; i++) {
      const s = await st(page); // live projection per iteration
      const part = s.explode.parts[i];
      const { x, y } = part.screenPos;
      if (x < 0 || x > 1600 || y < 0 || y > 900) {
        misses.push(`${part.id}: off-viewport (${x.toFixed(0)},${y.toFixed(0)})`);
        continue;
      }
      await page.mouse.click(x, y);
      await page.waitForTimeout(120);
      const sel = (await st(page)).explode.selected;
      if (sel === part.id) ok++;
      else misses.push(`${part.id}->${sel}`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(900); // let the 1.6s focus close mostly relax
    }
    check(`projected-center click selects every part (10/10)`, ok === 10, misses.join(" "));
    await page.waitForTimeout(1200); // fully settled before the lookAt check
  }

  // -- 4 · camera lookAt lerps to the part (no snap) -------------------------
  {
    const s0 = await st(page);
    const base = s0.camera.lookAt;
    const target = s0.explode.parts[3]; // part_sip mid-fan
    await page.mouse.click(target.screenPos.x, target.screenPos.y);
    // In-page sampling (no CDP round-trip jitter), 13 × 165ms spanning the
    // full 2s open lerp + settled tail — the 30% per-sample bound is against
    // the whole approach; power3.inOut's mid slope is 1.5/s so 165ms keeps a
    // ~25% theoretical peak with real margin for timer jitter.
    const samples = await page.evaluate(async () => {
      const out = [];
      for (let i = 0; i < 13; i++) {
        out.push({ ...window.__ONE_HERTZ__.state().camera.lookAt });
        await new Promise((r) => setTimeout(r, 165));
      }
      return out;
    });
    const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    const end = samples[samples.length - 1];
    const total = d(samples[0], end);
    let monotonic = true;
    let maxJump = 0;
    for (let i = 1; i < samples.length; i++) {
      if (d(samples[i], end) > d(samples[i - 1], end) + 1e-6) monotonic = false;
      if (total > 1e-6) maxJump = Math.max(maxJump, d(samples[i - 1], samples[i]) / total);
    }
    check(
      "lookAt approaches the part monotonically, no frame jump >30%",
      total > 1e-3 && monotonic && maxJump <= 0.3,
      `total=${total.toFixed(3)} monotonic=${monotonic} maxJump=${(maxJump * 100).toFixed(0)}%`,
    );
    check("selection state: part-focus token", (await st(page)).explode.token === "part-focus");
  }

  // -- 5 · selected part idle-rotates at 0.15 rad/s --------------------------
  {
    const a = await page.evaluate(() => ({
      rot: window.__ONE_HERTZ__.state().explode.selectedRotationY,
      t: performance.now(),
    }));
    await page.waitForTimeout(1000);
    const b = await page.evaluate(() => ({
      rot: window.__ONE_HERTZ__.state().explode.selectedRotationY,
      t: performance.now(),
    }));
    const rate = (b.rot - a.rot) / ((b.t - a.t) / 1000);
    check(
      "selected idle rotation = 0.15 rad/s ±10%",
      Math.abs(rate - 0.15) <= 0.015,
      `rate=${rate.toFixed(4)}`,
    );
  }

  // -- 6 · overlay anchored ≤8px + unique real copy --------------------------
  {
    // Park the pointer away from the card: hovering it FREEZES the anchor
    // by design (buttons must not slide from under the cursor).
    await page.mouse.move(40, 40);
    await page.waitForTimeout(600); // let the 2s focus lerp settle
    const overlay = await page.$("[data-explode-overlay]");
    check("[data-explode-overlay] present", overlay !== null);
    const deltas = [];
    for (let i = 0; i < 3; i++) {
      const box = await overlay.boundingBox();
      const cur = (await st(page)).explode.selectedScreenPos;
      if (box && cur) {
        deltas.push(Math.hypot(box.x - cur.x, box.y + box.height / 2 - cur.y));
      }
      await page.waitForTimeout(250);
    }
    const worst = Math.max(...deltas, 0);
    check(
      "overlay anchor within 8px of selectedScreenPos (3 frames)",
      deltas.length === 3 && worst <= 8,
      `worst=${worst.toFixed(1)}px`,
    );
    const copy = await page.evaluate(() => ({
      name: document.querySelector("[data-xpl-name]")?.textContent ?? "",
      desc: document.querySelector("[data-xpl-desc]")?.textContent ?? "",
    }));
    check(
      "overlay carries real per-part copy (name ≤22, desc 90–140 chars)",
      copy.name.length > 0 && copy.name.length <= 22 && copy.desc.length >= 90 && copy.desc.length <= 140,
      `name="${copy.name}" desc=${copy.desc.length}ch`,
    );
    await shoot(page, "part-selected-overlay.png");
  }

  // -- 7 · prev/next arrows + cursor icons + close ---------------------------
  {
    await page.hover("[data-explode-next]");
    await page.waitForTimeout(120);
    const iconNext = (await st(page)).cursor?.icon;
    check("hover next → arrow-right cursor icon", iconNext === "arrow-right", String(iconNext));
    const before = (await st(page)).explode.selected;
    await page.click("[data-explode-next]");
    await page.waitForTimeout(120);
    const after = (await st(page)).explode.selected;
    const idx = PART_ORDER.indexOf(before);
    check(
      "next advances in manifest order",
      after === PART_ORDER[(idx + 1) % PART_ORDER.length],
      `${before} -> ${after}`,
    );
    await page.hover("[data-explode-prev]");
    await page.waitForTimeout(120);
    check("hover prev → arrow-left icon", (await st(page)).cursor?.icon === "arrow-left");
    await page.click("[data-explode-prev]");
    await page.waitForTimeout(120);
    check("prev steps back", (await st(page)).explode.selected === before);
    // wrap: jump to the last part, next wraps to the first
    await emit(page, "SET_CLICKED_MESH", { part: PART_ORDER[9] });
    await page.waitForTimeout(120);
    await page.click("[data-explode-next]");
    await page.waitForTimeout(120);
    check("next wraps past the end", (await st(page)).explode.selected === PART_ORDER[0]);
    await page.hover("[data-explode-close]");
    await page.waitForTimeout(120);
    check("hover close → cross icon", (await st(page)).cursor?.icon === "cross");
    await page.click("[data-explode-close]");
    await page.waitForTimeout(200);
    const s = await st(page);
    check("close deselects (LEAVE_CLICKED_MESH)", s.explode.selected === null);
    await page.waitForTimeout(1700); // 1.6s close lerp
    const la = (await st(page)).camera.lookAt;
    check(
      "camera returns to section framing after close",
      Math.hypot(la.x - -0.68, la.y - -0.1, la.z) < 0.25,
      JSON.stringify(la),
    );
  }

  // -- 8 · drag-pan gating ----------------------------------------------------
  {
    const drag = async () => {
      await page.mouse.move(650, 450);
      await page.mouse.down();
      for (let i = 1; i <= 10; i++) await page.mouse.move(650 + i * 30, 450, { steps: 1 });
      await page.mouse.up();
      await page.waitForTimeout(150);
    };
    const s0 = await st(page);
    await page.mouse.click(s0.explode.parts[1].screenPos.x, s0.explode.parts[1].screenPos.y);
    await page.waitForTimeout(150);
    const a = (await st(page)).explode.clusterRotation;
    check("drag gating precondition: part selected, dragEnabled=false",
      (await st(page)).explode.selected !== null && (await st(page)).explode.dragEnabled === false);
    await drag();
    const b = (await st(page)).explode.clusterRotation;
    check("drag with selection: cluster rotation unchanged", Math.abs(b - a) < 1e-4, `Δ=${b - a}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const c = (await st(page)).explode.clusterRotation;
    await drag();
    const d2 = (await st(page)).explode.clusterRotation;
    check("drag after close: cluster rotates", Math.abs(d2 - c) > 1e-4, `Δ=${(d2 - c).toFixed(4)}`);
  }

  // -- 9 · XPLOD_ALL bus event (2s on / 1s off, ×1.65 spread) ----------------
  {
    await goto(page, "Disassembly", 0.03); // fan closed
    const s0 = await st(page);
    check("fan closed at p=.03 (mode assembled)", s0.explode.mode === "assembled", s0.explode.mode);
    await emit(page, "XPLOD_ALL", { on: true });
    await page.waitForTimeout(2300);
    const s1 = await st(page);
    check(
      "XPLOD_ALL on: mode 'all', ramp ≈1, parts offset",
      s1.explode.mode === "all" && s1.explode.xplodAll > 0.95 &&
        s1.explode.parts.every((p) => p.offsetFromRest > 0),
      `mode=${s1.explode.mode} ramp=${s1.explode.xplodAll}`,
    );
    await shoot(page, "xplod-all-event.png");
    await emit(page, "XPLOD_ALL", { on: false });
    await page.waitForTimeout(1300);
    const s2 = await st(page);
    check("XPLOD_ALL off: ramp back to 0", s2.explode.xplodAll < 0.05, String(s2.explode.xplodAll));
  }

  // -- 10 · taptic tick-back frozen under eval -------------------------------
  {
    await goto(page, "Disassembly", 0.5);
    const s = await st(page);
    const taptic = s.explode.parts.find((p) => p.id === "part_taptic");
    await page.mouse.move(taptic.screenPos.x, taptic.screenPos.y);
    await page.waitForTimeout(200);
    const t1 = (await st(page)).explode.tapticTick;
    await page.waitForTimeout(200);
    const t2 = (await st(page)).explode.tapticTick;
    check(
      "eval: taptic hover active, oscillation FROZEN (determinism kit)",
      t1.active === true && t1.offset === t2.offset,
      `offsets ${t1.offset}/${t2.offset}`,
    );
  }

  // -- 11 · Nocturne LED frozen under eval -----------------------------------
  {
    await goto(page, "Nocturne", 0.5);
    const l1 = (await st(page)).explode.nocturneLed;
    await page.waitForTimeout(400);
    const l2 = (await st(page)).explode.nocturneLed;
    check(
      "eval: Nocturne LED gated, pulse FROZEN, red dark",
      l1.gated === true && l1.green === l2.green && l1.red === 0,
      JSON.stringify(l1),
    );
    await goto(page, "Disassembly", 0.5);
    check("LED gate releases outside Nocturne", (await st(page)).explode.nocturneLed.gated === false);
  }

  check("no console errors (eval page)", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

// ============================================================================
// B · Live page — wall-clock behaviors (taptic 8 Hz, LED 1 Hz)
// ============================================================================
{
  const { page, errors } = await newPage(BASE + "/");
  await page.waitForFunction(() => !document.getElementById("loader"), null, { timeout: 25000 });
  await page.waitForFunction(
    () => window.__ONE_HERTZ__?.state().explode?.parts?.length === 10,
    null,
    { timeout: 20000 },
  );
  await goto(page, "Disassembly", 0.5);
  await page.waitForTimeout(600); // non-eval: let the frame pipeline settle

  // -- taptic tick-back oscillates at ~8 Hz on hover -------------------------
  {
    const taptic = (await st(page)).explode.parts.find((p) => p.id === "part_taptic");
    await page.mouse.move(taptic.screenPos.x, taptic.screenPos.y);
    await page.waitForTimeout(150);
    const samples = [];
    for (let i = 0; i < 8; i++) {
      samples.push((await st(page)).explode.tapticTick);
      await page.waitForTimeout(35);
    }
    const distinct = new Set(samples.map((s) => s.offset)).size;
    const amp = Math.max(...samples.map((s) => Math.abs(s.offset)));
    check(
      "live: taptic hover oscillates (±0.4mm cap, moving)",
      samples.every((s) => s.active) && distinct >= 3 && amp > 0 && amp <= 0.000401,
      `distinct=${distinct} amp=${amp}`,
    );
    await page.mouse.move(50, 50);
    await page.waitForTimeout(120);
    check("live: oscillation stops off-hover", (await st(page)).explode.tapticTick.active === false);
  }

  // -- Nocturne LED pulses at real 1 Hz --------------------------------------
  {
    await goto(page, "Nocturne", 0.5);
    await page.waitForTimeout(400);
    const greens = [];
    for (let i = 0; i < 14; i++) {
      greens.push((await st(page)).explode.nocturneLed.green);
      await page.waitForTimeout(100);
    }
    const min = Math.min(...greens);
    const max = Math.max(...greens);
    const red = (await st(page)).explode.nocturneLed.red;
    check(
      "live: led_green pulses over ~1.4s window; led_red dark",
      max > min * 1.5 && red === 0,
      `green ${min.toFixed(2)}..${max.toFixed(2)} red=${red}`,
    );
    await shoot(page, "nocturne-led.png");
  }

  check("no console errors (live page)", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

// ============================================================================
// C · Mobile — 15px tap tolerance + gesture arbitration (390×844 touch)
// ============================================================================
{
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 3,
  });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE + "/?eval=1", { waitUntil: "networkidle" });
  await page.waitForFunction(
    () =>
      window.__ONE_HERTZ__?.state().uiFlags.loaderDone &&
      window.__ONE_HERTZ__.state().explode?.parts?.length === 10,
    null,
    { timeout: 25000 },
  );
  await goto(page, "Disassembly", 0.5);

  const cdp = await page.context().newCDPSession(page);
  const gesture = async (pos, movePx) => {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: pos.x, y: pos.y }],
    });
    await page.waitForTimeout(60);
    if (movePx > 0) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: pos.x + movePx, y: pos.y }],
      });
      await page.waitForTimeout(60);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(250);
  };

  {
    const pos = (await st(page)).explode.parts[1].screenPos; // part_screen
    await gesture(pos, 10);
    const sel10 = (await st(page)).explode.selected;
    check("mobile: 10px-move tap selects", sel10 != null, String(sel10));
    await shoot(page, "mobile-tap-selected.png");
    await emit(page, "LEAVE_CLICKED_MESH", undefined);
    await page.waitForTimeout(250);
  }
  {
    const rot0 = (await st(page)).explode.clusterRotation;
    const pos = (await st(page)).explode.parts[1].screenPos;
    await gesture(pos, 20);
    const s = await st(page);
    check("mobile: 20px-move gesture never selects", s.explode.selected == null, String(s.explode.selected));
    check(
      "mobile: 20px horizontal travel becomes a cluster drag",
      Math.abs(s.explode.clusterRotation - rot0) > 1e-4,
      `Δ=${(s.explode.clusterRotation - rot0).toFixed(4)}`,
    );
  }
  await cdp.detach();
  check("no console errors (mobile page)", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

await browser.close();
console.log(results.join("\n"));
console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
