"use client";

import { useEffect, useRef, useState } from "react";
import { moonAudio } from "../audio";
import { useMoonStore } from "../store";
import Nova from "./Nova";

const STEPS = [
  {
    short: "Build",
    eyebrow: "Step 1 · Build",
    title: "Fit seven rocket parts",
    body: "Tap a glowing slot or drag a part from the tray. Nose, capsule, tank, and engine are essential. Boosters, fins, and landing legs make the trip safer.",
    tip: "Try Nova's blueprint if you want a proven design.",
  },
  {
    short: "Check",
    eyebrow: "Step 2 · Check",
    title: "Read the mission check",
    body: "Range tells you if the rocket can reach the Moon. Stability keeps the climb steady. Landing legs make touchdown soft and safe.",
    tip: "Green checks are good. Yellow means keep an eye on it.",
  },
  {
    short: "Fly",
    eyebrow: "Step 3 · Fly",
    title: "Steer and stage",
    body: "On the climb, hold Left or Right to follow the green steering marker. When the Stage button glows, tap it to drop the boosters.",
    tip: "You can also use A/D or arrow keys, and Space to stage.",
  },
  {
    short: "Land",
    eyebrow: "Step 4 · Land",
    title: "Touch down softly",
    body: "Follow the marker, stage on time, and keep the landing legs fitted. Your score depends on range, steering, staging, and design.",
    tip: "Come back to the shed and try a different rocket.",
  },
];

export default function Tutorial() {
  const closeTutorial = useMoonStore((state) => state.closeTutorial);
  const setStage = useMoonStore((state) => state.setStage);
  const [step, setStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        moonAudio.play("click");
        closeTutorial();
        return;
      }
      if (event.key === "ArrowRight") {
        setStep((current) => Math.min(STEPS.length - 1, current + 1));
        return;
      }
      if (event.key === "ArrowLeft") {
        setStep((current) => Math.max(0, current - 1));
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [closeTutorial]);

  const current = STEPS[step];

  const finish = (openShed: boolean) => {
    moonAudio.play("click");
    closeTutorial();
    if (openShed) setStage("assembly");
  };

  return (
    <div
      className="moon-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) finish(false);
      }}
    >
      <div
        className="moon-tutorial"
        role="dialog"
        aria-modal="true"
        aria-labelledby="moon-tutorial-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="moon-tutorial-art">
          <div>
            <span className="moon-eyebrow">Nova&apos;s guide</span>
            <span className="moon-tutorial-number">{step + 1}</span>
            <strong>of {STEPS.length}</strong>
          </div>
          <ol className="moon-tutorial-steps">
            {STEPS.map((item, index) => (
              <li
                key={item.short}
                className={
                  index === step ? "active" : index < step ? "done" : ""
                }
              >
                <span>{index + 1}</span>
                {item.short}
              </li>
            ))}
          </ol>
          <p>You can reopen this guide any time from the top bar.</p>
        </div>

        <div className="moon-tutorial-body">
          <div className="moon-tutorial-top">
            <span className="moon-eyebrow">{current.eyebrow}</span>
            <button
              type="button"
              className="moon-tutorial-close"
              aria-label="Close guide"
              onClick={() => finish(false)}
            >
              ×
            </button>
          </div>

          <h2 id="moon-tutorial-title">{current.title}</h2>
          <p className="moon-tutorial-copy">{current.body}</p>

          <div className="moon-tutorial-tip">
            <Nova message={current.tip} compact />
          </div>

          <div className="moon-tutorial-dots" aria-hidden="true">
            {STEPS.map((item, index) => (
              <span key={item.short} className={index === step ? "active" : ""} />
            ))}
          </div>

          <div className="moon-tutorial-actions">
            <button
              type="button"
              className="moon-btn ghost"
              onClick={() => {
                moonAudio.play("click");
                if (step === 0) finish(false);
                else setStep((currentStep) => currentStep - 1);
              }}
            >
              {step === 0 ? "Skip" : "Back"}
            </button>
            <button
              type="button"
              className="moon-btn primary"
              onClick={() => {
                moonAudio.play("click");
                if (step === STEPS.length - 1) finish(true);
                else setStep((currentStep) => currentStep + 1);
              }}
            >
              {step === STEPS.length - 1 ? "Start building" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
