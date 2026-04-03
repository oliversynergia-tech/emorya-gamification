import type { QueryResultRow } from "pg";

import {
  applyDirectTokenRewardBonus,
  applyEligibilityPointsMultiplier,
  defaultEconomySettings,
  getCampaignEconomyOverride,
  getCampaignLeaderboardMomentumMultiplier,
  getCampaignPremiumUpsellMultiplier,
  getCampaignWeeklyTargetOffset,
  getXpTierMultiplier,
  resolveCampaignExperienceSource,
} from "@/lib/economy-settings";
import {
  getBrandDisplayReferralCode,
  getBrandSafeOnboardingHint,
  getBrandSafeRewardFocus,
  getBrandSafeStarterPathPrompt,
  getBrandSafeWalletLinkPrompt,
} from "@/lib/brand-copy";
import { getCampaignPackBenchmark } from "@/lib/campaign-pack-benchmarks";
import { getCampaignFeaturedTracks } from "@/lib/campaign-source";
import {
  getModerationAlertChannelConfig,
  getQueueAlertThresholds,
  hasDatabaseConfig,
} from "@/lib/config";
import {
  activationPathCompletionQuestSlug,
  buildRewardConfig,
  getWeeklyProgressBand,
  inferQuestTrack,
  inferTokenEffect,
  projectTokenRedemption,
  starterPathRequirements,
} from "@/lib/progression-rules";
import { getLevelProgress, getTierLabel } from "@/lib/progression";
import { defaultConnectionRewards } from "@/lib/social-platforms";
import type { SupportedSocialPlatform } from "@/lib/social-platforms";
import { resolveRuntimeBrandThemeId } from "@/lib/brand-themes/server";
import type {
  Achievement,
  ActivityItem,
  AdminOverviewData,
  AuthUser,
  CampaignSource,
  DashboardData,
  EconomySettings,
  LeaderboardEntry,
  Quest,
  QuestTrack,
  SubscriptionTier,
  TokenAsset,
  UserSnapshot,
  VerificationType,
} from "@/lib/types";
import { runQuery } from "@/server/db/client";
import { listUsersWithRoles } from "@/server/repositories/admin-repository";
import { listAdminUsers } from "@/server/repositories/admin-repository";
import {
  getActiveEconomySettings,
  listEconomySettingsAudit,
} from "@/server/repositories/economy-settings-repository";
import {
  getCurrentAllTimeRankForUser,
  getCurrentReferralRankForUser,
  getLiveAllTimeLeaderboard,
  getLiveReferralLeaderboard,
  syncLeaderboardSnapshotsForToday,
} from "@/server/repositories/leaderboard-repository";
import {
  listRecentModerationNotificationDeliveries,
  syncModerationNotificationHistory,
} from "@/server/repositories/moderation-notification-repository";
import {
  listRecentCampaignPackAudit,
} from "@/server/repositories/campaign-pack-audit-repository";
import {
  listCampaignPackBenchmarkOverrides,
} from "@/server/repositories/campaign-pack-admin-repository";
import {
  getCampaignPackAlertSuppressionAnalytics,
  listActiveCampaignPackAlertSuppressions,
  listRecentCampaignPackNotificationDeliveries,
  syncCampaignPackNotificationHistory,
} from "@/server/repositories/campaign-pack-notification-repository";
import {
  getPendingReviewQueue,
  getRecentReviewHistory,
  getReviewBreakdownByVerificationType,
  getReviewerTypeMatrix,
  getReviewerWorkload,
} from "@/server/repositories/quest-repository";
import { listQuestDefinitionsForAdmin } from "@/server/repositories/quest-definition-admin-repository";
import { getReferralAnalytics, getReferralSummary } from "@/server/repositories/referral-repository";
import {
  listRecentTokenRedemptionAudit,
  getTokenSettlementAnalytics,
  listPendingTokenSettlements,
} from "@/server/repositories/token-redemption-repository";
import {
  listRewardAssets,
  listRewardPrograms,
} from "@/server/repositories/reward-program-repository";
import { listQuestDefinitionTemplatesForAdmin } from "@/server/repositories/quest-template-admin-repository";
import { buildDashboardQuestBoard } from "@/server/services/build-dashboard-quest-board";
import { buildModerationNotifications } from "@/server/services/moderation-notifications";
import { buildCampaignPackNotifications } from "@/server/services/campaign-pack-notifications";
import { syncAchievementProgressForUser } from "@/server/services/progression-service";
import {
  getReferralRewardTargets,
  referralCampaignIncentives,
} from "@/server/services/referral-rules";
import { syncReferralRewardsForReferrer } from "@/server/services/referral-service";
import { getUserProgressState } from "@/server/services/user-progress-state";
import { deriveUserProgressState } from "@/server/services/user-progress-state";
import { resolveUserJourneyState } from "@/server/services/user-journey-state";
import type { UserProgressState, UserJourneyState } from "@/lib/types";

type UserRow = QueryResultRow & {
  id: string;
  display_name: string;
  attribution_source: string | null;
  level: number;
  total_xp: number;
  current_streak: number;
  subscription_tier: SubscriptionTier;
  referral_code: string;
};

type SocialConnectionRow = QueryResultRow & {
  platform: SupportedSocialPlatform;
  verified: boolean;
};

type PackParticipantRow = QueryResultRow & {
  pack_id: string;
  user_id: string;
};

type PackProgressUserRow = QueryResultRow & {
  id: string;
  level: number;
  total_xp: number;
  current_streak: number;
  subscription_tier: SubscriptionTier;
  subscription_started_at: string | null;
  attribution_source: string | null;
};

type PackWalletRow = QueryResultRow & {
  user_id: string;
  created_at: string;
};

type PackSocialRow = QueryResultRow & {
  user_id: string;
  platform: SupportedSocialPlatform;
};

type PackReferralCountsRow = QueryResultRow & {
  user_id: string;
  successful_referrals: string;
  monthly_premium_referrals: string;
  annual_premium_referrals: string;
};

type PackWeeklyXpRow = QueryResultRow & {
  user_id: string;
  weekly_xp: string;
};

type PackCompletedQuestRow = QueryResultRow & {
  user_id: string;
  slug: string;
  category: Quest["category"];
  verification_type: VerificationType;
  required_level: number;
  is_premium_preview: boolean;
};

type PackFirstInteractionRow = QueryResultRow & {
  pack_id: string;
  user_id: string;
  first_interaction_at: string;
};

type PackReferralPerformanceRow = QueryResultRow & {
  pack_id: string;
  invited_count: string;
  converted_count: string;
};

type PackAttributedReferralRow = QueryResultRow & {
  pack_id: string;
  invited_count: string;
  converted_count: string;
};

type PackTrendRow = QueryResultRow & {
  pack_id: string;
  bucket_start: string;
  participant_count: string;
  completion_count: string;
};

type QuestRow = QueryResultRow & {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: Quest["category"];
  xp_reward: number;
  difficulty: Quest["difficulty"];
  verification_type: VerificationType;
  required_level: number;
  required_tier: SubscriptionTier;
  is_premium_preview: boolean;
  recurrence: "one-time" | "daily" | "weekly" | "monthly";
  metadata: Record<string, unknown>;
  completion_status: "pending" | "approved" | "rejected" | null;
};

type CampaignPackJourneyRow = QueryResultRow & {
  pack_id: string;
  pack_label: string | null;
  pack_state: "draft" | "ready" | "live" | null;
  attribution_source: CampaignSource | "direct" | null;
  experience_lane: CampaignSource | "direct" | null;
  template_kind: "bridge" | "feeder" | "mixed" | null;
  quest_id: string;
  quest_title: string;
  quest_slug: string;
  category: Quest["category"];
  verification_type: VerificationType;
  is_premium_preview: boolean;
  recurrence: "one-time" | "daily" | "weekly" | "monthly";
  metadata: Record<string, unknown>;
  completion_status: "pending" | "approved" | "rejected" | null;
};

type CampaignPackHistoryRow = QueryResultRow & {
  pack_id: string;
  pack_label: string | null;
  pack_state: "draft" | "ready" | "live" | null;
  attribution_source: CampaignSource | "direct" | null;
  experience_lane: CampaignSource | "direct" | null;
  template_kind: "bridge" | "feeder" | "mixed" | null;
  quest_count: string;
  approved_count: string;
  total_xp_awarded: string;
  premium_quest_count: string;
  referral_quest_count: string;
  completed_at: string | null;
};

type MissionInboxStateRow = QueryResultRow & {
  notification_id: string;
  notification_status: "handled" | "snoozed";
  notification_until: string | null;
};

type MissionInboxHistoryRow = QueryResultRow & {
  id: string;
  display_name: string;
  pack_id: string | null;
  notification_status: "handled" | "snoozed" | null;
  notification_until: string | null;
  reminder_variant: string | null;
  reminder_schedule: "today" | "this_week" | "wait_for_unlock" | null;
  detail: string | null;
  created_at: string;
};

type MissionReminderStatusTrendRow = QueryResultRow & {
  notification_status: "handled" | "snoozed" | null;
  bucket: "current" | "previous";
  count: string;
};

type MissionReminderVariantRow = QueryResultRow & {
  reminder_variant: string | null;
  notification_status: "handled" | "snoozed" | null;
  bucket: "current" | "previous";
  count: string;
};

type AchievementRow = QueryResultRow & {
  slug: string;
  name: string;
  description: string;
  category: string;
  progress: number | string;
  earned_at: string | null;
};

type ActivityRow = QueryResultRow & {
  id: string;
  action_type: string;
  created_at: string;
  display_name: string | null;
  metadata: { actor?: string; action?: string; detail?: string; timeAgo?: string };
};

type ApprovedRewardQuestRow = QueryResultRow & {
  slug: string;
  category: Quest["category"];
  xp_reward: number;
  verification_type: VerificationType;
  is_premium_preview: boolean;
  metadata: Record<string, unknown>;
};

type TokenRedemptionRow = QueryResultRow & {
  id: string;
  asset: TokenAsset;
  reward_program_name: string | null;
  eligibility_points_spent: number | string;
  token_amount: number | string;
  status: "claimed" | "settled";
  workflow_state: "queued" | "approved" | "processing" | "held" | "failed" | "cancelled" | "settled";
  source: string;
  created_at: string;
  approved_at: string | null;
  approved_by_display_name: string | null;
  processing_started_at: string | null;
  processing_by_display_name: string | null;
  held_at: string | null;
  held_by_display_name: string | null;
  hold_reason: string | null;
  failed_at: string | null;
  failed_by_display_name: string | null;
  last_error: string | null;
  cancelled_at: string | null;
  cancelled_by_display_name: string | null;
  cancellation_reason: string | null;
  retry_count: number | string;
  settled_at: string | null;
  receipt_reference: string | null;
  settlement_note: string | null;
  settled_by_display_name: string | null;
};

export function isDatabaseEnabled() {
  return hasDatabaseConfig();
}

async function getPrimaryUserId() {
  const result = await runQuery<{ id: string }>(
    `SELECT id
     FROM users
     ORDER BY
       CASE WHEN email = 'oliver@emorya.com' THEN 0 ELSE 1 END,
       created_at ASC
     LIMIT 1`,
  );

  return result.rows[0]?.id ?? null;
}

async function resolveDashboardUserId(currentUser?: AuthUser | null) {
  if (currentUser?.id) {
    return currentUser.id;
  }

  return getPrimaryUserId();
}

async function getDashboardUser(userId: string): Promise<UserRow> {
  const userResult = await runQuery<UserRow>(
    `SELECT id, display_name, attribution_source, level, total_xp, current_streak, subscription_tier, referral_code
     FROM users
     WHERE id = $1`,
    [userId],
  );

  const user = userResult.rows[0];

  if (!user) {
    throw new Error(`User not found for dashboard: ${userId}`);
  }

  return user;
}

function getNextRewardRequirement(progressState: UserProgressState, journeyState: UserJourneyState) {
  if (!progressState.walletLinked) {
    return "Connect xPortal";
  }

  if (!progressState.starterPathComplete) {
    return "Complete Activation Path";
  }

  if (progressState.level < 5) {
    return "Reach Level 5";
  }

  if (progressState.trustScoreBand === "low") {
    return "Increase trust with more verified activity";
  }

  if (journeyState === "monthly_premium") {
    return "Upgrade to Annual for direct reward spikes";
  }

  return null;
}

function buildStarterPathProgress(progressState: UserProgressState) {
  const hasClaimedActivationReward = progressState.completedQuestSlugs.includes(activationPathCompletionQuestSlug);
  const steps = starterPathRequirements.stepGroups.map((stepGroup) => {
    const completedQuestCount = hasClaimedActivationReward
      ? stepGroup.slugs.length
      : stepGroup.slugs.filter((slug) => progressState.completedQuestSlugs.includes(slug)).length;

    return {
      label: stepGroup.label,
      complete: hasClaimedActivationReward || completedQuestCount >= stepGroup.slugs.length,
      detail: hasClaimedActivationReward
        ? stepGroup.detail
        : `${Math.min(completedQuestCount, stepGroup.slugs.length)} / ${stepGroup.slugs.length} complete. ${stepGroup.detail}`,
    };
  });
  const completedSteps = steps.filter((step) => step.complete).length;
  const nextStep = steps.find((step) => !step.complete) ?? null;
  const progress = steps.length > 0 ? completedSteps / steps.length : 0;

  return {
    complete: progressState.starterPathComplete,
    progress,
    title: progressState.starterPathComplete ? "Activation ladder complete" : "Activation ladder in progress",
    summary: progressState.starterPathComplete
      ? "The account is fully activated and has crossed the onboarding bridge into reward-ready progression."
      : "This is the shortest route from campaign arrival to a fully activated, wallet-ready Emorya user.",
    nextStepLabel: nextStep?.label ?? null,
    nextStepDetail: nextStep?.detail ?? null,
    completionLabel: "Full activation reward",
    completionDetail:
      "The largest onboarding reward lands at full activation completion, not at the first setup step.",
    steps,
  };
}

async function getUserSnapshot(
  user: UserRow,
  progressState: UserProgressState,
  journeyState: UserJourneyState,
  economySettings = defaultEconomySettings,
): Promise<UserSnapshot> {
  const [connectionsResult, rankResult, referralRank, referral, approvedRewardQuestResult, redemptionHistoryResult] = await Promise.all([
    runQuery<SocialConnectionRow>(
      `SELECT platform, verified
       FROM social_connections
       WHERE user_id = $1
       ORDER BY platform ASC`,
      [user.id],
    ),
    getCurrentAllTimeRankForUser(user.id),
    getCurrentReferralRankForUser(user.id),
    getReferralSummary(user.id),
    runQuery<ApprovedRewardQuestRow>(
      `SELECT q.slug, q.category, q.xp_reward, q.verification_type, q.is_premium_preview, q.metadata
       FROM quest_completions qc
       INNER JOIN quest_definitions q ON q.id = qc.quest_id
       WHERE qc.user_id = $1
         AND qc.status = 'approved'`,
      [user.id],
    ),
    runQuery<TokenRedemptionRow>(
      `SELECT redemptions.id, redemptions.asset, programs.name AS reward_program_name,
              redemptions.eligibility_points_spent, redemptions.token_amount,
              redemptions.status, redemptions.workflow_state, redemptions.source, redemptions.created_at,
              redemptions.approved_at, approved_by_users.display_name AS approved_by_display_name,
              redemptions.processing_started_at, processing_by_users.display_name AS processing_by_display_name,
              redemptions.held_at, held_by_users.display_name AS held_by_display_name,
              redemptions.hold_reason, redemptions.failed_at, failed_by_users.display_name AS failed_by_display_name,
              redemptions.last_error, redemptions.cancelled_at,
              cancelled_by_users.display_name AS cancelled_by_display_name, redemptions.cancellation_reason,
              redemptions.retry_count,
              redemptions.settled_at,
              redemptions.receipt_reference, redemptions.settlement_note,
              settled_by_users.display_name AS settled_by_display_name
       FROM token_redemptions redemptions
       LEFT JOIN reward_programs programs ON programs.id = redemptions.reward_program_id
       LEFT JOIN users approved_by_users ON approved_by_users.id = redemptions.approved_by
       LEFT JOIN users processing_by_users ON processing_by_users.id = redemptions.processing_by
       LEFT JOIN users held_by_users ON held_by_users.id = redemptions.held_by
       LEFT JOIN users failed_by_users ON failed_by_users.id = redemptions.failed_by
       LEFT JOIN users cancelled_by_users ON cancelled_by_users.id = redemptions.cancelled_by
       LEFT JOIN users settled_by_users ON settled_by_users.id = redemptions.settled_by
       WHERE redemptions.user_id = $1
       ORDER BY redemptions.created_at DESC
       LIMIT 8`,
      [user.id],
    ),
  ]);

  const nextLevelXp = getLevelProgress(user.total_xp).nextThreshold;
  const weeklyProgress = getWeeklyProgressBand(
    progressState.weeklyXp,
    getCampaignWeeklyTargetOffset(economySettings, progressState.campaignSource),
  );
  const rewardSummaries = approvedRewardQuestResult.rows.map((quest) => {
    const track = inferQuestTrack({
      slug: quest.slug,
      category: quest.category,
      verificationType: quest.verification_type,
      isPremiumPreview: quest.is_premium_preview,
      metadata: quest.metadata,
    });
    const tokenEffect = inferTokenEffect(track, quest.metadata);

    return buildRewardConfig({
      baseXp: quest.xp_reward,
      tokenEffect,
      metadata: quest.metadata,
    });
  });
  const baseEligibilityPoints = rewardSummaries.reduce(
    (sum, reward) => sum + (reward.tokenEligibility?.progressPoints ?? 0),
    0,
  );
  const eligibilityPoints = applyEligibilityPointsMultiplier(
    baseEligibilityPoints,
    economySettings,
    progressState.campaignSource,
  );
  const scheduledDirectRewardMap = new Map<TokenAsset, number>();

  for (const reward of rewardSummaries) {
    if (!reward.directTokenReward) {
      continue;
    }

    scheduledDirectRewardMap.set(
      reward.directTokenReward.asset,
      (scheduledDirectRewardMap.get(reward.directTokenReward.asset) ?? 0) +
        applyDirectTokenRewardBonus(
          reward.directTokenReward.amount,
          economySettings,
          progressState.campaignSource,
        ),
    );
  }

  const redemptionProjection = projectTokenRedemption({
    eligibilityPoints,
    subscriptionTier: user.subscription_tier,
    rewardEligible: progressState.rewardEligible,
    walletLinked: progressState.walletLinked,
    campaignSource: progressState.campaignSource,
    settings: economySettings,
  });
  const redemptionHistory = redemptionHistoryResult.rows.map((row) => ({
    id: row.id,
    asset: row.asset,
    rewardProgramName: row.reward_program_name,
    tokenAmount: Number(row.token_amount),
    eligibilityPointsSpent: Number(row.eligibility_points_spent),
    status: row.status,
    workflowState: row.workflow_state,
    source: row.source,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    approvedByDisplayName: row.approved_by_display_name,
    processingStartedAt: row.processing_started_at,
    processingByDisplayName: row.processing_by_display_name,
    heldAt: row.held_at,
    heldByDisplayName: row.held_by_display_name,
    holdReason: row.hold_reason,
    failedAt: row.failed_at,
    failedByDisplayName: row.failed_by_display_name,
    lastError: row.last_error,
    cancelledAt: row.cancelled_at,
    cancelledByDisplayName: row.cancelled_by_display_name,
    cancellationReason: row.cancellation_reason,
    retryCount: Number(row.retry_count ?? 0),
    settledAt: row.settled_at,
    receiptReference: row.receipt_reference,
    settlementNote: row.settlement_note,
    settledByDisplayName: row.settled_by_display_name,
  }));
  const claimedBalance = redemptionHistory.reduce(
    (sum, entry) => sum + (entry.status === "claimed" ? entry.tokenAmount : 0),
    0,
  );
  const settledBalance = redemptionHistory.reduce(
    (sum, entry) => sum + (entry.status === "settled" ? entry.tokenAmount : 0),
    0,
  );
  const monthlyReferralPreview = getReferralRewardTargets({
    subscriptionTier: "monthly",
    campaignSource: progressState.campaignSource,
  });
  const annualReferralPreview = getReferralRewardTargets({
    subscriptionTier: "annual",
    campaignSource: progressState.campaignSource,
  });
  const campaignEconomy = getCampaignEconomyOverride(economySettings, progressState.campaignSource);
  const activeCampaignLane = resolveCampaignExperienceSource(economySettings, progressState.campaignSource);
  const featuredTracks = getCampaignFeaturedTracks(activeCampaignLane, campaignEconomy);
  const tokenNotifications: UserSnapshot["tokenProgram"]["notifications"] = [];
  const latestClaimedRedemption = redemptionHistory.find((entry) => entry.status === "claimed");
  const latestApprovedRedemption = redemptionHistory.find((entry) => entry.workflowState === "approved");
  const latestProcessingRedemption = redemptionHistory.find((entry) => entry.workflowState === "processing");
  const latestHeldRedemption = redemptionHistory.find((entry) => entry.workflowState === "held");
  const latestFailedRedemption = redemptionHistory.find((entry) => entry.workflowState === "failed");
  const latestSettledRedemption = redemptionHistory.find((entry) => entry.status === "settled");

  if (latestClaimedRedemption) {
    tokenNotifications.push({
      id: `claimed-${latestClaimedRedemption.id}`,
      tone: "warning",
      title: "Claimed payout awaiting settlement",
      detail: `${latestClaimedRedemption.tokenAmount} ${latestClaimedRedemption.asset} from ${latestClaimedRedemption.source} is reserved and waiting for receipt-confirmed payout.`,
    });
  }

  if (latestApprovedRedemption) {
    tokenNotifications.push({
      id: `approved-${latestApprovedRedemption.id}`,
      tone: "info",
      title: "Payout approved",
      detail: `${latestApprovedRedemption.tokenAmount} ${latestApprovedRedemption.asset} has been approved${latestApprovedRedemption.approvedByDisplayName ? ` by ${latestApprovedRedemption.approvedByDisplayName}` : ""} and is waiting for processing.`,
    });
  }

  if (latestProcessingRedemption) {
    tokenNotifications.push({
      id: `processing-${latestProcessingRedemption.id}`,
      tone: "info",
      title: "Payout in processing",
      detail: `${latestProcessingRedemption.tokenAmount} ${latestProcessingRedemption.asset} is currently in processing${latestProcessingRedemption.processingByDisplayName ? ` with ${latestProcessingRedemption.processingByDisplayName}` : ""}.`,
    });
  }

  if (latestHeldRedemption) {
    tokenNotifications.push({
      id: `held-${latestHeldRedemption.id}`,
      tone: "warning",
      title: "Payout on hold",
      detail: `${latestHeldRedemption.tokenAmount} ${latestHeldRedemption.asset} is paused${latestHeldRedemption.holdReason ? `: ${latestHeldRedemption.holdReason}` : "."}`,
    });
  }

  if (latestFailedRedemption) {
    tokenNotifications.push({
      id: `failed-${latestFailedRedemption.id}`,
      tone: "warning",
      title: "Payout needs attention",
      detail: `${latestFailedRedemption.tokenAmount} ${latestFailedRedemption.asset} hit a payout error${latestFailedRedemption.lastError ? `: ${latestFailedRedemption.lastError}` : "."}`,
    });
  }

  if (latestSettledRedemption) {
    tokenNotifications.push({
      id: `settled-${latestSettledRedemption.id}`,
      tone: "success",
      title: "Recent payout settled",
      detail: `${latestSettledRedemption.tokenAmount} ${latestSettledRedemption.asset} settled${latestSettledRedemption.receiptReference ? ` with receipt ${latestSettledRedemption.receiptReference}` : ""}.`,
    });
  }

  if (scheduledDirectRewardMap.size > 0) {
    const scheduledSummary = Array.from(scheduledDirectRewardMap.entries())
      .map(([asset, amount]) => `${amount} ${asset}`)
      .join(", ");
    tokenNotifications.push({
      id: "scheduled-direct-reward",
      tone: "info",
      title: "Direct reward scheduled",
      detail: `${scheduledSummary} is lined up through the active direct-reward path once the matching campaign or settlement step completes.`,
    });
  }

  if (progressState.campaignSource) {
    const attributionDetail = progressState.campaignSource !== activeCampaignLane
      ? ` Attributed from ${progressState.campaignSource}, but currently routed through the ${activeCampaignLane} bridge lane.`
      : "";
    tokenNotifications.push({
      id: `campaign-override-${progressState.campaignSource}`,
      tone: "info",
      title: `${activeCampaignLane} reward preset active`,
      detail: `The active experience lane adds +${campaignEconomy.questXpMultiplierBonus.toFixed(2)}x quest XP, ${(campaignEconomy.eligibilityPointsMultiplierBonus * 100).toFixed(0)}% extra eligibility-point growth, ${(campaignEconomy.tokenYieldMultiplierBonus * 100).toFixed(0)}% token-yield lift, ${campaignEconomy.minimumEligibilityPointsOffset} points on the redemption threshold, ${campaignEconomy.weeklyTargetXpOffset} XP on weekly target shaping, and ${(campaignEconomy.premiumUpsellBonusMultiplier * 100).toFixed(0)}% extra premium pressure.${attributionDetail}`,
    });
    tokenNotifications.push({
      id: `campaign-featured-${progressState.campaignSource}`,
      tone: "info",
      title: `${activeCampaignLane} featured tracks`,
      detail: `The active experience lane is currently pushing ${featuredTracks.join(", ")} higher in the funnel so onboarding pressure matches the live bridge path.${attributionDetail}`,
    });
  }

  return {
    displayName: user.display_name,
    level: user.level,
    totalXp: user.total_xp,
    currentStreak: user.current_streak,
    xpMultiplier: getXpTierMultiplier(economySettings, user.subscription_tier, progressState.campaignSource),
    nextLevelXp,
    tier: user.subscription_tier,
    journeyState,
    campaignSource: progressState.campaignSource,
    rank: rankResult,
    referralCode: getBrandDisplayReferralCode(user.referral_code),
    starterPath: buildStarterPathProgress(progressState),
    rewardEligibility: {
      eligible: progressState.rewardEligible,
      trustScoreBand: progressState.trustScoreBand,
      nextRequirement: getNextRewardRequirement(progressState, journeyState),
    },
    weeklyProgress,
    tokenProgram: {
      status: redemptionProjection.status,
      asset: redemptionProjection.asset,
      redemptionEnabled: economySettings.redemptionEnabled,
      eligibilityPoints,
      minimumPoints: redemptionProjection.minimumPoints,
      projectedRedemptionAmount: redemptionProjection.projectedRedemptionAmount,
      claimedBalance,
      settledBalance,
      nextRedemptionPoints: redemptionProjection.nextRedemptionPoints,
      tierMultiplier: redemptionProjection.tierMultiplier,
    scheduledDirectRewards: Array.from(scheduledDirectRewardMap.entries()).map(([asset, amount]) => ({
      asset,
      amount,
      rewardProgramName: null,
    })),
    assetBreakdown: Array.from(
      redemptionHistory.reduce((map, entry) => {
        const current = map.get(entry.asset) ?? {
          asset: entry.asset,
          claimedAmount: 0,
          settledAmount: 0,
          totalAmount: 0,
          receiptCount: 0,
        };
        current.totalAmount += entry.tokenAmount;
        current.receiptCount += 1;
        if (entry.status === "settled") {
          current.settledAmount += entry.tokenAmount;
        } else {
          current.claimedAmount += entry.tokenAmount;
        }
        map.set(entry.asset, current);
        return map;
      }, new Map<TokenAsset, UserSnapshot["tokenProgram"]["assetBreakdown"][number]>()),
    ).map(([, value]) => value),
    programBreakdown: Array.from(
      redemptionHistory.reduce((map, entry) => {
        const key = entry.rewardProgramName ?? "Unassigned program";
        const current = map.get(key) ?? {
          rewardProgramName: key,
          asset: entry.asset,
          claimedAmount: 0,
          settledAmount: 0,
          totalAmount: 0,
          receiptCount: 0,
        };
        current.totalAmount += entry.tokenAmount;
        current.receiptCount += 1;
        if (entry.status === "settled") {
          current.settledAmount += entry.tokenAmount;
        } else {
          current.claimedAmount += entry.tokenAmount;
        }
        map.set(key, current);
        return map;
      }, new Map<string, UserSnapshot["tokenProgram"]["programBreakdown"][number]>()),
    ).map(([, value]) => value),
    redemptionHistory,
      nextStep:
        redemptionProjection.status === "redeemable"
          ? `Redeem ${redemptionProjection.asset} once payout rails are enabled.`
          : !economySettings.redemptionEnabled
            ? `Redemption is currently paused by the active token program.`
            : progressState.walletLinked
            ? `Reach ${redemptionProjection.minimumPoints} eligibility points to unlock your first redemption.`
            : "Connect xPortal to unlock token redemption.",
      notifications: tokenNotifications.slice(0, 6),
    },
    referral: {
      rank: referralRank,
      ...referral,
      rewardPreview: {
        monthlyPremiumReferral: {
          xp: monthlyReferralPreview.conversionXp,
          tokenEffect: "eligibility_progress",
        },
        annualPremiumReferral: {
          xp: annualReferralPreview.conversionXp,
          tokenEffect: "direct_token_reward",
          directTokenReward: annualReferralPreview.annualDirectTokenReward
            ? {
                asset: economySettings.payoutAsset,
                amount: annualReferralPreview.annualDirectTokenReward,
              }
            : undefined,
        },
        sourceBonuses: referralCampaignIncentives.map((incentive) => ({
          source: incentive.source,
          label:
            incentive.source !== resolveCampaignExperienceSource(economySettings, incentive.source)
              ? `${incentive.label} via ${resolveCampaignExperienceSource(economySettings, incentive.source)} bridge`
              : incentive.label,
          signupXp:
            economySettings.referralSignupBaseXp +
            economySettings.campaignOverrides[resolveCampaignExperienceSource(economySettings, incentive.source)].signupBonusXp,
          monthlyPremiumXp:
            economySettings.referralMonthlyConversionBaseXp +
            economySettings.campaignOverrides[resolveCampaignExperienceSource(economySettings, incentive.source)].monthlyConversionBonusXp,
          annualPremiumXp:
            economySettings.referralAnnualConversionBaseXp +
            economySettings.campaignOverrides[resolveCampaignExperienceSource(economySettings, incentive.source)].annualConversionBonusXp,
          annualDirectTokenReward: {
            asset: economySettings.payoutAsset,
            amount:
              economySettings.directRewardsEnabled && economySettings.directAnnualReferralEnabled
                ? economySettings.annualReferralDirectTokenAmount +
                  economySettings.campaignOverrides[resolveCampaignExperienceSource(economySettings, incentive.source)].annualDirectTokenBonus
                : 0,
          },
        })),
      },
    },
    connectedAccounts: connectionsResult.rows.map((connection) => ({
      platform: connection.platform,
      connected: connection.verified,
      rewardXp: defaultConnectionRewards[connection.platform] ?? 15,
    })),
  };
}

