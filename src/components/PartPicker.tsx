"use client";

import type { Part, PartCategory } from "@/engine/types";
import { categoryLabel, partsForCategory } from "@/engine/data";
import { ownerForField, ROLE_INFO } from "@/team/roles";
import { pct } from "@/lib/format";

function statLine(part: Part): string {
  switch (part.category) {
    case "camera":
      return `${part.resolutionM} m · ${part.dataGbPerDay} GB/d · science ${pct(part.science, 0)}`;
    case "panel":
      return `${part.peakW} W peak · ${part.areaM2} m² · ${pct(part.degradationPerYear, 1)}/yr loss`;
    case "battery":
      return `${part.capacityWh} Wh · ${pct(part.usableFraction, 0)} usable`;
    case "radio":
      return `${part.downlinkMbps} Mbps downlink`;
    case "computer":
      return `${part.throughputGbPerDay} GB/d · ${part.bufferGb} GB buffer`;
    default:
      return "";
  }
}

interface PartPickerProps {
  category: PartCategory;
  selectedId: string;
  allowedTiers: string[];
  locked: boolean;
  onSelect: (partId: string) => void;
}

export default function PartPicker({
  category,
  selectedId,
  allowedTiers,
  locked,
  onSelect,
}: PartPickerProps) {
  const parts = partsForCategory(category, allowedTiers);
  const current = parts.find((part) => part.id === selectedId) ?? parts[0];
  const owner = ROLE_INFO[ownerForField(category)];

  return (
    <div className={`part-picker ${locked ? "locked" : ""}`}>
      <div className="part-picker-head">
        <div>
          <span className="eyebrow">{categoryLabel(category)}</span>
          <h4>{current?.name ?? "No part available"}</h4>
        </div>
        <span className="owner-tag" style={{ color: owner.color, borderColor: `${owner.color}55` }}>
          {owner.shortName}
        </span>
      </div>
      {current ? <p className="part-blurb">{current.blurb}</p> : null}
      {locked ? (
        <p className="locked-note">
          Locked to the {owner.name}. Switch role to edit this subsystem.
        </p>
      ) : null}

      <div className="part-options">
        {parts.map((part) => {
          const selected = part.id === current?.id;
          return (
            <button
              key={part.id}
              type="button"
              className={`part-option ${selected ? "selected" : ""}`}
              onClick={() => onSelect(part.id)}
              disabled={locked}
              aria-pressed={selected}
            >
              <span className="part-option-top">
                <strong>{part.name}</strong>
                <span className={`tier tier-${part.tier}`}>{part.tier}</span>
              </span>
              <span className="part-option-stats">{statLine(part)}</span>
              <span className="part-option-meta">
                <span>${part.costM.toFixed(1)}M</span>
                <span>{part.massKg} kg</span>
                <span>rel {pct(part.reliability, 0)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
