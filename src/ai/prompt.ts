import type { Facts } from "@/engine/types";

export type ReadingLevel = "cadet" | "engineer";

export function buildReportPrompt(
  facts: Facts,
  level: ReadingLevel,
): { system: string; user: string } {
  const levelInstruction =
    level === "cadet"
      ? "Write for a smart 12-year-old. Use short sentences, plain words, and explain any space term you use. Avoid jargon."
      : "Write for an engineering judge. Be concise and technical, keep units, and explain the causal chain behind each number.";

  const system = [
    "You are the report writer for a space mission design game.",
    "You must only explain the numbers in the FACTS JSON provided by the user.",
    "Never invent a number, part, mission, failure cause, or recommendation.",
    "The simulation engine has already computed every estimate and every candidate improvement.",
    "Do not suggest changes that are not listed in facts.improvements.",
    "Do not claim a change will work unless it is listed in facts.improvements.",
    levelInstruction,
    "Return strict JSON with this shape:",
    '{"headline":"one sentence","sections":[{"heading":"...","body":"..."}]}',
    "Use 4 to 6 sections. Keep the whole report under 320 words.",
  ].join(" ");

  const user = [
    "Here are the verified simulation facts:",
    JSON.stringify(facts),
    "Write the mission report now as strict JSON. No markdown fences.",
  ].join("\n\n");

  return { system, user };
}
