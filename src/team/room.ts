import type { TeamRole } from "@/engine/types";
import { TEAM_ROLES } from "./roles";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(): string {
  let code = "";
  for (let index = 0; index < 4; index += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function emptyConfirmations(): Record<TeamRole, boolean> {
  return {
    planner: false,
    engineer: false,
    scientist: false,
    budget: false,
  };
}

export function confirmedCount(confirmations: Record<TeamRole, boolean>): number {
  return TEAM_ROLES.filter((role) => confirmations[role]).length;
}

export function allConfirmed(confirmations: Record<TeamRole, boolean>): boolean {
  return confirmedCount(confirmations) === TEAM_ROLES.length;
}

export const ROOM_NOTE =
  "Local team rehearsal: every role runs in this browser. The networked room server only needs to sync the mission object when you deploy it.";
