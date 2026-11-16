"use client";

import { useEffect } from "react";
import { useMoonStore } from "../store";

export default function MoonGame() {
  const stage = useMoonStore((state) => state.stage);
  const hydrated = useMoonStore((state) => state.hydrated);
  const hydrate = useMoonStore((state) => state.hydrate);
  const setStage = useMoonStore((state) => state.setStage);
  const loadBlueprint = useMoonStore((state) => state.loadBlueprint);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="moon-app">
      <header className="moon-topbar">
        <span className="moon-logo">MOON SQUAD</span>
        <span className="moon-topbar-chip">Mission: Luna Landing</span>
      </header>
      <main className="moon-main">
        {!hydrated ? (
          <div className="moon-boot">
            <span className="moon-spinner" />
            <p>Warming up the launch pad…</p>
          </div>
        ) : null}

        {hydrated && stage === "intro" ? (
          <section className="moon-placeholder">
            <p className="moon-eyebrow">Mission briefing</p>
            <h1>Build a rocket. Fly to the Moon.</h1>
            <p>
              Pick parts, check your rocket, and launch a mission to the Moon.
              Every part changes how far you can fly.
            </p>
            <div className="moon-placeholder-actions">
              <button type="button" className="moon-btn primary" onClick={() => setStage("assembly")}>
                Start building
              </button>
              <button type="button" className="moon-btn ghost" onClick={loadBlueprint}>
                Load Nova&apos;s blueprint
              </button>
            </div>
          </section>
        ) : null}

        {hydrated && stage === "assembly" ? (
          <section className="moon-placeholder">
            <p className="moon-eyebrow">Assembly bay</p>
            <h1>The rocket shed is almost ready.</h1>
            <button type="button" className="moon-btn ghost" onClick={() => setStage("intro")}>
              Back
            </button>
          </section>
        ) : null}

        {hydrated && stage === "launch" ? (
          <section className="moon-placeholder">
            <p className="moon-eyebrow">Launch complex</p>
            <h1>Launch sequence loading.</h1>
            <button type="button" className="moon-btn ghost" onClick={() => setStage("assembly")}>
              Back to the shed
            </button>
          </section>
        ) : null}

        {hydrated && stage === "results" ? (
          <section className="moon-placeholder">
            <p className="moon-eyebrow">Mission report</p>
            <h1>Mission report loading.</h1>
            <button type="button" className="moon-btn ghost" onClick={() => setStage("assembly")}>
              Back to the shed
            </button>
          </section>
        ) : null}
      </main>
    </div>
  );
}
