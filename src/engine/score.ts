import type {
  MissionConfig,
  MonteCarloSummary,
  ResolvedMission,
  RuleReport,
  ScoreBreakdown,
} from "./types";
import { clamp01, round } from "./random";

export function gradeForScore(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 78) return "B+";
  if (score >= 70) return "B";
  if (score >= 62) return "C+";
  if (score >= 54) return "C";
  if (score >= 45) return "D";
  return "F";
}

export function teamCoordination(config: MissionConfig, rules: RuleReport): number {
  if (!config.teamMode) return 1;
  const overages = rules.budgetLines.filter((line) => line.status === "fail").length;
  const warnings = rules.budgetLines.filter((line) => line.status === "warn").length;
  return clamp01(1 - overages * 0.2 - warnings * 0.05);
}

export function scoreMission(
  resolved: ResolvedMission,
  rules: RuleReport,
  summary: MonteCarloSummary,
  coordination = 1,
): ScoreBreakdown {
  const successPoints = summary.successProbability * 50;
  const sciencePoints = summary.medianScienceReturn * 25;
  const budgetEfficiency = clamp01(
    1 - 0.5 * (rules.metrics.totalCostM / Math.max(0.001, rules.metrics.budgetM)),
  );
  const budgetPoints = budgetEfficiency * 15;
  const coordinationPoints = clamp01(coordination) * 10;
  const total = Math.min(
    100,
    round(successPoints + sciencePoints + budgetPoints + coordinationPoints, 1),
  );

  return {
    total,
    grade: gradeForScore(total),
    successPoints: round(successPoints, 1),
    sciencePoints: round(sciencePoints, 1),
    budgetPoints: round(budgetPoints, 1),
    coordinationPoints: round(coordinationPoints, 1),
    budgetEfficiency: round(budgetEfficiency, 2),
    coordination: round(clamp01(coordination), 2),
  };
}
