"use client";

import { useMemo, useState } from "react";

import type { AdminOverviewData } from "@/lib/types";

export function CampaignMissionCtaAnalyticsPanel({
  entries,
  tierEntries,
}: {
  entries: AdminOverviewData["campaignOperations"]["missionCtaAnalytics"];
  tierEntries: AdminOverviewData["campaignOperations"]["missionCtaByTier"];
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
  const comparisonSummary = useMemo(() => {
    const currentWindow = filtered.flatMap((entry) => entry.weeklyTrend.slice(-2));
    const previousWindow = filtered.flatMap((entry) => entry.weeklyTrend.slice(-4, -2));
    const currentClicks = currentWindow.reduce((sum, point) => sum + point.clickCount, 0);
    const previousClicks = previousWindow.reduce((sum, point) => sum + point.clickCount, 0);
    const currentUsers = filtered.reduce((sum, entry) => sum + entry.uniqueUserCount, 0);
    const avgWalletRate =
      filtered.length > 0 ? filtered.reduce((sum, entry) => sum + entry.walletLinkRate, 0) / filtered.length : 0;
    const avgPremiumRate =
      filtered.length > 0 ? filtered.reduce((sum, entry) => sum + entry.premiumConversionRate, 0) / filtered.length : 0;

    return {
      currentClicks,
      previousClicks,
      currentUsers,
      avgWalletRate,
      avgPremiumRate,
      clickDelta: currentClicks - previousClicks,
    };
  }, [filtered]);
  const filteredTierEntries = useMemo(
    () =>
      tierEntries.filter((entry) => {
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
    [laneFilter, packSearch, tierEntries, variantFilter],
  );
  const tierSummary = useMemo(() => {
    const summary = new Map<AdminOverviewData["campaignOperations"]["missionCtaByTier"][number]["subscriptionTier"], { clickCount: number; uniqueUserCount: number }>();
    for (const entry of filteredTierEntries) {
      const current = summary.get(entry.subscriptionTier) ?? { clickCount: 0, uniqueUserCount: 0 };
      current.clickCount += entry.clickCount;
      current.uniqueUserCount += entry.uniqueUserCount;
      summary.set(entry.subscriptionTier, current);
    }

    return Array.from(summary.entries()).map(([tier, metrics]) => ({ tier, ...metrics }));
  }, [filteredTierEntries]);

  function exportRows() {
    const lines = [
      [
        "pack_id",
        "label",
        "active_lane",
        "event_type",
        "cta_label",
        "cta_variant",
        "click_count",
        "unique_user_count",
        "wallet_link_rate",
        "reward_eligibility_rate",
        "premium_conversion_rate",
        "last_clicked_at",
      ].join(","),
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
          entry.walletLinkRate,
          entry.rewardEligibilityRate,
          entry.premiumConversionRate,
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
      <div className="info-grid">
        <div className="info-card">
          <span>Current vs previous</span>
          <strong>
            {comparisonSummary.clickDelta >= 0 ? "+" : ""}
            {comparisonSummary.clickDelta} clicks
          </strong>
        </div>
        <div className="info-card">
          <span>Current-window clicks</span>
          <strong>{comparisonSummary.currentClicks}</strong>
        </div>
        <div className="info-card">
          <span>Current unique users</span>
          <strong>{comparisonSummary.currentUsers}</strong>
        </div>
        <div className="info-card">
          <span>Average wallet-link rate</span>
          <strong>{(comparisonSummary.avgWalletRate * 100).toFixed(0)}%</strong>
        </div>
        <div className="info-card">
          <span>Average premium rate</span>
          <strong>{(comparisonSummary.avgPremiumRate * 100).toFixed(0)}%</strong>
        </div>
      </div>
      {tierSummary.length > 0 ? (
        <div className="achievement-list">
          {tierSummary.map((entry) => (
            <article key={entry.tier} className="achievement-card achievement-card--progress">
              <div>
                <strong>{entry.tier}</strong>
                <p>Mission CTA behavior for this subscription tier across the current filters.</p>
              </div>
              <div className="achievement-card__side">
                <span>{entry.clickCount} clicks</span>
                <span>{entry.uniqueUserCount} users</span>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      <div className="achievement-list">
        {filtered.map((entry) => (
          <article key={`${entry.packId}-${entry.eventType}-${entry.ctaLabel}-${entry.ctaVariant}`} className="achievement-card">
            <div>
              <strong>{entry.label}</strong>
              <p>
                {entry.ctaLabel} via {entry.eventType} on the {entry.activeLane} lane.
              </p>
              <small>Variant: {entry.ctaVariant}</small>
              {entry.weeklyTrend.length > 0 ? (
                <div className="reward-state-bars">
                  {entry.weeklyTrend.map((point) => {
                    const peak = Math.max(...entry.weeklyTrend.map((trendPoint) => trendPoint.clickCount), 1);

                    return (
                      <div key={`${entry.packId}-${entry.ctaVariant}-${point.bucketStart}`}>
                        <span>{new Date(point.bucketStart).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                        <div className="reward-state-bars__track">
                          <div
                            className="reward-state-bars__fill"
                            style={{ width: `${(point.clickCount / peak) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              <p className="form-note">
                Correlation: {(entry.walletLinkRate * 100).toFixed(0)}% wallet-linked,{" "}
                {(entry.rewardEligibilityRate * 100).toFixed(0)}% reward-ready,{" "}
                {(entry.premiumConversionRate * 100).toFixed(0)}% premium among clickers.
              </p>
              <p className="form-note">
                Submit-through: {entry.submitAttemptCount} submit attempts from {entry.submitAttemptUserCount} users.
                {` `}
                {(entry.submitAttemptRate * 100).toFixed(0)}% of CTA users reached a quest submit attempt.
              </p>
            </div>
            <div className="achievement-card__side">
              <span>{entry.clickCount} clicks</span>
              <span>{entry.uniqueUserCount} users</span>
              <span>{entry.premiumUserCount} premium</span>
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
