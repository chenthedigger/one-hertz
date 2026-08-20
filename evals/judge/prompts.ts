/**
 * evals/judge/prompts.ts — judge prompt templates (rubric §c beauty protocol).
 *
 * One prompt per judge per round. Fresh context per judge: no judge sees prior
 * rounds, other ballots, or which side is ours. Prompts are published verbatim
 * in the round report (rubric transparency clause).
 */

import type { JudgeAssignment, PairSpec } from "./types.ts";

export function buildJudgePrompt(
  assignment: JudgeAssignment,
  pairsById: Map<string, PairSpec>,
  round: string,
): string {
  const pairBlocks = assignment.pairs
    .map((p) => {
      const spec = pairsById.get(p.pairId)!;
      return [
        `### Pair ${p.pairId} (${spec.kind}, ${spec.viewport})`,
        `- Image/Video A: ${p.A}`,
        `- Image/Video B: ${p.B}`,
        `- Axes to judge: ${spec.axes.join(", ")}`,
      ].join("\n");
    })
    .join("\n\n");

  return `# Beauty council ballot — round ${round}, judge ${assignment.judge}

You are one of five independent vision judges comparing two scrollytelling
websites, moment by moment. You are seeing these images for the first time and
know nothing about who made either side. Judge ONLY what is visible.

## Task

For EVERY pair below, and EVERY listed axis of that pair, make a forced choice:
**A**, **B**, or **tie** — which side is more beautiful / better crafted on
that axis?

Axis definitions:
- **light** — lighting design: speculars, falloff, grounding shadows, luminance hierarchy
- **material** — physical believability and richness of surfaces (metal, glass, ceramic)
- **typography** — type quality: faces, scale contrast, spacing, alignment, hierarchy
- **composition** — framing, negative space, balance of 3D subject vs copy
- **motion** (video pairs only) — easing quality, channel separation, rhythm, absence of jank

## Rules (binding)

1. **Evidence or void.** Every single choice MUST carry one sentence of
   concrete visual evidence ("the crown's specular highlight stretches along
   the knurling", not "looks better"). A ballot containing any choice without
   evidence is VOID in its entirety and your round is discarded.
2. Forced choice: "tie" is allowed but must also carry evidence of parity.
3. Judge the axis independently — a side may win light and lose typography on
   the same pair.

## Pairs

${pairBlocks}

## Deception probe (answer once, after all pairs)

Question: **"Which of these is the shipping professional site?"** — answer A
or B with one sentence of evidence.

## Anchored diagnostic (once, after all pairs)

Score each side 1-10 on this anchored scale (diagnostic only):
5 = competent agency work · 7 = Awwwards Honorable Mention · 8 = Site of the
Day · 9 = the craft level of a top-tier product scrollytelling site · 10 =
exceeds it.

## Output format — STRICT JSON, nothing else

\`\`\`json
{
  "judge": ${assignment.judge},
  "round": "${round}",
  "votes": [
    {
      "pairId": "<pair id>",
      "votes": [
        { "axis": "light", "choice": "A" | "B" | "tie", "evidence": "<one sentence>" }
      ]
    }
  ],
  "deceptionProbe": { "choice": "A" | "B", "evidence": "<one sentence>" },
  "anchoredScore": { "A": <1-10>, "B": <1-10> }
}
\`\`\`

Note: report anchoredScore keyed by the letters as YOU saw them (A/B).
`;
}
