import { describe, expect, it } from "vitest";
import { MISSION } from "./constants";
import {
  createFlightRuntime,
  finalizeMission,
  stepFlight,
} from "./flight";
import { defaultBuild, emptyParts, recommendedBuild } from "./parts";
import { computeStats, stageDeltaV } from "./physics";
import type {
  BuildEvaluation,
  FlightInput,
  FlightRuntime,
  RocketBuild,
} from "./types";
import { evaluateBuild } from "./validation";

function withParts(
  base: RocketBuild,
  parts: Partial<RocketBuild["parts"]>,
): RocketBuild {
  return { ...base, parts: { ...base.parts, ...parts } };
}

function fly(
  evaluation: BuildEvaluation,
  controller: (runtime: FlightRuntime) => FlightInput,
): { runtime: FlightRuntime; result: ReturnType<typeof finalizeMission> } {
  const runtime = createFlightRuntime(evaluation);
  let guard = 0;
  while (!runtime.done && guard < 2000) {
    stepFlight(runtime, evaluation, 0.1, controller(runtime));
    guard += 1;
  }
  expect(guard).toBeLessThan(2000);
  return { runtime, result: finalizeMission(evaluation, runtime) };
}

const perfectPilot = (runtime: FlightRuntime): FlightInput => ({
  steer: runtime.steerTarget,
  stagePressed: runtime.stageWindow,
});

const wobblyPilot = (runtime: FlightRuntime): FlightInput => ({
  steer: runtime.steerTarget >= 0 ? -1 : 1,
  stagePressed: runtime.stageWindow,
});

describe("rocket stats and validation", () => {
  it("counts a default rocket as launchable but not fully ready", () => {
    const evaluation = evaluateBuild(defaultBuild());
    expect(evaluation.missing).toEqual([]);
    expect(evaluation.canLaunch).toBe(true);
    expect(evaluation.ready).toBe(false);
    expect(evaluation.stats.hasLegs).toBe(false);
    expect(evaluation.checks.find((item) => item.id === "landing")?.status).toBe(
      "warn",
    );
  });

  it("blocks an empty rocket and reports every essential slot", () => {
    const evaluation = evaluateBuild({
      name: "Bare frame",
      parts: emptyParts(),
    });
    expect(evaluation.canLaunch).toBe(false);
    expect(evaluation.rating).toBe("blocked");
    expect(evaluation.missing).toEqual([
      "nose",
      "capsule",
      "fuel",
      "engine",
    ]);
  });

  it("marks Nova's blueprint ready for the Moon", () => {
    const evaluation = evaluateBuild(recommendedBuild());
    expect(evaluation.canLaunch).toBe(true);
    expect(evaluation.ready).toBe(true);
    expect(evaluation.rating).toBe("ready");
    expect(evaluation.stats.hasBoosters).toBe(true);
    expect(evaluation.stats.hasLegs).toBe(true);
    expect(evaluation.stats.netDeltaVMS).toBeGreaterThanOrEqual(
      MISSION.requiredDeltaVMS,
    );
  });

  it("increases range when a bigger tank is fitted", () => {
    const small = computeStats(defaultBuild());
    const large = computeStats(
      withParts(defaultBuild(), { fuel: "fuel-mega" }),
    );
    expect(large.fuelMassKg).toBeGreaterThan(small.fuelMassKg);
    expect(large.wetMassKg).toBeGreaterThan(small.wetMassKg);
    expect(large.netDeltaVMS).toBeGreaterThan(small.netDeltaVMS);
  });

  it("computes the ideal delta-v from the rocket equation", () => {
    expect(stageDeltaV(300, 1000, 500)).toBeCloseTo(
      300 * 9.80665 * Math.log(2),
      3,
    );
    expect(stageDeltaV(300, 1000, 1000)).toBe(0);
  });

  it("turns missing landing legs into a warning while keeping launch cleared", () => {
    const evaluation = evaluateBuild(
      withParts(recommendedBuild(), { legs: null }),
    );
    expect(evaluation.canLaunch).toBe(true);
    expect(evaluation.ready).toBe(false);
    expect(evaluation.checks.find((item) => item.id === "landing")?.status).toBe(
      "warn",
    );
  });
});

describe("flight timeline", () => {
  it("starts on the pad in countdown", () => {
    const evaluation = evaluateBuild(recommendedBuild());
    const runtime = createFlightRuntime(evaluation);
    expect(runtime.phase).toBe("countdown");
    expect(runtime.progress).toBe(0);
    expect(runtime.done).toBe(false);
    expect(runtime.altitudeKm).toBe(0);
  });

  it("lands successfully with a complete rocket and a perfect flight", () => {
    const evaluation = evaluateBuild(recommendedBuild());
    const { runtime, result } = fly(evaluation, perfectPilot);

    expect(runtime.done).toBe(true);
    expect(runtime.success).toBe(true);
    expect(result.success).toBe(true);
    expect(result.failureReason).toBeNull();
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(["S", "A", "B", "C", "D"]).toContain(result.grade);
    expect(result.stars).toBeGreaterThanOrEqual(0);
    expect(result.stars).toBeLessThanOrEqual(3);
    expect(result.effectiveDeltaVMS).toBeGreaterThanOrEqual(
      MISSION.requiredDeltaVMS,
    );
  });

  it("is deterministic for identical inputs", () => {
    const evaluation = evaluateBuild(recommendedBuild());
    const first = fly(evaluation, perfectPilot).result;
    const second = fly(evaluation, perfectPilot).result;
    expect(first.score).toBe(second.score);
    expect(first.steerError).toBe(second.steerError);
    expect(first.stageQuality).toBe(second.stageQuality);
  });

  it("fails the landing when the rocket has no legs", () => {
    const evaluation = evaluateBuild(
      withParts(recommendedBuild(), { legs: null }),
    );
    const { result } = fly(evaluation, perfectPilot);
    expect(result.success).toBe(false);
    expect(result.failureReason).toBe("legs");
  });

  it("fails the course when the pilot fights the steering marker", () => {
    const evaluation = evaluateBuild(recommendedBuild());
    const { runtime, result } = fly(evaluation, wobblyPilot);
    expect(runtime.steerError).toBeGreaterThan(MISSION.maxSteerError);
    expect(result.success).toBe(false);
    expect(result.failureReason).toBe("course");
  });

  it("runs out of fuel with a rocket that cannot reach the Moon", () => {
    const evaluation = evaluateBuild(
      withParts(defaultBuild(), { legs: "legs-tripod" }),
    );
    const { result } = fly(evaluation, perfectPilot);
    expect(result.success).toBe(false);
    expect(result.failureReason).toBe("fuel");
  });
});
