import { getRealMission } from "./data";
import { tightConstraints } from "./rules";
import type {
  Facts,
  MonteCarloSummary,
  ResolvedMission,
  RuleReport,
  ScoreBreakdown,
} from "./types";

function verdictFor(probability: number): string {
  if (probability >= 0.85) {
    return "This design is robust. Remaining risk is dominated by launch reliability and random component failures.";
  }
  if (probability >= 0.65) {
    return "This design is viable but fragile. Tight resource margins drive most of the failures.";
  }
  if (probability >= 0.4) {
    return "This mission is likely to fail in its current form. Fix the tight constraints before launch.";
  }
  return "This design cannot reliably meet the objective. Rework the power, data, or budget chain.";
}

export function buildFacts(
  resolved: ResolvedMission,
  rules: RuleReport,
  summary: MonteCarloSummary,
  score: ScoreBreakdown,
): Facts {
  const { config, scenario, orbit, rocket, parts, weather } = resolved;
  const reference = getRealMission(scenario.referenceMissionId);

  return {
    generatedAt: new Date().toISOString(),
    scenario: {
      id: scenario.id,
      name: scenario.name,
      region: scenario.region,
      objective: scenario.objective,
      budgetM: rules.metrics.budgetM,
      lifetimeMonths: scenario.lifetimeMonths,
      requiredDeliveredFraction: scenario.minDeliveredFraction,
      requiredRevisitDays: scenario.maxRevisitDays,
      requiredResolutionM: scenario.minResolutionM,
    },
    design: {
      rocket: `${rocket.name} (${rocket.provider})`,
      orbit: orbit.name,
      orbitType: orbit.type,
      altitudeKm: orbit.altitudeKm,
      parts: [
        { category: "camera", name: parts.camera.name, blurb: parts.camera.blurb },
        { category: "panel", name: parts.panel.name, blurb: parts.panel.blurb },
        { category: "battery", name: parts.battery.name, blurb: parts.battery.blurb },
        { category: "radio", name: parts.radio.name, blurb: parts.radio.blurb },
        { category: "computer", name: parts.computer.name, blurb: parts.computer.blurb },
      ],
      totalCostM: rules.metrics.totalCostM,
      totalMassKg: rules.metrics.totalMassKg,
      capacityKg: rules.metrics.capacityKg,
      generationW: rules.metrics.generationW,
      loadW: rules.metrics.loadW,
      dataProducedGb: rules.metrics.dataProducedGb,
      dataCapacityGb: rules.metrics.dataCapacityGb,
      eclipseHours: rules.metrics.eclipseHours,
      sciencePriority: config.sciencePriority,
    },
    weather: {
      kpIndex: weather.kpIndex,
      stormProbability: weather.stormProbability,
      source: weather.source,
      stale: Boolean(weather.stale),
    },
    results: {
      successProbability: summary.successProbability,
      medianScienceReturn: summary.medianScienceReturn,
      meanMonthsSurvived: summary.meanMonthsSurvived,
      lifetimeMonths: scenario.lifetimeMonths,
      deliveredFraction: summary.deliveredFraction,
      topFailures: summary.failureBreakdown.slice(0, 4),
      tightConstraints: tightConstraints(rules, 4).map((rule) => ({
        id: rule.id,
        label: rule.label,
        status: rule.status,
        message: rule.message,
        why: rule.why,
        headroom: Math.round(rule.headroom * 1000) / 1000,
      })),
    },
    improvements: summary.improvements,
    score,
    referenceMission: reference,
    verdict: verdictFor(summary.successProbability),
  };
}
