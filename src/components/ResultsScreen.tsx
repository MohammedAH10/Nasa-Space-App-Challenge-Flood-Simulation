"use client";

import { useState } from "react";
import { useMissionStore } from "@/store/mission";
import { buildShareUrl } from "@/lib/share";
import { failureColor, money, pct } from "@/lib/format";
import Leaderboard from "./Leaderboard";

function gradeClass(grade: string): string {
  return `grade-${grade.replace("+", "p")}`;
}

function SuccessRing({ probability, grade }: { probability: number; grade: string }) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(1, probability)));
  const color = probability >= 0.75 ? "#34d399" : probability >= 0.5 ? "#fbbf24" : "#fb7185";
  return (
    <div className="success-ring">
      <svg viewBox="0 0 140 140" role="img" aria-label={`${pct(probability, 0)} mission success probability`}>
        <circle cx="70" cy="70" r={radius} className="ring-bg" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          className="ring-value"
          style={{ stroke: color, strokeDasharray: circumference, strokeDashoffset: offset }}
        />
      </svg>
      <div className="ring-center">
        <strong>{pct(probability, 0)}</strong>
        <span>success</span>
        <em className={gradeClass(grade)}>{grade}</em>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="score-bar">
      <span>{label}</span>
      <div className="score-track">
        <span style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
      </div>
      <strong>{value.toFixed(1)}<small>/{max}</small></strong>
    </div>
  );
}

