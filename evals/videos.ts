/**
 * evals/videos.ts — scripted beauty-video capture (rubric §c video_pairs).
 *
 *   node evals/videos.ts [url]
 *
 * Closes the capture.ts "videos: TODO(P5)" gap with the SAME method the
 * frozen source kit used (reference/source/capture-scripts/videos.mjs +
 * interactions.mjs): playwright-core recordVideo contexts, real Chrome
 * channel, viewports from lib.ts. Four clips, matching the four frozen
 * source videos pairs.ts expects:
 *
 *   reference/ours/desktop/videos/scroll_60s.webm   ~60s ?autoscroll pass
 *   reference/ours/mobile/videos/scroll_60s.webm    ~60s ?autoscroll pass
 *   reference/ours/desktop/interactions/explode.webm        (~26s scripted)
 *   reference/ours/desktop/interactions/colorway_swap.webm  (~32s scripted)
 *
 * Pace parity: the site's own ?autoscroll default covers the full page in
 * ~60s (constants.AUTOSCROLL_DEFAULT_DURATION_S) — the same target the
 * source kit calibrated its autoscrollspeed for (its measured scroll phases:
 * desktop 64.1s, mobile 56.6s). No ?eval=1: the source videos show the live
 * site's real clock/liveness, so ours must too (like-for-like).
 *
 * Timeline bookkeeping for the motion strips: reference/ours/videos.json
 * records, per clip, the scroll-phase window in VIDEO time (recording
 * starts at page creation), so strip extraction can sample ours and source
 * at identical normalized timeline points.
 */

import fs from "node:fs";
import path from "node:path";
import type { Browser, BrowserContext, Page } from "playwright-core";
import { chromium } from "playwright-core";
import { ensureDir, getState, log, OURS_DIR, parseArgs, pick, targetUrl, VIEWPORTS, waitReady, writeJson } from "./lib.ts";

const TMP_VID = "/tmp/one-hertz-vidtmp";
const args = parseArgs();
const url = targetUrl(args);
/** --only scroll|interactions limits the run (re-capture without redoing all). */
const only = (args.flags["only"] as string | undefined) ?? "all";

interface ClipMeta {
  file: string;
  viewport: "desktop" | "mobile";
  kind: "scroll" | "interaction";
  /** Video-time (s) window of interest: scroll phase / interaction phase. */
  windowStartS: number;
  windowEndS: number;
  notes: string;
}
const clips: Record<string, ClipMeta> = {};

const browser: Browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--hide-crash-restore-bubble", "--disable-features=Translate"],
});

