import {
  FLIGHT_PHASES,
  FLIGHT_TOTAL_SECONDS,
  MISSION,
  PHASE_DURATION,
  STAGE_WINDOW,
} from "./constants";
import type {
  BuildEvaluation,
  FlightInput,
  FlightPhase,
  FlightRuntime,
  MissionResult,
} from "./types";

const PHASE_ORDER: Exclude<FlightPhase, "done">[] = [
  "countdown",
  "liftoff",
  "ascent",
  "staging",
  "coast",
  "arrival",
  "landing",
];

const FUEL_RATE: Record<Exclude<FlightPhase, "done">, number> = {
  countdown: 0,
  liftoff: 0.012,
  ascent: 0.055,
  staging: 0,
  coast: 0.03,
  arrival: 0.02,
  landing: 0.015,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function ease(t: number): number {
  return t * t * (3 - 2 * t);
}

export function createFlightRuntime(evaluation: BuildEvaluation): FlightRuntime {
  const hasBoosters = evaluation.stats.hasBoosters;
  return {
    phase: "countdown",
    elapsed: 0,
    phaseElapsed: 0,
    progress: 0,
    altitudeKm: 0,
    speedKms: 0,
    fuelFraction: 1,
    throttle: 0,
    steer: 0,
    steerTarget: 0,
    steerError: 0,
    staged: !hasBoosters,
    stageQuality: hasBoosters ? 0 : 0.75,
    stageWindow: false,
    message: "Mission control is ready. Hold tight for the countdown.",
    done: false,
    success: false,
    failureReason: null,
    touchdownSpeedKms: 0,
  };
}

function updateFuel(
  runtime: FlightRuntime,
  phase: Exclude<FlightPhase, "done">,
  step: number,
): void {
  runtime.fuelFraction = clamp(
    runtime.fuelFraction - FUEL_RATE[phase] * step,
    0.02,
    1,
  );
}

function updateTelemetry(runtime: FlightRuntime, evaluation: BuildEvaluation): void {
  const phase = runtime.phase;
  if (phase === "done") return;
  const duration = PHASE_DURATION[phase];
  const raw = clamp(runtime.phaseElapsed / duration, 0, 1);
  const p = ease(raw);

  runtime.steerTarget =
    phase === "ascent" ? Math.sin(runtime.elapsed * 1.15) * 0.55 : 0;
  runtime.stageWindow =
    phase === "ascent" &&
    evaluation.stats.hasBoosters &&
    !runtime.staged &&
    raw >= STAGE_WINDOW.start &&
    raw <= STAGE_WINDOW.end;

  switch (phase) {
    case "countdown":
      runtime.altitudeKm = 0;
      runtime.speedKms = 0;
      runtime.throttle = 0;
      runtime.message =
        raw >= 0.7
          ? "T-minus 1. Hold on tight!"
          : "Mission control is ready. Hold tight for the countdown.";
      break;
    case "liftoff":
      runtime.altitudeKm = lerp(0, 3, p);
      runtime.speedKms = lerp(0, 0.3, p);
      runtime.throttle = 1;
      runtime.message = "Liftoff! The launch tower is clear.";
      break;
    case "ascent":
      runtime.altitudeKm = lerp(3, 12000, p);
      runtime.speedKms = lerp(0.3, 10.8, p);
      runtime.throttle = 0.92;
      runtime.message = runtime.stageWindow
        ? "Staging window open. Tap STAGE now!"
        : runtime.staged
          ? "Boosters away. Follow the steering marker."
          : "Climb! Follow the steering marker.";
      break;
    case "staging":
      runtime.altitudeKm = lerp(12000, 14000, p);
      runtime.speedKms = lerp(10.8, 10.9, p);
      runtime.throttle = 0.05;
      runtime.message = evaluation.stats.hasBoosters
        ? "Boosters away. Main engine is burning."
        : "All systems steady. Next stop: the Moon.";
      break;
    case "coast":
      runtime.altitudeKm = lerp(14000, 378000, p);
      runtime.speedKms = lerp(10.9, 1.6, p);
      runtime.throttle = 0;
      runtime.message = "Coasting through space. Earth is behind you.";
      break;
    case "arrival":
      runtime.altitudeKm = lerp(378000, MISSION.moonDistanceKm, p);
      runtime.speedKms = lerp(1.6, 0.4, p);
      runtime.throttle = 0.15;
      runtime.message = "The Moon is getting close. Prepare for touchdown.";
      break;
    case "landing":
      runtime.altitudeKm = MISSION.moonDistanceKm;
      runtime.speedKms = lerp(0.4, 0, p);
      runtime.throttle = 0.1;
      runtime.message = evaluation.stats.hasLegs
        ? "Landing legs out. Easy does it."
        : "Uh oh. This rocket has no landing legs.";
      break;
  }
}

function finishRuntime(
  runtime: FlightRuntime,
  evaluation: BuildEvaluation,
): void {
  const bonus =
    (1 - runtime.steerError) * 320 +
    runtime.stageQuality * 180 +
    evaluation.stats.landingBonus * 200;
  const effective = evaluation.stats.netDeltaVMS + bonus;
  runtime.phase = "done";
  runtime.progress = 1;
  runtime.elapsed = FLIGHT_TOTAL_SECONDS;
  runtime.throttle = 0;
  runtime.speedKms = 0;
  runtime.stageWindow = false;
  runtime.done = true;

  if (effective < MISSION.requiredDeltaVMS) {
    runtime.success = false;
    runtime.failureReason = "fuel";
    runtime.touchdownSpeedKms = 0;
    runtime.message = "Out of fuel. The Moon is still far away.";
    return;
  }

  if (!evaluation.stats.hasLegs) {
    runtime.success = false;
    runtime.failureReason = "legs";
    runtime.touchdownSpeedKms = 0.032;
    runtime.message = "No landing legs. Bounce!";
    return;
  }

  if (runtime.steerError > MISSION.maxSteerError) {
    runtime.success = false;
    runtime.failureReason = "course";
    runtime.touchdownSpeedKms = 0.018;
    runtime.message = "Off course. The crew missed the landing zone.";
    return;
  }

  if (evaluation.stats.twr < MISSION.minLiftoffTwr) {
    runtime.success = false;
    runtime.failureReason = "liftoff";
    runtime.touchdownSpeedKms = 0;
    runtime.message = "The rocket never left the pad.";
    return;
  }

  runtime.success = true;
  runtime.failureReason = null;
  runtime.touchdownSpeedKms = 0.002 + evaluation.stats.landingBonus * 0.01;
  runtime.message = "Touchdown! Welcome to the Moon.";
}

function advancePhase(
  runtime: FlightRuntime,
  evaluation: BuildEvaluation,
): void {
  const index = PHASE_ORDER.indexOf(
    runtime.phase as Exclude<FlightPhase, "done">,
  );
  if (index < 0 || index >= PHASE_ORDER.length - 1) {
    finishRuntime(runtime, evaluation);
    return;
  }
  runtime.phase = PHASE_ORDER[index + 1];
  runtime.phaseElapsed = 0;
}

export function stepFlight(
  runtime: FlightRuntime,
  evaluation: BuildEvaluation,
  dt: number,
  input: FlightInput,
): FlightRuntime {
  if (runtime.done || !Number.isFinite(dt) || dt <= 0) return runtime;

  runtime.steer = clamp(input.steer, -1, 1);
  let stagePressed = input.stagePressed;
  let remaining = Math.min(dt, 0.5);

  while (remaining > 1e-6 && !runtime.done) {
    if (runtime.phase === "done") break;
    const phase = runtime.phase;
    const duration = PHASE_DURATION[phase];
    const left = Math.max(0, duration - runtime.phaseElapsed);
    const step = Math.min(remaining, left);

    runtime.elapsed += step;
    runtime.phaseElapsed += step;
    runtime.progress = clamp(runtime.elapsed / FLIGHT_TOTAL_SECONDS, 0, 1);

    updateFuel(runtime, phase, step);

    if (
      phase === "ascent" &&
      evaluation.stats.hasBoosters &&
      !runtime.staged
    ) {
      const raw = clamp(runtime.phaseElapsed / duration, 0, 1);
      const inWindow = raw >= STAGE_WINDOW.start && raw <= STAGE_WINDOW.end;
      if (stagePressed) {
        runtime.staged = true;
        runtime.stageQuality = inWindow ? 1 : 0.45;
        runtime.message = inWindow
          ? "Perfect staging! Boosters away."
          : raw < STAGE_WINDOW.start
            ? "A little early, but the boosters are away."
            : "A little late, but the boosters are away.";
        stagePressed = false;
      } else if (raw >= 0.92) {
        runtime.staged = true;
        runtime.stageQuality = 0.2;
        runtime.message =
          "Auto-staged late. Tap STAGE when the button glows next time.";
      }
    }

    if (phase === "ascent") {
      const error = Math.abs(runtime.steer - runtime.steerTarget);
      runtime.steerError = clamp(
        runtime.steerError + error * step * 0.11,
        0,
        1,
      );
    }

    updateTelemetry(runtime, evaluation);
    remaining -= step;

    if (runtime.phaseElapsed >= duration - 1e-9) {
      advancePhase(runtime, evaluation);
    }
  }

  return runtime;
}

export function effectiveDeltaV(
  evaluation: BuildEvaluation,
  runtime: FlightRuntime,
): number {
  return (
    evaluation.stats.netDeltaVMS +
    (1 - runtime.steerError) * 320 +
    runtime.stageQuality * 180 +
    evaluation.stats.landingBonus * 200
  );
}

function gradeFor(score: number): MissionResult["grade"] {
  if (score >= 92) return "S";
  if (score >= 80) return "A";
  if (score >= 68) return "B";
  if (score >= 55) return "C";
  return "D";
}

function starsFor(score: number): number {
  if (score >= 80) return 3;
  if (score >= 65) return 2;
  if (score >= 50) return 1;
  return 0;
}

export function finalizeMission(
  evaluation: BuildEvaluation,
  runtime: FlightRuntime,
): MissionResult {
  const effective = effectiveDeltaV(evaluation, runtime);
  const margin = effective - MISSION.requiredDeltaVMS;
  const rangeScore = clamp(margin / 1500, 0, 1) * 15;
  const steerScore = (1 - runtime.steerError) * 10;
  const stageScore = runtime.stageQuality * 5;
  const designScore =
    evaluation.stats.reliability * 5 +
    clamp(evaluation.stats.stability / 0.4, 0, 1) * 5;
  const base = runtime.success ? 53 : 10 + runtime.progress * 20;
  const raw =
    base + rangeScore + steerScore + stageScore + designScore;
  const score = Math.round(clamp(raw, 0, 100));
  const grade = gradeFor(score);
  const stars = starsFor(score);

  let headline = "Mission ended early";
  let message = "The rocket did not complete the trip this time.";

  if (runtime.success) {
    headline = "Moon mission complete!";
    message =
      "Your astronaut planted the flag, collected Moon rocks, and radioed home. Great flying, commander!";
  } else if (runtime.failureReason === "fuel") {
    headline = "Out of fuel";
    message =
      "The Moon is still far away. Try a bigger tank, a more efficient engine, or boosters.";
  } else if (runtime.failureReason === "legs") {
    headline = "Bouncy landing!";
    message =
      "You reached the Moon, but without landing legs your astronaut bounced back into space. Add legs for a soft touchdown.";
  } else if (runtime.failureReason === "course") {
    headline = "Wobbly flight";
    message =
      "The rocket drifted off course. Follow the green steering marker during the climb.";
  } else if (runtime.failureReason === "liftoff") {
    headline = "Stayed on the pad";
    message = "The rocket needs more thrust to leave the launch pad.";
  }

  return {
    success: runtime.success,
    score,
    grade,
    stars,
    headline,
    message,
    failureReason: runtime.failureReason,
    effectiveDeltaVMS: effective,
    requiredDeltaVMS: MISSION.requiredDeltaVMS,
    marginMS: margin,
    steerError: runtime.steerError,
    stageQuality: runtime.stageQuality,
    touchdownSpeedKms: runtime.touchdownSpeedKms,
    durationSeconds: runtime.elapsed,
    achievements: [],
    evaluation,
    build: evaluation.build,
  };
}

export function phaseLabel(phase: FlightPhase): string {
  switch (phase) {
    case "countdown":
      return "Countdown";
    case "liftoff":
      return "Liftoff";
    case "ascent":
      return "Ascent";
    case "staging":
      return "Staging";
    case "coast":
      return "Coast";
    case "arrival":
      return "Lunar approach";
    case "landing":
      return "Landing";
    case "done":
      return "Complete";
  }
}

export const FLIGHT_PHASE_COUNT = FLIGHT_PHASES.length;
