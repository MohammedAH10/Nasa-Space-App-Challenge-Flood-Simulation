/// <reference lib="webworker" />

import { runMonteCarloSimulation } from "./simulate";
import type { MissionConfig, SpaceWeather } from "./types";

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

interface SimulationRequest {
  config: MissionConfig;
  weather: SpaceWeather;
  runs: number;
  seed: number;
  includeImprovements: boolean;
}

workerScope.onmessage = (event: MessageEvent<SimulationRequest>) => {
  const { config, weather, runs, seed, includeImprovements } = event.data;
  try {
    const summary = runMonteCarloSimulation(
      config,
      weather,
      runs,
      seed,
      includeImprovements,
    );
    workerScope.postMessage({ type: "result", summary });
  } catch (error) {
    workerScope.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "Simulation failed",
    });
  }
};

export {};
