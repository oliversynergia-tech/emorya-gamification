import { unstable_cache } from "next/cache";

import { hasDatabaseConfig } from "@/lib/config";
import { runQuery } from "@/server/db/client";

export type PublicProfileAchievement = {
  name: string;
  description: string;
  category: string;
  progress: number;
  earnedAt: string;
};

export type PublicProfileLeaderboardRank = {
  rank: number;
  xp: number;
} | null;

export type PublicProfileData = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  referralCode: string;
  createdAt: string;
  completedQuests: number;
  achievements: PublicProfileAchievement[];
  leaderboardRank: PublicProfileLeaderboardRank;
};

type PublicProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  level: number | string;
  total_xp: number | string;
  current_streak: number | string;
  longest_streak: number | string;
  referral_code: string;
  created_at: string;
};

type PublicProfileAchievementRow = {
  name: string;
  description: string;
  category: string;
  progress: number | string;
  earned_at: string;
};

type PublicProfileLeaderboardRow = {
  rank: number | string;
  xp: number | string;
};

type PublicProfileCompletionRow = {
  completed_quests: number | string;
};

function sanitizeDisplayName(value: string | null | undefined) {
  return value?.trim() || "Community member";
}

function normalizeReferralCode(code: string) {
  return code.trim().toUpperCase();
}

const loadCachedPublicProfileByReferralCode = unstable_cache(
  async (referralCode: string): Promise<PublicProfileData | null> => {
    const normalizedCode = normalizeReferralCode(referralCode);
    const userResult = await runQuery<PublicProfileRow>(
      `SELECT u.id,
              u.display_name,
              u.avatar_url,
              u.level,
              u.total_xp,
              u.current_streak,
              u.longest_streak,
              u.referral_code,
              u.created_at
       FROM users u
       WHERE upper(u.referral_code) = upper($1)
       LIMIT 1`,
      [normalizedCode],
    );

    const user = userResult.rows[0];

    if (!user) {
      return null;
    }

    const [achievementsResult, leaderboardResult, completedQuestsResult] = await Promise.all([
      runQuery<PublicProfileAchievementRow>(
        `SELECT a.name,
                a.description,
                a.category,
                ua.progress,
                ua.earned_at
         FROM user_achievements ua
         JOIN achievements a ON a.id = ua.achievement_id
         WHERE ua.user_id = $1
           AND ua.earned_at IS NOT NULL
         ORDER BY ua.earned_at DESC`,
        [user.id],
      ),
      runQuery<PublicProfileLeaderboardRow>(
        `SELECT rank, xp
         FROM leaderboard_snapshots
         WHERE user_id = $1
           AND period = 'all-time'
           AND snapshot_date = (
             SELECT MAX(snapshot_date)
             FROM leaderboard_snapshots
             WHERE period = 'all-time'
           )
         LIMIT 1`,
        [user.id],
      ),
      runQuery<PublicProfileCompletionRow>(
        `SELECT COUNT(*)::int AS completed_quests
         FROM quest_completions
         WHERE user_id = $1
           AND status = 'approved'`,
        [user.id],
      ),
    ]);

    const leaderboardRow = leaderboardResult.rows[0];
    const completionRow = completedQuestsResult.rows[0];

    return {
      id: user.id,
      displayName: sanitizeDisplayName(user.display_name),
      avatarUrl: user.avatar_url,
      level: Number(user.level),
      totalXp: Number(user.total_xp),
      currentStreak: Number(user.current_streak),
      longestStreak: Number(user.longest_streak),
      referralCode: user.referral_code,
      createdAt: user.created_at,
      completedQuests: Number(completionRow?.completed_quests ?? 0),
      achievements: achievementsResult.rows.map((achievement) => ({
        name: achievement.name,
        description: achievement.description,
        category: achievement.category,
        progress: Number(achievement.progress),
        earnedAt: achievement.earned_at,
      })),
      leaderboardRank: leaderboardRow
        ? {
            rank: Number(leaderboardRow.rank),
            xp: Number(leaderboardRow.xp),
          }
        : null,
    };
  },
  ["public-profile-data"],
  { revalidate: 300 },
);

export async function getPublicProfileByReferralCode(referralCode: string): Promise<PublicProfileData | null> {
  if (!hasDatabaseConfig()) {
    return null;
  }

  const normalizedCode = normalizeReferralCode(referralCode);

  if (!normalizedCode) {
    return null;
  }

  return loadCachedPublicProfileByReferralCode(normalizedCode);
}
