"use client";

import { useMemo, useState } from "react";

import type { AdminOverviewData, CampaignSource } from "@/lib/types";

type PackAnalyticsItem = AdminOverviewData["campaignOperations"]["packAnalytics"][number];

export function CampaignPackAnalyticsPanel({
  packs,
}: {
  packs: PackAnalyticsItem[];
}) {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | CampaignSource>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const filteredPacks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return packs.filter((pack) => {
      if (sourceFilter !== "all" && !pack.sources.includes(sourceFilter)) {
        return false;
      }

      if (statusFilter === "active" && pack.activeQuestCount === 0) {
        return false;
      }

      if (statusFilter === "inactive" && pack.activeQuestCount > 0) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        pack.label.toLowerCase().includes(normalizedSearch) ||
        pack.packId.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [packs, search, sourceFilter, statusFilter]);

  return (
    <>
      <div className="review-bulk-actions">
        <label className="field">
          <span>Search packs</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="March, zealy, feeder…"
          />
        </label>
        <label className="field">
          <span>Source</span>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as typeof sourceFilter)}>
            <option value="all">All sources</option>
            <option value="zealy">Zealy</option>
            <option value="galxe">Galxe</option>
            <option value="taskon">TaskOn</option>
            <option value="direct">Direct</option>
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="all">All packs</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </label>
      </div>
      <div className="achievement-list">
        {filteredPacks.map((pack) => (
          <article key={pack.packId} className="achievement-card">
            <div>
              <strong>{pack.label}</strong>
              <p>
                {pack.bridgeCount} bridge quests, {pack.feederCount} feeder quests, sources: {pack.sources.join(", ")}.
              </p>
            </div>
            <div className="achievement-card__side">
              <span>{pack.questCount} quests</span>
              <span>{pack.activeQuestCount} active</span>
            </div>
          </article>
        ))}
        {filteredPacks.length === 0 ? (
          <p className="form-note">No generated campaign packs match the current filters.</p>
        ) : null}
      </div>
    </>
  );
}
