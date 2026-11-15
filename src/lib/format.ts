export function pct(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function money(value: number): string {
  return `$${value.toFixed(1)}M`;
}

export function compactNumber(value: number, digits = 0): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function statusText(status: "ok" | "warn" | "fail"): string {
  if (status === "fail") return "Over limit";
  if (status === "warn") return "Tight";
  return "Healthy";
}

export function failureColor(cause: string): string {
  switch (cause) {
    case "launch":
      return "#f59e0b";
    case "component":
      return "#a78bfa";
    case "power":
      return "#38bdf8";
    case "battery":
      return "#34d399";
    case "data":
      return "#f472b6";
    case "storm":
      return "#fb7185";
    case "schedule":
      return "#fbbf24";
    case "budget":
      return "#fb923c";
    default:
      return "#94a3b8";
  }
}
