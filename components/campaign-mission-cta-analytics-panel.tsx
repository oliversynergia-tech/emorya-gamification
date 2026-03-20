"use client";

import { useMemo, useState } from "react";

import type { AdminOverviewData } from "@/lib/types";

export function CampaignMissionCtaAnalyticsPanel({
  entries,
}: {
  entries: AdminOverviewData["campaignOperations"]["missionCtaAnalytics"];
}) {
  const [laneFilter, setLaneFilter] = useState<"all" | AdminOverviewData["campaignOperations"]["missionCtaAnalytics"][number]["activeLane"]>("all");
  const [variantFilter, setVariantFilter] = useState("all");
  const [packSearch, setPackSearch] = useState("");

  const filtered = useMemo(
    () =>
      entries.filter((entry) => {
        if (laneFilter !== "all" && entry.activeLane !== laneFilter) {
          return false;
        }

        if (variantFilter !== "all" && entry.ctaVariant !== variantFilter) {
          return false;
        }

        if (packSearch.trim()) {
          const query = packSearch.trim().toLowerCase();
          return entry.label.toLowerCase().includes(query) || entry.packId.toLowerCase().includes(query);
        }

        return true;
      }),
    [entries, laneFilter, packSearch, variantFilter],
  );

  function exportRows() {
    const lines = [
      ["pack_id", "label", "active_lane", "event_type", "cta_label", "cta_variant", "click_count", "unique_user_count", "last_clicked_at"].join(","),
      ...filtered.map((entry) =>
        [
          entry.packId,
          JSON.stringify(entry.label),
          entry.activeLane,
          entry.eventType,
          JSON.stringify(entry.ctaLabel),
          entry.ctaVariant,
          entry.clickCount,
          entry.uniqueUserCount,
          entry.lastClickedAt ?? "",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "emorya-mission-cta-analytics.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const variants = Array.from(new Set(entries.map((entry) => entry.ctaVariant))).sort();

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
        <input
          className="input"
          value={packSearch}
          onChange={(event) => setPackSearch(event.target.value)}
          placeholder="Search pack label or id"
        />
        <button className="button button--secondary" type="button" onClick={exportRows}>
          Export CSV
        </button>
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
      <div className="review-actions">
        <button className={`button ${variantFilter === "all" ? "button--primary" : "button--secondary"}`} type="button" onClick={() => setVariantFilter("all")}>
          All variants
        </button>
        {variants.map((variant) => (
          <button key={variant} className={`button ${variantFilter === variant ? "button--primary" : "button--secondary"}`} type="button" onClick={() => setVariantFilter(variant)}>
            {variant}
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
