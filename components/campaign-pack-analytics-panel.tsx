"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminOverviewData, CampaignSource } from "@/lib/types";

type PackAnalyticsItem = AdminOverviewData["campaignOperations"]["packAnalytics"][number];

export function CampaignPackAnalyticsPanel({
  packs,
  canManage = false,
}: {
  packs: PackAnalyticsItem[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | CampaignSource>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [pendingPackId, setPendingPackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function updateLifecycle(packId: string, lifecycleState: "draft" | "ready" | "live") {
    setPendingPackId(packId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/campaign-packs/${packId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lifecycleState }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !result.ok) {
        setError(result.error ?? "Unable to update campaign pack lifecycle.");
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to reach the campaign pack service.");
    } finally {
      setPendingPackId(null);
    }
  }

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
      {error ? <p className="status status--error">{error}</p> : null}
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
              <span>{pack.lifecycleState}</span>
              <span>{pack.questCount} quests</span>
              <span>{pack.activeQuestCount} active</span>
            </div>
            {canManage ? (
              <div className="review-bulk-actions">
                <button
                  className="button button--secondary button--small"
                  type="button"
                  disabled={pendingPackId !== null || pack.lifecycleState === "draft"}
                  onClick={() => void updateLifecycle(pack.packId, "draft")}
                >
                  {pendingPackId === pack.packId ? "Updating..." : "Draft"}
                </button>
                <button
                  className="button button--secondary button--small"
                  type="button"
                  disabled={pendingPackId !== null || pack.lifecycleState === "ready"}
                  onClick={() => void updateLifecycle(pack.packId, "ready")}
                >
                  {pendingPackId === pack.packId ? "Updating..." : "Ready"}
                </button>
                <button
                  className="button button--primary button--small"
                  type="button"
                  disabled={pendingPackId !== null || pack.lifecycleState === "live"}
                  onClick={() => void updateLifecycle(pack.packId, "live")}
                >
                  {pendingPackId === pack.packId ? "Updating..." : "Live"}
                </button>
              </div>
            ) : null}
          </article>
        ))}
        {filteredPacks.length === 0 ? (
          <p className="form-note">No generated campaign packs match the current filters.</p>
        ) : null}
      </div>
    </>
  );
}
