"use client";

import { useEffect, useState } from "react";
import { ROLE_INFO } from "@/team/roles";
import { pct } from "@/lib/format";

interface TutorialModalProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    title: "Pick a mission",
    body: "Each scenario has a deadline, a budget, and a science target. The flood-watch baseline gives you 18 months and $18M to revisit the Niger basin every three days.",
    accent: "#38bdf8",
  },
  {
    title: "Balance the bars",
    body: "Mass, power, eclipse battery, downlink, and budget are computed live. Every choice has a cost somewhere else: a sharper camera makes more data, a faster radio draws more power.",
    accent: "#34d399",
  },
  {
    title: "Run 1,000 missions",
    body: "The Monte Carlo engine samples launch failures, component failures, storms, solar degradation, and schedule delays. The success percentage is real arithmetic, not a scripted outcome.",
    accent: "#fbbf24",
  },
  {
    title: "Read the honest report",
    body: "The engine produces the facts and tests the candidate fixes. The hosted model only rewrites those facts in plain language. If the model is offline, a template report takes over.",
    accent: "#a78bfa",
  },
  {
    title: "Play your role",
    body: "In team mode, the planner owns the orbit, the engineer owns the bus, the scientist owns the instrument, and the budget manager controls the money. All four must confirm before launch.",
    accent: "#f472b6",
  },
];

export default function TutorialModal({ open, onClose }: TutorialModalProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const current = STEPS[step];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className="tutorial-modal">
        <div className="tutorial-art" style={{ borderColor: current.accent }}>
          <span className="tutorial-ring" style={{ borderColor: current.accent }} />
          <span className="tutorial-ring ring-2" style={{ borderColor: current.accent }} />
          <span className="tutorial-sat" style={{ background: current.accent }} />
          <span className="tutorial-step">
            {step + 1}/{STEPS.length}
          </span>
        </div>
        <div className="tutorial-copy">
          <span className="eyebrow">How the lab works</span>
          <h2 id="tutorial-title">{current.title}</h2>
          <p>{current.body}</p>
          <div className="tutorial-roles">
            {(["planner", "engineer", "scientist", "budget"] as const).map((role) => (
              <span key={role} style={{ color: ROLE_INFO[role].color, borderColor: `${ROLE_INFO[role].color}55` }}>
                {ROLE_INFO[role].shortName}
              </span>
            ))}
          </div>
          <div className="tutorial-footer">
            <span className="tutorial-note">
              Storm risk today: <strong>{pct(0.18, 0)}</strong> in the bundled snapshot.
            </span>
            <div className="row-gap">
              <button
                type="button"
                className="btn ghost"
                onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
              >
                {step === 0 ? "Skip" : "Back"}
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => (step === STEPS.length - 1 ? onClose() : setStep(step + 1))}
              >
                {step === STEPS.length - 1 ? "Start designing" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
