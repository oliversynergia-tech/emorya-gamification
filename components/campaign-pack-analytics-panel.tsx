"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminOverviewData, CampaignSource } from "@/lib/types";

type PackAnalyticsItem = AdminOverviewData["campaignOperations"]["packAnalytics"][number];

function exportPackAnalytics(entries: PackAnalyticsItem[]) {
  const lines = [
    [
      "pack_id",
      "label",
      "lifecycle_state",
      "sources",
      "quest_count",
      "active_quest_count",
      "participant_count",
      "completion_count",
      "approved_completion_count",
      "wallet_link_rate",
      "first_touch_to_wallet_link_count",
      "average_first_touch_to_wallet_link_days",
      "starter_path_completion_rate",
      "reward_eligibility_rate",
      "premium_conversion_rate",
      "wallet_to_premium_count",
      "average_wallet_to_premium_days",
      "premium_upgrade_count",
      "average_premium_upgrade_days",
      "referral_invite_count",
      "referral_converted_count",
      "referral_conversion_rate",
      "retained_activity_rate",
      "average_weekly_xp",
      "engaged_weekly_xp_rate",
    ].join(","),
    ...entries.map((entry) =>
      [
        entry.packId,
        JSON.stringify(entry.label),
        entry.lifecycleState,
        JSON.stringify(entry.sources.join("|")),
        entry.questCount,
        entry.activeQuestCount,
        entry.participantCount,
        entry.completionCount,
        entry.approvedCompletionCount,
        entry.walletLinkRate,
        entry.firstTouchToWalletLinkCount,
        entry.averageFirstTouchToWalletLinkDays ?? "",
        entry.starterPathCompletionRate,
        entry.rewardEligibilityRate,
        entry.premiumConversionRate,
        entry.walletToPremiumCount,
        entry.averageWalletToPremiumDays ?? "",
        entry.premiumUpgradeCount,
        entry.averagePremiumUpgradeDays ?? "",
        entry.referralInviteCount,
        entry.referralConvertedCount,
        entry.referralConversionRate,
        entry.retainedActivityRate,
        entry.averageWeeklyXp,
        entry.engagedWeeklyXpRate,
      ].join(","),
    ),
  ].join("\n");

  const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "emorya-campaign-pack-analytics.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

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
  const [comparisonPackId, setComparisonPackId] = useState<string>("all");
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

  const comparisonBasePack = useMemo(() => {
    if (comparisonPackId === "all") {
      return filteredPacks[0] ?? null;
    }

    return filteredPacks.find((pack) => pack.packId === comparisonPackId) ?? null;
  }, [comparisonPackId, filteredPacks]);

  const comparisonRows = useMemo(() => {
    if (!comparisonBasePack) {
      return [];
    }

    return filteredPacks
      .filter((pack) => pack.packId !== comparisonBasePack.packId)
      .map((pack) => ({
        packId: pack.packId,
        label: pack.label,
        premiumConversionDelta: pack.premiumConversionRate - comparisonBasePack.premiumConversionRate,
        walletLinkDelta: pack.walletLinkRate - comparisonBasePack.walletLinkRate,
        rewardEligibilityDelta: pack.rewardEligibilityRate - comparisonBasePack.rewardEligibilityRate,
        averageWeeklyXpDelta: pack.averageWeeklyXp - comparisonBasePack.averageWeeklyXp,
      }))
      .sort((left, right) => right.premiumConversionDelta - left.premiumConversionDelta);
  }, [comparisonBasePack, filteredPacks]);

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
        <label className="field">
          <span>Compare against</span>
          <select value={comparisonPackId} onChange={(event) => setComparisonPackId(event.target.value)}>
            <option value="all">Top filtered pack</option>
            {filteredPacks.map((pack) => (
              <option key={pack.packId} value={pack.packId}>
                {pack.label}
              </option>
            ))}
          </select>
        </label>
        <button className="button button--secondary" type="button" onClick={() => exportPackAnalytics(filteredPacks)}>
          Export CSV
        </button>
      </div>
      {error ? <p className="status status--error">{error}</p> : null}
      {comparisonBasePack ? (
        <div className="achievement-list">
          <article className="achievement-card">
            <div>
              <strong>Pack comparison view</strong>
              <p>Using {comparisonBasePack.label} as the current baseline for filtered pack deltas.</p>
            </div>
            <div className="achievement-card__side">
              <span>{Math.round(comparisonBasePack.premiumConversionRate * 100)}% premium</span>
              <span>{Math.round(comparisonBasePack.walletLinkRate * 100)}% wallet linked</span>
              <span>{Math.round(comparisonBasePack.rewardEligibilityRate * 100)}% eligible</span>
            </div>
          </article>
          {comparisonRows.slice(0, 5).map((row) => (
            <article key={`${comparisonBasePack.packId}-${row.packId}`} className="achievement-card">
              <div>
                <strong>{row.label}</strong>
                <p>Compared against {comparisonBasePack.label}.</p>
              </div>
              <div className="achievement-card__side">
                <span>
                  premium {row.premiumConversionDelta >= 0 ? "+" : ""}
                  {Math.round(row.premiumConversionDelta * 100)} pts
                </span>
                <span>
                  wallet {row.walletLinkDelta >= 0 ? "+" : ""}
                  {Math.round(row.walletLinkDelta * 100)} pts
                </span>
                <span>
                  eligible {row.rewardEligibilityDelta >= 0 ? "+" : ""}
                  {Math.round(row.rewardEligibilityDelta * 100)} pts / XP {row.averageWeeklyXpDelta >= 0 ? "+" : ""}
                  {Math.round(row.averageWeeklyXpDelta)}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      <div className="achievement-list">
        {filteredPacks.map((pack) => (
          <article key={pack.packId} className="achievement-card">
            <div>
              <strong>{pack.label}</strong>
              <p>
                {pack.bridgeCount} bridge quests, {pack.feederCount} feeder quests, sources: {pack.sources.join(", ")}.
              </p>
              <p className="form-note">
                {pack.participantCount} participants, {pack.completionCount} completions, {pack.approvedCompletionCount} approved.
                {` `}
                Premium conversion: {(pack.premiumConversionRate * 100).toFixed(0)}% ({pack.premiumParticipantCount} premium / {pack.annualParticipantCount} annual).
              </p>
              <p className="form-note">
                Wallet linked: {(pack.walletLinkRate * 100).toFixed(0)}% ({pack.walletLinkedParticipantCount} users). Starter path:
                {` `}
                {(pack.starterPathCompletionRate * 100).toFixed(0)}% ({pack.starterPathCompleteCount}). Reward eligible:
                {` `}
                {(pack.rewardEligibilityRate * 100).toFixed(0)}% ({pack.rewardEligibleCount}).
              </p>
              <p className="form-note">
                Funnel timing: {pack.firstTouchToWalletLinkCount} wallet links after first pack touch
                {pack.averageFirstTouchToWalletLinkDays !== null
                  ? `, averaging ${pack.averageFirstTouchToWalletLinkDays.toFixed(1)} days`
                  : ", no measured wallet-link timing yet"}
                . Wallet to premium: {pack.walletToPremiumCount}
                {pack.averageWalletToPremiumDays !== null
                  ? `, averaging ${pack.averageWalletToPremiumDays.toFixed(1)} days`
                  : ", no measured wallet-to-premium timing yet"}
                .
              </p>
              <p className="form-note">
                Referrals: {pack.referralInviteCount} invited / {pack.referralConvertedCount} converted
                {` `}
                ({(pack.referralConversionRate * 100).toFixed(0)}%). Weekly quality: {(pack.retainedActivityRate * 100).toFixed(0)}%
                active, {pack.averageWeeklyXp.toFixed(0)} avg XP, {(pack.engagedWeeklyXpRate * 100).toFixed(0)}% above 250 XP.
              </p>
              <p className="form-note">
                Premium upgrades after first pack touch: {pack.premiumUpgradeCount}
                {pack.averagePremiumUpgradeDays !== null
                  ? `, averaging ${pack.averagePremiumUpgradeDays.toFixed(1)} days`
                  : ", no observed premium upgrades yet"}
                .
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
