import { MISSION } from "./constants";
import { REQUIRED_SLOTS, SLOTS, getPart } from "./parts";
import { computeStats, formatDeltaV, formatTwr } from "./physics";
import type {
  BuildCheck,
  BuildEvaluation,
  CheckStatus,
  RocketBuild,
} from "./types";

function check(
  id: BuildCheck["id"],
  label: string,
  status: CheckStatus,
  blocking: boolean,
  message: string,
  tip: string,
  value?: number,
  target?: number,
  unit?: string,
): BuildCheck {
  return { id, label, status, blocking, message, tip, value, target, unit };
}

export function evaluateBuild(build: RocketBuild): BuildEvaluation {
  const stats = computeStats(build);
  const missing = REQUIRED_SLOTS.filter((slot) => !getPart(build.parts[slot]));
  const checks: BuildCheck[] = [];

  const missingNames = missing
    .map((slot) => SLOTS.find((item) => item.id === slot)?.shortLabel ?? slot)
    .join(", ");

  checks.push(
    check(
      "parts",
      "Rocket parts",
      missing.length > 0 ? "fail" : "ok",
      true,
      missing.length > 0
        ? `Missing: ${missingNames}.`
        : "Every essential part is fitted.",
      missing.length > 0
        ? "Tap a slot on the rocket or pick a part from the tray."
        : "Nice work. Every explorer needs a complete rocket.",
      missing.length,
      0,
      "missing",
    ),
  );

  const twrStatus: CheckStatus =
    stats.twr < MISSION.minLiftoffTwr
      ? "fail"
      : stats.twr < MISSION.comfortableTwr
        ? "warn"
        : "ok";
  checks.push(
    check(
      "liftoff",
      "Liftoff power",
      twrStatus,
      true,
      stats.twr < MISSION.minLiftoffTwr
        ? `Too heavy to lift off (${formatTwr(stats.twr)}).`
        : stats.twr < MISSION.comfortableTwr
          ? `It can lift off, but the climb will be slow (${formatTwr(stats.twr)}).`
          : `Plenty of push off the pad (${formatTwr(stats.twr)}).`,
      stats.twr < MISSION.minLiftoffTwr
        ? "Add a stronger engine or boosters, or choose a lighter tank."
        : "More thrust gives you a safer liftoff.",
      stats.twr,
      MISSION.comfortableTwr,
      "g",
    ),
  );

  const margin = stats.netDeltaVMS - MISSION.requiredDeltaVMS;
  const rangeStatus: CheckStatus =
    stats.netDeltaVMS >= MISSION.requiredDeltaVMS
      ? "ok"
      : stats.netDeltaVMS >= MISSION.requiredDeltaVMS * 0.85
        ? "warn"
        : "fail";
  checks.push(
    check(
      "range",
      "Moon range",
      rangeStatus,
      false,
      rangeStatus === "ok"
        ? `Enough range for the Moon (${formatDeltaV(stats.netDeltaVMS)}).`
        : rangeStatus === "warn"
          ? `Range is tight: ${formatDeltaV(stats.netDeltaVMS)} of ${formatDeltaV(MISSION.requiredDeltaVMS)}.`
          : `Not enough range yet (${formatDeltaV(stats.netDeltaVMS)} of ${formatDeltaV(MISSION.requiredDeltaVMS)}).`,
      rangeStatus === "ok"
        ? "A smooth flight can add a little extra range."
        : `A bigger tank, a Vacuum engine, or boosters can add ${formatDeltaV(Math.max(0, -margin))}.`,
      stats.netDeltaVMS,
      MISSION.requiredDeltaVMS,
      "m/s",
    ),
  );

  const stabilityStatus: CheckStatus =
    stats.stability >= MISSION.goodStability
      ? "ok"
      : stats.stability >= MISSION.minStability
        ? "warn"
        : "warn";
  checks.push(
    check(
      "stability",
      "Steering stability",
      stabilityStatus,
      false,
      stats.stability >= MISSION.goodStability
        ? "The rocket will hold a steady line."
        : stats.stability >= MISSION.minStability
          ? "A little wobbly. Steering will need care."
          : "Very wobbly without fins.",
      "Fins, a Shield Nose, and wide legs all improve stability.",
      stats.stability,
      MISSION.goodStability,
      "stability",
    ),
  );

  checks.push(
    check(
      "landing",
      "Moon landing",
      stats.hasLegs ? "ok" : "warn",
      false,
      stats.hasLegs
        ? "Landing legs are ready for touchdown."
        : "No landing legs. The crew can reach the Moon but cannot land softly.",
      stats.hasLegs
        ? "Springy legs help with a faster touchdown."
        : "Fit Tripod, Wide, or Spring legs before you launch.",
      stats.hasLegs ? 1 : 0,
      1,
      "legs",
    ),
  );

  const reliabilityStatus: CheckStatus =
    stats.reliability >= MISSION.minReliability ? "ok" : "warn";
  checks.push(
    check(
      "reliability",
      "System reliability",
      reliabilityStatus,
      false,
      `Your parts have a ${(stats.reliability * 100).toFixed(1)}% chance of working perfectly.`,
      reliabilityStatus === "ok"
        ? "Keep an eye on the steering and staging."
        : "Mix in a few more reliable parts for a safer mission.",
      stats.reliability,
      MISSION.minReliability,
      "probability",
    ),
  );

  const canLaunch =
    missing.length === 0 &&
    Number.isFinite(stats.twr) &&
    stats.twr >= MISSION.minLiftoffTwr;

  const ready = canLaunch && checks.every((item) => item.status === "ok");
  const rating: BuildEvaluation["rating"] = !canLaunch
    ? "blocked"
    : ready
      ? "ready"
      : "risky";

  return {
    build,
    stats,
    checks,
    missing,
    canLaunch,
    ready,
    rating,
  };
}

export function blockingChecks(evaluation: BuildEvaluation): BuildCheck[] {
  return evaluation.checks.filter(
    (item) => item.blocking && item.status === "fail",
  );
}
