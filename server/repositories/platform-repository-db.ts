import type { QueryResultRow } from "pg";

import { hasDatabaseConfig } from "@/lib/config";
import { getLevelProgress, getTierLabel } from "@/lib/progression";
import type {
  Achievement,
  ActivityItem,
  AdminOverviewData,
  AuthUser,
  DashboardData,
  LeaderboardEntry,
  Quest,
  ReviewQueueItem,
  SubscriptionTier,
  UserSnapshot,
  VerificationType,
} from "@/lib/types";
import { runQuery } from "@/server/db/client";
import { getReferralSummary } from "@/server/repositories/referral-repository";
import { syncReferralRewardsForReferrer } from "@/server/services/referral-service";

type UserRow = QueryResultRow & {
  id: string;
  display_name: string;
  level: number;
  total_xp: number;
  current_streak: number;
  subscription_tier: SubscriptionTier;
  referral_code: string;
};

type SocialConnectionRow = QueryResultRow & {
  platform: string;
  verified: boolean;
};

type QuestMetadata = {
  timebox?: string;
  targetUrl?: string;
};

type QuestRow = QueryResultRow & {
  id: string;
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
  progress: number | string;
  earned_at: string | null;
};

type LeaderboardRow = QueryResultRow & {
  rank: number;
  display_name: string;
  level: number;
  xp: number;
  subscription_tier: SubscriptionTier;
  badge_count: number;
};

type ActivityRow = QueryResultRow & {
  id: string;
  action_type: string;
  created_at: string;
  display_name: string | null;
  metadata: { actor?: string; action?: string; detail?: string; timeAgo?: string };
};

