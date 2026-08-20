// Phase 4: interaction captures (desktop): longpress, exploded view, colorway swap.
// Each on its own recorded page -> clip + frame burst.
import fs from 'node:fs';
import { launch, gotoSite, scrollTo, VIEWPORTS, OUT } from './lib.mjs';

const sections = JSON.parse(fs.readFileSync(`${OUT}/sections.json`, 'utf8'));
const webgl = Object.fromEntries(sections.dataWebgl.map((s) => [s.name, s]));
const VH = 900;
const CX = 800, CY = 450;
const IDIR = `${OUT}/interactions`;
const browser = await launch(true);

async function recordedPage(name, fn) {
  const ctx = await browser.newContext({
    ...VIEWPORTS.desktop,
    recordVideo: { dir: '/tmp/pwcap/vidtmp', size: VIEWPORTS.desktop.viewport },
  });
  const page = await ctx.newPage();
  try {
    await fn(page);
  } finally {
    const vid = page.video();
    await ctx.close();
    fs.renameSync(await vid.path(), `${IDIR}/${name}.webm`);
    console.log(`saved interactions/${name}.webm`);
  }
}

// (a) longpress hold-zoom, mid-Presentation
await recordedPage('longpress', async (page) => {
  await gotoSite(page);
  const s = webgl.Presentation;
  await scrollTo(page, Math.round(s.offsetTop + 0.5 * (s.height - VH)), 3000);
  await page.mouse.move(CX, CY);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${IDIR}/longpress_00_before.png` });
  await page.mouse.down();
  for (const t of [500, 1000, 1500, 2000, 2500, 3000]) {
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${IDIR}/longpress_hold_${t}ms.png` });
  }
  await page.mouse.up();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${IDIR}/longpress_release_600ms.png` });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${IDIR}/longpress_release_2000ms.png` });
});

// (b) exploded view: Disassembly — drag to rotate, then click a part
await recordedPage('explode', async (page) => {
  await gotoSite(page);
  const s = webgl.Disassembly;
  await scrollTo(page, Math.round(s.offsetTop + 0.5 * (s.height - VH)), 3000);
  await page.screenshot({ path: `${IDIR}/explode_00_initial.png` });
  // quick drag (fast enough to not trigger longpress)
  await page.mouse.move(CX, CY);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(CX + i * 45, CY - i * 6);
    await page.waitForTimeout(25);
  }
  await page.mouse.up();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${IDIR}/explode_01_after_drag.png` });
  // click a part (watch parts are spread along center axis)
  await page.mouse.move(CX, CY);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${IDIR}/explode_02_hover_center.png` });
  await page.mouse.click(CX, CY, { delay: 60 });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${IDIR}/explode_03_part_clicked.png` });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${IDIR}/explode_04_part_settled.png` });
  // click again elsewhere / release
  await page.mouse.click(CX + 250, CY, { delay: 60 });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${IDIR}/explode_05_next_part.png` });
});

// (c) colorway swap at outro: hover a watch instance (cursor -> SWAP), click it
await recordedPage('colorway_swap', async (page) => {
  await gotoSite(page);
  const bottom = sections.viewports.desktop.scrollHeight - VH;
  await scrollTo(page, bottom, 4000);
  await page.screenshot({ path: `${IDIR}/colorway_00_outro.png` });
  // 4 instances across viewport; hover 3rd (gold-ish) then click
  const targets = [
    [200, 480],
    [600, 480],
    [1000, 480],
    [1400, 480],
  ];
  await page.mouse.move(...targets[2]);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${IDIR}/colorway_01_hover.png` });
  await page.mouse.click(...targets[2], { delay: 60 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${IDIR}/colorway_02_after_click.png` });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${IDIR}/colorway_03_restart.png` });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${IDIR}/colorway_04_restarted_top.png` });
  console.log('post-swap scrollY:', await page.evaluate(() => window.scrollY));
});

await browser.close();
