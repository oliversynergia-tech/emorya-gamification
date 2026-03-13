import type { QueryResultRow } from "pg";

import { hasDatabaseConfig } from "@/lib/config";
import {
  buildRewardConfig,
  buildUnlockRules,
  createDefaultQuestRuntimeContext,
  inferQuestTrack,
  inferTokenEffect,
  mapQuestCadence,
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
  EvaluatedQuest,
  LeaderboardEntry,
  Quest,
  QuestCadence,
  SubscriptionTier,
  UserSnapshot,
  VerificationType,
} from "@/lib/types";
import { runQuery } from "@/server/db/client";
import { listUsersWithRoles } from "@/server/repositories/admin-repository";
import { listAdminUsers } from "@/server/repositories/admin-repository";
import {
  getCurrentAllTimeRankForUser,
  getCurrentReferralRankForUser,
  getLiveAllTimeLeaderboard,
  getLiveReferralLeaderboard,
  syncLeaderboardSnapshotsForToday,
} from "@/server/repositories/leaderboard-repository";
import {
  getPendingReviewQueue,
  getRecentReviewHistory,
  getReviewBreakdownByVerificationType,
  getReviewerTypeMatrix,
  getReviewerWorkload,
} from "@/server/repositories/quest-repository";
import { getReferralAnalytics, getReferralSummary } from "@/server/repositories/referral-repository";
import { evaluateQuest } from "@/server/services/evaluate-quest";
import { syncAchievementProgressForUser } from "@/server/services/progression-service";
import { syncReferralRewardsForReferrer } from "@/server/services/referral-service";
import { selectQuestBoard } from "@/server/services/select-quest-board";
import { getUserProgressState } from "@/server/services/user-progress-state";
import { resolveUserJourneyState } from "@/server/services/user-journey-state";

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

type QuestMetadata = Record<string, unknown>;

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
  metadata: QuestMetadata;
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

async function getUserSnapshot(user: UserRow): Promise<UserSnapshot> {
  const [connectionsResult, rankResult, referralRank, referral] = await Promise.all([
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
  ]);

  const nextLevelXp = getLevelProgress(user.total_xp).nextThreshold;

  return {
    displayName: user.display_name,
    level: user.level,
    totalXp: user.total_xp,
    currentStreak: user.current_streak,
    nextLevelXp,
    tier: user.subscription_tier,
    rank: rankResult,
    referralCode: user.referral_code,
    referral: {
      rank: referralRank,
      ...referral,
    },
    connectedAccounts: connectionsResult.rows.map((connection) => ({
      platform: connection.platform,
      connected: connection.verified,
      rewardXp: defaultConnectionRewards[connection.platform] ?? 15,
    })),
  };
}

function deriveQuestStatus(user: UserRow, quest: QuestRow): Quest["status"] {
  if (quest.completion_status === "approved") {
    return "completed";
  }

  if (quest.completion_status === "pending") {
    return "in-progress";
  }

  if (quest.completion_status === "rejected") {
    return "rejected";
  }

  return "available";
}

