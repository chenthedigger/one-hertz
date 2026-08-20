/**
 * evals/judge/types.ts — ballot + pairs-manifest shapes (rubric §c).
 *
 * The ballot JSON is the contract between the prompt templates and the gate
 * math in runner.ts. Judges MUST return exactly this shape; a choice without
 * evidence voids the whole ballot (evidence-or-void rule) and that judge's
 * round is re-run with a fresh context.
 */

export type Axis = "light" | "material" | "typography" | "composition" | "motion";
export type Choice = "A" | "B" | "tie";

export interface PairSpec {
  /** Stable pair id, e.g. "still-desktop-Mechanism-0.75" or "video-desktop-scroll". */
  id: string;
  kind: "still" | "video";
  viewport: "desktop" | "mobile";
  /** Matched moment: our sectionId + localProgress (stills only). */
  sectionId?: string;
  localProgress?: number;
  /** Repo-relative paths. */
  ours: string;
  source: string;
  axes: Axis[];
}

/** Per-judge presentation: which side each file lands on (randomized, seeded). */
export interface JudgeAssignment {
  judge: number; // 1..5
  pairs: {
    pairId: string;
    /** File shown as "A" / shown as "B". */
    A: string;
    B: string;
    /** Ground truth for gate math — NEVER shown to the judge. */
    oursIs: "A" | "B";
  }[];
}

export interface PairsManifest {
  round: string;
  rubricVersion: string;
  builtAt: string;
  seed: number;
  stillPairs: PairSpec[];
  videoPairs: PairSpec[];
  /** Ours frames that found no source counterpart (mapping/coverage gaps). */
  unmatched: string[];
  assignments: JudgeAssignment[];
}

export interface AxisVote {
  axis: Axis;
  choice: Choice;
  /** One sentence of concrete visual evidence — REQUIRED (evidence-or-void). */
  evidence: string;
}

export interface PairVote {
  pairId: string;
  votes: AxisVote[];
}

export interface Ballot {
  judge: number;
  round: string;
  votes: PairVote[];
  /** Deception probe: which side is the shipping professional site? */
  deceptionProbe: { choice: "A" | "B"; evidence: string };
  /** Anchored 1-10 diagnostic (5=agency, 7=HM, 8=SOTD, 9=source, 10=exceeds). */
  anchoredScore: { ours: number; source: number };
}

export interface GateResult {
  totalAxisChoices: number;
  oursWins: number;
  ties: number;
  winOrTieRate: number;
  perAxis: Record<string, { wins: number; ties: number; losses: number; winOrTieRate: number; oursAbove: boolean }>;
  axesAboveSource: string[];
  deceptionProbe: { oursPickedAsProfessional: number; judges: number; pass: boolean };
  interJudgeAgreement: number;
  gates: {
    overall: boolean; // win-or-tie >= 60%
    axisFloor: boolean; // no axis < 40%
    exceedClause: boolean; // >= 3 axes above source
    deception: boolean;
    pass: boolean;
  };
}
