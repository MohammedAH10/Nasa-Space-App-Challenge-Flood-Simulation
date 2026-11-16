export type PartSlot =
  | "nose"
  | "capsule"
  | "fuel"
  | "engine"
  | "booster"
  | "fins"
  | "legs";

export type GameStage = "intro" | "assembly" | "launch" | "results";

export interface MoonPart {
  id: string;
  slot: PartSlot;
  name: string;
  shortName: string;
  tagline: string;
  detail: string;
  massKg: number;
  fuelKg: number;
  thrustKN: number;
  ispS: number;
  dragFactor: number;
  stability: number;
  reliability: number;
  cost: number;
  color: number;
  accent: string;
  landingGear?: boolean;
  landingBonus?: number;
  crew?: boolean;
  boosterCount?: number;
}

export interface SlotInfo {
  id: PartSlot;
  label: string;
  shortLabel: string;
  hint: string;
  required: boolean;
  accent: string;
}

export interface RocketBuild {
  name: string;
  parts: Record<PartSlot, string | null>;
}

export interface BuildStats {
  dryMassKg: number;
  fuelMassKg: number;
  wetMassKg: number;
  liftoffThrustKN: number;
  twr: number;
  mainIspS: number;
  boosterIspS: number;
  boosterDeltaVMS: number;
  mainDeltaVMS: number;
  totalDeltaVMS: number;
  drag: number;
  dragLossMS: number;
  stability: number;
  steeringLossMS: number;
  netDeltaVMS: number;
  reliability: number;
  cost: number;
  partCount: number;
  hasBoosters: boolean;
  hasLegs: boolean;
  hasCrew: boolean;
  landingBonus: number;
}

export type CheckId =
  | "parts"
  | "liftoff"
  | "range"
  | "stability"
  | "landing"
  | "reliability";

export type CheckStatus = "ok" | "warn" | "fail";

export interface BuildCheck {
  id: CheckId;
  label: string;
  status: CheckStatus;
  blocking: boolean;
  message: string;
  tip: string;
  value?: number;
  target?: number;
  unit?: string;
}

export interface BuildEvaluation {
  build: RocketBuild;
  stats: BuildStats;
  checks: BuildCheck[];
  missing: PartSlot[];
  canLaunch: boolean;
  ready: boolean;
  rating: "blocked" | "risky" | "ready";
}

export type FlightPhase =
  | "countdown"
  | "liftoff"
  | "ascent"
  | "staging"
  | "coast"
  | "arrival"
  | "landing"
  | "done";

export interface FlightRuntime {
  phase: FlightPhase;
  elapsed: number;
  phaseElapsed: number;
  progress: number;
  altitudeKm: number;
  speedKms: number;
  fuelFraction: number;
  throttle: number;
  steer: number;
  steerTarget: number;
  steerError: number;
  staged: boolean;
  stageQuality: number;
  stageWindow: boolean;
  message: string;
  done: boolean;
  success: boolean;
  failureReason: string | null;
  touchdownSpeedKms: number;
}

export interface FlightInput {
  steer: number;
  stagePressed: boolean;
}

export interface MissionResult {
  success: boolean;
  score: number;
  grade: "S" | "A" | "B" | "C" | "D";
  stars: number;
  headline: string;
  message: string;
  failureReason: string | null;
  effectiveDeltaVMS: number;
  requiredDeltaVMS: number;
  marginMS: number;
  steerError: number;
  stageQuality: number;
  touchdownSpeedKms: number;
  durationSeconds: number;
  achievements: string[];
  evaluation: BuildEvaluation;
  build: RocketBuild;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  hint: string;
}
