"use client";

import type { CSSProperties } from "react";
import { SLOTS, getPart } from "../parts";
import type { PartSlot, RocketBuild } from "../types";
import PartGlyph from "./PartGlyph";

interface RocketBlueprintProps {
  build: RocketBuild;
  selectedSlot: PartSlot | null;
  onSelectSlot: (slot: PartSlot) => void;
  onClearSlot: (slot: PartSlot) => void;
}

export default function RocketBlueprint({
  build,
  selectedSlot,
  onSelectSlot,
  onClearSlot,
}: RocketBlueprintProps) {
  return (
    <div className="moon-blueprint">
      <div className="moon-blueprint-head">
        <span className="moon-eyebrow">Rocket blueprint</span>
        <span className="moon-blueprint-hint">Tap a slot to see its parts</span>
      </div>
      <div className="moon-slot-list">
        {SLOTS.map((slot) => {
          const part = getPart(build.parts[slot.id]);
          const selected = selectedSlot === slot.id;
          const missing = !part && slot.required;
          return (
            <div
              key={slot.id}
              className={`moon-slot-row ${selected ? "active" : ""} ${missing ? "missing" : ""}`}
              style={{ "--slot": slot.accent } as CSSProperties}
            >
              <button
                type="button"
                className="moon-slot-main"
                onClick={() => onSelectSlot(slot.id)}
                aria-pressed={selected}
              >
                <span className="moon-slot-glyph">
                  <PartGlyph slot={slot.id} accent={slot.accent} size={26} />
                </span>
                <span className="moon-slot-copy">
                  <strong>{slot.shortLabel}</strong>
                  <small>{part ? part.name : missing ? "Needs a part" : "Optional"}</small>
                </span>
                <span className={`moon-slot-status ${part ? "fitted" : "empty"}`}>
                  {part ? "Fitted" : "Empty"}
                </span>
              </button>
              {part && !slot.required ? (
                <button
                  type="button"
                  className="moon-slot-clear"
                  onClick={() => onClearSlot(slot.id)}
                  aria-label={`Remove ${slot.label}`}
                  title={`Remove ${slot.label}`}
                >
                  ×
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
