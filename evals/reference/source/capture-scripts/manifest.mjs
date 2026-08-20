// Phase 5: verify no black/blank frames, build manifest.json with inventory.
import fs from 'node:fs';
import path from 'node:path';
import { pngStats, OUT, SITE } from './lib.mjs';

const inventory = {};
const flagged = [];
for (const dir of ['desktop', 'mobile', 'videos', 'interactions']) {
  const files = fs.readdirSync(path.join(OUT, dir)).sort();
  inventory[dir] = files.map((f) => {
    const full = path.join(OUT, dir, f);
    const bytes = fs.statSync(full).size;
    const entry = { file: `${dir}/${f}`, bytes };
    if (f.endsWith('.png')) {
      const s = pngStats(full);
      entry.lumaMean = Number(s.mean.toFixed(1));
      entry.lumaRange = [s.min, Math.round(s.max)];
      if (s.mean < 4 || s.max - s.min < 3) {
        entry.suspectBlank = true;
        flagged.push(entry.file);
      }
    }
    return entry;
  });
}

const sections = JSON.parse(fs.readFileSync(`${OUT}/sections.json`, 'utf8'));

const manifest = {
  name: 'ONE HERTZ reference capture kit — source site frozen snapshot',
  url: SITE,
  capturedAt: new Date().toISOString(),
  frozen: true,
  policy: 'All future evals compare against these files, never the live site.',
  tooling: {
    browser: 'Google Chrome (channel:chrome) via playwright-core, headless (WebGL verified non-blank)',
    node: process.version,
    machine: 'macOS arm64',
  },
  viewports: {
    desktop: { width: 1600, height: 900, deviceScaleFactor: 2 },
    mobile: { width: 390, height: 844, deviceScaleFactor: 3, touch: true, ua: 'iPhone Safari 17.5' },
  },
  method: {
    sections: 'Enumerated live [data-section] and [data-webgl] elements; offsets in CSS px per viewport. See sections.json.',
    frameGrid:
      'Per [data-section] x localProgress {0,.25,.5,.75,1}: y = offsetTop + p*(height - viewportHeight), window.scrollTo(0,y), 3s Lenis-lerp settle, viewport screenshot. Deep link ?scroll=<name> was probed but did NOT persist scroll position after load (scrollY stayed 0), so absolute offsets are the method of record.',
    videos:
      "Site's own ?autoscroll&autoscrollspeed=<pxPerFrame> (speed computed for ~60s bottom-reach at 60fps: desktop 10, mobile see sections.json), recordVideo context. Clip includes loader + 2.5s delay + 4s speed ramp-in (site behavior), then constant rate to bottom.",
    interactions:
      'longpress: mousedown center held 3s mid-Presentation (frames every 500ms + release). explode: Disassembly mid, fast drag rotate then click part(s). colorway_swap: outro (page bottom), hover watch instance #3 (custom cursor SWAP), click -> config applies + site restarts at top. Each interaction also recorded as .webm clip.',
  },
  scrollHeight: { desktop: sections.viewports.desktop.scrollHeight, mobile: sections.viewports.mobile.scrollHeight },
  videoRuns: {
    desktop_scroll: { autoscrollspeed: 4, rAFfps: 120, scrollDurationSec: 64.1 },
    mobile_scroll: { autoscrollspeed: 4, rAFfps: 120, scrollDurationSec: 56.6 },
    note: 'Headless rAF runs ~120fps (unthrottled), speed calibrated per run; clip head includes loader + autoscroll ramp-in (2.5s delay + 4s ease).',
  },
  sections: {
    dataSection: sections.dataSection.map((s) => s.name),
    dataWebgl: sections.dataWebgl.map((s) => s.name),
  },
  blankFrameCheck: { method: 'PNG luma histogram (mean<4 or range<3 flagged)', flagged },
  files: inventory,
};

fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));
const counts = Object.fromEntries(Object.entries(inventory).map(([k, v]) => [k, v.length]));
console.log('manifest written. counts:', counts, 'flagged blank:', flagged.length, flagged);
