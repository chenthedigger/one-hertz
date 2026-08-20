/**
 * evals/judge/runner.ts — beauty-council runner scaffold (rubric §c).
 *
 *   node evals/judge/runner.ts [--round r1] [--seed 1]
 *
 * DOES NOW:
 *   1. builds the matched-moment pairs manifest (20 stills + 4 videos,
 *      per-judge randomized L/R, seeded) -> results/<round>/judge/pairs.json
 *   2. writes one prompt file per judge   -> results/<round>/judge/judge<N>-prompt.md
 *   3. validates any ballots already present in results/<round>/judge/ballots/
 *      (evidence-or-void, shape check) and computes the full gate math:
 *      win-or-tie >= 60% overall, no axis < 40%, exceed clause >= 3 axes,
 *      deception probe, inter-judge agreement -> results/<round>/judge/verdict.json
 *
 * TODO(P5) — invocation wiring: actually seating 5 fresh-context vision
 * judges (subagents with the still/video files attached) and collecting their
 * ballots into ballots/judge<N>.json. The prompt files + pairs manifest built
 * here are the exact materials that wiring will feed them.
 */

import fs from "node:fs";
import path from "node:path";
import { ensureDir, log, parseArgs, readJsonIfExists, roundDir, roundName, writeJson } from "../lib.ts";
import { buildPairsManifest } from "./pairs.ts";
import { buildJudgePrompt } from "./prompts.ts";
import type { Ballot, GateResult, PairsManifest, PairSpec } from "./types.ts";

/** Raw judge output: sides keyed as the judge saw them. */
interface RawBallot {
  judge: number;
  round: string;
  votes: { pairId: string; votes: { axis: string; choice: "A" | "B" | "tie"; evidence?: string }[] }[];
  deceptionProbe: { choice: "A" | "B"; evidence?: string };
  anchoredScore: { A: number; B: number };
}

function main(): void {
  const args = parseArgs();
  const round = roundName(args);
  const seed = Number(args.flags["seed"] ?? 1);

  const judgeDir = ensureDir(path.join(roundDir(round), "judge"));
  const ballotsDir = ensureDir(path.join(judgeDir, "ballots"));

  // 1) pairs manifest ----------------------------------------------------------
  const manifest = buildPairsManifest(round, seed);
  writeJson(path.join(judgeDir, "pairs.json"), manifest);
  log(
    `judge · pairs manifest: ${manifest.stillPairs.length} still pairs (rubric wants 20), ` +
      `${manifest.videoPairs.length} video pairs, ${manifest.unmatched.length} ours-frames unmatched`,
  );
  if (manifest.stillPairs.length === 0) {
    log("   !! zero matchable pairs — run capture.ts against a build whose sections map to source roles first");
  }

  // 2) prompts -------------------------------------------------------------------
  const pairsById = new Map<string, PairSpec>(
    [...manifest.stillPairs, ...manifest.videoPairs].map((p) => [p.id, p]),
  );
  for (const assignment of manifest.assignments) {
    const file = path.join(judgeDir, `judge${assignment.judge}-prompt.md`);
    fs.writeFileSync(file, buildJudgePrompt(assignment, pairsById, round));
  }
  log(`   ${manifest.assignments.length} judge prompts written -> ${path.relative(process.cwd(), judgeDir)}/`);

  // 3) ballots: validate + gate math ----------------------------------------------
  const ballotFiles = fs.existsSync(ballotsDir)
    ? fs.readdirSync(ballotsDir).filter((f) => f.endsWith(".json"))
    : [];

  if (ballotFiles.length === 0) {
    log("   no ballots present yet — invocation wiring is TODO(P5); gate math ran on 0 ballots");
    writeJson(path.join(judgeDir, "verdict.json"), {
      round,
      status: "pending",
      note: "pairs + prompts ready; seat the council (TODO P5) and drop ballots into judge/ballots/judge<N>.json",
    });
    return;
  }

  const validBallots: Ballot[] = [];
  const voided: string[] = [];
  for (const f of ballotFiles) {
    const raw = readJsonIfExists<RawBallot>(path.join(ballotsDir, f));
    if (!raw) continue;
    const problem = validateBallot(raw, manifest);
    if (problem) {
      voided.push(`${f}: ${problem}`);
      continue;
    }
    validBallots.push(normalizeBallot(raw, manifest));
  }
  if (voided.length > 0) {
    log(`   VOID ballots (evidence-or-void / shape): re-run these judges with fresh context:`);
    for (const v of voided) log(`     - ${v}`);
  }

  const verdict = computeGates(validBallots);
  writeJson(path.join(judgeDir, "verdict.json"), { round, status: "scored", voided, ...verdict });
  log(
    `   verdict: overall win-or-tie ${(verdict.winOrTieRate * 100).toFixed(1)}% · ` +
      `axes above source [${verdict.axesAboveSource.join(", ")}] · gate ${verdict.gates.pass ? "PASS" : "FAIL"}`,
  );
}

// ---------------------------------------------------------------------------

