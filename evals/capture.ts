/**
 * evals/capture.ts — deterministic frame capture (rubric §e).
 *
 *   node evals/capture.ts [url] [--viewport desktop|mobile|both] [--round r1]
 *
 * For each section in __ONE_HERTZ__.sections × localProgress {0,.25,.5,.75,1}
 * (steps from rubric.yaml determinism.addressing), navigates with ?eval=1,
 * addresses frames via gotoSection, and captures viewport PNGs to
 * evals/reference/ours/<viewport>/<SectionId>_<p>.png — the same naming the
 * frozen source kit uses, so judge pairing is a filename join.
 *
 * Interaction-state frames (rubric determinism.interaction_frames) are
 * attempted behind capability probes of the debug-API contract; anything the
 * current build does not expose yet is SKIPPED gracefully and listed.
 *
 * Scripted scroll VIDEOS (beauty video pairs) are TODO(P5): playwright-core
 * recordVideo needs playwright's ffmpeg sidecar; the frozen source kit's
 * approach lives in evals/reference/source/capture-scripts/videos.mjs.
 */

import path from "node:path";
import type { Page } from "playwright-core";
import {
  ensureDir,
  frameFile,
  getSections,
  getState,
  gotoSection,
  hasDebugApi,
  launch,
  loadRubric,
  log,
  newContext,
  openTarget,
  OURS_DIR,
  parseArgs,
  pick,
  settleScroll,
  targetUrl,
  type ViewportName,
  writeJson,
} from "./lib.ts";

interface CapturedFrame {
  viewport: ViewportName;
  sectionId: string;
  progress: number;
  file: string;
}

interface InteractionResult {
  id: string;
  viewport: ViewportName;
  status: "captured" | "skipped";
  file?: string;
  reason?: string;
}

const args = parseArgs();
const url = targetUrl(args);
const rubric = loadRubric();
const steps = rubric.determinism.addressing.local_progress_steps;
const vpArg = (args.flags["viewport"] as string | undefined) ?? "both";
const viewports: ViewportName[] =
  vpArg === "both" ? ["desktop", "mobile"] : ([vpArg] as ViewportName[]);

const frames: CapturedFrame[] = [];
const interactions: InteractionResult[] = [];

const browser = await launch();
try {
  for (const vp of viewports) {
    const context = await newContext(browser, vp);
    const page = await context.newPage();
    log(`\n== capture · ${vp} · ${url}`);
    await openTarget(page, url);

    if (!(await hasDebugApi(page))) {
      log(`   !! window.__ONE_HERTZ__ missing — cannot address frames; aborting ${vp}`);
      await context.close();
      continue;
    }

    const sections = await getSections(page);
    if (!sections || sections.length === 0) {
      log(`   !! sections manifest empty — nothing to capture`);
      await context.close();
      continue;
    }

    const outDir = ensureDir(path.join(OURS_DIR, vp));

    // -- canonical frames: sections × progress steps ------------------------
    for (const section of sections) {
      for (const p of steps) {
        const ok = await gotoSection(page, section.id, p);
        if (!ok) {
          log(`   !! gotoSection(${section.id}, ${p}) failed — skipping`);
          continue;
        }
        const file = frameFile(section.id, p);
        await page.screenshot({ path: path.join(outDir, file) });
        frames.push({ viewport: vp, sectionId: section.id, progress: p, file });
        log(`   ok ${vp}/${file}`);
      }
    }

    // -- interaction-state frames (capability-probed, skip-graceful) --------
    const interDir = ensureDir(path.join(outDir, "interactions"));
    await captureInteractions(page, vp, interDir, sections.map((s) => s.id));

    await context.close();
  }
} finally {
  await browser.close();
}

// -- manifest + SKIP list -----------------------------------------------------
writeJson(path.join(OURS_DIR, "manifest.json"), {
  capturedAt: new Date().toISOString(),
  url,
  rubricVersion: rubric.meta.version,
  progressSteps: steps,
  frames,
  interactions,
  videos: "TODO(P5) — scripted 60s scroll videos (see source capture-scripts/videos.mjs)",
});

const skips = interactions.filter((i) => i.status === "skipped");
log(`\ncapture done: ${frames.length} canonical frames, ${interactions.length - skips.length} interaction frames`);
if (skips.length > 0) {
  log(`SKIPPED interaction frames (${skips.length}):`);
  for (const s of skips) log(`  - [${s.viewport}] ${s.id}: ${s.reason}`);
}
log(`manifest: evals/reference/ours/manifest.json`);

// ---------------------------------------------------------------------------

