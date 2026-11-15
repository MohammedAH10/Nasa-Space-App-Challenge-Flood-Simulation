import {
  ADAPTER_MASS_FRACTION,
  BUS_MASS_KG,
  BUS_POWER_W,
  ECLIPSE_ENERGY_MARGIN,
  EARTH_RADIUS_KM,
  INTEGRATION_COST_FRACTION,
  MU_KM3_S2,
} from "./constants";
import { effectiveBudget } from "./data";
import type {
  BudgetLine,
  MissionMetrics,
  ResolvedMission,
  RuleId,
  RuleReport,
  RuleResult,
  RuleStatus,
} from "./types";

export function orbitPeriodMinutes(altitudeKm: number): number {
  const semiMajorAxis = EARTH_RADIUS_KM + altitudeKm;
  const seconds = 2 * Math.PI * Math.sqrt((semiMajorAxis ** 3) / MU_KM3_S2);
  return seconds / 60;
}

export function downlinkCapacityGbPerDay(
  passesPerDay: number,
  passMinutes: number,
  downlinkMbps: number,
): number {
  return (passesPerDay * passMinutes * 60 * downlinkMbps) / 8 / 1000;
}

function statusForUsage(ratio: number, warnAt = 0.9): RuleStatus {
  if (!Number.isFinite(ratio)) return "fail";
  if (ratio > 1) return "fail";
  if (ratio >= warnAt) return "warn";
  return "ok";
}

function statusForRequirement(ratio: number, warnAt = 1.15): RuleStatus {
  if (!Number.isFinite(ratio)) return "fail";
  if (ratio < 1) return "fail";
  if (ratio < warnAt) return "warn";
  return "ok";
}

function fmt(value: number, digits = 1): string {
  return value.toFixed(digits);
}

