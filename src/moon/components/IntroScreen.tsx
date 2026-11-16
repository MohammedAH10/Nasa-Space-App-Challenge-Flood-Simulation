"use client";

import { ACHIEVEMENTS } from "../achievements";
import { MISSION } from "../constants";
import { formatDeltaV } from "../physics";
import { useMoonStore } from "../store";

export default function IntroScreen() {
  const setStage = useMoonStore((state) => state.setStage);
  const loadBlueprint = useMoonStore((state) => state.loadBlueprint);
  const bestScore = useMoonStore((state) => state.bestScore);
  const runs = useMoonStore((state) => state.runs);
  const achievements = useMoonStore((state) => state.achievements);

  return (
    <div className="moon-intro">
      <div className="moon-intro-copy">
        <p className="moon-eyebrow">Moon Squad · Mission 01</p>
        <h1>
          Build a rocket.
          <br />
          <span>Fly to the Moon.</span>
        </h1>
        <p className="moon-intro-lead">
          Pick the parts, watch your rocket grow, and blast off on a mission to
          the Moon. Balance power, fuel, and a soft landing — then steer and
          stage your way through the sky.
        </p>

        <div className="moon-intro-actions">
          <button
            type="button"
            className="moon-btn primary"
            onClick={() => setStage("assembly")}
          >
            Start building
          </button>
          <button
            type="button"
            className="moon-btn ghost"
            onClick={loadBlueprint}
          >
            Load Nova&apos;s blueprint
          </button>
        </div>

        <div className="moon-intro-meta">
          <span className="moon-pill">
            Range needed <strong>{formatDeltaV(MISSION.requiredDeltaVMS)}</strong>
          </span>
          <span className="moon-pill">
            Best score <strong>{bestScore > 0 ? bestScore : "—"}</strong>
          </span>
          <span className="moon-pill">
            Missions flown <strong>{runs}</strong>
          </span>
          <span className="moon-pill">
            Badges{" "}
            <strong>
              {achievements.length}/{ACHIEVEMENTS.length}
            </strong>
          </span>
        </div>

        <div className="moon-feature-row">
          <article className="moon-feature">
            <span className="step">1</span>
            <strong>Build</strong>
            <span>
              Drag parts onto the rocket. Every tank, engine, and fin changes
              how it flies.
            </span>
          </article>
          <article className="moon-feature">
            <span className="step">2</span>
            <strong>Check</strong>
            <span>
              Watch the readiness panel. Green checks mean you are cleared for
              launch.
            </span>
          </article>
          <article className="moon-feature">
            <span className="step">3</span>
            <strong>Fly</strong>
            <span>
              Steer the rocket, stage the boosters, and land softly on the Moon.
            </span>
          </article>
        </div>
      </div>

      <div className="moon-intro-art" aria-hidden="true">
        <div className="moon-orbit-ring" />
        <div className="moon-moon-disc" />
        <div className="moon-rocket-art">
          <span className="nose" />
          <span className="body" />
          <span className="window" />
          <span className="fin left" />
          <span className="fin right" />
          <span className="flame" />
          <span className="smoke" />
        </div>
        <div className="moon-art-badge one">
          <span className="dot" />
          Flight plan ready
        </div>
        <div className="moon-art-badge two">
          <span className="dot" />
          384,400 km to go
        </div>
      </div>
    </div>
  );
}
