"use client";

import { create } from "zustand";
import {
  createDefaultMission,
  designLabel,
  effectiveBudget,
  getDifficulty,
  getScenario,
  resolveMission,
  sanitizeMission,
  WEATHER_SNAPSHOT,
} from "@/engine/data";
import { evaluateMission } from "@/engine/rules";
import { teamCoordination, scoreMission } from "@/engine/score";
import { buildFacts } from "@/engine/facts";
import {
  runMonteCarloSimulation,
  type SimulationContext,
} from "@/engine/simulate";
import { buildFallbackReport } from "@/ai/fallback";
import { requestLlmReport } from "@/ai/llm";
import { emptyConfirmations, generateRoomCode, allConfirmed } from "@/team/room";
import type { EditField } from "@/team/roles";
import { buildShareUrl, readDesignFromUrl } from "@/lib/share";
import {
  clearLeaderboard,
  loadLeaderboard,
  mergeLeaderboardEntry,
} from "@/lib/leaderboard";
import type {
  Facts,
  Improvement,
  LeaderboardEntry,
  MissionConfig,
  MonteCarloSummary,
  PartCategory,
  ReportDocument,
  Role,
  SpaceWeather,
  TeamRole,
  ViewMode,
} from "@/engine/types";

export type Stage = "scenario" | "builder" | "results";
export type SimStatus = "idle" | "running" | "done" | "error";
export type ReportStatus = "idle" | "loading" | "template" | "llm";

interface MissionStore {
  config: MissionConfig;
  weather: SpaceWeather;
  weatherLive: boolean;
  stage: Stage;
  view: ViewMode;
  activeRole: Role;
  confirmations: Record<TeamRole, boolean>;
  roomCode: string | null;
  simStatus: SimStatus;
  simError: string | null;
  summary: MonteCarloSummary | null;
  facts: Facts | null;
  report: ReportDocument | null;
  reportStatus: ReportStatus;
  reportNote: string | null;
  reportLevel: "cadet" | "engineer";
  leaderboard: LeaderboardEntry[];
  hydrated: boolean;
  hydrate: () => void;
  setStage: (stage: Stage) => void;
  setView: (view: ViewMode) => void;
  setScenario: (scenarioId: string) => void;
  setOrbit: (orbitId: string) => void;
  setRocket: (rocketId: string) => void;
  setPart: (category: PartCategory, partId: string) => void;
  setDifficulty: (difficulty: MissionConfig["difficulty"]) => void;
  setSciencePriority: (priority: MissionConfig["sciencePriority"]) => void;
  setBudget: (role: TeamRole, value: number) => void;
  setActiveRole: (role: Role) => void;
  setTeamMode: (enabled: boolean) => void;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  leaveRoom: () => void;
  toggleConfirmation: (role: TeamRole) => void;
  setWeather: (weather: SpaceWeather) => void;
  launch: () => void;
  applyImprovement: (improvement: Improvement) => void;
  setReportLevel: (level: "cadet" | "engineer") => void;
  regenerateReport: () => void;
  saveScore: (facts: Facts, summary: MonteCarloSummary, config: MissionConfig) => void;
  clearScores: () => void;
  reset: () => void;
}

const CLEARED_RESULTS = {
  summary: null,
  facts: null,
  report: null,
  reportStatus: "idle" as ReportStatus,
  reportNote: null,
  simStatus: "idle" as SimStatus,
  simError: null,
  stage: "builder" as Stage,
};

function canLaunchLocal(config: MissionConfig, confirmations: Record<TeamRole, boolean>): boolean {
  return !config.teamMode || allConfirmed(confirmations);
}

