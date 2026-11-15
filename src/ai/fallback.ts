import type { Facts, ReportDocument, ReportSection } from "@/engine/types";
import type { ReadingLevel } from "./prompt";

function pct(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

function money(value: number): string {
  return `$${value.toFixed(1)}M`;
}

function failureList(facts: Facts): string {
  if (facts.results.topFailures.length === 0) {
    return "No failures appeared in this simulation sample. That does not mean the design is risk-free, only that the sampled failure modes did not trigger.";
  }
  return facts.results.topFailures
    .map((failure) => `${failure.label} (${failure.percent.toFixed(0)}% of failures)`)
    .join("; ") + ".";
}

function tightList(facts: Facts): string {
  if (facts.results.tightConstraints.length === 0) {
    return "No resource is close to its limit. The design has healthy margins everywhere.";
  }
  return facts.results.tightConstraints
    .map((constraint) => {
      const status = constraint.status === "fail" ? "over the limit" : "close to the limit";
      return `${constraint.label} is ${status}: ${constraint.message}`;
    })
    .join(" ");
}

function improvementList(facts: Facts, level: ReadingLevel): string {
  if (facts.improvements.length === 0) {
    return level === "cadet"
      ? "The engine could not find one affordable swap that clearly makes the mission safer. Try freeing budget by changing the rocket or another part, then run the simulation again."
      : "The engine did not find an affordable single-part or launcher change that raises success by more than half a point. Rebalance role budgets or change the orbit before trying another swap.";
  }
  const intro =
    level === "cadet"
      ? "The engine tested these changes by rerunning the simulation:"
      : "Engine-tested changes, each rerun through the Monte Carlo model:";
  const body = facts.improvements.map((improvement) => improvement.description).join(" ");
  return `${intro} ${body}`;
}

function referenceSection(facts: Facts, level: ReadingLevel): string {
  const mission = facts.referenceMission;
  if (!mission) {
    return "No real-mission reference is attached to this scenario.";
  }
  const core = `${mission.name} (${mission.agency}, launched ${mission.launched}) is a real reference mission. ${mission.note}`;
  const numbers =
    level === "cadet"
      ? `For scale, it launched with a mass of about ${mission.massKg.toLocaleString()} kg, used about ${mission.powerW.toLocaleString()} W of power, and flew at ${mission.altitudeKm.toLocaleString()} km.`
      : `Reference figures: ${mission.massKg.toLocaleString()} kg launch mass, ${mission.powerW.toLocaleString()} W, ${mission.orbitType} at ${mission.altitudeKm.toLocaleString()} km, ${mission.designLifeYears}-year design life, about ${mission.revisitDays}-day revisit.`;
  return `${core} ${numbers} Source: ${mission.source} (${mission.url})`;
}

export function buildFallbackReport(
  facts: Facts,
  level: ReadingLevel = "engineer",
): ReportDocument {
  const success = pct(facts.results.successProbability);
  const science = pct(facts.results.medianScienceReturn);
  const delivered = pct(facts.results.deliveredFraction);
  const months = facts.results.meanMonthsSurvived.toFixed(1);

  const snapshot =
    level === "cadet"
      ? `Your satellite uses a ${facts.design.parts[0]?.name ?? "camera"} camera. It flies on a ${facts.design.orbit} orbit and launches on a ${facts.design.rocket}. It costs ${money(
          facts.design.totalCostM,
        )} out of ${money(facts.scenario.budgetM)} and weighs ${facts.design.totalMassKg.toFixed(
          0,
        )} kg. The rocket can lift ${facts.design.capacityKg.toFixed(0)} kg to this orbit.`
      : `Design: ${facts.design.parts.map((part) => part.name).join(", ")}. Orbit: ${
          facts.design.orbit
        } (${facts.design.orbitType}, ${facts.design.altitudeKm.toLocaleString()} km). Launcher: ${
          facts.design.rocket
        }. Cost ${money(facts.design.totalCostM)} of ${money(
          facts.scenario.budgetM,
        )}; launch mass ${facts.design.totalMassKg.toFixed(1)} kg against ${facts.design.capacityKg.toFixed(
          0,
        )} kg capacity.`;

  const outcome =
    level === "cadet"
      ? `The simulation ran the mission many times. About ${success} of those runs reached the end and met the science goal. The middle science score was ${science} of 100. On average, ${delivered} of images reached the ground and the mission lasted ${months} of ${facts.scenario.lifetimeMonths} months.`
      : `Across repeated runs, success probability is ${success}. Median science return is ${science} of 100 and mean delivered imagery is ${delivered}. Mean survival is ${months} of ${facts.scenario.lifetimeMonths} months. The scenario requires ${pct(
          facts.scenario.requiredDeliveredFraction,
          0,
        )} delivery.`;

  const weather = `Space weather snapshot: Kp ${facts.weather.kpIndex}, storm probability ${pct(
    facts.weather.stormProbability,
    0,
  )}${facts.weather.stale ? " (static fallback)" : ""}.`;

  const sections: ReportSection[] = [
    { heading: "Mission snapshot", body: snapshot },
    { heading: "What the simulation found", body: outcome },
    {
      heading: "Why missions fail",
      body: `${failureList(facts)} ${weather}`,
    },
    { heading: "What is tight", body: tightList(facts) },
    { heading: "Best next change", body: improvementList(facts, level) },
    { heading: "Real mission check", body: referenceSection(facts, level) },
    { heading: "Bottom line", body: facts.verdict },
  ];

  return {
    headline: `${facts.scenario.name}: ${success} simulated mission success, grade ${facts.score.grade}`,
    sections,
    source: "template",
    level,
  };
}
