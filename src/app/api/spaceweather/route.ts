import { NextResponse } from "next/server";
import { WEATHER_SNAPSHOT } from "@/engine/data";
import type { SpaceWeather } from "@/engine/types";

const KP_ENDPOINT = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json";
const PLASMA_ENDPOINT = "https://services.swpc.noaa.gov/products/solar-wind/plasma-1-day.json";

function stormProbabilityForKp(kp: number): number {
  if (kp >= 7) return 0.85;
  if (kp >= 6) return 0.7;
  if (kp >= 5) return 0.55;
  if (kp >= 4) return 0.35;
  if (kp >= 3) return 0.18;
  return 0.1;
}

async function fetchWithTimeout(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function latestKp(rows: unknown): number | null {
  if (!Array.isArray(rows)) return null;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index];
    if (!Array.isArray(row) || row.length < 2) continue;
    const value = Number(row[1]);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function latestPlasma(rows: unknown): { speed: number; density: number } | null {
  if (!Array.isArray(rows)) return null;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index];
    if (!Array.isArray(row) || row.length < 3) continue;
    const density = Number(row[1]);
    const speed = Number(row[2]);
    if (Number.isFinite(speed) && Number.isFinite(density)) {
      return { speed, density };
    }
  }
  return null;
}

export async function GET() {
  try {
    const [kpRows, plasmaRows] = await Promise.all([
      fetchWithTimeout(KP_ENDPOINT),
      fetchWithTimeout(PLASMA_ENDPOINT),
    ]);
    const kp = latestKp(kpRows);
    const plasma = latestPlasma(plasmaRows);
    if (kp === null) throw new Error("No Kp value available");

    const weather: SpaceWeather = {
      ...WEATHER_SNAPSHOT,
      capturedAt: new Date().toISOString(),
      source: "NOAA SWPC live feed",
      kpIndex: kp,
      solarWindSpeedKms: plasma?.speed ?? WEATHER_SNAPSHOT.solarWindSpeedKms,
      solarWindDensity: plasma?.density ?? WEATHER_SNAPSHOT.solarWindDensity,
      stormProbability: stormProbabilityForKp(kp),
      note: `Live Kp ${kp}. Storm probability mapped from the planetary K index.`,
      stale: false,
    };

    return NextResponse.json(weather, {
      headers: {
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json(
      {
        ...WEATHER_SNAPSHOT,
        stale: true,
        note: "Live NOAA feed unavailable. Showing the bundled snapshot so the mission can still run offline.",
      },
      { headers: { "Cache-Control": "s-maxage=300" } },
    );
  }
}
