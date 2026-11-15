import {
  ROCKETS,
  ORBITS,
  getMissionParts,
  partsForCategory,
  resolveMission,
} from "./data";
import { FAILURE_LABELS, FAILURE_ORDER } from "./constants";
import { evaluateMission } from "./rules";
import { clamp01, mean, median, mulberry32 } from "./random";
import type {
  FailureBucket,
  FailureCause,
  Improvement,
  MissionConfig,
  MonteCarloSummary,
  Part,
  PartCategory,
  ResolvedMission,
  RuleId,
  RuleReport,
  RunResult,
  SpaceWeather,
} from "./types";

export interface SimulationContext {
  resolved: ResolvedMission;
  rules: RuleReport;
}

const RULE_CAUSE: Record<RuleId, FailureCause> = {
  mass: "mass",
  power: "power",
  battery: "battery",
  data: "data",
  budget: "budget",
  revisit: "orbit",
  resolution: "resolution",
  orbit: "orbit",
};

const PRIORITY_CATEGORIES: PartCategory[] = [
  "panel",
  "radio",
  "battery",
  "computer",
  "camera",
];

export function createSimulationContext(
  config: Partial<MissionConfig>,
  weather: SpaceWeather,
): SimulationContext {
  const resolved = resolveMission(config, weather);
  return { resolved, rules: evaluateMission(resolved) };
}

function failure(
  cause: FailureCause,
  causeDetail: string,
  monthsSurvived: number,
  deliveredFraction: number,
  scienceReturn: number,
  storms: number,
): RunResult {
  return {
    success: false,
    cause,
    causeDetail,
    monthsSurvived,
    deliveredFraction: clamp01(deliveredFraction),
    scienceReturn: clamp01(scienceReturn),
    storms,
  };
}

