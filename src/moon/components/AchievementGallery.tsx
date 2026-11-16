"use client";

import { ACHIEVEMENTS } from "../achievements";
import { useMoonStore } from "../store";

export default function AchievementGallery() {
  const achievements = useMoonStore((state) => state.achievements);
  const earned = new Set(achievements);

  return (
    <details className="moon-gallery">
      <summary>
        <span className="moon-gallery-icon">★</span>
        <span className="moon-gallery-title">Badge book</span>
        <strong>
          {achievements.length}/{ACHIEVEMENTS.length}
        </strong>
        <em>Open</em>
      </summary>
      <div className="moon-gallery-grid">
        {ACHIEVEMENTS.map((badge) => {
          const unlocked = earned.has(badge.id);
          return (
            <div
              key={badge.id}
              className={`moon-gallery-badge ${unlocked ? "earned" : ""}`}
            >
              <span className="moon-gallery-star">{unlocked ? "★" : "☆"}</span>
              <div>
                <strong>{unlocked ? badge.name : "Mystery badge"}</strong>
                <p>{unlocked ? badge.description : badge.hint}</p>
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}
