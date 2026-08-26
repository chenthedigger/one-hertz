/**
 * evals/p4-gate-probe.ts — one-shot live-judgment probe for the P4 gate
 * (integrate lane, 2026-08-26). Captures the frames the gate verdict judges
 * plus two full live-page console walks (desktop + mobile). Not part of CI.
 *
 *   node evals/p4-gate-probe.ts http://localhost:4660
 */
import path from "node:path";
import fs from "node:fs";
import type { Page } from "playwright-core";
import { getSections, gotoSection, launch, newContext, openTarget, parseArgs, targetUrl } from "./lib.ts";

const OUT = path.resolve(import.meta.dirname, "..", "docs", "p4", "gate-probe");
fs.mkdirSync(OUT, { recursive: true });

const args = parseArgs();
const url = targetUrl(args);

const DESKTOP_FRAMES: Array<[string, number]> = [
  ["Intro", 0.5],
  ["Movement", 0.7],
  ["Hands", 0.75],
  ["Nocturne", 0.5],
  ["Straps", 0.25],
  ["Straps", 0.5],
  ["Images", 0.5],
  ["Colors", 0.06],
  ["Colors", 0.85],
  ["Parts", 0.5],
  ["Footer", 0.9],
  ["Footer", 1],
];
const MOBILE_FRAMES: Array<[string, number]> = [
  ["Images", 0.5],
  ["Straps", 0.5],
  ["Footer", 0.9],
  ["Footer", 1],
];

async function resolveId(page: Page, needle: string): Promise<string | null> {
  const sections = (await getSections(page)) ?? [];
  const hit = sections.find((s) => s.id.toLowerCase().includes(needle.toLowerCase()));
  return hit?.id ?? null;
}

async function captureSet(vp: "desktop" | "mobile", frames: Array<[string, number]>) {
  const browser = await launch();
  const ctx = await newContext(browser, vp);
  const page = await ctx.newPage();
  await openTarget(page, url, "eval=1");
  for (const [needle, p] of frames) {
    const id = await resolveId(page, needle);
    if (!id) {
      console.log(`SKIP ${vp} ${needle} — no section`);
      continue;
    }
    const ok = await gotoSection(page, id, p);
    if (!ok) {
      console.log(`SKIP ${vp} ${needle}@${p} — goto failed`);
      continue;
    }
    await page.waitForTimeout(700);
    const file = path.join(OUT, `${vp[0]}-${needle}-${String(p).replace("0.", "")}.png`);
    await page.screenshot({ path: file });
    console.log(`CAP  ${file}`);
  }
  await browser.close();
}

async function liveWalk(vp: "desktop" | "mobile"): Promise<number> {
  const browser = await launch();
  const ctx = await newContext(browser, vp);
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await openTarget(page, url, ""); // LIVE page, no eval
  const total = await page.evaluate(() => document.body.scrollHeight - innerHeight);
  const steps = 41;
  for (let i = 0; i <= steps; i++) {
    await page.evaluate((y) => scrollTo(0, y), (total * i) / steps);
    await page.waitForTimeout(160);
  }
  await page.waitForTimeout(1200);
  console.log(`WALK ${vp}: ${errors.length} console errors${errors.length ? "\n  " + errors.join("\n  ") : ""}`);
  await browser.close();
  return errors.length;
}

const desktopErr = await liveWalk("desktop");
const mobileErr = await liveWalk("mobile");
await captureSet("desktop", DESKTOP_FRAMES);
await captureSet("mobile", MOBILE_FRAMES);
console.log(`DONE — desktopErrors=${desktopErr} mobileErrors=${mobileErr}`);
