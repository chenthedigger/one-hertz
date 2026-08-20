/**
 * evals/report.ts — merge a round's artifacts into results/<round>/report.html
 * (+ a short report.md): side-by-side frame grids, checklist table, perf
 * percentiles, gates summary, judge verdict when present.
 *
 *   node evals/report.ts [--round r1]
 *
 * Self-contained HTML: no external requests; images referenced relative to the
 * report so the committed results/ tree renders offline and on GitHub Pages.
 */

import fs from "node:fs";
import path from "node:path";
import { loadRubric, log, parseArgs, readJsonIfExists, roundDir, roundName } from "./lib.ts";

interface AssertOut {
  target: string;
  ranAt: string;
  items: { itemId: string; pass: boolean; evidence: string; area: string; severity: string; skipped: boolean }[];
  judgeVerifiedItems: string[];
  summary: { total: number; passed: number; failed: number; skipped: number; gate: { pass: boolean; criticalCount: number; criticals: string[]; passRate: number; passRateMin: number } };
}

interface PerfOut {
  label: string;
  method: { driver: string; cpuThrottle: number; viewport: string; caveat: string | null; qualityTier: number | null };
  stats: { medianFps: number; medianFrameMs: number; p95FrameMs: number; framesOver50ms: number; frames: number; durationSec: number };
  gates: Record<string, unknown>;
}

interface PairsOut {
  stillPairs: { id: string; ours: string; source: string; viewport: string; sectionId?: string; localProgress?: number }[];
  videoPairs: { id: string; ours: string; source: string }[];
  unmatched: string[];
}

const args = parseArgs();
const round = roundName(args);
const dir = roundDir(round);
const rubric = loadRubric();

const assertOut = readJsonIfExists<AssertOut>(path.join(dir, "assert.json"));
const perfFiles = fs
  .readdirSync(dir)
  .filter((f) => f.startsWith("frametimes-") && f.endsWith(".json"))
  .map((f) => readJsonIfExists<PerfOut>(path.join(dir, f)))
  .filter((p): p is PerfOut => p !== null);
const pairs = readJsonIfExists<PairsOut>(path.join(dir, "judge", "pairs.json"));
const verdict = readJsonIfExists<Record<string, unknown>>(path.join(dir, "judge", "verdict.json"));

