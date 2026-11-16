import type { FlightPhase } from "./types";

export const G0 = 9.80665;

export const MISSION = {
  name: "Luna Landing",
  callSign: "Moon Squad 1",
  requiredDeltaVMS: 6200,
  gravityLossMS: 950,
  minLiftoffTwr: 1,
  comfortableTwr: 1.2,
  minStability: 0.12,
  goodStability: 0.24,
  minReliability: 0.93,
  maxSteerError: 0.5,
  moonDistanceKm: 384400,
  targetScore: 80,
} as const;

export const FLIGHT_PHASES: { phase: Exclude<FlightPhase, "done">; duration: number }[] = [
  { phase: "countdown", duration: 2.8 },
  { phase: "liftoff", duration: 2.4 },
  { phase: "ascent", duration: 7.2 },
  { phase: "staging", duration: 1.2 },
  { phase: "coast", duration: 6.4 },
  { phase: "arrival", duration: 3.2 },
  { phase: "landing", duration: 3.6 },
];

export const FLIGHT_TOTAL_SECONDS = FLIGHT_PHASES.reduce(
  (total, item) => total + item.duration,
  0,
);

export const PHASE_DURATION: Record<Exclude<FlightPhase, "done">, number> = {
  countdown: 2.8,
  liftoff: 2.4,
  ascent: 7.2,
  staging: 1.2,
  coast: 6.4,
  arrival: 3.2,
  landing: 3.6,
};

export const SAVE_KEY = "moon-squad-v1";

export const STAGE_WINDOW = {
  start: 0.42,
  end: 0.72,
} as const;
