import type { Achievement, BuildEvaluation, MissionResult } from "./types";

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-part",
    name: "Part Picker",
    description: "Fit your first rocket part.",
    hint: "Pick a part from the tray.",
  },
  {
    id: "full-stack",
    name: "Full Stack",
    description: "Fit all four essential parts.",
    hint: "Nose, capsule, tank, and engine.",
  },
  {
    id: "first-launch",
    name: "Lift Off",
    description: "Launch your first rocket.",
    hint: "Press the launch button.",
  },
  {
    id: "moonwalker",
    name: "Moonwalker",
    description: "Land successfully on the Moon.",
    hint: "Complete a mission.",
  },
  {
    id: "steady-hands",
    name: "Steady Hands",
    description: "Finish with steering error under 12%.",
    hint: "Follow the green steering marker.",
  },
  {
    id: "perfect-stage",
    name: "Perfect Stage",
    description: "Stage the boosters in the green window.",
    hint: "Tap STAGE when it glows.",
  },
  {
    id: "no-boosters",
    name: "Pure Power",
    description: "Reach the Moon without side boosters.",
    hint: "Try a big tank and a vacuum engine.",
  },
  {
    id: "light-packer",
    name: "Light Packer",
    description: "Land with a rocket costing 50 credits or less.",
    hint: "Use lighter, cheaper parts.",
  },
  {
    id: "booster-boss",
    name: "Booster Boss",
    description: "Launch with Mega Boosters.",
    hint: "Fit the biggest boosters.",
  },
  {
    id: "ready-check",
    name: "Ready Check",
    description: "Get every readiness check green.",
    hint: "Balance range, stability, and landing.",
  },
  {
    id: "three-missions",
    name: "Persistent Pilot",
    description: "Fly three missions.",
    hint: "Keep practicing.",
  },
  {
    id: "badge-collector",
    name: "Badge Collector",
    description: "Unlock six badges.",
    hint: "Try different designs.",
  },
];

const ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map((item) => item.id));

export function isAchievementId(id: string): boolean {
  return ACHIEVEMENT_IDS.has(id);
}

export function getAchievement(id: string): Achievement | null {
  return ACHIEVEMENTS.find((item) => item.id === id) ?? null;
}

export function missionAchievements(
  evaluation: BuildEvaluation,
  result: MissionResult,
  runCount: number,
): string[] {
  const earned: string[] = [];
  if (result.success) {
    earned.push("moonwalker");
    if (result.steerError < 0.12) earned.push("steady-hands");
    if (
      evaluation.stats.hasBoosters &&
      result.stageQuality >= 0.95
    ) {
      earned.push("perfect-stage");
    }
    if (!evaluation.stats.hasBoosters) earned.push("no-boosters");
    if (evaluation.stats.cost <= 50) earned.push("light-packer");
  }
  if (evaluation.build.parts.booster === "booster-heavy") {
    earned.push("booster-boss");
  }
  if (evaluation.ready) earned.push("ready-check");
  if (runCount >= 3) earned.push("three-missions");
  return earned.filter(isAchievementId);
}