function buildQueueMetrics(reviewQueue: AdminOverviewData["reviewQueue"]): AdminOverviewData["queueMetrics"] {
  const thresholds = getQueueAlertThresholds();

  if (reviewQueue.length === 0) {
    return {
      pendingCount: 0,
      oldestPendingMinutes: 0,
      averagePendingMinutes: 0,
      staleCount: 0,
      alerts: [],
      byVerificationType: [],
    };
  }

  const now = Date.now();
  const pendingAges = reviewQueue.map((item) => Math.max(Math.round((now - new Date(item.createdAt).getTime()) / 60000), 0));
  const byVerificationType = new Map<VerificationType, number>();

  for (const item of reviewQueue) {
    byVerificationType.set(item.verificationType, (byVerificationType.get(item.verificationType) ?? 0) + 1);
  }

  const oldestPendingMinutes = Math.max(...pendingAges);
  const averagePendingMinutes = Math.round(pendingAges.reduce((sum, age) => sum + age, 0) / pendingAges.length);
  const staleCount = pendingAges.filter((age) => age >= thresholds.staleMinutes).length;
  const alerts: AdminOverviewData["queueMetrics"]["alerts"] = [];

  if (staleCount > 0) {
    alerts.push({
      severity: "critical",
      title: "SLA breach in queue",
      detail: `${staleCount} submission${staleCount === 1 ? "" : "s"} have been pending for more than ${thresholds.staleMinutes} minutes.`,
    });
  }

  if (oldestPendingMinutes >= thresholds.oldestWarningMinutes) {
    alerts.push({
      severity: staleCount > 0 ? "critical" : "warning",
      title: "Oldest submission is aging out",
      detail: `The oldest pending submission is ${oldestPendingMinutes} minutes old.`,
    });
  }

  if (reviewQueue.length >= thresholds.backlogWarningCount) {
    alerts.push({
      severity: reviewQueue.length >= thresholds.backlogCriticalCount ? "critical" : "warning",
      title: "Backlog pressure is rising",
      detail: `${reviewQueue.length} submissions are waiting for review across all verification lanes.`,
    });
  }

  if (averagePendingMinutes >= thresholds.averageWarningMinutes) {
    alerts.push({
      severity: "warning",
      title: "Average response time is slipping",
      detail: `Average pending age is ${averagePendingMinutes} minutes.`,
    });
  }

  return {
    pendingCount: reviewQueue.length,
    oldestPendingMinutes,
    averagePendingMinutes,
    staleCount,
    alerts,
    byVerificationType: Array.from(byVerificationType.entries())
      .map(([verificationType, count]) => ({ verificationType, count }))
      .sort((left, right) => right.count - left.count || left.verificationType.localeCompare(right.verificationType)),
  };
}

async function getQuestBoard({
  user,
  userProgressState,
  journeyState,
  economySettings = defaultEconomySettings,
}: {
  user: UserRow;
  userProgressState: UserProgressState;
  journeyState: UserJourneyState;
  economySettings?: EconomySettings;
}): Promise<Quest[]> {
  const [result, runtimeBrandThemeId] = await Promise.all([
    runQuery<QuestRow>(
      `SELECT q.id, q.slug, q.title, q.description, q.category, q.xp_reward, q.difficulty, q.verification_type,
              q.required_level, q.required_tier, q.is_premium_preview, q.recurrence, q.metadata,
              qc.status AS completion_status
       FROM quest_definitions
       q
       LEFT JOIN quest_completions qc
         ON qc.quest_id = q.id
        AND qc.user_id = $1
       WHERE q.is_active = TRUE
       ORDER BY q.required_level ASC, q.xp_reward ASC`,
      [user.id],
    ),
    resolveRuntimeBrandThemeId(),
  ]);

  return buildDashboardQuestBoard({
    quests: result.rows,
    userProgressState,
    journeyState,
    settings: economySettings,
    runtimeBrandThemeId,
  });
}

async function getAchievements(userId: string): Promise<Achievement[]> {
  const result = await runQuery<AchievementRow>(
    `SELECT a.slug, a.name, a.description, a.category,
            COALESCE(ua.progress, 0) AS progress, ua.earned_at
     FROM achievements a
     LEFT JOIN user_achievements ua
       ON ua.achievement_id = a.id
      AND ua.user_id = $1
     ORDER BY a.name ASC`,
    [userId],
  );

  return result.rows.map((achievement) => ({
    id: achievement.slug,
    name: achievement.name,
    description: achievement.description,
    category: achievement.category,
    progress: Number(achievement.progress),
    unlocked: Boolean(achievement.earned_at),
  }));
}

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return getLiveAllTimeLeaderboard(12);
}

async function getReferralLeaderboard(): Promise<LeaderboardEntry[]> {
  return getLiveReferralLeaderboard(8);
}

async function getActivityFeed(): Promise<ActivityItem[]> {
  function getRelativeTimeLabel(isoDate: string) {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffMinutes = Math.max(Math.round(diffMs / 60000), 0);

    if (diffMinutes < 1) {
      return "just now";
    }

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    const diffHours = Math.round(diffMinutes / 60);

    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
  }

  const [activityResult, packHistoryResult] = await Promise.all([
    runQuery<ActivityRow>(
    `SELECT al.id, al.action_type, al.created_at, u.display_name, al.metadata
     FROM activity_log al
     INNER JOIN users u ON u.id = al.user_id
     ORDER BY created_at DESC
     LIMIT 8`,
    ),
    runQuery<{
      pack_id: string;
      pack_label: string | null;
      completed_at: string | null;
      display_name: string | null;
      attribution_source: string | null;
      experience_lane: string | null;
      approved_quest_count: string;
      total_quest_count: string;
    }>(
      `SELECT pack_summary.pack_id,
              pack_summary.pack_label,
              pack_summary.completed_at,
              u.display_name,
              pack_summary.attribution_source,
              pack_summary.experience_lane,
              pack_summary.approved_quest_count::text,
              pack_summary.total_quest_count::text
       FROM (
         SELECT completion_summary.user_id,
                completion_summary.pack_id,
                completion_summary.pack_label,
                completion_summary.attribution_source,
                completion_summary.experience_lane,
                completion_summary.completed_at,
                completion_summary.approved_quest_count,
                pack_totals.total_quest_count
         FROM (
           SELECT qc.user_id,
                  q.metadata->>'campaignPackId' AS pack_id,
                  q.metadata->>'campaignPackLabel' AS pack_label,
                  q.metadata->>'campaignAttributionSource' AS attribution_source,
                  q.metadata->>'campaignExperienceLane' AS experience_lane,
                  COUNT(DISTINCT q.id) AS approved_quest_count,
                  MAX(qc.completed_at) AS completed_at
           FROM quest_definitions q
           INNER JOIN quest_completions qc
             ON qc.quest_id = q.id
            AND qc.status = 'approved'
           WHERE q.metadata ? 'campaignPackId'
           GROUP BY qc.user_id,
                    q.metadata->>'campaignPackId',
                    q.metadata->>'campaignPackLabel',
                    q.metadata->>'campaignAttributionSource',
                    q.metadata->>'campaignExperienceLane'
         ) completion_summary
         INNER JOIN (
           SELECT q.metadata->>'campaignPackId' AS pack_id,
                  COUNT(*) AS total_quest_count
           FROM quest_definitions q
           WHERE q.metadata ? 'campaignPackId'
           GROUP BY q.metadata->>'campaignPackId'
         ) pack_totals
           ON pack_totals.pack_id = completion_summary.pack_id
         WHERE completion_summary.approved_quest_count = pack_totals.total_quest_count
       ) pack_summary
       INNER JOIN users u ON u.id = pack_summary.user_id
       WHERE pack_summary.completed_at IS NOT NULL
       ORDER BY pack_summary.completed_at DESC
       LIMIT 4`,
    ),
  ]);

  const activityItems = activityResult.rows.map((row) => ({
    id: row.id,
    actor: row.metadata?.actor ?? row.display_name ?? "User",
    action: row.metadata?.action ?? row.action_type.replaceAll("-", " "),
    detail: row.metadata?.detail ?? "activity event",
    timeAgo: getRelativeTimeLabel(row.created_at),
    createdAt: row.created_at,
  }));

  const packItems = packHistoryResult.rows.map((row) => {
    const approvedQuestCount = Number(row.approved_quest_count ?? 0);
    const totalQuestCount = Number(row.total_quest_count ?? 0);
    const halfwayTarget = Math.ceil(totalQuestCount / 2);
    const action =
      approvedQuestCount >= totalQuestCount && totalQuestCount > 0
        ? "completed campaign pack"
        : approvedQuestCount >= halfwayTarget && totalQuestCount > 1
          ? "reached halfway in campaign pack"
          : "cleared the first mission in";
    const detailBase =
      row.attribution_source && row.experience_lane && row.attribution_source !== row.experience_lane
        ? `${row.pack_label ?? "Campaign pack"} through ${row.attribution_source} into ${row.experience_lane}`
        : row.pack_label ?? "Campaign pack";
    const detail =
      approvedQuestCount >= totalQuestCount && totalQuestCount > 0
        ? detailBase
        : `${detailBase} (${approvedQuestCount}/${totalQuestCount} missions approved)`;

    return {
      id: `campaign-pack-progress-${row.pack_id}-${approvedQuestCount}-${row.completed_at ?? "na"}`,
      actor: row.display_name ?? "User",
      action,
      detail,
      timeAgo: getRelativeTimeLabel(row.completed_at ?? new Date().toISOString()),
      createdAt: row.completed_at ?? new Date().toISOString(),
    };
  });

  return [...activityItems, ...packItems]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      actor: item.actor,
      action: item.action,
      detail: item.detail,
      timeAgo: item.timeAgo,
      createdAt: item.createdAt,
    }));
}

async function buildUserProgressSnapshot(userIds: string[]) {
  if (userIds.length === 0) {
    return {
      progressMap: new Map<string, UserProgressState>(),
      userMap: new Map<string, PackProgressUserRow>(),
      walletMap: new Map<string, string>(),
    };
  }

  const [progressUsers, packWallets, packSocials, packReferrals, packWeeklyXp, packCompletedQuests] = await Promise.all([
    runQuery<PackProgressUserRow>(
      `SELECT id, level, total_xp, current_streak, subscription_tier, subscription_started_at, attribution_source
       FROM users
       WHERE id = ANY($1::uuid[])`,
      [userIds],
    ),
    runQuery<PackWalletRow>(
      `SELECT DISTINCT ON (user_id)
              user_id::text AS user_id,
              created_at
       FROM user_identities
       WHERE user_id = ANY($1::uuid[])
         AND provider = 'multiversx'
         AND status = 'active'
       ORDER BY user_id, created_at ASC`,
      [userIds],
    ),
    runQuery<PackSocialRow>(
      `SELECT user_id::text AS user_id, platform
       FROM social_connections
       WHERE user_id = ANY($1::uuid[])
         AND verified = TRUE
       ORDER BY user_id, platform ASC`,
      [userIds],
    ),
    runQuery<PackReferralCountsRow>(
      `SELECT referrals.referrer_user_id::text AS user_id,
              COUNT(*)::text AS successful_referrals,
              COUNT(*) FILTER (WHERE referrals.referee_subscribed = TRUE AND referee_user.subscription_tier = 'monthly')::text AS monthly_premium_referrals,
              COUNT(*) FILTER (WHERE referrals.referee_subscribed = TRUE AND referee_user.subscription_tier = 'annual')::text AS annual_premium_referrals
       FROM referrals
       INNER JOIN users referee_user ON referee_user.id = referrals.referee_user_id
       WHERE referrals.referrer_user_id = ANY($1::uuid[])
       GROUP BY referrals.referrer_user_id`,
      [userIds],
    ),
    runQuery<PackWeeklyXpRow>(
      `SELECT user_id::text AS user_id,
              COALESCE(SUM(xp_earned), 0)::text AS weekly_xp
       FROM activity_log
       WHERE user_id = ANY($1::uuid[])
         AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY user_id`,
      [userIds],
    ),
    runQuery<PackCompletedQuestRow>(
      `SELECT qc.user_id::text AS user_id,
              q.slug,
              q.category,
              q.verification_type,
              q.required_level,
              q.is_premium_preview
       FROM quest_completions qc
       INNER JOIN quest_definitions q ON q.id = qc.quest_id
       WHERE qc.user_id = ANY($1::uuid[])
         AND qc.status = 'approved'
       ORDER BY qc.user_id, qc.completed_at ASC NULLS LAST, qc.created_at ASC`,
      [userIds],
    ),
  ]);

  const walletMap = new Map(packWallets.rows.map((row) => [row.user_id, row.created_at] as const));
  const socialsMap = new Map<string, SupportedSocialPlatform[]>();
  for (const row of packSocials.rows) {
    const current = socialsMap.get(row.user_id) ?? [];
    current.push(row.platform);
    socialsMap.set(row.user_id, current);
  }
  const referralMap = new Map(packReferrals.rows.map((row) => [row.user_id, row] as const));
  const weeklyXpMap = new Map(packWeeklyXp.rows.map((row) => [row.user_id, Number(row.weekly_xp)] as const));
  const userMap = new Map(progressUsers.rows.map((user) => [user.id, user] as const));
  const completedQuestMap = new Map<string, PackCompletedQuestRow[]>();
  for (const row of packCompletedQuests.rows) {
    const current = completedQuestMap.get(row.user_id) ?? [];
    current.push(row);
    completedQuestMap.set(row.user_id, current);
  }

  const progressMap = new Map<string, UserProgressState>();
  for (const user of progressUsers.rows) {
    const earliestWalletLink = walletMap.get(user.id) ?? null;
    const walletAgeDays = earliestWalletLink
      ? Math.max(Math.floor((Date.now() - new Date(earliestWalletLink).getTime()) / 86400000), 0)
      : 0;

    progressMap.set(
      user.id,
      deriveUserProgressState({
        userId: user.id,
        level: user.level,
        totalXp: user.total_xp,
        currentStreak: user.current_streak,
        weeklyXp: weeklyXpMap.get(user.id) ?? 0,
        walletLinked: Boolean(earliestWalletLink),
        walletAgeDays,
        subscriptionTier: user.subscription_tier,
        connectedSocials: socialsMap.get(user.id) ?? [],
        successfulReferralCount: Number(referralMap.get(user.id)?.successful_referrals ?? 0),
        monthlyPremiumReferralCount: Number(referralMap.get(user.id)?.monthly_premium_referrals ?? 0),
        annualPremiumReferralCount: Number(referralMap.get(user.id)?.annual_premium_referrals ?? 0),
        approvedQuests: (completedQuestMap.get(user.id) ?? []).map((quest) => ({
          slug: quest.slug,
          category: quest.category,
          verificationType: quest.verification_type,
          requiredLevel: quest.required_level,
          isPremiumPreview: quest.is_premium_preview,
        })),
        campaignSource: user.attribution_source,
      }),
    );
  }

  return { progressMap, userMap, walletMap };
}