export function simulateRun(ctx: SimulationContext, rng: () => number): RunResult {
  const { scenario, orbit, rocket, parts, difficulty, weather } = ctx.resolved;
  const metrics = ctx.rules.metrics;

  const blocking = ctx.rules.blockingFailures[0];
  if (blocking) {
    return failure(
      RULE_CAUSE[blocking.id],
      `${blocking.label}: ${blocking.message}`,
      0,
      0,
      0,
      0,
    );
  }

  if (rng() > rocket.reliability) {
    return failure(
      "launch",
      `${rocket.name} failed during ascent (${(rocket.reliability * 100).toFixed(1)}% reliable).`,
      0,
      0,
      0,
      0,
    );
  }

  if (rng() > 0.996) {
    return failure("launch", "Spacecraft separation anomaly after a nominal launch.", 0, 0, 0, 0);
  }

  const months = Math.max(1, Math.round(scenario.lifetimeMonths));
  const loadW = metrics.loadW;
  const eclipseHours = metrics.eclipseHours;
  const radiationFactor = 1 + (orbit.radiation - 1) * 0.35;
  const stormMonthly = clamp01(
    weather.stormProbability * scenario.stormSensitivity * difficulty.stormScale,
  ) / 6;

  const dataRatio = metrics.dataCapacityGb / Math.max(0.001, metrics.dataProducedGb);
  const bufferBonus = Math.min(
    0.1,
    (metrics.bufferGb / Math.max(1, metrics.dataProducedGb * 30)) * 0.1,
  );
  const baseDelivery = clamp01(dataRatio + bufferBonus);

  const priorityFactor = sciencePriorityFactor(ctx.resolved);
  const scienceQuality = clamp01(parts.camera.science * priorityFactor);

  const reserveRatio = (metrics.budgetM - metrics.totalCostM) / metrics.budgetM;
  const delayRisk =
    reserveRatio < 0.02 ? 0.07 : reserveRatio < 0.08 ? 0.035 : reserveRatio < 0.18 ? 0.018 : 0.006;

  const components: { part: Part; label: string }[] = [
    { part: parts.camera, label: "Instrument" },
    { part: parts.panel, label: "Solar array" },
    { part: parts.battery, label: "Battery" },
    { part: parts.radio, label: "Radio" },
    { part: parts.computer, label: "Computer" },
  ];

  let storms = 0;
  let deliveredSum = 0;
  let budgetSpent = metrics.totalCostM;

  for (let month = 1; month <= months; month += 1) {
    const stormHit = stormMonthly > 0 && rng() < stormMonthly;
    if (stormHit) storms += 1;

    const ageYears = month / 12;
    const panelDamage =
      parts.panel.degradationPerYear * ageYears + storms * 0.02 + (stormHit ? 0.01 : 0);
    const panelHealth = clamp01(1 - panelDamage - 0.002 * (rng() - 0.5));
    const generationW = parts.panel.peakW * (1 - orbit.eclipseFraction) * panelHealth;
    const powerStress = generationW / loadW;

    const deliveredSoFar = deliveredSum / Math.max(1, month - 1);
    const scienceSoFar = clamp01(deliveredSoFar * scienceQuality);

    if (powerStress < 0.97) {
      return failure(
        "power",
        `Solar output fell below load in month ${month}: ${generationW.toFixed(0)} W available for ${loadW.toFixed(0)} W.`,
        month - 1,
        deliveredSoFar,
        scienceSoFar,
        storms,
      );
    }

    const batteryHealth = clamp01(1 - 0.008 * ageYears - storms * 0.012);
    const usableWh = parts.battery.capacityWh * parts.battery.usableFraction * batteryHealth;
    const needWh = loadW * eclipseHours * 1.05;
    if (usableWh < needWh) {
      return failure(
        "battery",
        `Battery could not cover eclipse demand in month ${month}: ${usableWh.toFixed(0)} Wh usable vs ${needWh.toFixed(0)} Wh needed.`,
        month - 1,
        deliveredSoFar,
        scienceSoFar,
        storms,
      );
    }

    const stressMultiplier = powerStress < 1.05 ? 1.35 : powerStress < 1.15 ? 1.12 : 1;
    for (const component of components) {
      let monthlyFailure = 1 - Math.pow(component.part.reliability, 1 / 12);
      monthlyFailure *=
        difficulty.failureScale * radiationFactor * stressMultiplier * (stormHit ? 2.2 : 1);
      monthlyFailure = Math.min(0.25, monthlyFailure);
      if (rng() < monthlyFailure) {
        const cause: FailureCause = stormHit ? "storm" : "component";
        const causeDetail = `${component.label} (${component.part.name}) failed in month ${month}${
          stormHit ? " during a geomagnetic storm" : ""
        }.`;
        return failure(cause, causeDetail, month, deliveredSoFar, scienceSoFar, storms);
      }
    }

    const outage = powerStress < 1.08 && rng() < 0.05 ? 0.6 : 1;
    const stormPenalty = stormHit ? 0.88 : 1;
    deliveredSum += clamp01(baseDelivery * outage * stormPenalty);

    if (rng() < delayRisk) {
      budgetSpent += metrics.budgetM * (0.01 + rng() * 0.015);
      if (budgetSpent > metrics.budgetM) {
        const delivered = deliveredSum / month;
        return failure(
          "schedule",
          `A schedule delay in month ${month} pushed spending past the $${metrics.budgetM.toFixed(1)}M cap.`,
          month,
          delivered,
          clamp01(delivered * scienceQuality),
          storms,
        );
      }
    }
  }

  const delivered = clamp01(deliveredSum / months);
  const scienceReturn = clamp01(delivered * scienceQuality);

  if (delivered < scenario.minDeliveredFraction) {
    return failure(
      "data",
      `Only ${(delivered * 100).toFixed(0)}% of imagery reached the ground; the scenario requires ${(scenario.minDeliveredFraction * 100).toFixed(0)}%.`,
      months,
      delivered,
      scienceReturn,
      storms,
    );
  }

  return {
    success: true,
    scienceReturn,
    deliveredFraction: delivered,
    monthsSurvived: months,
    storms,
  };
}

