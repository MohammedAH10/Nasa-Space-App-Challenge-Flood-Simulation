"use client";

import { useEffect, useState } from "react";
import { useMissionStore } from "@/store/mission";
import TopBar from "./TopBar";
import TutorialModal from "./TutorialModal";
import ScenarioScreen from "./ScenarioScreen";
import BuilderScreen from "./BuilderScreen";
import ResultsScreen from "./ResultsScreen";

const TUTORIAL_KEY = "orbit-quest-tutorial-v1";

export default function GameShell() {
  const stage = useMissionStore((state) => state.stage);
  const hydrated = useMissionStore((state) => state.hydrated);
  const hydrate = useMissionStore((state) => state.hydrate);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated || stage !== "builder") return;
    try {
      if (!localStorage.getItem(TUTORIAL_KEY)) {
        const timer = setTimeout(() => setTutorialOpen(true), 250);
        return () => clearTimeout(timer);
      }
    } catch {
      // private mode is fine
    }
  }, [hydrated, stage]);

  const closeTutorial = () => {
    setTutorialOpen(false);
    try {
      localStorage.setItem(TUTORIAL_KEY, "seen");
    } catch {
      // ignore
    }
  };

  return (
    <div className="app-shell">
      <TopBar onOpenTutorial={() => setTutorialOpen(true)} />
      <main className="app-main">
        {stage === "scenario" ? <ScenarioScreen /> : null}
        {stage === "builder" ? <BuilderScreen /> : null}
        {stage === "results" ? <ResultsScreen /> : null}
      </main>
      <footer className="app-footer">
        <span>
          Orbit Quest · deterministic mission engine + optional LLM explainer
        </span>
        <span>
          Solo play runs entirely in your browser. Team rooms are a local rehearsal in this build.
        </span>
      </footer>
      {tutorialOpen ? <TutorialModal open onClose={closeTutorial} /> : null}
    </div>
  );
}
