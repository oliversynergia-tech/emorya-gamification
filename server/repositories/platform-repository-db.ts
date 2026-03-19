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
import { getCampaignFeaturedTracks } from "@/lib/campaign-source";
import {
  getModerationAlertChannelConfig,
  getQueueAlertThresholds,
  hasDatabaseConfig,
} from "@/lib/config";
import {
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
import type {
  Achievement,
  ActivityItem,
  AdminOverviewData,
  AuthUser,
  DashboardData,
  EconomySettings,
  LeaderboardEntry,
  Quest,
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
import { syncAchievementProgressForUser } from "@/server/services/progression-service";
import {
  getReferralRewardTargets,
  referralCampaignIncentives,
} from "@/server/services/referral-rules";
import { syncReferralRewardsForReferrer } from "@/server/services/referral-service";
import { getUserProgressState } from "@/server/services/user-progress-state";
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
  recurrence: "one-time" | "daily" | "weekly";
  metadata: Record<string, unknown>;
  completion_status: "pending" | "approved" | "rejected" | null;
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
    return "Complete Starter Path";
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
  const steps = [
    {
      label: "Earn 250 XP",
      complete: progressState.totalXp >= starterPathRequirements.minXp,
      detail: `${Math.min(progressState.totalXp, starterPathRequirements.minXp)} / ${starterPathRequirements.minXp} XP`,
    },
    {
      label: "Reach Level 3",
      complete: progressState.level >= starterPathRequirements.minLevel,
      detail: `Level ${progressState.level}`,
    },
    {
      label: "Connect xPortal",
      complete: progressState.walletLinked,
      detail: progressState.walletLinked ? "Wallet linked" : "Wallet still needed",
    },
    {
      label: "Complete 3 starter quests",
      complete: progressState.starterQuestCount >= starterPathRequirements.starterQuestCount,
      detail: `${Math.min(progressState.starterQuestCount, starterPathRequirements.starterQuestCount)} / ${starterPathRequirements.starterQuestCount}`,
    },
    {
      label: "Complete 1 wellness quest",
      complete: progressState.wellnessQuestCount >= starterPathRequirements.wellnessQuestCount,
      detail: `${Math.min(progressState.wellnessQuestCount, starterPathRequirements.wellnessQuestCount)} / ${starterPathRequirements.wellnessQuestCount}`,
    },
    {
      label: "Complete 1 social quest",
      complete: progressState.socialQuestCount >= starterPathRequirements.socialQuestCount,
      detail: `${Math.min(progressState.socialQuestCount, starterPathRequirements.socialQuestCount)} / ${starterPathRequirements.socialQuestCount}`,
    },
  ];
  const completedSteps = steps.filter((step) => step.complete).length;

  return {
    complete: progressState.starterPathComplete,
    progress: steps.length > 0 ? completedSteps / steps.length : 0,
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
    referralCode: user.referral_code,
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
  const result = await runQuery<QuestRow>(
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
  );

  return buildDashboardQuestBoard({
    quests: result.rows,
    userProgressState,
    journeyState,
    settings: economySettings,
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

  const result = await runQuery<ActivityRow>(
    `SELECT al.id, al.action_type, al.created_at, u.display_name, al.metadata
     FROM activity_log al
     INNER JOIN users u ON u.id = al.user_id
     ORDER BY created_at DESC
     LIMIT 8`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    actor: row.metadata?.actor ?? row.display_name ?? "User",
    action: row.metadata?.action ?? row.action_type.replaceAll("-", " "),
    detail: row.metadata?.detail ?? "activity event",
    timeAgo: getRelativeTimeLabel(row.created_at),
  }));
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
  const campaignEconomy = getCampaignEconomyOverride(economySettings, user.campaignSource);
  const activeCampaignLane = resolveCampaignExperienceSource(economySettings, user.campaignSource);
  const featuredTracks = getCampaignFeaturedTracks(activeCampaignLane, campaignEconomy);

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
    quests,
    achievements,
    leaderboard,
    referralLeaderboard,
    activityFeed,
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
  const [pendingReviews, usersByTier, weeklyActives, referralAnalytics, roleDirectory, adminDirectory, reviewQueue, reviewHistory, reviewerWorkload, reviewBreakdownByVerificationType, reviewerTypeMatrix, economySettings, economySettingsAudit, rewardAssets, rewardPrograms, tokenSettlementQueue, tokenSettlementAudit, settlementAnalytics, questDefinitionTemplates, questDefinitionDirectory] = await Promise.all([
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
  ]);

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
    const current =
      packAnalyticsMap.get(packId) ??
      {
        packId,
        label: packLabel,
        questCount: 0,
        activeQuestCount: 0,
        bridgeCount: 0,
        feederCount: 0,
        sources: [] as ("zealy" | "galxe" | "taskon" | "direct")[],
        createdAt: quest.createdAt,
        lastUpdatedAt: quest.updatedAt,
      };
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
    packAnalyticsMap.set(packId, current);
  }
  const packAnalytics = Array.from(packAnalyticsMap.values()).sort(
    (left, right) => right.activeQuestCount - left.activeQuestCount || right.questCount - left.questCount,
  );
  templateCounts.generatedPacks = packAnalytics.length;
  templateCounts.activeGeneratedPacks = packAnalytics.filter((entry) => entry.activeQuestCount > 0).length;

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
      packAnalytics,
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