export const useMissionStore = create<MissionStore>((set, get) => ({
  config: createDefaultMission(),
  weather: WEATHER_SNAPSHOT,
  weatherLive: false,
  stage: "scenario",
  view: "orbit",
  activeRole: "solo",
  confirmations: emptyConfirmations(),
  roomCode: null,
  simStatus: "idle",
  simError: null,
  summary: null,
  facts: null,
  report: null,
  reportStatus: "idle",
  reportNote: null,
  reportLevel: "engineer",
  leaderboard: [],
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    const fromUrl = readDesignFromUrl();
    const nextConfig = fromUrl ?? get().config;
    set({
      hydrated: true,
      leaderboard: loadLeaderboard(),
      config: nextConfig,
      stage: fromUrl ? "builder" : "scenario",
      activeRole: nextConfig.teamMode ? "planner" : "solo",
      roomCode: nextConfig.teamMode ? generateRoomCode() : null,
      confirmations: emptyConfirmations(),
    });

    fetch("/api/spaceweather")
      .then((response) => response.json())
      .then((weather: SpaceWeather) => {
        if (typeof weather?.kpIndex === "number") {
          set({ weather, weatherLive: !weather.stale });
        }
      })
      .catch(() => {
        set({ weatherLive: false });
      });
  },

  setStage: (stage) => set({ stage }),
  setView: (view) => set({ view }),

  setScenario: (scenarioId) => {
    const old = get().config;
    const next = createDefaultMission(scenarioId, old.difficulty);
    set({
      config: { ...next, teamMode: old.teamMode },
      confirmations: emptyConfirmations(),
      ...CLEARED_RESULTS,
      stage: "builder",
    });
  },

  setOrbit: (orbitId) => {
    set({
      config: sanitizeMission({ ...get().config, orbitId }),
      confirmations: emptyConfirmations(),
      ...CLEARED_RESULTS,
    });
  },

  setRocket: (rocketId) => {
    set({
      config: sanitizeMission({ ...get().config, rocketId }),
      confirmations: emptyConfirmations(),
      ...CLEARED_RESULTS,
    });
  },

  setPart: (category, partId) => {
    const config = get().config;
    set({
      config: sanitizeMission({
        ...config,
        parts: { ...config.parts, [category]: partId },
      }),
      confirmations: emptyConfirmations(),
      ...CLEARED_RESULTS,
    });
  },

  setDifficulty: (difficulty) => {
    set({
      config: sanitizeMission({ ...get().config, difficulty }),
      confirmations: emptyConfirmations(),
      ...CLEARED_RESULTS,
    });
  },

  setSciencePriority: (sciencePriority) => {
    set({
      config: sanitizeMission({ ...get().config, sciencePriority }),
      confirmations: emptyConfirmations(),
      ...CLEARED_RESULTS,
    });
  },

  setBudget: (role, value) => {
    const config = get().config;
    const scenario = getScenario(config.scenarioId);
    const difficulty = getDifficulty(config.difficulty);
    const max = effectiveBudget(scenario, difficulty);
    const clamped = Math.round(Math.max(0, Math.min(value, max)) * 10) / 10;
    set({
      config: {
        ...config,
        budgets: { ...config.budgets, [role]: clamped },
      },
      confirmations: emptyConfirmations(),
      ...CLEARED_RESULTS,
    });
  },

  setActiveRole: (role) => set({ activeRole: role }),

  setTeamMode: (enabled) => {
    const config = get().config;
    if (enabled) {
      set({
        config: { ...config, teamMode: true },
        activeRole: config.teamMode ? get().activeRole : "planner",
        roomCode: get().roomCode ?? generateRoomCode(),
        confirmations: emptyConfirmations(),
        ...CLEARED_RESULTS,
      });
    } else {
      set({
        config: { ...config, teamMode: false },
        activeRole: "solo",
        roomCode: null,
        confirmations: emptyConfirmations(),
        ...CLEARED_RESULTS,
      });
    }
  },

  createRoom: () => {
    set({
      config: { ...get().config, teamMode: true },
      activeRole: "planner",
      roomCode: generateRoomCode(),
      confirmations: emptyConfirmations(),
      ...CLEARED_RESULTS,
    });
  },

  joinRoom: (code) => {
    const clean = code.trim().toUpperCase().slice(0, 4);
    if (clean.length !== 4) return;
    set({
      config: { ...get().config, teamMode: true },
      activeRole: "planner",
      roomCode: clean,
      confirmations: emptyConfirmations(),
      ...CLEARED_RESULTS,
    });
  },

  leaveRoom: () => {
    set({
      config: { ...get().config, teamMode: false },
      activeRole: "solo",
      roomCode: null,
      confirmations: emptyConfirmations(),
      ...CLEARED_RESULTS,
    });
  },

  toggleConfirmation: (role) => {
    set({
      confirmations: {
        ...get().confirmations,
        [role]: !get().confirmations[role],
      },
    });
  },

  setWeather: (weather) => set({ weather, weatherLive: !weather.stale }),

  launch: () => {
    const { config, weather, confirmations } = get();
    if (!canLaunchLocal(config, confirmations)) return;

    const resolved = resolveMission(config, weather);
    const rules = evaluateMission(resolved);
    if (!rules.pass) {
      set({
        simError: `Fix ${rules.blockingFailures.map((failure) => failure.label).join(", ")} before launch.`,
        stage: "builder",
      });
      return;
    }

    set({
      stage: "results",
      simStatus: "running",
      simError: null,
      summary: null,
      facts: null,
      report: null,
      reportStatus: "idle",
      reportNote: null,
    });

    const finish = (summary: MonteCarloSummary) => {
      const resolvedNow = resolveMission(config, weather);
      const rulesNow = evaluateMission(resolvedNow);
      const coordination = teamCoordination(config, rulesNow);
      const score = scoreMission(resolvedNow, rulesNow, summary, coordination);
      const facts = buildFacts(resolvedNow, rulesNow, summary, score);
      const report = buildFallbackReport(facts, get().reportLevel);
      set({
        summary,
        facts,
        report,
        reportStatus: "template",
        simStatus: "done",
        stage: "results",
        simError: null,
      });
      get().saveScore(facts, summary, config);
      void get().regenerateReport();
    };

    const runLocally = () => {
      try {
        const summary = runMonteCarloSimulation(config, weather, 1000, config.seed, true);
        finish(summary);
      } catch (error) {
        set({
          simStatus: "error",
          simError: error instanceof Error ? error.message : "Simulation failed.",
        });
      }
    };

    try {
      const worker = new Worker(
        new URL("../engine/montecarlo.worker.ts", import.meta.url),
        { type: "module" },
      );
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        worker.terminate();
        runLocally();
      }, 20000);

      worker.onmessage = (event: MessageEvent<{ type: string; summary?: MonteCarloSummary }>) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        worker.terminate();
        if (event.data.type === "result" && event.data.summary) {
          finish(event.data.summary);
        } else {
          runLocally();
        }
      };

      worker.onerror = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        worker.terminate();
        runLocally();
      };

      worker.postMessage({
        config,
        weather,
        runs: 1000,
        seed: config.seed,
        includeImprovements: true,
      });
    } catch {
      setTimeout(runLocally, 30);
    }
  },

  applyImprovement: (improvement) => {
    const config = get().config;
    let next = config;
    if (improvement.kind === "part" && improvement.partCategory && improvement.toId) {
      next = {
        ...config,
        parts: { ...config.parts, [improvement.partCategory]: improvement.toId },
      };
    } else if (improvement.kind === "rocket" && improvement.toId) {
      next = { ...config, rocketId: improvement.toId };
    } else if (improvement.kind === "orbit" && improvement.toId) {
      next = { ...config, orbitId: improvement.toId };
    }
    set({
      config: sanitizeMission(next),
      confirmations: emptyConfirmations(),
      ...CLEARED_RESULTS,
      view: "assembly",
    });
  },

  setReportLevel: (level) => {
    const facts = get().facts;
    set({ reportLevel: level });
    if (!facts) return;
    set({
      report: buildFallbackReport(facts, level),
      reportStatus: "template",
      reportNote: null,
    });
    void get().regenerateReport();
  },

  regenerateReport: () => {
    const facts = get().facts;
    if (!facts) return;
    const level = get().reportLevel;
    const template = buildFallbackReport(facts, level);
    set({ report: template, reportStatus: "loading", reportNote: null });

    requestLlmReport(facts, level)
      .then((result) => {
        if (get().facts !== facts) return;
        if (result.available && result.headline && result.sections?.length) {
          set({
            report: {
              headline: result.headline,
              sections: result.sections,
              source: "llm",
              level,
            },
            reportStatus: "llm",
            reportNote: result.model
              ? `Explained by ${result.model} from the engine facts.`
              : "Explained by a hosted model from the engine facts.",
          });
        } else {
          set({
            report: template,
            reportStatus: "template",
            reportNote: result.reason ?? "Template report used.",
          });
        }
      })
      .catch(() => {
        if (get().facts !== facts) return;
        set({
          report: template,
          reportStatus: "template",
          reportNote: "Report proxy unavailable. The template report is being used.",
        });
      });
  },

  saveScore: (facts, summary, config) => {
    if (typeof window === "undefined") return;
    const entry: LeaderboardEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      scenarioId: facts.scenario.id,
      scenarioName: facts.scenario.name,
      grade: facts.score.grade,
      score: facts.score.total,
      successProbability: summary.successProbability,
      costM: facts.design.totalCostM,
      designLabel: designLabel(config),
      createdAt: new Date().toISOString(),
      link: buildShareUrl(config),
    };
    const leaderboard = mergeLeaderboardEntry(get().leaderboard, entry);
    set({ leaderboard });
  },

  clearScores: () => set({ leaderboard: clearLeaderboard() }),

  reset: () => {
    set({
      config: createDefaultMission(),
      view: "orbit",
      activeRole: "solo",
      confirmations: emptyConfirmations(),
      roomCode: null,
      ...CLEARED_RESULTS,
      stage: "scenario",
      reportLevel: "engineer",
    });
  },
}));

export function useResolvedMission() {
  const config = useMissionStore((state) => state.config);
  const weather = useMissionStore((state) => state.weather);
  return resolveMission(config, weather);
}

export function useCanEdit() {
  const role = useMissionStore((state) => state.activeRole);
  return (field: EditField) => {
    if (role === "solo") return true;
    const info = {
      planner: ["scenario", "difficulty", "orbit", "rocket"],
      engineer: ["panel", "battery", "radio", "computer"],
      scientist: ["camera", "sciencePriority"],
      budget: ["budgets"],
    } as const;
    return (info[role as Exclude<Role, "solo">] as readonly string[]).includes(field);
  };
}

export type { SimulationContext };
