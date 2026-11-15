"use client";

import { useMissionStore } from "@/store/mission";
import { pct } from "@/lib/format";

export default function Leaderboard({ compact = false }: { compact?: boolean }) {
  const leaderboard = useMissionStore((state) => state.leaderboard);
  const clearScores = useMissionStore((state) => state.clearScores);

  return (
    <section className={`panel leaderboard ${compact ? "compact" : ""}`}>
      <header className="panel-head">
        <div>
          <span className="eyebrow">Local leaderboard</span>
          <h3>Best designs on this machine</h3>
        </div>
        {leaderboard.length > 0 ? (
          <button type="button" className="text-btn danger" onClick={clearScores}>
            Clear
          </button>
        ) : null}
      </header>
      {leaderboard.length === 0 ? (
        <p className="muted small">
          No runs saved yet. Launch a simulation and the design will appear here, stored in
          localStorage with no account.
        </p>
      ) : (
        <ol className="leader-list">
          {leaderboard.slice(0, compact ? 3 : 8).map((entry, index) => (
            <li key={entry.id}>
              <span className="leader-rank">{String(index + 1).padStart(2, "0")}</span>
              <span className={`grade-badge grade-${entry.grade.replace("+", "p")}`}>{entry.grade}</span>
              <span className="leader-main">
                <strong>{entry.scenarioName}</strong>
                <small>
                  {entry.designLabel} · {pct(entry.successProbability, 0)} success · $
                  {entry.costM.toFixed(1)}M
                </small>
              </span>
              <span className="leader-score">{entry.score.toFixed(1)}</span>
              {entry.link ? (
                <a className="leader-open" href={entry.link} title="Open this shared design">
                  ↗
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
