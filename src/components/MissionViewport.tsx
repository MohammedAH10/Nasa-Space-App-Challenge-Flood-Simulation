"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type {
  MissionMetrics,
  PartCategory,
  ResolvedMission,
  ViewMode,
} from "@/engine/types";
import { getRealMission } from "@/engine/data";
import { orbitPeriodMinutes } from "@/engine/rules";

const OrbitScene = dynamic(() => import("./three/OrbitScene"), {
  ssr: false,
  loading: () => <SceneLoading label="Building orbit view" />,
});

const AssemblyScene = dynamic(() => import("./three/AssemblyScene"), {
  ssr: false,
  loading: () => <SceneLoading label="Building spacecraft view" />,
});

function SceneLoading({ label }: { label: string }) {
  return (
    <div className="scene-loading">
      <span className="spinner" />
      <span>{label}…</span>
    </div>
  );
}

interface MissionViewportProps {
  resolved: ResolvedMission;
  metrics: MissionMetrics;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  focusCategory: PartCategory | null;
  onSelectPart: (category: PartCategory | null) => void;
}

export default function MissionViewport({
  resolved,
  metrics,
  view,
  onViewChange,
  focusCategory,
  onSelectPart,
}: MissionViewportProps) {
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const reference = getRealMission(resolved.scenario.referenceMissionId);
  const period = orbitPeriodMinutes(resolved.orbit.altitudeKm);
  const eclipseMinutes = period * resolved.orbit.eclipseFraction;

  return (
    <section className="viewport-card">
      <header className="viewport-header">
        <div className="view-tabs" role="tablist" aria-label="View mode">
          <button
            type="button"
            role="tab"
            aria-selected={view === "orbit"}
            className={`view-tab ${view === "orbit" ? "active" : ""}`}
            onClick={() => onViewChange("orbit")}
          >
            Orbit view
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "assembly"}
            className={`view-tab ${view === "assembly" ? "active" : ""}`}
            onClick={() => onViewChange("assembly")}
          >
            Spacecraft
          </button>
        </div>
        <div className="viewport-actions">
          {view === "orbit" ? (
            <>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setPaused((value) => !value)}
                aria-label={paused ? "Resume animation" : "Pause animation"}
              >
                {paused ? "▶" : "❚❚"}
              </button>
              <button
                type="button"
                className="icon-btn speed"
                onClick={() => setSpeed((value) => (value === 1 ? 2 : value === 2 ? 4 : 1))}
                aria-label="Change animation speed"
              >
                {speed}×
              </button>
            </>
          ) : null}
          <span className={`live-dot ${paused ? "paused" : ""}`} />
          <span className="live-label">{paused ? "PAUSED" : "LIVE"}</span>
        </div>
      </header>

      <div className="viewport-canvas-wrap">
        {view === "orbit" ? (
          <OrbitScene
            resolved={resolved}
            metrics={metrics}
            paused={paused}
            speed={speed}
            onTogglePause={() => setPaused((value) => !value)}
          />
        ) : (
          <AssemblyScene
            resolved={resolved}
            metrics={metrics}
            focusCategory={focusCategory}
            onSelectPart={onSelectPart}
          />
        )}

        <div className="scene-badge">
          <span className="scene-badge-label">
            {view === "orbit" ? resolved.orbit.type : "BUS CONFIGURATION"}
          </span>
          <strong>
            {view === "orbit"
              ? `${resolved.orbit.altitudeKm.toLocaleString()} km`
              : `${metrics.totalMassKg.toFixed(0)} kg`}
          </strong>
        </div>

        <div className="scene-hint">
          {view === "orbit"
            ? "Drag to pan · wheel to zoom · double-click to reset · click the satellite to pause"
            : "Click a module to edit it · drag to pan · wheel to zoom"}
        </div>
      </div>

      <footer className="viewport-telemetry">
        <div>
          <span>Orbit period</span>
          <strong>{period.toFixed(1)} min</strong>
        </div>
        <div>
          <span>Eclipse</span>
          <strong>{eclipseMinutes.toFixed(0)} min</strong>
        </div>
        <div>
          <span>Passes/day</span>
          <strong>{resolved.orbit.passesPerDay}</strong>
        </div>
        <div>
          <span>Downlink</span>
          <strong>{metrics.downlinkMbps} Mbps</strong>
        </div>
        <div>
          <span>Revisit</span>
          <strong>{resolved.orbit.revisitDays} d</strong>
        </div>
        <div>
          <span>Reference</span>
          <strong>{reference ? reference.name : "—"}</strong>
        </div>
      </footer>
    </section>
  );
}
