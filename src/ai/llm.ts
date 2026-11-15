import type { Facts } from "@/engine/types";
import type { ReadingLevel } from "./prompt";

export interface LlmReportResult {
  available: boolean;
  reason?: string;
  headline?: string;
  sections?: { heading: string; body: string }[];
  model?: string;
}

export async function requestLlmReport(
  facts: Facts,
  level: ReadingLevel,
): Promise<LlmReportResult> {
  try {
    const response = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facts, level }),
    });
    if (!response.ok) {
      return { available: false, reason: `Report proxy returned ${response.status}.` };
    }
    return (await response.json()) as LlmReportResult;
  } catch {
    return { available: false, reason: "Could not reach the report proxy." };
  }
}