function sciencePriorityFactor(resolved: ResolvedMission): number {
  const { config, scenario, orbit, parts } = resolved;
  switch (config.sciencePriority) {
    case "revisit":
      return 1 + 0.06 * clamp01(1 - orbit.revisitDays / scenario.maxRevisitDays);
    case "resolution":
      return 1 + 0.06 * clamp01(1 - parts.camera.resolutionM / scenario.minResolutionM);
    case "volume":
      return 1 + 0.06 * clamp01(1 - scenario.minDeliveredFraction);
    default:
      return 1;
  }
}

export function runMonteCarlo(
  ctx: SimulationContext,
  runs = 1000,
  seed = ctx.resolved.config.seed,
): MonteCarloSummary {
  const totalRuns = Math.max(1, Math.floor(runs));
  const science: number[] = [];
  const delivered: number[] = [];
  let successes = 0;
  let monthsTotal = 0;
  const failureCounts = new Map<FailureCause, number>();

  for (let index = 0; index < totalRuns; index += 1) {
    const rng = mulberry32((seed + index * 7919 + 17) >>> 0);
    const result = simulateRun(ctx, rng);
    science.push(result.scienceReturn);
    delivered.push(result.deliveredFraction);
    monthsTotal += result.monthsSurvived;
    if (result.success) {
      successes += 1;
    } else if (result.cause) {
      failureCounts.set(result.cause, (failureCounts.get(result.cause) ?? 0) + 1);
    }
  }

  const failedRuns = totalRuns - successes;
  const failureBreakdown: FailureBucket[] = [...failureCounts.entries()]
    .map(([cause, count]) => ({
      cause,
      label: FAILURE_LABELS[cause],
      count,
      percent: failedRuns > 0 ? Math.round((count / failedRuns) * 1000) / 10 : 0,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return FAILURE_ORDER.indexOf(a.cause) - FAILURE_ORDER.indexOf(b.cause);
    });

  return {
    runs: totalRuns,
    successes,
    successProbability: successes / totalRuns,
    medianScienceReturn: median(science),
    meanScienceReturn: mean(science),
    meanMonthsSurvived: monthsTotal / totalRuns,
    deliveredFraction: mean(delivered),
    failureBreakdown,
    improvements: [],
    seed,
  };
}

interface Candidate {
  kind: Improvement["kind"];
  config: MissionConfig;
  label: string;
  partCategory?: PartCategory;
  fromId: string;
  toId: string;
}

function buildCandidates(ctx: SimulationContext): Candidate[] {
  const { config, difficulty, parts, rocket, orbit, scenario } = ctx.resolved;
  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  const push = (candidate: Candidate) => {
    const key = `${candidate.kind}:${candidate.toId}:${candidate.partCategory ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(candidate);
  };

  for (const category of PRIORITY_CATEGORIES) {
    const current = parts[category];
    const options = partsForCategory(category, difficulty.allowedPartTiers).filter(
      (part) => part.id !== current.id && isUpgrade(category, current, part),
    );
    options
      .sort((a, b) => a.costM - b.costM)
      .slice(0, 2)
      .forEach((part) => {
        push({
          kind: "part",
          partCategory: category,
          fromId: current.id,
          toId: part.id,
          label: `Swap ${current.name} for ${part.name}`,
          config: { ...config, parts: { ...config.parts, [category]: part.id } },
        });
      });
  }

  ROCKETS.filter(
    (candidate) => candidate.id !== rocket.id && candidate.reliability > rocket.reliability,
  )
    .sort((a, b) => a.costM - b.costM)
    .slice(0, 2)
    .forEach((candidate) => {
      push({
        kind: "rocket",
        fromId: rocket.id,
        toId: candidate.id,
        label: `Switch launcher to ${candidate.name}`,
        config: { ...config, rocketId: candidate.id },
      });
    });

  ORBITS.filter(
    (candidate) =>
      candidate.id !== orbit.id &&
      scenario.allowedOrbitTypes.includes(candidate.type) &&
      candidate.revisitDays < orbit.revisitDays,
  )
    .sort((a, b) => a.revisitDays - b.revisitDays)
    .slice(0, 2)
    .forEach((candidate) => {
      push({
        kind: "orbit",
        fromId: orbit.id,
        toId: candidate.id,
        label: `Move to ${candidate.name}`,
        config: { ...config, orbitId: candidate.id },
      });
    });

  return candidates;
}

function isUpgrade(category: PartCategory, current: Part, candidate: Part): boolean {
  switch (category) {
    case "camera": {
      const a = current as Extract<Part, { category: "camera" }>;
      const b = candidate as Extract<Part, { category: "camera" }>;
      return b.science > a.science || b.resolutionM < a.resolutionM;
    }
    case "panel":
      return (
        (candidate as Extract<Part, { category: "panel" }>).peakW >
        (current as Extract<Part, { category: "panel" }>).peakW
      );
    case "battery":
      return (
        (candidate as Extract<Part, { category: "battery" }>).capacityWh >
        (current as Extract<Part, { category: "battery" }>).capacityWh
      );
    case "radio":
      return (
        (candidate as Extract<Part, { category: "radio" }>).downlinkMbps >
        (current as Extract<Part, { category: "radio" }>).downlinkMbps
      );
    case "computer": {
      const a = current as Extract<Part, { category: "computer" }>;
      const b = candidate as Extract<Part, { category: "computer" }>;
      return b.throughputGbPerDay > a.throughputGbPerDay || b.reliability > a.reliability;
    }
  }
}

export function findImprovements(
  ctx: SimulationContext,
  base: MonteCarloSummary,
  runsPerCandidate = 400,
): Improvement[] {
  const baseCost = ctx.rules.metrics.totalCostM;
  const baseSuccess = base.successProbability;
  const candidates = buildCandidates(ctx);
  const evaluated: Improvement[] = [];

  for (const candidate of candidates) {
    const candidateCtx = createSimulationContext(candidate.config, ctx.resolved.weather);
    if (!candidateCtx.rules.pass) continue;

    const candidateSummary = runMonteCarlo(candidateCtx, runsPerCandidate, base.seed);
    const delta = candidateSummary.successProbability - baseSuccess;
    if (delta < 0.005) continue;

    const costM = candidateCtx.rules.metrics.totalCostM;
    const costDelta = costM - baseCost;
    evaluated.push({
      id: `imp-${candidate.kind}-${candidate.toId}${candidate.partCategory ? `-${candidate.partCategory}` : ""}`,
      kind: candidate.kind,
      partCategory: candidate.partCategory,
      fromId: candidate.fromId,
      toId: candidate.toId,
      label: candidate.label,
      description: `${candidate.label}: estimated success rises from ${(baseSuccess * 100).toFixed(
        0,
      )}% to ${(candidateSummary.successProbability * 100).toFixed(0)}% (${delta >= 0 ? "+" : ""}${(
        delta * 100
      ).toFixed(1)} pts) at ${costDelta >= 0 ? "+" : ""}$${costDelta.toFixed(1)}M.`,
      successProbability: candidateSummary.successProbability,
      delta,
      medianScienceReturn: candidateSummary.medianScienceReturn,
      costM,
      feasible: true,
    });
  }

  evaluated.sort((a, b) => {
    if (Math.abs(b.delta - a.delta) > 0.001) return b.delta - a.delta;
    return a.costM - b.costM;
  });

  const unique: Improvement[] = [];
  const usedKeys = new Set<string>();
  for (const improvement of evaluated) {
    const key = improvement.partCategory ?? improvement.kind;
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);
    unique.push(improvement);
    if (unique.length >= 3) break;
  }

  return unique;
}

export function runMonteCarloSimulation(
  config: MissionConfig,
  weather: SpaceWeather,
  runs = 1000,
  seed = config.seed,
  includeImprovements = true,
): MonteCarloSummary {
  const ctx = createSimulationContext(config, weather);
  const summary = runMonteCarlo(ctx, runs, seed);
  if (includeImprovements) {
    const improvementRuns = Math.min(400, Math.max(200, Math.floor(runs / 2)));
    summary.improvements = findImprovements(ctx, summary, improvementRuns);
  }
  return summary;
}

export function resumeParts(config: MissionConfig) {
  return getMissionParts(config);
}