export function evaluateMission(resolved: ResolvedMission): RuleReport {
  const { config, scenario, orbit, rocket, difficulty, parts } = resolved;
  const lifetimeYears = scenario.lifetimeMonths / 12;
  const budgetM = effectiveBudget(scenario, difficulty);

  const partList = [parts.camera, parts.panel, parts.battery, parts.radio, parts.computer];
  const partMassKg = partList.reduce((total, part) => total + part.massKg, 0);
  const adapterMassKg = partMassKg * ADAPTER_MASS_FRACTION;
  const totalMassKg = partMassKg + BUS_MASS_KG + adapterMassKg;
  const capacityKg = rocket.capacityKg[orbit.type] ?? 0;

  const loadW =
    parts.camera.powerW + parts.radio.powerW + parts.computer.powerW + BUS_POWER_W;
  const eolFactor = Math.max(0.7, 1 - parts.panel.degradationPerYear * lifetimeYears);
  const generationW = parts.panel.peakW * (1 - orbit.eclipseFraction) * eolFactor;

  const orbitPeriod = orbitPeriodMinutes(orbit.altitudeKm);
  const eclipseHours = (orbitPeriod / 60) * orbit.eclipseFraction;
  const batteryNeedWh = loadW * eclipseHours * ECLIPSE_ENERGY_MARGIN;
  const batteryUsableWh = parts.battery.capacityWh * parts.battery.usableFraction;

  const dataProducedGb = Math.min(
    parts.camera.dataGbPerDay,
    parts.computer.throughputGbPerDay,
  );
  const dataCapacityGb = downlinkCapacityGbPerDay(
    orbit.passesPerDay,
    orbit.passMinutes,
    parts.radio.downlinkMbps,
  );

  const partsCostM =
    parts.camera.costM +
    parts.panel.costM +
    parts.battery.costM +
    parts.radio.costM +
    parts.computer.costM;
  const integrationCostM = partsCostM * INTEGRATION_COST_FRACTION;
  const launchCostM = rocket.costM;
  const totalCostM = partsCostM + integrationCostM + launchCostM;

  const massRatio = capacityKg > 0 ? totalMassKg / capacityKg : Infinity;
  const budgetRatio = totalCostM / budgetM;
  const powerRatio = generationW / loadW;
  const batteryRatio = batteryUsableWh / batteryNeedWh;
  const dataRatio = dataCapacityGb / Math.max(0.001, dataProducedGb);
  const dataRequirementRatio = dataRatio / scenario.minDeliveredFraction;
  const revisitRatio = orbit.revisitDays / scenario.maxRevisitDays;
  const resolutionRatio = parts.camera.resolutionM / scenario.minResolutionM;

  const orbitAllowed =
    scenario.allowedOrbitTypes.includes(orbit.type) && capacityKg > 0;

  const results: RuleResult[] = [
    {
      id: "orbit",
      label: "Orbit & launcher",
      status: orbitAllowed ? "ok" : "fail",
      blocking: true,
      headroom: orbitAllowed ? 1 : -1,
      value: orbitAllowed ? 1 : 0,
      limit: 1,
      unit: "",
      message: orbitAllowed
        ? `${orbit.name} is reachable with ${rocket.name}.`
        : `${orbit.name} is not compatible with this mission or launcher.`,
      why: "The scenario only accepts orbits that can meet its revisit target, and the rocket must be able to reach that orbit.",
      target: "orbit",
    },
    {
      id: "mass",
      label: "Mass",
      status: statusForUsage(massRatio),
      blocking: true,
      headroom: capacityKg > 0 ? 1 - massRatio : -1,
      value: totalMassKg,
      limit: capacityKg,
      unit: "kg",
      message:
        capacityKg > 0
          ? `${fmt(totalMassKg)} kg of ${fmt(capacityKg, 0)} kg capacity.`
          : `${rocket.name} cannot reach ${orbit.type}.`,
      why: "Launcher capacity depends on the target orbit. Geostationary orbit costs far more capacity than low Earth orbit.",
      target: "rocket",
    },
    {
      id: "budget",
      label: "Budget",
      status: statusForUsage(budgetRatio),
      blocking: true,
      headroom: 1 - budgetRatio,
      value: totalCostM,
      limit: budgetM,
      unit: "$M",
      message: `$${fmt(totalCostM)}M of $${fmt(budgetM)}M committed.`,
      why: "Parts, integration, and launch all share one budget. Every upgrade trades against another subsystem.",
      target: "budget",
    },
    {
      id: "power",
      label: "Power",
      status: statusForRequirement(powerRatio),
      blocking: true,
      headroom: powerRatio - 1,
      value: generationW,
      limit: loadW,
      unit: "W",
      message: `${fmt(generationW, 0)} W average generation for ${fmt(loadW, 0)} W of load.`,
      why: "Solar panels only generate in sunlight. Tight power margins fail during storms or as panels age.",
      target: "panel",
    },
    {
      id: "battery",
      label: "Eclipse battery",
      status: statusForRequirement(batteryRatio, 1.25),
      blocking: true,
      headroom: batteryRatio - 1,
      value: batteryUsableWh,
      limit: batteryNeedWh,
      unit: "Wh",
      message: `${fmt(batteryUsableWh, 0)} Wh usable for ${fmt(batteryNeedWh, 0)} Wh needed during eclipse.`,
      why: "The battery carries the spacecraft through eclipse. Bigger loads or longer eclipses need more capacity.",
      target: "battery",
    },
    {
      id: "data",
      label: "Data downlink",
      status:
        dataRatio < scenario.minDeliveredFraction
          ? "fail"
          : dataRatio < 1.15
            ? "warn"
            : "ok",
      blocking: false,
      headroom: dataRequirementRatio - 1,
      value: dataCapacityGb,
      limit: dataProducedGb,
      unit: "GB/day",
      message: `${fmt(dataCapacityGb)} GB/day downlink for ${fmt(dataProducedGb)} GB/day of imagery.`,
      why: "A bigger camera produces more data; more passes or a faster radio move it to the ground.",
      target: "radio",
    },
    {
      id: "revisit",
      label: "Revisit",
      status: revisitRatio > 1 ? "fail" : revisitRatio > 0.85 ? "warn" : "ok",
      blocking: true,
      headroom: 1 - revisitRatio,
      value: orbit.revisitDays,
      limit: scenario.maxRevisitDays,
      unit: "days",
      message: `${fmt(orbit.revisitDays, 2)} day revisit vs ${fmt(scenario.maxRevisitDays, 2)} day requirement.`,
      why: "Revisit time is set by the orbit. The scenario needs a fresh look within its deadline.",
      target: "orbit",
    },
    {
      id: "resolution",
      label: "Resolution",
      status:
        resolutionRatio > 1 ? "fail" : resolutionRatio > 0.85 ? "warn" : "ok",
      blocking: true,
      headroom: 1 - resolutionRatio,
      value: parts.camera.resolutionM,
      limit: scenario.minResolutionM,
      unit: "m",
      message: `${fmt(parts.camera.resolutionM, 0)} m ground resolution vs ${fmt(scenario.minResolutionM, 0)} m requirement.`,
      why: "Resolution is set by the instrument. Flood responders need enough detail to map built-up areas.",
      target: "camera",
    },
  ];

  const blockingFailures = results.filter(
    (result) => result.blocking && result.status === "fail",
  );
  const warnings = results.filter((result) => result.status === "warn");

  const engineerSpend =
    parts.panel.costM +
    parts.battery.costM +
    parts.radio.costM +
    parts.computer.costM +
    integrationCostM;

  const budgetLines: BudgetLine[] = [
    budgetLine("planner", "Planner", rocket.costM, config.budgets.planner),
    budgetLine("engineer", "Engineer", engineerSpend, config.budgets.engineer),
    budgetLine("scientist", "Scientist", parts.camera.costM, config.budgets.scientist),
  ];

  const metrics: MissionMetrics = {
    partMassKg,
    adapterMassKg,
    totalMassKg,
    capacityKg,
    loadW,
    generationW,
    batteryNeedWh,
    batteryUsableWh,
    dataProducedGb,
    dataCapacityGb,
    bufferGb: parts.computer.bufferGb,
    partsCostM,
    integrationCostM,
    launchCostM,
    totalCostM,
    budgetM,
    orbitPeriodMinutes: orbitPeriod,
    eclipseHours,
    revisitDays: orbit.revisitDays,
    passesPerDay: orbit.passesPerDay,
    passMinutes: orbit.passMinutes,
    downlinkMbps: parts.radio.downlinkMbps,
  };

  return {
    results,
    blockingFailures,
    warnings,
    pass: blockingFailures.length === 0,
    metrics,
    budgetLines,
  };
}

function budgetLine(
  role: BudgetLine["role"],
  label: string,
  spent: number,
  cap: number,
): BudgetLine {
  const ratio = cap > 0 ? spent / cap : spent > 0 ? Infinity : 0;
  return {
    role,
    label,
    spent,
    cap,
    status: ratio > 1 ? "fail" : ratio > 0.95 ? "warn" : "ok",
  };
}

export function ruleById(report: RuleReport, id: RuleId): RuleResult | undefined {
  return report.results.find((result) => result.id === id);
}

export function tightConstraints(report: RuleReport, limit = 3): RuleResult[] {
  return [...report.results]
    .filter((result) => result.status !== "ok" || result.headroom < 0.25)
    .sort((a, b) => a.headroom - b.headroom)
    .slice(0, limit);
}
