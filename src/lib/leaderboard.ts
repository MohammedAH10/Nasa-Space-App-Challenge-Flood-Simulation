import type { LeaderboardEntry } from "@/engine/types";

const STORAGE_KEY = "orbit-quest-leaderboard-v1";
const MAX_ENTRIES = 12;

export function loadLeaderboard(): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry) =>
          typeof entry?.id === "string" &&
          typeof entry?.score === "number" &&
          typeof entry?.scenarioName === "string",
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function persistLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  if (typeof window === "undefined") return entries;
  try {
    const sorted = [...entries].sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    return sorted;
  } catch {
    return entries;
  }
}

export function mergeLeaderboardEntry(
  entries: LeaderboardEntry[],
  entry: LeaderboardEntry,
): LeaderboardEntry[] {
  const existing = entries.find((candidate) => candidate.link === entry.link);
  if (existing && existing.score >= entry.score) {
    return entries;
  }
  const withoutExisting = entries.filter((candidate) => candidate.link !== entry.link);
  return persistLeaderboard([...withoutExisting, entry]);
}

export function clearLeaderboard(): LeaderboardEntry[] {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage failures
    }
  }
  return [];
}
