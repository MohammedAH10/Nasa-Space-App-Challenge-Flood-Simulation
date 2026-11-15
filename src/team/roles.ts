import type { PartCategory, Role, TeamRole } from "@/engine/types";

export type EditField =
  | "scenario"
  | "difficulty"
  | "orbit"
  | "rocket"
  | "sciencePriority"
  | "budgets"
  | PartCategory;

export interface RoleInfo {
  id: Role;
  name: string;
  shortName: string;
  color: string;
  description: string;
  owns: EditField[];
}

export const TEAM_ROLES: TeamRole[] = ["planner", "engineer", "scientist", "budget"];

export const ROLE_INFO: Record<Role, RoleInfo> = {
  solo: {
    id: "solo",
    name: "Solo Commander",
    shortName: "Solo",
    color: "#38bdf8",
    description: "Own every panel. Best for learning and quick iteration.",
    owns: [
      "scenario",
      "difficulty",
      "orbit",
      "rocket",
      "sciencePriority",
      "budgets",
      "camera",
      "panel",
      "battery",
      "radio",
      "computer",
    ],
  },
  planner: {
    id: "planner",
    name: "Mission Planner",
    shortName: "Planner",
    color: "#60a5fa",
    description: "Owns the scenario, orbit, and launcher. Revisit time is your responsibility.",
    owns: ["scenario", "difficulty", "orbit", "rocket"],
  },
  engineer: {
    id: "engineer",
    name: "Spacecraft Engineer",
    shortName: "Engineer",
    color: "#34d399",
    description: "Owns power, battery, radio, and computer. Make the bus survive.",
    owns: ["panel", "battery", "radio", "computer"],
  },
  scientist: {
    id: "scientist",
    name: "Mission Scientist",
    shortName: "Scientist",
    color: "#fbbf24",
    description: "Owns the instrument and science priority. Fight for resolution.",
    owns: ["camera", "sciencePriority"],
  },
  budget: {
    id: "budget",
    name: "Budget Manager",
    shortName: "Budget",
    color: "#f472b6",
    description: "Owns the money. Allocate role budgets and veto overspending.",
    owns: ["budgets"],
  },
};

export function canEdit(role: Role, field: EditField): boolean {
  if (role === "solo") return true;
  return ROLE_INFO[role].owns.includes(field);
}

export function ownerForField(field: EditField): Role {
  if (["scenario", "difficulty", "orbit", "rocket"].includes(field)) return "planner";
  if (["panel", "battery", "radio", "computer"].includes(field)) return "engineer";
  if (["camera", "sciencePriority"].includes(field)) return "scientist";
  return "budget";
}
