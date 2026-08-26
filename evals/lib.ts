/**
 * evals/lib.ts — shared harness infrastructure.
 *
 * Built against the DEBUG-API CONTRACT in rubric.yaml `debug_api`, NOT the
 * current src state. Every accessor degrades gracefully: a missing member is
 * a SKIP (reported), never a crash. Runs under Node >=23.6 native type
 * stripping (erasable TS syntax only — no enums/namespaces).
 *
 * Conventions inherited from the frozen source capture kit
 * (evals/reference/source/capture-scripts/lib.mjs): real Chrome channel via
 * playwright-core, viewports 1600x900@DPR2 / 390x844@DPR3, frame naming
 * `<Section>_<progress>.png`.
 */

import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export const EVALS_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_DIR = path.dirname(EVALS_DIR);
export const RUBRIC_PATH = path.join(EVALS_DIR, "rubric.yaml");
export const OURS_DIR = path.join(EVALS_DIR, "reference", "ours");
export const SOURCE_DIR = path.join(EVALS_DIR, "reference", "source");
export const RESULTS_DIR = path.join(EVALS_DIR, "results");

export const DEFAULT_TARGET = "http://localhost:4173"; // vite preview

// ---------------------------------------------------------------------------
// Rubric
// ---------------------------------------------------------------------------

export interface RubricItem {
  id: string;
  area: string;
  description: string;
  assertion: string;
  severity_if_fail: "CRITICAL" | "HIGH" | "MEDIUM";
}

export interface Rubric {
  meta: { project: string; version: string; frozen: string };
  structural_checklist: {
    gate: { critical_count: number; pass_rate_min: number };
    items: RubricItem[];
  };
  beauty: Record<string, unknown> & {
    judges: { count: number };
    materials: { still_pairs: number; video_pairs: number };
    axes: { stills: string[]; video: string[] };
  };
  perf: {
    gates: {
      desktop: {
        median_fps_min: number;
        p95_frame_ms_max: number;
        frames_over_50ms_max_per_60s: number;
      };
      mobile_flagship: { median_fps_min: number };
      mobile_midtier: { median_fps_min: number };
    };
  };
  determinism: {
    eval_param: string;
    addressing: { local_progress_steps: number[] };
  };
}

export function loadRubric(): Rubric {
  return YAML.parse(fs.readFileSync(RUBRIC_PATH, "utf8")) as Rubric;
}

// ---------------------------------------------------------------------------
// CLI args — tiny flag parser: --key value | --key | positionals
// ---------------------------------------------------------------------------

export interface Args {
  positionals: string[];
  flags: Record<string, string | boolean>;
}

export function parseArgs(argv: string[] = process.argv.slice(2)): Args {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positionals.push(a);
    }
  }
  return { positionals, flags };
}

export function targetUrl(args: Args): string {
  const url = args.positionals[0] ?? (args.flags["url"] as string | undefined) ?? DEFAULT_TARGET;
  return url.replace(/\/$/, "");
}

export function roundName(args: Args): string {
  return (args.flags["round"] as string | undefined) ?? "r0";
}

