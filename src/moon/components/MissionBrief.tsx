"use client";

import { MISSION } from "../constants";
import { formatDeltaV } from "../physics";
import type { BuildEvaluation } from "../types";
import Nova from "./Nova";

interface MissionBriefProps {
  evaluation: BuildEvaluation;
}

export default function MissionBrief({ evaluation }: MissionBriefProps) {
  const { stats, missing, checks } = evaluation;
  const range = checks.find((item) => item.id === "range");
  const stability = checks.find((item) => item.id === "stability");

  let message = "Nice build! Check the gauges, then we can launch.";
  let mood: "happy" | "thinking" | "warn" = "happy";

  if (missing.length > 0) {
    message = "Let's fit the missing parts first. Tap a glowing slot on the rocket.";
    mood = "warn";
  } else if (range?.status === "fail") {
    message =
      "We need more range. Try a bigger tank, the Vacuum engine, or side boosters.";
    mood = "warn";
  } else if (!stats.hasLegs) {
    message =
      "Great range! Now add landing legs so we can touch down softly on the Moon.";
    mood = "thinking";
  } else if (stability?.status !== "ok") {
    message =
      "Add fins to keep the climb steady. A wobbly rocket is hard to steer.";
    mood = "thinking";
  } else if (evaluation.ready) {
    message = "This is a beautiful Moon rocket. All checks are green. Let's fly!";
    mood = "happy";
  }

  return (
    <div className="moon-brief-card">
      <Nova message={message} mood={mood} compact />
      <div className="moon-brief-facts">
        <div>
          <span>Mission</span>
          <strong>Luna Landing</strong>
        </div>
        <div>
          <span>Goal</span>
          <strong>Land on the Moon</strong>
        </div>
        <div>
          <span>Range needed</span>
          <strong>{formatDeltaV(MISSION.requiredDeltaVMS)}</strong>
        </div>
        <div>
          <span>Soft landing</span>
          <strong>{stats.hasLegs ? "Legs fitted" : "Add landing legs"}</strong>
        </div>
      </div>
    </div>
  );
}
