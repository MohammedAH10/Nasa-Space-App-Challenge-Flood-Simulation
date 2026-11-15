export type PartCategory = "camera" | "panel" | "battery" | "radio" | "computer";
export type PartTier = "basic" | "advanced";
export type OrbitType = "LEO" | "SSO" | "GEO";
export type Role = "solo" | "planner" | "engineer" | "scientist" | "budget";
export type TeamRole = Exclude<Role, "solo">;
export type DifficultyId = "cadet" | "engineer" | "commander";
export type SciencePriority = "balance" | "revisit" | "resolution" | "volume";
export type ViewMode = "orbit" | "assembly";

export interface PartBase {
  id: string;
  category: PartCategory;
  name: string;
  blurb: string;
  tier: PartTier;
  massKg: number;
  powerW: number;
  costM: number;
  reliability: number;
}

export interface CameraPart extends PartBase {
  category: "camera";
  dataGbPerDay: number;
  resolutionM: number;
  science: number;
}

export interface PanelPart extends PartBase {
  category: "panel";
  peakW: number;
  areaM2: number;
  degradationPerYear: number;
}

export interface BatteryPart extends PartBase {
  category: "battery";
  capacityWh: number;
  usableFraction: number;
}

export interface RadioPart extends PartBase {
  category: "radio";
  downlinkMbps: number;
}

export interface ComputerPart extends PartBase {
  category: "computer";
  throughputGbPerDay: number;
  bufferGb: number;
}

export type Part = CameraPart | PanelPart | BatteryPart | RadioPart | ComputerPart;

export interface PartsCatalog {
  cameras: CameraPart[];
  panels: PanelPart[];
  batteries: BatteryPart[];
  radios: RadioPart[];
  computers: ComputerPart[];
}

export interface Rocket {
  id: string;
  name: string;
  provider: string;
  blurb: string;
  costM: number;
  reliability: number;
  capacityKg: Record<OrbitType, number>;
}

export interface Orbit {
  id: string;
  name: string;
  type: OrbitType;
  altitudeKm: number;
  inclinationDeg: number;
  revisitDays: number;
  eclipseFraction: number;
  radiation: number;
  passesPerDay: number;
  passMinutes: number;
  groundStations: string[];
  blurb: string;
}

export interface Scenario {
  id: string;
  name: string;
  region: string;
  objective: string;
  brief: string;
  budgetM: number;
  lifetimeMonths: number;
  allowedOrbitTypes: OrbitType[];
  maxRevisitDays: number;
  minDeliveredFraction: number;
  minResolutionM: number;
  stormSensitivity: number;
  referenceMissionId: string;
  accent: string;
}

export interface RealMission {
  id: string;
  name: string;
  agency: string;
  launched: string;
  massKg: number;
  powerW: number;
  orbitType: OrbitType;
  altitudeKm: number;
  revisitDays: number;
  designLifeYears: number;
  note: string;
  url: string;
  source: string;
}

export interface Difficulty {
  id: DifficultyId;
  name: string;
  description: string;
  allowedPartTiers: PartTier[];
  stormScale: number;
  failureScale: number;
  budgetScale: number;
}

export interface SpaceWeather {
  capturedAt: string;
  source: string;
  kpIndex: number;
  solarWindSpeedKms: number;
  solarWindDensity: number;
  flaresLast24h: number;
  cmeLast72h: number;
  stormProbability: number;
  note: string;
  stale?: boolean;
}

export interface RoleBudgets {
  planner: number;
  engineer: number;
  scientist: number;
}

export interface MissionConfig {
  scenarioId: string;
  orbitId: string;
  rocketId: string;
  parts: Record<PartCategory, string>;
  difficulty: DifficultyId;
  sciencePriority: SciencePriority;
  budgets: RoleBudgets;
  seed: number;
  teamMode: boolean;
}

export interface ResolvedMission {
  config: MissionConfig;
  scenario: Scenario;
  orbit: Orbit;
  rocket: Rocket;
  difficulty: Difficulty;
  weather: SpaceWeather;
  parts: {
    camera: CameraPart;
    panel: PanelPart;
    battery: BatteryPart;
    radio: RadioPart;
    computer: ComputerPart;
  };
}

export type RuleId =
  | "mass"
  | "power"
  | "battery"
  | "data"
  | "budget"
  | "revisit"
  | "resolution"
  | "orbit";

export type RuleStatus = "ok" | "warn" | "fail";

