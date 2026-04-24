import { unstable_cache } from "next/cache";

import { hasDatabaseConfig } from "@/lib/config";
import { runQuery } from "@/server/db/client";

export type LandingPlatformStats = {
  totalUsers: number;
  questsCompleted: number;
  totalXpDistributed: number;
  activeStreaks: number;
};

export type LandingLeaderboardEntry = {
  rank: number;
  displayName: string;
  level: number;
  xp: number;
};

export type LandingActivityItem = {
  actor: string;
  action: string;
  detail: string;
  timeAgo: string;
};

export type PublicLandingData = {
  stats: LandingPlatformStats;
  leaderboard: LandingLeaderboardEntry[];
  activity: LandingActivityItem[];
};

function getRelativeTimeLabel(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
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

function formatActivityAction(action: string | null | undefined) {
  const normalized = action?.trim();

  if (!normalized) {
    return "made progress";
  }

  return normalized.replaceAll("-", " ");
}

function sanitizeActorName(actor: string | null | undefined) {
  const normalized = actor?.trim();

  if (!normalized) {
    return "Community member";
  }

  return normalized;
}

const getCachedPublicLandingData = unstable_cache(
  async (): Promise<PublicLandingData> => {
    const [statsResult, leaderboardResult, activityResult] = await Promise.all([
      runQuery<{
        total_users: string;
        quests_completed: string;
        total_xp_distributed: string;
        active_streaks: string;
      }>(
        `SELECT COUNT(*)::text AS total_users,
                (
                  SELECT COUNT(*)::text
                  FROM quest_completions
                  WHERE status = 'approved'
                ) AS quests_completed,
                (
                  SELECT COALESCE(SUM(total_xp), 0)::text
                  FROM users
                ) AS total_xp_distributed,
                (
                  SELECT COUNT(*)::text
                  FROM users
                  WHERE current_streak > 0
                ) AS active_streaks
         FROM users`,
      ),
      runQuery<{
        display_name: string | null;
        level: number | string;
        xp: number | string;
        rank: number | string;
      }>(
        `SELECT u.display_name,
                u.level,
                ls.xp,
                ls.rank
         FROM leaderboard_snapshots ls
         JOIN users u ON u.id = ls.user_id
         WHERE ls.period = 'all-time'
           AND ls.snapshot_date = (
             SELECT MAX(snapshot_date)
             FROM leaderboard_snapshots
             WHERE period = 'all-time'
           )
         ORDER BY ls.rank ASC
         LIMIT 10`,
      ),
      runQuery<{
        actor: string | null;
        action: string | null;
        detail: string | null;
        time_ago: string | null;
        created_at: string;
        display_name: string | null;
      }>(
        `SELECT al.metadata->>'actor' AS actor,
                al.metadata->>'action' AS action,
                al.metadata->>'detail' AS detail,
                al.metadata->>'timeAgo' AS time_ago,
                al.created_at,
                u.display_name
         FROM activity_log al
         LEFT JOIN users u ON u.id = al.user_id
         ORDER BY al.created_at DESC
         LIMIT 5`,
      ),
    ]);

    const statsRow = statsResult.rows[0];

    return {
      stats: {
        totalUsers: Number(statsRow?.total_users ?? 0),
        questsCompleted: Number(statsRow?.quests_completed ?? 0),
        totalXpDistributed: Number(statsRow?.total_xp_distributed ?? 0),
        activeStreaks: Number(statsRow?.active_streaks ?? 0),
      },
      leaderboard: leaderboardResult.rows.map((row) => ({
        rank: Number(row.rank),
        displayName: row.display_name?.trim() || "Community member",
        level: Number(row.level),
        xp: Number(row.xp),
      })),
      activity: activityResult.rows.map((row) => ({
        actor: sanitizeActorName(row.actor ?? row.display_name),
        action: formatActivityAction(row.action),
        detail: row.detail?.trim() || "made progress in Emorya",
        timeAgo: row.time_ago?.trim() || getRelativeTimeLabel(row.created_at),
      })),
    };
  },
  ["public-landing-data"],
  { revalidate: 60 },
);

export async function loadPublicLandingData(): Promise<PublicLandingData> {
  if (!hasDatabaseConfig()) {
    return {
      stats: {
        totalUsers: 0,
        questsCompleted: 0,
        totalXpDistributed: 0,
        activeStreaks: 0,
      },
      leaderboard: [],
      activity: [],
    };
  }

  return getCachedPublicLandingData();
}
