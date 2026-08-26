/**
 * evals/ab-proof.ts — A/B beauty-safety proof for the P4 perf lane.
 *
 *   node evals/ab-proof.ts [url] [--frames Intro_0.5,Curves_0.5,...]
 *
 * Captures a set of judged frames (same eval addressing as capture.ts) into
 * evals/results/p4-perf/ab/<file> and pixel-diffs each against the frozen
 * evals/reference/ours/desktop/<file> IN THE BROWSER (canvas ImageData —
 * zero new deps). Reports max channel delta + % pixels differing >2/255.
 *
 * Never writes into evals/reference/ — the frozen set stays frozen.
 */
import path from "node:path";
import { readFileSync } from "node:fs";
import {
  ensureDir,
  gotoSection,
  launch,
  log,
  newContext,
  openTarget,
  parseArgs,
  targetUrl,
} from "./lib.ts";

const args = parseArgs();
const url = targetUrl(args);
const framesArg =
  (args.flags["frames"] as string | undefined) ??
  "Intro_0.5,Disassembly_0.5,Mechanism_0.5,Movement_0.7,Curves_0.5,Hands_0.75,Nocturne_0.5,Colors_0.75,Parts_0.5,Footer_1";
const wanted = framesArg.split(",").map((s) => s.trim());

const REF_DIR = path.resolve("evals/reference/ours/desktop");
const OUT_DIR = ensureDir(path.resolve("evals/results/p4-perf/ab"));

const browser = await launch();
const results: {
  frame: string;
  maxDelta: number;
  pctOver2: number;
  verdict: string;
}[] = [];
try {
  const context = await newContext(browser, "desktop");
  const page = await context.newPage();
  await openTarget(page, url);

  for (const frame of wanted) {
    const m = frame.match(/^(.+)_([\d.]+)$/);
    if (!m) {
      log(`!! bad frame spec: ${frame}`);
      continue;
    }
    const [, id, pStr] = m;
    const ok = await gotoSection(page, id!, Number(pStr));
    if (!ok) {
      log(`!! gotoSection(${id}, ${pStr}) failed`);
      results.push({ frame, maxDelta: -1, pctOver2: -1, verdict: "ADDRESS-FAIL" });
      continue;
    }
    const file = `${id}_${pStr}.png`;
    const outPath = path.join(OUT_DIR, file);
    await page.screenshot({ path: outPath });

    // In-browser pixel diff against the frozen reference.
    const refPath = path.join(REF_DIR, file);
    let refB64: string;
    try {
      refB64 = readFileSync(refPath).toString("base64");
    } catch {
      results.push({ frame, maxDelta: -1, pctOver2: -1, verdict: "NO-REF" });
      continue;
    }
    const newB64 = readFileSync(outPath).toString("base64");
    const diff = await page.evaluate(
      async ([a, b]) => {
        const load = (b64: string) =>
          new Promise<HTMLImageElement>((res, rej) => {
            const img = new Image();
            img.onload = () => res(img);
            img.onerror = rej;
            img.src = `data:image/png;base64,${b64}`;
          });
        const [ia, ib] = await Promise.all([load(a!), load(b!)]);
        if (ia.width !== ib.width || ia.height !== ib.height) {
          return { maxDelta: 255, pctOver2: 100, note: "size-mismatch" };
        }
        const cv = document.createElement("canvas");
        cv.width = ia.width;
        cv.height = ia.height;
        const cx = cv.getContext("2d", { willReadFrequently: true })!;
        cx.drawImage(ia, 0, 0);
        const da = cx.getImageData(0, 0, cv.width, cv.height).data;
        cx.clearRect(0, 0, cv.width, cv.height);
        cx.drawImage(ib, 0, 0);
        const db = cx.getImageData(0, 0, cv.width, cv.height).data;
        let maxDelta = 0;
        let over2 = 0;
        const n = da.length;
        for (let i = 0; i < n; i += 4) {
          const d = Math.max(
            Math.abs(da[i]! - db[i]!),
            Math.abs(da[i + 1]! - db[i + 1]!),
            Math.abs(da[i + 2]! - db[i + 2]!),
          );
          if (d > maxDelta) maxDelta = d;
          if (d > 2) over2++;
        }
        return { maxDelta, pctOver2: (over2 / (n / 4)) * 100, note: "" };
      },
      [refB64, newB64] as const,
    );
    const verdict =
      diff.note === "size-mismatch"
        ? "SIZE-MISMATCH"
        : diff.maxDelta <= 8 && diff.pctOver2 < 0.5
          ? "IDENTICAL-CLASS"
          : diff.pctOver2 < 2
            ? "NEAR (check)"
            : "DIFFERS (inspect!)";
    results.push({ frame, maxDelta: diff.maxDelta, pctOver2: +diff.pctOver2.toFixed(3), verdict });
    log(`${frame.padEnd(22)} maxΔ=${String(diff.maxDelta).padStart(3)} pixels>2: ${diff.pctOver2.toFixed(3)}%  ${verdict}`);
  }
  await context.close();
} finally {
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
