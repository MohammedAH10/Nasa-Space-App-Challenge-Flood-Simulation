"use client";

import type { RuleReport, RuleResult } from "@/engine/types";
import { statusText } from "@/lib/format";

function valueText(rule: RuleResult): string {
  switch (rule.id) {
    case "budget":
      return `$${rule.value.toFixed(1)}M / $${rule.limit.toFixed(1)}M`;
    case "revisit":
      return `${rule.value.toFixed(2)} / ${rule.limit.toFixed(1)} d`;
    case "resolution":
      return `${rule.value.toFixed(0)} / ${rule.limit.toFixed(0)} m`;
    case "data":
      return `${rule.value.toFixed(1)} / ${rule.limit.toFixed(1)} GB/d`;
    case "mass":
      return `${rule.value.toFixed(0)} / ${rule.limit.toFixed(0)} kg`;
    case "orbit":
      return rule.status === "ok" ? "Compatible" : "Blocked";
    default:
      return `${rule.value.toFixed(0)} / ${rule.limit.toFixed(0)} ${rule.unit}`;
  }
}

function barFill(rule: RuleResult): number {
  if (rule.id === "orbit") return rule.status === "ok" ? 100 : 100;
  if (rule.limit <= 0) return 100;
  return Math.max(0, Math.min(108, (rule.value / rule.limit) * 100));
}

function markerAt(rule: RuleResult, minDelivered: number): number {
  if (rule.id === "data") return Math.max(1, Math.min(100, minDelivered * 100));
  return 100;
}

export default function ResourceStrip({
  rules,
  minDelivered,
}: {
  rules: RuleReport;
  minDelivered: number;
}) {
  return (
    <section className="resource-strip" aria-label="Mission constraints">
      <div className="resource-strip-head">
        <span className="eyebrow">Live constraints</span>
        <span className={`constraint-count ${rules.blockingFailures.length ? "fail" : rules.warnings.length ? "warn" : "ok"}`}>
          {rules.blockingFailures.length
            ? `${rules.blockingFailures.length} blocking`
            : rules.warnings.length
              ? `${rules.warnings.length} warning${rules.warnings.length === 1 ? "" : "s"}`
              : "All systems within limits"}
        </span>
      </div>
      <div className="gauge-row">
        {rules.results.map((rule) => {
          const fill = barFill(rule);
          return (
            <div key={rule.id} className={`gauge ${rule.status}`}>
              <div className="gauge-top">
                <span className="gauge-label">{rule.label}</span>
                <span className={`status-dot ${rule.status}`} aria-label={statusText(rule.status)} />
              </div>
              <div className="gauge-value">{valueText(rule)}</div>
              <div className="gauge-track">
                <span
                  className="gauge-fill"
                  style={{ width: `${fill}%` }}
                />
                <span className="gauge-marker" style={{ left: `${markerAt(rule, minDelivered)}%` }} />
              </div>
              <div className="gauge-foot">
                <span>{statusText(rule.status)}</span>
                <span className="tip" data-tip={`${rule.message} ${rule.why}`} tabIndex={0} role="note" aria-label={rule.why}>
                  i
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
