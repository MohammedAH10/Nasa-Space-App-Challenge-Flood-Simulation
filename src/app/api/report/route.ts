import { NextResponse } from "next/server";
import { buildReportPrompt, type ReadingLevel } from "@/ai/prompt";
import type { Facts } from "@/engine/types";

export const runtime = "nodejs";

interface ReportBody {
  facts: Facts;
  level?: ReadingLevel;
}

function parseReport(
  content: string,
): { headline: string; sections: { heading: string; body: string }[] } | null {
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
      headline?: unknown;
      sections?: unknown;
    };
    if (typeof parsed.headline !== "string" || !Array.isArray(parsed.sections)) {
      return null;
    }
    const sections = parsed.sections
      .filter(
        (section): section is { heading: string; body: string } =>
          typeof section === "object" &&
          section !== null &&
          typeof (section as { heading?: unknown }).heading === "string" &&
          typeof (section as { body?: unknown }).body === "string",
      )
      .slice(0, 8);
    if (sections.length === 0) return null;
    return { headline: parsed.headline, sections };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: ReportBody;
  try {
    body = (await request.json()) as ReportBody;
  } catch {
    return NextResponse.json({ available: false, reason: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.facts || !body.facts.scenario || !body.facts.results) {
    return NextResponse.json({ available: false, reason: "Missing facts." }, { status: 400 });
  }

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      available: false,
      reason: "LLM is not configured. Using the deterministic template report.",
    });
  }

  const baseUrl = (process.env.LLM_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";
  const level: ReadingLevel = body.level === "cadet" ? "cadet" : "engineer";
  const { system, user } = buildReportPrompt(body.facts, level);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 800,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({
        available: false,
        reason: `LLM provider returned ${response.status}. Using the template report.`,
      });
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const parsed = parseReport(content);
    if (!parsed) {
      return NextResponse.json({
        available: false,
        reason: "The model did not return the required JSON shape. Using the template report.",
        model,
      });
    }

    return NextResponse.json({
      available: true,
      model,
      headline: parsed.headline,
      sections: parsed.sections,
    });
  } catch {
    return NextResponse.json({
      available: false,
      reason: "LLM request failed or timed out. Using the template report.",
      model,
    });
  } finally {
    clearTimeout(timeout);
  }
}