function dataUserWeeklyTarget(nextThreshold: number | null, currentThreshold: number) {
  if (typeof nextThreshold === "number") {
    return nextThreshold;
  }

  return currentThreshold;
}

function packBadgeLabel(templateKind: "bridge" | "feeder" | "mixed" | null, milestoneLabel: string) {
  if (milestoneLabel === "Pack complete") {
    return "Mission cleared";
  }

  if (templateKind === "bridge") {
    return "Bridge mission";
  }

  if (templateKind === "feeder") {
    return "Feeder mission";
  }

  return "Campaign mission";
}

function getPackTierPhaseCopy(
  tier: SubscriptionTier,
  packLabel: string,
  packKind: "bridge" | "feeder" | "mixed",
  activeLane: CampaignSource | "direct",
) {
  if (tier === "annual") {
    return `${packLabel} is now in its high-yield phase for Annual. Keep momentum here to turn this ${activeLane} mission into stronger referral and reward outcomes.`;
  }

  if (tier === "monthly") {
    return `${packLabel} is in the accelerated Monthly phase. You have the lift to push this ${packKind === "feeder" ? "feeder" : "mission"} pack through faster and compound the weekly XP loop.`;
  }

  return `${packLabel} is still in the free phase. Focus on trust steps, wallet readiness, and clean mission clears before the heavier-value premium phase matters.`;
}

function getPackPriorityReason({
  userProgressState,
  rewardEligible,
  activeLane,
  attributionSource,
}: {
  userProgressState: UserProgressState;
  rewardEligible: boolean;
  activeLane: CampaignSource | "direct";
  attributionSource: CampaignSource | "direct";
}) {
  if (!userProgressState.walletLinked) {
    return "This mission is prioritized because wallet linking is still the gating step into the full reward path.";
  }

  if (!userProgressState.starterPathComplete) {
    return "This mission is prioritized because activation-path completion matters more than deeper reward steps right now.";
  }

  if (!rewardEligible) {
    return "This mission is prioritized because it is the cleanest route toward reward eligibility and repeat trust signals.";
  }

  if (attributionSource !== activeLane) {
    return `This mission is prioritized because your attributed source is still being bridged into the ${activeLane} experience lane.`;
  }

  return "This mission is prioritized because it is the strongest live route for your current weekly momentum and lane pressure.";
}

function getCampaignPackBlockageState({
  userProgressState,
  rewardEligible,
  nextRequirement,
  weeklyGoalShortfall,
  weeklyGoalTarget,
  premiumNudge,
}: {
  userProgressState: UserProgressState;
  rewardEligible: boolean;
  nextRequirement: string | null;
  weeklyGoalShortfall: number;
  weeklyGoalTarget: number;
  premiumNudge: string | null;
}): DashboardData["campaignPacks"][number]["blockageState"] {
  if (!userProgressState.walletLinked) {
    return "wallet_connection";
  }

  if (!userProgressState.starterPathComplete) {
    return "starter_path";
  }

  if (!rewardEligible) {
    const normalizedRequirement = (nextRequirement ?? "").toLowerCase();
    if (normalizedRequirement.includes("level")) {
      return "level";
    }
    if (normalizedRequirement.includes("starter path") || normalizedRequirement.includes("activation path")) {
      return "starter_path";
    }
    return "trust";
  }

  if (premiumNudge) {
    return "premium_phase";
  }

  if (weeklyGoalShortfall > Math.max(weeklyGoalTarget * 0.2, 40)) {
    return "weekly_pace";
  }

  return "ready";
}

function getPackUnlockPreview({
  questStatuses,
  featuredTracks,
  directRewardMetadata,
}: {
  questStatuses: Array<{ status: "available" | "in-progress" | "completed" | "rejected" }>;
  featuredTracks: QuestTrack[];
  directRewardMetadata: { asset: TokenAsset; amount: number } | null;
}) {
  const remainingQuestCount = questStatuses.filter((quest) => quest.status !== "completed").length;

  if (remainingQuestCount <= 1 && directRewardMetadata) {
    return `One more clean step can turn this mission into a ${directRewardMetadata.amount} ${directRewardMetadata.asset} direct reward route.`;
  }

  if (featuredTracks.includes("premium")) {
    return "The next phase of this mission leans harder into premium-weighted quests and stronger XP yield.";
  }

  if (featuredTracks.includes("referral")) {
    return "The next phase of this mission opens a stronger referral moment if you keep the pack moving.";
  }

  return `There are ${remainingQuestCount} mission step${remainingQuestCount === 1 ? "" : "s"} left in this pack, with the next unlock biased toward the current lane focus.`;
}

function getPackUnlockRewardPreview({
  currentQuestTitle,
  nextQuestTitle,
  blockageState,
  directRewardMetadata,
  featuredTracks,
  rewardEligible,
  premiumNudge,
}: {
  currentQuestTitle: string | null;
  nextQuestTitle: string | null;
  blockageState: DashboardData["campaignPacks"][number]["blockageState"];
  directRewardMetadata: { asset: TokenAsset; amount: number } | null;
  featuredTracks: QuestTrack[];
  rewardEligible: boolean;
  premiumNudge: string | null;
}) {
  const currentLabel = currentQuestTitle ?? "this now quest";
  const nextLabel = nextQuestTitle ?? "the next mission step";

  if (blockageState === "wallet_connection") {
    return `Finishing ${currentLabel} keeps this pack pointed at the wallet gate so ${nextLabel} can move into the live reward rail.`;
  }

  if (blockageState === "starter_path") {
    return `Finishing ${currentLabel} clears another activation-ladder step so ${nextLabel} can push identity, trust, and real app use forward.`;
  }

  if (blockageState === "level" || blockageState === "trust") {
    return `Finishing ${currentLabel} adds the XP and verified activity pressure this pack needs before ${nextLabel} can unlock reward eligibility.`;
  }

  if (premiumNudge) {
    return `Finishing ${currentLabel} sets up ${nextLabel} as a stronger premium-conversion moment without dropping mission pace.`;
  }

  if (directRewardMetadata && rewardEligible) {
    return `Finishing ${currentLabel} keeps ${nextLabel} on track for the ${directRewardMetadata.amount} ${directRewardMetadata.asset} direct reward route.`;
  }

  if (featuredTracks.includes("referral")) {
    return `Finishing ${currentLabel} unlocks ${nextLabel} as a stronger referral and leaderboard-pressure moment.`;
  }

  if (featuredTracks.includes("premium")) {
    return `Finishing ${currentLabel} opens ${nextLabel} with a more premium-weighted XP and conversion path.`;
  }

  return `Finishing ${currentLabel} unlocks ${nextLabel} as the next clean progression step in this pack.`;
}

function getReminderVariantForPack(pack: DashboardData["campaignPacks"][number]) {
  if (pack.milestone.label === "Halfway complete" || pack.milestone.label === "Pack complete") {
    return "referral_milestone";
  }

  switch (pack.blockageState) {
    case "wallet_connection":
      return "wallet_unblock";
    case "starter_path":
      return "starter_path_push";
    case "level":
    case "trust":
      return "eligibility_recovery";
    case "premium_phase":
      return "premium_phase";
    case "weekly_pace":
      return pack.returnWindow === "today" ? "today_return" : "weekly_return";
    default:
      return pack.returnWindow === "wait_for_unlock" ? "unlock_wait" : "mission_progress";
  }
}

function getReminderScheduleForPack(
  pack: Pick<DashboardData["campaignPacks"][number], "blockageState" | "returnWindow">,
): {
  schedule: DashboardData["campaignNotifications"][number]["reminderSchedule"];
  label: string;
} {
  if (pack.blockageState === "wallet_connection" || pack.blockageState === "weekly_pace") {
    return {
      schedule: "today",
      label: "Keep this in the same-day reminder loop until the block clears.",
    };
  }

  if (
    pack.blockageState === "starter_path" ||
    pack.blockageState === "level" ||
    pack.blockageState === "trust" ||
    pack.blockageState === "premium_phase"
  ) {
    return {
      schedule: "this_week",
      label: "Keep this in the weekly reminder loop while the next unlock builds.",
    };
  }

  if (pack.returnWindow === "wait_for_unlock") {
    return {
      schedule: "wait_for_unlock",
      label: "Hold reminders until the next meaningful unlock condition changes.",
    };
  }

  return {
    schedule: pack.returnWindow,
    label:
      pack.returnWindow === "today"
        ? "This pack should get a same-day nudge while the return window is hot."
        : "This pack can stay on the weekly reminder rhythm for now.",
  };
}

function getPackUnlockOutcomePreview({
  blockageState,
  directRewardMetadata,
  premiumNudge,
  rewardEligible,
}: {
  blockageState: DashboardData["campaignPacks"][number]["blockageState"];
  directRewardMetadata: { asset: TokenAsset; amount: number } | null;
  premiumNudge: string | null;
  rewardEligible: boolean;
}): DashboardData["campaignPacks"][number]["unlockOutcomePreview"] {
  return {
    xp:
      blockageState === "level"
        ? "This step matters most because it adds the XP pressure needed for the next level gate."
        : "This step keeps XP momentum moving so the pack stays on track.",
    eligibility:
      blockageState === "wallet_connection"
        ? "Eligibility is still waiting on wallet connection before the reward path fully opens."
        : blockageState === "starter_path"
          ? "Eligibility improves as the activation path becomes more complete and trusted."
          : blockageState === "trust"
            ? "Eligibility is mainly waiting on stronger verified activity and trust signals."
            : rewardEligible
              ? "Eligibility is already live, so this step is about pushing deeper into the active reward loop."
              : "Eligibility pressure improves as this quest moves the pack closer to its next gate.",
    premium:
      premiumNudge
        ? "This mission is entering a premium-relevant phase, so the next unlock has stronger upgrade weight."
        : null,
    directReward:
      directRewardMetadata && rewardEligible
        ? `This pack is still aligned with a ${directRewardMetadata.amount} ${directRewardMetadata.asset} direct reward route.`
        : null,
  };
}

function getPackDependencySummary({
  blockageState,
  rewardEligible,
  directRewardMetadata,
  premiumNudge,
}: {
  blockageState: DashboardData["campaignPacks"][number]["blockageState"];
  rewardEligible: boolean;
  directRewardMetadata: { asset: TokenAsset; amount: number } | null;
  premiumNudge: string | null;
}): DashboardData["campaignPacks"][number]["dependencySummary"] {
  const items: DashboardData["campaignPacks"][number]["dependencySummary"] = [];

  if (blockageState === "wallet_connection") {
    items.push({
      label: "Wallet gate",
      detail: "The next meaningful unlock still depends on wallet connection.",
    });
  }

  if (blockageState === "starter_path") {
    items.push({
      label: "Activation ladder",
      detail: "Activation-ladder progress still has to clear before deeper reward pressure matters.",
    });
  }

  if (!rewardEligible || blockageState === "trust" || blockageState === "level") {
    items.push({
      label: "Eligibility gate",
      detail: "This step is still contributing toward the level, trust, and eligibility threshold.",
    });
  }

  if (premiumNudge) {
    items.push({
      label: "Premium phase",
      detail: "The next unlock is starting to carry stronger premium-conversion weight.",
    });
  }

  if (directRewardMetadata) {
    items.push({
      label: "Reward rail",
      detail: `The pack is still aligned with the ${directRewardMetadata.amount} ${directRewardMetadata.asset} direct reward rail.`,
    });
  }

  if (items.length === 0) {
    items.push({
      label: "Momentum",
      detail: "The next unlock is mostly about maintaining pace rather than clearing a hard gate.",
    });
  }

  return items;
}

function getQuestGateLabel({
  track,
  verificationType,
  isPremiumPreview,
  hasDirectReward,
}: {
  track: QuestTrack;
  verificationType: VerificationType;
  isPremiumPreview: boolean;
  hasDirectReward: boolean;
}) {
  if (verificationType === "wallet-check" || track === "wallet") {
    return "Helps clear the wallet gate";
  }

  if (isPremiumPreview || track === "premium") {
    return "Helps clear the premium phase";
  }

  if (hasDirectReward) {
    return "Helps move the direct reward rail forward";
  }

  if (track === "starter") {
    return "Helps clear the activation-ladder gate";
  }

  if (track === "daily" || track === "campaign") {
    return "Helps recover weekly pace and mission momentum";
  }

  return "Helps build trust, eligibility, and progression pressure";
}

function getQuestDependencyDetail({
  track,
  verificationType,
  isPremiumPreview,
  hasDirectReward,
  blockageState,
}: {
  track: QuestTrack;
  verificationType: VerificationType;
  isPremiumPreview: boolean;
  hasDirectReward: boolean;
  blockageState: DashboardData["campaignPacks"][number]["blockageState"];
}) {
  if (verificationType === "wallet-check" || track === "wallet") {
    return "Clearing this step is the most direct route into wallet-enabled mission progression.";
  }

  if (blockageState === "starter_path" || track === "starter") {
    return "This step removes activation-ladder friction so later quests can matter more.";
  }

  if (blockageState === "level") {
    return "This step mainly helps close the level gap before the next gate opens.";
  }

  if (blockageState === "trust") {
    return "This step builds the verified activity and trust signals the pack is still missing.";
  }

  if (isPremiumPreview || track === "premium") {
    return "This step matters most once the pack is ready to lean into the premium phase.";
  }

  if (hasDirectReward) {
    return "This step keeps the direct reward rail intact so payout value is still reachable.";
  }

  if (track === "daily" || track === "campaign") {
    return "This step is strongest as a momentum recovery move inside the current pack window.";
  }

  return "This step strengthens the pack's general eligibility and progression path.";
}

function getPackOperatorNextMove({
  blockageState,
  reminderHandledRate,
  topCtaVariant,
  returnWindow,
}: {
  blockageState: DashboardData["campaignPacks"][number]["blockageState"];
  reminderHandledRate: number;
  topCtaVariant: string | null;
  returnWindow: DashboardData["campaignPacks"][number]["returnWindow"];
}) {
  if (blockageState === "wallet_connection") {
    return {
      title: "Push wallet-first guidance",
      detail: "Wallet connection is still the real gate, so keep the operator focus on wallet-first CTA pressure.",
    };
  }

  if (blockageState === "starter_path") {
    return {
      title: "Simplify the activation-ladder message",
      detail: "Activation-ladder friction is still dominant here, so clearer onboarding guidance should help more than stronger reward copy.",
    };
  }

  if (blockageState === "trust" || blockageState === "level") {
    return {
      title: "Lean on eligibility-building copy",
      detail: "This pack still needs level/trust movement, so operators should emphasize verified progress over payout excitement.",
    };
  }

  if (blockageState === "premium_phase") {
    return {
      title: "Test premium-phase conversion prompts",
      detail: "This pack has reached the premium step, so operators should reinforce the upgrade move rather than generic progression.",
    };
  }

  if (blockageState === "weekly_pace") {
    return {
      title: returnWindow === "today" ? "Trigger same-day recovery nudges" : "Push return-this-week recovery",
      detail:
        reminderHandledRate < 0.4
          ? "Reminder handling is still soft, so operators should tighten the recovery copy before increasing pressure."
          : "Reminder handling is decent, so the next move is keeping recovery pressure consistent until pace improves.",
    };
  }

  return {
    title: "Keep the current CTA path steady",
    detail: topCtaVariant
      ? `Current signals are relatively healthy, so keep leaning on ${topCtaVariant} while monitoring for blocker drift.`
      : "Current signals are relatively healthy, so keep progression messaging steady while monitoring for blocker drift.",
  };
}

function getPackOperatorOutcome({
  reminderHandledRate,
  ctaUsers,
  participantCount,
  approvedCompletionCount,
}: {
  reminderHandledRate: number;
  ctaUsers: number;
  participantCount: number;
  approvedCompletionCount: number;
}) {
  const ctaReach = participantCount > 0 ? ctaUsers / participantCount : 0;
  const approvalDensity = participantCount > 0 ? approvedCompletionCount / participantCount : 0;

  if (reminderHandledRate >= 0.6 && ctaReach >= 0.35 && approvalDensity >= 0.2) {
    return {
      title: "Signals improving",
      detail: "Reminder handling, CTA reach, and mission progression are all in a healthy range for this pack.",
    };
  }

  if (reminderHandledRate < 0.35) {
    return {
      title: "Reminder pressure is weak",
      detail: "Users are snoozing or ignoring too much of the reminder stream, so operator changes should start there.",
    };
  }

  if (ctaReach < 0.2) {
    return {
      title: "CTA reach is still shallow",
      detail: "The current recommendation is not yet pulling enough pack participants into the intended next action.",
    };
  }

  if (approvalDensity < 0.15) {
    return {
      title: "Mission progression is still thin",
      detail: "People are touching the pack, but those actions are not yet turning into enough approved mission movement.",
    };
  }

  return {
    title: "Mixed signals",
    detail: "Some pack signals are improving, but the next operator move still needs close monitoring.",
  };
}

function getRecommendedPackCta(
  state: DashboardData["campaignPacks"][number]["blockageState"],
  returnWindow: DashboardData["campaignPacks"][number]["returnWindow"] | "wait_for_unlock",
): {
  variant: string;
  badge: string;
  reason: string;
} {
  switch (state) {
    case "wallet_connection":
      return {
        variant: "wallet_gate",
        badge: "Wallet-first CTA",
        reason: "Most users in this pack are still blocked before the live reward path opens.",
      };
    case "starter_path":
      return {
        variant: "starter_path_clarity",
        badge: "Starter-path CTA",
        reason: "This pack needs clearer guidance through the starter-path portion of the loop.",
      };
    case "level":
      return {
        variant: "xp_level_push",
        badge: "Level-up CTA",
        reason: "The dominant friction here is reaching the next XP threshold cleanly.",
      };
    case "trust":
      return {
        variant: "trust_signal_push",
        badge: "Trust CTA",
        reason: "Verified activity and reward-readiness are the main blockers in this pack right now.",
      };
    case "premium_phase":
      return {
        variant: "premium_phase",
        badge: "Premium CTA",
        reason: "This pack is already through the base loop and is now strongest at the premium step.",
      };
    case "weekly_pace":
      return {
        variant: returnWindow === "today" ? "recovery_today" : "recovery_this_week",
        badge: returnWindow === "today" ? "Today recovery CTA" : "Recovery CTA",
        reason:
          returnWindow === "today"
            ? "This pack needs a same-day return move before momentum slips further."
            : "The best move is pulling users back onto pace before the pack cools off.",
      };
    default:
      return {
        variant: "default_progression",
        badge: "Progress CTA",
        reason: "This pack is mostly ready, so simple next-step progression language should win.",
      };
  }
}

function getQuestDependencyProgressLabel(index: number, actionable: boolean, status: "available" | "in-progress" | "completed" | "rejected") {
  if (status === "completed") {
    return "Dependency already cleared";
  }

  if (actionable) {
    return "Most likely dependency to clear now";
  }

  if (index === 1) {
    return "Likely next dependency after the current step";
  }

  if (index === 2) {
    return "Mid-pack dependency after the next unlock";
  }

  return "Later dependency in the remaining mission path";
}

function resolvePackPrimaryCta({
  user,
  userProgressState,
  nextQuestId,
  nextQuestActionable,
  premiumNudge,
  completedQuestCount,
  totalQuestCount,
}: {
  user: UserSnapshot;
  userProgressState: UserProgressState;
  nextQuestId: string | null;
  nextQuestActionable: boolean;
  premiumNudge: string | null;
  completedQuestCount: number;
  totalQuestCount: number;
}) {
  if (!userProgressState.walletLinked) {
    return {
      ctaLabel: "Link wallet to continue",
      ctaHref: "/profile#wallet-link-panel",
    };
  }

  const halfwayReached = totalQuestCount > 1 && completedQuestCount >= Math.ceil(totalQuestCount / 2);

  if (premiumNudge && halfwayReached && user.tier === "free") {
    return {
      ctaLabel: "Review monthly upgrade",
      ctaHref: "/profile",
    };
  }

  if (premiumNudge && halfwayReached && user.tier === "monthly") {
    return {
      ctaLabel: "Review annual upgrade",
      ctaHref: "/profile",
    };
  }

  return {
    ctaLabel: nextQuestId ? (nextQuestActionable ? "Open next mission" : "View next mission") : "Review pack",
    ctaHref: nextQuestId ? (nextQuestActionable ? `#quest-action-${nextQuestId}` : "#quest-board") : "#quest-board",
  };
}

function resolvePackCtaVariant({
  user,
  userProgressState,
  premiumNudge,
  completedQuestCount,
  totalQuestCount,
}: {
  user: UserSnapshot;
  userProgressState: UserProgressState;
  premiumNudge: string | null;
  completedQuestCount: number;
  totalQuestCount: number;
}) {
  if (!userProgressState.walletLinked) {
    return "wallet_gate";
  }

  const halfwayReached = totalQuestCount > 1 && completedQuestCount >= Math.ceil(totalQuestCount / 2);

  if (premiumNudge && halfwayReached && user.tier === "free") {
    return "free_to_monthly";
  }

  if (premiumNudge && halfwayReached && user.tier === "monthly") {
    return "monthly_to_annual";
  }

  if (user.tier === "annual") {
    return "annual_progression";
  }

  return "default_progression";
}