export interface RuleResult {
  id: RuleId;
  label: string;
  status: RuleStatus;
  blocking: boolean;
  headroom: number;
  value: number;
  limit: number;
  unit: string;
  message: string;
  why: string;
  target: "orbit" | "rocket" | PartCategory | "budget";
}

export interface BudgetLine {
  role: Exclude<TeamRole, "budget">;
  label: string;
  spent: number;
  cap: number;
  status: RuleStatus;
}

export interface MissionMetrics {
  partMassKg: number;
  adapterMassKg: number;
  totalMassKg: number;
  capacityKg: number;
  loadW: number;
  generationW: number;
  batteryNeedWh: number;
  batteryUsableWh: number;
  dataProducedGb: number;
  dataCapacityGb: number;
  bufferGb: number;
  partsCostM: number;
  integrationCostM: number;
  launchCostM: number;
  totalCostM: number;
  budgetM: number;
  orbitPeriodMinutes: number;
  eclipseHours: number;
  revisitDays: number;
  passesPerDay: number;
  passMinutes: number;
  downlinkMbps: number;
}

export interface RuleReport {
  results: RuleResult[];
  blockingFailures: RuleResult[];
  warnings: RuleResult[];
  pass: boolean;
  metrics: MissionMetrics;
  budgetLines: BudgetLine[];
}

export type FailureCause =
  | "launch"
  | "mass"
  | "power"
  | "battery"
  | "data"
  | "budget"
  | "component"
  | "storm"
  | "schedule"
  | "orbit"
  | "resolution"
  | "science";

export interface RunResult {
  success: boolean;
  cause?: FailureCause;
  causeDetail?: string;
  scienceReturn: number;
  deliveredFraction: number;
  monthsSurvived: number;
  storms: number;
}

export interface FailureBucket {
  cause: FailureCause;
  label: string;
  count: number;
  percent: number;
}

export interface Improvement {
  id: string;
  kind: "part" | "rocket" | "orbit";
  label: string;
  description: string;
  partCategory?: PartCategory;
  fromId?: string;
  toId?: string;
  successProbability: number;
  delta: number;
  medianScienceReturn: number;
  costM: number;
  feasible: boolean;
}

export interface MonteCarloSummary {
  runs: number;
  successes: number;
  successProbability: number;
  medianScienceReturn: number;
  meanScienceReturn: number;
  meanMonthsSurvived: number;
  deliveredFraction: number;
  failureBreakdown: FailureBucket[];
  improvements: Improvement[];
  seed: number;
}

export interface ScoreBreakdown {
  total: number;
  grade: string;
  successPoints: number;
  sciencePoints: number;
  budgetPoints: number;
  coordinationPoints: number;
  budgetEfficiency: number;
  coordination: number;
}

export interface Facts {
  generatedAt: string;
  scenario: {
    id: string;
    name: string;
    region: string;
    objective: string;
    budgetM: number;
    lifetimeMonths: number;
    requiredDeliveredFraction: number;
    requiredRevisitDays: number;
    requiredResolutionM: number;
  };
  design: {
    rocket: string;
    orbit: string;
    orbitType: OrbitType;
    altitudeKm: number;
    parts: { category: PartCategory; name: string; blurb: string }[];
    totalCostM: number;
    totalMassKg: number;
    capacityKg: number;
    generationW: number;
    loadW: number;
    dataProducedGb: number;
    dataCapacityGb: number;
    eclipseHours: number;
    sciencePriority: SciencePriority;
  };
  weather: {
    kpIndex: number;
    stormProbability: number;
    source: string;
    stale: boolean;
  };
  results: {
    successProbability: number;
    medianScienceReturn: number;
    meanMonthsSurvived: number;
    lifetimeMonths: number;
    deliveredFraction: number;
    topFailures: FailureBucket[];
    tightConstraints: {
      id: RuleId;
      label: string;
      status: RuleStatus;
      message: string;
      why: string;
      headroom: number;
    }[];
  };
  improvements: Improvement[];
  score: ScoreBreakdown;
  referenceMission: RealMission | null;
  verdict: string;
}

export interface ReportSection {
  heading: string;
  body: string;
}

export interface ReportDocument {
  headline: string;
  sections: ReportSection[];
  source: "template" | "llm";
  level: "cadet" | "engineer";
}

export interface LeaderboardEntry {
  id: string;
  scenarioId: string;
  scenarioName: string;
  grade: string;
  score: number;
  successProbability: number;
  costM: number;
  designLabel: string;
  createdAt: string;
  link: string;
}