async function recorded(
  vp: keyof typeof VIEWPORTS,
  outFile: string,
  fn: (page: Page, t0: number) => Promise<{ windowStartS: number; windowEndS: number; notes: string }>,
  key: string,
  kind: ClipMeta["kind"],
): Promise<void> {
  ensureDir(TMP_VID);
  const ctx: BrowserContext = await browser.newContext({
    ...VIEWPORTS[vp],
    recordVideo: { dir: TMP_VID, size: VIEWPORTS[vp].viewport },
  });
  const page = await ctx.newPage();
  const t0 = Date.now(); // recording starts ~page creation
  let meta: { windowStartS: number; windowEndS: number; notes: string };
  try {
    meta = await fn(page, t0);
  } finally {
    const vid = page.video();
    await ctx.close();
    if (vid) {
      ensureDir(path.dirname(outFile));
      fs.renameSync(await vid.path(), outFile);
    }
  }
  clips[key] = {
    file: path.relative(path.dirname(OURS_DIR), outFile),
    viewport: vp,
    kind,
    windowStartS: round1(meta.windowStartS),
    windowEndS: round1(meta.windowEndS),
    notes: meta.notes,
  };
  log(`saved ${outFile}  window=[${clips[key]!.windowStartS}s, ${clips[key]!.windowEndS}s]`);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Source-kit arrival: hard window.scrollTo + Lenis-lerp settle (~2.6s) —
 * exactly what capture-scripts/lib.mjs scrollTo() did on the frozen site.
 */
async function jumpTo(page: Page, y: number, settleMs = 2600): Promise<void> {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(settleMs);
}

// ---------------------------------------------------------------------------
// (1)(2) ~60s autoscroll passes, both viewports
// ---------------------------------------------------------------------------
if (only === "all" || only === "scroll") for (const vp of ["desktop", "mobile"] as const) {
  const out = path.join(OURS_DIR, vp, "videos", "scroll_60s.webm");
  await recorded(
    vp,
    out,
    async (page, t0) => {
      await page.goto(`${url}/?autoscroll`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await waitReady(page); // loader gone == autoscroll begins (main.ts wiring)
      const scrollStart = (Date.now() - t0) / 1000;
      const limit = await page.evaluate(
        () => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - innerHeight,
      );
      try {
        await page.waitForFunction((b) => window.scrollY >= b, limit - 10, {
          timeout: 200_000,
          polling: 500,
        });
      } catch {
        log(`   !! ${vp}: bottom not reached; scrollY=${await page.evaluate(() => window.scrollY)}`);
      }
      const scrollEnd = (Date.now() - t0) / 1000;
      await page.waitForTimeout(2000); // tail, mirrors source kit
      return {
        windowStartS: scrollStart,
        windowEndS: scrollEnd,
        notes: `?autoscroll default (~60s full page, linear); loader head + 2s tail; limit=${limit}px`,
      };
    },
    `${vp}_scroll`,
    "scroll",
  );
}

// ---------------------------------------------------------------------------
// (3) explode interaction clip (desktop) — mirrors source interactions.mjs:
//     Disassembly mid → drag-rotate → click part → next part → close.
// ---------------------------------------------------------------------------
if (only === "all" || only === "interactions") {
  const out = path.join(OURS_DIR, "desktop", "interactions", "explode.webm");
  const CX = 800;
  const CY = 450;
  await recorded(
    "desktop",
    out,
    async (page, t0) => {
      await page.goto(`${url}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await waitReady(page);
      // hard jump to Disassembly mid + Lenis settle (source-kit arrival)
      const target = await page.evaluate(() => {
        const el = document.querySelector('[data-section="Disassembly"]');
        if (!el) return 0;
        const r = el.getBoundingClientRect();
        return Math.round(r.top + window.scrollY + 0.5 * (r.height - innerHeight));
      });
      await jumpTo(page, target);
      const start = (Date.now() - t0) / 1000;
      // drag-rotate the cluster (fast — never arms longpress)
      await page.mouse.move(CX, CY);
      await page.mouse.down();
      for (let i = 1; i <= 8; i++) {
        await page.mouse.move(CX + i * 45, CY - i * 6);
        await page.waitForTimeout(25);
      }
      await page.mouse.up();
      await page.waitForTimeout(1200);
      // click a part via the debug API's live projection (reliable hit)
      const st = await getState(page);
      const parts = pick(st, "explode.parts") as { screenPos?: { x: number; y: number } }[] | undefined;
      const pos = parts?.[0]?.screenPos ?? { x: CX, y: CY };
      await page.mouse.click(pos.x, pos.y, { delay: 60 });
      await page.waitForTimeout(3000); // lookAt lerp + overlay
      // next part via the overlay arrow
      await page.click("[data-explode-next]", { delay: 60 }).catch(() => {});
      await page.waitForTimeout(3000);
      // close
      await page.click("[data-explode-close]", { delay: 60 }).catch(() => {});
      await page.waitForTimeout(1500);
      return {
        windowStartS: start,
        windowEndS: (Date.now() - t0) / 1000,
        notes: "Disassembly mid: drag-rotate, select part, next part, close (mirrors source clip beats)",
      };
    },
    "explode",
    "interaction",
  );
}

// ---------------------------------------------------------------------------
// (4) colorway_swap interaction clip (desktop) — mirrors source:
//     outro → hover model #3 (SWAP cursor vocabulary) → select → SWAP →
//     hard restart at top in the chosen finish.
// ---------------------------------------------------------------------------
if (only === "all" || only === "interactions") {
  const out = path.join(OURS_DIR, "desktop", "interactions", "colorway_swap.webm");
  await recorded(
    "desktop",
    out,
    async (page, t0) => {
      await page.goto(`${url}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await waitReady(page);
      const bottom = await page.evaluate(
        () => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - innerHeight,
      );
      await jumpTo(page, bottom, 4000); // outro raise + lineup stagger
      const start = (Date.now() - t0) / 1000;
      // hover the 3rd model label, then select it (canonical preview grade)
      const btn = page.locator("[data-outro-model]").nth(2);
      await btn.hover();
      await page.waitForTimeout(1200);
      await btn.click({ delay: 60 });
      await page.waitForTimeout(3000); // 1s material grade + hold
      // SWAP → duration-0 apply + hard restart from the top
      await page.click("[data-outro-swap]", { delay: 60 }).catch(() => {});
      await page.waitForTimeout(2500);
      await page.waitForTimeout(3000); // restarted top, chosen finish
      return {
        windowStartS: start,
        windowEndS: (Date.now() - t0) / 1000,
        notes: "outro: hover model #3, select (preview grade), SWAP, hard restart at top",
      };
    },
    "colorway_swap",
    "interaction",
  );
}

await browser.close();

// merge with a prior run so --only reruns never drop the other clips' windows
const videosJsonPath = path.join(OURS_DIR, "videos.json");
const prior = fs.existsSync(videosJsonPath)
  ? (JSON.parse(fs.readFileSync(videosJsonPath, "utf8")) as { clips?: Record<string, ClipMeta> })
  : {};
Object.assign(clips, { ...prior.clips, ...clips });
log(`\nwriting ${videosJsonPath}`);
writeJson(videosJsonPath, {
  capturedAt: new Date().toISOString(),
  url,
  method:
    "playwright-core recordVideo (real Chrome channel), same as the frozen source kit " +
    "(reference/source/capture-scripts/videos.mjs + interactions.mjs); no ?eval — " +
    "live clock/liveness, like the source clips. windowStart/EndS = scroll/interaction " +
    "phase in video time (recording starts at page creation).",
  clips,
});
log(`\nvideos done → ${path.join(OURS_DIR, "videos.json")}`);
