import { SAVE_KEY } from "./constants";
import { SLOTS, getPart } from "./parts";
import { isAchievementId } from "./achievements";
import type { PartSlot, RocketBuild } from "./types";

export interface SavedProgress {
  build: RocketBuild;
  bestScore: number;
  runs: number;
  achievements: string[];
  soundOn: boolean;
  tutorialSeen: boolean;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.round(Math.min(max, Math.max(min, value)));
}

export function sanitizeBuild(raw: unknown): RocketBuild | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as { name?: unknown; parts?: unknown };
  const rawParts = record.parts;
  if (!rawParts || typeof rawParts !== "object") return null;

  const parts = {} as Record<PartSlot, string | null>;
  for (const slot of SLOTS) {
    const candidate = (rawParts as Record<string, unknown>)[slot.id];
    if (typeof candidate !== "string") {
      parts[slot.id] = null;
      continue;
    }
    const part = getPart(candidate);
    parts[slot.id] = part && part.slot === slot.id ? part.id : null;
  }

  const name =
    typeof record.name === "string" && record.name.trim().length > 0
      ? record.name.trim().slice(0, 40)
      : "My Moon Rocket";

  return { name, parts };
}

function sanitizeAchievements(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(raw.filter((item): item is string => typeof item === "string" && isAchievementId(item))),
  );
}

export function loadProgress(): SavedProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const text = window.localStorage.getItem(SAVE_KEY);
    if (!text) return null;
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return null;
    const data = parsed as Record<string, unknown>;
    const build = sanitizeBuild(data.build);
    if (!build) return null;
    return {
      build,
      bestScore: clampInt(data.bestScore, 0, 100, 0),
      runs: clampInt(data.runs, 0, 9999, 0),
      achievements: sanitizeAchievements(data.achievements),
      soundOn: data.soundOn !== false,
      tutorialSeen: data.tutorialSeen === true,
    };
  } catch {
    return null;
  }
}

export function saveProgress(progress: SavedProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
  } catch {
    // Private browsing and full storage should never break the game.
  }
}

export function clearProgress(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore.
  }
}
