"use client";

import type { CSSProperties } from "react";
import { getAchievement } from "../achievements";
import { moonAudio } from "../audio";
import { MISSION } from "../constants";
import { formatDeltaV, formatMass } from "../physics";
import { useMoonStore } from "../store";
import Nova from "./Nova";

function Clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatTouchdown(kms: number): string {
  if (kms <= 0) return "—";
  return `${(kms * 1000).toFixed(0)} m/s`;
}

export default function ResultsScreen() {
  const result = useMoonStore((state) => state.launchResult);
  const startLaunch = useMoonStore((state) => state.startLaunch);
  const backToAssembly = useMoonStore((state) => state.backToAssembly);
  const goHome = useMoonStore((state) => state.goHome);

  if (!result) {
    return (
      <section className="moon-placeholder">
        <p className="moon-eyebrow">Mission report</p>
        <h1>No mission data yet.</h1>
        <button type="button" className="moon-btn ghost" onClick={backToAssembly}>
          Back to the shed
        </button>
      </section>
    );
  }

  const evaluation = result.evaluation;
  const stats = evaluation.stats;
  const badges = result.achievements
    .map((id) => getAchievement(id))
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const scoreStyle = { "--score": result.score } as CSSProperties;
  const rangePercent = Clamp((result.effectiveDeltaVMS / MISSION.requiredDeltaVMS) * 100, 0, 100);
  const steerPercent = (1 - result.steerError) * 100;
  const stagePercent = stats.hasBoosters ? result.stageQuality * 100 : 100;
  const reliabilityPercent = stats.reliability * 100;

  const novaMessage = result.success
    ? result.score >= 92
      ? "A perfect flight! The whole Moon Squad is cheering for you."
      : "You landed on the Moon! Try a smoother climb for a higher score."
    : result.failureReason === "fuel"
      ? "We ran out of range. A bigger tank, a vacuum engine, or boosters will help."
      : result.failureReason === "legs"
        ? "So close! Add landing legs for a soft touchdown."
        : result.failureReason === "course"
          ? "Follow the green steering marker more closely during the climb."
          : "The rocket needs more liftoff thrust. Try a stronger engine or boosters.";

  return (
    <section className="moon-results">
      <div className={`moon-result-hero ${result.success ? "success" : "failure"}`}>
        <div className="moon-result-copy">
          <p className="moon-eyebrow">Mission report · Luna Landing</p>
          <h1>
            {result.success ? "You landed on the Moon!" : result.headline}
          </h1>
          <p className="moon-result-lead">{result.message}</p>
          <div className="moon-result-name">
            <span>Rocket</span>
            <strong>{result.build.name || "Moon Squad 1"}</strong>
          </div>
          <div className="moon-result-actions">
            <button
              type="button"
              className="moon-btn primary"
              onClick={() => {
                moonAudio.play("click");
                startLaunch();
              }}
            >
              Fly this rocket again
            </button>
            <button
              type="button"
              className="moon-btn ghost"
              onClick={() => {
                moonAudio.play("click");
                backToAssembly();
              }}
            >
              Back to the shed
            </button>
            <button
              type="button"
              className="moon-btn ghost"
              onClick={() => {
                moonAudio.play("click");
                goHome();
              }}
            >
              Home
            </button>
          </div>
        </div>

        <div className="moon-score-card">
          <div className="moon-score-ring" style={scoreStyle}>
            <div className="moon-score-inner">
              <span className="moon-hud-label">Mission score</span>
              <strong>{result.score}</strong>
              <em>out of 100</em>
            </div>
          </div>
          <div className="moon-grade-row">
            <span className="moon-grade">{result.grade}</span>
            <span className="moon-stars" aria-label={`${result.stars} of 3 stars`}>
              {[0, 1, 2].map((index) => (
                <span key={index} className={index < result.stars ? "filled" : ""}>
                  ★
                </span>
              ))}
            </span>
          </div>
          <p className="moon-score-note">
            {result.success
              ? "The flag is planted and the crew is safe."
              : "Every test flight teaches us something new."}
          </p>
        </div>
      </div>

      <div className="moon-result-grid">
        <div className="moon-result-panel">
          <div className="moon-result-panel-head">
            <span className="moon-eyebrow">Flight breakdown</span>
            <span>{result.durationSeconds.toFixed(0)} seconds</span>
          </div>

          <div className="moon-result-rows">
            <div className="moon-result-row">
              <div className="moon-result-row-head">
                <span>Range margin</span>
                <strong>
                  {result.marginMS >= 0 ? "+" : ""}
                  {formatDeltaV(result.marginMS)}
                </strong>
              </div>
              <div className="moon-result-track">
                <span style={{ width: `${rangePercent}%` }} />
              </div>
              <em>
                {formatDeltaV(result.effectiveDeltaVMS)} effective ·{" "}
                {formatDeltaV(MISSION.requiredDeltaVMS)} needed
              </em>
            </div>

            <div className="moon-result-row">
              <div className="moon-result-row-head">
                <span>Steering accuracy</span>
                <strong>{Math.round(steerPercent)}%</strong>
              </div>
              <div className="moon-result-track cyan">
                <span style={{ width: `${Clamp(steerPercent, 0, 100)}%` }} />
              </div>
              <em>
                {result.steerError <= 0.12
                  ? "Steady hands, commander."
                  : "Follow the green marker for a smoother line."}
              </em>
            </div>

            <div className="moon-result-row">
              <div className="moon-result-row-head">
                <span>Booster staging</span>
                <strong>
                  {stats.hasBoosters ? `${Math.round(stagePercent)}%` : "Single stage"}
                </strong>
              </div>
              <div className="moon-result-track yellow">
                <span style={{ width: `${Clamp(stagePercent, 0, 100)}%` }} />
              </div>
              <em>
                {!stats.hasBoosters
                  ? "No boosters fitted on this rocket."
                  : result.stageQuality >= 0.95
                    ? "Perfect timing in the window."
                    : "Tap STAGE while the button glows."}
              </em>
            </div>

            <div className="moon-result-row">
              <div className="moon-result-row-head">
                <span>Build reliability</span>
                <strong>{reliabilityPercent.toFixed(1)}%</strong>
              </div>
              <div className="moon-result-track green">
                <span style={{ width: `${reliabilityPercent}%` }} />
              </div>
              <em>
                {stats.partCount} parts · {formatMass(stats.wetMassKg)} · {stats.cost} credits
              </em>
            </div>

            <div className="moon-result-mini-grid">
              <div>
                <span>Touchdown</span>
                <strong>{formatTouchdown(result.touchdownSpeedKms)}</strong>
              </div>
              <div>
                <span>Stability</span>
                <strong>{Math.round(stats.stability * 100)}%</strong>
              </div>
              <div>
                <span>Parts fitted</span>
                <strong>{stats.partCount}/7</strong>
              </div>
              <div>
                <span>Landing bonus</span>
                <strong>{Math.round(stats.landingBonus * 100)}%</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="moon-result-panel">
          <div className="moon-result-panel-head">
            <span className="moon-eyebrow">New badges</span>
            <span>{badges.length} earned</span>
          </div>

          {badges.length > 0 ? (
            <div className="moon-badge-list">
              {badges.map((badge) => (
                <div key={badge.id} className="moon-badge">
                  <span className="moon-badge-star">★</span>
                  <div>
                    <strong>{badge.name}</strong>
                    <span>{badge.description}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="moon-badge-empty">
              <span className="moon-badge-star">☆</span>
              <p>No new badges this run. Try a new design or a cleaner flight.</p>
            </div>
          )}

          <div className="moon-result-nova">
            <Nova
              message={novaMessage}
              mood={result.success ? "happy" : "warn"}
              compact
            />
          </div>
        </div>
      </div>
    </section>
  );
}
