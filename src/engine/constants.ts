import type { FailureCause, PartCategory, Role } from "./types";

export const EARTH_RADIUS_KM = 6378.137;
export const MU_KM3_S2 = 398600.4418;

export const BUS_MASS_KG = 60;
export const ADAPTER_MASS_FRACTION = 0.06;
export const BUS_POWER_W = 20;
export const INTEGRATION_COST_FRACTION = 0.08;
export const ECLIPSE_ENERGY_MARGIN = 1.05;
export const DEFAULT_SEED = 1337;
export const DEFAULT_RUNS = 1000;

export const PART_CATEGORIES: PartCategory[] = [
  "camera",
  "panel",
  "battery",
  "radio",
  "computer",
];

export const PART_LABELS: Record<PartCategory, string> = {
  camera: "Instrument",
  panel: "Solar array",
  battery: "Battery",
  radio: "Radio",
  computer: "Computer",
};

export const ROLE_LABELS: Record<Role, string> = {
  solo: "Solo commander",
  planner: "Mission planner",
  engineer: "Spacecraft engineer",
  scientist: "Mission scientist",
  budget: "Budget manager",
};

export const FAILURE_LABELS: Record<FailureCause, string> = {
  launch: "Launch vehicle failure",
  mass: "Too heavy for launcher",
  power: "Power generation fell short",
  battery: "Battery depleted in eclipse",
  data: "Data downlink shortfall",
  budget: "Budget overrun",
  component: "Component failure",
  storm: "Storm-induced failure",
  schedule: "Schedule delay overran budget",
  orbit: "Orbit does not meet mission",
  resolution: "Instrument resolution too coarse",
  science: "Science return below target",
};

export const FAILURE_ORDER: FailureCause[] = [
  "launch",
  "component",
  "power",
  "battery",
  "data",
  "storm",
  "schedule",
  "budget",
  "mass",
  "orbit",
  "resolution",
  "science",
];
