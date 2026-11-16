"use client";

import { useMemo } from "react";
import { ACHIEVEMENTS } from "../achievements";
import { formatDeltaV, formatMass } from "../physics";
import { useMoonStore } from "../store";
import { evaluateBuild } from "../validation";

export default function HangarPanel() {
  const build = useMoonStore((state) => state.build);
  const hasSave = useMoonStore((state) => state.hasSave);
  const bestScore = useMoonStore((state) => state.bestScore);
  const runs = useMoonStore((state) => state.runs);
  const achievements = useMoonStore((state) => state.achievements);
  const setStage = useMoonStore((state) => state.setStage);
  const resetBuild = useMoonStore((state) => state.resetBuild);
  const loadBlueprint = useMoonStore((state) => state.loadBlueprint);
  const evaluation = useMemo(() => evaluateBuild(build), [build]);

  if (!hasSave) {
    return (
      <section className="moon-hangar empty">
        <div>
          <span className="moon-eyebrow">Your hangar</span>
          <h2>No saved rocket yet</h2>
          <p>
            Build a rocket and it will wait for you here next time. Progress
            saves in this browser.
          </p>
        </div>
        <button
          type="button"
          className="moon-btn primary"
          onClick={() => setStage("assembly")}
        >
          Start building
        </button>
      </section>
    );
  }

  return (
    <section className="moon-hangar">
      <div className="moon-hangar-main">
        <div className="moon-hangar-heading">
          <div>
            <span className="moon-eyebrow">Saved hangar</span>
            <h2>{build.name || "Moon Squad 1"}</h2>
          </div>
          <span className={`moon-readiness ${evaluation.rating}`}>
            {evaluation.rating === "ready"
              ? "Ready"
              : evaluation.rating === "risky"
                ? "Risky"
                : "Blocked"}
          </span>
        </div>

        <div className="moon-hangar-stats">
          <div>
            <span>Range</span>
            <strong>{formatDeltaV(evaluation.stats.netDeltaVMS)}</strong>
          </div>
          <div>
            <span>Mass</span>
            <strong>{formatMass(evaluation.stats.wetMassKg)}</strong>
          </div>
          <div>
            <span>Parts</span>
            <strong>{evaluation.stats.partCount}/7</strong>
          </div>
          <div>
            <span>Best score</span>
            <strong>{bestScore > 0 ? bestScore : "—"}</strong>
          </div>
        </div>

        <div className="moon-hangar-actions">
          <button
            type="button"
            className="moon-btn primary"
            onClick={() => setStage("assembly")}
          >
            Continue rocket
          </button>
          <button type="button" className="moon-btn ghost" onClick={loadBlueprint}>
            Nova&apos;s blueprint
          </button>
          <button type="button" className="moon-btn ghost" onClick={resetBuild}>
            Start fresh
          </button>
        </div>
      </div>

      <div className="moon-hangar-side">
        <div>
          <span className="moon-hangar-label">Missions flown</span>
          <strong>{runs}</strong>
        </div>
        <div>
          <span className="moon-hangar-label">Badges</span>
          <strong>
            {achievements.length}/{ACHIEVEMENTS.length}
          </strong>
        </div>
        <div className="moon-hangar-badge-dots" aria-hidden="true">
          {ACHIEVEMENTS.map((badge) => (
            <span
              key={badge.id}
              className={achievements.includes(badge.id) ? "earned" : ""}
              title={badge.name}
            />
          ))}
        </div>
        <p>Saved locally in this browser.</p>
      </div>
    </section>
  );
}
