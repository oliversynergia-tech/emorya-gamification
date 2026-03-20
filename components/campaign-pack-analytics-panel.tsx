"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminOverviewData, CampaignSource } from "@/lib/types";

type PackAnalyticsItem = AdminOverviewData["campaignOperations"]["packAnalytics"][number];
type PartnerReportItem = AdminOverviewData["campaignOperations"]["partnerReporting"][number];
type BenchmarkDraft = {
  walletLinkRateTarget: number;
  rewardEligibilityRateTarget: number;
  premiumConversionRateTarget: number;
  averageWeeklyXpTarget: number;
  reason: string;
};

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
      "source_breakdown",
      "weekly_trend",
      "referral_invite_count",
      "referral_converted_count",
      "referral_conversion_rate",
      "post_pack_referral_invite_count",
      "post_pack_referral_converted_count",
      "post_pack_referral_conversion_rate",
      "retained_activity_rate",
      "average_weekly_xp",
      "engaged_weekly_xp_rate",
      "benchmark_lane",
      "benchmark_status",
      "benchmark_is_overridden",
      "benchmark_override_reason",
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
        JSON.stringify(
          entry.sourceBreakdown.map((item) => ({
            attributionSource: item.attributionSource,
            activeLane: item.activeLane,
            participantCount: item.participantCount,
          })),
        ),
        JSON.stringify(entry.weeklyTrend),
        entry.referralInviteCount,
        entry.referralConvertedCount,
        entry.referralConversionRate,
        entry.postPackReferralInviteCount,
        entry.postPackReferralConvertedCount,
        entry.postPackReferralConversionRate,
        entry.retainedActivityRate,
        entry.averageWeeklyXp,
        entry.engagedWeeklyXpRate,
        entry.benchmark.activeLane,
        entry.benchmark.status,
        entry.benchmark.isOverridden,
        JSON.stringify(entry.benchmark.overrideReason ?? ""),
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