function RunningState() {
  const config = useMissionStore((state) => state.config);
  return (
    <div className="results-screen">
      <div className="running-panel">
        <div className="radar">
          <span className="radar-sweep" />
          <span className="radar-dot dot-a" />
          <span className="radar-dot dot-b" />
          <span className="radar-dot dot-c" />
        </div>
        <div>
          <span className="eyebrow">Monte Carlo in progress</span>
          <h1>Running 1,000 possible missions…</h1>
          <p className="muted">
            Sampling launch reliability, component hazards, solar storms, panel degradation, and
            schedule delays for <strong>{config.orbitId}</strong>. The worker falls back to the main
            thread automatically if workers are unavailable.
          </p>
          <div className="running-steps">
            <span className="active">Launch & orbit insertion</span>
            <span>Component & storm hazards</span>
            <span>Science delivery & totals</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorState() {
  const simError = useMissionStore((state) => state.simError);
  const setStage = useMissionStore((state) => state.setStage);
  return (
    <div className="results-screen">
      <div className="error-panel">
        <span className="eyebrow">Simulation stopped</span>
        <h1>We could not finish the run.</h1>
        <p>{simError ?? "The engine returned an unexpected error."}</p>
        <button type="button" className="btn primary" onClick={() => setStage("builder")}>
          Back to the design console
        </button>
      </div>
    </div>
  );
}

export default function ResultsScreen() {
  const simStatus = useMissionStore((state) => state.simStatus);
  const summary = useMissionStore((state) => state.summary);
  const facts = useMissionStore((state) => state.facts);
  const report = useMissionStore((state) => state.report);
  const reportStatus = useMissionStore((state) => state.reportStatus);
  const reportNote = useMissionStore((state) => state.reportNote);
  const reportLevel = useMissionStore((state) => state.reportLevel);
  const config = useMissionStore((state) => state.config);
  const setStage = useMissionStore((state) => state.setStage);
  const setReportLevel = useMissionStore((state) => state.setReportLevel);
  const regenerateReport = useMissionStore((state) => state.regenerateReport);
  const applyImprovement = useMissionStore((state) => state.applyImprovement);
  const [copied, setCopied] = useState(false);

  if (simStatus === "running") return <RunningState />;
  if (simStatus === "error") return <ErrorState />;
  if (!summary || !facts || !report) return <ErrorState />;

  const copyShare = async () => {
    const url = buildShareUrl(config);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // clipboard may be unavailable
    }
  };

  const downloadFacts = () => {
    const blob = new Blob([JSON.stringify(facts, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orbit-quest-${facts.scenario.id}-facts.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const maxFailure = Math.max(1, ...summary.failureBreakdown.map((failure) => failure.count));

  return (
    <div className="results-screen">
      <header className="results-header">
        <div>
          <span className="eyebrow">Mission report · {facts.scenario.region}</span>
          <h1>{report.headline}</h1>
          <p className="results-verdict">{facts.verdict}</p>
        </div>
        <div className="results-actions">
          <button type="button" className="btn ghost" onClick={() => setStage("builder")}>
            Back to builder
          </button>
          <button type="button" className="btn ghost" onClick={copyShare}>
            {copied ? "Link copied" : "Copy share link"}
          </button>
          <button type="button" className="btn ghost" onClick={downloadFacts}>
            Download facts JSON
          </button>
          <button type="button" className="btn primary" onClick={() => setStage("scenario")}>
            New scenario
          </button>
        </div>
      </header>

      <section className="summary-grid">
        <div className={`summary-card success-card ${gradeClass(facts.score.grade)}`}>
          <SuccessRing probability={summary.successProbability} grade={facts.score.grade} />
          <div className="summary-card-copy">
            <span className="eyebrow">Monte Carlo result</span>
            <h3>{summary.successes.toLocaleString()} of {summary.runs.toLocaleString()} runs succeeded</h3>
            <p className="muted small">
              Score <strong>{facts.score.total.toFixed(1)}</strong> / 100 · grade{" "}
              <strong className={gradeClass(facts.score.grade)}>{facts.score.grade}</strong>. Seed{" "}
              {summary.seed.toLocaleString()}.
            </p>
            <div className="mini-stats">
              <span><small>Median science</small><strong>{pct(summary.medianScienceReturn, 0)}</strong></span>
              <span><small>Delivered</small><strong>{pct(summary.deliveredFraction, 0)}</strong></span>
              <span><small>Mean survival</small><strong>{summary.meanMonthsSurvived.toFixed(1)} mo</strong></span>
            </div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-head">
            <span className="eyebrow">Score breakdown</span>
            <strong className={gradeClass(facts.score.grade)}>{facts.score.grade}</strong>
          </div>
          <div className="score-bars">
            <ScoreBar label="Simulated success" value={facts.score.successPoints} max={50} color="#38bdf8" />
            <ScoreBar label="Science return" value={facts.score.sciencePoints} max={25} color="#34d399" />
            <ScoreBar label="Budget efficiency" value={facts.score.budgetPoints} max={15} color="#fbbf24" />
            <ScoreBar label="Team coordination" value={facts.score.coordinationPoints} max={10} color="#f472b6" />
          </div>
          <p className="muted tiny">
            Success dominates the score. Budget efficiency rewards leaving money unspent; team
            coordination rewards role caps that match real spend.
          </p>
        </div>

        <div className="summary-card">
          <div className="card-head">
            <span className="eyebrow">Spacecraft & launch</span>
            <span className="pass-badge pass">{facts.design.orbitType}</span>
          </div>
          <div className="mini-facts">
            <div><span>Launcher</span><strong>{facts.design.rocket}</strong></div>
            <div><span>Orbit</span><strong>{facts.design.orbit}</strong></div>
            <div><span>Mass</span><strong>{facts.design.totalMassKg.toFixed(1)} / {facts.design.capacityKg} kg</strong></div>
            <div><span>Cost</span><strong>{money(facts.design.totalCostM)} / {money(facts.scenario.budgetM)}</strong></div>
            <div><span>Power</span><strong>{facts.design.generationW.toFixed(0)} / {facts.design.loadW.toFixed(0)} W</strong></div>
            <div><span>Eclipse</span><strong>{facts.design.eclipseHours.toFixed(2)} h</strong></div>
          </div>
          <div className="weather-summary">
            <span className={`status-dot ${facts.weather.kpIndex >= 6 ? "fail" : facts.weather.kpIndex >= 4 ? "warn" : "ok"}`} />
            Kp {facts.weather.kpIndex} · storm risk {pct(facts.weather.stormProbability, 0)} ·{" "}
            {facts.weather.stale ? "static fallback" : "live NOAA"}
          </div>
        </div>
      </section>

      <div className="results-columns">
        <div className="results-main">
          <section className="panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Failure attribution</span>
                <h3>What ended the failed runs</h3>
              </div>
              <span className="muted tiny">
                Percent of {(summary.runs - summary.successes).toLocaleString()} failed missions
              </span>
            </div>
            <div className="failure-list">
              {summary.failureBreakdown.map((failure) => (
                <div key={failure.cause} className="failure-row">
                  <span className="failure-label">
                    <span className="failure-dot" style={{ background: failureColor(failure.cause) }} />
                    {failure.label}
                  </span>
                  <div className="failure-track">
                    <span
                      style={{
                        width: `${Math.min(100, (failure.count / maxFailure) * 100)}%`,
                        background: failureColor(failure.cause),
                      }}
                    />
                  </div>
                  <strong>{failure.count}</strong>
                  <span className="failure-pct">{failure.percent.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Margin review</span>
                <h3>Constraints closest to the edge</h3>
              </div>
            </div>
            <div className="constraint-cards">
              {facts.results.tightConstraints.length === 0 ? (
                <p className="muted small">No resource is close to its limit. This design has healthy margins.</p>
              ) : (
                facts.results.tightConstraints.map((constraint) => (
                  <div key={constraint.id} className={`constraint-card ${constraint.status}`}>
                    <div className="constraint-head">
                      <strong>{constraint.label}</strong>
                      <span className={`constraint-status ${constraint.status}`}>
                        {constraint.status === "fail" ? "Over limit" : constraint.status === "warn" ? "Tight" : "Healthy"}
                      </span>
                    </div>
                    <p>{constraint.message}</p>
                    <small>{constraint.why}</small>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Engine-tested fixes</span>
                <h3>Best next changes</h3>
              </div>
              <span className="muted tiny">Each option was rerun through the simulation.</span>
            </div>
            {summary.improvements.length === 0 ? (
              <p className="muted small">
                No single affordable swap clearly improves this design. Rebalance role budgets,
                change the orbit, or free cost by using a smaller launcher before trying again.
              </p>
            ) : (
              <div className="improvement-grid">
                {summary.improvements.map((improvement) => (
                  <article key={improvement.id} className={`improvement-card ${improvement.feasible ? "" : "infeasible"}`}>
                    <div className="improvement-head">
                      <span className="eyebrow">{improvement.kind}</span>
                      <strong className={improvement.delta >= 0 ? "good" : "bad"}>
                        {improvement.delta >= 0 ? "+" : ""}
                        {(improvement.delta * 100).toFixed(1)} pts
                      </strong>
                    </div>
                    <h4>{improvement.label}</h4>
                    <p>{improvement.description}</p>
                    <div className="improvement-meta">
                      <span>{pct(improvement.successProbability, 0)} success</span>
                      <span>{improvement.costM >= 0 ? `+${money(improvement.costM)}` : money(improvement.costM)}</span>
                    </div>
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={() => applyImprovement(improvement)}
                    >
                      Apply & rebuild
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="panel reference-panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Reality check</span>
                <h3>{facts.referenceMission ? facts.referenceMission.name : "No reference mission"}</h3>
              </div>
              {facts.referenceMission ? (
                <a className="text-btn" href={facts.referenceMission.url} target="_blank" rel="noreferrer">
                  Source ↗
                </a>
              ) : null}
            </div>
            {facts.referenceMission ? (
              <>
                <p className="muted small">{facts.referenceMission.note}</p>
                <div className="reference-grid">
                  <div><span>Agency</span><strong>{facts.referenceMission.agency}</strong></div>
                  <div><span>Launched</span><strong>{facts.referenceMission.launched}</strong></div>
                  <div><span>Mass</span><strong>{facts.referenceMission.massKg.toLocaleString()} kg</strong></div>
                  <div><span>Power</span><strong>{facts.referenceMission.powerW.toLocaleString()} W</strong></div>
                  <div><span>Orbit</span><strong>{facts.referenceMission.orbitType} · {facts.referenceMission.altitudeKm.toLocaleString()} km</strong></div>
                  <div><span>Design life</span><strong>{facts.referenceMission.designLifeYears} years</strong></div>
                </div>
                <p className="muted tiny">{facts.referenceMission.source}</p>
              </>
            ) : null}
          </section>

          <Leaderboard />
        </div>

        <aside className="report-column">
          <section className="panel report-panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Plain-language report</span>
                <h3>{report.headline}</h3>
              </div>
              <span className={`report-source ${report.source}`}>
                {reportStatus === "loading" ? "Writing…" : report.source === "llm" ? "Hosted LLM" : "Engine template"}
              </span>
            </div>

            <div className="report-controls">
              <div className="level-toggle" role="group" aria-label="Reading level">
                <button
                  type="button"
                  className={reportLevel === "cadet" ? "active" : ""}
                  onClick={() => setReportLevel("cadet")}
                >
                  Cadet
                </button>
                <button
                  type="button"
                  className={reportLevel === "engineer" ? "active" : ""}
                  onClick={() => setReportLevel("engineer")}
                >
                  Engineer
                </button>
              </div>
              <button
                type="button"
                className="text-btn"
                onClick={regenerateReport}
                disabled={reportStatus === "loading"}
              >
                {reportStatus === "loading" ? "Regenerating…" : "Regenerate"}
              </button>
            </div>

            {reportStatus === "loading" ? (
              <div className="report-loading">
                <span className="spinner" />
                Showing the engine template while a hosted model rewrites it.
              </div>
            ) : null}

            <div className="report-body">
              {report.sections.map((section) => (
                <div key={section.heading} className="report-section">
                  <h4>{section.heading}</h4>
                  <p>{section.body}</p>
                </div>
              ))}
            </div>

            <footer className="report-foot">
              <p className="muted tiny">
                {reportNote ??
                  "The model receives engine facts only. It cannot create numbers, change the design, or alter the simulation."}
              </p>
              <p className="muted tiny">
                Generated {new Date(facts.generatedAt).toLocaleString()} · weather source:{" "}
                {facts.weather.source}
              </p>
            </footer>
          </section>
        </aside>
      </div>
    </div>
  );
}
