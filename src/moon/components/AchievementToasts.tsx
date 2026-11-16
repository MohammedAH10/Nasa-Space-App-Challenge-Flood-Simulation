"use client";

import { useEffect } from "react";
import { getAchievement } from "../achievements";
import { moonAudio } from "../audio";
import { useMoonStore } from "../store";

export default function AchievementToasts() {
  const toasts = useMoonStore((state) => state.toasts);
  const dismiss = useMoonStore((state) => state.dismissToast);
  const current = toasts[0] ?? null;

  useEffect(() => {
    if (!current) return;
    moonAudio.play("badge");
    const timer = window.setTimeout(() => dismiss(), 4200);
    return () => window.clearTimeout(timer);
  }, [current, dismiss]);

  if (!current) return null;
  const badge = getAchievement(current);
  if (!badge) return null;

  return (
    <div className="moon-toasts" role="status" aria-live="polite">
      <div className="moon-toast" key={current}>
        <span className="moon-toast-star">★</span>
        <div className="moon-toast-copy">
          <span>Badge unlocked</span>
          <strong>{badge.name}</strong>
          <p>{badge.description}</p>
        </div>
        <button
          type="button"
          className="moon-toast-close"
          aria-label="Dismiss badge notification"
          onClick={dismiss}
        >
          ×
        </button>
      </div>
    </div>
  );
}
