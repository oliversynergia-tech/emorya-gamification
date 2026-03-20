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
  retainedActivityRateTarget: number;
  averageWeeklyXpTarget: number;
  zeroCompletionWeekThreshold: number;
  reason: string;
};

type ReminderExportMode = "filtered" | "live" | "bridge" | "feeder" | "live_bridge" | "live_feeder";

function toHistorySnapshot(entries: PackAnalyticsItem["missionCtaSummary"]["recommendationHistory"]) {
  return entries.map((entry) => `${entry.action.replaceAll("_", " ")}: ${entry.detail}`);
}

function getReminderExportModeLabel(mode: ReminderExportMode) {
  switch (mode) {
    case "live":
      return "Live packs only";
    case "bridge":
      return "Bridge packs only";
    case "feeder":
      return "Feeder packs only";
    case "live_bridge":
      return "Live bridge packs";
    case "live_feeder":
      return "Live feeder packs";
    default:
      return "Current filtered set";
  }
}

function getSourceFilterLabel(sourceFilter: "all" | CampaignSource) {
  return sourceFilter === "all" ? "All sources" : sourceFilter;
}

function getStatusFilterLabel(statusFilter: "all" | "active" | "inactive") {
  if (statusFilter === "active") {
    return "Active only";
  }
  if (statusFilter === "inactive") {
    return "Inactive only";
  }
  return "All statuses";
}

function getKindFilterLabel(kindFilter: "all" | "bridge" | "feeder" | "mixed") {
  if (kindFilter === "all") {
    return "All kinds";
  }
  return `${kindFilter} only`;
}

function slugifyForFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "all";
}

function getPackKind(entry: Pick<PackAnalyticsItem, "bridgeCount" | "feederCount"> | PartnerReportItem) {
  if ("bridgeCount" in entry) {
    if (entry.bridgeCount > 0 && entry.feederCount === 0) {
      return "bridge";
    }
    if (entry.feederCount > 0 && entry.bridgeCount === 0) {
      return "feeder";
    }
    return "mixed";
  }

  const bridgeLike = entry.sources.includes(entry.benchmarkLane);
  const feederLike = entry.sources.some((source) => source !== entry.benchmarkLane);
  if (bridgeLike && !feederLike) {
    return "bridge";
  }
  if (feederLike && !bridgeLike) {
    return "feeder";
  }
  return "mixed";
}

function getPackControlChangeSummary(
  auditEntries: AdminOverviewData["campaignOperations"]["audit"],
  packId: string,
) {
  return auditEntries
    .filter(
      (entry) =>
        entry.packId === packId &&
        (entry.action === "save_benchmark_override" ||
          entry.action === "clear_benchmark_override" ||
          entry.action === "suppress_alert" ||
          entry.action === "clear_alert_suppression"),
    )
    .slice(0, 3)
    .map((entry) => `${entry.createdAt.slice(0, 10)}: ${entry.detail}`)
    .join(" | ");
}

