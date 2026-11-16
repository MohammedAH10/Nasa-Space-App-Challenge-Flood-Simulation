"use client";

import { useEffect } from "react";
import { useMoonStore } from "../store";
import AssemblyScreen from "./AssemblyScreen";
import IntroScreen from "./IntroScreen";
import LaunchScreen from "./LaunchScreen";

export default function MoonGame() {
  const stage = useMoonStore((state) => state.stage);
  const hydrated = useMoonStore((state) => state.hydrated);
  const hydrate = useMoonStore((state) => state.hydrate);
  const setStage = useMoonStore((state) => state.setStage);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
        <span className="moon-topbar-spacer" />
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

        {hydrated && stage === "results" ? (
          <section className="moon-placeholder">
            <p className="moon-eyebrow">Mission report</p>
            <h1>Mission report loading.</h1>
            <button
              type="button"
              className="moon-btn ghost"
              onClick={() => setStage("assembly")}
            >
              Back to the shed
            </button>
          </section>
        ) : null}
      </main>
    </div>
  );
}
