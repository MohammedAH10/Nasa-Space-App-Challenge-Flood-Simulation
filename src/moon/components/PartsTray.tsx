"use client";

import type { CSSProperties } from "react";
import { formatMass } from "../physics";
import { getPart, partsForSlot, slotInfo } from "../parts";
import type { PartSlot } from "../types";
import PartGlyph from "./PartGlyph";

export const MOON_PART_MIME = "application/x-moon-part";

interface PartsTrayProps {
  slot: PartSlot;
  selectedId: string | null;
  onFit: (partId: string) => void;
  onClear: () => void;
}

function statChips(partId: string): string[] {
  const part = getPart(partId);
  if (!part) return [];
  const chips: string[] = [formatMass(part.massKg)];
  if (part.fuelKg > 0) chips.push(`${formatMass(part.fuelKg)} fuel`);
  if (part.thrustKN > 0) chips.push(`${part.thrustKN} kN`);
  if (part.ispS > 0) chips.push(`${part.ispS} s`);
  if (part.stability > 0) chips.push(`${Math.round(part.stability * 100)}% steady`);
  if (part.dragFactor !== 1) chips.push(`drag ${part.dragFactor.toFixed(2)}`);
  chips.push(`${part.cost} cr`);
  return chips.slice(0, 3);
}

export default function PartsTray({ slot, selectedId, onFit, onClear }: PartsTrayProps) {
  const info = slotInfo(slot);
  const parts = partsForSlot(slot);

  return (
    <div className="moon-tray" style={{ "--slot": info.accent } as CSSProperties}>
      <div className="moon-tray-head">
        <div>
          <span className="moon-tray-kicker">{info.required ? "Essential part" : "Optional part"}</span>
          <h3>{info.label}</h3>
        </div>
        {!info.required ? (
          <button
            type="button"
            className={`moon-tray-empty ${selectedId === null ? "active" : ""}`}
            onClick={onClear}
            aria-pressed={selectedId === null}
          >
            Leave empty
          </button>
        ) : null}
      </div>
      <p className="moon-tray-hint">{info.hint}</p>

      <div className="moon-parts-grid">
        {parts.map((part) => {
          const selected = selectedId === part.id;
          return (
            <button
              key={part.id}
              type="button"
              className={`moon-part-card ${selected ? "selected" : ""}`}
              style={{ "--part": part.accent } as CSSProperties}
              onClick={() => onFit(part.id)}
              onDragStart={(event) => {
                event.dataTransfer.setData(MOON_PART_MIME, part.id);
                event.dataTransfer.setData("text/plain", part.id);
                event.dataTransfer.effectAllowed = "copy";
              }}
              draggable
              aria-pressed={selected}
              title={`${part.name} — ${part.tagline}`}
            >
              <span className="moon-part-glyph">
                <PartGlyph slot={part.slot} accent={part.accent} size={34} />
              </span>
              <span className="moon-part-copy">
                <strong>{part.name}</strong>
                <small>{part.tagline}</small>
                <span className="moon-part-chips">
                  {statChips(part.id).map((chip) => (
                    <span key={chip}>{chip}</span>
                  ))}
                </span>
              </span>
              <span className="moon-part-check">{selected ? "Fitted" : "Fit"}</span>
            </button>
          );
        })}
      </div>
      <p className="moon-drag-hint">Drag a part onto the rocket, or tap it to fit.</p>
    </div>
  );
}
