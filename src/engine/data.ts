import partsJson from "@/data/parts.json";
import rocketsJson from "@/data/rockets.json";
import orbitsJson from "@/data/orbits.json";
import scenariosJson from "@/data/scenarios.json";
import missionsJson from "@/data/missions.json";
import difficultiesJson from "@/data/difficulties.json";
import weatherJson from "@/data/spaceweather-snapshot.json";
import type {
  BatteryPart,
  CameraPart,
  ComputerPart,
  Difficulty,
  DifficultyId,
  MissionConfig,
  Orbit,
  PanelPart,
  Part,
  PartCategory,
  PartsCatalog,
  RadioPart,
  RealMission,
  Rocket,
  Scenario,
  SciencePriority,
  SpaceWeather,
} from "./types";
import {
  DEFAULT_SEED,
  INTEGRATION_COST_FRACTION,
  PART_CATEGORIES,
  PART_LABELS,
} from "./constants";

export const PARTS = partsJson as unknown as PartsCatalog;
export const ROCKETS = rocketsJson as unknown as Rocket[];
export const ORBITS = orbitsJson as unknown as Orbit[];
export const SCENARIOS = scenariosJson as unknown as Scenario[];
export const REAL_MISSIONS = missionsJson as unknown as RealMission[];
export const DIFFICULTIES = difficultiesJson as unknown as Difficulty[];
export const WEATHER_SNAPSHOT = weatherJson as unknown as SpaceWeather;

export const ALL_PARTS: Part[] = [
  ...PARTS.cameras,
  ...PARTS.panels,
  ...PARTS.batteries,
  ...PARTS.radios,
  ...PARTS.computers,
];

const PARTS_BY_CATEGORY: Record<PartCategory, Part[]> = {
  camera: PARTS.cameras,
  panel: PARTS.panels,
  battery: PARTS.batteries,
  radio: PARTS.radios,
  computer: PARTS.computers,
};

const PART_INDEX = new Map(ALL_PARTS.map((part) => [part.id, part]));

const SCIENCE_PRIORITIES: SciencePriority[] = [
  "balance",
  "revisit",
  "resolution",
  "volume",
];

interface DefaultDesign {
  orbitId: string;
  rocketId: string;
  parts: Record<PartCategory, string>;
  sciencePriority: SciencePriority;
}

const DEFAULT_DESIGNS: Record<string, DefaultDesign> = {
  "flood-watch": {
    orbitId: "sso-550",
    rocketId: "electron",
    parts: {
      camera: "cam-flood-20",
      panel: "panel-140",
      battery: "bat-300",
      radio: "radio-150",
      computer: "comp-80",
    },
    sciencePriority: "balance",
  },
  "coastal-algae": {
    orbitId: "sso-550",
    rocketId: "electron",
    parts: {
      camera: "cam-basic-60",
      panel: "panel-140",
      battery: "bat-300",
      radio: "radio-50",
      computer: "comp-30",
    },
    sciencePriority: "volume",
  },
  "storm-watch": {
    orbitId: "geo-35786",
    rocketId: "falcon9-rideshare",
    parts: {
      camera: "cam-hydro-5",
      panel: "panel-260",
      battery: "bat-700",
      radio: "radio-400",
      computer: "comp-300",
    },
    sciencePriority: "revisit",
  },
  "ice-sheet": {
    orbitId: "sso-700",
    rocketId: "falcon9-rideshare",
    parts: {
      camera: "cam-radar-10",
      panel: "panel-260",
      battery: "bat-700",
      radio: "radio-400",
      computer: "comp-180",
    },
    sciencePriority: "resolution",
  },
};

const FALLBACK_DESIGN: DefaultDesign = DEFAULT_DESIGNS["flood-watch"];

export function getScenario(id: string | undefined): Scenario {
  return SCENARIOS.find((scenario) => scenario.id === id) ?? SCENARIOS[0];
}

export function getOrbit(id: string | undefined): Orbit {
  return ORBITS.find((orbit) => orbit.id === id) ?? ORBITS[0];
}

export function getRocket(id: string | undefined): Rocket {
  return ROCKETS.find((rocket) => rocket.id === id) ?? ROCKETS[0];
}

export function getDifficulty(id: string | undefined): Difficulty {
  return DIFFICULTIES.find((difficulty) => difficulty.id === id) ?? DIFFICULTIES[1];
}

export function getRealMission(id: string | undefined): RealMission | null {
  return REAL_MISSIONS.find((mission) => mission.id === id) ?? null;
}

export function getPart(id: string | undefined): Part | undefined {
  return id ? PART_INDEX.get(id) : undefined;
}

export function partsForCategory(
  category: PartCategory,
  allowedTiers?: string[],
): Part[] {
  const parts = PARTS_BY_CATEGORY[category];
  if (!allowedTiers) return parts;
  return parts.filter((part) => allowedTiers.includes(part.tier));
}

export function partAllowed(part: Part, difficulty: Difficulty): boolean {
  return difficulty.allowedPartTiers.includes(part.tier);
}

export function effectiveBudget(scenario: Scenario, difficulty: Difficulty): number {
  return round1(scenario.budgetM * difficulty.budgetScale);
}

export function defaultDesignForScenario(scenarioId: string): DefaultDesign {
  return DEFAULT_DESIGNS[scenarioId] ?? FALLBACK_DESIGN;
}

