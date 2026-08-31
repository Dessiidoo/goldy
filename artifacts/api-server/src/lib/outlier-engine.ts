export type Evidence = {
  id: string;
  label: string;
  category: "technology" | "behavior" | "social" | "economic" | "business" | "world";
  direction: "supports" | "contradicts";
  strength: number;
  observedAt: string;
};

export type Trajectory = {
  label: string;
  probability: number;
  rationale: string;
};

export function analyzeTrajectory(subject: string, cutoff: string, evidence: Evidence[]): {
  subject: string;
  cutoff: string;
  evidenceCount: number;
  supportScore: number;
  contradictionScore: number;
  overlookedSignals: Evidence[];
  trajectories: Trajectory[];
  rule: string;
} {
  const valid = evidence.filter((item) => item.observedAt <= cutoff);
  const supportScore = valid.filter((item) => item.direction === "supports").reduce((sum, item) => sum + item.strength, 0);
  const contradictionScore = valid.filter((item) => item.direction === "contradicts").reduce((sum, item) => sum + item.strength, 0);
  const categories = new Set(valid.map((item) => item.category));

  const overlookedSignals = valid
    .filter((item) => item.strength >= 0.45)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5);

  const base = Math.max(0.05, Math.min(0.9, 0.5 + (supportScore - contradictionScore) * 0.12));
  const diversificationBonus = Math.min(0.12, Math.max(0, categories.size - 1) * 0.02);
  const primary = Math.min(0.9, base + diversificationBonus);
  const secondary = Math.min(0.85, (1 - primary) * 0.7);
  const tertiary = Math.max(0.05, 1 - primary - secondary);
  const total = primary + secondary + tertiary;

  return {
    subject,
    cutoff,
    evidenceCount: valid.length,
    supportScore: Number(supportScore.toFixed(3)),
    contradictionScore: Number(contradictionScore.toFixed(3)),
    overlookedSignals,
    trajectories: [
      {
        label: "Continue the emerging trajectory",
        probability: Number((primary / total).toFixed(3)),
        rationale: "Multiple independent evidence categories point in the same direction before the cutoff.",
      },
      {
        label: "Change direction or consolidate",
        probability: Number((secondary / total).toFixed(3)),
        rationale: "Contradictory evidence or unresolved constraints can interrupt an otherwise promising trajectory.",
      },
      {
        label: "Unexpected outcome",
        probability: Number((tertiary / total).toFixed(3)),
        rationale: "Rare combinations and unobserved variables can produce outcomes outside the dominant pattern.",
      },
    ],
    rule: "Never use evidence dated after the cutoff. A prediction is frozen before the outcome is revealed.",
  };
}

export function microsoftBirthTest() {
  return analyzeTrajectory("Microsoft / Bill Gates", "1975-12-31", [
    { id: "m1", label: "Altair 8800 creates a new microcomputer ecosystem", category: "technology", direction: "supports", strength: 0.8, observedAt: "1975-01-01" },
    { id: "m2", label: "Popular Electronics exposes the Altair to hobbyists", category: "social", direction: "supports", strength: 0.65, observedAt: "1975-01-01" },
    { id: "m3", label: "Gates and Allen deliver working Altair BASIC", category: "business", direction: "supports", strength: 0.9, observedAt: "1975-04-01" },
    { id: "m4", label: "Software becomes a scarce layer around new hardware", category: "technology", direction: "supports", strength: 0.75, observedAt: "1975-06-01" },
    { id: "m5", label: "Micro-Soft begins selling software while the market is still tiny", category: "behavior", direction: "supports", strength: 0.7, observedAt: "1975-08-01" },
    { id: "m6", label: "1975 revenue remains very small", category: "economic", direction: "contradicts", strength: 0.45, observedAt: "1975-12-31" },
  ]);
}
