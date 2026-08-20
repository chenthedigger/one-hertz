/**
 * evals/judge/pairs.ts — matched-moment pairs manifest builder (rubric §c
 * materials: 20 still pairs + 4 video pairs, L/R randomized per pair per
 * judge, seeded so a round is reproducible).
 *
 * Matching is a filename join: ours frames are `<SectionId>_<p>.png` under
 * reference/ours/<viewport>/, source frames are `<SourceSection>_<p>.png`
 * under reference/source/<viewport>/, bridged by ROLE_TO_SOURCE below.
 */

import fs from "node:fs";
import path from "node:path";
import { EVALS_DIR, frameFile, loadRubric, mulberry32, OURS_DIR, SOURCE_DIR } from "../lib.ts";
import type { JudgeAssignment, PairsManifest, PairSpec } from "./types.ts";

/**
 * Canonical role -> frozen source capture section name (from
 * reference/source/manifest.json dataSection order vs PLAN §1 recon order).
 * NOTE: source "Colors" (dedicated colorway section between Images and Parts)
 * has no 1:1 role in our rubric list — it is available as extra material for
 * colorway interaction pairs. "loader" has no source grid frames.
 */
export const ROLE_TO_SOURCE: Record<string, string | null> = {
  loader: null,
  intro: "Intro",
  timeless: "Timeless",
  vertical: "VerticalText",
  disassembly: "Disassembly",
  mechanism: "Mechanism",
  movement: "Movement",
  curves: "Curves",
  details: "MovementWatchRight",
  profile: "Hands",
  bracelet: "Straps",
  gallery: "Images",
  "parts-table": "Parts",
  outro: "Footer",
};

interface OursFrameRef {
  viewport: "desktop" | "mobile";
  sectionId: string;
  progress: number;
  file: string;
}

interface OursManifest {
  frames: OursFrameRef[];
}

const rel = (abs: string) => path.relative(path.dirname(EVALS_DIR), abs);

