import { describe, expect, it } from "vitest";
import {
  createDefaultMission,
  getMissionParts,
  getPart,
  getScenario,
  resolveMission,
  sanitizeMission,
  WEATHER_SNAPSHOT,
} from "@/engine/data";
import { evaluateMission, orbitPeriodMinutes, tightConstraints } from "@/engine/rules";
import { runMonteCarloSimulation } from "@/engine/simulate";
import { gradeForScore, scoreMission, teamCoordination } from "@/engine/score";
import { buildFacts } from "@/engine/facts";
import { buildFallbackReport } from "@/ai/fallback";
import { decodeMission, encodeMission } from "@/lib/share";

const base = createDefaultMission("flood-watch", "engineer");

describe("mission rules", () => {
  it("keeps the baseline flood design launchable with warnings", () => {
    const resolved = resolveMission(base, WEATHER_SNAPSHOT);
    const rules = evaluateMission(resolved);
    expect(rules.pass).toBe(true);
    expect(rules.blockingFailures).toHaveLength(0);
    expect(rules.warnings.length).toBeGreaterThan(0);
    expect(rules.metrics.totalMassKg).toBeLessThanOrEqual(rules.metrics.capacityKg);
  });

  it("computes orbital period from altitude", () => {
    expect(orbitPeriodMinutes(550)).toBeGreaterThan(90);
    expect(orbitPeriodMinutes(550)).toBeLessThan(100);
  });

  it("blocks an unaffordable launcher", () => {
    const config = sanitizeMission({
      ...base,
      rocketId: "ariane-62",
      parts: { ...base.parts, panel: "panel-420", battery: "bat-1200" },
    });
    const rules = evaluateMission(resolveMission(config, WEATHER_SNAPSHOT));
    expect(rules.pass).toBe(false);
    expect(rules.blockingFailures.some((failure) => failure.id === "budget")).toBe(true);
  });

  it("blocks a resolution miss", () => {
    const config = sanitizeMission({ ...base, parts: { ...base.parts, camera: "cam-basic-60" } });
    const rules = evaluateMission(resolveMission(config, WEATHER_SNAPSHOT));
    expect(rules.blockingFailures.some((failure) => failure.id === "resolution")).toBe(true);
  });

  it("sanitizes cadet hardware to basic tiers", () => {
    const config = sanitizeMission({ ...base, difficulty: "cadet" });
    const parts = getMissionParts(config);
    for (const part of Object.values(parts)) {
      expect(part.tier).toBe("basic");
    }
  });

  it("returns tight constraints sorted by headroom", () => {
    const rules = evaluateMission(resolveMission(base, WEATHER_SNAPSHOT));
    const tight = tightConstraints(rules, 3);
    expect(tight.length).toBeGreaterThan(0);
    for (let index = 1; index < tight.length; index += 1) {
      expect(tight[index - 1].headroom).toBeLessThanOrEqual(tight[index].headroom);
    }
  });
});

describe("Monte Carlo", () => {
  it("is deterministic for a fixed seed", () => {
    const first = runMonteCarloSimulation(base, WEATHER_SNAPSHOT, 300, 1337, false);
    const second = runMonteCarloSimulation(base, WEATHER_SNAPSHOT, 300, 1337, false);
    expect(first.successes).toBe(second.successes);
    expect(first.successProbability).toBe(second.successProbability);
    expect(first.meanScienceReturn).toBe(second.meanScienceReturn);
    expect(first.failureBreakdown).toEqual(second.failureBreakdown);
  });

  it("produces a plausible baseline success rate and complete buckets", () => {
    const summary = runMonteCarloSimulation(base, WEATHER_SNAPSHOT, 600, 7, false);
    expect(summary.runs).toBe(600);
    expect(summary.successProbability).toBeGreaterThan(0.45);
    expect(summary.successProbability).toBeLessThan(0.98);
    expect(summary.successes + summary.failureBreakdown.reduce((total, bucket) => total + bucket.count, 0)).toBe(600);
    expect(summary.failureBreakdown.every((bucket) => bucket.percent >= 0)).toBe(true);
  });

  it("tests engine-verified improvements", () => {
    const summary = runMonteCarloSimulation(base, WEATHER_SNAPSHOT, 400, 1337, true);
    expect(summary.improvements.length).toBeGreaterThan(0);
    for (const improvement of summary.improvements) {
      expect(improvement.feasible).toBe(true);
      expect(Number.isFinite(improvement.delta)).toBe(true);
      expect(improvement.delta).toBeGreaterThan(0);
      const target =
        improvement.partCategory && improvement.toId
          ? getPart(improvement.toId)
          : null;
      if (target) expect(target.category).toBe(improvement.partCategory);
    }
  });
});

describe("scoring, facts, and reports", () => {
  it("maps score boundaries to grades", () => {
    expect(gradeForScore(95)).toBe("A+");
    expect(gradeForScore(85)).toBe("A");
    expect(gradeForScore(78)).toBe("B+");
    expect(gradeForScore(70)).toBe("B");
    expect(gradeForScore(62)).toBe("C+");
    expect(gradeForScore(54)).toBe("C");
    expect(gradeForScore(45)).toBe("D");
    expect(gradeForScore(20)).toBe("F");
  });

  it("penalizes overspent team budgets", () => {
    const resolved = resolveMission(base, WEATHER_SNAPSHOT);
    const rules = evaluateMission(resolved);
    const withTightCaps = {
      ...rules,
      budgetLines: rules.budgetLines.map((line) => ({ ...line, status: "fail" as const })),
    };
    expect(teamCoordination({ ...base, teamMode: true }, withTightCaps)).toBeLessThan(0.5);
    expect(teamCoordination(base, rules)).toBe(1);
  });

  it("builds facts and a template report from one deterministic run", () => {
    const resolved = resolveMission(base, WEATHER_SNAPSHOT);
    const rules = evaluateMission(resolved);
    const summary = runMonteCarloSimulation(base, WEATHER_SNAPSHOT, 300, 1337, false);
    const score = scoreMission(resolved, rules, summary, 1);
    const facts = buildFacts(resolved, rules, summary, score);
    expect(facts.scenario.name).toBe("Nigeria Flood Watch");
    expect(facts.design.parts).toHaveLength(5);
    expect(facts.results.successProbability).toBe(summary.successProbability);
    expect(facts.referenceMission?.name).toBe("SMAP");

    const cadet = buildFallbackReport(facts, "cadet");
    const engineer = buildFallbackReport(facts, "engineer");
    expect(cadet.sections).toHaveLength(7);
    expect(engineer.sections).toHaveLength(7);
    expect(cadet.source).toBe("template");
    expect(cadet.headline).toContain("grade");
  });

  it("round-trips designs through share links", () => {
    const encoded = encodeMission(base);
    const decoded = decodeMission(encoded);
    expect(decoded?.orbitId).toBe(base.orbitId);
    expect(decoded?.parts.camera).toBe(base.parts.camera);
    expect(decodeMission("not-a-design")).toBeNull();
  });

  it("uses scenario budgets", () => {
    const storm = createDefaultMission("storm-watch", "engineer");
    expect(getScenario(storm.scenarioId).budgetM).toBe(45);
    const resolved = resolveMission(storm, WEATHER_SNAPSHOT);
    expect(evaluateMission(resolved).metrics.budgetM).toBeGreaterThan(0);
  });
});