function buildCampaignNotifications(
  campaignPacks: DashboardData["campaignPacks"],
  persistedState: Map<string, { status: "handled" | "snoozed"; until?: string | null }> = new Map(),
): DashboardData["campaignNotifications"] {
  const notifications = campaignPacks
    .map((pack) => {
      const detailParts: string[] = [];
      const tone =
        pack.milestone.tone === "success"
          ? "success"
          : pack.lifecycleState === "live"
            ? "info"
            : pack.directRewardState?.tone ?? "info";

      if (pack.lifecycleState === "live") {
        detailParts.push(
          pack.kind === "feeder"
            ? `${pack.attributionSource} is feeding into ${pack.activeLane} and this mission is live now.`
            : `${pack.activeLane} is active and this mission is live now.`,
        );
      }

      if (pack.milestone.tone === "success") {
        detailParts.push(`${pack.completedQuestCount}/${pack.totalQuestCount} missions are complete.`);
      }

      if (pack.directRewardState) {
        detailParts.push(pack.directRewardState.label);
      }

      if (pack.returnAction) {
        detailParts.push(pack.returnAction);
      }

      if (pack.milestone.label === "Halfway complete" || pack.milestone.label === "Pack complete") {
        detailParts.push("This is a strong moment to invite referrals into the same loop.");
      }

      return {
        id: `pack-summary-${pack.packId}-${pack.lifecycleState}-${pack.milestone.label}`,
        tone,
        title:
          pack.milestone.tone === "success"
            ? `${pack.label}: ${pack.milestone.label}`
            : `${pack.label} is active in your mission flow`,
        detail: `${detailParts.join(" ")} ${pack.nextAction}`.trim(),
        packId: pack.packId,
        reminderVariant: getReminderVariantForPack(pack),
        reminderSchedule: getReminderScheduleForPack(pack).schedule,
        reminderScheduleLabel: getReminderScheduleForPack(pack).label,
        ctaLabel:
          pack.milestone.label === "Halfway complete" || pack.milestone.label === "Pack complete"
            ? "Open referral leaderboard"
            : pack.ctaLabel,
        ctaQuestId:
          pack.milestone.label === "Halfway complete" || pack.milestone.label === "Pack complete"
            ? null
            : pack.nextQuestId,
        ctaHref:
          pack.milestone.label === "Halfway complete" || pack.milestone.label === "Pack complete"
            ? "/leaderboard#referral-board"
            : pack.ctaHref,
        persistedState: persistedState.get(`pack-summary-${pack.packId}-${pack.lifecycleState}-${pack.milestone.label}`) ?? null,
      };
    })
    .slice(0, 5);

  const inactivityNotification = campaignPacks.find(
    (pack) => pack.lifecycleState === "live" && pack.weeklyGoal.shortfallXp > Math.max(pack.weeklyGoal.targetXp * 0.4, 80),
  );

  if (inactivityNotification) {
    notifications.unshift({
      id: `pack-inactivity-${inactivityNotification.packId}`,
      tone: "warning",
      title: `${inactivityNotification.label} is cooling off`,
      detail: `Weekly pace is slipping by ${inactivityNotification.weeklyGoal.shortfallXp} XP. A clean mission clear now will pull this pack back onto its current target.`,
      packId: inactivityNotification.packId,
      reminderVariant: getReminderVariantForPack(inactivityNotification),
      reminderSchedule: getReminderScheduleForPack(inactivityNotification).schedule,
      reminderScheduleLabel: getReminderScheduleForPack(inactivityNotification).label,
      ctaLabel: inactivityNotification.ctaLabel,
      ctaQuestId: inactivityNotification.nextQuestId,
      ctaHref: inactivityNotification.ctaHref,
      persistedState: persistedState.get(`pack-inactivity-${inactivityNotification.packId}`) ?? null,
    });
  }

  const returnReminder = campaignPacks.find((pack) => Boolean(pack.returnAction));
  if (returnReminder) {
    notifications.unshift({
      id: `pack-return-${returnReminder.packId}`,
      tone: "warning",
      title: `${returnReminder.label} needs a return move`,
      detail: `${returnReminder.returnAction ?? returnReminder.nextAction} ${returnReminder.unlockPreview}`,
      packId: returnReminder.packId,
      reminderVariant: getReminderVariantForPack(returnReminder),
      reminderSchedule: getReminderScheduleForPack(returnReminder).schedule,
      reminderScheduleLabel: getReminderScheduleForPack(returnReminder).label,
      ctaLabel: returnReminder.ctaLabel,
      ctaQuestId: returnReminder.nextQuestId,
      ctaHref: returnReminder.ctaHref,
      persistedState: persistedState.get(`pack-return-${returnReminder.packId}`) ?? null,
    });
  }

  return notifications.slice(0, 5);
}

function buildMissionActivityFeedItems(
  campaignPacks: DashboardData["campaignPacks"],
): ActivityItem[] {
  const nowIso = new Date().toISOString();
  const items: Array<ActivityItem & { createdAt: string }> = [];

  for (const pack of campaignPacks) {
    if (pack.lifecycleState !== "live") {
      continue;
    }

    if (pack.weeklyGoal.shortfallXp > Math.max(pack.weeklyGoal.targetXp * 0.4, 80)) {
      items.push({
        id: `mission-cooling-${pack.packId}`,
        actor: "Mission monitor",
        action: "flagged a campaign pack as cooling off",
        detail: `${pack.label} is ${pack.weeklyGoal.shortfallXp} XP behind its current weekly pace.`,
        timeAgo: "just now",
        createdAt: nowIso,
      });
      if (pack.returnAction) {
        items.push({
          id: `mission-return-${pack.packId}`,
          actor: "Mission reminder",
          action: "scheduled a mission return reminder",
          detail: `${pack.label}: ${pack.returnAction}`,
          timeAgo: "just now",
          createdAt: nowIso,
        });
      }
    } else if (pack.weeklyGoal.shortfallXp === 0) {
      items.push({
        id: `mission-on-pace-${pack.packId}`,
        actor: "Mission monitor",
        action: "marked a campaign pack back on pace",
        detail: `${pack.label} is hitting its current weekly mission target again.`,
        timeAgo: "just now",
        createdAt: nowIso,
      });
    }
  }

  return items;
}

async function getUserCampaignPackJourneys({
  userId,
  user,
  userProgressState,
  economySettings,
}: {
  userId: string;
  user: UserSnapshot;
  userProgressState: UserProgressState;
  economySettings: EconomySettings;
}): Promise<{
  campaignPacks: DashboardData["campaignPacks"];
  campaignNotifications: DashboardData["campaignNotifications"];
  campaignPackHistory: DashboardData["campaignPackHistory"];
}> {
  const result = await runQuery<CampaignPackJourneyRow>(
    `SELECT q.metadata->>'campaignPackId' AS pack_id,
            q.metadata->>'campaignPackLabel' AS pack_label,
            q.metadata->>'campaignPackState' AS pack_state,
            q.metadata->>'campaignAttributionSource' AS attribution_source,
            q.metadata->>'campaignExperienceLane' AS experience_lane,
            q.metadata->>'campaignTemplateKind' AS template_kind,
            q.id AS quest_id,
            q.title AS quest_title,
            q.slug AS quest_slug,
            q.category,
            q.verification_type,
            q.is_premium_preview,
            q.recurrence,
            q.metadata,
            qc.status AS completion_status
     FROM quest_definitions q
     LEFT JOIN LATERAL (
       SELECT status
       FROM quest_completions
       WHERE user_id = $1
         AND quest_id = q.id
       ORDER BY created_at DESC
       LIMIT 1
     ) qc ON TRUE
     WHERE q.is_active = TRUE
       AND q.metadata ? 'campaignPackId'
     ORDER BY q.metadata->>'campaignPackId', q.required_level ASC, q.xp_reward DESC, q.title ASC`,
    [userId],
  );

  if (result.rows.length === 0) {
    return {
      campaignPacks: [],
      campaignNotifications: [],
      campaignPackHistory: [],
    };
  }

  const missionInboxStateResult = await runQuery<MissionInboxStateRow>(
    `SELECT DISTINCT ON (al.metadata->>'notificationId')
            al.metadata->>'notificationId' AS notification_id,
            al.metadata->>'notificationStatus' AS notification_status,
            NULLIF(al.metadata->>'notificationUntil', '') AS notification_until
     FROM activity_log al
     WHERE al.user_id = $1
       AND al.action_type = 'campaign-mission-inbox-state'
       AND al.metadata ? 'notificationId'
     ORDER BY al.metadata->>'notificationId', al.created_at DESC`,
    [userId],
  );
  const missionInboxStateMap = new Map(
    missionInboxStateResult.rows
      .filter((row) => row.notification_id && row.notification_status)
      .map((row) => [
        row.notification_id,
        {
          status: row.notification_status,
          until: row.notification_until,
        },
      ] as const),
  );

  const activeLane = resolveCampaignExperienceSource(economySettings, user.campaignSource);
  const groups = new Map<string, CampaignPackJourneyRow[]>();

  for (const row of result.rows) {
    const packRows = groups.get(row.pack_id) ?? [];
    packRows.push(row);
    groups.set(row.pack_id, packRows);
  }

  const packs = Array.from(groups.entries()).map(([packId, rows]) => {
    const firstRow = rows[0];
    const attributionSource = (firstRow.attribution_source ?? "direct") as CampaignSource | "direct";
    const experienceLane = (firstRow.experience_lane ?? attributionSource ?? "direct") as CampaignSource | "direct";
    const featuredTracks = Array.from(
      new Set(
        rows.map((row) =>
          inferQuestTrack({
            slug: row.quest_slug,
            category: row.category,
            verificationType: row.verification_type,
            isPremiumPreview: row.is_premium_preview,
            metadata: row.metadata,
          }),
        ),
      ),
    ).slice(0, 3) as QuestTrack[];
    const questStatuses = rows.map((row, index) => {
      const track = inferQuestTrack({
        slug: row.quest_slug,
        category: row.category,
        verificationType: row.verification_type,
        isPremiumPreview: row.is_premium_preview,
        metadata: row.metadata,
      });
      const rewardConfig =
        typeof row.metadata?.rewardConfig === "object" && row.metadata.rewardConfig
          ? (row.metadata.rewardConfig as Record<string, unknown>)
          : null;
      const directReward =
        rewardConfig && typeof rewardConfig.directTokenReward === "object" && rewardConfig.directTokenReward
          ? (rewardConfig.directTokenReward as Record<string, unknown>)
          : typeof row.metadata?.directTokenReward === "object" && row.metadata.directTokenReward
            ? (row.metadata.directTokenReward as Record<string, unknown>)
            : null;
      let status: "available" | "in-progress" | "completed" | "rejected" = "available";
      if (row.completion_status === "approved") {
        status = "completed";
      } else if (row.completion_status === "pending") {
        status = "in-progress";
      } else if (row.completion_status === "rejected") {
        status = "rejected";
      }

      return {
        questId: row.quest_id,
        title: row.quest_title,
        track,
        cadence: row.recurrence,
        verificationType: row.verification_type,
        status,
        actionable: ["quiz", "manual-review", "link-visit", "wallet-check", "api-check", "text-submission"].includes(row.verification_type),
        nextHint:
          status === "completed"
            ? "This mission step is already banked."
            : track === "wallet"
              ? "This step matters because wallet identity unlocks the deeper reward rail."
              : track === "premium"
                ? "This step becomes more valuable once the mission enters its premium phase."
                : status === "available"
                  ? "This is the cleanest next mission move right now."
                  : "Clear the current blocker and this step will move forward.",
        rewardLabel:
          directReward && typeof directReward.amount === "number"
            ? `${directReward.amount} ${typeof directReward.asset === "string" ? directReward.asset.toUpperCase() : economySettings.payoutAsset} direct reward`
            : row.is_premium_preview
              ? "Premium progression step"
              : "XP-first progression step",
        gateLabel: getQuestGateLabel({
          track,
          verificationType: row.verification_type,
          isPremiumPreview: row.is_premium_preview,
          hasDirectReward: Boolean(directReward && typeof directReward.amount === "number"),
        }),
        dependencyDetail: getQuestDependencyDetail({
          track,
          verificationType: row.verification_type,
          isPremiumPreview: row.is_premium_preview,
          hasDirectReward: Boolean(directReward && typeof directReward.amount === "number"),
          blockageState:
            !userProgressState.walletLinked
              ? "wallet_connection"
              : !userProgressState.starterPathComplete
                ? "starter_path"
                : !user.rewardEligibility.eligible
                  ? "trust"
                  : "ready",
        }),
        dependencyProgressLabel: getQuestDependencyProgressLabel(
          index,
          ["quiz", "manual-review", "link-visit", "wallet-check", "api-check", "text-submission"].includes(row.verification_type),
          status,
        ),
        rewardTimingLabel:
          directReward && typeof directReward.amount === "number"
            ? "Direct reward follows the pack payout state once this mission path is approved."
            : row.is_premium_preview
              ? "This step influences the premium phase rather than immediate payout timing."
              : "This step pays back mainly through XP progression timing.",
      };
    });
    const completedQuestCount = questStatuses.filter((quest) => quest.status === "completed").length;
    const inProgressQuestCount = questStatuses.filter((quest) => quest.status === "in-progress").length;
    const rejectedQuestCount = questStatuses.filter((quest) => quest.status === "rejected").length;
    const openQuestCount = questStatuses.filter((quest) => quest.status === "available").length;
    const nextQuest = questStatuses.find((quest) => quest.status !== "completed") ?? null;
    const nextQuestTitle = nextQuest?.title ?? null;
    const nextQuestId = nextQuest?.questId ?? null;
    const nextQuestActionable = nextQuest?.actionable ?? false;
    const benchmark = getCampaignPackBenchmark(economySettings, experienceLane);
    const firstTimebox = rows.find((row) => typeof row.metadata?.timebox === "string")?.metadata?.timebox;
    const directRewardMetadata = rows
      .map((row) => {
        const rewardConfig = typeof row.metadata?.rewardConfig === "object" && row.metadata.rewardConfig ? row.metadata.rewardConfig as Record<string, unknown> : null;
        const directReward =
          rewardConfig && typeof rewardConfig.directTokenReward === "object" && rewardConfig.directTokenReward
            ? rewardConfig.directTokenReward as Record<string, unknown>
            : typeof row.metadata?.directTokenReward === "object" && row.metadata.directTokenReward
              ? row.metadata.directTokenReward as Record<string, unknown>
              : null;

        if (!directReward || typeof directReward.amount !== "number") {
          return null;
        }

        return {
          asset: typeof directReward.asset === "string" ? directReward.asset.toUpperCase() : economySettings.payoutAsset,
          amount: directReward.amount,
        };
      })
      .find(Boolean) ?? null;

    let milestone: DashboardData["campaignPacks"][number]["milestone"] = {
      label: "Pack is ready to start",
      tone: "info",
    };
    if (completedQuestCount >= rows.length && rows.length > 0) {
      milestone = {
        label: "Pack complete",
        tone: "success",
      };
    } else if (completedQuestCount >= Math.ceil(rows.length / 2) && rows.length > 1) {
      milestone = {
        label: "Halfway complete",
        tone: "success",
      };
    } else if (completedQuestCount > 0) {
      milestone = {
        label: "First mission cleared",
        tone: "success",
      };
    } else if (rejectedQuestCount > 0) {
      milestone = {
        label: "Review needed on one mission",
        tone: "warning",
      };
    }

    let nextAction = `Complete ${nextQuestTitle ?? "the next campaign quest"} to keep your pack momentum moving.`;
    let sequenceReason = "The next mission is simply the first incomplete step in this pack.";
    if (!userProgressState.walletLinked) {
      nextAction = getBrandSafeWalletLinkPrompt();
      sequenceReason = "Wallet linking is the gating step that turns this pack from campaign traffic into reward-ready progression.";
    } else if (!userProgressState.starterPathComplete) {
      nextAction = getBrandSafeStarterPathPrompt();
      sequenceReason = "Activation-path completion comes first because it stabilizes the account before the heavier-value steps matter.";
    } else if (!user.rewardEligibility.eligible) {
      nextAction = `Stay on the progression path: ${user.rewardEligibility.nextRequirement ?? "keep building XP and trust"}.`;
      sequenceReason = "Reward eligibility is the current bottleneck, so the pack is biasing toward trust and repeat activity.";
    } else if (openQuestCount === 0 && inProgressQuestCount === 0) {
      nextAction = "This pack is complete. Keep weekly XP and referrals active so the reward rail stays valuable.";
      sequenceReason = "There are no remaining quests in this pack, so the next value comes from the wider weekly and referral loop.";
    }

    const premiumTrackPressure = featuredTracks.includes("premium") || rows.some((row) => row.is_premium_preview);
    const premiumNudge =
      user.tier === "free" && premiumTrackPressure && completedQuestCount >= Math.ceil(rows.length / 2)
        ? `${firstRow.pack_label ?? "This pack"} is moving into a premium-heavy phase. Monthly or Annual will increase XP yield and unlock stronger follow-on missions.`
        : user.tier === "monthly" && premiumTrackPressure && completedQuestCount >= Math.ceil(rows.length / 2)
          ? `${firstRow.pack_label ?? "This pack"} is now worth treating as an annual-scale mission. Annual sharpens the XP lift and direct reward upside at this stage.`
        : null;
    const weeklyGoalTarget = Math.max(dataUserWeeklyTarget(user.weeklyProgress.nextThreshold, user.weeklyProgress.currentThreshold) + Math.max(economySettings.campaignOverrides[experienceLane]?.weeklyTargetXpOffset ?? 0, 0), user.weeklyProgress.currentThreshold);
    const weeklyGoalShortfall = Math.max(weeklyGoalTarget - user.weeklyProgress.xp, 0);
    const onboardingHint =
      user.journeyState === "signed_up_free" && completedQuestCount === 0
        ? getBrandSafeOnboardingHint()
        : null;
    const scheduledDirectMatch = directRewardMetadata
      ? user.tokenProgram.scheduledDirectRewards.find(
          (reward) => reward.asset === directRewardMetadata.asset && reward.amount >= directRewardMetadata.amount,
        )
      : null;
    const settledDirectMatch = directRewardMetadata
      ? user.tokenProgram.redemptionHistory.find(
          (entry) => entry.asset === directRewardMetadata.asset && entry.status === "settled" && entry.tokenAmount >= directRewardMetadata.amount,
        )
      : null;
    const claimedDirectMatch = directRewardMetadata
      ? user.tokenProgram.redemptionHistory.find(
          (entry) => entry.asset === directRewardMetadata.asset && entry.status === "claimed" && entry.tokenAmount >= directRewardMetadata.amount,
        )
      : null;
    const directRewardState = directRewardMetadata
      ? settledDirectMatch
        ? { label: "Direct reward settled", tone: "success" as const }
        : claimedDirectMatch
          ? { label: "Direct reward claimed", tone: "info" as const }
          : scheduledDirectMatch
            ? { label: "Direct reward scheduled", tone: "info" as const }
            : { label: "Direct reward projected", tone: "warning" as const }
      : null;

    const rewardFocus =
      firstRow.template_kind === "feeder"
        ? `${attributionSource} is acting as the feeder source here. The short-term win is reaching the ${experienceLane} bridge cleanly, then letting XP and wallet progress unlock the deeper ${economySettings.payoutAsset} rail.`
        : firstRow.template_kind === "bridge"
          ? `${experienceLane} is the live bridge lane for this mission. XP momentum, starter-path completion, and wallet trust are what turn this into reward-bearing progress.`
          : attributionSource === experienceLane
            ? `${experienceLane} is driving this mission directly. XP builds the core loop, then ${economySettings.payoutAsset} settles the reward rail.`
            : getBrandSafeRewardFocus(attributionSource, experienceLane, economySettings.payoutAsset);

    const tierPhaseCopy = getPackTierPhaseCopy(
      user.tier,
      firstRow.pack_label ?? "This mission",
      (firstRow.template_kind ?? "mixed") as "bridge" | "feeder" | "mixed",
      experienceLane,
    );
    const returnWindow: DashboardData["campaignPacks"][number]["returnWindow"] =
      !userProgressState.walletLinked || !user.rewardEligibility.eligible
        ? "wait_for_unlock"
        : weeklyGoalShortfall > Math.max(weeklyGoalTarget * 0.65, 140)
          ? "today"
          : weeklyGoalShortfall > 0
            ? "this_week"
            : "wait_for_unlock";
    const returnAction =
      user.rewardEligibility.eligible && weeklyGoalShortfall > Math.max(weeklyGoalTarget * 0.4, 80)
        ? `${
            returnWindow === "today"
              ? "Come back today"
              : returnWindow === "this_week"
                ? "Come back this week"
                : "Wait for the next unlock"
          }: ${firstRow.pack_label ?? "this mission"} needs ${nextQuestTitle ?? "the next mission"} to recover the current pace gap.`
        : null;
    const priorityReason = getPackPriorityReason({
      userProgressState,
      rewardEligible: user.rewardEligibility.eligible,
      activeLane: experienceLane,
      attributionSource,
    });
    const blockageState = getCampaignPackBlockageState({
      userProgressState,
      rewardEligible: user.rewardEligibility.eligible,
      nextRequirement: user.rewardEligibility.nextRequirement,
      weeklyGoalShortfall,
      weeklyGoalTarget,
      premiumNudge,
    });
    const unlockPreview = getPackUnlockPreview({
      questStatuses,
      featuredTracks,
      directRewardMetadata,
    });
    const unlockRewardPreview = getPackUnlockRewardPreview({
      currentQuestTitle: nextQuestTitle,
      nextQuestTitle: questStatuses.find((quest) => !quest.actionable && quest.status !== "completed")?.title ?? null,
      blockageState,
      directRewardMetadata,
      featuredTracks,
      rewardEligible: user.rewardEligibility.eligible,
      premiumNudge,
    });
    const unlockOutcomePreview = getPackUnlockOutcomePreview({
      blockageState,
      directRewardMetadata,
      premiumNudge,
      rewardEligible: user.rewardEligibility.eligible,
    });
    const dependencySummary = getPackDependencySummary({
      blockageState,
      rewardEligible: user.rewardEligibility.eligible,
      directRewardMetadata,
      premiumNudge,
    });
    const primaryCta = resolvePackPrimaryCta({
      user,
      userProgressState,
      nextQuestId,
      nextQuestActionable,
      premiumNudge,
      completedQuestCount,
      totalQuestCount: rows.length,
    });
    const ctaVariant = resolvePackCtaVariant({
      user,
      userProgressState,
      premiumNudge,
      completedQuestCount,
      totalQuestCount: rows.length,
    });

    return {
      packId,
      label: firstRow.pack_label ?? "Campaign pack",
      lifecycleState: firstRow.pack_state ?? "draft",
      attributionSource,
      activeLane: experienceLane,
      kind: (firstRow.template_kind ?? "mixed") as "bridge" | "feeder" | "mixed",
      totalQuestCount: rows.length,
      completedQuestCount,
      inProgressQuestCount,
      rejectedQuestCount,
      openQuestCount,
      featuredTracks,
      nextQuestId,
      nextQuestTitle,
      nextQuestActionable,
      ctaLabel: primaryCta.ctaLabel,
      ctaHref: primaryCta.ctaHref,
      ctaVariant,
      nextAction,
      sequenceReason,
      tierPhaseCopy,
      priorityReason,
      blockageState,
      unlockPreview,
      unlockRewardPreview,
      unlockOutcomePreview,
      dependencySummary,
      returnAction,
      returnWindow,
      rewardFocus,
      badgeLabel: packBadgeLabel(firstRow.template_kind, milestone.label),
      leaderboardCallout: `${experienceLane} currently adds ${(getCampaignLeaderboardMomentumMultiplier(economySettings, attributionSource === "direct" ? null : attributionSource) * 100 - 100).toFixed(0)}% leaderboard momentum, so this pack is helping shape your rank pressure now.`,
      weeklyGoal: {
        targetXp: weeklyGoalTarget,
        shortfallXp: weeklyGoalShortfall,
        label: weeklyGoalShortfall > 0 ? `${weeklyGoalShortfall} XP to hit this mission's short-term pace` : "Weekly mission pace is already on track",
      },
      urgency: typeof firstTimebox === "string" ? firstTimebox : null,
      onboardingHint,
      directRewardSummary: directRewardMetadata,
      directRewardState,
      benchmarkNote: `This lane is benchmarked toward ${(benchmark.walletLinkRateTarget * 100).toFixed(0)}% wallet link, ${(benchmark.rewardEligibilityRateTarget * 100).toFixed(0)}% reward eligibility, and ${(benchmark.premiumConversionRateTarget * 100).toFixed(0)}% premium conversion.`,
      premiumNudge,
      milestone,
      questStatuses,
      sortScore:
        (experienceLane === activeLane ? 5 : 0) +
        (attributionSource === (user.campaignSource ?? "direct") ? 3 : 0) +
        (firstRow.pack_state === "live" ? 2 : 0) +
        completedQuestCount / Math.max(rows.length, 1),
    };
  });

  const campaignPacks = packs
    .sort((left, right) => {
      return right.sortScore - left.sortScore || right.totalQuestCount - left.totalQuestCount || left.label.localeCompare(right.label);
    })
    .slice(0, 2)
    .map((pack) => ({
      packId: pack.packId,
      label: pack.label,
      lifecycleState: pack.lifecycleState,
      attributionSource: pack.attributionSource,
      activeLane: pack.activeLane,
      kind: pack.kind,
      totalQuestCount: pack.totalQuestCount,
      completedQuestCount: pack.completedQuestCount,
      inProgressQuestCount: pack.inProgressQuestCount,
      rejectedQuestCount: pack.rejectedQuestCount,
      openQuestCount: pack.openQuestCount,
      featuredTracks: pack.featuredTracks,
      nextQuestId: pack.nextQuestId,
      nextQuestTitle: pack.nextQuestTitle,
      nextQuestActionable: pack.nextQuestActionable,
      ctaLabel: pack.ctaLabel,
      ctaHref: pack.ctaHref,
      ctaVariant: pack.ctaVariant,
      nextAction: pack.nextAction,
      sequenceReason: pack.sequenceReason,
      tierPhaseCopy: pack.tierPhaseCopy,
      priorityReason: pack.priorityReason,
      blockageState: pack.blockageState,
      unlockPreview: pack.unlockPreview,
      unlockRewardPreview: pack.unlockRewardPreview,
      unlockOutcomePreview: pack.unlockOutcomePreview,
      dependencySummary: pack.dependencySummary,
      returnAction: pack.returnAction,
      returnWindow: pack.returnWindow,
      rewardFocus: pack.rewardFocus,
      badgeLabel: pack.badgeLabel,
      leaderboardCallout: pack.leaderboardCallout,
      weeklyGoal: pack.weeklyGoal,
      urgency: pack.urgency,
      onboardingHint: pack.onboardingHint,
      directRewardSummary: pack.directRewardSummary,
      directRewardState: pack.directRewardState,
      benchmarkNote: pack.benchmarkNote,
      premiumNudge: pack.premiumNudge,
      milestone: pack.milestone,
      questStatuses: pack.questStatuses,
    }));

  const campaignNotifications = buildCampaignNotifications(campaignPacks, missionInboxStateMap);

  const historyResult = await runQuery<CampaignPackHistoryRow>(
    `SELECT q.metadata->>'campaignPackId' AS pack_id,
            q.metadata->>'campaignPackLabel' AS pack_label,
            q.metadata->>'campaignPackState' AS pack_state,
            q.metadata->>'campaignAttributionSource' AS attribution_source,
            q.metadata->>'campaignExperienceLane' AS experience_lane,
            q.metadata->>'campaignTemplateKind' AS template_kind,
            COUNT(q.id)::text AS quest_count,
            COUNT(*) FILTER (WHERE qc.status = 'approved')::text AS approved_count,
            COALESCE(SUM(qc.awarded_xp), 0)::text AS total_xp_awarded,
            COUNT(*) FILTER (WHERE q.is_premium_preview = TRUE AND qc.status = 'approved')::text AS premium_quest_count,
            COUNT(*) FILTER (WHERE q.category = 'referral' AND qc.status = 'approved')::text AS referral_quest_count,
            MAX(qc.completed_at) AS completed_at
     FROM quest_definitions q
     LEFT JOIN LATERAL (
       SELECT status, completed_at
       FROM quest_completions
       WHERE user_id = $1
         AND quest_id = q.id
       ORDER BY created_at DESC
       LIMIT 1
     ) qc ON TRUE
     WHERE q.metadata ? 'campaignPackId'
     GROUP BY q.metadata->>'campaignPackId',
              q.metadata->>'campaignPackLabel',
              q.metadata->>'campaignPackState',
              q.metadata->>'campaignAttributionSource',
              q.metadata->>'campaignExperienceLane',
              q.metadata->>'campaignTemplateKind'
     HAVING COUNT(q.id) > 0
        AND COUNT(q.id) FILTER (WHERE qc.status = 'approved') = COUNT(q.id)
     ORDER BY MAX(qc.completed_at) DESC NULLS LAST
     LIMIT 4`,
    [userId],
  );

  const campaignPackHistory = historyResult.rows.map((row) => ({
    packId: row.pack_id,
    label: row.pack_label ?? "Campaign pack",
    completedAt: row.completed_at,
    totalQuestCount: Number(row.quest_count ?? 0),
    attributionSource: (row.attribution_source ?? "direct") as CampaignSource | "direct",
    activeLane: (row.experience_lane ?? row.attribution_source ?? "direct") as CampaignSource | "direct",
    kind: (row.template_kind ?? "mixed") as "bridge" | "feeder" | "mixed",
    summary:
      row.template_kind === "feeder"
        ? `Completed as a feeder pack into ${(row.experience_lane ?? "direct").toString()}.`
        : `Completed across ${Number(row.quest_count ?? 0)} mission${Number(row.quest_count ?? 0) === 1 ? "" : "s"}.`,
    totalXpAwarded: Number(row.total_xp_awarded ?? 0),
    approvedQuestCount: Number(row.approved_count ?? 0),
    premiumQuestCount: Number(row.premium_quest_count ?? 0),
    referralQuestCount: Number(row.referral_quest_count ?? 0),
  }));

  return {
    campaignPacks,
    campaignNotifications,
    campaignPackHistory,
  };
}

