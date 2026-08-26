import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE = 'https://thewatch.60fps.fr';
// evals/reference/source — derived from this file's location so the capture
// scripts run from any clone path.
export const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const VIEWPORTS = {
  desktop: { viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  },
};

export async function launch(headless) {
  return chromium.launch({
    channel: 'chrome',
    headless,
    args: ['--hide-crash-restore-bubble', '--disable-features=Translate'],
  });
}

// Wait for loader to finish + assets settled.
export async function waitReady(page) {
  await page.waitForFunction(
    () => {
      const l = document.querySelector('#loader');
      if (!l) return true;
      const s = getComputedStyle(l);
      return s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0;
    },
    { timeout: 180000 },
  );
  await page.waitForTimeout(4000); // intro settle + first WebGL frames
}

export async function gotoSite(page, params = '') {
  await page.goto(SITE + params, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await waitReady(page);
}

// Set absolute scroll and wait for Lenis lerp to settle (~2.5s per house note).
export async function scrollTo(page, y, settleMs = 2600) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(settleMs);
  return page.evaluate(() => Math.round(window.scrollY));
}

export function pngStats(file) {
  const png = PNG.sync.read(fs.readFileSync(file));
  const { data, width, height } = png;
  let sum = 0,
    n = width * height;
  // sample every 4th pixel for speed
  let min = 255,
    max = 0;
  for (let i = 0; i < data.length; i += 16) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += lum * 4;
    if (lum < min) min = lum;
    if (lum > max) max = lum;
  }
  return { mean: sum / n, min, max, width, height };
}

export function isBlackOrBlank(file) {
  const s = pngStats(file);
  return s.mean < 4 || s.max - s.min < 3; // near-black or uniform
}

export async function enumerateSections(page) {
  return page.evaluate(() => {
    const grab = (sel, attr) =>
      Array.from(document.querySelectorAll(`[${sel}]`)).map((el) => {
        const r = el.getBoundingClientRect();
        return {
          name: el.getAttribute(sel),
          offsetTop: Math.round(r.top + window.scrollY),
          height: Math.round(r.height),
        };
      });
    return {
      viewport: { width: innerWidth, height: innerHeight },
      scrollHeight: Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      ),
      dataSection: grab('data-section'),
      dataWebgl: grab('data-webgl'),
    };
  });
}