function exportPackAnalytics(
  entries: PackAnalyticsItem[],
  filters: {
    search: string;
    source: "all" | CampaignSource;
    status: "all" | "active" | "inactive";
    kind: "all" | "bridge" | "feeder" | "mixed";
  },
) {
  const lines = [
    [`search_filter`, JSON.stringify(filters.search.trim() || "No search filter")].join(","),
    [`source_filter`, JSON.stringify(getSourceFilterLabel(filters.source))].join(","),
    [`status_filter`, JSON.stringify(getStatusFilterLabel(filters.status))].join(","),
    [`kind_filter`, JSON.stringify(getKindFilterLabel(filters.kind))].join(","),
    "",
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
      "likely_pack_caused_premium_conversion_rate",
      "retained_activity_rate",
      "average_weekly_xp",
      "engaged_weekly_xp_rate",
      "benchmark_lane",
      "benchmark_status",
      "benchmark_is_overridden",
      "benchmark_override_reason",
      "recommended_cta_variant",
      "recommended_cta_badge",
      "recommended_cta_reason",
      "operator_outcome_title",
      "operator_outcome_detail",
      "reminder_handled_count",
      "reminder_snoozed_count",
      "reminder_handled_rate",
      "reminder_trend_current",
      "reminder_trend_previous",
      "reminder_trend_delta",
      "zero_completion_risk_current",
      "zero_completion_risk_shift",
      "recommendation_history_snapshot",
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
        entry.likelyPackCausedPremiumConversionRate,
        entry.retainedActivityRate,
        entry.averageWeeklyXp,
        entry.engagedWeeklyXpRate,
        entry.benchmark.activeLane,
        entry.benchmark.status,
        entry.benchmark.isOverridden,
        JSON.stringify(entry.benchmark.overrideReason ?? ""),
        JSON.stringify(entry.missionCtaSummary.recommendedVariant ?? ""),
        JSON.stringify(entry.missionCtaSummary.recommendedBadge ?? ""),
        JSON.stringify(entry.missionCtaSummary.recommendedReason ?? ""),
        JSON.stringify(entry.operatorOutcome.title),
        JSON.stringify(entry.operatorOutcome.detail),
        entry.reminderEffectiveness.handledCount,
        entry.reminderEffectiveness.snoozedCount,
        entry.reminderEffectiveness.handledRate,
        entry.reminderEffectiveness.trend.currentCount,
        entry.reminderEffectiveness.trend.previousCount,
        entry.reminderEffectiveness.trend.delta,
        (entry.weeklyTrend[entry.weeklyTrend.length - 1]?.completionCount ?? 0) === 0 ? "at_risk" : "moving",
        (entry.weeklyTrend[entry.weeklyTrend.length - 1]?.completionCount ?? 0) === 0
          ? (entry.weeklyTrend[entry.weeklyTrend.length - 2]?.completionCount ?? 0) === 0
            ? "steady"
            : "rising"
          : (entry.weeklyTrend[entry.weeklyTrend.length - 2]?.completionCount ?? 0) === 0
            ? "easing"
            : "steady",
        JSON.stringify(toHistorySnapshot(entry.missionCtaSummary.recommendationHistory)),
      ].join(","),
    ),
  ].join("\n");

  const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `emorya-campaign-pack-analytics-${slugifyForFilename(filters.search || "all-packs")}-${slugifyForFilename(getSourceFilterLabel(filters.source))}-${slugifyForFilename(getStatusFilterLabel(filters.status))}-${slugifyForFilename(getKindFilterLabel(filters.kind))}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportPartnerReporting(
  entries: PartnerReportItem[],
  filters: {
    search: string;
    source: "all" | CampaignSource;
    status: "all" | "active" | "inactive";
    kind: "all" | "bridge" | "feeder" | "mixed";
  },
) {
  const lines = [
    [`search_filter`, JSON.stringify(filters.search.trim() || "No search filter")].join(","),
    [`source_filter`, JSON.stringify(getSourceFilterLabel(filters.source))].join(","),
    [`status_filter`, JSON.stringify(getStatusFilterLabel(filters.status))].join(","),
    [`kind_filter`, JSON.stringify(getKindFilterLabel(filters.kind))].join(","),
    "",
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
      "likely_pack_caused_premium_conversion_rate",
      "average_weekly_xp",
      "completion_trend_delta",
      "partner_summary_headline",
      "partner_summary_detail",
      "operator_outcome_title",
      "operator_outcome_detail",
      "lifecycle_phase_summary",
      "zero_completion_risk_trend_summary",
      "benchmark_override_impact_summary",
      "lifecycle_history_summary",
      "recommendation_history_snapshot",
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
        entry.likelyPackCausedPremiumConversionRate,
        entry.averageWeeklyXp,
        entry.completionTrendDelta,
        JSON.stringify(entry.partnerSummaryHeadline),
        JSON.stringify(entry.partnerSummaryDetail),
        JSON.stringify(entry.operatorOutcomeTitle),
        JSON.stringify(entry.operatorOutcomeDetail),
        JSON.stringify(entry.lifecyclePhaseSummary),
        JSON.stringify(entry.zeroCompletionRiskTrendSummary),
        JSON.stringify(entry.benchmarkOverrideImpactSummary),
        JSON.stringify(entry.lifecycleHistorySummary ?? ""),
        JSON.stringify(entry.recommendationHistorySnapshot),
      ].join(","),
    ),
  ].join("\n");

  const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `emorya-partner-pack-report-${slugifyForFilename(filters.search || "all-packs")}-${slugifyForFilename(getSourceFilterLabel(filters.source))}-${slugifyForFilename(getStatusFilterLabel(filters.status))}-${slugifyForFilename(getKindFilterLabel(filters.kind))}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportOperatorOutcomes(
  entries: PackAnalyticsItem[],
  filters: {
    search: string;
    source: "all" | CampaignSource;
    status: "all" | "active" | "inactive";
    kind: "all" | "bridge" | "feeder" | "mixed";
  },
) {
  const lines = [
    [`search_filter`, JSON.stringify(filters.search.trim() || "No search filter")].join(","),
    [`source_filter`, JSON.stringify(getSourceFilterLabel(filters.source))].join(","),
    [`status_filter`, JSON.stringify(getStatusFilterLabel(filters.status))].join(","),
    [`kind_filter`, JSON.stringify(getKindFilterLabel(filters.kind))].join(","),
    "",
    [
      "pack_id",
      "label",
      "lifecycle_state",
      "kind",
      "recommended_variant",
      "recommended_reason",
      "reminder_handled_rate",
      "reminder_trend_delta",
      "cta_clicks",
      "cta_unique_users",
      "cta_wallet_link_rate",
      "cta_reward_eligibility_rate",
      "cta_premium_conversion_rate",
      "zero_completion_risk_current",
      "zero_completion_risk_shift",
      "operator_outcome_title",
      "operator_outcome_detail",
      "completion_trend_delta",
      "participant_trend_delta",
    ].join(","),
    ...entries.map((entry) =>
      [
        entry.packId,
        JSON.stringify(entry.label),
        entry.lifecycleState,
        getPackKind(entry),
        JSON.stringify(entry.missionCtaSummary.recommendedVariant ?? ""),
        JSON.stringify(entry.missionCtaSummary.recommendedReason ?? ""),
        entry.reminderEffectiveness.handledRate,
        entry.reminderEffectiveness.trend.delta,
        entry.missionCtaSummary.totalClicks,
        entry.missionCtaSummary.uniqueUsers,
        entry.missionCtaSummary.walletLinkRate,
        entry.missionCtaSummary.rewardEligibilityRate,
        entry.missionCtaSummary.premiumConversionRate,
        (entry.weeklyTrend[entry.weeklyTrend.length - 1]?.completionCount ?? 0) === 0 ? "at_risk" : "moving",
        (entry.weeklyTrend[entry.weeklyTrend.length - 1]?.completionCount ?? 0) === 0
          ? (entry.weeklyTrend[entry.weeklyTrend.length - 2]?.completionCount ?? 0) === 0
            ? "steady"
            : "rising"
          : (entry.weeklyTrend[entry.weeklyTrend.length - 2]?.completionCount ?? 0) === 0
            ? "easing"
            : "steady",
        JSON.stringify(entry.operatorOutcome.title),
        JSON.stringify(entry.operatorOutcome.detail),
        entry.operatorOutcome.trend.completionDelta,
        entry.operatorOutcome.trend.participantDelta,
      ].join(","),
    ),
  ].join("\n");

  const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `emorya-pack-operator-outcomes-${slugifyForFilename(filters.search || "all-packs")}-${slugifyForFilename(getSourceFilterLabel(filters.source))}-${slugifyForFilename(getStatusFilterLabel(filters.status))}-${slugifyForFilename(getKindFilterLabel(filters.kind))}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportReminderComparison(
  entries: PackAnalyticsItem[],
  mode: ReminderExportMode,
  filters: {
    source: "all" | CampaignSource;
    status: "all" | "active" | "inactive";
    kind: "all" | "bridge" | "feeder" | "mixed";
  },
) {
  const lines = [
    [`export_scope`, JSON.stringify(getReminderExportModeLabel(mode))].join(","),
    [`source_filter`, JSON.stringify(getSourceFilterLabel(filters.source))].join(","),
    [`status_filter`, JSON.stringify(getStatusFilterLabel(filters.status))].join(","),
    [`kind_filter`, JSON.stringify(getKindFilterLabel(filters.kind))].join(","),
    "",
    [
      "pack_id",
      "label",
      "lifecycle_state",
      "kind",
      "handled_rate",
      "handled_count",
      "snoozed_count",
      "reminder_trend_delta",
      "recommended_variant",
      "operator_outcome_title",
    ].join(","),
    ...entries.map((entry) => {
      const kind =
        entry.bridgeCount > 0 && entry.feederCount === 0
          ? "bridge"
          : entry.feederCount > 0 && entry.bridgeCount === 0
            ? "feeder"
            : "mixed";

      return [
        entry.packId,
        JSON.stringify(entry.label),
        entry.lifecycleState,
        kind,
        entry.reminderEffectiveness.handledRate,
        entry.reminderEffectiveness.handledCount,
        entry.reminderEffectiveness.snoozedCount,
        entry.reminderEffectiveness.trend.delta,
        JSON.stringify(entry.missionCtaSummary.recommendedVariant ?? ""),
        JSON.stringify(entry.operatorOutcome.title),
      ].join(",");
    }),
  ].join("\n");

  const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `emorya-pack-reminder-comparison-${slugifyForFilename(getReminderExportModeLabel(mode))}-${slugifyForFilename(getSourceFilterLabel(filters.source))}-${slugifyForFilename(getStatusFilterLabel(filters.status))}-${slugifyForFilename(getKindFilterLabel(filters.kind))}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function printPartnerReport(
  entries: PartnerReportItem[],
  auditEntries: AdminOverviewData["campaignOperations"]["audit"],
  filters: {
    search: string;
    source: "all" | CampaignSource;
    status: "all" | "active" | "inactive";
    kind: "all" | "bridge" | "feeder" | "mixed";
  },
) {
  const popup = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");
  if (!popup) {
    return;
  }

  const lifecycleOverview = entries
    .filter((entry) => entry.lifecycleHistorySummary)
    .slice(0, 4)
    .map((entry) => `${entry.label}: ${entry.lifecycleHistorySummary}`)
    .join(" | ");
  const recommendationOverview = entries
    .filter((entry) => entry.recommendationHistorySnapshot.length > 0)
    .slice(0, 4)
    .map((entry) => `${entry.label}: ${entry.recommendationHistorySnapshot.join(" | ")}`)
    .join(" | ");
  const controlChangeOverview = entries
    .map((entry) => {
      const summary = getPackControlChangeSummary(auditEntries, entry.packId);
      return summary ? `${entry.label}: ${summary}` : null;
    })
    .filter((entry): entry is string => Boolean(entry))
    .slice(0, 4)
    .join(" | ");
  const benchmarkSummary = [
    `${entries.filter((entry) => entry.benchmarkStatus === "on_track").length} on track`,
    `${entries.filter((entry) => entry.benchmarkStatus === "mixed").length} mixed`,
    `${entries.filter((entry) => entry.benchmarkStatus === "off_track").length} off track`,
  ].join(" · ");
  const lifecycleCompositionSummary = [
    `${entries.filter((entry) => entry.lifecycleState === "live").length} live`,
    `${entries.filter((entry) => entry.lifecycleState === "ready").length} ready`,
    `${entries.filter((entry) => entry.lifecycleState === "draft").length} draft`,
  ].join(" · ");
  const alertPressureSummary = `${entries.filter((entry) => entry.benchmarkStatus !== "on_track").length} packs currently need closer monitoring.`;
  const sourceMixSummary = Array.from(
    entries.reduce((totals, entry) => {
      for (const source of entry.sources) {
        totals.set(source, (totals.get(source) ?? 0) + 1);
      }
      return totals;
    }, new Map<CampaignSource, number>()),
  )
    .map(([source, count]) => `${source}: ${count}`)
    .join(" · ");
  const packKindMixSummary = entries.reduce(
    (summary, entry) => {
      const packKind = getPackKind(entry);
      if (packKind === "bridge") {
        summary.bridge += 1;
      } else if (packKind === "feeder") {
        summary.feeder += 1;
      } else {
        summary.mixed += 1;
      }
      return summary;
    },
    { bridge: 0, feeder: 0, mixed: 0 },
  );
  const sourceCompositionSummary = [
    `${entries.filter((entry) => entry.sources.includes("direct")).length} direct-linked`,
    `${entries.filter((entry) => entry.sources.includes("zealy")).length} bridged`,
    `${entries.filter((entry) => entry.sources.some((source) => source === "galxe" || source === "taskon")).length} feeder-linked`,
  ].join(" · ");
  const benchmarkKindSummary = ["bridge", "feeder", "mixed"]
    .map((kind) => {
      const kindEntries = entries.filter((entry) => getPackKind(entry) === kind);
      if (kindEntries.length === 0) {
        return null;
      }
      const onTrackCount = kindEntries.filter((entry) => entry.benchmarkStatus === "on_track").length;
      return `${kind}: ${onTrackCount}/${kindEntries.length} on track`;
    })
    .filter((entry): entry is string => Boolean(entry))
    .join(" · ");
  const lifecycleRiskSummary = (["draft", "ready", "live"] as const)
    .map((phase) => {
      const phaseEntries = entries.filter((entry) => entry.lifecycleState === phase);
      if (phaseEntries.length === 0) {
        return null;
      }
      const movingIntoRisk = phaseEntries.filter((entry) => entry.zeroCompletionRiskTrendSummary.includes("just moved into")).length;
      const easingOutOfRisk = phaseEntries.filter((entry) => entry.zeroCompletionRiskTrendSummary.includes("eased out")).length;
      const steadyRisk = phaseEntries.filter((entry) => entry.zeroCompletionRiskTrendSummary.includes("still in")).length;
      return `${phase}: ${movingIntoRisk} rising · ${easingOutOfRisk} easing · ${steadyRisk} steady risk`;
    })
    .filter((entry): entry is string => Boolean(entry))
    .join(" · ");
  const benchmarkKindTrendSummary = ["bridge", "feeder", "mixed"]
    .map((kind) => {
      const kindEntries = entries.filter((entry) => getPackKind(entry) === kind);
      if (kindEntries.length === 0) {
        return null;
      }
      const averageCompletionTrend = kindEntries.reduce((sum, entry) => sum + entry.completionTrendDelta, 0) / kindEntries.length;
      return `${kind}: ${averageCompletionTrend >= 0 ? "+" : ""}${averageCompletionTrend.toFixed(1)} avg completion delta`;
    })
    .filter((entry): entry is string => Boolean(entry))
    .join(" · ");
  const operatorOutcomeMixSummary = [
    `${entries.filter((entry) => entry.completionTrendDelta > 0).length} improving`,
    `${entries.filter((entry) => entry.completionTrendDelta === 0).length} steady`,
    `${entries.filter((entry) => entry.completionTrendDelta < 0).length} slipping`,
  ].join(" · ");
  const lifecycleOperatorOutcomeSummary = (["draft", "ready", "live"] as const)
    .map((phase) => {
      const phaseEntries = entries.filter((entry) => entry.lifecycleState === phase);
      if (phaseEntries.length === 0) {
        return null;
      }
      return `${phase}: ${phaseEntries.filter((entry) => entry.completionTrendDelta > 0).length} improving · ${
        phaseEntries.filter((entry) => entry.completionTrendDelta === 0).length
      } steady · ${phaseEntries.filter((entry) => entry.completionTrendDelta < 0).length} slipping`;
    })
    .filter((entry): entry is string => Boolean(entry))
    .join(" | ");
  const lifecycleZeroCompletionMixSummary = (["draft", "ready", "live"] as const)
    .map((phase) => {
      const phaseEntries = entries.filter((entry) => entry.lifecycleState === phase);
      if (phaseEntries.length === 0) {
        return null;
      }
      const rising = phaseEntries.filter((entry) => entry.zeroCompletionRiskTrendSummary.includes("just moved into")).length;
      const easing = phaseEntries.filter((entry) => entry.zeroCompletionRiskTrendSummary.includes("eased out")).length;
      const steady = phaseEntries.filter((entry) => entry.zeroCompletionRiskTrendSummary.includes("still in")).length;
      return `${phase}: ${rising} rising · ${easing} easing · ${steady} steady risk`;
    })
    .filter((entry): entry is string => Boolean(entry))
    .join(" | ");
  const benchmarkChangeSummary = entries
    .filter((entry) => entry.benchmarkOverrideHistorySummary)
    .slice(0, 4)
    .map((entry) => `${entry.label}: ${entry.benchmarkOverrideHistorySummary}`)
    .join(" | ");
  const suppressionChangeSummary = entries
    .map((entry) => {
      const summary = getPackControlChangeSummary(auditEntries, entry.packId)
        .split(" | ")
        .filter((detail) => detail.toLowerCase().includes("suppress"))
        .join(" | ");
      return summary ? `${entry.label}: ${summary}` : null;
    })
    .filter((entry): entry is string => Boolean(entry))
    .slice(0, 4)
    .join(" | ");

  const cards = entries.map((entry) => `
    <article style="border:1px solid #d8d1c3;border-radius:16px;padding:16px;margin:0 0 16px;background:#fffaf1;">
      <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7d6f54;margin:0 0 8px;">Partner Snapshot</p>
      <h2 style="margin:0 0 8px;font-size:22px;color:#20170a;">${entry.label}</h2>
      <p style="margin:0 0 12px;color:#5e5035;">Sources: ${entry.sources.join(", ")}. Benchmark lane: ${entry.benchmarkLane}. Status: ${entry.benchmarkStatus}.</p>
      <p style="margin:0 0 12px;color:#5e5035;"><strong>${entry.partnerSummaryHeadline}</strong><br/>${entry.partnerSummaryDetail}</p>
      <p style="margin:0 0 12px;color:#5e5035;"><strong>${entry.operatorOutcomeTitle}</strong><br/>${entry.operatorOutcomeDetail}</p>
      <p style="margin:0 0 12px;color:#5e5035;">${entry.lifecyclePhaseSummary}</p>
      <p style="margin:0 0 12px;color:#5e5035;">${entry.zeroCompletionRiskTrendSummary}</p>
      <p style="margin:0 0 12px;color:#5e5035;">${entry.benchmarkOverrideImpactSummary}</p>
      ${entry.benchmarkOverrideHistorySummary ? `<p style="margin:0 0 12px;color:#5e5035;">Benchmark change history: ${entry.benchmarkOverrideHistorySummary}</p>` : ""}
      ${entry.lifecycleHistorySummary ? `<p style="margin:0 0 12px;color:#5e5035;">Lifecycle history: ${entry.lifecycleHistorySummary}</p>` : ""}
      ${getPackControlChangeSummary(auditEntries, entry.packId) ? `<p style="margin:0 0 12px;color:#5e5035;">Recent control changes: ${getPackControlChangeSummary(auditEntries, entry.packId)}</p>` : ""}
      ${getPackControlChangeSummary(auditEntries, entry.packId) ? `<p style="margin:0 0 12px;color:#5e5035;">Intervention note: ${entry.zeroCompletionRiskTrendSummary} Recent operator changes are listed above so the current risk read can be interpreted in context.</p>` : ""}
      ${entry.recommendationHistorySnapshot.length > 0 ? `<p style="margin:0 0 12px;color:#5e5035;">Recent operator shifts: ${entry.recommendationHistorySnapshot.join(" | ")}</p>` : ""}
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;">
        <div><strong>${entry.participantCount}</strong><div>Participants</div></div>
        <div><strong>${entry.approvedCompletionCount}</strong><div>Approved completions</div></div>
        <div><strong>${Math.round(entry.walletLinkRate * 100)}%</strong><div>Wallet link rate</div></div>
        <div><strong>${Math.round(entry.rewardEligibilityRate * 100)}%</strong><div>Reward eligibility</div></div>
        <div><strong>${Math.round(entry.premiumConversionRate * 100)}%</strong><div>Premium conversion</div></div>
        <div><strong>${Math.round(entry.likelyPackCausedPremiumConversionRate * 100)}%</strong><div>Likely pack-caused premium</div></div>
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
        <section style="border:1px solid #d8d1c3;border-radius:16px;padding:16px;margin:0 0 20px;background:#fff;">
          <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7d6f54;margin:0 0 8px;">Export scope</p>
          <p style="margin:0 0 8px;color:#5e5035;">Search: ${filters.search.trim() || "No search filter"}</p>
          <p style="margin:0;color:#5e5035;">Source: ${getSourceFilterLabel(filters.source)} · Status: ${getStatusFilterLabel(filters.status)} · Kind: ${getKindFilterLabel(filters.kind)}</p>
        </section>
        <section style="border:1px solid #d8d1c3;border-radius:16px;padding:16px;margin:0 0 20px;background:#fff;">
          <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7d6f54;margin:0 0 8px;">Campaign status</p>
          <p style="margin:0 0 8px;color:#5e5035;">Benchmark status mix: ${benchmarkSummary}</p>
          <p style="margin:0 0 8px;color:#5e5035;">Lifecycle composition: ${lifecycleCompositionSummary}</p>
          <p style="margin:0 0 8px;color:#5e5035;">Benchmark by pack kind: ${benchmarkKindSummary || "No benchmark-by-kind mix available"}</p>
          <p style="margin:0 0 8px;color:#5e5035;">Pack-kind movement: ${benchmarkKindTrendSummary || "No pack-kind movement available"}</p>
          <p style="margin:0 0 8px;color:#5e5035;">Operator outcome mix: ${operatorOutcomeMixSummary}</p>
          <p style="margin:0 0 8px;color:#5e5035;">Operator outcome by lifecycle: ${lifecycleOperatorOutcomeSummary || "No lifecycle outcome mix available"}</p>
          <p style="margin:0 0 8px;color:#5e5035;">Zero-completion risk by lifecycle: ${lifecycleZeroCompletionMixSummary || "No lifecycle risk mix available"}</p>
          <p style="margin:0;color:#5e5035;">Alert pressure: ${alertPressureSummary}</p>
        </section>
        <section style="border:1px solid #d8d1c3;border-radius:16px;padding:16px;margin:0 0 20px;background:#fff;">
          <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7d6f54;margin:0 0 8px;">Campaign mix</p>
          <p style="margin:0 0 8px;color:#5e5035;">Composition: ${sourceCompositionSummary}</p>
          <p style="margin:0 0 8px;color:#5e5035;">Source mix: ${sourceMixSummary || "No source mix available"}</p>
          <p style="margin:0;color:#5e5035;">Pack kind mix: ${packKindMixSummary.bridge} bridge · ${packKindMixSummary.feeder} feeder · ${packKindMixSummary.mixed} mixed</p>
        </section>
        ${
          lifecycleOverview
            ? `<section style="border:1px solid #d8d1c3;border-radius:16px;padding:16px;margin:0 0 20px;background:#fff;">
                <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7d6f54;margin:0 0 8px;">Lifecycle highlights</p>
                <p style="margin:0;color:#5e5035;">${lifecycleOverview}</p>
              </section>`
            : ""
        }
        ${
          recommendationOverview
            ? `<section style="border:1px solid #d8d1c3;border-radius:16px;padding:16px;margin:0 0 20px;background:#fff;">
                <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7d6f54;margin:0 0 8px;">Routing and copy shifts</p>
                <p style="margin:0;color:#5e5035;">${recommendationOverview}</p>
              </section>`
            : ""
        }
        ${
          controlChangeOverview
            ? `<section style="border:1px solid #d8d1c3;border-radius:16px;padding:16px;margin:0 0 20px;background:#fff;">
                <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7d6f54;margin:0 0 8px;">Recent control changes</p>
                <p style="margin:0;color:#5e5035;">${controlChangeOverview}</p>
              </section>`
            : ""
        }
        ${
          benchmarkChangeSummary
            ? `<section style="border:1px solid #d8d1c3;border-radius:16px;padding:16px;margin:0 0 20px;background:#fff;">
                <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7d6f54;margin:0 0 8px;">Structural campaign changes</p>
                <p style="margin:0;color:#5e5035;">${benchmarkChangeSummary}</p>
              </section>`
            : ""
        }
        ${
          suppressionChangeSummary
            ? `<section style="border:1px solid #d8d1c3;border-radius:16px;padding:16px;margin:0 0 20px;background:#fff;">
                <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7d6f54;margin:0 0 8px;">Temporary operator interventions</p>
                <p style="margin:0;color:#5e5035;">${suppressionChangeSummary}</p>
              </section>`
            : ""
        }
        ${
          lifecycleRiskSummary
            ? `<section style="border:1px solid #d8d1c3;border-radius:16px;padding:16px;margin:0 0 20px;background:#fff;">
                <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7d6f54;margin:0 0 8px;">Zero-completion risk by lifecycle</p>
                <p style="margin:0;color:#5e5035;">Stagnation pressure by phase: ${lifecycleRiskSummary}</p>
              </section>`
            : ""
        }
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
  auditEntries,
  canManage = false,
}: {
  packs: PackAnalyticsItem[];
  partnerReports: PartnerReportItem[];
  auditEntries: AdminOverviewData["campaignOperations"]["audit"];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | CampaignSource>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [kindFilter, setKindFilter] = useState<"all" | "bridge" | "feeder" | "mixed">("all");
  const [reminderExportMode, setReminderExportMode] = useState<ReminderExportMode>("filtered");
  const [comparisonPackId, setComparisonPackId] = useState<string>("all");
  const [historyFilter, setHistoryFilter] = useState<"all" | "lifecycle" | "benchmark" | "alerts">("all");
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
        retainedActivityRateTarget: pack.benchmark.retainedActivityRateTarget,
        averageWeeklyXpTarget: pack.benchmark.averageWeeklyXpTarget,
        zeroCompletionWeekThreshold: pack.benchmark.zeroCompletionWeekThreshold,
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
          retainedActivityRateTarget: pack.benchmark.retainedActivityRateTarget,
          averageWeeklyXpTarget: pack.benchmark.averageWeeklyXpTarget,
          zeroCompletionWeekThreshold: pack.benchmark.zeroCompletionWeekThreshold,
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

      if (kindFilter !== "all") {
        const packKind =
          pack.bridgeCount > 0 && pack.feederCount === 0
            ? "bridge"
            : pack.feederCount > 0 && pack.bridgeCount === 0
              ? "feeder"
              : "mixed";
        if (packKind !== kindFilter) {
          return false;
        }
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        pack.label.toLowerCase().includes(normalizedSearch) ||
        pack.packId.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [packs, search, sourceFilter, statusFilter, kindFilter]);

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

  const reminderComparison = useMemo(() => {
    const ranked = filteredPacks
      .map((pack) => ({
        packId: pack.packId,
        label: pack.label,
        handledRate: pack.reminderEffectiveness.handledRate,
        totalCount: pack.reminderEffectiveness.totalCount,
        trendDelta: pack.reminderEffectiveness.trend.delta,
      }))
      .filter((pack) => pack.totalCount > 0)
      .sort((left, right) => right.handledRate - left.handledRate || right.trendDelta - left.trendDelta);

    return {
      strongest: ranked.slice(0, 3),
      weakest: [...ranked].reverse().slice(0, 3),
    };
  }, [filteredPacks]);
  const filteredBenchmarkKindSummary = useMemo(
    () =>
      (["bridge", "feeder", "mixed"] as const)
        .map((kind) => {
          const kindEntries = filteredPacks.filter((pack) => getPackKind(pack) === kind);
          if (kindEntries.length === 0) {
            return null;
          }
          const onTrackCount = kindEntries.filter((pack) => pack.benchmark.status === "on_track").length;
          return `${kind}: ${onTrackCount}/${kindEntries.length} on track`;
        })
        .filter((entry): entry is string => Boolean(entry))
        .join(" · "),
    [filteredPacks],
  );
  const filteredBenchmarkKindTrendSummary = useMemo(
    () =>
      (["bridge", "feeder", "mixed"] as const)
        .map((kind) => {
          const kindEntries = filteredPacks.filter((pack) => getPackKind(pack) === kind);
          if (kindEntries.length === 0) {
            return null;
          }
          const averageCompletionDelta =
            kindEntries.reduce((sum, pack) => sum + pack.operatorOutcome.trend.completionDelta, 0) / kindEntries.length;
          return `${kind}: ${averageCompletionDelta >= 0 ? "+" : ""}${averageCompletionDelta.toFixed(1)} avg completion delta`;
        })
        .filter((entry): entry is string => Boolean(entry))
        .join(" · "),
    [filteredPacks],
  );
  const filteredOperatorOutcomeMixSummary = useMemo(
    () =>
      [
        `${filteredPacks.filter((pack) => pack.operatorOutcome.trend.completionDelta > 0).length} improving`,
        `${filteredPacks.filter((pack) => pack.operatorOutcome.trend.completionDelta === 0).length} steady`,
        `${filteredPacks.filter((pack) => pack.operatorOutcome.trend.completionDelta < 0).length} slipping`,
      ].join(" · "),
    [filteredPacks],
  );
  const filteredLifecycleOperatorOutcomeSummary = useMemo(
    () =>
      (["draft", "ready", "live"] as const)
        .map((phase) => {
          const phaseEntries = filteredPacks.filter((pack) => pack.lifecycleState === phase);
          if (phaseEntries.length === 0) {
            return null;
          }
          return `${phase}: ${phaseEntries.filter((pack) => pack.operatorOutcome.trend.completionDelta > 0).length} improving · ${
            phaseEntries.filter((pack) => pack.operatorOutcome.trend.completionDelta === 0).length
          } steady · ${phaseEntries.filter((pack) => pack.operatorOutcome.trend.completionDelta < 0).length} slipping`;
        })
        .filter((entry): entry is string => Boolean(entry))
        .join(" | "),
    [filteredPacks],
  );

  const reminderExportEntries = useMemo(() => {
    return filteredPacks.filter((pack) => {
      const kind =
        pack.bridgeCount > 0 && pack.feederCount === 0
          ? "bridge"
          : pack.feederCount > 0 && pack.bridgeCount === 0
            ? "feeder"
            : "mixed";

      switch (reminderExportMode) {
        case "live":
          return pack.lifecycleState === "live";
        case "bridge":
          return kind === "bridge";
        case "feeder":
          return kind === "feeder";
        case "live_bridge":
          return pack.lifecycleState === "live" && kind === "bridge";
        case "live_feeder":
          return pack.lifecycleState === "live" && kind === "feeder";
        default:
          return true;
      }
    });
  }, [filteredPacks, reminderExportMode]);

  const filteredPartnerReports = useMemo(() => {
    const allowedPackIds = new Set(filteredPacks.map((pack) => pack.packId));
    return partnerReports.filter((entry) => allowedPackIds.has(entry.packId));
  }, [filteredPacks, partnerReports]);

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
            retainedActivityRateTarget: draft.retainedActivityRateTarget,
            averageWeeklyXpTarget: draft.averageWeeklyXpTarget,
            zeroCompletionWeekThreshold: draft.zeroCompletionWeekThreshold,
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
          <span>Kind</span>
          <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as typeof kindFilter)}>
            <option value="all">All kinds</option>
            <option value="bridge">Bridge only</option>
            <option value="feeder">Feeder only</option>
            <option value="mixed">Mixed only</option>
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
        <label className="field">
          <span>Reminder export</span>
          <select value={reminderExportMode} onChange={(event) => setReminderExportMode(event.target.value as ReminderExportMode)}>
            <option value="filtered">Current filtered set</option>
            <option value="live">Live packs only</option>
            <option value="bridge">Bridge packs only</option>
            <option value="feeder">Feeder packs only</option>
            <option value="live_bridge">Live bridge packs</option>
            <option value="live_feeder">Live feeder packs</option>
          </select>
        </label>
        <button
          className="button button--secondary"
          type="button"
          onClick={() =>
            exportPackAnalytics(filteredPacks, {
              search,
              source: sourceFilter,
              status: statusFilter,
              kind: kindFilter,
            })
          }
        >
          Export CSV
        </button>
        <button
          className="button button--secondary"
          type="button"
          onClick={() =>
            exportOperatorOutcomes(filteredPacks, {
              search,
              source: sourceFilter,
              status: statusFilter,
              kind: kindFilter,
            })
          }
        >
          Export operator outcomes
        </button>
        <button
          className="button button--secondary"
          type="button"
          onClick={() =>
            exportReminderComparison(reminderExportEntries, reminderExportMode, {
              source: sourceFilter,
              status: statusFilter,
              kind: kindFilter,
            })
          }
        >
          Export reminder comparison
        </button>
        <button
          className="button button--secondary"
          type="button"
          onClick={() =>
            exportPartnerReporting(filteredPartnerReports, {
              search,
              source: sourceFilter,
              status: statusFilter,
              kind: kindFilter,
            })
          }
        >
          Export partner CSV
        </button>
        <button
          className="button button--secondary"
          type="button"
          onClick={() =>
            printPartnerReport(filteredPartnerReports, auditEntries, {
              search,
              source: sourceFilter,
              status: statusFilter,
              kind: kindFilter,
            })
          }
        >
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
      {filteredBenchmarkKindSummary ? (
        <div className="achievement-list">
          <article className="achievement-card achievement-card--progress">
            <div>
              <strong>Benchmark status by pack kind</strong>
              <p>Quick read on how bridge, feeder, and mixed packs are performing against their current benchmark status.</p>
            </div>
            <div className="achievement-card__side">
              <span>{filteredBenchmarkKindSummary}</span>
              {filteredBenchmarkKindTrendSummary ? <span>{filteredBenchmarkKindTrendSummary}</span> : null}
            </div>
          </article>
        </div>
      ) : null}
      {filteredPacks.length > 0 ? (
        <div className="achievement-list">
          <article className="achievement-card achievement-card--progress">
            <div>
              <strong>Operator outcome mix</strong>
              <p>Fast read on whether the filtered packs are currently improving, holding flat, or slipping on completion momentum.</p>
            </div>
            <div className="achievement-card__side">
              <span>{filteredOperatorOutcomeMixSummary}</span>
              {filteredLifecycleOperatorOutcomeSummary ? <span>{filteredLifecycleOperatorOutcomeSummary}</span> : null}
            </div>
          </article>
        </div>
      ) : null}
      <div className="achievement-list">
        {(["draft", "ready", "live"] as const).map((lifecycleState) => {
          const matching = filteredPacks.filter((pack) => pack.lifecycleState === lifecycleState);
          if (matching.length === 0) {
            return null;
          }
          const averageHandledRate =
            matching.reduce((sum, pack) => sum + pack.reminderEffectiveness.handledRate, 0) / matching.length;
          const averageCompletionDelta =
            matching.reduce((sum, pack) => sum + pack.operatorOutcome.trend.completionDelta, 0) / matching.length;
          const totalPhaseClicks = matching.reduce((sum, pack) => sum + pack.missionCtaSummary.totalClicks, 0);
          const averageCtaApprovalEfficiency =
            totalPhaseClicks > 0
              ? matching.reduce(
                  (sum, pack) =>
                    sum +
                    pack.missionCtaSummary.variantBreakdown.reduce(
                      (variantSum, variant) => variantSum + variant.approvedCompletionCount,
                      0,
                    ),
                  0,
                ) / totalPhaseClicks
              : 0;
          const topVariantByPhase = Array.from(
            matching
              .flatMap((pack) => pack.missionCtaSummary.variantBreakdown)
              .reduce((totals, variant) => {
                totals.set(variant.ctaVariant, (totals.get(variant.ctaVariant) ?? 0) + variant.clickCount);
                return totals;
              }, new Map<string, number>())
              .entries(),
          ).sort((left, right) => right[1] - left[1])[0];
          const averageWalletLinkRate =
            matching.reduce((sum, pack) => sum + pack.walletLinkRate, 0) / matching.length;
          const averageRewardEligibilityRate =
            matching.reduce((sum, pack) => sum + pack.rewardEligibilityRate, 0) / matching.length;
          const averageRetainedActivityRate =
            matching.reduce((sum, pack) => sum + pack.retainedActivityRate, 0) / matching.length;
          const averageWeeklyXp =
            matching.reduce((sum, pack) => sum + pack.averageWeeklyXp, 0) / matching.length;
          const averageEngagedWeeklyXpRate =
            matching.reduce((sum, pack) => sum + pack.engagedWeeklyXpRate, 0) / matching.length;
          const zeroCompletionRiskRate =
            matching.filter((pack) => (pack.weeklyTrend[pack.weeklyTrend.length - 1]?.completionCount ?? 0) === 0).length / matching.length;
          const previousZeroCompletionRiskRate =
            matching.filter((pack) => (pack.weeklyTrend[pack.weeklyTrend.length - 2]?.completionCount ?? 0) === 0).length /
            matching.length;
          const zeroCompletionRiskDelta = zeroCompletionRiskRate - previousZeroCompletionRiskRate;
          return (
            <article key={`lifecycle-compare-${lifecycleState}`} className="achievement-card">
              <div>
                <strong>{lifecycleState} pack comparison</strong>
                <p>{matching.length} packs in this phase across the current filtered set.</p>
              </div>
              <div className="achievement-card__side">
                <span>{Math.round(averageHandledRate * 100)}% avg reminder handled</span>
                <span>
                  {matching.length > 0
                    ? (
                        matching.reduce(
                          (sum, pack) =>
                            sum +
                            (pack.participantCount > 0 ? pack.missionCtaSummary.uniqueUsers / pack.participantCount : 0),
                          0,
                        ) /
                        matching.length *
                        100
                      ).toFixed(0)
                    : "0"}
                  % avg CTA reach
                </span>
                <span>
                  {Math.round(averageWalletLinkRate * 100)}% avg wallet link
                </span>
                <span>
                  {Math.round(averageRewardEligibilityRate * 100)}% avg eligible
                </span>
                <span>
                  {Math.round(
                    (matching.reduce((sum, pack) => sum + pack.premiumConversionRate, 0) / matching.length) * 100,
                  )}% avg premium
                </span>
                <span>top CTA {topVariantByPhase?.[0] ?? "n/a"}</span>
                <span>{Math.round(averageCtaApprovalEfficiency * 100)}% CTA approval efficiency</span>
                {comparisonBasePack ? (
                  <span>
                    premium delta {matching.reduce((sum, pack) => sum + pack.premiumConversionRate, 0) / matching.length - comparisonBasePack.premiumConversionRate >= 0 ? "+" : ""}
                    {Math.round(
                      ((matching.reduce((sum, pack) => sum + pack.premiumConversionRate, 0) / matching.length) -
                        comparisonBasePack.premiumConversionRate) *
                        100,
                    )} pts
                  </span>
                ) : null}
                {comparisonBasePack ? (
                  <span>
                    wallet delta {averageWalletLinkRate - comparisonBasePack.walletLinkRate >= 0 ? "+" : ""}
                    {Math.round((averageWalletLinkRate - comparisonBasePack.walletLinkRate) * 100)} pts
                  </span>
                ) : null}
                {comparisonBasePack ? (
                  <span>
                    eligible delta {averageRewardEligibilityRate - comparisonBasePack.rewardEligibilityRate >= 0 ? "+" : ""}
                    {Math.round((averageRewardEligibilityRate - comparisonBasePack.rewardEligibilityRate) * 100)} pts
                  </span>
                ) : null}
                {comparisonBasePack ? (
                  <span>
                    retained delta {averageRetainedActivityRate - comparisonBasePack.retainedActivityRate >= 0 ? "+" : ""}
                    {Math.round((averageRetainedActivityRate - comparisonBasePack.retainedActivityRate) * 100)} pts
                  </span>
                ) : null}
                {comparisonBasePack ? (
                  <span>
                    weekly XP delta {averageWeeklyXp - comparisonBasePack.averageWeeklyXp >= 0 ? "+" : ""}
                    {Math.round(averageWeeklyXp - comparisonBasePack.averageWeeklyXp)}
                  </span>
                ) : null}
                {comparisonBasePack ? (
                  <span>
                    engaged XP delta {averageEngagedWeeklyXpRate - comparisonBasePack.engagedWeeklyXpRate >= 0 ? "+" : ""}
                    {Math.round((averageEngagedWeeklyXpRate - comparisonBasePack.engagedWeeklyXpRate) * 100)} pts
                  </span>
                ) : null}
                {comparisonBasePack ? (
                  <span>
                    zero-completion risk {zeroCompletionRiskRate - ((comparisonBasePack.weeklyTrend[comparisonBasePack.weeklyTrend.length - 1]?.completionCount ?? 0) === 0 ? 1 : 0) >= 0 ? "+" : ""}
                    {Math.round(
                      (zeroCompletionRiskRate -
                        (((comparisonBasePack.weeklyTrend[comparisonBasePack.weeklyTrend.length - 1]?.completionCount ?? 0) === 0 ? 1 : 0))) *
                        100,
                    )} pts
                  </span>
                ) : null}
                <span>
                  zero-completion trend {zeroCompletionRiskDelta >= 0 ? "+" : ""}
                  {Math.round(zeroCompletionRiskDelta * 100)} pts
                </span>
                <span>avg completion delta {averageCompletionDelta >= 0 ? "+" : ""}{averageCompletionDelta.toFixed(1)}</span>
              </div>
            </article>
          );
        })}
      </div>
      {reminderComparison.strongest.length > 0 || reminderComparison.weakest.length > 0 ? (
        <div className="achievement-list">
          <article className="achievement-card">
            <div>
              <strong>Reminder effectiveness comparison</strong>
              <p>Quick scan of which filtered live packs are landing reminder pressure best, and which ones need a closer look.</p>
            </div>
          </article>
          {reminderComparison.strongest.map((pack) => (
            <article key={`strong-${pack.packId}`} className="achievement-card">
              <div>
                <strong>{pack.label}</strong>
                <p>Stronger reminder handling in the current filtered set.</p>
              </div>
              <div className="achievement-card__side">
                <span>{Math.round(pack.handledRate * 100)}% handled</span>
                <span>{pack.totalCount} reminder events</span>
                <span>trend {pack.trendDelta >= 0 ? "+" : ""}{pack.trendDelta}</span>
              </div>
            </article>
          ))}
          {reminderComparison.weakest.map((pack) => (
            <article key={`weak-${pack.packId}`} className="achievement-card">
              <div>
                <strong>{pack.label}</strong>
                <p>Weaker reminder handling in the current filtered set.</p>
              </div>
              <div className="achievement-card__side">
                <span>{Math.round(pack.handledRate * 100)}% handled</span>
                <span>{pack.totalCount} reminder events</span>
                <span>trend {pack.trendDelta >= 0 ? "+" : ""}{pack.trendDelta}</span>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      {filteredPacks.some((pack) => pack.lifecycleState === "live") ? (
        <div className="achievement-list">
          <article className="achievement-card">
            <div>
              <strong>Live zero-completion risk</strong>
              <p>Which live packs are currently driving stagnation risk, and whether that pressure is rising or easing week over week.</p>
            </div>
          </article>
          {filteredPacks
            .filter((pack) => pack.lifecycleState === "live")
            .map((pack) => {
              const latestCompletionCount = pack.weeklyTrend[pack.weeklyTrend.length - 1]?.completionCount ?? 0;
              const previousCompletionCount = pack.weeklyTrend[pack.weeklyTrend.length - 2]?.completionCount ?? 0;
              const currentRisk = latestCompletionCount === 0;
              const previousRisk = previousCompletionCount === 0;
              const riskShift = currentRisk === previousRisk ? "steady" : currentRisk ? "rising" : "easing";

              return (
                <article key={`zero-risk-${pack.packId}`} className="achievement-card">
                  <div>
                    <strong>{pack.label}</strong>
                    <p>{currentRisk ? "Current week is at zero completions." : `Current week has ${latestCompletionCount} completions.`}</p>
                    <p className="form-note">
                      Previous week: {previousCompletionCount} completions. Risk is {riskShift}.
                    </p>
                  </div>
                  <div className="achievement-card__side">
                    <span>{currentRisk ? "At risk" : "Moving"}</span>
                    <span>{riskShift}</span>
                  </div>
                </article>
              );
            })}
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
                Likely pack-caused premium: {pack.likelyPackCausedPremiumCount} users
                {` `}
                ({(pack.likelyPackCausedPremiumConversionRate * 100).toFixed(0)}%). This is the stricter attribution view for upgrades that happened within two weeks of first pack touch.
              </p>
              <p className="form-note">
                Mission CTA performance: {pack.missionCtaSummary.totalClicks} clicks from {pack.missionCtaSummary.uniqueUsers} users.
                {` `}
                Top variant: {pack.missionCtaSummary.topCtaVariant ?? "n/a"}{pack.missionCtaSummary.topCtaLabel ? ` via ${pack.missionCtaSummary.topCtaLabel}` : ""}.
                {` `}
                Clicker correlation: {(pack.missionCtaSummary.walletLinkRate * 100).toFixed(0)}% wallet-linked, {(pack.missionCtaSummary.rewardEligibilityRate * 100).toFixed(0)}% reward-ready, {(pack.missionCtaSummary.premiumConversionRate * 100).toFixed(0)}% premium.
              </p>
              {pack.missionCtaSummary.recommendedBadge ? (
                <article className="achievement-card">
                  <div>
                    <strong>{pack.missionCtaSummary.recommendedBadge}</strong>
                    <p>{pack.missionCtaSummary.recommendedReason}</p>
                    <p className="form-note">{pack.operatorNextMove.title}</p>
                    <p className="form-note">{pack.operatorNextMove.detail}</p>
                    <p className="form-note">{pack.operatorOutcome.title}</p>
                    <p className="form-note">{pack.operatorOutcome.detail}</p>
                    <p className="form-note">
                      Outcome trend: completions {pack.operatorOutcome.trend.currentCompletions} vs {pack.operatorOutcome.trend.previousCompletions}
                      {` `}({pack.operatorOutcome.trend.completionDelta >= 0 ? "+" : ""}{pack.operatorOutcome.trend.completionDelta}), participants {pack.operatorOutcome.trend.currentParticipants} vs {pack.operatorOutcome.trend.previousParticipants}
                      {` `}({pack.operatorOutcome.trend.participantDelta >= 0 ? "+" : ""}{pack.operatorOutcome.trend.participantDelta}).
                    </p>
                  </div>
                  <div className="achievement-card__side">
                    <span>{pack.missionCtaSummary.recommendedVariant}</span>
                  </div>
                </article>
              ) : null}
              <p className="form-note">
                Reminder effectiveness: {pack.reminderEffectiveness.handledCount} handled, {pack.reminderEffectiveness.snoozedCount} snoozed, {Math.round(pack.reminderEffectiveness.handledRate * 100)}% handled rate.
              </p>
              <p className="form-note">
                Reminder trend: current {pack.reminderEffectiveness.trend.currentCount} vs previous {pack.reminderEffectiveness.trend.previousCount}. Delta {pack.reminderEffectiveness.trend.delta >= 0 ? "+" : ""}
                {pack.reminderEffectiveness.trend.delta}.
              </p>
              <p className="form-note">
                Lifecycle delta: {pack.lifecycleState} phase, completions {pack.operatorOutcome.trend.currentCompletions} vs {pack.operatorOutcome.trend.previousCompletions}
                {` `}({pack.operatorOutcome.trend.completionDelta >= 0 ? "+" : ""}{pack.operatorOutcome.trend.completionDelta}), participants {pack.operatorOutcome.trend.currentParticipants} vs {pack.operatorOutcome.trend.previousParticipants}
                {` `}({pack.operatorOutcome.trend.participantDelta >= 0 ? "+" : ""}{pack.operatorOutcome.trend.participantDelta}).
              </p>
              <div className="review-actions">
                <button className={`button ${historyFilter === "all" ? "button--primary" : "button--secondary"}`} type="button" onClick={() => setHistoryFilter("all")}>
                  All history
                </button>
                <button className={`button ${historyFilter === "lifecycle" ? "button--primary" : "button--secondary"}`} type="button" onClick={() => setHistoryFilter("lifecycle")}>
                  Lifecycle
                </button>
                <button className={`button ${historyFilter === "benchmark" ? "button--primary" : "button--secondary"}`} type="button" onClick={() => setHistoryFilter("benchmark")}>
                  Benchmarks
                </button>
                <button className={`button ${historyFilter === "alerts" ? "button--primary" : "button--secondary"}`} type="button" onClick={() => setHistoryFilter("alerts")}>
                  Alerts
                </button>
              </div>
              {pack.missionCtaSummary.recommendationHistory.length > 0 ? (
                <div className="achievement-list">
                  {pack.missionCtaSummary.recommendationHistory
                    .filter((entry) =>
                      historyFilter === "all"
                        ? true
                        : historyFilter === "lifecycle"
                          ? entry.action === "update_lifecycle"
                          : historyFilter === "benchmark"
                            ? entry.action === "save_benchmark_override" || entry.action === "clear_benchmark_override"
                            : entry.action === "suppress_alert" || entry.action === "clear_alert_suppression",
                    )
                    .map((entry) => (
                    <article key={`${pack.packId}-recommendation-history-${entry.createdAt}-${entry.action}`} className="achievement-card">
                      <div>
                        <strong>{entry.action.replaceAll("_", " ")}</strong>
                        <p>{entry.detail}</p>
                      </div>
                      <div className="achievement-card__side">
                        <span>{entry.changedByDisplayName ?? "Unknown admin"}</span>
                        <span>{new Date(entry.createdAt).toLocaleString()}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
              {pack.missionCtaSummary.variantBreakdown.length > 0 ? (
                <div className="achievement-list">
                  {pack.missionCtaSummary.variantBreakdown.map((entry) => (
                    <article key={`${pack.packId}-${entry.ctaVariant}-${entry.ctaLabel ?? "unknown"}`} className="achievement-card">
                      <div>
                        <strong>{entry.ctaVariant}</strong>
                        <p>{entry.ctaLabel ?? "Mission CTA"}.</p>
                        <p className="form-note">
                          {entry.approvedCompletionCount} approved completions from {entry.approvedUserCount} users after this CTA path.
                        </p>
                        <p className="form-note">
                          {entry.laneBreakdown.length > 0
                            ? entry.laneBreakdown
                              .map((lane) => `${lane.attributionSource} -> ${lane.activeLane}: ${lane.uniqueUsers}`)
                              .join(", ")
                            : "No lane-specific CTA mix recorded yet."}
                        </p>
                        <p className="form-note">
                          {entry.tierBreakdown.length > 0
                            ? entry.tierBreakdown
                              .map((tier) => `${tier.subscriptionTier}: ${tier.clickCount} clicks / ${tier.approvedUserCount} approved users / ${Math.round(tier.approvedUserRate * 100)}%`)
                              .join(", ")
                            : "No tier-specific CTA performance recorded yet."}
                        </p>
                      </div>
                      <div className="achievement-card__side">
                        <span>{entry.clickCount} clicks</span>
                        <span>{entry.uniqueUsers} users</span>
                        <span>{(entry.approvedUserRate * 100).toFixed(0)}% approved-user rate</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
              {pack.missionCtaSummary.variantComparison.length > 0 ? (
                <div className="achievement-list">
                  {pack.missionCtaSummary.variantComparison.map((entry) => (
                    <article key={`${pack.packId}-compare-${entry.variant}`} className="achievement-card">
                      <div>
                        <strong>{entry.variant}</strong>
                        <p className="form-note">
                          {entry.clickCount} clicks, {(entry.walletLinkRate * 100).toFixed(0)}% wallet-linked, {(entry.approvedUserRate * 100).toFixed(0)}% approved-user rate.
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
              <p className="form-note">
                CTA to pack funnel: {pack.participantCount > 0 ? ((pack.missionCtaSummary.uniqueUsers / pack.participantCount) * 100).toFixed(0) : "0"}% of participants touched a mission CTA, {pack.missionCtaSummary.uniqueUsers > 0 ? ((pack.approvedCompletionCount / pack.missionCtaSummary.uniqueUsers) * 100).toFixed(0) : "0"}% approved completions per CTA user, and {pack.questCount > 0 ? ((pack.approvedCompletionCount / pack.questCount) * 100).toFixed(0) : "0"}% quest-to-approval density across the pack.
              </p>
              <p className="form-note">
                Benchmark lane: {pack.benchmark.activeLane}. Targets: {Math.round(pack.benchmark.walletLinkRateTarget * 100)}% wallet,
                {` `}
                {Math.round(pack.benchmark.rewardEligibilityRateTarget * 100)}% eligibility, {Math.round(pack.benchmark.premiumConversionRateTarget * 100)}% premium,
                {` `}
                {Math.round(pack.benchmark.retainedActivityRateTarget * 100)}% retained activity, {pack.benchmark.averageWeeklyXpTarget} weekly XP, {pack.benchmark.zeroCompletionWeekThreshold} zero-completion week trigger. Status: {pack.benchmark.status}
                {pack.benchmark.isOverridden ? " · custom pack override active" : " · lane default"}
                {pack.benchmark.overrideReason ? ` · ${pack.benchmark.overrideReason}` : ""}.
              </p>
              <p className="form-note">
                Partner-safe summary: <strong>{partnerReports.find((entry) => entry.packId === pack.packId)?.partnerSummaryHeadline ?? "Summary pending"}</strong>
                {` `}
                {partnerReports.find((entry) => entry.packId === pack.packId)?.partnerSummaryDetail ?? ""}
              </p>
              <p className="form-note">
                Partner-safe operator read: <strong>{partnerReports.find((entry) => entry.packId === pack.packId)?.operatorOutcomeTitle ?? "Outcome pending"}</strong>
                {` `}
                {partnerReports.find((entry) => entry.packId === pack.packId)?.operatorOutcomeDetail ?? ""}
              </p>
              <p className="form-note">
                {partnerReports.find((entry) => entry.packId === pack.packId)?.lifecyclePhaseSummary ?? ""}
              </p>
              <p className="form-note">
                {partnerReports.find((entry) => entry.packId === pack.packId)?.benchmarkOverrideImpactSummary ?? ""}
              </p>
              {partnerReports.find((entry) => entry.packId === pack.packId)?.benchmarkOverrideHistorySummary ? (
                <p className="form-note">
                  Benchmark change history: {partnerReports.find((entry) => entry.packId === pack.packId)?.benchmarkOverrideHistorySummary}
                </p>
              ) : null}
              {partnerReports.find((entry) => entry.packId === pack.packId)?.lifecycleHistorySummary ? (
                <p className="form-note">
                  Lifecycle history: {partnerReports.find((entry) => entry.packId === pack.packId)?.lifecycleHistorySummary}
                </p>
              ) : null}
              {getPackControlChangeSummary(auditEntries, pack.packId) ? (
                <p className="form-note">
                  Recent control changes: {getPackControlChangeSummary(auditEntries, pack.packId)}
                </p>
              ) : null}
              {partnerReports.find((entry) => entry.packId === pack.packId)?.recommendationHistorySnapshot.length ? (
                <p className="form-note">
                  Recent pack shifts: {partnerReports.find((entry) => entry.packId === pack.packId)?.recommendationHistorySnapshot.join(" | ")}
                </p>
              ) : null}
              <div className="achievement-list">
                {auditEntries
                  .filter((entry) => entry.packId === pack.packId && (entry.action === "save_benchmark_override" || entry.action === "clear_benchmark_override"))
                  .slice(0, 3)
                  .map((entry) => (
                    <article key={entry.id} className="achievement-card">
                      <div>
                        <strong>{entry.action === "save_benchmark_override" ? "Threshold override saved" : "Threshold override cleared"}</strong>
                        <p>{entry.detail}</p>
                      </div>
                      <div className="achievement-card__side">
                        <span>{entry.changedByDisplayName ?? "Unknown admin"}</span>
                        <span>{new Date(entry.createdAt).toLocaleString()}</span>
                      </div>
                    </article>
                  ))}
              </div>
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
                  <span>Retained activity target</span>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={getBenchmarkDraft(pack).retainedActivityRateTarget}
                    onChange={(event) =>
                      updateBenchmarkDraft(pack, { retainedActivityRateTarget: Number(event.target.value) })
                    }
                  />
                </label>
                <label className="field">
                  <span>Zero-completion week trigger</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={getBenchmarkDraft(pack).zeroCompletionWeekThreshold}
                    onChange={(event) =>
                      updateBenchmarkDraft(pack, { zeroCompletionWeekThreshold: Number(event.target.value) })
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
