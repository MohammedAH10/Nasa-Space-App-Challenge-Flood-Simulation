"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FLIGHT_PHASES, PHASE_DURATION } from "../constants";
import {
  createFlightRuntime,
  finalizeMission,
  phaseLabel,
  stepFlight,
} from "../flight";
import { useMoonStore } from "../store";
import type { FlightInput, FlightRuntime, MissionResult } from "../types";
import { evaluateBuild } from "../validation";
import FlightScene from "../scene/FlightScene";

function formatAltitude(km: number): string {
  if (km >= 1000) return `${(km / 1000).toFixed(0)}k km`;
  return `${km.toFixed(1)} km`;
}

function formatSpeed(kms: number): string {
  return `${kms.toFixed(2)} km/s`;
}

export default function LaunchScreen() {
  const build = useMoonStore((state) => state.build);
  const backToAssembly = useMoonStore((state) => state.backToAssembly);
  const completeMission = useMoonStore((state) => state.completeMission);
  const evaluation = useMemo(() => evaluateBuild(build), [build]);

  const runtimeRef = useRef<FlightRuntime | null>(null);
  const inputRef = useRef<FlightInput>({ steer: 0, stagePressed: false });
  const pausedRef = useRef(false);
  const [snapshot, setSnapshot] = useState<FlightRuntime>(() =>
    createFlightRuntime(evaluation),
  );
  const [paused, setPaused] = useState(false);
  const [steerInput, setSteerInput] = useState(0);
  const [result, setResult] = useState<MissionResult | null>(null);

  useEffect(() => {
    const runtime = createFlightRuntime(evaluation);
    runtimeRef.current = runtime;
    inputRef.current = { steer: 0, stagePressed: false };
    pausedRef.current = false;

    let frame = 0;
    let last = performance.now();
    let hudTimer = 0;
    let stopped = false;
    let finished = false;

    const loop = (now: number) => {
      if (stopped) return;
      frame = requestAnimationFrame(loop);
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;

      if (!pausedRef.current && runtime.phase !== "done") {
        stepFlight(runtime, evaluation, delta, inputRef.current);
        inputRef.current.stagePressed = false;
      }

      hudTimer += delta;
      if (hudTimer >= 0.08) {
        hudTimer = 0;
        setSnapshot({ ...runtime });
      }

      if (runtime.done && !finished) {
        finished = true;
        setSnapshot({ ...runtime });
        setResult(finalizeMission(evaluation, runtime));
        stopped = true;
        cancelAnimationFrame(frame);
      }
    };

    frame = requestAnimationFrame(loop);

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
  }, [evaluation]);

  useEffect(() => {
    const isControl = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      Boolean(target.closest("button, input, textarea, select, a"));

    const onKeyDown = (event: KeyboardEvent) => {
      if (isControl(event.target)) return;
      if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
        event.preventDefault();
        inputRef.current.steer = -1;
        setSteerInput(-1);
      } else if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
        event.preventDefault();
        inputRef.current.steer = 1;
        setSteerInput(1);
      } else if (event.code === "Space") {
        event.preventDefault();
        inputRef.current.stagePressed = true;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "a" ||
        event.key === "A" ||
        event.key === "d" ||
        event.key === "D"
      ) {
        inputRef.current.steer = 0;
        setSteerInput(0);
      }
    };

    const onBlur = () => {
      inputRef.current.steer = 0;
      setSteerInput(0);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const setSteer = (value: number) => {
    inputRef.current.steer = value;
    setSteerInput(value);
  };

  const pressStage = () => {
    inputRef.current.stagePressed = true;
  };

  const togglePause = () => {
    if (runtimeRef.current?.done) return;
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  const finish = () => {
    if (!result) return;
    completeMission(result);
  };

  const phase = snapshot.phase;
  const phaseProgress =
    phase === "done"
      ? 1
      : Math.min(1, snapshot.phaseElapsed / PHASE_DURATION[phase]);
  const activeIndex =
    phase === "done"
      ? FLIGHT_PHASES.length
      : FLIGHT_PHASES.findIndex((item) => item.phase === phase);
  const countdown =
    phase === "countdown"
      ? Math.max(1, Math.ceil(PHASE_DURATION.countdown - snapshot.phaseElapsed))
      : 0;

  return (
    <section className="moon-launch">
      <div className="moon-launch-head">
        <div>
          <p className="moon-eyebrow">Launch complex · Mission 01</p>
          <h1>{build.name || "Moon Squad 1"}</h1>
        </div>
        <div className="moon-launch-head-actions">
          <button
            type="button"
            className="moon-btn ghost small"
            onClick={togglePause}
            disabled={phase === "done"}
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            className="moon-btn ghost small"
            onClick={backToAssembly}
          >
            Back to shed
          </button>
        </div>
      </div>

      <div className={`moon-launch-stage ${paused ? "paused" : ""}`}>
        <FlightScene
          build={build}
          phase={phase}
          phaseProgress={phaseProgress}
          throttle={snapshot.throttle}
          steer={snapshot.steer}
          staged={snapshot.staged}
          paused={paused}
          success={result ? result.success : null}
        />

        <div className="moon-hud">
          <div className="moon-hud-top">
            <div className="moon-hud-card">
              <span className="moon-hud-label">Phase</span>
              <strong>{phaseLabel(phase)}</strong>
              <span className="moon-hud-sub">
                {Math.round(snapshot.progress * 100)}% of trip
              </span>
            </div>
            <div className="moon-hud-metrics">
              <div className="moon-hud-card">
                <span className="moon-hud-label">Altitude</span>
                <strong>{formatAltitude(snapshot.altitudeKm)}</strong>
              </div>
              <div className="moon-hud-card">
                <span className="moon-hud-label">Speed</span>
                <strong>{formatSpeed(snapshot.speedKms)}</strong>
              </div>
              <div className="moon-hud-card">
                <span className="moon-hud-label">Fuel</span>
                <strong>{Math.round(snapshot.fuelFraction * 100)}%</strong>
                <div
                  className="moon-fuel-track"
                  role="progressbar"
                  aria-label="Fuel remaining"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(snapshot.fuelFraction * 100)}
                >
                  <span style={{ width: `${snapshot.fuelFraction * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="moon-hud-bottom">
            {phase === "ascent" ? (
              <div className="moon-flight-controls">
                <div className="moon-steer-panel">
                  <div className="moon-steer-head">
                    <span>Steering</span>
                    <em>follow the green marker</em>
                  </div>
                  <div className="moon-steer-meter" aria-hidden="true">
                    <span className="moon-steer-center" />
                    <span
                      className="moon-steer-target"
                      style={{ left: `${50 + snapshot.steerTarget * 46}%` }}
                    />
                    <span
                      className="moon-steer-pilot"
                      style={{ left: `${50 + snapshot.steer * 46}%` }}
                    />
                  </div>
                  <div className="moon-steer-buttons">
                    <button
                      type="button"
                      className={`moon-steer-btn ${steerInput < 0 ? "active" : ""}`}
                      aria-label="Steer left"
                      onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        setSteer(-1);
                      }}
                      onPointerUp={() => setSteer(0)}
                      onPointerCancel={() => setSteer(0)}
                      onLostPointerCapture={() => setSteer(0)}
                      onContextMenu={(event) => event.preventDefault()}
                    >
                      Left
                    </button>
                    <button
                      type="button"
                      className={`moon-steer-btn ${steerInput > 0 ? "active" : ""}`}
                      aria-label="Steer right"
                      onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        setSteer(1);
                      }}
                      onPointerUp={() => setSteer(0)}
                      onPointerCancel={() => setSteer(0)}
                      onLostPointerCapture={() => setSteer(0)}
                      onContextMenu={(event) => event.preventDefault()}
                    >
                      Right
                    </button>
                  </div>
                </div>

                {evaluation.stats.hasBoosters ? (
                  <div
                    className={`moon-stage-panel ${
                      snapshot.staged
                        ? "done"
                        : snapshot.stageWindow
                          ? "open"
                          : ""
                    }`}
                  >
                    <div className="moon-stage-copy">
                      <span>Boosters</span>
                      <strong>
                        {snapshot.staged
                          ? snapshot.stageQuality >= 1
                            ? "Perfect staging!"
                            : "Boosters away"
                          : snapshot.stageWindow
                            ? "Window open!"
                            : "Wait for the glow"}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="moon-stage-btn"
                      onClick={pressStage}
                      disabled={snapshot.staged || !snapshot.stageWindow}
                    >
                      {snapshot.staged ? "Away" : "Stage"}
                    </button>
                  </div>
                ) : (
                  <div className="moon-stage-panel single">
                    <div className="moon-stage-copy">
                      <span>Single stage</span>
                      <strong>No boosters to drop</strong>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="moon-hud-bottom-row">
              <p className="moon-flight-message" aria-live="polite">
                {snapshot.message}
              </p>
              <div className="moon-launch-status">
                <span className={`moon-status-dot ${paused ? "paused" : ""}`} />
                {paused ? "Paused" : phase === "done" ? "Touchdown" : "Live"}
              </div>
            </div>
          </div>
        </div>

        <div className="moon-phase-track" aria-hidden="true">
          {FLIGHT_PHASES.map((item, index) => (
            <span
              key={item.phase}
              className={
                index < activeIndex
                  ? "done"
                  : index === activeIndex
                    ? "active"
                    : ""
              }
              title={phaseLabel(item.phase)}
            />
          ))}
        </div>

        {phase === "countdown" ? (
          <div className="moon-countdown" aria-live="assertive" aria-atomic="true">
            <span>Hold tight</span>
            <strong key={countdown}>{countdown}</strong>
            <em>Main engine start</em>
          </div>
        ) : null}

        {phase === "liftoff" ? (
          <div className="moon-liftoff-call" aria-live="assertive">
            Liftoff!
          </div>
        ) : null}

        {paused && phase !== "done" ? (
          <div className="moon-pause-overlay">
            <strong>Paused</strong>
            <span>Take a breath, commander.</span>
          </div>
        ) : null}

        {result ? (
          <div className={`moon-flight-result ${result.success ? "success" : "failure"}`}>
            <span className="moon-eyebrow">
              {result.success ? "Touchdown confirmed" : "Mission ended"}
            </span>
            <h2>{result.headline}</h2>
            <p>{result.message}</p>
            <button type="button" className="moon-btn primary" onClick={finish}>
              See mission report
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