export async function getDashboardDataFromDb(currentUser?: AuthUser | null): Promise<DashboardData> {
  const userId = await resolveDashboardUserId(currentUser);

  if (!userId) {
    throw new Error("No users found in the database. Run the seed file first.");
  }

  await syncReferralRewardsForReferrer(userId);
  await syncLeaderboardSnapshotsForToday();
  const dashboardUser = await getDashboardUser(userId);
  const userProgressState = await getUserProgressState(userId);
  const journeyState = resolveUserJourneyState(userProgressState);
  const economySettings = await getActiveEconomySettings();
  await syncAchievementProgressForUser({
    userId: dashboardUser.id,
    displayName: dashboardUser.display_name,
    currentStreak: dashboardUser.current_streak,
    level: dashboardUser.level,
    subscriptionTier: dashboardUser.subscription_tier,
    totalXp: dashboardUser.total_xp,
    attributionSource: dashboardUser.attribution_source,
  });

  const [user, quests, achievements, leaderboard, referralLeaderboard, activityFeed] = await Promise.all([
    getUserSnapshot(dashboardUser, userProgressState, journeyState, economySettings),
    getQuestBoard({ user: dashboardUser, userProgressState, journeyState, economySettings }),
    getAchievements(userId),
    getLeaderboard(),
    getReferralLeaderboard(),
    getActivityFeed(),
  ]);
  const { campaignPacks, campaignNotifications, campaignPackHistory } = await getUserCampaignPackJourneys({
    userId,
    user,
    userProgressState,
    economySettings,
  });
  const campaignEconomy = getCampaignEconomyOverride(economySettings, user.campaignSource);
  const activeCampaignLane = resolveCampaignExperienceSource(economySettings, user.campaignSource);
  const featuredTracks = getCampaignFeaturedTracks(activeCampaignLane, campaignEconomy);
  const missionActivityItems = buildMissionActivityFeedItems(campaignPacks);
  const mergedActivityFeed = [...missionActivityItems, ...activityFeed].slice(0, 8);
  const missionEventHistory = mergedActivityFeed
    .filter((item) => item.action.includes("campaign pack") || item.actor === "Mission monitor" || item.actor === "Mission reminder" || item.action.includes("mission CTA"))
    .map((item) => {
      const matchedPack =
        campaignPacks.find((pack) => item.detail.includes(pack.label)) ??
        campaignPackHistory.find((pack) => item.detail.includes(pack.label)) ??
        null;

      return {
        id: item.id,
        packId: matchedPack?.packId ?? "unknown",
        packLabel: matchedPack?.label ?? "Mission event",
        title: item.action,
        detail: item.detail,
        timeAgo: item.timeAgo,
        createdAt: item.createdAt,
      };
    })
    .slice(0, 8);

  return {
    user,
    economy: {
      payoutAsset: economySettings.payoutAsset,
      xpMultipliers: economySettings.xpTierMultipliers,
      tokenMultipliers: economySettings.tokenTierMultipliers,
      campaignPreset: {
        source: activeCampaignLane,
        attributionSource: user.campaignSource ?? "direct",
        questXpBoost: campaignEconomy.questXpMultiplierBonus,
        eligibilityBoost: campaignEconomy.eligibilityPointsMultiplierBonus,
        tokenYieldBoost: campaignEconomy.tokenYieldMultiplierBonus,
        weeklyTargetOffset: getCampaignWeeklyTargetOffset(economySettings, user.campaignSource),
        premiumUpsellMultiplier: getCampaignPremiumUpsellMultiplier(economySettings, user.campaignSource),
        leaderboardMomentumMultiplier: getCampaignLeaderboardMomentumMultiplier(economySettings, user.campaignSource),
        featuredTracks,
      },
    },
    campaignPacks,
    campaignNotifications,
    campaignPackHistory,
    quests,
    achievements,
    leaderboard,
    referralLeaderboard,
    activityFeed: mergedActivityFeed,
    missionEventHistory,
    premiumMoments: [
      `Level ${user.level} reached. ${getTierLabel(user.tier)} is your current tier.`,
      `Monthly earns ${economySettings.xpTierMultipliers.monthly.toFixed(2)}x XP. Annual earns ${economySettings.xpTierMultipliers.annual.toFixed(2)}x XP.`,
      `Your ${user.currentStreak}-day streak becomes safer with Annual streak freezes.`,
      `Redemptions are ${economySettings.redemptionEnabled ? "enabled" : "paused"} for ${economySettings.payoutAsset}.`,
      `${activeCampaignLane} lane currently adds ${(campaignEconomy.premiumUpsellBonusMultiplier * 100).toFixed(0)}% extra premium pressure and ${campaignEconomy.weeklyTargetXpOffset} XP on weekly target shaping${user.campaignSource && user.campaignSource !== activeCampaignLane ? ` while preserving ${user.campaignSource} attribution.` : "."}`,
    ],
  };
}

