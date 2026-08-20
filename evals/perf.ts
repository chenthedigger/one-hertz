/**
 * evals/perf.ts — frame-time recorder around a scripted full-page scroll
 * (rubric §d: in-page rAF delta recorder, lenis-driven pass, NEVER
 * window.scrollTo).
 *
 *   node evals/perf.ts [url] [--round r1] [--duration 60] [--throttle]
 *                      [--tier n] [--label name]
 *
 * --throttle = mobile proxy mode: 390x844 DPR3 viewport + CDP 6x CPU throttle.
 *   The "GPU unthrottled" caveat is written verbatim into the output JSON and
 *   must be published in any report that uses it (rubric perf.method).
 *
 * Scroll driver preference order (recorded in the output):
 *   1. __ONE_HERTZ__.lenis.scrollTo(end, {duration})   — contract addition
 *   2. __ONE_HERTZ__.scrollTo(end, {duration})          — contract addition
 *   3. synthetic WheelEvent stream at 60Hz               — fallback; still
 *      exercises Lenis (it owns the wheel), slightly noisier input timing.
 *
 * Output: results/<round>/frametimes-<label>.json with the raw delta array
 * (committed per round, per rubric) + computed stats + gate verdicts.
 */

import path from "node:path";
import {
  frameStats,
  launch,
  loadRubric,
  log,
  newContext,
  openTarget,
  parseArgs,
  roundDir,
  roundName,
  targetUrl,
  writeJson,
} from "./lib.ts";

const args = parseArgs();
const url = targetUrl(args);
const round = roundName(args);
const rubric = loadRubric();
const durationSec = Number(args.flags["duration"] ?? 60);
const throttle = args.flags["throttle"] === true;
const tier = args.flags["tier"] !== undefined ? Number(args.flags["tier"]) : null;
const label =
  (args.flags["label"] as string | undefined) ??
  `${throttle ? "mobileproxy" : "desktop"}${tier !== null ? `-tier${tier}` : ""}`;

const CAVEAT_MOBILE_PROXY =
  "Mobile proxy = desktop real Chrome + CDP 6x CPU throttle at 390x844 DPR3 — GPU unthrottled.";

