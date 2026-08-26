/**
 * evals/waterfall.mjs — first-load network waterfall probe (P4 perf lane).
 *
 *   node evals/waterfall.mjs [url] [--label name]
 *
 * Records every network request from navigation to networkidle: URL, bytes,
 * start/end offsets, and whether it finished BEFORE the loader dismissed
 * (i.e. whether its bytes sat in the blocking first-load window). Also
 * records loader-ready wall time and first-paint of the loader shell.
 *
 * Output: JSON to stdout + evals/results/p4-perf/waterfall-<label>.json
 */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--")) ?? "http://localhost:4640/";
const labelIx = args.indexOf("--label");
const label = labelIx >= 0 ? args[labelIx + 1] : "current";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await context.newPage();

const t0 = { v: 0 };
const reqs = new Map();
page.on("request", (r) => {
  reqs.set(r.url(), { url: r.url(), start: Date.now() - t0.v, end: null, bytes: 0 });
});
page.on("requestfinished", async (r) => {
  const rec = reqs.get(r.url());
  if (!rec) return;
  rec.end = Date.now() - t0.v;
  try {
    const resp = await r.response();
    const body = resp ? await resp.body().catch(() => null) : null;
    rec.bytes = body ? body.length : 0;
    rec.status = resp?.status();
  } catch {
    /* ignore */
  }
});

t0.v = Date.now();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
const domContentLoaded = Date.now() - t0.v;

// Loader shell visible = loader element present + painted (first rAF after DCL).
await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))));
const loaderPainted = Date.now() - t0.v;

// Wait for loader dismissal (app ready).
let loaderReady = null;
try {
  await page.waitForFunction(
    () => {
      const api = window.__ONE_HERTZ__;
      if (!api || typeof api.state !== "function") return false;
      const s = api.state();
      return s?.loader?.done === true || s?.loader?.dismissed === true ||
        document.getElementById("loader")?.classList.contains("is-done") ||
        getComputedStyle(document.getElementById("loader") ?? document.body).display === "none" ||
        (document.getElementById("loader")?.style.opacity === "0");
    },
    undefined,
    { timeout: 90_000 },
  );
  loaderReady = Date.now() - t0.v;
} catch {
  // fall back: readiness via state().ready if exposed
  loaderReady = -1;
}

await page.waitForLoadState("networkidle", { timeout: 120_000 }).catch(() => {});
const idle = Date.now() - t0.v;
// one settle beat for straggler requestfinished events
await new Promise((r) => setTimeout(r, 1500));

const rows = [...reqs.values()].sort((a, b) => a.start - b.start);
const total = rows.reduce((s, r) => s + (r.bytes ?? 0), 0);
const beforeReady = rows.filter((r) => loaderReady > 0 && r.end !== null && r.end <= loaderReady);
const blockingBytes = beforeReady.reduce((s, r) => s + (r.bytes ?? 0), 0);

const out = {
  url,
  label,
  timestamps: { domContentLoaded, loaderPainted, loaderReady, networkIdle: idle },
  totals: {
    requests: rows.length,
    totalBytes: total,
    totalMB: +(total / 1048576).toFixed(2),
    finishedBeforeLoaderReady: beforeReady.length,
    bytesBeforeLoaderReady: blockingBytes,
    mbBeforeLoaderReady: +(blockingBytes / 1048576).toFixed(2),
  },
  requests: rows.map((r) => ({
    url: r.url.replace(/^https?:\/\/[^/]+/, ""),
    kb: +((r.bytes ?? 0) / 1024).toFixed(1),
    start: r.start,
    end: r.end,
    beforeLoaderReady: loaderReady > 0 && r.end !== null && r.end <= loaderReady,
  })),
};

mkdirSync("evals/results/p4-perf", { recursive: true });
writeFileSync(`evals/results/p4-perf/waterfall-${label}.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.timestamps), JSON.stringify(out.totals));
for (const r of out.requests) {
  console.log(
    `${String(r.start).padStart(6)}ms → ${String(r.end).padStart(6)}ms  ${String(r.kb).padStart(8)} KB  ${r.beforeLoaderReady ? "BLOCK" : "     "}  ${r.url}`,
  );
}
await browser.close();