export async function getAdminOverviewDataFromDb(): Promise<AdminOverviewData> {
  const [pendingReviews, usersByTier, weeklyActives, referralAnalytics, roleDirectory, adminDirectory, reviewQueue, reviewHistory, reviewerWorkload, reviewBreakdownByVerificationType, reviewerTypeMatrix, economySettings, economySettingsAudit, rewardAssets, rewardPrograms, tokenSettlementQueue, tokenSettlementAudit, settlementAnalytics, questDefinitionTemplates, questDefinitionDirectory, campaignPackBenchmarkOverrides, suppressionAnalytics, campaignPackAudit, campaignPackPerformance, campaignMissionCtaAnalytics, campaignMissionCtaTrends, campaignMissionSubmitAttempts, campaignMissionCtaByTier, campaignMissionApprovedByTier, campaignMissionApprovedByVariant, campaignMissionInboxHistory, missionReminderStatusTrend, missionReminderVariantSummary] = await Promise.all([
    runQuery<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM quest_completions WHERE status = 'pending'`,
    ),
    runQuery<{ subscription_tier: SubscriptionTier; count: string }>(
      `SELECT subscription_tier, COUNT(*)::text AS count
       FROM users
       GROUP BY subscription_tier
       ORDER BY subscription_tier`,
    ),
    runQuery<{ count: string }>(
      `SELECT COUNT(DISTINCT user_id)::text AS count
       FROM activity_log
       WHERE created_at >= NOW() - INTERVAL '7 days'`,
    ),
    getReferralAnalytics(),
    listUsersWithRoles(),
    listAdminUsers(),
    getPendingReviewQueue(),
    getRecentReviewHistory(),
    getReviewerWorkload(),
    getReviewBreakdownByVerificationType(),
    getReviewerTypeMatrix(),
    getActiveEconomySettings(),
    listEconomySettingsAudit(),
    listRewardAssets(),
    listRewardPrograms(),
    listPendingTokenSettlements(),
    listRecentTokenRedemptionAudit(),
    getTokenSettlementAnalytics(),
    listQuestDefinitionTemplatesForAdmin(),
    listQuestDefinitionsForAdmin(),
    listCampaignPackBenchmarkOverrides(),
    getCampaignPackAlertSuppressionAnalytics(),
    listRecentCampaignPackAudit(),
    runQuery<{
      pack_id: string;
      completion_count: string;
      approved_completion_count: string;
      participant_count: string;
      premium_participant_count: string;
      annual_participant_count: string;
    }>(
      `SELECT q.metadata->>'campaignPackId' AS pack_id,
              COUNT(qc.id)::text AS completion_count,
              COUNT(*) FILTER (WHERE qc.status = 'approved')::text AS approved_completion_count,
              COUNT(DISTINCT qc.user_id)::text AS participant_count,
              COUNT(DISTINCT qc.user_id) FILTER (WHERE u.subscription_tier IN ('monthly', 'annual'))::text AS premium_participant_count,
              COUNT(DISTINCT qc.user_id) FILTER (WHERE u.subscription_tier = 'annual')::text AS annual_participant_count
       FROM quest_definitions q
       LEFT JOIN quest_completions qc
         ON qc.quest_id = q.id
       LEFT JOIN users u
         ON u.id = qc.user_id
       WHERE q.metadata ? 'campaignPackId'
       GROUP BY q.metadata->>'campaignPackId'`,
    ),
    runQuery<{
      pack_id: string | null;
      event_type: string | null;
      cta_label: string | null;
      cta_variant: string | null;
      click_count: string;
      unique_user_count: string;
      last_clicked_at: string | null;
    }>(
      `SELECT al.metadata->>'packId' AS pack_id,
              al.metadata->>'eventType' AS event_type,
              al.metadata->>'ctaLabel' AS cta_label,
              COALESCE(al.metadata->>'ctaVariant', 'unknown') AS cta_variant,
              COUNT(*)::text AS click_count,
              COUNT(DISTINCT al.user_id)::text AS unique_user_count,
              MAX(al.created_at)::text AS last_clicked_at
       FROM activity_log al
       WHERE al.action_type = 'campaign-cta-click'
       GROUP BY al.metadata->>'packId',
                al.metadata->>'eventType',
                al.metadata->>'ctaLabel',
                COALESCE(al.metadata->>'ctaVariant', 'unknown')
       ORDER BY MAX(al.created_at) DESC NULLS LAST
       LIMIT 24`,
    ),
    runQuery<{
      pack_id: string | null;
      event_type: string | null;
      cta_label: string | null;
      cta_variant: string | null;
      bucket_start: string;
      click_count: string;
    }>(
      `SELECT al.metadata->>'packId' AS pack_id,
              al.metadata->>'eventType' AS event_type,
              al.metadata->>'ctaLabel' AS cta_label,
              COALESCE(al.metadata->>'ctaVariant', 'unknown') AS cta_variant,
              DATE_TRUNC('week', al.created_at)::date::text AS bucket_start,
              COUNT(*)::text AS click_count
       FROM activity_log al
       WHERE al.action_type = 'campaign-cta-click'
         AND al.created_at >= NOW() - INTERVAL '28 days'
       GROUP BY al.metadata->>'packId',
                al.metadata->>'eventType',
                al.metadata->>'ctaLabel',
                COALESCE(al.metadata->>'ctaVariant', 'unknown'),
                DATE_TRUNC('week', al.created_at)::date
       ORDER BY bucket_start ASC`,
    ),
    runQuery<{
      pack_id: string | null;
      cta_variant: string | null;
      submit_attempt_count: string;
      submit_attempt_user_count: string;
    }>(
      `SELECT al.metadata->>'packId' AS pack_id,
              COALESCE(al.metadata->>'ctaVariant', 'unknown') AS cta_variant,
              COUNT(*)::text AS submit_attempt_count,
              COUNT(DISTINCT al.user_id)::text AS submit_attempt_user_count
       FROM activity_log al
       WHERE al.action_type = 'campaign-quest-submit-attempt'
       GROUP BY al.metadata->>'packId',
                COALESCE(al.metadata->>'ctaVariant', 'unknown')`,
    ),
    runQuery<{
      pack_id: string | null;
      event_type: string | null;
      cta_variant: string | null;
      subscription_tier: SubscriptionTier;
      click_count: string;
      unique_user_count: string;
    }>(
      `SELECT al.metadata->>'packId' AS pack_id,
              al.metadata->>'eventType' AS event_type,
              COALESCE(al.metadata->>'ctaVariant', 'unknown') AS cta_variant,
              u.subscription_tier,
              COUNT(*)::text AS click_count,
              COUNT(DISTINCT al.user_id)::text AS unique_user_count
       FROM activity_log al
       INNER JOIN users u ON u.id = al.user_id
       WHERE al.action_type = 'campaign-cta-click'
       GROUP BY al.metadata->>'packId',
                al.metadata->>'eventType',
                COALESCE(al.metadata->>'ctaVariant', 'unknown'),
                u.subscription_tier`,
    ),
    runQuery<{
      pack_id: string | null;
      subscription_tier: SubscriptionTier;
      approved_completion_count: string;
      approved_user_count: string;
    }>(
      `SELECT q.metadata->>'campaignPackId' AS pack_id,
              u.subscription_tier,
              COUNT(qc.id)::text AS approved_completion_count,
              COUNT(DISTINCT qc.user_id)::text AS approved_user_count
       FROM quest_definitions q
       INNER JOIN quest_completions qc
         ON qc.quest_id = q.id
        AND qc.status = 'approved'
       INNER JOIN users u
         ON u.id = qc.user_id
       WHERE q.metadata ? 'campaignPackId'
       GROUP BY q.metadata->>'campaignPackId', u.subscription_tier`,
    ),
    runQuery<{
      pack_id: string | null;
      cta_label: string | null;
      cta_variant: string | null;
      approved_completion_count: string;
      approved_user_count: string;
    }>(
      `SELECT clicks.pack_id,
              clicks.cta_label,
              clicks.cta_variant,
              COUNT(qc.id)::text AS approved_completion_count,
              COUNT(DISTINCT qc.user_id)::text AS approved_user_count
       FROM (
         SELECT DISTINCT
                al.user_id,
                al.metadata->>'packId' AS pack_id,
                al.metadata->>'ctaLabel' AS cta_label,
                COALESCE(al.metadata->>'ctaVariant', 'unknown') AS cta_variant
         FROM activity_log al
         WHERE al.action_type = 'campaign-cta-click'
           AND al.metadata ? 'packId'
       ) clicks
       INNER JOIN quest_definitions q
         ON q.metadata->>'campaignPackId' = clicks.pack_id
       INNER JOIN quest_completions qc
         ON qc.quest_id = q.id
        AND qc.user_id = clicks.user_id
        AND qc.status = 'approved'
       GROUP BY clicks.pack_id, clicks.cta_label, clicks.cta_variant`,
    ),
    runQuery<MissionInboxHistoryRow>(
      `SELECT al.id::text AS id,
              u.display_name,
              al.metadata->>'packId' AS pack_id,
              al.metadata->>'notificationStatus' AS notification_status,
              NULLIF(al.metadata->>'notificationUntil', '') AS notification_until,
              al.metadata->>'reminderVariant' AS reminder_variant,
              al.metadata->>'reminderSchedule' AS reminder_schedule,
              al.metadata->>'detail' AS detail,
              al.created_at::text AS created_at
       FROM activity_log al
       INNER JOIN users u
         ON u.id = al.user_id
       WHERE al.action_type = 'campaign-mission-inbox-state'
       ORDER BY al.created_at DESC
       LIMIT 20`,
    ),
    runQuery<MissionReminderStatusTrendRow>(
      `SELECT al.metadata->>'notificationStatus' AS notification_status,
              CASE
                WHEN al.created_at >= NOW() - INTERVAL '7 days' THEN 'current'
                ELSE 'previous'
              END AS bucket,
              COUNT(*)::text AS count
       FROM activity_log al
       WHERE al.action_type = 'campaign-mission-inbox-state'
         AND al.created_at >= NOW() - INTERVAL '14 days'
       GROUP BY al.metadata->>'notificationStatus',
                CASE
                  WHEN al.created_at >= NOW() - INTERVAL '7 days' THEN 'current'
                  ELSE 'previous'
                END`,
    ),
    runQuery<MissionReminderVariantRow>(
      `SELECT COALESCE(al.metadata->>'reminderVariant', 'unknown') AS reminder_variant,
              al.metadata->>'notificationStatus' AS notification_status,
              CASE
                WHEN al.created_at >= NOW() - INTERVAL '7 days' THEN 'current'
                ELSE 'previous'
              END AS bucket,
              COUNT(*)::text AS count
       FROM activity_log al
       WHERE al.action_type = 'campaign-mission-inbox-state'
         AND al.created_at >= NOW() - INTERVAL '14 days'
       GROUP BY COALESCE(al.metadata->>'reminderVariant', 'unknown'),
                al.metadata->>'notificationStatus',
                CASE
                  WHEN al.created_at >= NOW() - INTERVAL '7 days' THEN 'current'
                  ELSE 'previous'
                END`,
    ),
  ]);

  const packParticipantsResult = await runQuery<PackParticipantRow>(
    `SELECT DISTINCT q.metadata->>'campaignPackId' AS pack_id,
                     qc.user_id::text AS user_id
     FROM quest_definitions q
     INNER JOIN quest_completions qc
       ON qc.quest_id = q.id
     WHERE q.metadata ? 'campaignPackId'`,
  );
  const [packFirstInteractionResult, packReferralPerformanceResult, packAttributedReferralResult] = await Promise.all([
    runQuery<PackFirstInteractionRow>(
      `SELECT q.metadata->>'campaignPackId' AS pack_id,
              qc.user_id::text AS user_id,
              MIN(COALESCE(qc.completed_at, qc.created_at))::text AS first_interaction_at
       FROM quest_definitions q
       INNER JOIN quest_completions qc
         ON qc.quest_id = q.id
       WHERE q.metadata ? 'campaignPackId'
       GROUP BY q.metadata->>'campaignPackId', qc.user_id`,
    ),
    runQuery<PackReferralPerformanceRow>(
      `SELECT participants.pack_id,
              COUNT(r.id)::text AS invited_count,
              COUNT(*) FILTER (WHERE r.referee_subscribed = TRUE)::text AS converted_count
       FROM (
         SELECT DISTINCT q.metadata->>'campaignPackId' AS pack_id,
                         qc.user_id
         FROM quest_definitions q
         INNER JOIN quest_completions qc
           ON qc.quest_id = q.id
         WHERE q.metadata ? 'campaignPackId'
       ) participants
       LEFT JOIN referrals r
         ON r.referrer_user_id = participants.user_id
       GROUP BY participants.pack_id`,
    ),
    runQuery<PackAttributedReferralRow>(
      `SELECT first_touch.pack_id,
              COUNT(r.id)::text AS invited_count,
              COUNT(*) FILTER (
                WHERE r.referee_subscribed = TRUE
                  AND COALESCE(referee_user.subscription_started_at, r.created_at) >= first_touch.first_interaction_at
              )::text AS converted_count
       FROM (
         SELECT q.metadata->>'campaignPackId' AS pack_id,
                qc.user_id,
                MIN(COALESCE(qc.completed_at, qc.created_at)) AS first_interaction_at
         FROM quest_definitions q
         INNER JOIN quest_completions qc
           ON qc.quest_id = q.id
         WHERE q.metadata ? 'campaignPackId'
         GROUP BY q.metadata->>'campaignPackId', qc.user_id
       ) first_touch
       LEFT JOIN referrals r
         ON r.referrer_user_id = first_touch.user_id
        AND r.created_at >= first_touch.first_interaction_at
       LEFT JOIN users referee_user
         ON referee_user.id = r.referee_user_id
       GROUP BY first_touch.pack_id`,
    ),
  ]);
  const packTrendResult = await runQuery<PackTrendRow>(
    `SELECT q.metadata->>'campaignPackId' AS pack_id,
            DATE_TRUNC('week', COALESCE(qc.completed_at, qc.created_at))::date::text AS bucket_start,
            COUNT(DISTINCT qc.user_id)::text AS participant_count,
            COUNT(qc.id)::text AS completion_count
     FROM quest_definitions q
     INNER JOIN quest_completions qc
       ON qc.quest_id = q.id
     WHERE q.metadata ? 'campaignPackId'
       AND COALESCE(qc.completed_at, qc.created_at) >= NOW() - INTERVAL '28 days'
     GROUP BY q.metadata->>'campaignPackId', DATE_TRUNC('week', COALESCE(qc.completed_at, qc.created_at))::date
     ORDER BY bucket_start ASC`,
  );
  const participantIds = Array.from(new Set(packParticipantsResult.rows.map((row) => row.user_id)));
  const userProgressMapGlobal = new Map<string, UserProgressState>();
  const packProgressMap = new Map<
    string,
    {
      walletLinkedParticipantCount: number;
      firstTouchToWalletLinkCount: number;
      firstTouchToWalletLinkDaysTotal: number;
      walletToPremiumCount: number;
      walletToPremiumDaysTotal: number;
      starterPathCompleteCount: number;
      rewardEligibleCount: number;
      retainedActiveCount: number;
      weeklyXpTotal: number;
      engagedWeeklyXpCount: number;
      premiumUpgradeCount: number;
      premiumUpgradeDaysTotal: number;
      likelyPackCausedPremiumCount: number;
    }
  >();
  const packFirstInteractionMap = new Map(
    packFirstInteractionResult.rows.map((row) => [`${row.pack_id}:${row.user_id}`, row.first_interaction_at] as const),
  );
  const packReferralMap = new Map(
    packReferralPerformanceResult.rows.map((row) => {
      const invitedCount = Number(row.invited_count);
      const convertedCount = Number(row.converted_count);

      return [
        row.pack_id,
        {
          referralInviteCount: invitedCount,
          referralConvertedCount: convertedCount,
          referralConversionRate: invitedCount > 0 ? convertedCount / invitedCount : 0,
        },
      ] as const;
    }),
  );
  const packAttributedReferralMap = new Map(
    packAttributedReferralResult.rows.map((row) => {
      const invitedCount = Number(row.invited_count);
      const convertedCount = Number(row.converted_count);

      return [
        row.pack_id,
        {
          postPackReferralInviteCount: invitedCount,
          postPackReferralConvertedCount: convertedCount,
          postPackReferralConversionRate: invitedCount > 0 ? convertedCount / invitedCount : 0,
        },
      ] as const;
    }),
  );
  const packTrendMap = new Map<
    string,
    AdminOverviewData["campaignOperations"]["packAnalytics"][number]["weeklyTrend"]
  >();
  for (const row of packTrendResult.rows) {
    const current = packTrendMap.get(row.pack_id) ?? [];
    current.push({
      bucketStart: row.bucket_start,
      participantCount: Number(row.participant_count),
      completionCount: Number(row.completion_count),
    });
    packTrendMap.set(row.pack_id, current);
  }
  const { progressMap: participantProgressMap, userMap: participantUserMap, walletMap: participantWalletMap } =
    await buildUserProgressSnapshot(participantIds);
  for (const [userId, progress] of participantProgressMap) {
    userProgressMapGlobal.set(userId, progress);
  }

  for (const participant of packParticipantsResult.rows) {
    const progress = participantProgressMap.get(participant.user_id);
    if (!progress) {
      continue;
    }
    const current = packProgressMap.get(participant.pack_id) ?? {
      walletLinkedParticipantCount: 0,
      firstTouchToWalletLinkCount: 0,
      firstTouchToWalletLinkDaysTotal: 0,
      walletToPremiumCount: 0,
      walletToPremiumDaysTotal: 0,
      starterPathCompleteCount: 0,
      rewardEligibleCount: 0,
      retainedActiveCount: 0,
      weeklyXpTotal: 0,
      engagedWeeklyXpCount: 0,
      premiumUpgradeCount: 0,
      premiumUpgradeDaysTotal: 0,
      likelyPackCausedPremiumCount: 0,
    };
    if (progress.walletLinked) {
      current.walletLinkedParticipantCount += 1;
    }
    if (progress.starterPathComplete) {
      current.starterPathCompleteCount += 1;
    }
    if (progress.rewardEligible) {
      current.rewardEligibleCount += 1;
    }
    if (progress.weeklyXp > 0) {
      current.retainedActiveCount += 1;
    }
    current.weeklyXpTotal += progress.weeklyXp;
    if (progress.weeklyXp >= 250) {
      current.engagedWeeklyXpCount += 1;
    }
    const sourceUser = participantUserMap.get(participant.user_id);
    const firstInteractionAt = packFirstInteractionMap.get(`${participant.pack_id}:${participant.user_id}`);
    const earliestWalletLink = participantWalletMap.get(participant.user_id) ?? null;
    if (
      earliestWalletLink &&
      firstInteractionAt &&
      new Date(earliestWalletLink).getTime() >= new Date(firstInteractionAt).getTime()
    ) {
      current.firstTouchToWalletLinkCount += 1;
      current.firstTouchToWalletLinkDaysTotal +=
        (new Date(earliestWalletLink).getTime() - new Date(firstInteractionAt).getTime()) / 86400000;
    }
    if (
      sourceUser?.subscription_started_at &&
      earliestWalletLink &&
      new Date(sourceUser.subscription_started_at).getTime() >= new Date(earliestWalletLink).getTime()
    ) {
      current.walletToPremiumCount += 1;
      current.walletToPremiumDaysTotal +=
        (new Date(sourceUser.subscription_started_at).getTime() - new Date(earliestWalletLink).getTime()) / 86400000;
      if (firstInteractionAt && new Date(sourceUser.subscription_started_at).getTime() >= new Date(firstInteractionAt).getTime()) {
        current.premiumUpgradeCount += 1;
        current.premiumUpgradeDaysTotal +=
          (new Date(sourceUser.subscription_started_at).getTime() - new Date(firstInteractionAt).getTime()) / 86400000;
        if (
          (new Date(sourceUser.subscription_started_at).getTime() - new Date(firstInteractionAt).getTime()) / 86400000 <= 14
        ) {
          current.likelyPackCausedPremiumCount += 1;
        }
      }
    }
    packProgressMap.set(participant.pack_id, current);
  }
  const missionClickUsersResult = await runQuery<{
    pack_id: string | null;
    event_type: string | null;
    cta_label: string | null;
    cta_variant: string | null;
    user_id: string;
  }>(
    `SELECT DISTINCT
            al.metadata->>'packId' AS pack_id,
            al.metadata->>'eventType' AS event_type,
            al.metadata->>'ctaLabel' AS cta_label,
            COALESCE(al.metadata->>'ctaVariant', 'unknown') AS cta_variant,
            al.user_id::text AS user_id
     FROM activity_log al
     WHERE al.action_type = 'campaign-cta-click'
       AND al.metadata ? 'packId'`,
  );
  const missionClickUserIds = Array.from(new Set(missionClickUsersResult.rows.map((row) => row.user_id)));
  const { progressMap: missionClickProgressMap, userMap: missionClickUserMap } =
    await buildUserProgressSnapshot(missionClickUserIds);
  const missionCtaCorrelationMap = new Map<
    string,
    {
      walletLinkedUserCount: number;
      rewardEligibleUserCount: number;
      premiumUserCount: number;
    }
  >();

  for (const row of missionClickUsersResult.rows) {
    if (!row.pack_id) {
      continue;
    }
    const key = `${row.pack_id}::${row.event_type ?? "unknown"}::${row.cta_label ?? "unknown"}::${row.cta_variant ?? "unknown"}`;
    const current = missionCtaCorrelationMap.get(key) ?? {
      walletLinkedUserCount: 0,
      rewardEligibleUserCount: 0,
      premiumUserCount: 0,
    };
    const progress = missionClickProgressMap.get(row.user_id);
    const user = missionClickUserMap.get(row.user_id);
    if (progress?.walletLinked) {
      current.walletLinkedUserCount += 1;
    }
    if (progress?.rewardEligible) {
      current.rewardEligibleUserCount += 1;
    }
    if (user && user.subscription_tier !== "free") {
      current.premiumUserCount += 1;
    }
    missionCtaCorrelationMap.set(key, current);
  }

  const missionCtaTrendMap = new Map<
    string,
    AdminOverviewData["campaignOperations"]["missionCtaAnalytics"][number]["weeklyTrend"]
  >();
  for (const row of campaignMissionCtaTrends.rows) {
    if (!row.pack_id) {
      continue;
    }
    const key = `${row.pack_id}::${row.event_type ?? "unknown"}::${row.cta_label ?? "unknown"}::${row.cta_variant ?? "unknown"}`;
    const current = missionCtaTrendMap.get(key) ?? [];
    current.push({
      bucketStart: row.bucket_start,
      clickCount: Number(row.click_count ?? 0),
    });
    missionCtaTrendMap.set(key, current);
  }
  const missionSubmitAttemptMap = new Map<
    string,
    {
      submitAttemptCount: number;
      submitAttemptUserCount: number;
    }
  >();
  for (const row of campaignMissionSubmitAttempts.rows) {
    if (!row.pack_id) {
      continue;
    }
    missionSubmitAttemptMap.set(`${row.pack_id}::${row.cta_variant ?? "unknown"}`, {
      submitAttemptCount: Number(row.submit_attempt_count ?? 0),
      submitAttemptUserCount: Number(row.submit_attempt_user_count ?? 0),
    });
  }
  const missionApprovedByVariantMap = new Map<
    string,
    {
      approvedCompletionCount: number;
      approvedUserCount: number;
    }
  >();
  for (const row of campaignMissionApprovedByVariant.rows) {
    if (!row.pack_id) {
      continue;
    }
    missionApprovedByVariantMap.set(
      `${row.pack_id}::${row.cta_label ?? "unknown"}::${row.cta_variant ?? "unknown"}`,
      {
        approvedCompletionCount: Number(row.approved_completion_count ?? 0),
        approvedUserCount: Number(row.approved_user_count ?? 0),
      },
    );
  }
  const missionApprovedByTierMap = new Map<
    string,
    {
      approvedCompletionCount: number;
      approvedUserCount: number;
    }
  >();
  for (const row of campaignMissionApprovedByTier.rows) {
    if (!row.pack_id) {
      continue;
    }
    missionApprovedByTierMap.set(
      `${row.pack_id}::${row.subscription_tier ?? "free"}`,
      {
        approvedCompletionCount: Number(row.approved_completion_count ?? 0),
        approvedUserCount: Number(row.approved_user_count ?? 0),
      },
    );
  }

  const monthlyCount = usersByTier.rows.find((row) => row.subscription_tier === "monthly")?.count ?? "0";
  const annualCount = usersByTier.rows.find((row) => row.subscription_tier === "annual")?.count ?? "0";
  const queueMetrics = buildQueueMetrics(reviewQueue);
  const moderationNotifications = buildModerationNotifications({
    alerts: queueMetrics.alerts,
    thresholds: getQueueAlertThresholds(),
    channels: getModerationAlertChannelConfig(),
  });
  await syncModerationNotificationHistory(moderationNotifications);
  const moderationNotificationHistory = await listRecentModerationNotificationDeliveries();
  const upstreamLanePreview: AdminOverviewData["upstreamLanePreview"] = (["galxe", "taskon"] as const).map((source) => {
    const activeLane = resolveCampaignExperienceSource(economySettings, source);

    return {
      attributionSource: source,
      activeLane,
      differentiated: economySettings.differentiateUpstreamCampaignSources,
      detail: economySettings.differentiateUpstreamCampaignSources
        ? `${source} is currently running as its own live lane. Premium framing, quest ordering, and reward shaping resolve directly from the ${source} preset.`
        : `${source} attribution is currently preserved, but the live funnel resolves through the ${activeLane} bridge lane. The stored ${source} preset remains available if separate platform differentiation is enabled.`,
    };
  });
  const templateCounts = {
    total: questDefinitionTemplates.length,
    bridge: questDefinitionTemplates.filter((template) => template.metadata?.campaignTemplateKind === "bridge").length,
    feeder: questDefinitionTemplates.filter((template) => template.metadata?.campaignTemplateKind === "feeder").length,
    active: questDefinitionTemplates.filter((template) => template.isActive).length,
    generatedPacks: 0,
    activeGeneratedPacks: 0,
  };
  const sourceTemplateCounts: AdminOverviewData["campaignOperations"]["sourceTemplateCounts"] = (["zealy", "galxe", "taskon"] as const).map((source) => {
    const matching = questDefinitionTemplates.filter((template) => template.metadata?.campaignAttributionSource === source);
    return {
      source,
      total: matching.length,
      active: matching.filter((template) => template.isActive).length,
    };
  });
  const packAnalyticsMap = new Map<string, AdminOverviewData["campaignOperations"]["packAnalytics"][number]>();
  const packPerformanceMap = new Map(
    campaignPackPerformance.rows.map((row) => {
      const participantCount = Number(row.participant_count);
      const premiumParticipantCount = Number(row.premium_participant_count);

      return [
        row.pack_id,
        {
          completionCount: Number(row.completion_count),
          approvedCompletionCount: Number(row.approved_completion_count),
          participantCount,
          premiumParticipantCount,
          annualParticipantCount: Number(row.annual_participant_count),
          premiumConversionRate: participantCount > 0 ? premiumParticipantCount / participantCount : 0,
        },
      ] as const;
    }),
  );
  for (const quest of questDefinitionDirectory) {
    const packId = typeof quest.metadata?.campaignPackId === "string" ? quest.metadata.campaignPackId : null;
    if (!packId) {
      continue;
    }
    const packLabel =
      typeof quest.metadata?.campaignPackLabel === "string" ? quest.metadata.campaignPackLabel : packId;
    const source =
      typeof quest.metadata?.campaignAttributionSource === "string"
        ? (quest.metadata.campaignAttributionSource as "zealy" | "galxe" | "taskon" | "direct")
        : "direct";
    const kind =
      typeof quest.metadata?.campaignTemplateKind === "string" ? quest.metadata.campaignTemplateKind : null;
    const lifecycleState =
      typeof quest.metadata?.campaignPackState === "string" &&
      ["draft", "ready", "live"].includes(quest.metadata.campaignPackState)
        ? (quest.metadata.campaignPackState as "draft" | "ready" | "live")
        : quest.isActive
          ? "live"
          : "draft";
    const current =
      packAnalyticsMap.get(packId) ??
      {
        packId,
        label: packLabel,
        lifecycleState,
        questCount: 0,
        activeQuestCount: 0,
        bridgeCount: 0,
        feederCount: 0,
        sources: [] as ("zealy" | "galxe" | "taskon" | "direct")[],
        completionCount: 0,
        approvedCompletionCount: 0,
        participantCount: 0,
        walletLinkedParticipantCount: 0,
        walletLinkRate: 0,
        firstTouchToWalletLinkCount: 0,
        averageFirstTouchToWalletLinkDays: null,
        walletToPremiumCount: 0,
        averageWalletToPremiumDays: null,
        starterPathCompleteCount: 0,
        starterPathCompletionRate: 0,
        rewardEligibleCount: 0,
        rewardEligibilityRate: 0,
        referralInviteCount: 0,
        referralConvertedCount: 0,
        referralConversionRate: 0,
        postPackReferralInviteCount: 0,
        postPackReferralConvertedCount: 0,
        postPackReferralConversionRate: 0,
        likelyPackCausedPremiumCount: 0,
        likelyPackCausedPremiumConversionRate: 0,
        retainedActiveCount: 0,
        retainedActivityRate: 0,
        averageWeeklyXp: 0,
        engagedWeeklyXpCount: 0,
        engagedWeeklyXpRate: 0,
        premiumParticipantCount: 0,
        annualParticipantCount: 0,
        premiumConversionRate: 0,
        premiumUpgradeCount: 0,
        averagePremiumUpgradeDays: null,
        sourceBreakdown: [] as Array<{
          attributionSource: "direct" | "zealy" | "galxe" | "taskon";
          activeLane: "direct" | "zealy" | "galxe" | "taskon";
          participantCount: number;
        }>,
        weeklyTrend: [] as Array<{
          bucketStart: string;
          participantCount: number;
          completionCount: number;
        }>,
        benchmark: {
          activeLane: "direct" as const,
          walletLinkRateTarget: 0,
          rewardEligibilityRateTarget: 0,
          premiumConversionRateTarget: 0,
          retainedActivityRateTarget: 0,
          averageWeeklyXpTarget: 0,
          zeroCompletionWeekThreshold: 1,
          isOverridden: false,
          overrideReason: null,
          status: "on_track" as const,
        },
        missionCtaSummary: {
          topCtaLabel: null,
          topCtaVariant: null,
          recommendedVariant: null,
          recommendedBadge: null,
          recommendedReason: null,
          recommendationHistory: [],
          totalClicks: 0,
          uniqueUsers: 0,
          walletLinkedUsers: 0,
          rewardEligibleUsers: 0,
          premiumUsers: 0,
          walletLinkRate: 0,
          rewardEligibilityRate: 0,
          premiumConversionRate: 0,
          variantBreakdown: [],
          variantComparison: [],
        },
        createdAt: quest.createdAt,
        lastUpdatedAt: quest.updatedAt,
        reminderEffectiveness: {
          handledCount: 0,
          snoozedCount: 0,
          totalCount: 0,
          handledRate: 0,
          trend: {
            currentCount: 0,
            previousCount: 0,
            delta: 0,
          },
        },
        operatorNextMove: {
          title: "Keep monitoring this pack",
          detail: "Pack-specific operator guidance will appear once reminder and CTA signals accumulate.",
        },
        operatorOutcome: {
          title: "Outcome signal is still forming",
          detail: "Reminder handling, CTA traffic, and mission approvals need a little more pack activity before the operator outcome call becomes meaningful.",
          trend: {
            currentCompletions: 0,
            previousCompletions: 0,
            currentParticipants: 0,
            previousParticipants: 0,
            completionDelta: 0,
            participantDelta: 0,
          },
        },
      };
    current.lifecycleState = lifecycleState === "live" || current.lifecycleState === "live"
      ? "live"
      : lifecycleState === "ready" || current.lifecycleState === "ready"
        ? "ready"
        : "draft";
    current.questCount += 1;
    if (quest.isActive) {
      current.activeQuestCount += 1;
    }
    if (kind === "bridge") {
      current.bridgeCount += 1;
    }
    if (kind === "feeder") {
      current.feederCount += 1;
    }
    if (!current.sources.includes(source)) {
      current.sources.push(source);
    }
    current.createdAt = current.createdAt < quest.createdAt ? current.createdAt : quest.createdAt;
    current.lastUpdatedAt = current.lastUpdatedAt > quest.updatedAt ? current.lastUpdatedAt : quest.updatedAt;
    const performance = packPerformanceMap.get(packId);
    if (performance) {
      current.completionCount = performance.completionCount;
      current.approvedCompletionCount = performance.approvedCompletionCount;
      current.participantCount = performance.participantCount;
      current.premiumParticipantCount = performance.premiumParticipantCount;
      current.annualParticipantCount = performance.annualParticipantCount;
      current.premiumConversionRate = performance.premiumConversionRate;
    }
    const progress = packProgressMap.get(packId);
    if (progress) {
      current.walletLinkedParticipantCount = progress.walletLinkedParticipantCount;
      current.starterPathCompleteCount = progress.starterPathCompleteCount;
      current.rewardEligibleCount = progress.rewardEligibleCount;
      current.walletLinkRate =
        current.participantCount > 0 ? progress.walletLinkedParticipantCount / current.participantCount : 0;
      current.firstTouchToWalletLinkCount = progress.firstTouchToWalletLinkCount;
      current.averageFirstTouchToWalletLinkDays =
        progress.firstTouchToWalletLinkCount > 0
          ? progress.firstTouchToWalletLinkDaysTotal / progress.firstTouchToWalletLinkCount
          : null;
      current.walletToPremiumCount = progress.walletToPremiumCount;
      current.averageWalletToPremiumDays =
        progress.walletToPremiumCount > 0
          ? progress.walletToPremiumDaysTotal / progress.walletToPremiumCount
          : null;
      current.starterPathCompletionRate =
        current.participantCount > 0 ? progress.starterPathCompleteCount / current.participantCount : 0;
      current.rewardEligibilityRate =
        current.participantCount > 0 ? progress.rewardEligibleCount / current.participantCount : 0;
      current.retainedActiveCount = progress.retainedActiveCount;
      current.retainedActivityRate =
        current.participantCount > 0 ? progress.retainedActiveCount / current.participantCount : 0;
      current.averageWeeklyXp =
        current.participantCount > 0 ? progress.weeklyXpTotal / current.participantCount : 0;
      current.engagedWeeklyXpCount = progress.engagedWeeklyXpCount;
      current.engagedWeeklyXpRate =
        current.participantCount > 0 ? progress.engagedWeeklyXpCount / current.participantCount : 0;
      current.premiumUpgradeCount = progress.premiumUpgradeCount;
      current.likelyPackCausedPremiumCount = progress.likelyPackCausedPremiumCount;
      current.likelyPackCausedPremiumConversionRate =
        current.participantCount > 0 ? progress.likelyPackCausedPremiumCount / current.participantCount : 0;
      current.averagePremiumUpgradeDays =
        progress.premiumUpgradeCount > 0 ? progress.premiumUpgradeDaysTotal / progress.premiumUpgradeCount : null;
    }
    const referralPerformance = packReferralMap.get(packId);
    if (referralPerformance) {
      current.referralInviteCount = referralPerformance.referralInviteCount;
      current.referralConvertedCount = referralPerformance.referralConvertedCount;
      current.referralConversionRate = referralPerformance.referralConversionRate;
    }
    const attributedReferralPerformance = packAttributedReferralMap.get(packId);
    if (attributedReferralPerformance) {
      current.postPackReferralInviteCount = attributedReferralPerformance.postPackReferralInviteCount;
      current.postPackReferralConvertedCount = attributedReferralPerformance.postPackReferralConvertedCount;
      current.postPackReferralConversionRate = attributedReferralPerformance.postPackReferralConversionRate;
    }
    current.weeklyTrend = packTrendMap.get(packId) ?? [];
    packAnalyticsMap.set(packId, current);
  }
  for (const participant of packParticipantsResult.rows) {
    const progress = userProgressMapGlobal.get(participant.user_id);
    if (!progress) {
      continue;
    }
    const current = packAnalyticsMap.get(participant.pack_id);
    if (!current) {
      continue;
    }
    const attributionSource = progress.campaignSource ?? "direct";
    const activeLane = resolveCampaignExperienceSource(economySettings, attributionSource) as CampaignSource;
    const breakdownEntry = current.sourceBreakdown.find(
      (entry) => entry.attributionSource === attributionSource && entry.activeLane === activeLane,
    );
    if (breakdownEntry) {
      breakdownEntry.participantCount += 1;
    } else {
      current.sourceBreakdown.push({
        attributionSource,
        activeLane,
        participantCount: 1,
      });
    }
  }
  const campaignPackBenchmarkOverrideMap = new Map(
    campaignPackBenchmarkOverrides.map((override) => [override.packId, override] as const),
  );
  const missionCtaSummaryMap = new Map<
    string,
    {
      topCtaLabel: string | null;
      topCtaVariant: string | null;
      totalClicks: number;
      uniqueUsers: number;
      walletLinkedUsers: number;
      rewardEligibleUsers: number;
      premiumUsers: number;
      maxClicks: number;
      variantBreakdown: Array<{
        ctaVariant: string;
        ctaLabel: string | null;
        clickCount: number;
        uniqueUsers: number;
        approvedCompletionCount: number;
        approvedUserCount: number;
        approvedUserRate: number;
        tierBreakdown: Array<{
          subscriptionTier: SubscriptionTier;
          clickCount: number;
          approvedUserCount: number;
          approvedUserRate: number;
        }>;
        laneBreakdown: Array<{
          attributionSource: CampaignSource | "direct";
          activeLane: CampaignSource | "direct";
          uniqueUsers: number;
        }>;
      }>;
      variantComparison: Array<{
        variant: string;
        clickCount: number;
        approvedUserRate: number;
        walletLinkRate: number;
      }>;
    }
  >();
  const missionCtaLaneMap = new Map<
    string,
    Array<{
      attributionSource: CampaignSource | "direct";
      activeLane: CampaignSource | "direct";
      uniqueUsers: number;
    }>
  >();
  for (const row of missionClickUsersResult.rows) {
    if (!row.pack_id) {
      continue;
    }
    const user = missionClickUserMap.get(row.user_id);
    const attributionSource = (user?.attribution_source?.trim().toLowerCase() ?? "direct") as CampaignSource | "direct";
    const normalizedSource = ["direct", "zealy", "galxe", "taskon"].includes(attributionSource) ? attributionSource : "direct";
    const activeLane = resolveCampaignExperienceSource(economySettings, normalizedSource);
    const key = `${row.pack_id}::${row.cta_label ?? "unknown"}::${row.cta_variant ?? "unknown"}`;
    const current = missionCtaLaneMap.get(key) ?? [];
    const existing = current.find((entry) => entry.attributionSource === normalizedSource && entry.activeLane === activeLane);
    if (existing) {
      existing.uniqueUsers += 1;
    } else {
      current.push({
        attributionSource: normalizedSource,
        activeLane,
        uniqueUsers: 1,
      });
    }
    missionCtaLaneMap.set(key, current);
  }
  for (const entry of campaignMissionCtaAnalytics.rows) {
    if (!entry.pack_id) {
      continue;
    }
    const correlationKey = `${entry.pack_id}::${entry.event_type ?? "unknown"}::${entry.cta_label ?? "unknown"}::${entry.cta_variant ?? "unknown"}`;
    const correlation = missionCtaCorrelationMap.get(correlationKey);
    const clickCount = Number(entry.click_count ?? 0);
    const uniqueUserCount = Number(entry.unique_user_count ?? 0);
    const current = missionCtaSummaryMap.get(entry.pack_id) ?? {
      topCtaLabel: null,
      topCtaVariant: null,
      totalClicks: 0,
      uniqueUsers: 0,
      walletLinkedUsers: 0,
      rewardEligibleUsers: 0,
      premiumUsers: 0,
      maxClicks: -1,
      variantBreakdown: [],
      variantComparison: [],
    };
    current.totalClicks += clickCount;
    current.uniqueUsers += uniqueUserCount;
    current.walletLinkedUsers += correlation?.walletLinkedUserCount ?? 0;
    current.rewardEligibleUsers += correlation?.rewardEligibleUserCount ?? 0;
    current.premiumUsers += correlation?.premiumUserCount ?? 0;
    if (clickCount > current.maxClicks) {
      current.maxClicks = clickCount;
      current.topCtaLabel = entry.cta_label ?? null;
      current.topCtaVariant = entry.cta_variant ?? null;
    }
    const approvedSummary = missionApprovedByVariantMap.get(
      `${entry.pack_id}::${entry.cta_label ?? "unknown"}::${entry.cta_variant ?? "unknown"}`,
    );
    current.variantBreakdown.push({
      ctaVariant: entry.cta_variant ?? "unknown",
      ctaLabel: entry.cta_label ?? null,
      clickCount,
      uniqueUsers: uniqueUserCount,
      approvedCompletionCount: approvedSummary?.approvedCompletionCount ?? 0,
      approvedUserCount: approvedSummary?.approvedUserCount ?? 0,
      approvedUserRate: uniqueUserCount > 0 ? (approvedSummary?.approvedUserCount ?? 0) / uniqueUserCount : 0,
      tierBreakdown: campaignMissionCtaByTier.rows
        .filter(
          (tierRow) =>
            tierRow.pack_id === entry.pack_id &&
            (tierRow.cta_variant ?? "unknown") === (entry.cta_variant ?? "unknown"),
        )
        .map((tierRow) => {
          const approvedTierSummary = missionApprovedByTierMap.get(
            `${tierRow.pack_id ?? "unknown"}::${tierRow.subscription_tier ?? "free"}`,
          );
          const tierUniqueUsers = Number(tierRow.unique_user_count ?? 0);
          return {
            subscriptionTier: tierRow.subscription_tier,
            clickCount: Number(tierRow.click_count ?? 0),
            approvedUserCount: approvedTierSummary?.approvedUserCount ?? 0,
            approvedUserRate: tierUniqueUsers > 0 ? (approvedTierSummary?.approvedUserCount ?? 0) / tierUniqueUsers : 0,
          };
        }),
      laneBreakdown:
        missionCtaLaneMap.get(`${entry.pack_id}::${entry.cta_label ?? "unknown"}::${entry.cta_variant ?? "unknown"}`) ?? [],
    });
    current.variantComparison.push({
      variant: entry.cta_variant ?? "unknown",
      clickCount,
      approvedUserRate: uniqueUserCount > 0 ? (approvedSummary?.approvedUserCount ?? 0) / uniqueUserCount : 0,
      walletLinkRate: uniqueUserCount > 0 ? (correlation?.walletLinkedUserCount ?? 0) / uniqueUserCount : 0,
    });
    missionCtaSummaryMap.set(entry.pack_id, current);
  }
  for (const pack of packAnalyticsMap.values()) {
    const dominantSource =
      pack.sourceBreakdown.slice().sort((left, right) => right.participantCount - left.participantCount)[0]?.activeLane ??
      pack.sources[0] ??
      "direct";
    const benchmarkOverride = campaignPackBenchmarkOverrideMap.get(pack.packId) ?? null;
    const benchmark = getCampaignPackBenchmark(economySettings, dominantSource, benchmarkOverride);
    const score =
      (pack.walletLinkRate >= benchmark.walletLinkRateTarget ? 1 : 0) +
      (pack.rewardEligibilityRate >= benchmark.rewardEligibilityRateTarget ? 1 : 0) +
      (pack.premiumConversionRate >= benchmark.premiumConversionRateTarget ? 1 : 0) +
      (pack.retainedActivityRate >= benchmark.retainedActivityRateTarget ? 1 : 0) +
      (pack.averageWeeklyXp >= benchmark.averageWeeklyXpTarget ? 1 : 0);
    pack.benchmark = {
      ...benchmark,
      isOverridden: Boolean(benchmarkOverride),
      overrideReason: benchmarkOverride?.reason ?? null,
      status: score >= 5 ? "on_track" : score >= 3 ? "mixed" : "off_track",
    };
    const ctaSummary = missionCtaSummaryMap.get(pack.packId);
    if (ctaSummary) {
      const recommendationState =
        pack.walletLinkRate < 0.25
          ? "wallet_connection"
          : pack.starterPathCompletionRate < 0.25
            ? "starter_path"
            : pack.rewardEligibilityRate < pack.benchmark.rewardEligibilityRateTarget
              ? "trust"
              : pack.premiumConversionRate < pack.benchmark.premiumConversionRateTarget
                ? "premium_phase"
                : pack.retainedActivityRate < pack.benchmark.retainedActivityRateTarget ||
                    pack.averageWeeklyXp < pack.benchmark.averageWeeklyXpTarget
                  ? "weekly_pace"
                  : "ready";
      const recommendationWindow =
        recommendationState === "weekly_pace" &&
        pack.averageWeeklyXp < pack.benchmark.averageWeeklyXpTarget * 0.7
          ? "today"
          : recommendationState === "weekly_pace"
            ? "this_week"
            : recommendationState === "ready"
              ? "this_week"
              : "wait_for_unlock";
      const recommendedCta = getRecommendedPackCta(recommendationState, recommendationWindow);
      const reminderHandledRate = pack.reminderEffectiveness.handledRate;
      pack.missionCtaSummary = {
        topCtaLabel: ctaSummary.topCtaLabel,
        topCtaVariant: ctaSummary.topCtaVariant,
        recommendedVariant: recommendedCta.variant,
        recommendedBadge: recommendedCta.badge,
        recommendedReason: recommendedCta.reason,
        recommendationHistory: campaignPackAudit
          .filter(
            (entry) =>
              entry.packId === pack.packId &&
              (entry.action === "save_benchmark_override" ||
                entry.action === "clear_benchmark_override" ||
                entry.action === "update_lifecycle" ||
                entry.action === "suppress_alert" ||
                entry.action === "clear_alert_suppression"),
          )
          .slice(0, 3),
        totalClicks: ctaSummary.totalClicks,
        uniqueUsers: ctaSummary.uniqueUsers,
        walletLinkedUsers: ctaSummary.walletLinkedUsers,
        rewardEligibleUsers: ctaSummary.rewardEligibleUsers,
        premiumUsers: ctaSummary.premiumUsers,
        walletLinkRate: ctaSummary.uniqueUsers > 0 ? ctaSummary.walletLinkedUsers / ctaSummary.uniqueUsers : 0,
        rewardEligibilityRate: ctaSummary.uniqueUsers > 0 ? ctaSummary.rewardEligibleUsers / ctaSummary.uniqueUsers : 0,
        premiumConversionRate: ctaSummary.uniqueUsers > 0 ? ctaSummary.premiumUsers / ctaSummary.uniqueUsers : 0,
        variantBreakdown: ctaSummary.variantBreakdown.sort((left, right) => right.clickCount - left.clickCount),
        variantComparison: ctaSummary.variantComparison.sort((left, right) => right.approvedUserRate - left.approvedUserRate),
      };
      pack.operatorNextMove = getPackOperatorNextMove({
        blockageState: recommendationState,
        reminderHandledRate,
        topCtaVariant: ctaSummary.topCtaVariant,
        returnWindow: recommendationWindow,
      });
      pack.operatorOutcome = {
        ...pack.operatorOutcome,
        ...getPackOperatorOutcome({
        reminderHandledRate,
        ctaUsers: ctaSummary.uniqueUsers,
        participantCount: pack.participantCount,
        approvedCompletionCount: pack.approvedCompletionCount,
        }),
      };
      const latestTrend = pack.weeklyTrend[pack.weeklyTrend.length - 1];
      const previousTrend = pack.weeklyTrend[pack.weeklyTrend.length - 2];
      pack.operatorOutcome.trend = {
        currentCompletions: latestTrend?.completionCount ?? 0,
        previousCompletions: previousTrend?.completionCount ?? 0,
        currentParticipants: latestTrend?.participantCount ?? 0,
        previousParticipants: previousTrend?.participantCount ?? 0,
        completionDelta: (latestTrend?.completionCount ?? 0) - (previousTrend?.completionCount ?? 0),
        participantDelta: (latestTrend?.participantCount ?? 0) - (previousTrend?.participantCount ?? 0),
      };
    }
  }
  const packAnalytics = Array.from(packAnalyticsMap.values()).sort(
    (left, right) => right.activeQuestCount - left.activeQuestCount || right.questCount - left.questCount,
  );
  const partnerReporting = packAnalytics
    .filter((entry) => entry.lifecycleState === "live" || entry.activeQuestCount > 0)
    .map((entry) => ({
      packId: entry.packId,
      label: entry.label,
      lifecycleState: entry.lifecycleState,
      sources: entry.sources,
      benchmarkLane: entry.benchmark.activeLane,
      benchmarkStatus: entry.benchmark.status,
      participantCount: entry.participantCount,
      approvedCompletionCount: entry.approvedCompletionCount,
      walletLinkRate: entry.walletLinkRate,
      rewardEligibilityRate: entry.rewardEligibilityRate,
      premiumConversionRate: entry.premiumConversionRate,
      likelyPackCausedPremiumConversionRate: entry.likelyPackCausedPremiumConversionRate,
      averageWeeklyXp: entry.averageWeeklyXp,
      completionTrendDelta: entry.operatorOutcome.trend.completionDelta,
      partnerSummaryHeadline:
        entry.benchmark.status === "on_track"
          ? "Pack is meeting the current lane benchmarks."
          : entry.benchmark.status === "mixed"
            ? "Pack is moving users, but one or more funnel stages need attention."
            : "Pack is under the current lane benchmarks and needs intervention.",
      partnerSummaryDetail:
        `${Math.round(entry.walletLinkRate * 100)}% wallet linked, ${Math.round(entry.rewardEligibilityRate * 100)}% reward eligible, ${Math.round(entry.premiumConversionRate * 100)}% premium conversion, and ${Math.round(entry.likelyPackCausedPremiumConversionRate * 100)}% likely pack-caused premium within 14 days.`,
      operatorOutcomeTitle: entry.operatorOutcome.title,
      operatorOutcomeDetail: entry.operatorOutcome.detail,
      lifecyclePhaseSummary:
        entry.lifecycleState === "draft"
          ? "Still shaping in draft. Treat current outcome signals as directional rather than final."
          : entry.lifecycleState === "ready"
            ? "Ready-state changes are now visible. This is the best phase for validating CTA and reminder choices before full live pressure."
            : "Live-state performance is now the main operator read. Trend movement here is the strongest signal for intervention or scaling.",
      zeroCompletionRiskTrendSummary:
        (entry.weeklyTrend[entry.weeklyTrend.length - 1]?.completionCount ?? 0) === 0
          ? (entry.weeklyTrend[entry.weeklyTrend.length - 2]?.completionCount ?? 0) === 0
            ? `${entry.lifecycleState} phase is still in a zero-completion risk state week over week.`
            : `${entry.lifecycleState} phase just moved into a zero-completion risk state this week.`
          : (entry.weeklyTrend[entry.weeklyTrend.length - 2]?.completionCount ?? 0) === 0
            ? `${entry.lifecycleState} phase eased out of zero-completion risk this week.`
            : `${entry.lifecycleState} phase is currently moving with non-zero completions.`,
      benchmarkOverrideImpactSummary: entry.benchmark.isOverridden
        ? `This pack is using a custom benchmark override${entry.benchmark.overrideReason ? `: ${entry.benchmark.overrideReason}` : "."}`
        : "This pack is still being judged against the default lane benchmark set.",
      benchmarkOverrideHistorySummary:
        campaignPackAudit
          .filter(
            (auditEntry) =>
              auditEntry.packId === entry.packId &&
              (auditEntry.action === "save_benchmark_override" || auditEntry.action === "clear_benchmark_override"),
          )
          .slice(0, 2)
          .map((auditEntry) => `${auditEntry.createdAt.slice(0, 10)}: ${auditEntry.detail}`)
          .join(" | ") || null,
      lifecycleHistorySummary:
        campaignPackAudit
          .filter((auditEntry) => auditEntry.packId === entry.packId && auditEntry.action === "update_lifecycle")
          .slice(0, 2)
          .map((auditEntry) => `${auditEntry.createdAt.slice(0, 10)}: ${auditEntry.detail}`)
          .join(" | ") || null,
      recommendationHistorySnapshot: entry.missionCtaSummary.recommendationHistory
        .slice(0, 2)
        .map((historyEntry) => `${historyEntry.action.replaceAll("_", " ")}: ${historyEntry.detail}`),
    }))
    .sort((left, right) => right.participantCount - left.participantCount || right.approvedCompletionCount - left.approvedCompletionCount);
  const alerts: AdminOverviewData["campaignOperations"]["alerts"] = [];
  for (const pack of packAnalytics) {
    if (pack.lifecycleState !== "live" && pack.activeQuestCount === 0) {
      continue;
    }
    let trailingZeroCompletionWeeks = 0;
    for (const trendEntry of pack.weeklyTrend.slice().reverse()) {
      if (trendEntry.completionCount > 0) {
        break;
      }
      trailingZeroCompletionWeeks += 1;
    }
    const latestTrend = pack.weeklyTrend[pack.weeklyTrend.length - 1];
    if (
      !latestTrend ||
      trailingZeroCompletionWeeks >= pack.benchmark.zeroCompletionWeekThreshold
    ) {
      alerts.push({
        packId: pack.packId,
        label: pack.label,
        severity: "critical",
        title: "Live pack has no recent completions",
        detail: `${pack.label} has missed completion volume for ${Math.max(trailingZeroCompletionWeeks, 1)} tracked week(s). Check activation, routing, or pack visibility.`,
      });
      continue;
    }
    if (pack.walletLinkRate < pack.benchmark.walletLinkRateTarget) {
      alerts.push({
        packId: pack.packId,
        label: pack.label,
        severity: "warning",
        title: "Wallet-link rate is soft",
        detail: `${pack.label} is converting ${Math.round(pack.walletLinkRate * 100)}% of participants into wallet-linked users against a ${Math.round(pack.benchmark.walletLinkRateTarget * 100)}% target for the ${pack.benchmark.activeLane} lane.`,
      });
    }
    if (pack.rewardEligibilityRate < pack.benchmark.rewardEligibilityRateTarget) {
      alerts.push({
        packId: pack.packId,
        label: pack.label,
        severity: "warning",
        title: "Reward-eligibility progression is weak",
        detail: `${pack.label} is getting ${Math.round(pack.rewardEligibilityRate * 100)}% of participants to reward eligibility against a ${Math.round(pack.benchmark.rewardEligibilityRateTarget * 100)}% target for the ${pack.benchmark.activeLane} lane.`,
      });
    }
    if (pack.premiumConversionRate < pack.benchmark.premiumConversionRateTarget) {
      alerts.push({
        packId: pack.packId,
        label: pack.label,
        severity: "warning",
        title: "Premium conversion is below target",
        detail: `${pack.label} is converting ${Math.round(pack.premiumConversionRate * 100)}% of participants into premium against a ${Math.round(pack.benchmark.premiumConversionRateTarget * 100)}% target for the ${pack.benchmark.activeLane} lane.`,
      });
    }
    if (pack.retainedActivityRate < pack.benchmark.retainedActivityRateTarget) {
      alerts.push({
        packId: pack.packId,
        label: pack.label,
        severity: "warning",
        title: "Retained activity is below target",
        detail: `${pack.label} is holding ${Math.round(pack.retainedActivityRate * 100)}% of participants active week-over-week against a ${Math.round(pack.benchmark.retainedActivityRateTarget * 100)}% target for the ${pack.benchmark.activeLane} lane.`,
      });
    }
  }
  const activeCampaignPackSuppressions = await listActiveCampaignPackAlertSuppressions();
  const suppressionKeySet = new Set(
    activeCampaignPackSuppressions.map((suppression) => `${suppression.packId}|${suppression.title}`),
  );
  const visibleCampaignPackAlerts = alerts.filter(
    (alert) => !suppressionKeySet.has(`${alert.packId}|${alert.title}`),
  );
  const campaignPackNotifications = buildCampaignPackNotifications({
    alerts: visibleCampaignPackAlerts,
    channels: economySettings.campaignAlertChannels,
  });
  await syncCampaignPackNotificationHistory(campaignPackNotifications);
  const campaignPackNotificationHistory = await listRecentCampaignPackNotificationDeliveries();
  templateCounts.generatedPacks = packAnalytics.length;
  templateCounts.activeGeneratedPacks = packAnalytics.filter((entry) => entry.activeQuestCount > 0).length;
  const packAnalyticsLookup = new Map(packAnalytics.map((pack) => [pack.packId, pack] as const));
  const missionCtaAnalytics: AdminOverviewData["campaignOperations"]["missionCtaAnalytics"] = campaignMissionCtaAnalytics.rows
    .filter((row) => typeof row.pack_id === "string" && row.pack_id.length > 0)
    .map((row) => {
      const pack = packAnalyticsLookup.get(row.pack_id ?? "");
      const key = `${row.pack_id ?? "unknown"}::${row.event_type ?? "unknown"}::${row.cta_label ?? "unknown"}::${row.cta_variant ?? "unknown"}`;
      const correlation = missionCtaCorrelationMap.get(key);
      const submitAttempts = missionSubmitAttemptMap.get(`${row.pack_id ?? "unknown"}::${row.cta_variant ?? "unknown"}`);
      const uniqueUserCount = Number(row.unique_user_count ?? 0);

      return {
        packId: row.pack_id ?? "unknown",
        label: pack?.label ?? "Unknown pack",
        activeLane: pack?.benchmark.activeLane ?? "direct",
        eventType: row.event_type ?? "unknown",
        ctaLabel: row.cta_label ?? "Unknown CTA",
        ctaVariant: row.cta_variant ?? "unknown",
        clickCount: Number(row.click_count ?? 0),
        uniqueUserCount,
        lastClickedAt: row.last_clicked_at,
        weeklyTrend: missionCtaTrendMap.get(key) ?? [],
        walletLinkedUserCount: correlation?.walletLinkedUserCount ?? 0,
        rewardEligibleUserCount: correlation?.rewardEligibleUserCount ?? 0,
        premiumUserCount: correlation?.premiumUserCount ?? 0,
        walletLinkRate: uniqueUserCount > 0 ? (correlation?.walletLinkedUserCount ?? 0) / uniqueUserCount : 0,
        rewardEligibilityRate: uniqueUserCount > 0 ? (correlation?.rewardEligibleUserCount ?? 0) / uniqueUserCount : 0,
        premiumConversionRate: uniqueUserCount > 0 ? (correlation?.premiumUserCount ?? 0) / uniqueUserCount : 0,
        submitAttemptCount: submitAttempts?.submitAttemptCount ?? 0,
        submitAttemptUserCount: submitAttempts?.submitAttemptUserCount ?? 0,
        submitAttemptRate: uniqueUserCount > 0 ? (submitAttempts?.submitAttemptUserCount ?? 0) / uniqueUserCount : 0,
      };
    })
    .sort((left, right) => right.clickCount - left.clickCount || right.uniqueUserCount - left.uniqueUserCount);
  const missionCtaByTier: AdminOverviewData["campaignOperations"]["missionCtaByTier"] = campaignMissionCtaByTier.rows
    .filter((row) => typeof row.pack_id === "string" && row.pack_id.length > 0)
    .map((row) => {
      const approvedSummary = missionApprovedByTierMap.get(
        `${row.pack_id ?? "unknown"}::${row.subscription_tier ?? "free"}`,
      );
      const uniqueUserCount = Number(row.unique_user_count ?? 0);

      return {
        packId: row.pack_id ?? "unknown",
        label: packAnalyticsLookup.get(row.pack_id ?? "")?.label ?? "Unknown pack",
        activeLane: packAnalyticsLookup.get(row.pack_id ?? "")?.benchmark.activeLane ?? "direct",
        subscriptionTier: row.subscription_tier,
        eventType: row.event_type ?? "unknown",
        ctaVariant: row.cta_variant ?? "unknown",
        clickCount: Number(row.click_count ?? 0),
        uniqueUserCount,
        approvedCompletionCount: approvedSummary?.approvedCompletionCount ?? 0,
        approvedUserCount: approvedSummary?.approvedUserCount ?? 0,
        approvedUserRate: uniqueUserCount > 0 ? (approvedSummary?.approvedUserCount ?? 0) / uniqueUserCount : 0,
      };
    })
    .sort((left, right) => right.clickCount - left.clickCount || right.uniqueUserCount - left.uniqueUserCount);
  const returnWindowSummary: AdminOverviewData["campaignOperations"]["returnWindowSummary"] = [
    { window: "today", count: 0 },
    { window: "this_week", count: 0 },
    { window: "wait_for_unlock", count: 0 },
  ];
  const returnWindowTrendMap = new Map<
    AdminOverviewData["campaignOperations"]["returnWindowTrend"][number]["window"],
    { currentCount: number; previousCount: number }
  >([
    ["today", { currentCount: 0, previousCount: 0 }],
    ["this_week", { currentCount: 0, previousCount: 0 }],
    ["wait_for_unlock", { currentCount: 0, previousCount: 0 }],
  ]);
  const returnWindowLookup = new Map(returnWindowSummary.map((entry) => [entry.window, entry] as const));
  for (const pack of packAnalytics) {
    if (pack.lifecycleState !== "live" && pack.activeQuestCount === 0) {
      continue;
    }
    const packParticipants = pack.sourceBreakdown.reduce((sum, entry) => sum + entry.participantCount, 0);
    let targetWindow: AdminOverviewData["campaignOperations"]["returnWindowSummary"][number]["window"] = "today";
    if (pack.rewardEligibilityRate < 0.25 || pack.walletLinkRate < 0.25) {
      targetWindow = "wait_for_unlock";
    } else if (
      pack.retainedActivityRate < pack.benchmark.retainedActivityRateTarget ||
      pack.averageWeeklyXp < pack.benchmark.averageWeeklyXpTarget
    ) {
      targetWindow = "this_week";
    }
    const summaryEntry = returnWindowLookup.get(targetWindow);
    if (summaryEntry) {
      summaryEntry.count += packParticipants;
    }
    const trendEntry = returnWindowTrendMap.get(targetWindow);
    if (trendEntry) {
      trendEntry.currentCount += pack.weeklyTrend[pack.weeklyTrend.length - 1]?.participantCount ?? packParticipants;
      trendEntry.previousCount += pack.weeklyTrend[pack.weeklyTrend.length - 2]?.participantCount ?? 0;
    }
  }
  const returnWindowTrend: AdminOverviewData["campaignOperations"]["returnWindowTrend"] = Array.from(
    returnWindowTrendMap.entries(),
  ).map(([window, entry]) => ({
    window,
    currentCount: entry.currentCount,
    previousCount: entry.previousCount,
    delta: entry.currentCount - entry.previousCount,
  }));
  const missionInboxHistory: AdminOverviewData["campaignOperations"]["missionInboxHistory"] = campaignMissionInboxHistory.rows
    .filter((row) => row.pack_id && row.notification_status)
    .map((row) => ({
      id: row.id,
      displayName: row.display_name,
      packId: row.pack_id ?? "unknown",
      packLabel: packAnalyticsLookup.get(row.pack_id ?? "")?.label ?? "Unknown pack",
      status: row.notification_status as "handled" | "snoozed",
      until: row.notification_until,
      detail: row.detail ?? "Updated mission inbox state.",
      createdAt: row.created_at,
    }));
  const reminderVariantByBlockageMap = new Map<
    string,
    {
      state: AdminOverviewData["campaignOperations"]["blockageSummary"][number]["state"];
      variant: string;
      handledCount: number;
      snoozedCount: number;
    }
  >();
  const reminderScheduleSummaryMap = new Map<
    AdminOverviewData["campaignOperations"]["reminderScheduleSummary"][number]["schedule"],
    { currentCount: number; previousCount: number }
  >([
    ["today", { currentCount: 0, previousCount: 0 }],
    ["this_week", { currentCount: 0, previousCount: 0 }],
    ["wait_for_unlock", { currentCount: 0, previousCount: 0 }],
  ]);
  const reminderVariantScheduleMap = new Map<
    string,
    AdminOverviewData["campaignOperations"]["reminderVariantScheduleSummary"][number]
  >();
  const missionReminderStatusTrendMap = new Map<
    AdminOverviewData["campaignOperations"]["missionReminderStatusTrend"][number]["status"],
    { currentCount: number; previousCount: number }
  >([
    ["handled", { currentCount: 0, previousCount: 0 }],
    ["snoozed", { currentCount: 0, previousCount: 0 }],
  ]);
  for (const row of missionReminderStatusTrend.rows) {
    if (!row.notification_status) {
      continue;
    }
    const entry = missionReminderStatusTrendMap.get(row.notification_status as "handled" | "snoozed");
    if (!entry) {
      continue;
    }
    if (row.bucket === "current") {
      entry.currentCount += Number(row.count ?? 0);
    } else {
      entry.previousCount += Number(row.count ?? 0);
    }
  }
  const missionReminderStatusTrendData: AdminOverviewData["campaignOperations"]["missionReminderStatusTrend"] = Array.from(
    missionReminderStatusTrendMap.entries(),
  ).map(([status, entry]) => ({
    status,
    currentCount: entry.currentCount,
    previousCount: entry.previousCount,
    delta: entry.currentCount - entry.previousCount,
  }));
  const blockageSummaryMap = new Map<
    AdminOverviewData["campaignOperations"]["blockageSummary"][number]["state"],
    number
  >([
    ["wallet_connection", 0],
    ["starter_path", 0],
    ["level", 0],
    ["trust", 0],
    ["premium_phase", 0],
    ["weekly_pace", 0],
    ["ready", 0],
  ]);
  for (const pack of packAnalytics) {
    const participantCount = pack.sourceBreakdown.reduce((sum, entry) => sum + entry.participantCount, 0);
    let state: AdminOverviewData["campaignOperations"]["blockageSummary"][number]["state"] = "ready";
    if (pack.walletLinkRate < 0.25) {
      state = "wallet_connection";
    } else if (pack.starterPathCompletionRate < 0.25) {
      state = "starter_path";
    } else if (pack.rewardEligibilityRate < 0.25) {
      state = "trust";
    } else if (pack.premiumConversionRate < pack.benchmark.premiumConversionRateTarget) {
      state = "premium_phase";
    } else if (pack.retainedActivityRate < pack.benchmark.retainedActivityRateTarget) {
      state = "weekly_pace";
    }
    blockageSummaryMap.set(state, (blockageSummaryMap.get(state) ?? 0) + participantCount);
  }
  const blockageSummary: AdminOverviewData["campaignOperations"]["blockageSummary"] = Array.from(
    blockageSummaryMap.entries(),
  ).map(([state, count]) => ({ state, count }));
  const blockageTrendMap = new Map<
    AdminOverviewData["campaignOperations"]["blockageTrend"][number]["state"],
    { currentCount: number; previousCount: number }
  >([
    ["wallet_connection", { currentCount: 0, previousCount: 0 }],
    ["starter_path", { currentCount: 0, previousCount: 0 }],
    ["level", { currentCount: 0, previousCount: 0 }],
    ["trust", { currentCount: 0, previousCount: 0 }],
    ["premium_phase", { currentCount: 0, previousCount: 0 }],
    ["weekly_pace", { currentCount: 0, previousCount: 0 }],
    ["ready", { currentCount: 0, previousCount: 0 }],
  ]);
  for (const pack of packAnalytics) {
    const latestParticipants = pack.weeklyTrend[pack.weeklyTrend.length - 1]?.participantCount ?? pack.participantCount;
    const previousParticipants = pack.weeklyTrend[pack.weeklyTrend.length - 2]?.participantCount ?? 0;
    let state: AdminOverviewData["campaignOperations"]["blockageTrend"][number]["state"] = "ready";
    if (pack.walletLinkRate < 0.25) {
      state = "wallet_connection";
    } else if (pack.starterPathCompletionRate < 0.25) {
      state = "starter_path";
    } else if (pack.rewardEligibilityRate < 0.25) {
      state = "trust";
    } else if (pack.premiumConversionRate < pack.benchmark.premiumConversionRateTarget) {
      state = "premium_phase";
    } else if (pack.retainedActivityRate < pack.benchmark.retainedActivityRateTarget) {
      state = "weekly_pace";
    }
    const entry = blockageTrendMap.get(state);
    if (entry) {
      entry.currentCount += latestParticipants;
      entry.previousCount += previousParticipants;
    }
  }
  const blockageTrend: AdminOverviewData["campaignOperations"]["blockageTrend"] = Array.from(
    blockageTrendMap.entries(),
  ).map(([state, entry]) => ({
    state,
    currentCount: entry.currentCount,
    previousCount: entry.previousCount,
    delta: entry.currentCount - entry.previousCount,
  }));
  const reminderVariantMap = new Map<string, { handledCount: number; snoozedCount: number }>();
  const reminderVariantTrendMap = new Map<string, { currentCount: number; previousCount: number }>();
  for (const row of missionReminderVariantSummary.rows) {
    const variant = row.reminder_variant ?? "unknown";
    const current = reminderVariantMap.get(variant) ?? { handledCount: 0, snoozedCount: 0 };
    if (row.notification_status === "handled") {
      current.handledCount += Number(row.count ?? 0);
    } else if (row.notification_status === "snoozed") {
      current.snoozedCount += Number(row.count ?? 0);
    }
    reminderVariantMap.set(variant, current);
    const trend = reminderVariantTrendMap.get(variant) ?? { currentCount: 0, previousCount: 0 };
    if (row.bucket === "current") {
      trend.currentCount += Number(row.count ?? 0);
    } else {
      trend.previousCount += Number(row.count ?? 0);
    }
    reminderVariantTrendMap.set(variant, trend);
  }
  const reminderVariantSummary: AdminOverviewData["campaignOperations"]["reminderVariantSummary"] = Array.from(
    reminderVariantMap.entries(),
  ).map(([variant, entry]) => ({
    variant,
    handledCount: entry.handledCount,
    snoozedCount: entry.snoozedCount,
    handledRate:
      entry.handledCount + entry.snoozedCount > 0
        ? entry.handledCount / (entry.handledCount + entry.snoozedCount)
        : 0,
  }));
  const reminderVariantTrend: AdminOverviewData["campaignOperations"]["reminderVariantTrend"] = Array.from(
    reminderVariantTrendMap.entries(),
  )
    .map(([variant, entry]) => ({
      variant,
      currentCount: entry.currentCount,
      previousCount: entry.previousCount,
      delta: entry.currentCount - entry.previousCount,
    }))
    .sort((left, right) => right.currentCount - left.currentCount);
  for (const row of campaignMissionInboxHistory.rows) {
    if (!row.pack_id || !row.notification_status) {
      continue;
    }
    const pack = packAnalyticsLookup.get(row.pack_id);
    if (!pack) {
      continue;
    }
    const state: AdminOverviewData["campaignOperations"]["blockageSummary"][number]["state"] =
      pack.walletLinkRate < 0.25
        ? "wallet_connection"
        : pack.starterPathCompletionRate < 0.25
          ? "starter_path"
          : pack.rewardEligibilityRate < pack.benchmark.rewardEligibilityRateTarget
            ? "trust"
            : pack.premiumConversionRate < pack.benchmark.premiumConversionRateTarget
              ? "premium_phase"
              : pack.retainedActivityRate < pack.benchmark.retainedActivityRateTarget
                ? "weekly_pace"
                : "ready";
    const variant = row.reminder_variant ?? "unknown";
    const key = `${state}::${variant}`;
    const current = reminderVariantByBlockageMap.get(key) ?? {
      state,
      variant,
      handledCount: 0,
      snoozedCount: 0,
    };
    if (row.notification_status === "handled") {
      current.handledCount += 1;
    } else if (row.notification_status === "snoozed") {
      current.snoozedCount += 1;
    }
    reminderVariantByBlockageMap.set(key, current);
    const schedule = row.reminder_schedule ?? "wait_for_unlock";
    const scheduleTrend = reminderScheduleSummaryMap.get(schedule);
    if (scheduleTrend) {
      const createdAt = new Date(row.created_at).getTime();
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (createdAt >= sevenDaysAgo) {
        scheduleTrend.currentCount += 1;
      } else {
        scheduleTrend.previousCount += 1;
      }
    }
    const scheduleKey = `${variant}::${schedule}`;
    const scheduleEntry = reminderVariantScheduleMap.get(scheduleKey) ?? {
      variant,
      schedule,
      handledCount: 0,
      snoozedCount: 0,
    };
    if (row.notification_status === "handled") {
      scheduleEntry.handledCount += 1;
    } else if (row.notification_status === "snoozed") {
      scheduleEntry.snoozedCount += 1;
    }
    reminderVariantScheduleMap.set(scheduleKey, scheduleEntry);
    pack.reminderEffectiveness.totalCount += 1;
    const createdAt = new Date(row.created_at).getTime();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    if (row.notification_status === "handled") {
      pack.reminderEffectiveness.handledCount += 1;
    } else if (row.notification_status === "snoozed") {
      pack.reminderEffectiveness.snoozedCount += 1;
    }
    if (createdAt >= sevenDaysAgo) {
      pack.reminderEffectiveness.trend.currentCount += 1;
    } else {
      pack.reminderEffectiveness.trend.previousCount += 1;
    }
  }
  for (const pack of packAnalyticsLookup.values()) {
    pack.reminderEffectiveness.handledRate =
      pack.reminderEffectiveness.totalCount > 0
        ? pack.reminderEffectiveness.handledCount / pack.reminderEffectiveness.totalCount
        : 0;
    pack.reminderEffectiveness.trend.delta =
      pack.reminderEffectiveness.trend.currentCount - pack.reminderEffectiveness.trend.previousCount;
  }
  const reminderScheduleSummary: AdminOverviewData["campaignOperations"]["reminderScheduleSummary"] = Array.from(
    reminderScheduleSummaryMap.entries(),
  ).map(([schedule, entry]) => ({
    schedule,
    currentCount: entry.currentCount,
    previousCount: entry.previousCount,
    delta: entry.currentCount - entry.previousCount,
  }));
  const reminderVariantByBlockage: AdminOverviewData["campaignOperations"]["reminderVariantByBlockage"] = Array.from(
    reminderVariantByBlockageMap.values(),
  )
    .sort((left, right) => right.handledCount + right.snoozedCount - (left.handledCount + left.snoozedCount))
    .slice(0, 8);
  const reminderVariantScheduleSummary: AdminOverviewData["campaignOperations"]["reminderVariantScheduleSummary"] = Array.from(
    reminderVariantScheduleMap.values(),
  )
    .sort((left, right) => right.handledCount + right.snoozedCount - (left.handledCount + left.snoozedCount))
    .slice(0, 8);
  const blockageSuggestions: AdminOverviewData["campaignOperations"]["blockageSuggestions"] = blockageSummary
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 3)
    .map((entry) => ({
      state: entry.state,
      title:
        entry.state === "wallet_connection"
          ? "Lean on wallet-first CTAs"
          : entry.state === "starter_path"
            ? "Push starter-path clarity"
            : entry.state === "level"
              ? "Use XP and level-up framing"
              : entry.state === "trust"
                ? "Use verified-activity prompts"
                : entry.state === "premium_phase"
                  ? "Use premium upgrade CTAs"
                  : entry.state === "weekly_pace"
                    ? "Use recovery and return CTAs"
                    : "Keep progression CTAs simple",
      detail:
        entry.state === "wallet_connection"
          ? "The biggest blocker is wallet connection, so pack CTAs should point directly to wallet-linked actions."
          : entry.state === "starter_path"
            ? "Users are still getting stuck in the activation path, so simplify early mission steps and reinforce first wins."
            : entry.state === "level"
              ? "Users need more XP and level momentum before the pack can pay off, so keep progression CTAs front and center."
              : entry.state === "trust"
                ? "Trust is the main blocker, so emphasize verified activity, repeat engagement, and account quality steps."
                : entry.state === "premium_phase"
                  ? "This pack is entering premium-heavy territory, so CTA language should support the upgrade path."
                  : entry.state === "weekly_pace"
                    ? "This pack is slipping on weekly pace, so recovery messaging and short-term return actions matter most."
                    : "Most users are not blocked, so default mission progression CTAs are fine.",
    }));

  return {
    stats: [
      { label: "Pending Reviews", value: pendingReviews.rows[0]?.count ?? "0" },
      { label: "Monthly Premium Users", value: monthlyCount },
      { label: "Annual Premium Users", value: annualCount },
      { label: "Weekly Active Users", value: weeklyActives.rows[0]?.count ?? "0" },
    ],
    roleDirectory,
    adminDirectory,
    referralAnalytics,
    reviewQueue,
    reviewHistory,
    reviewerWorkload,
    queueMetrics,
    moderationNotifications,
    moderationNotificationHistory,
    economySettings,
    economySettingsAudit,
    upstreamLanePreview,
    rewardAssets,
    rewardPrograms,
    tokenSettlementQueue,
    tokenSettlementAudit,
    settlementAnalytics,
    questDefinitionTemplates,
    questDefinitionDirectory,
    campaignOperations: {
      templateCounts,
      sourceTemplateCounts,
      missionCtaAnalytics,
      missionCtaByTier,
      returnWindowSummary,
      returnWindowTrend,
      missionInboxHistory,
      missionReminderStatusTrend: missionReminderStatusTrendData,
      blockageSummary,
      blockageTrend,
      reminderVariantSummary,
      reminderVariantTrend,
      reminderScheduleSummary,
      reminderVariantByBlockage,
      reminderVariantScheduleSummary,
      blockageSuggestions,
      packAnalytics,
      partnerReporting,
      alerts: visibleCampaignPackAlerts,
      notifications: campaignPackNotifications,
      notificationHistory: campaignPackNotificationHistory,
      suppressions: activeCampaignPackSuppressions,
      suppressionAnalytics,
      audit: campaignPackAudit,
      packReady:
        ["Zealy bridge quest", "Galxe feeder quest", "TaskOn feeder quest"].every((label) =>
          questDefinitionTemplates.some((template) => template.label === label && template.isActive),
        ),
      activeLaneMode: economySettings.differentiateUpstreamCampaignSources ? "separate" : "bridged",
    },
    reviewInsights: {
      byVerificationType: reviewBreakdownByVerificationType,
      reviewerTypeMatrix,
    },
  };
}
