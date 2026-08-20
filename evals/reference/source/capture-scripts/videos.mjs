// Phase 3 (v2): ~60s constant-rate scroll videos. Headless rAF is unthrottled,
// so measure real rAF rate first and derive autoscrollspeed from it; verify and retry.
import fs from 'node:fs';
import { launch, waitReady, VIEWPORTS, OUT, SITE } from './lib.mjs';

const sections = JSON.parse(fs.readFileSync(`${OUT}/sections.json`, 'utf8'));
const TARGET_S = 60;
const browser = await launch(true);

async function runOnce(vpName, vpOpts, speed) {
  const vh = vpOpts.viewport.height;
  const scrollHeight = sections.viewports[vpName].scrollHeight;
  const ctx = await browser.newContext({
    ...vpOpts,
    recordVideo: { dir: '/tmp/pwcap/vidtmp', size: vpOpts.viewport },
  });
  const page = await ctx.newPage();
  await page.goto(`${SITE}/?autoscroll&autoscrollspeed=${speed}`, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await waitReady(page);
  const fps = await page.evaluate(
    () =>
      new Promise((res) => {
        let n = 0;
        const t0 = performance.now();
        const tick = () => {
          n++;
          if (performance.now() - t0 > 1500) res((n * 1000) / (performance.now() - t0));
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
  const t0 = Date.now();
  try {
    await page.waitForFunction((b) => window.scrollY >= b, scrollHeight - vh - 10, {
      timeout: 200000,
      polling: 500,
    });
  } catch {
    console.log(`${vpName}: bottom not reached, scrollY=`, await page.evaluate(() => window.scrollY));
  }
  const dur = (Date.now() - t0) / 1000;
  await page.waitForTimeout(2000);
  const vid = page.video();
  await ctx.close();
  const p = await vid.path();
  console.log(`${vpName}: speed=${speed} rAF~${fps.toFixed(0)}fps scrollDur=${dur.toFixed(1)}s`);
  return { p, dur, fps };
}

for (const [vpName, vpOpts] of Object.entries(VIEWPORTS)) {
  const vh = vpOpts.viewport.height;
  const dist = sections.viewports[vpName].scrollHeight - vh;
  // first estimate: probe fps from prior run (~148); refine per attempt
  let speed = Math.max(1, Math.round(dist / (TARGET_S * 148)));
  let best = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await runOnce(vpName, vpOpts, speed);
    best = r;
    if (r.dur >= 45 && r.dur <= 75) break;
    // rescale using observed duration
    speed = Math.max(1, Math.round((speed * r.dur) / TARGET_S));
    console.log(`${vpName}: retry with speed=${speed}`);
  }
  fs.renameSync(best.p, `${OUT}/videos/${vpName}_scroll.webm`);
  console.log(`${vpName}: saved videos/${vpName}_scroll.webm (${best.dur.toFixed(1)}s scroll)`);
}
await browser.close();
