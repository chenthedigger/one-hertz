// Probe: headless WebGL viability + section enumeration + deep-link check.
import { launch, gotoSite, scrollTo, enumerateSections, isBlackOrBlank, pngStats, VIEWPORTS, SITE } from './lib.mjs';

const headless = process.argv[2] !== 'headed';
const browser = await launch(headless);
const ctx = await browser.newContext(VIEWPORTS.desktop);
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));

console.log('mode:', headless ? 'headless' : 'headed');
await gotoSite(page);
const sections = await enumerateSections(page);
console.log(JSON.stringify(sections, null, 1));

const shot = '/tmp/pwcap/probe_hero.png';
await page.screenshot({ path: shot });
console.log('hero stats', pngStats(shot), 'blackOrBlank:', isBlackOrBlank(shot));

// mid-page probe (WebGL content past hero)
const y = Math.round(sections.scrollHeight * 0.35);
const got = await scrollTo(page, y);
await page.screenshot({ path: '/tmp/pwcap/probe_mid.png' });
console.log('scroll asked', y, 'got', got, 'mid stats', pngStats('/tmp/pwcap/probe_mid.png'), 'blackOrBlank:', isBlackOrBlank('/tmp/pwcap/probe_mid.png'));

// deep-link check
await page.goto(SITE + '/?scroll=Disassembly', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => {
  const l = document.querySelector('#loader');
  if (!l) return true;
  const s = getComputedStyle(l);
  return s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0;
}, { timeout: 180000 });
await page.waitForTimeout(4000);
const dl = await page.evaluate(() => ({
  scrollY: Math.round(window.scrollY),
  disTop: Math.round(document.querySelector('[data-webgl="Disassembly"]')?.getBoundingClientRect().top ?? 9e9),
}));
console.log('deeplink ?scroll=Disassembly:', dl);

await browser.close();
