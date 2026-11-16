import { G0, MISSION } from "./constants";
import { SLOTS, getPart } from "./parts";
import type { BuildStats, MoonPart, RocketBuild } from "./types";

function safeLog(value: number): number {
  return value > 1 ? Math.log(value) : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function stageDeltaV(
  ispS: number,
  startMassKg: number,
  endMassKg: number,
): number {
  if (ispS <= 0 || startMassKg <= 0 || endMassKg <= 0) return 0;
  if (startMassKg <= endMassKg) return 0;
  return ispS * G0 * safeLog(startMassKg / endMassKg);
}

export function rocketParts(build: RocketBuild): {
  bySlot: Record<string, MoonPart | null>;
  present: MoonPart[];
} {
  const bySlot: Record<string, MoonPart | null> = {};
  const present: MoonPart[] = [];
  for (const slot of SLOTS) {
    const part = getPart(build.parts[slot.id]);
    bySlot[slot.id] = part;
    if (part) present.push(part);
  }
  return { bySlot, present };
}

export function computeStats(build: RocketBuild): BuildStats {
  const { bySlot, present } = rocketParts(build);
  const nose = bySlot.nose;
  const capsule = bySlot.capsule;
  const fuel = bySlot.fuel;
  const engine = bySlot.engine;
  const booster = bySlot.booster;
  const fins = bySlot.fins;
  const legs = bySlot.legs;

  const dryMassKg = present.reduce((sum, part) => sum + part.massKg, 0);
  const fuelMassKg = present.reduce((sum, part) => sum + part.fuelKg, 0);
  const wetMassKg = dryMassKg + fuelMassKg;

  const liftoffThrustKN = (engine?.thrustKN ?? 0) + (booster?.thrustKN ?? 0);
  const twr = wetMassKg > 0 ? (liftoffThrustKN * 1000) / (wetMassKg * G0) : 0;

  const mainIspS = engine?.ispS ?? 0;
  const boosterIspS = booster?.ispS ?? 0;
  const boosterDryKg = booster?.massKg ?? 0;
  const boosterFuelKg = booster?.fuelKg ?? 0;

  let boosterDeltaVMS = 0;
  let mainDeltaVMS = 0;

  if (booster && boosterFuelKg > 0 && boosterIspS > 0) {
    const afterBoosterBurn = wetMassKg - boosterFuelKg;
    boosterDeltaVMS = stageDeltaV(boosterIspS, wetMassKg, afterBoosterBurn);
    const mainStartMass = afterBoosterBurn - boosterDryKg;
    const mainEndMass = dryMassKg - boosterDryKg;
    mainDeltaVMS = stageDeltaV(mainIspS, mainStartMass, mainEndMass);
  } else {
    mainDeltaVMS = stageDeltaV(mainIspS, wetMassKg, dryMassKg);
  }

  const totalDeltaVMS = boosterDeltaVMS + mainDeltaVMS;

  const drag =
    (nose?.dragFactor ?? 1) *
    (fins?.dragFactor ?? 1) *
    (capsule?.dragFactor ?? 1);
  const dragLossMS = Math.max(0, (drag - 0.7) * 800);

  const stability = clamp(
    (nose?.stability ?? 0) + (fins?.stability ?? 0) + (legs?.stability ?? 0),
    0,
    0.6,
  );
  const steeringLossMS = (1 - stability) * 600;

  const netDeltaVMS = Math.max(
    0,
    totalDeltaVMS - MISSION.gravityLossMS - dragLossMS - steeringLossMS,
  );

  const reliability = present.reduce(
    (value, part) => value * part.reliability,
    1,
  );
  const cost = present.reduce((sum, part) => sum + part.cost, 0);
  const hasLegs = Boolean(legs?.landingGear);
  const hasBoosters = Boolean(booster && boosterFuelKg > 0);
  const landingBonus = legs?.landingBonus ?? 0;

  return {
    dryMassKg,
    fuelMassKg,
    wetMassKg,
    liftoffThrustKN,
    twr,
    mainIspS,
    boosterIspS,
    boosterDeltaVMS,
    mainDeltaVMS,
    totalDeltaVMS,
    drag,
    dragLossMS,
    stability,
    steeringLossMS,
    netDeltaVMS,
    reliability,
    cost,
    partCount: present.length,
    hasBoosters,
    hasLegs,
    hasCrew: Boolean(capsule?.crew),
    landingBonus,
  };
}

export function rangeRatio(stats: BuildStats): number {
  return MISSION.requiredDeltaVMS > 0
    ? stats.netDeltaVMS / MISSION.requiredDeltaVMS
    : 0;
}

export function formatMass(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${Math.round(kg)} kg`;
}

export function formatDeltaV(ms: number): string {
  return `${(ms / 1000).toFixed(2)} km/s`;
}

export function formatTwr(twr: number): string {
  return `${twr.toFixed(1)} g`;
}
