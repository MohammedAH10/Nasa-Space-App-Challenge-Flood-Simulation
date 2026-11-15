"use client";

import { useState } from "react";
import { useMissionStore } from "@/store/mission";
import { buildShareUrl } from "@/lib/share";
import { pct } from "@/lib/format";

function WeatherBadge() {
  const weather = useMissionStore((state) => state.weather);
  const weatherLive = useMissionStore((state) => state.weatherLive);
  const setWeather = useMissionStore((state) => state.setWeather);
  const [loading, setLoading] = useState(false);

  const tone =
    weather.kpIndex >= 6 ? "fail" : weather.kpIndex >= 4 ? "warn" : "ok";

  const refresh = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/spaceweather");
      const next = await response.json();
      if (typeof next?.kpIndex === "number") setWeather(next);
    } catch {
      // keep the existing snapshot
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`weather-chip ${tone}`}>
      <span className="weather-pulse" />
      <div>
        <span className="weather-label">
          Kp {weather.kpIndex} · {weatherLive ? "LIVE NOAA" : "SNAPSHOT"}
        </span>
        <span className="weather-sub">
          Storm risk {pct(weather.stormProbability, 0)}
        </span>
      </div>
      <button
        type="button"
        className="weather-refresh"
        onClick={refresh}
        disabled={loading}
        title={`${weather.source}. ${weather.note}`}
        aria-label="Refresh space weather"
      >
        {loading ? "…" : "↻"}
      </button>
    </div>
  );
}

interface TopBarProps {
  onOpenTutorial: () => void;
}

export default function TopBar({ onOpenTutorial }: TopBarProps) {
  const stage = useMissionStore((state) => state.stage);
  const setStage = useMissionStore((state) => state.setStage);
  const scenario = useMissionStore((state) => state.config.scenarioId);
  const config = useMissionStore((state) => state.config);
  const roomCode = useMissionStore((state) => state.roomCode);
  const setTeamMode = useMissionStore((state) => state.setTeamMode);
  const [copied, setCopied] = useState(false);

  const scenarioName =
    {
      "flood-watch": "Nigeria Flood Watch",
      "coastal-algae": "Gulf Algae Watch",
      "storm-watch": "Atlantic Storm Watch",
      "ice-sheet": "Ice Sheet Sentinel",
    }[scenario] ?? "Mission";

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

  return (
    <header className="topbar">
      <button type="button" className="brand" onClick={() => setStage("scenario")}>
        <span className="brand-mark" aria-hidden>
          <span className="brand-orbit" />
          <span className="brand-sat" />
        </span>
        <span className="brand-text">
          <strong>ORBIT QUEST</strong>
          <small>Mission design lab</small>
        </span>
      </button>

      <div className="topbar-center">
        <span className="status-pill">
          <span className="status-pill-dot" />
          {stage === "results" ? "Simulation report" : stage === "builder" ? "Live design" : "Choose a mission"}
        </span>
        {stage !== "scenario" ? (
          <button type="button" className="scenario-pill" onClick={() => setStage("scenario")}>
            {scenarioName}
          </button>
        ) : null}
      </div>

      <div className="topbar-right">
        <WeatherBadge />
        {config.teamMode ? (
          <span className="room-chip" title="Local team rehearsal. The networked room server is the next slice.">
            ROOM {roomCode ?? "----"}
          </span>
        ) : (
          <button
            type="button"
            className="ghost-chip"
            onClick={() => setTeamMode(true)}
            title="Rehearse four role panels in this browser"
          >
            Team mode
          </button>
        )}
        <button type="button" className="ghost-chip" onClick={copyShare}>
          {copied ? "Link copied" : "Share design"}
        </button>
        <button type="button" className="icon-btn help" onClick={onOpenTutorial} aria-label="Open tutorial">
          ?
        </button>
      </div>
    </header>
  );
}