export function validateBallot(raw: RawBallot, m: PairsManifest): string | null {
  if (typeof raw.judge !== "number" || !Array.isArray(raw.votes)) return "malformed shape";
  const assignment = m.assignments.find((a) => a.judge === raw.judge);
  if (!assignment) return `unknown judge ${raw.judge}`;
  const expectedPairs = new Set(assignment.pairs.map((p) => p.pairId));
  for (const pv of raw.votes) {
    if (!expectedPairs.has(pv.pairId)) return `vote for unknown pair ${pv.pairId}`;
    for (const v of pv.votes) {
      if (!["A", "B", "tie"].includes(v.choice)) return `invalid choice '${v.choice}'`;
      if (!v.evidence || v.evidence.trim().length < 10) {
        return `evidence-less choice on ${pv.pairId}/${v.axis} — ballot VOID`;
      }
    }
  }
  if (!raw.deceptionProbe?.choice || !raw.deceptionProbe.evidence) return "missing deception probe";
  return null;
}

/** Translate A/B-keyed raw ballot into ours/source terms via the assignment. */
export function normalizeBallot(raw: RawBallot, m: PairsManifest): Ballot {
  const assignment = m.assignments.find((a) => a.judge === raw.judge)!;
  const sideOf = new Map(assignment.pairs.map((p) => [p.pairId, p.oursIs]));
  // For the deception probe / anchored score, "ours" side varies per pair; the
  // probe is asked once, so we anchor it to the majority presentation. For the
  // per-axis votes the translation is exact per pair.
  const votes = raw.votes.map((pv) => ({
    pairId: pv.pairId,
    votes: pv.votes.map((v) => ({
      axis: v.axis as Ballot["votes"][number]["votes"][number]["axis"],
      choice:
        v.choice === "tie" ? ("tie" as const) : v.choice === sideOf.get(pv.pairId) ? ("A" as const) : ("B" as const),
      // normalized: "A" now ALWAYS means ours, "B" means source
      evidence: v.evidence ?? "",
    })),
  }));
  const oursMajorityA =
    assignment.pairs.filter((p) => p.oursIs === "A").length >= assignment.pairs.length / 2;
  const probeOurs = raw.deceptionProbe.choice === (oursMajorityA ? "A" : "B");
  return {
    judge: raw.judge,
    round: raw.round,
    votes,
    deceptionProbe: {
      choice: probeOurs ? "A" : "B",
      evidence: raw.deceptionProbe.evidence ?? "",
    },
    anchoredScore: oursMajorityA
      ? { ours: raw.anchoredScore.A, source: raw.anchoredScore.B }
      : { ours: raw.anchoredScore.B, source: raw.anchoredScore.A },
  };
}

export function computeGates(ballots: Ballot[]): GateResult {
  const perAxis: GateResult["perAxis"] = {};
  let wins = 0, ties = 0, total = 0;
  // per (pair,axis) choice matrix for agreement
  const cell = new Map<string, string[]>();

  for (const b of ballots) {
    for (const pv of b.votes) {
      for (const v of pv.votes) {
        total++;
        const ax = (perAxis[v.axis] ??= { wins: 0, ties: 0, losses: 0, winOrTieRate: 0, oursAbove: false });
        if (v.choice === "A") { wins++; ax.wins++; }
        else if (v.choice === "tie") { ties++; ax.ties++; }
        else ax.losses++;
        const key = `${pv.pairId}::${v.axis}`;
        const arr = cell.get(key) ?? [];
        arr.push(v.choice);
        cell.set(key, arr);
      }
    }
  }

  const axesAboveSource: string[] = [];
  for (const [axis, ax] of Object.entries(perAxis)) {
    const n = ax.wins + ax.ties + ax.losses;
    ax.winOrTieRate = n > 0 ? (ax.wins + ax.ties) / n : 0;
    ax.oursAbove = ax.wins > ax.losses; // scored ABOVE the source on this axis
    if (ax.oursAbove) axesAboveSource.push(axis);
  }

  // inter-judge agreement: fraction of (pair,axis) cells with >=2 votes where
  // the modal choice share >= 2/3
  let agreeCells = 0, comparableCells = 0;
  for (const choices of cell.values()) {
    if (choices.length < 2) continue;
    comparableCells++;
    const counts = new Map<string, number>();
    for (const c of choices) counts.set(c, (counts.get(c) ?? 0) + 1);
    const modal = Math.max(...counts.values());
    if (modal / choices.length >= 2 / 3) agreeCells++;
  }

  const probeOurs = ballots.filter((b) => b.deceptionProbe.choice === "A").length;
  const winOrTieRate = total > 0 ? (wins + ties) / total : 0;
  const axisFloor = Object.values(perAxis).every((a) => a.winOrTieRate >= 0.4);
  const deceptionPass = ballots.length === 0 || probeOurs >= ballots.length / 2;

  return {
    totalAxisChoices: total,
    oursWins: wins,
    ties,
    winOrTieRate: Math.round(winOrTieRate * 1000) / 1000,
    perAxis,
    axesAboveSource,
    deceptionProbe: { oursPickedAsProfessional: probeOurs, judges: ballots.length, pass: deceptionPass },
    interJudgeAgreement: comparableCells > 0 ? Math.round((agreeCells / comparableCells) * 1000) / 1000 : 0,
    gates: {
      overall: winOrTieRate >= 0.6,
      axisFloor,
      exceedClause: axesAboveSource.length >= 3,
      deception: deceptionPass,
      pass: winOrTieRate >= 0.6 && axisFloor && axesAboveSource.length >= 3 && deceptionPass && total > 0,
    },
  };
}

// Run only when executed directly (importable for gate-math reuse/testing).
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