function buildQueueMetrics(reviewQueue: AdminOverviewData["reviewQueue"]): AdminOverviewData["queueMetrics"] {
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
  const staleCount = pendingAges.filter((age) => age >= 24 * 60).length;
  const alerts: AdminOverviewData["queueMetrics"]["alerts"] = [];

  if (staleCount > 0) {
    alerts.push({
      severity: "critical",
      title: "SLA breach in queue",
      detail: `${staleCount} submission${staleCount === 1 ? "" : "s"} have been pending for more than 24 hours.`,
    });
  }

  if (oldestPendingMinutes >= 6 * 60) {
    alerts.push({
      severity: staleCount > 0 ? "critical" : "warning",
      title: "Oldest submission is aging out",
      detail: `The oldest pending submission is ${oldestPendingMinutes} minutes old.`,
    });
  }

  if (reviewQueue.length >= 8) {
    alerts.push({
      severity: reviewQueue.length >= 15 ? "critical" : "warning",
      title: "Backlog pressure is rising",
      detail: `${reviewQueue.length} submissions are waiting for review across all verification lanes.`,
    });
  }

  if (averagePendingMinutes >= 90) {
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

function mapEvaluatedQuestToQuest({
  quest,
  evaluatedQuest,
  cadence,
}: {
  quest: QuestRow;
  evaluatedQuest: EvaluatedQuest;
  cadence: QuestCadence;
}): Quest {
  return {
    id: quest.id,
    title: quest.title,
    description: quest.description,
    category: quest.category,
    track: evaluatedQuest.track,
    cadence,
    xpReward: quest.xp_reward,
    projectedXp: evaluatedQuest.projectedReward.xp,
    tokenEffect: evaluatedQuest.projectedReward.tokenEffect,
    difficulty: quest.difficulty,
    verificationType: quest.verification_type,
    status:
      evaluatedQuest.status === "active"
        ? "available"
        : evaluatedQuest.status === "in_progress"
          ? "in-progress"
          : evaluatedQuest.status === "cooldown"
            ? "locked"
          : evaluatedQuest.status,
    lockedReason: evaluatedQuest.lockedReason,
    unlockHint: evaluatedQuest.unlockHint,
    recommended: evaluatedQuest.sortScore >= 1000,
    requiredLevel: quest.required_level,
    requiredTier: quest.required_tier,
    premiumPreview: quest.is_premium_preview,
    timebox: typeof quest.metadata?.timebox === "string" ? quest.metadata.timebox : undefined,
    targetUrl: typeof quest.metadata?.targetUrl === "string" ? quest.metadata.targetUrl : undefined,
  };
}

async function getQuestBoard(user: UserRow): Promise<Quest[]> {
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

  const userProgressState = await getUserProgressState(user.id);
  const journeyState = resolveUserJourneyState(userProgressState);
  const runtimeContext = createDefaultQuestRuntimeContext();
  const evaluatedByQuestId = new Map<
    string,
    {
      evaluatedQuest: EvaluatedQuest;
      cadence: QuestCadence;
    }
  >();

  for (const quest of result.rows) {
    const track = inferQuestTrack({
      slug: quest.slug,
      category: quest.category,
      verificationType: quest.verification_type,
      isPremiumPreview: quest.is_premium_preview,
    });
    const cadence = mapQuestCadence(quest.recurrence, quest.metadata);
    const tokenEffect = inferTokenEffect(track, quest.metadata);
    const rewardConfig = buildRewardConfig({
      baseXp: quest.xp_reward,
      tokenEffect,
      metadata: quest.metadata,
    });
    const unlockRules = buildUnlockRules({
      requiredLevel: quest.required_level,
      requiredTier: quest.required_tier,
      isPremiumPreview: quest.is_premium_preview,
      track,
      metadata: quest.metadata,
    });
    const completionStatus = deriveQuestStatus(user, quest);
    const recommended =
      (journeyState === "signed_up_free" && (track === "starter" || track === "wallet" || track === "social")) ||
      (journeyState === "activated_free" && (track === "daily" || track === "wallet" || track === "referral")) ||
      (journeyState === "reward_eligible_free" && (track === "wallet" || track === "referral" || track === "premium")) ||
      ((journeyState === "monthly_premium" || journeyState === "annual_premium") &&
        (track === "premium" || track === "referral" || track === "wallet"));

    evaluatedByQuestId.set(quest.id, {
      evaluatedQuest: evaluateQuest({
        id: quest.id,
        title: quest.title,
        track,
        completionStatus,
        rewardConfig,
        unlockRules,
        userState: userProgressState,
        runtimeContext,
        recommended,
        journeyState,
      }),
      cadence,
    });
  }

  const selectedBoard = selectQuestBoard({
    quests: Array.from(evaluatedByQuestId.values()).map((entry) => entry.evaluatedQuest),
    journeyState,
  });

  return selectedBoard.quests
    .map((selectedQuest) => {
      const quest = result.rows.find((row) => row.id === selectedQuest.id);
      const evaluated = evaluatedByQuestId.get(selectedQuest.id);

      if (!quest || !evaluated) {
        return null;
      }

      return mapEvaluatedQuestToQuest({
        quest,
        evaluatedQuest: evaluated.evaluatedQuest,
        cadence: evaluated.cadence,
      });
    })
    .filter((quest): quest is Quest => quest !== null);
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
    getUserSnapshot(dashboardUser),
    getQuestBoard(dashboardUser),
    getAchievements(userId),
    getLeaderboard(),
    getReferralLeaderboard(),
    getActivityFeed(),
  ]);

  return {
    user,
    quests,
    achievements,
    leaderboard,
    referralLeaderboard,
    activityFeed,
    premiumMoments: [
      `Level ${user.level} reached. ${getTierLabel(user.tier)} is your current tier.`,
      "Annual saves 44 euros a year and doubles every XP event.",
      `Your ${user.currentStreak}-day streak becomes safer with Annual streak freezes.`,
      "Premium quests are now driven from quest definitions in PostgreSQL.",
    ],
  };
}

export async function getAdminOverviewDataFromDb(): Promise<AdminOverviewData> {
  const [pendingReviews, usersByTier, weeklyActives, referralAnalytics, roleDirectory, adminDirectory, reviewQueue, reviewHistory, reviewerWorkload, reviewBreakdownByVerificationType, reviewerTypeMatrix] = await Promise.all([
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
  ]);

  const monthlyCount = usersByTier.rows.find((row) => row.subscription_tier === "monthly")?.count ?? "0";
  const annualCount = usersByTier.rows.find((row) => row.subscription_tier === "annual")?.count ?? "0";

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
    queueMetrics: buildQueueMetrics(reviewQueue),
    reviewInsights: {
      byVerificationType: reviewBreakdownByVerificationType,
      reviewerTypeMatrix,
    },
  };
}