async function captureInteractions(
  page: Page,
  vp: ViewportName,
  outDir: string,
  sectionIds: string[],
): Promise<void> {
  const shoot = async (name: string): Promise<string> => {
    const file = `${name}.png`;
    await page.screenshot({ path: path.join(outDir, file) });
    return path.join("interactions", file);
  };
  const skip = (id: string, reason: string) => {
    interactions.push({ id, viewport: vp, status: "skipped", reason });
    log(`   SKIP ${id}: ${reason}`);
  };
  const captured = (id: string, file: string) => {
    interactions.push({ id, viewport: vp, status: "captured", file });
    log(`   ok ${vp}/interactions ${id}`);
  };
  const findSection = (...needles: string[]): string | undefined =>
    sectionIds.find((id) => needles.some((n) => id.toLowerCase().includes(n)));

  // 1) exploded view open (part selected, overlay visible)
  {
    const st = await getState(page);
    const parts = pick(st, "explode.parts");
    const dis = findSection("disassembly", "explode");
    if (!Array.isArray(parts) || parts.length === 0) {
      skip("explode-open", "state().explode.parts not exposed");
    } else if (!dis) {
      skip("explode-open", "no disassembly/explode section in manifest");
    } else {
      await gotoSection(page, dis, 0.5);
      // screenPos is a live projection — re-read after the goto settles.
      const liveParts = pick(await getState(page), "explode.parts") as unknown[] | undefined;
      const pos = pick((liveParts ?? (parts as unknown[]))[0], "screenPos") as
        | { x: number; y: number }
        | undefined;
      if (!pos) {
        skip("explode-open", "parts[].screenPos not exposed — cannot click a part");
      } else {
        await page.mouse.click(pos.x, pos.y);
        await page.waitForTimeout(1200); // lookAt lerp settle
        const st2 = await getState(page);
        if (pick(st2, "explode.selected") == null) {
          skip("explode-open", "click did not select a part (explode.selected null)");
        } else {
          captured("explode-open", await shoot("explode_open"));
        }
      }
    }
  }

  // 2) each colorway applied (>=4 frames)
  {
    const st = await getState(page);
    const finishes = pick(st, "config.finishes");
    if (!Array.isArray(finishes) || finishes.length === 0) {
      skip("colorway-frames", "state().config.finishes not exposed");
    } else {
      const hero = findSection("intro", "hero") ?? sectionIds[0]!;
      for (const f of finishes as unknown[]) {
        const finishId = typeof f === "string" ? f : String(pick(f, "id") ?? "");
        const applied = await applyFinish(page, finishId);
        if (!applied) {
          skip(`colorway-${finishId}`, "no setConfig/emit(CONFIG_CHANGE) path exposed");
          continue;
        }
        await gotoSection(page, hero, 0.5);
        await page.waitForTimeout(1200); // 1s material tween
        captured(`colorway-${finishId}`, await shoot(`colorway_${finishId}`));
      }
    }
  }

  // 3) Nocturne mid-transition
  {
    const noct = findSection("nocturne");
    if (!noct) skip("nocturne-mid", "no nocturne section in manifest");
    else {
      await gotoSection(page, noct, 0.5);
      captured("nocturne-mid", await shoot("nocturne_mid"));
    }
  }

  // 4) BPM high (fast scroll) and BPM low (rest)
  {
    const st = await getState(page);
    if (pick(st, "bpm") === undefined && pick(st, "dial.bpm") === undefined) {
      skip("bpm-hi-lo", "state().bpm / state().dial.bpm not exposed");
    } else {
      // low: at rest
      await settleScroll(page);
      await page.waitForTimeout(1500);
      captured("bpm-lo", await shoot("bpm_lo"));
      // high: burst of wheel input, shoot immediately
      for (let i = 0; i < 30; i++) {
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(16);
      }
      captured("bpm-hi", await shoot("bpm_hi"));
      await settleScroll(page);
    }
  }
}

/** Apply a finish through any contract path available; false when none is. */
async function applyFinish(page: Page, finishId: string): Promise<boolean> {
  return page.evaluate((fid) => {
    const api = (window as unknown as Record<string, unknown>).__ONE_HERTZ__ as
      | {
          setConfig?: (id: string) => void;
          emit?: (event: string, payload: unknown) => void;
          bus?: { emit?: (event: string, payload: unknown) => void };
        }
      | undefined;
    if (!api) return false;
    try {
      if (typeof api.setConfig === "function") {
        api.setConfig(fid);
        return true;
      }
      if (typeof api.emit === "function") {
        api.emit("CONFIG_CHANGE", { config: fid });
        return true;
      }
      if (api.bus && typeof api.bus.emit === "function") {
        api.bus.emit("CONFIG_CHANGE", { config: fid });
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }, finishId);
}
