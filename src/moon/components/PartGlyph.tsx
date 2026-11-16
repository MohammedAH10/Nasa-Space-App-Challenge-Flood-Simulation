import type { PartSlot } from "../types";

interface PartGlyphProps {
  slot: PartSlot;
  accent?: string;
  size?: number;
}

export default function PartGlyph({ slot, accent = "currentColor", size = 30 }: PartGlyphProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  } as const;

  if (slot === "nose") {
    return (
      <svg {...common}>
        <path d="M16 3 L26 27 H6 Z" fill={accent} opacity="0.9" />
        <path d="M16 8 L20 24 H12 Z" fill="#0b1024" opacity="0.35" />
      </svg>
    );
  }
  if (slot === "capsule") {
    return (
      <svg {...common}>
        <rect x="7" y="7" width="18" height="19" rx="9" fill={accent} opacity="0.9" />
        <circle cx="16" cy="15" r="4" fill="#0b1024" opacity="0.7" />
        <circle cx="14.6" cy="13.6" r="1.1" fill="#dff6ff" />
      </svg>
    );
  }
  if (slot === "fuel") {
    return (
      <svg {...common}>
        <rect x="9" y="4" width="14" height="24" rx="5" fill={accent} opacity="0.9" />
        <rect x="9" y="11" width="14" height="3" fill="#dff6ff" opacity="0.5" />
        <rect x="9" y="19" width="14" height="2" fill="#0b1024" opacity="0.35" />
      </svg>
    );
  }
  if (slot === "engine") {
    return (
      <svg {...common}>
        <rect x="11" y="4" width="10" height="11" rx="2" fill={accent} opacity="0.9" />
        <path d="M9 15 H23 L27 27 H5 Z" fill={accent} opacity="0.7" />
        <path d="M12 18 H20 L22 24 H10 Z" fill="#0b1024" opacity="0.45" />
      </svg>
    );
  }
  if (slot === "booster") {
    return (
      <svg {...common}>
        <rect x="5" y="9" width="6" height="17" rx="3" fill={accent} opacity="0.85" />
        <rect x="21" y="9" width="6" height="17" rx="3" fill={accent} opacity="0.85" />
        <path d="M5 9 L8 3 L11 9 Z" fill={accent} />
        <path d="M21 9 L24 3 L27 9 Z" fill={accent} />
        <rect x="13" y="7" width="6" height="19" rx="3" fill="#dff6ff" opacity="0.35" />
      </svg>
    );
  }
  if (slot === "fins") {
    return (
      <svg {...common}>
        <path d="M11 5 H21 V19 L27 27 H5 L11 19 Z" fill={accent} opacity="0.85" />
        <path d="M14 9 H18 V18 L20 23 H12 L14 18 Z" fill="#0b1024" opacity="0.35" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="14" y="4" width="4" height="12" rx="2" fill="#dff6ff" opacity="0.5" />
      <path d="M16 14 L6 28 M16 14 L26 28 M16 14 V28" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      <path d="M4 28 H10 M22 28 H28" stroke={accent} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
