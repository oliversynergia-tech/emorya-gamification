"use client";

import { useMemo, useState } from "react";

import type { AdminOverviewData, CampaignSource } from "@/lib/types";

type BridgeComparisonItem = AdminOverviewData["referralAnalytics"]["bridgeComparison"][number];

function exportBridgeComparison(entries: BridgeComparisonItem[]) {
  const lines = [
    [
      "source",
      "active_lane",
      "invited_count",
      "converted_count",
      "source_premium_conversion_rate",
      "lane_premium_conversion_rate",
      "premium_conversion_delta",
      "source_annual_conversion_rate",
      "lane_annual_conversion_rate",
      "annual_conversion_delta",
    ].join(","),
    ...entries.map((entry) =>
      [
        entry.source,
        entry.activeLane,
        entry.invitedCount,
        entry.convertedCount,
        entry.sourcePremiumConversionRate,
        entry.lanePremiumConversionRate,
        entry.premiumConversionDelta,
        entry.sourceAnnualConversionRate,
        entry.laneAnnualConversionRate,
        entry.annualConversionDelta,
      ].join(","),
    ),
  ].join("\n");

  const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "emorya-source-vs-lane-report.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function SourceLaneReportPanel({
  entries,
}: {
  entries: BridgeComparisonItem[];
}) {
  const [sourceFilter, setSourceFilter] = useState<"all" | CampaignSource>("all");
  const [search, setSearch] = useState("");

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return entries.filter((entry) => {
      if (sourceFilter !== "all" && entry.source !== sourceFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        entry.source.toLowerCase().includes(normalizedSearch) ||
        entry.activeLane.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [entries, search, sourceFilter]);

  return (
    <>
      <div className="review-bulk-actions">
        <label className="field">
          <span>Search source or lane</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="zealy, galxe, taskon…"
          />
        </label>
        <label className="field">
          <span>Source</span>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as typeof sourceFilter)}>
            <option value="all">All sources</option>
            <option value="direct">Direct</option>
            <option value="zealy">Zealy</option>
            <option value="galxe">Galxe</option>
            <option value="taskon">TaskOn</option>
          </select>
        </label>
        <button className="button button--secondary" type="button" onClick={() => exportBridgeComparison(filteredEntries)}>
          Export CSV
        </button>
      </div>
      <div className="achievement-list">
        {filteredEntries.map((entry) => (
          <article key={`${entry.source}-${entry.activeLane}-comparison`} className="achievement-card">
            <div>
              <strong>
                {entry.source} vs {entry.activeLane} lane
              </strong>
              <p>
                {entry.invitedCount} invited, {entry.convertedCount} converted before lane aggregation.
              </p>
            </div>
            <div className="achievement-card__side">
              <span>
                premium {Math.round(entry.sourcePremiumConversionRate * 100)}% / {Math.round(entry.lanePremiumConversionRate * 100)}%
              </span>
              <span>
                annual {Math.round(entry.sourceAnnualConversionRate * 100)}% / {Math.round(entry.laneAnnualConversionRate * 100)}%
              </span>
              <span>
                delta {entry.premiumConversionDelta >= 0 ? "+" : ""}
                {Math.round(entry.premiumConversionDelta * 100)} pts
              </span>
            </div>
          </article>
        ))}
        {filteredEntries.length === 0 ? (
          <p className="form-note">No source-vs-lane comparison rows match the current filters.</p>
        ) : null}
      </div>
    </>
  );
}