// repo-root-relative -> report-relative (report lives at evals/results/<round>/)
const REPO_TO_REPORT = "../../../";
const relImg = (repoRel: string) => REPO_TO_REPORT + repoRel.replace(/\s+\[MISSING.*$/, "");

const esc = (s: unknown) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// -- gates summary ---------------------------------------------------------------
const likenessGate = assertOut?.summary.gate;
const perfDesktop = perfFiles.find((p) => p.method.cpuThrottle === 1);
const beautyGate = verdict && verdict["status"] === "scored" ? (verdict["gates"] as { pass: boolean } | undefined) : undefined;

const gatesRows = [
  {
    track: "Likeness",
    gate: `zero CRITICAL + ≥${rubric.structural_checklist.gate.pass_rate_min * 100}% checklist`,
    value: likenessGate
      ? `${likenessGate.criticalCount} CRITICAL · pass-rate ${(likenessGate.passRate * 100).toFixed(1)}%`
      : "not run",
    pass: likenessGate?.pass ?? null,
  },
  {
    track: "Beauty",
    gate: "win-or-tie ≥60% · no axis <40% · ≥3 axes above source · deception probe",
    value: verdict ? String(verdict["status"]) : "not run",
    pass: beautyGate ? beautyGate.pass : null,
  },
  {
    track: "Perf (desktop)",
    gate: `median ≥${rubric.perf.gates.desktop.median_fps_min}fps · p95 ≤${rubric.perf.gates.desktop.p95_frame_ms_max}ms · ≤${rubric.perf.gates.desktop.frames_over_50ms_max_per_60s} frames >50ms/60s`,
    value: perfDesktop
      ? `${perfDesktop.stats.medianFps}fps · p95 ${perfDesktop.stats.p95FrameMs}ms · ${perfDesktop.stats.framesOver50ms} long frames`
      : "not run",
    pass: perfDesktop
      ? Object.values(perfDesktop.gates)
          .filter((g): g is { pass: boolean } => typeof g === "object" && g !== null && "pass" in (g as object))
          .every((g) => g.pass)
      : null,
  },
];

const badge = (pass: boolean | null) =>
  pass === null
    ? `<span class="b pending">pending</span>`
    : pass
      ? `<span class="b pass">PASS</span>`
      : `<span class="b fail">FAIL</span>`;

// -- checklist table ---------------------------------------------------------------
const checklistRows = (assertOut?.items ?? [])
  .map(
    (i) => `<tr class="${i.pass ? "ok" : i.skipped ? "skip" : "bad"}">
  <td><code>${esc(i.itemId)}</code></td><td>${esc(i.area)}</td><td>${esc(i.severity)}</td>
  <td>${i.pass ? "PASS" : i.skipped ? "SKIP" : "FAIL"}</td><td class="ev">${esc(i.evidence)}</td></tr>`,
  )
  .join("\n");

// -- perf table ----------------------------------------------------------------------
const perfRows = perfFiles
  .map(
    (p) => `<tr><td>${esc(p.label)}</td><td>${esc(p.method.viewport)}${p.method.cpuThrottle > 1 ? ` · CPU ×${p.method.cpuThrottle}` : ""}</td>
  <td>${p.stats.medianFps}</td><td>${p.stats.p95FrameMs}</td><td>${p.stats.framesOver50ms}</td>
  <td>${p.stats.frames} / ${p.stats.durationSec}s</td><td class="ev">${esc(p.method.driver)}${p.method.caveat ? `<br><em>${esc(p.method.caveat)}</em>` : ""}</td></tr>`,
  )
  .join("\n");

// -- frame grid (ours vs source side-by-side) ------------------------------------------
const gridCells = (pairs?.stillPairs ?? [])
  .map(
    (p) => `<figure>
  <div class="pair">
    <img loading="lazy" src="${esc(relImg(p.ours))}" alt="ours ${esc(p.id)}">
    <img loading="lazy" src="${esc(relImg(p.source))}" alt="source ${esc(p.id)}">
  </div>
  <figcaption>${esc(p.id)} <span class="lr">ours · source</span></figcaption>
</figure>`,
  )
  .join("\n");

const html = `<title>ONE HERTZ · eval ${esc(round)}</title>
<style>
  :root { --ink:#0b0b0c; --paper:#ededeb; --red:#ff2d55; --ok:#0a7d33; --bad:#c81e3c; --dim:#77777a; }
  body { background:var(--paper); color:var(--ink); font:15px/1.5 ui-sans-serif,system-ui,-apple-system,sans-serif; margin:0; padding:3rem clamp(1rem,4vw,4rem); }
  h1 { font-size:2.2rem; letter-spacing:-.02em; margin:0 0 .2rem; }
  h1 em { color:var(--red); font-style:normal; }
  h2 { margin:3rem 0 1rem; font-size:1.2rem; text-transform:uppercase; letter-spacing:.08em; }
  .meta { color:var(--dim); font-family:ui-monospace,monospace; font-size:.8rem; }
  table { border-collapse:collapse; width:100%; font-size:.85rem; }
  th,td { text-align:left; padding:.4rem .6rem; border-bottom:1px solid #d8d8d4; vertical-align:top; }
  th { text-transform:uppercase; font-size:.7rem; letter-spacing:.06em; color:var(--dim); }
  .wrap { overflow-x:auto; }
  tr.ok td:nth-child(4) { color:var(--ok); font-weight:600; }
  tr.bad td:nth-child(4) { color:var(--bad); font-weight:600; }
  tr.skip td:nth-child(4) { color:var(--dim); font-weight:600; }
  .ev { color:#3a3a3c; max-width:44rem; }
  code { font-family:ui-monospace,monospace; font-size:.9em; }
  .b { padding:.15rem .55rem; border-radius:999px; font-size:.72rem; font-weight:700; letter-spacing:.05em; }
  .b.pass { background:#d9f0e1; color:var(--ok); } .b.fail { background:#fbdce3; color:var(--bad); }
  .b.pending { background:#e4e4e0; color:var(--dim); }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(420px,1fr)); gap:1.5rem; }
  figure { margin:0; }
  .pair { display:grid; grid-template-columns:1fr 1fr; gap:4px; background:#fff; padding:4px; border-radius:6px; box-shadow:0 1px 4px rgba(0,0,0,.08); }
  .pair img { width:100%; height:auto; display:block; border-radius:3px; }
  figcaption { font-family:ui-monospace,monospace; font-size:.72rem; color:var(--dim); margin-top:.35rem; }
  .lr { float:right; }
</style>
<h1>ONE HERTZ <em>·</em> eval report — ${esc(round)}</h1>
<p class="meta">rubric v${esc(rubric.meta.version)} (frozen ${esc(rubric.meta.frozen)}) · target ${esc(assertOut?.target ?? "—")} · generated ${new Date().toISOString()}</p>

<h2>Gates</h2>
<div class="wrap"><table>
<tr><th>Track</th><th>Gate</th><th>This round</th><th>Verdict</th></tr>
${gatesRows.map((g) => `<tr><td>${esc(g.track)}</td><td>${esc(g.gate)}</td><td>${esc(g.value)}</td><td>${badge(g.pass)}</td></tr>`).join("\n")}
</table></div>

<h2>Structural checklist (${assertOut ? `${assertOut.summary.passed}/${assertOut.summary.total} pass · ${assertOut.summary.skipped} skip` : "not run"})</h2>
${likenessGate ? `<p class="meta">criticals: ${likenessGate.criticals.length > 0 ? esc(likenessGate.criticals.join(", ")) : "none"} · judge-verified items pending council: ${esc((assertOut?.judgeVerifiedItems ?? []).join(", ") || "—")}</p>` : ""}
<div class="wrap"><table>
<tr><th>Item</th><th>Area</th><th>Severity</th><th>Result</th><th>Evidence</th></tr>
${checklistRows || "<tr><td colspan=5>assert.json not found for this round</td></tr>"}
</table></div>

<h2>Performance</h2>
<div class="wrap"><table>
<tr><th>Pass</th><th>Config</th><th>Median fps</th><th>p95 ms</th><th>&gt;50ms</th><th>Frames</th><th>Method</th></tr>
${perfRows || "<tr><td colspan=7>no frametimes-*.json for this round</td></tr>"}
</table></div>

<h2>Beauty council</h2>
${
  verdict
    ? `<pre class="meta">${esc(JSON.stringify(verdict, null, 2))}</pre>`
    : `<p class="meta">judge round not built — run <code>node evals/judge/runner.ts --round ${esc(round)}</code></p>`
}

<h2>Matched-moment pairs (ours · source)</h2>
${pairs && pairs.unmatched.length > 0 ? `<p class="meta">${pairs.unmatched.length} ours-frames had no source counterpart (mapping/coverage gaps — see judge/pairs.json)</p>` : ""}
<div class="grid">
${gridCells || `<p class="meta">no pairs — run capture.ts then judge/runner.ts</p>`}
</div>
`;

fs.writeFileSync(path.join(dir, "report.html"), html);

const md = `# ONE HERTZ eval — round ${round}

- rubric: v${rubric.meta.version} (frozen ${rubric.meta.frozen})
- generated: ${new Date().toISOString()}
${gatesRows.map((g) => `- **${g.track}**: ${g.value} — ${g.pass === null ? "pending" : g.pass ? "PASS" : "FAIL"}`).join("\n")}

Full detail: [report.html](./report.html)
`;
fs.writeFileSync(path.join(dir, "report.md"), md);

log(`report: ${path.relative(process.cwd(), path.join(dir, "report.html"))}`);
log(`gates: ${gatesRows.map((g) => `${g.track}=${g.pass === null ? "pending" : g.pass ? "PASS" : "FAIL"}`).join(" · ")}`);