function exportPartnerReporting(entries: PartnerReportItem[]) {
  const lines = [
    [
      "pack_id",
      "label",
      "lifecycle_state",
      "sources",
      "benchmark_lane",
      "benchmark_status",
      "participant_count",
      "approved_completion_count",
      "wallet_link_rate",
      "reward_eligibility_rate",
      "premium_conversion_rate",
      "average_weekly_xp",
    ].join(","),
    ...entries.map((entry) =>
      [
        entry.packId,
        JSON.stringify(entry.label),
        entry.lifecycleState,
        JSON.stringify(entry.sources.join("|")),
        entry.benchmarkLane,
        entry.benchmarkStatus,
        entry.participantCount,
        entry.approvedCompletionCount,
        entry.walletLinkRate,
        entry.rewardEligibilityRate,
        entry.premiumConversionRate,
        entry.averageWeeklyXp,
      ].join(","),
    ),
  ].join("\n");

  const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "emorya-partner-pack-report.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function printPartnerReport(entries: PartnerReportItem[]) {
  const popup = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");
  if (!popup) {
    return;
  }

  const cards = entries.map((entry) => `
    <article style="border:1px solid #d8d1c3;border-radius:16px;padding:16px;margin:0 0 16px;background:#fffaf1;">
      <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7d6f54;margin:0 0 8px;">Partner Snapshot</p>
      <h2 style="margin:0 0 8px;font-size:22px;color:#20170a;">${entry.label}</h2>
      <p style="margin:0 0 12px;color:#5e5035;">Sources: ${entry.sources.join(", ")}. Benchmark lane: ${entry.benchmarkLane}. Status: ${entry.benchmarkStatus}.</p>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;">
        <div><strong>${entry.participantCount}</strong><div>Participants</div></div>
        <div><strong>${entry.approvedCompletionCount}</strong><div>Approved completions</div></div>
        <div><strong>${Math.round(entry.walletLinkRate * 100)}%</strong><div>Wallet link rate</div></div>
        <div><strong>${Math.round(entry.rewardEligibilityRate * 100)}%</strong><div>Reward eligibility</div></div>
        <div><strong>${Math.round(entry.premiumConversionRate * 100)}%</strong><div>Premium conversion</div></div>
        <div><strong>${entry.averageWeeklyXp.toFixed(0)}</strong><div>Average weekly XP</div></div>
      </div>
    </article>
  `).join("");

  popup.document.write(`
    <html>
      <head>
        <title>Emorya Partner Pack Report</title>
        <style>
          body { font-family: Georgia, serif; background:#f5efe2; color:#20170a; margin:32px; }
          h1 { margin:0 0 8px; }
          p { line-height:1.5; }
        </style>
      </head>
      <body>
        <p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#7d6f54;margin:0 0 8px;">Emorya Gamification</p>
        <h1>Partner Campaign Pack Report</h1>
        <p>This export is optimized for partner sharing and PDF save/export from the browser print dialog.</p>
        ${cards}
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
}

export function CampaignPackAnalyticsPanel({
  packs,
  partnerReports,
  canManage = false,
}: {
  packs: PackAnalyticsItem[];
  partnerReports: PartnerReportItem[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | CampaignSource>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [comparisonPackId, setComparisonPackId] = useState<string>("all");
  const [pendingPackId, setPendingPackId] = useState<string | null>(null);
  const [benchmarkPendingPackId, setBenchmarkPendingPackId] = useState<string | null>(null);
  const [benchmarkDrafts, setBenchmarkDrafts] = useState<Record<string, BenchmarkDraft>>({});
  const [error, setError] = useState<string | null>(null);

  function getBenchmarkDraft(pack: PackAnalyticsItem): BenchmarkDraft {
    return (
      benchmarkDrafts[pack.packId] ?? {
        walletLinkRateTarget: pack.benchmark.walletLinkRateTarget,
        rewardEligibilityRateTarget: pack.benchmark.rewardEligibilityRateTarget,
        premiumConversionRateTarget: pack.benchmark.premiumConversionRateTarget,
        averageWeeklyXpTarget: pack.benchmark.averageWeeklyXpTarget,
        reason: pack.benchmark.overrideReason ?? "",
      }
    );
  }

  function updateBenchmarkDraft(pack: PackAnalyticsItem, next: Partial<BenchmarkDraft>) {
    setBenchmarkDrafts((current) => ({
      ...current,
      [pack.packId]: {
        ...(current[pack.packId] ?? {
          walletLinkRateTarget: pack.benchmark.walletLinkRateTarget,
          rewardEligibilityRateTarget: pack.benchmark.rewardEligibilityRateTarget,
          premiumConversionRateTarget: pack.benchmark.premiumConversionRateTarget,
          averageWeeklyXpTarget: pack.benchmark.averageWeeklyXpTarget,
          reason: pack.benchmark.overrideReason ?? "",
        }),
        ...next,
      },
    }));
  }

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

  async function saveBenchmarkOverride(pack: PackAnalyticsItem) {
    const draft = getBenchmarkDraft(pack);
    setBenchmarkPendingPackId(pack.packId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/campaign-packs/${pack.packId}/benchmark`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          label: pack.label,
          benchmark: {
            walletLinkRateTarget: draft.walletLinkRateTarget,
            rewardEligibilityRateTarget: draft.rewardEligibilityRateTarget,
            premiumConversionRateTarget: draft.premiumConversionRateTarget,
            averageWeeklyXpTarget: draft.averageWeeklyXpTarget,
          },
          reason: draft.reason,
        }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !result.ok) {
        setError(result.error ?? "Unable to save the campaign pack benchmark override.");
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to reach the campaign pack benchmark service.");
    } finally {
      setBenchmarkPendingPackId(null);
    }
  }

  async function clearBenchmarkOverride(packId: string) {
    setBenchmarkPendingPackId(packId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/campaign-packs/${packId}/benchmark`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !result.ok) {
        setError(result.error ?? "Unable to clear the campaign pack benchmark override.");
        return;
      }

      setBenchmarkDrafts((current) => {
        const next = { ...current };
        delete next[packId];
        return next;
      });
      router.refresh();
    } catch {
      setError("Unable to reach the campaign pack benchmark service.");
    } finally {
      setBenchmarkPendingPackId(null);
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
        <button className="button button--secondary" type="button" onClick={() => exportPartnerReporting(partnerReports)}>
          Export partner CSV
        </button>
        <button className="button button--secondary" type="button" onClick={() => printPartnerReport(partnerReports)}>
          Print partner PDF
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
                Post-pack referrals: {pack.postPackReferralInviteCount} invited / {pack.postPackReferralConvertedCount} converted
                {` `}
                ({(pack.postPackReferralConversionRate * 100).toFixed(0)}%). This is the cleaner attribution view based on referrals created after first pack touch.
              </p>
              <p className="form-note">
                Benchmark lane: {pack.benchmark.activeLane}. Targets: {Math.round(pack.benchmark.walletLinkRateTarget * 100)}% wallet,
                {` `}
                {Math.round(pack.benchmark.rewardEligibilityRateTarget * 100)}% eligibility, {Math.round(pack.benchmark.premiumConversionRateTarget * 100)}% premium,
                {` `}
                {pack.benchmark.averageWeeklyXpTarget} weekly XP. Status: {pack.benchmark.status}
                {pack.benchmark.isOverridden ? " · custom pack override active" : " · lane default"}
                {pack.benchmark.overrideReason ? ` · ${pack.benchmark.overrideReason}` : ""}.
              </p>
              <p className="form-note">
                Premium upgrades after first pack touch: {pack.premiumUpgradeCount}
                {pack.averagePremiumUpgradeDays !== null
                  ? `, averaging ${pack.averagePremiumUpgradeDays.toFixed(1)} days`
                  : ", no observed premium upgrades yet"}
                .
              </p>
              <p className="form-note">
                Source mix:
                {` `}
                {pack.sourceBreakdown.length > 0
                  ? pack.sourceBreakdown
                    .map((entry) => `${entry.attributionSource} -> ${entry.activeLane}: ${entry.participantCount}`)
                    .join(", ")
                  : "no participant source mix recorded yet"}
                .
              </p>
              <p className="form-note">
                4-week trend:
                {` `}
                {pack.weeklyTrend.length > 0
                  ? pack.weeklyTrend
                    .map((entry) => `${entry.bucketStart}: ${entry.participantCount} users / ${entry.completionCount} completions`)
                    .join(" | ")
                  : "no recent trend data yet"}
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
            {canManage ? (
              <div className="review-bulk-actions">
                <label className="field">
                  <span>Wallet target</span>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={getBenchmarkDraft(pack).walletLinkRateTarget}
                    onChange={(event) =>
                      updateBenchmarkDraft(pack, { walletLinkRateTarget: Number(event.target.value) })
                    }
                  />
                </label>
                <label className="field">
                  <span>Eligibility target</span>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={getBenchmarkDraft(pack).rewardEligibilityRateTarget}
                    onChange={(event) =>
                      updateBenchmarkDraft(pack, { rewardEligibilityRateTarget: Number(event.target.value) })
                    }
                  />
                </label>
                <label className="field">
                  <span>Premium target</span>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={getBenchmarkDraft(pack).premiumConversionRateTarget}
                    onChange={(event) =>
                      updateBenchmarkDraft(pack, { premiumConversionRateTarget: Number(event.target.value) })
                    }
                  />
                </label>
                <label className="field">
                  <span>Weekly XP target</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={getBenchmarkDraft(pack).averageWeeklyXpTarget}
                    onChange={(event) =>
                      updateBenchmarkDraft(pack, { averageWeeklyXpTarget: Number(event.target.value) })
                    }
                  />
                </label>
                <label className="field">
                  <span>Override reason</span>
                  <input
                    value={getBenchmarkDraft(pack).reason}
                    onChange={(event) => updateBenchmarkDraft(pack, { reason: event.target.value })}
                    placeholder="Flagship partner pack, limited-time push…"
                  />
                </label>
                <button
                  className="button button--secondary button--small"
                  type="button"
                  disabled={benchmarkPendingPackId !== null}
                  onClick={() => void saveBenchmarkOverride(pack)}
                >
                  {benchmarkPendingPackId === pack.packId ? "Saving..." : "Save override"}
                </button>
                <button
                  className="button button--secondary button--small"
                  type="button"
                  disabled={benchmarkPendingPackId !== null || !pack.benchmark.isOverridden}
                  onClick={() => void clearBenchmarkOverride(pack.packId)}
                >
                  {benchmarkPendingPackId === pack.packId ? "Clearing..." : "Clear override"}
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
