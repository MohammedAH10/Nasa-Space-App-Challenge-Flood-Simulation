"use client";

import type { CSSProperties } from "react";
import {
  DIFFICULTIES,
  REAL_MISSIONS,
  SCENARIOS,
  getRealMission,
} from "@/engine/data";
import { useMissionStore } from "@/store/mission";
import { money } from "@/lib/format";
import Leaderboard from "./Leaderboard";

export default function ScenarioScreen() {
  const difficulty = useMissionStore((state) => state.config.difficulty);
  const setDifficulty = useMissionStore((state) => state.setDifficulty);
  const setScenario = useMissionStore((state) => state.setScenario);
  const setStage = useMissionStore((state) => state.setStage);
  const setView = useMissionStore((state) => state.setView);
  const activeDifficulty = DIFFICULTIES.find((item) => item.id === difficulty) ?? DIFFICULTIES[1];

  const chooseDifficulty = (id: typeof difficulty) => {
    setDifficulty(id);
    setStage("scenario");
  };

  const start = (scenarioId: string) => {
    setScenario(scenarioId);
    setView("orbit");
  };

  return (
    <div className="scenario-screen">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">NASA Space Apps · engineering sandbox</span>
          <h1>
            Design a satellite.
            <br />
            <span className="gradient-text">Defend every number.</span>
          </h1>
          <p className="hero-lede">
            A deterministic mission engine computes mass, power, eclipse energy, downlink, and
            budget in real time. Then 1,000 Monte Carlo runs test whether your design survives
            launch, storms, component failures, and 18 months in orbit.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn primary large" onClick={() => start("flood-watch")}>
              Start the flood-watch mission
            </button>
            <button
              type="button"
              className="btn ghost large"
              onClick={() => document.getElementById("scenarios")?.scrollIntoView({ behavior: "smooth" })}
            >
              Compare scenarios
            </button>
          </div>
          <div className="hero-stats">
            <span><strong>1,000</strong> runs per launch</span>
            <span><strong>6</strong> live constraints</span>
            <span><strong>0</strong> accounts required</span>
            <span><strong>100%</strong> browser-side solo play</span>
          </div>
        </div>

        <div className="hero-visual" aria-hidden>
          <div className="hero-grid" />
          <div className="hero-earth" />
          <div className="hero-orbit orbit-a">
            <span className="hero-sat" />
          </div>
          <div className="hero-orbit orbit-b" />
          <div className="hero-sun" />
          <div className="hero-readout readout-a">
            <span>POWER</span>
            <strong>87.2 W</strong>
            <small>of 87.0 W load</small>
          </div>
          <div className="hero-readout readout-b">
            <span>SUCCESS</span>
            <strong>74%</strong>
            <small>1,000 runs</small>
          </div>
          <div className="hero-readout readout-c">
            <span>FAILURES</span>
            <strong>component</strong>
            <small>then power</small>
          </div>
          <span className="hero-label">FLOOD-1 · SSO 550</span>
        </div>
      </section>

      <section className="section-head" id="scenarios">
        <div>
          <span className="eyebrow">Scenario library</span>
          <h2>Pick the mission, then the difficulty</h2>
        </div>
        <p>
          Every scenario changes the orbit trade, budget ceiling, and science requirement. Cadet
          mode removes storms and limits the part catalogue; Commander mode tightens the budget and
          raises failure rates.
        </p>
      </section>

      <div className="difficulty-row" role="group" aria-label="Difficulty">
        {DIFFICULTIES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`difficulty-card ${difficulty === item.id ? "active" : ""}`}
            onClick={() => chooseDifficulty(item.id)}
          >
            <span className="difficulty-name">{item.name}</span>
            <span className="difficulty-desc">{item.description}</span>
            <span className="difficulty-tags">
              {item.allowedPartTiers.length} part tiers · storm ×{item.stormScale.toFixed(2)} · budget ×
              {item.budgetScale.toFixed(2)}
            </span>
          </button>
        ))}
      </div>

      <div className="scenario-grid">
        {SCENARIOS.map((scenario) => {
          const reference = getRealMission(scenario.referenceMissionId);
          return (
            <button
              key={scenario.id}
              type="button"
              className="scenario-card"
              style={{ "--accent": scenario.accent } as CSSProperties}
              onClick={() => start(scenario.id)}
            >
              <span className="scenario-accent" />
              <span className="scenario-top">
                <span className="scenario-name">
                  <span className="scenario-dot" />
                  {scenario.name}
                </span>
                <span className="scenario-region">{scenario.region}</span>
              </span>
              <span className="scenario-objective">{scenario.objective}</span>
              <span className="scenario-brief">{scenario.brief}</span>
              <span className="scenario-meta">
                <span><small>Budget</small><strong>{money(scenario.budgetM)}</strong></span>
                <span><small>Lifetime</small><strong>{scenario.lifetimeMonths} mo</strong></span>
                <span><small>Revisit</small><strong>{scenario.maxRevisitDays} d</strong></span>
                <span><small>Deliver</small><strong>{Math.round(scenario.minDeliveredFraction * 100)}%</strong></span>
              </span>
              <span className="scenario-foot">
                <span className="scenario-ref">
                  {reference ? `Reference: ${reference.name} · ${reference.agency}` : "Reference mission attached"}
                </span>
                <span className="scenario-go">Design this mission →</span>
              </span>
            </button>
          );
        })}
      </div>

      <section className="landing-bottom">
        <div className="panel how-it-works">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Why this is honest</span>
              <h3>The simulation decides. The model only explains.</h3>
            </div>
          </div>
          <div className="how-grid">
            <div>
              <span className="how-num">01</span>
              <h4>Pure functions</h4>
              <p>Mass, power, eclipse battery, downlink, revisit, and budget are deterministic TypeScript. The same design always produces the same numbers.</p>
            </div>
            <div>
              <span className="how-num">02</span>
              <h4>Monte Carlo</h4>
              <p>A Web Worker samples launch reliability, component hazards, storms, panel degradation, and schedule delays, then records the first failure cause.</p>
            </div>
            <div>
              <span className="how-num">03</span>
              <h4>Engine-tested fixes</h4>
              <p>The engine reruns candidate swaps before they reach the report. The LLM cannot invent a recommendation or a number.</p>
            </div>
          </div>
          <div className="reference-strip">
            {REAL_MISSIONS.map((mission) => (
              <a key={mission.id} href={mission.url} target="_blank" rel="noreferrer">
                <strong>{mission.name}</strong>
                <span>{mission.massKg.toLocaleString()} kg · {mission.altitudeKm.toLocaleString()} km</span>
              </a>
            ))}
          </div>
        </div>
        <Leaderboard compact />
      </section>

      <p className="landing-note">
        Difficulty selected: <strong>{activeDifficulty.name}</strong>. Real-mission figures are cited
        in the data file and linked in the report.
      </p>
    </div>
  );
}
