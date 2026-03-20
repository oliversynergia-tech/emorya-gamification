"use client";

import { useMemo, useState } from "react";

import type { AdminOverviewData } from "@/lib/types";

export function CampaignMissionCtaAnalyticsPanel({
  entries,
}: {
  entries: AdminOverviewData["campaignOperations"]["missionCtaAnalytics"];
}) {
  const [laneFilter, setLaneFilter] = useState<"all" | AdminOverviewData["campaignOperations"]["missionCtaAnalytics"][number]["activeLane"]>("all");

  const filtered = useMemo(
    () => entries.filter((entry) => laneFilter === "all" || entry.activeLane === laneFilter),
    [entries, laneFilter],
  );

  return (
    <div className="panel panel--glass">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Mission CTA reporting</p>
          <h3>Which campaign prompts users are actually taking</h3>
        </div>
        <span className="badge">{filtered.length} CTA rows</span>
      </div>
      <div className="review-actions">
        <button className={`button ${laneFilter === "all" ? "button--primary" : "button--secondary"}`} type="button" onClick={() => setLaneFilter("all")}>
          All lanes
        </button>
        {(["direct", "zealy", "galxe", "taskon"] as const).map((lane) => (
          <button key={lane} className={`button ${laneFilter === lane ? "button--primary" : "button--secondary"}`} type="button" onClick={() => setLaneFilter(lane)}>
            {lane}
          </button>
        ))}
      </div>
      <div className="achievement-list">
        {filtered.map((entry) => (
          <article key={`${entry.packId}-${entry.eventType}-${entry.ctaLabel}-${entry.ctaVariant}`} className="achievement-card">
            <div>
              <strong>{entry.label}</strong>
              <p>
                {entry.ctaLabel} via {entry.eventType} on the {entry.activeLane} lane.
              </p>
              <small>Variant: {entry.ctaVariant}</small>
            </div>
            <div className="achievement-card__side">
              <span>{entry.clickCount} clicks</span>
              <span>{entry.uniqueUserCount} users</span>
              <span>{entry.lastClickedAt ? new Date(entry.lastClickedAt).toLocaleDateString() : "No clicks"}</span>
            </div>
          </article>
        ))}
        {filtered.length === 0 ? (
          <p className="form-note">No mission CTA activity has been recorded yet.</p>
        ) : null}
      </div>
    </div>
  );
}
