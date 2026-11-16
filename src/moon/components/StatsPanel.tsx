"use client";

import type { CSSProperties } from "react";
import { MISSION } from "../constants";
import { formatDeltaV, formatMass, formatTwr } from "../physics";
import type { BuildCheck, BuildEvaluation } from "../types";

interface StatsPanelProps {
  evaluation: BuildEvaluation;
}

const STATUS_LABEL: Record<BuildCheck["status"], string> = {
  ok: "OK",
  warn: "WATCH",
  fail: "FIX",
};

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function Gauge({
  label,
  value,
  detail,
  percent,
  accent,
  target,
}: {
  label: string;
  value: string;
  detail: string;
  percent: number;
  accent: string;
  target?: string;
}) {
  return (
    <div className="moon-gauge" style={{ "--gauge": accent } as CSSProperties}>
      <div className="moon-gauge-head">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="moon-gauge-track" aria-hidden="true">
        <span style={{ width: `${clampPercent(percent)}%` }} />
      </div>
      <div className="moon-gauge-foot">
        <span>{detail}</span>
        {target ? <em>{target}</em> : null}
      </div>
    </div>
  );
}

export default function StatsPanel({ evaluation }: StatsPanelProps) {
  const { stats, checks, rating, ready, missing } = evaluation;
  const rangePercent = (stats.netDeltaVMS / MISSION.requiredDeltaVMS) * 100;
  const stabilityPercent = (stats.stability / 0.45) * 100;
  const advance = checks.find((item) => item.status === "fail") ??
    checks.find((item) => item.status === "warn") ??
    null;

  return (
    <section className={`moon-check-panel ${rating}`}>
      <div className="moon-check-head">
        <div>
          <span className="moon-eyebrow">Mission check</span>
          <h2>
            {ready
              ? "This rocket is ready for the Moon."
              : rating === "blocked"
                ? "A few essential parts are missing."
                : "Cleared to fly, with a few things to watch."}
          </h2>
        </div>
        <span className={`moon-readiness ${rating}`}>
          {ready ? "Ready" : rating === "blocked" ? "Blocked" : "Risky"}
        </span>
      </div>

      <div className="moon-check-grid">
        <div className="moon-gauge-grid">
          <Gauge
            label="Total mass"
            value={formatMass(stats.wetMassKg)}
            detail={`${formatMass(stats.dryMassKg)} dry · ${formatMass(stats.fuelMassKg)} fuel`}
            percent={(stats.wetMassKg / 32000) * 100}
            accent="var(--moon-cyan)"
          />
          <Gauge
            label="Liftoff push"
            value={formatTwr(stats.twr)}
            detail={`${Math.round(stats.liftoffThrustKN)} kN thrust`}
            percent={(stats.twr / 18) * 100}
            accent="var(--moon-pink)"
          />
          <Gauge
            label="Moon range"
            value={formatDeltaV(stats.netDeltaVMS)}
            detail={`Need ${formatDeltaV(MISSION.requiredDeltaVMS)}`}
            percent={rangePercent}
            accent="var(--moon-yellow)"
            target="target"
          />
          <Gauge
            label="Stability"
            value={`${Math.round(stats.stability * 100)}%`}
            detail={stats.stability >= MISSION.goodStability ? "Steady climber" : "Add fins for a smoother ride"}
            percent={stabilityPercent}
            accent="var(--moon-cyan)"
          />
          <Gauge
            label="Reliability"
            value={`${(stats.reliability * 100).toFixed(1)}%`}
            detail={`${stats.partCount} parts fitted`}
            percent={stats.reliability * 100}
            accent="var(--moon-green)"
          />
          <Gauge
            label="Build cost"
            value={`${stats.cost} cr`}
            detail={stats.hasCrew ? "Crew capsule aboard" : "Cargo mission"}
            percent={(stats.cost / 70) * 100}
            accent="var(--moon-orange)"
          />
        </div>

        <div className="moon-checklist" role="list">
          {checks.map((check) => (
            <div
              key={check.id}
              className={`moon-check-item ${check.status}`}
              role="listitem"
            >
              <span className="moon-check-status">{STATUS_LABEL[check.status]}</span>
              <span className="moon-check-copy">
                <strong>{check.label}</strong>
                <span>{check.message}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {advance ? (
        <div className={`moon-nova-tip ${advance.status}`}>
          <span className="moon-nova-dot" />
          <div>
            <strong>
              {advance.status === "fail" ? "Nova says: fix this first" : "Nova says: keep an eye on this"}
            </strong>
            <span>
              {advance.tip}
              {missing.length > 0 ? ` Missing: ${missing.join(", ")}.` : ""}
            </span>
          </div>
        </div>
      ) : (
        <div className="moon-nova-tip ok">
          <span className="moon-nova-dot" />
          <div>
            <strong>Nova says: perfect check</strong>
            <span>Steer smoothly, stage the boosters, and bring the crew home.</span>
          </div>
        </div>
      )}
    </section>
  );
}
