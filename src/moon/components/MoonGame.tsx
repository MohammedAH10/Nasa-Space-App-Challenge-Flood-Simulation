"use client";

import { useEffect } from "react";
import { ACHIEVEMENTS } from "../achievements";
import { moonAudio } from "../audio";
import { useMoonStore } from "../store";
import AchievementToasts from "./AchievementToasts";
import AssemblyScreen from "./AssemblyScreen";
import IntroScreen from "./IntroScreen";
import LaunchScreen from "./LaunchScreen";
import ResultsScreen from "./ResultsScreen";

export default function MoonGame() {
  const stage = useMoonStore((state) => state.stage);
  const hydrated = useMoonStore((state) => state.hydrated);
  const hydrate = useMoonStore((state) => state.hydrate);
  const setStage = useMoonStore((state) => state.setStage);
  const bestScore = useMoonStore((state) => state.bestScore);
  const achievements = useMoonStore((state) => state.achievements);
  const soundOn = useMoonStore((state) => state.soundOn);
  const toggleSound = useMoonStore((state) => state.toggleSound);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    moonAudio.setEnabled(soundOn);
  }, [soundOn]);

  useEffect(() => {
    const unlock = () => moonAudio.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  return (
    <div className="moon-app">
      <header className="moon-topbar">
        <button
          type="button"
          className="moon-logo"
          onClick={() => setStage("intro")}
        >
          MOON SQUAD
        </button>
        <span className="moon-topbar-chip">Mission: Luna Landing</span>
        <span className="moon-topbar-chip">
          Best {bestScore > 0 ? bestScore : "—"} · {achievements.length}/
          {ACHIEVEMENTS.length} badges
        </span>
        <span className="moon-topbar-spacer" />
        <div className="moon-topbar-actions">
          <button
            type="button"
            className="moon-icon-btn"
            onClick={() => {
              if (!soundOn) moonAudio.unlock();
              else moonAudio.play("click");
              toggleSound();
            }}
            aria-pressed={soundOn}
            aria-label={soundOn ? "Mute sound" : "Turn sound on"}
            title={soundOn ? "Mute sound" : "Turn sound on"}
          >
            {soundOn ? "Sound on" : "Muted"}
          </button>
        </div>
      </header>

      <main className="moon-main">
        {!hydrated ? (
          <div className="moon-boot">
            <span className="moon-spinner" />
            <p>Warming up the launch pad…</p>
          </div>
        ) : null}

        {hydrated && stage === "intro" ? <IntroScreen /> : null}

        {hydrated && stage === "assembly" ? <AssemblyScreen /> : null}

        {hydrated && stage === "launch" ? <LaunchScreen /> : null}

        {hydrated && stage === "results" ? <ResultsScreen /> : null}
      </main>

      <AchievementToasts />
    </div>
  );
}