export function partInstance<T extends Part>(category: T["category"], id: string): T {
  const part = getPart(id);
  if (part && part.category === category) return part as T;
  const design = FALLBACK_DESIGN;
  const fallback = getPart(design.parts[category]);
  if (!fallback || fallback.category !== category) {
    throw new Error(`No fallback part for ${category}`);
  }
  return fallback as T;
}

export function getMissionParts(config: MissionConfig) {
  return {
    camera: partInstance<CameraPart>("camera", config.parts.camera),
    panel: partInstance<PanelPart>("panel", config.parts.panel),
    battery: partInstance<BatteryPart>("battery", config.parts.battery),
    radio: partInstance<RadioPart>("radio", config.parts.radio),
    computer: partInstance<ComputerPart>("computer", config.parts.computer),
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function defaultBudgets(
  scenario: Scenario,
  difficulty: Difficulty,
  design: DefaultDesign,
): MissionConfig["budgets"] {
  const rocket = getRocket(design.rocketId);
  const parts = PART_CATEGORIES.map((category) => getPart(design.parts[category])).filter(
    (part): part is Part => Boolean(part),
  );
  const partsCost = parts.reduce((total, part) => total + part.costM, 0);
  const integration = partsCost * INTEGRATION_COST_FRACTION;
  const camera = parts.find((part) => part.category === "camera");
  const engineerParts = parts.filter((part) => part.category !== "camera");
  const engineerSpend =
    engineerParts.reduce((total, part) => total + part.costM, 0) + integration;

  return {
    planner: round1(rocket.costM),
    engineer: round1(engineerSpend),
    scientist: round1(camera?.costM ?? 0),
  };
}

export function createDefaultMission(
  scenarioId = "flood-watch",
  difficultyId: DifficultyId = "engineer",
): MissionConfig {
  const scenario = getScenario(scenarioId);
  const difficulty = getDifficulty(difficultyId);
  const design = defaultDesignForScenario(scenario.id);
  return {
    scenarioId: scenario.id,
    orbitId: design.orbitId,
    rocketId: design.rocketId,
    parts: { ...design.parts },
    difficulty: difficulty.id,
    sciencePriority: design.sciencePriority,
    budgets: defaultBudgets(scenario, difficulty, design),
    seed: DEFAULT_SEED,
    teamMode: false,
  };
}

export function sanitizeMission(input: Partial<MissionConfig> | null | undefined): MissionConfig {
  const base = createDefaultMission(input?.scenarioId, input?.difficulty);
  if (!input) return base;

  const scenario = getScenario(input.scenarioId);
  const difficulty = getDifficulty(input.difficulty);
  const design = defaultDesignForScenario(scenario.id);

  const orbitCandidate = ORBITS.find((orbit) => orbit.id === input.orbitId);
  const rocketCandidate = ROCKETS.find((rocket) => rocket.id === input.rocketId);

  const parts: MissionConfig["parts"] = { ...base.parts };
  for (const category of PART_CATEGORIES) {
    const candidate = getPart(input.parts?.[category]);
    const selected =
      candidate && candidate.category === category && partAllowed(candidate, difficulty)
        ? candidate
        : null;
    if (selected) {
      parts[category] = selected.id;
    } else {
      const fallback = getPart(design.parts[category]);
      const tierFallback = partsForCategory(category, difficulty.allowedPartTiers)[0];
      parts[category] = (fallback && partAllowed(fallback, difficulty) ? fallback : tierFallback)?.id ?? base.parts[category];
    }
  }

  const budgets = input.budgets;
  const safeBudgets =
    budgets &&
    Number.isFinite(budgets.planner) &&
    Number.isFinite(budgets.engineer) &&
    Number.isFinite(budgets.scientist)
      ? {
          planner: Math.max(0, budgets.planner),
          engineer: Math.max(0, budgets.engineer),
          scientist: Math.max(0, budgets.scientist),
        }
      : defaultBudgets(scenario, difficulty, {
          ...design,
          parts,
        });

  return {
    scenarioId: scenario.id,
    orbitId: orbitCandidate?.id ?? design.orbitId,
    rocketId: rocketCandidate?.id ?? design.rocketId,
    parts,
    difficulty: difficulty.id,
    sciencePriority: SCIENCE_PRIORITIES.includes(input.sciencePriority as SciencePriority)
      ? (input.sciencePriority as SciencePriority)
      : design.sciencePriority,
    budgets: safeBudgets,
    seed:
      typeof input.seed === "number" && Number.isFinite(input.seed) && input.seed > 0
        ? Math.floor(input.seed)
        : DEFAULT_SEED,
    teamMode: Boolean(input.teamMode),
  };
}

export function resolveMission(
  input: Partial<MissionConfig>,
  weather: SpaceWeather = WEATHER_SNAPSHOT,
) {
  const config = sanitizeMission(input);
  const scenario = getScenario(config.scenarioId);
  const orbit = getOrbit(config.orbitId);
  const rocket = getRocket(config.rocketId);
  const difficulty = getDifficulty(config.difficulty);
  const parts = getMissionParts(config);
  return {
    config,
    scenario,
    orbit,
    rocket,
    difficulty,
    weather,
    parts,
  };
}

export function designLabel(config: MissionConfig): string {
  const parts = getMissionParts(config);
  const orbit = getOrbit(config.orbitId);
  return `${parts.camera.name} · ${orbit.name}`;
}

export function categoryLabel(category: PartCategory): string {
  return PART_LABELS[category];
}