type ReviewQueueRow = QueryResultRow & {
  id: string;
  quest_id: string;
  quest_title: string;
  display_name: string;
  email: string | null;
  verification_type: VerificationType;
  submission_data: Record<string, string | number | boolean | null>;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

const defaultConnectionRewards: Record<string, number> = {
  X: 15,
  Telegram: 15,
  Discord: 15,
  TikTok: 20,
  Instagram: 20,
  CoinMarketCap: 20,
};

const tierRank: Record<SubscriptionTier, number> = {
  free: 0,
  monthly: 1,
  annual: 2,
};

export function isDatabaseEnabled() {
  return hasDatabaseConfig();
}

function inferLeaderboardDelta(rank: number) {
  if (rank === 1) {
    return 2;
  }

  if (rank === 2) {
    return -1;
  }

  if (rank === 3) {
    return 1;
  }

  return rank % 2 === 0 ? 3 : -2;
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
    `SELECT id, display_name, level, total_xp, current_streak, subscription_tier, referral_code
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
  const [connectionsResult, rankResult, referral] = await Promise.all([
    runQuery<SocialConnectionRow>(
      `SELECT platform, verified
       FROM social_connections
       WHERE user_id = $1
       ORDER BY platform ASC`,
      [user.id],
    ),
    runQuery<{ rank: number }>(
      `SELECT rank
       FROM leaderboard_snapshots
       WHERE user_id = $1 AND period = 'all-time'
       ORDER BY snapshot_date DESC
       LIMIT 1`,
      [user.id],
    ),
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
    rank: rankResult.rows[0]?.rank ?? 0,
    referralCode: user.referral_code,
    referral,
    connectedAccounts: connectionsResult.rows.map((connection) => ({
      platform: connection.platform,
      connected: connection.verified,
      rewardXp: defaultConnectionRewards[connection.platform] ?? 15,
    })),
  };
}

function canAccessQuest(user: UserRow, quest: Pick<QuestRow, "required_level" | "required_tier">) {
  return user.level >= quest.required_level && tierRank[user.subscription_tier] >= tierRank[quest.required_tier];
}

function deriveQuestStatus(user: UserRow, quest: QuestRow): Quest["status"] {
  if (!canAccessQuest(user, quest)) {
    return "locked";
  }

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

async function getQuestBoard(user: UserRow): Promise<Quest[]> {
  const result = await runQuery<QuestRow>(
    `SELECT q.id, q.title, q.description, q.category, q.xp_reward, q.difficulty, q.verification_type,
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

  return result.rows.map((quest) => ({
    id: quest.id,
    title: quest.title,
    description: quest.description,
    category: quest.category,
    xpReward: quest.xp_reward,
    difficulty: quest.difficulty,
    verificationType: quest.verification_type,
    status: deriveQuestStatus(user, quest),
    requiredLevel: quest.required_level,
    requiredTier: quest.required_tier,
    premiumPreview: quest.is_premium_preview,
    timebox: quest.metadata?.timebox,
    targetUrl: quest.metadata?.targetUrl,
  }));
}

async function getAchievements(userId: string): Promise<Achievement[]> {
  const result = await runQuery<AchievementRow>(
    `SELECT a.slug, a.name, a.description, ua.progress, ua.earned_at
     FROM user_achievements ua
     INNER JOIN achievements a ON a.id = ua.achievement_id
     WHERE ua.user_id = $1
     ORDER BY a.name ASC`,
    [userId],
  );

  return result.rows.map((achievement) => ({
    id: achievement.slug,
    name: achievement.name,
    description: achievement.description,
    progress: Number(achievement.progress),
    unlocked: Boolean(achievement.earned_at),
  }));
}

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const result = await runQuery<LeaderboardRow>(
    `SELECT ls.rank, u.display_name, u.level, ls.xp, u.subscription_tier,
            COUNT(ua.achievement_id)::int AS badge_count
     FROM leaderboard_snapshots ls
     INNER JOIN users u ON u.id = ls.user_id
     LEFT JOIN user_achievements ua ON ua.user_id = u.id AND ua.earned_at IS NOT NULL
     WHERE ls.period = 'all-time'
     GROUP BY ls.rank, u.display_name, u.level, ls.xp, u.subscription_tier
     ORDER BY ls.rank ASC
     LIMIT 12`,
  );

  return result.rows.map((entry) => ({
    rank: entry.rank,
    displayName: entry.display_name,
    level: entry.level,
    xp: entry.xp,
    badges: entry.badge_count,
    tier: entry.subscription_tier,
    delta: inferLeaderboardDelta(entry.rank),
  }));
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

async function getReviewQueue(): Promise<ReviewQueueItem[]> {
  const result = await runQuery<ReviewQueueRow>(
    `SELECT qc.id, qc.quest_id, q.title AS quest_title, u.display_name, u.email,
            q.verification_type, qc.submission_data, qc.status, qc.created_at
     FROM quest_completions qc
     INNER JOIN quest_definitions q ON q.id = qc.quest_id
     INNER JOIN users u ON u.id = qc.user_id
     WHERE qc.status = 'pending'
     ORDER BY qc.created_at ASC
     LIMIT 25`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    questId: row.quest_id,
    questTitle: row.quest_title,
    userDisplayName: row.display_name,
    userEmail: row.email,
    verificationType: row.verification_type,
    submissionData: row.submission_data,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function getDashboardDataFromDb(currentUser?: AuthUser | null): Promise<DashboardData> {
  const userId = await resolveDashboardUserId(currentUser);

  if (!userId) {
    throw new Error("No users found in the database. Run the seed file first.");
  }

  await syncReferralRewardsForReferrer(userId);
  const dashboardUser = await getDashboardUser(userId);

  const [user, quests, achievements, leaderboard, activityFeed] = await Promise.all([
    getUserSnapshot(dashboardUser),
    getQuestBoard(dashboardUser),
    getAchievements(userId),
    getLeaderboard(),
    getActivityFeed(),
  ]);

  return {
    user,
    quests,
    achievements,
    leaderboard,
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
  const [pendingReviews, usersByTier, weeklyActives, reviewQueue] = await Promise.all([
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
    getReviewQueue(),
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
    reviewQueue,
  };
}