export function roundDir(round: string): string {
  const dir = path.join(RESULTS_DIR, round);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// FS helpers
// ---------------------------------------------------------------------------

export function ensureDir(dir: string): string {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeJson(file: string, data: unknown): void {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

export function readJsonIfExists<T>(file: string): T | null {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

// ---------------------------------------------------------------------------
// Deterministic RNG (mulberry32) — judge L/R randomization, pair sampling
// ---------------------------------------------------------------------------

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Browser — real Chrome channel (Playwright MCP unusable per house notes;
// npx WASM tools banned elsewhere; this is plain playwright-core + Chrome).
// ---------------------------------------------------------------------------

export const VIEWPORTS = {
  desktop: {
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 2,
  },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  },
} as const;

export type ViewportName = keyof typeof VIEWPORTS;

export async function launch(headless = true): Promise<Browser> {
  return chromium.launch({
    channel: "chrome",
    headless,
    args: ["--hide-crash-restore-bubble", "--disable-features=Translate"],
  });
}

export async function newContext(browser: Browser, vp: ViewportName): Promise<BrowserContext> {
  return browser.newContext({ ...VIEWPORTS[vp] });
}

// ---------------------------------------------------------------------------
// Debug-API access (rubric debug_api contract) — all graceful
// ---------------------------------------------------------------------------

/** Full state() snapshot, or null when the API/member is missing. */
export async function getState(page: Page): Promise<Record<string, unknown> | null> {
  return page.evaluate(() => {
    const api = (window as unknown as { __ONE_HERTZ__?: { state?: () => unknown } }).__ONE_HERTZ__;
    if (!api || typeof api.state !== "function") return null;
    try {
      return JSON.parse(JSON.stringify(api.state())) as Record<string, unknown>;
    } catch {
      return null;
    }
  });
}

/** Dotted-path lookup into a snapshot; undefined = not exposed yet. */
export function pick(obj: unknown, dotted: string): unknown {
  let cur: unknown = obj;
  for (const key of dotted.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

export interface SectionEntry {
  id: string;
  sourceRole: string | null;
  raw: Record<string, unknown>;
}

/**
 * Sections manifest normalized to the rubric contract shape
 * ({id, sourceRole, ...}); tolerates the Spike-B shape ({name, ...}).
 */
export async function getSections(page: Page): Promise<SectionEntry[] | null> {
  const raw = await page.evaluate(() => {
    const api = (window as unknown as { __ONE_HERTZ__?: { sections?: unknown } }).__ONE_HERTZ__;
    if (!api || !Array.isArray(api.sections)) return null;
    return JSON.parse(JSON.stringify(api.sections)) as Record<string, unknown>[];
  });
  if (!raw) return null;
  return raw.map((s) => ({
    id: String(s["id"] ?? s["name"] ?? "unknown"),
    sourceRole: typeof s["sourceRole"] === "string" ? s["sourceRole"] : null,
    raw: s,
  }));
}

/** True when window.__ONE_HERTZ__ exists at all. */
export async function hasDebugApi(page: Page): Promise<boolean> {
  return page.evaluate(() => Boolean((window as unknown as Record<string, unknown>).__ONE_HERTZ__));
}

// ---------------------------------------------------------------------------
// Ready condition (rubric determinism): fonts.ready AND assets resident AND
// 3 consecutive settled rAF frames. Loader-gone check inherited from the
// source capture kit. Asset-residency reads state().flags when exposed.
// ---------------------------------------------------------------------------

export async function waitReady(page: Page, timeoutMs = 60_000): Promise<void> {
  // 1) loader gone (or never present)
  await page.waitForFunction(
    () => {
      const l = document.querySelector("#loader");
      if (!l) return true;
      const s = getComputedStyle(l);
      return s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0;
    },
    undefined,
    { timeout: timeoutMs },
  );
  // 2) fonts
  await page.evaluate(() => document.fonts.ready.then(() => true));
  // 3) asset residency — best-effort via state().flags (contract member;
  //    absent in Spike B → treated as ready, noted by callers via hasDebugApi)
  await page
    .waitForFunction(
      () => {
        const api = (window as unknown as { __ONE_HERTZ__?: { state?: () => unknown } })
          .__ONE_HERTZ__;
        if (!api || typeof api.state !== "function") return true;
        const st = api.state() as { flags?: Record<string, unknown> };
        const f = st?.flags;
        if (!f) return true;
        for (const key of ["assetsReady", "glbLoaded", "ready"]) {
          if (typeof f[key] === "boolean") return f[key] === true;
        }
        return true;
      },
      undefined,
      { timeout: timeoutMs },
    )
    .catch(() => {});
  // 4) 3 consecutive settled rAF frames (delta < 34ms each); soft timeout
  await page
    .evaluate(
      () =>
        new Promise<void>((resolve) => {
          let last = performance.now();
          let settled = 0;
          const deadline = last + 5000;
          const step = (now: number) => {
            settled = now - last < 34 ? settled + 1 : 0;
            last = now;
            if (settled >= 3 || now > deadline) resolve();
            else requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }),
    )
    .catch(() => {});
}

/** Navigate to the target with ?eval=1 (+extra params) and wait ready. */
export async function openTarget(page: Page, base: string, extraParams = ""): Promise<void> {
  const sep = base.includes("?") ? "&" : "?";
  const url = `${base}${sep}eval=1${extraParams ? "&" + extraParams : ""}`;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  } catch (error: unknown) {
    // A stranger's first run dies here when nothing is serving the target —
    // that deserves one actionable line, not a playwright stack trace.
    if (String(error).includes("ERR_CONNECTION_REFUSED")) {
      log(`\nERROR: nothing is serving ${base}`);
      log("start the preview server: npm run preview   (then re-run this command)");
      log("or point at a live target:  node evals/<script>.ts https://<url>\n");
      process.exit(1);
    }
    throw error;
  }
  await waitReady(page);
}

// ---------------------------------------------------------------------------
// Deterministic addressing: gotoSection + scroll settle
// ---------------------------------------------------------------------------

export async function gotoSection(page: Page, id: string, localProgress: number): Promise<boolean> {
  const ok = await page.evaluate(
    ([sid, p]) => {
      const api = (
        window as unknown as {
          __ONE_HERTZ__?: { gotoSection?: (id: string, p: number) => void };
        }
      ).__ONE_HERTZ__;
      if (!api || typeof api.gotoSection !== "function") return false;
      try {
        api.gotoSection(sid as string, p as number);
        return true;
      } catch {
        return false;
      }
    },
    [id, localProgress] as [string, number],
  );
  if (!ok) return false;
  await settleScroll(page);
  return true;
}

/** Wait until window scroll is stable for ~4 frames (immediate jumps settle fast). */
export async function settleScroll(page: Page, timeoutMs = 6000): Promise<void> {
  await page
    .evaluate(
      (limit) =>
        new Promise<void>((resolve) => {
          let last = window.scrollY;
          let stable = 0;
          const deadline = performance.now() + limit;
          const step = () => {
            const y = window.scrollY;
            stable = Math.abs(y - last) < 0.5 ? stable + 1 : 0;
            last = y;
            if (stable >= 4 || performance.now() > deadline) resolve();
            else requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }),
      timeoutMs,
    )
    .catch(() => {});
  // grace: let the WebGL lerped channel catch up (1-exp(-dt*8) → ~0.5s to 99%)
  await page.waitForTimeout(600);
}

// ---------------------------------------------------------------------------
// Frame-time math (perf + report share these)
// ---------------------------------------------------------------------------

export interface FrameStats {
  frames: number;
  medianFps: number;
  medianFrameMs: number;
  p95FrameMs: number;
  framesOver50ms: number;
  durationSec: number;
}

export function frameStats(deltasMs: number[]): FrameStats {
  const sorted = [...deltasMs].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
  const median = q(0.5);
  return {
    frames: deltasMs.length,
    medianFrameMs: round2(median),
    medianFps: round2(median > 0 ? 1000 / median : 0),
    p95FrameMs: round2(q(0.95)),
    framesOver50ms: deltasMs.filter((d) => d > 50).length,
    durationSec: round2(deltasMs.reduce((a, b) => a + b, 0) / 1000),
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Frame filename shared by capture + judge pairs: `Intro_0.25.png`. */
export function frameFile(sectionId: string, progress: number): string {
  return `${sectionId}_${progress}.png`;
}

export function log(msg: string): void {
  process.stdout.write(msg + "\n");
}