export function buildPairsManifest(round: string, seed = 1): PairsManifest {
  const rubric = loadRubric();
  const wanted = rubric.beauty.materials.still_pairs;
  const judgeCount = rubric.beauty.judges.count;
  const stillAxes = rubric.beauty.axes.stills as PairSpec["axes"];
  const videoAxes = rubric.beauty.axes.video as PairSpec["axes"];

  const oursManifest = readOursManifest();
  const candidates: PairSpec[] = [];
  const unmatched: string[] = [];

  for (const f of oursManifest.frames) {
    const role = roleForSection(f.sectionId);
    const sourceName = role ? (ROLE_TO_SOURCE[role] ?? null) : null;
    let sourceFile = sourceName
      ? path.join(SOURCE_DIR, f.viewport, frameFile(sourceName, f.progress))
      : null;
    // No role mapping, but the source grid has a section of the same name
    // (e.g. "Colors") -> pair by identity.
    if (!sourceFile) {
      const identity = path.join(SOURCE_DIR, f.viewport, frameFile(f.sectionId, f.progress));
      if (fs.existsSync(identity)) sourceFile = identity;
    }
    const oursFile = path.join(OURS_DIR, f.viewport, f.file);
    if (sourceFile && fs.existsSync(sourceFile) && fs.existsSync(oursFile)) {
      candidates.push({
        id: `still-${f.viewport}-${f.sectionId}-${f.progress}`,
        kind: "still",
        viewport: f.viewport,
        sectionId: f.sectionId,
        localProgress: f.progress,
        ours: rel(oursFile),
        source: rel(sourceFile),
        axes: stillAxes,
      });
    } else {
      unmatched.push(`${f.viewport}/${f.file}${role ? "" : " (no sourceRole mapping)"}`);
    }
  }

  // Deterministic spread: sort by (section, progress, viewport), then take an
  // even stride so the 20 pairs cover the whole page, both viewports.
  candidates.sort((a, b) => a.id.localeCompare(b.id));
  const rng = mulberry32(seed);
  const stillPairs: PairSpec[] = [];
  if (candidates.length <= wanted) stillPairs.push(...candidates);
  else {
    const stride = candidates.length / wanted;
    for (let i = 0; i < wanted; i++) {
      const jitter = Math.floor(rng() * stride);
      stillPairs.push(candidates[Math.min(candidates.length - 1, Math.floor(i * stride) + jitter)]!);
    }
  }

  // Video pairs (rubric wants 4): 2 scripted ~60s scrolls (one per viewport)
  // + 2 interaction clips (explode, colorway swap) — the frozen source kit
  // already carries all four. Ours videos are TODO(P5) (capture.ts note);
  // missing files are flagged so the runner can refuse to seat a council on
  // incomplete material.
  const flag = (p: string) => rel(p) + (fs.existsSync(p) ? "" : "  [MISSING — TODO(P5)]");
  const videoPairs: PairSpec[] = [
    ...(["desktop", "mobile"] as const).map((vp) => ({
      id: `video-${vp}-scroll`,
      kind: "video" as const,
      viewport: vp,
      ours: flag(path.join(OURS_DIR, vp, "videos", "scroll_60s.webm")),
      source: flag(path.join(SOURCE_DIR, "videos", `${vp}_scroll.webm`)),
      axes: videoAxes,
    })),
    ...(["explode", "colorway_swap"] as const).map((clip) => ({
      id: `video-desktop-${clip}`,
      kind: "video" as const,
      viewport: "desktop" as const,
      ours: flag(path.join(OURS_DIR, "desktop", "interactions", `${clip}.webm`)),
      source: flag(path.join(SOURCE_DIR, "interactions", `${clip}.webm`)),
      axes: videoAxes,
    })),
  ];

  // Per-judge randomized L/R (seeded per judge for reproducibility).
  const allPairs = [...stillPairs, ...videoPairs];
  const assignments: JudgeAssignment[] = [];
  for (let j = 1; j <= judgeCount; j++) {
    const jr = mulberry32(seed * 1000 + j);
    assignments.push({
      judge: j,
      pairs: allPairs.map((p) => {
        const oursIsA = jr() < 0.5;
        return {
          pairId: p.id,
          A: oursIsA ? p.ours : p.source,
          B: oursIsA ? p.source : p.ours,
          oursIs: oursIsA ? ("A" as const) : ("B" as const),
        };
      }),
    });
  }

  return {
    round,
    rubricVersion: rubric.meta.version,
    builtAt: new Date().toISOString(),
    seed,
    stillPairs,
    videoPairs,
    unmatched,
    assignments,
  };
}

function readOursManifest(): OursManifest {
  const file = path.join(OURS_DIR, "manifest.json");
  if (!fs.existsSync(file)) return { frames: [] };
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as { frames?: OursFrameRef[] };
  return { frames: raw.frames ?? [] };
}

/**
 * Resolve a section id to a canonical role.
 * Precedence: exact role id -> exact source-section name (builds that reuse
 * source names, e.g. "MovementWatchRight" -> details) -> aliases -> substring.
 * Additive sections (Nocturne) intentionally resolve to null: no matched
 * moment exists in the source, so they never enter the pairwise materials.
 */
function roleForSection(sectionId: string): string | null {
  const id = sectionId.toLowerCase();
  if (id in ROLE_TO_SOURCE) return id;
  for (const [role, source] of Object.entries(ROLE_TO_SOURCE)) {
    if (source && source.toLowerCase() === id) return role;
  }
  if (id.includes("hero")) return "intro";
  if (id.includes("footer") || id.includes("credits")) return "outro";
  if (id.includes("parts")) return "parts-table";
  // substring fallback, most-specific first so "movement" never shadows others
  const roles = Object.keys(ROLE_TO_SOURCE).sort((a, b) => b.length - a.length);
  for (const role of roles) {
    if (id.includes(role.replace("-", ""))) return role;
  }
  return null;
}
