"use client";

import { create } from "zustand";
import { ACHIEVEMENTS, missionAchievements } from "./achievements";
import { defaultBuild, recommendedBuild, REQUIRED_SLOTS, getPart } from "./parts";
import { loadProgress, saveProgress } from "./persistence";
import { evaluateBuild } from "./validation";
import type {
  GameStage,
  MissionResult,
  PartSlot,
  RocketBuild,
} from "./types";

interface FitPulse {
  slot: PartSlot;
  partId: string;
  nonce: number;
}

interface MoonStore {
  stage: GameStage;
  build: RocketBuild;
  selectedSlot: PartSlot | null;
  launchResult: MissionResult | null;
  achievements: string[];
  toasts: string[];
  bestScore: number;
  runs: number;
  soundOn: boolean;
  tutorialOpen: boolean;
  tutorialSeen: boolean;
  hydrated: boolean;
  lastFit: FitPulse | null;
  hydrate: () => void;
  setStage: (stage: GameStage) => void;
  selectSlot: (slot: PartSlot | null) => void;
  fitPart: (slot: PartSlot, partId: string) => void;
  clearSlot: (slot: PartSlot) => void;
  setBuildName: (name: string) => void;
  loadBlueprint: () => void;
  resetBuild: () => void;
  startLaunch: () => void;
  completeMission: (result: MissionResult) => void;
  backToAssembly: () => void;
  goHome: () => void;
  toggleSound: () => void;
  openTutorial: () => void;
  closeTutorial: () => void;
  dismissToast: () => void;
}

let pulse = 0;

export const useMoonStore = create<MoonStore>((set, get) => {
  const persist = () => {
    const state = get();
    saveProgress({
      build: state.build,
      bestScore: state.bestScore,
      runs: state.runs,
      achievements: state.achievements,
      soundOn: state.soundOn,
      tutorialSeen: state.tutorialSeen,
    });
  };

  const grant = (ids: string[]) => {
    const valid = new Set(ACHIEVEMENTS.map((item) => item.id));
    const current = get().achievements;
    const fresh = Array.from(
      new Set(ids.filter((id) => valid.has(id) && !current.includes(id))),
    );
    if (fresh.length === 0) return [];
    const merged = [...current, ...fresh];
    if (merged.length >= 6 && !merged.includes("badge-collector")) {
      merged.push("badge-collector");
      fresh.push("badge-collector");
    }
    set({
      achievements: merged,
      toasts: [...get().toasts, ...fresh],
    });
    persist();
    return fresh;
  };

  return {
    stage: "intro",
    build: defaultBuild(),
    selectedSlot: null,
    launchResult: null,
    achievements: [],
    toasts: [],
    bestScore: 0,
    runs: 0,
    soundOn: true,
    tutorialOpen: false,
    tutorialSeen: false,
    hydrated: false,
    lastFit: null,

    hydrate: () => {
      if (get().hydrated) return;
      const saved = loadProgress();
      if (saved) {
        set({
          build: saved.build,
          bestScore: saved.bestScore,
          runs: saved.runs,
          achievements: saved.achievements,
          soundOn: saved.soundOn,
          tutorialSeen: saved.tutorialSeen,
          hydrated: true,
        });
      } else {
        set({ hydrated: true });
      }
    },

    setStage: (stage) => set({ stage }),

    selectSlot: (selectedSlot) => set({ selectedSlot }),

    fitPart: (slot, partId) => {
      const part = getPart(partId);
      if (!part || part.slot !== slot) return;
      const build = get().build;
      const next: RocketBuild = {
        ...build,
        parts: { ...build.parts, [slot]: partId },
      };
      pulse += 1;
      set({
        build: next,
        selectedSlot: slot,
        launchResult: null,
        lastFit: { slot, partId, nonce: pulse },
      });
      const complete = REQUIRED_SLOTS.every((required) => next.parts[required]);
      grant(["first-part", ...(complete ? ["full-stack"] : [])]);
      persist();
    },

    clearSlot: (slot) => {
      const build = get().build;
      set({
        build: { ...build, parts: { ...build.parts, [slot]: null } },
        launchResult: null,
        lastFit: null,
      });
      persist();
    },

    setBuildName: (name) => {
      set({ build: { ...get().build, name: name.slice(0, 40) } });
      persist();
    },

    loadBlueprint: () => {
      set({
        build: recommendedBuild(),
        stage: "assembly",
        selectedSlot: null,
        launchResult: null,
        lastFit: null,
      });
      grant(["full-stack"]);
      persist();
    },

    resetBuild: () => {
      set({
        build: defaultBuild(),
        stage: "assembly",
        selectedSlot: null,
        launchResult: null,
        lastFit: null,
      });
      persist();
    },

    startLaunch: () => {
      const evaluation = evaluateBuild(get().build);
      if (!evaluation.canLaunch) return;
      set({
        stage: "launch",
        launchResult: null,
        runs: get().runs + 1,
      });
      grant(["first-launch"]);
      persist();
    },

    completeMission: (result) => {
      const current = get().achievements;
      const earned = missionAchievements(
        result.evaluation,
        result,
        get().runs,
      );
      const fresh = earned.filter((id) => !current.includes(id));
      set({
        stage: "results",
        launchResult: { ...result, achievements: fresh },
        bestScore: Math.max(get().bestScore, result.score),
      });
      grant(earned);
      persist();
    },

    backToAssembly: () => {
      set({ stage: "assembly", launchResult: null });
    },

    goHome: () => {
      set({ stage: "intro", launchResult: null });
    },

    toggleSound: () => {
      set({ soundOn: !get().soundOn });
      persist();
    },

    openTutorial: () => set({ tutorialOpen: true }),

    closeTutorial: () => {
      set({ tutorialOpen: false, tutorialSeen: true });
      persist();
    },

    dismissToast: () => {
      set({ toasts: get().toasts.slice(1) });
    },
  };
});
