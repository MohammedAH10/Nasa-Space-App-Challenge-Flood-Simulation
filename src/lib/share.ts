import { sanitizeMission } from "@/engine/data";
import type { MissionConfig } from "@/engine/types";

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + padding);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeMission(config: MissionConfig): string {
  try {
    return toBase64Url(JSON.stringify(config));
  } catch {
    return "";
  }
}

export function decodeMission(encoded: string): MissionConfig | null {
  try {
    const json = fromBase64Url(encoded);
    const parsed = JSON.parse(json) as Partial<MissionConfig>;
    return sanitizeMission(parsed);
  } catch {
    return null;
  }
}

export function buildShareUrl(config: MissionConfig): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("design", encodeMission(config));
  return url.toString();
}

export function readDesignFromUrl(): MissionConfig | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("design");
  if (!encoded) return null;
  return decodeMission(encoded);
}