const browser = await launch();
try {
  const context = await newContext(browser, throttle ? "mobile" : "desktop");
  const page = await context.newPage();

  let cdp: Awaited<ReturnType<typeof context.newCDPSession>> | null = null;
  if (throttle) {
    cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
    log(`perf · CPU throttle 6x armed (${CAVEAT_MOBILE_PROXY})`);
  }

  log(`perf · ${label} · ${url} · scripted ${durationSec}s pass`);
  await openTarget(page, url);

  if (tier !== null) {
    const ok = await page.evaluate((t) => {
      const api = (window as unknown as Record<string, unknown>).__ONE_HERTZ__ as
        | { forceQualityTier?: (n: number) => void }
        | undefined;
      if (!api || typeof api.forceQualityTier !== "function") return false;
      api.forceQualityTier(t);
      return true;
    }, tier);
    log(ok ? `   quality tier forced: ${tier}` : `   !! forceQualityTier not exposed — running default tier`);
  }

  // Start the in-page rAF delta recorder, then the scroll driver.
  const driver = await page.evaluate((durSec) => {
    const w = window as unknown as Record<string, unknown> & {
      __ONE_HERTZ__?: {
        lenis?: { scrollTo?: (y: number, opts?: unknown) => void };
        scrollTo?: (y: number, opts?: unknown) => void;
      };
    };
    const rec: { deltas: number[]; running: boolean; driver: string } = {
      deltas: [],
      running: true,
      driver: "none",
    };
    w.__EVAL_PERF__ = rec;
    let last = performance.now();
    const loop = (now: number) => {
      rec.deltas.push(now - last);
      last = now;
      if (rec.running) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    const end = document.documentElement.scrollHeight - innerHeight;
    const api = w.__ONE_HERTZ__;
    if (api?.lenis && typeof api.lenis.scrollTo === "function") {
      api.lenis.scrollTo(end, { duration: durSec, easing: (t: number) => t });
      rec.driver = "lenis.scrollTo";
    } else if (api && typeof api.scrollTo === "function") {
      api.scrollTo(end, { duration: durSec });
      rec.driver = "__ONE_HERTZ__.scrollTo";
    } else {
      // Fallback: constant synthetic wheel stream — still routed through Lenis.
      const perTick = end / (durSec * 60);
      const iv = setInterval(() => {
        window.dispatchEvent(
          new WheelEvent("wheel", { deltaY: perTick, bubbles: true, cancelable: true }),
        );
        if (window.scrollY >= end - 2 || !rec.running) clearInterval(iv);
      }, 1000 / 60);
      rec.driver = "synthetic-wheel-60hz (fallback — expose lenis on __ONE_HERTZ__ for the contract driver)";
    }
    return rec.driver;
  }, durationSec);
  log(`   scroll driver: ${driver}`);

  // Wait for the pass: bottom reached or duration + grace elapsed.
  const started = Date.now();
  await page
    .waitForFunction(
      () => window.scrollY >= document.documentElement.scrollHeight - innerHeight - 2,
      undefined,
      { timeout: (durationSec + 20) * 1000 },
    )
    .catch(() => log("   !! bottom not reached within duration+20s — recording what we have"));
  const wallSec = (Date.now() - started) / 1000;

  const deltas = await page.evaluate(() => {
    const rec = (window as unknown as Record<string, unknown>).__EVAL_PERF__ as {
      deltas: number[];
      running: boolean;
    };
    rec.running = false;
    return rec.deltas;
  });

  if (cdp) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });

  // Drop the first 10 frames (driver spin-up; loader precompile is already
  // excluded because recording starts post-ready).
  const trimmed = deltas.slice(10);
  const stats = frameStats(trimmed);

  const gates = rubric.perf.gates;
  const verdicts = throttle
    ? {
        profile: "mobile_midtier_proxy",
        median_fps: { value: stats.medianFps, min: gates.mobile_midtier.median_fps_min, pass: stats.medianFps >= gates.mobile_midtier.median_fps_min },
      }
    : {
        profile: "desktop",
        median_fps: { value: stats.medianFps, min: gates.desktop.median_fps_min, pass: stats.medianFps >= gates.desktop.median_fps_min },
        p95_frame_ms: { value: stats.p95FrameMs, max: gates.desktop.p95_frame_ms_max, pass: stats.p95FrameMs <= gates.desktop.p95_frame_ms_max },
        frames_over_50ms: {
          value: stats.framesOver50ms,
          max: gates.desktop.frames_over_50ms_max_per_60s,
          pass: stats.framesOver50ms <= gates.desktop.frames_over_50ms_max_per_60s * Math.max(1, stats.durationSec / 60),
        },
      };

  const out = {
    round,
    label,
    target: url,
    ranAt: new Date().toISOString(),
    rubricVersion: rubric.meta.version,
    method: {
      driver,
      scriptedDurationSec: durationSec,
      wallSec: Math.round(wallSec * 10) / 10,
      cpuThrottle: throttle ? 6 : 1,
      viewport: throttle ? "390x844@DPR3" : "1600x900@DPR2",
      qualityTier: tier,
      caveat: throttle ? CAVEAT_MOBILE_PROXY : null,
      trimmedLeadingFrames: 10,
      trace_crosscheck: "TODO — one CDP Performance trace per round (rubric perf.method)",
    },
    stats,
    gates: verdicts,
    frameDeltasMs: trimmed.map((d) => Math.round(d * 100) / 100),
  };

  const file = path.join(roundDir(round), `frametimes-${label}.json`);
  writeJson(file, out);
  log(
    `\nperf ${label}: median ${stats.medianFps}fps · p95 ${stats.p95FrameMs}ms · ${stats.framesOver50ms} frames >50ms · ${stats.frames} frames / ${stats.durationSec}s`,
  );
  const gateEntries = Object.entries(verdicts).filter(([, v]) => typeof v === "object");
  for (const [k, v] of gateEntries) {
    const g = v as { value: number; pass: boolean };
    log(`   gate ${k}: ${g.pass ? "PASS" : "FAIL"} (${g.value})`);
  }
  if (throttle) log(`   caveat: ${CAVEAT_MOBILE_PROXY}`);
  log(`-> ${path.relative(process.cwd(), file)}`);
} finally {
  await browser.close();
}
