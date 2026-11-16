"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import { moonAudio } from "../audio";
import { formatDeltaV, formatMass } from "../physics";
import { getPart, slotInfo } from "../parts";
import { useMoonStore } from "../store";
import { evaluateBuild } from "../validation";
import type { PartSlot } from "../types";
import AssemblyScene from "../scene/AssemblyScene";
import MissionBrief from "./MissionBrief";
import PartsTray, { MOON_PART_MIME } from "./PartsTray";
import RocketBlueprint from "./RocketBlueprint";
import StatsPanel from "./StatsPanel";

export default function AssemblyScreen() {
  const build = useMoonStore((state) => state.build);
  const selectedSlot = useMoonStore((state) => state.selectedSlot);
  const lastFit = useMoonStore((state) => state.lastFit);
  const fitPart = useMoonStore((state) => state.fitPart);
  const clearSlot = useMoonStore((state) => state.clearSlot);
  const selectSlot = useMoonStore((state) => state.selectSlot);
  const setBuildName = useMoonStore((state) => state.setBuildName);
  const loadBlueprint = useMoonStore((state) => state.loadBlueprint);
  const resetBuild = useMoonStore((state) => state.resetBuild);
  const startLaunch = useMoonStore((state) => state.startLaunch);
  const setStage = useMoonStore((state) => state.setStage);
  const [dropActive, setDropActive] = useState(false);

  useEffect(() => {
    if (lastFit) moonAudio.play("fit");
  }, [lastFit]);

  const evaluation = useMemo(() => evaluateBuild(build), [build]);
  const firstMissing = evaluation.missing[0] ?? null;
  const activeSlot: PartSlot = selectedSlot ?? firstMissing ?? "nose";
  const activeInfo = slotInfo(activeSlot);

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDropActive(false);
    const partId =
      event.dataTransfer.getData(MOON_PART_MIME) ||
      event.dataTransfer.getData("text/plain");
    const part = getPart(partId);
    if (part) fitPart(part.slot, part.id);
  };

  return (
    <section className="moon-assembly">
      <div className="moon-assembly-head">
        <div>
          <p className="moon-eyebrow">Assembly bay · Mission 01</p>
          <h1>Build your Moon rocket</h1>
        </div>
        <div className="moon-assembly-actions">
          <button
            type="button"
            className="moon-btn ghost small"
            onClick={() => {
              moonAudio.play("click");
              loadBlueprint();
            }}
          >
            Nova&apos;s blueprint
          </button>
          <button
            type="button"
            className="moon-btn ghost small"
            onClick={() => {
              moonAudio.play("click");
              resetBuild();
            }}
          >
            Reset rocket
          </button>
        </div>
      </div>

      <div className="moon-assembly-grid">
        <div className="moon-assembly-stage">
          <div className="moon-stage-toolbar">
            <span className="moon-stage-help">Drag to rotate · scroll to zoom · click a rocket section</span>
            <div className="moon-stage-stats">
              <span>
                Mass <strong>{formatMass(evaluation.stats.wetMassKg)}</strong>
              </span>
              <span>
                Range <strong>{formatDeltaV(evaluation.stats.netDeltaVMS)}</strong>
              </span>
              <span>
                Parts <strong>{evaluation.stats.partCount}/7</strong>
              </span>
            </div>
          </div>

          <div
            className={`moon-viewport ${dropActive ? "drop-active" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
              setDropActive(true);
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setDropActive(true);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setDropActive(false);
              }
            }}
            onDrop={onDrop}
          >
            <AssemblyScene
              build={build}
              focusSlot={selectedSlot}
              lastFit={lastFit}
              onSelectSlot={(slot) => {
                if (slot) selectSlot(slot);
              }}
            />
            <div className="moon-viewport-badge">
              <span className="moon-viewport-badge-dot" />
              {activeInfo.label}
            </div>
            <div className="moon-viewport-tip">
              Click a rocket section to edit it, or drag a part from the tray.
            </div>
            {dropActive ? (
              <div className="moon-drop-overlay">
                <span>Drop the part onto the rocket</span>
              </div>
            ) : null}
          </div>

          <div className="moon-build-bar">
            <label className="moon-name-field">
              <span>Rocket name</span>
              <input
                value={build.name}
                onChange={(event) => setBuildName(event.target.value)}
                maxLength={40}
                placeholder="My Moon Rocket"
              />
            </label>
            <div className="moon-build-tags">
              <span>{evaluation.stats.hasBoosters ? "Boosters fitted" : "No boosters"}</span>
              <span>{evaluation.stats.hasLegs ? "Landing legs ready" : "No landing legs"}</span>
              <span>{evaluation.stats.cost} credits</span>
            </div>
          </div>
        </div>

        <aside className="moon-assembly-side">
          <MissionBrief evaluation={evaluation} />
          <RocketBlueprint
            build={build}
            selectedSlot={selectedSlot}
            onSelectSlot={selectSlot}
            onClearSlot={clearSlot}
          />
          <PartsTray
            slot={activeSlot}
            selectedId={build.parts[activeSlot]}
            onFit={(partId) => fitPart(activeSlot, partId)}
            onClear={() => clearSlot(activeSlot)}
          />
        </aside>
      </div>

      <StatsPanel evaluation={evaluation} />

      <div className={`moon-launch-dock ${evaluation.canLaunch ? "ready" : "blocked"}`}>
        <div className="moon-dock-status">
          <span className={`moon-rating ${evaluation.rating}`}>{evaluation.rating}</span>
          <div>
            <strong>
              {evaluation.canLaunch
                ? evaluation.ready
                  ? "All checks are green. Ready for launch."
                  : "Ready to fly, but a few systems are not perfect."
                : "Finish the essential parts before launch."}
            </strong>
            <span>
              {evaluation.canLaunch
                ? "You can launch now, or keep tuning the design."
                : "Fit a nose, capsule, tank, and engine to leave the pad."}
            </span>
          </div>
        </div>
        <div className="moon-dock-actions">
          <button
            type="button"
            className="moon-btn ghost"
            onClick={() => {
              moonAudio.play("click");
              setStage("intro");
            }}
          >
            Mission brief
          </button>
          <button
            type="button"
            className="moon-btn primary moon-launch-btn"
            onClick={() => {
              if (!evaluation.canLaunch) return;
              moonAudio.play("click");
              startLaunch();
            }}
            disabled={!evaluation.canLaunch}
          >
            Launch mission
          </button>
        </div>
      </div>
    </section>
  );
}
