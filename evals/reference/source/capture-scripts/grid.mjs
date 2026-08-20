// Phase 1+2: sections.json + frame grid for both viewports.
import fs from 'node:fs';
import { launch, gotoSite, scrollTo, enumerateSections, VIEWPORTS, OUT } from './lib.mjs';

const PROGRESS = [0, 0.25, 0.5, 0.75, 1];
const browser = await launch(true);
const result = {};

for (const [vpName, vpOpts] of Object.entries(VIEWPORTS)) {
  console.log(`--- viewport ${vpName} ---`);
  const ctx = await browser.newContext(vpOpts);
  const page = await ctx.newPage();
  await gotoSite(page);
  const info = await enumerateSections(page);
  result[vpName] = info;
  console.log(vpName, 'scrollHeight', info.scrollHeight, 'sections', info.dataSection.length, 'webgl', info.dataWebgl.length);

  const vh = vpOpts.viewport.height;
  const seen = {};
  for (const s of info.dataSection) {
    let name = s.name.replace(/[^\w-]/g, '');
    if (seen[name] !== undefined) name = `${name}${++seen[name]}`;
    else seen[name] = 0;
    for (const p of PROGRESS) {
      const y = Math.round(s.offsetTop + p * Math.max(0, s.height - vh));
      const got = await scrollTo(page, y, 3000);
      const file = `${OUT}/${vpName}/${name}_${p}.png`;
      await page.screenshot({ path: file });
      console.log(`${vpName}/${name}_${p}.png y=${y} got=${got}`);
    }
  }
  await ctx.close();
}

fs.writeFileSync(
  `${OUT}/sections.json`,
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      url: 'https://thewatch.60fps.fr',
      note: 'offsetTop/height in CSS px at each viewport; scrollHeight = document total. Desktop is the canonical enumeration.',
      scrollHeight: result.desktop.scrollHeight,
      dataSection: result.desktop.dataSection,
      dataWebgl: result.desktop.dataWebgl,
      viewports: result,
    },
    null,
    2,
  ),
);
console.log('sections.json written');
await browser.close();
