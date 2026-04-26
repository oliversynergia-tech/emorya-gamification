import { unstable_cache } from "next/cache";

import { hasDatabaseConfig } from "@/lib/config";
import { runQuery } from "@/server/db/client";

export type PublicLeaderboardPeriod = "all-time" | "weekly" | "monthly" | "referral";

export type PublicLeaderboardEntry = {
  rank: number;
  displayName: string;
  level: number;
  currentStreak: number;
  referralCode: string | null;
  score: number;
};

export type PublicLeaderboardData = {
  period: PublicLeaderboardPeriod;
  entries: PublicLeaderboardEntry[];
  scoreLabel: "XP" | "Referrals";
};

const allowedPeriods = new Set<PublicLeaderboardPeriod>(["all-time", "weekly", "monthly", "referral"]);

function sanitizeDisplayName(value: string | null | undefined) {
  return value?.trim() || "Community member";
}

export function normalizePublicLeaderboardPeriod(value: string | string[] | undefined): PublicLeaderboardPeriod {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (candidate && allowedPeriods.has(candidate as PublicLeaderboardPeriod)) {
    return candidate as PublicLeaderboardPeriod;
  }

  return "all-time";
}

const loadCachedSnapshotLeaderboard = unstable_cache(
  async (period: Exclude<PublicLeaderboardPeriod, "referral">): Promise<PublicLeaderboardData> => {
    const result = await runQuery<{
      display_name: string | null;
      level: number | string;
      current_streak: number | string;
      referral_code: string | null;
      xp: number | string;
      rank: number | string;
    }>(
      `SELECT u.display_name,
              u.level,
              u.current_streak,
              u.referral_code,
              ls.xp,
              ls.rank
       FROM leaderboard_snapshots ls
       JOIN users u ON u.id = ls.user_id
       WHERE ls.period = $1
         AND ls.snapshot_date = (
           SELECT MAX(snapshot_date)
           FROM leaderboard_snapshots
           WHERE period = $1
         )
       ORDER BY ls.rank ASC
       LIMIT 20`,
      [period],
    );

    return {
      period,
      scoreLabel: "XP",
      entries: result.rows.map((row) => ({
        rank: Number(row.rank),
        displayName: sanitizeDisplayName(row.display_name),
        level: Number(row.level),
        currentStreak: Number(row.current_streak),
        referralCode: row.referral_code,
        score: Number(row.xp),
      })),
    };
  },
  ["public-leaderboard-snapshot"],
  { revalidate: 60 },
);

const loadCachedReferralSnapshotLeaderboard = unstable_cache(
  async (): Promise<PublicLeaderboardData> => {
    const snapshotResult = await runQuery<{
      display_name: string | null;
      level: number | string;
      current_streak: number | string;
      referral_code: string | null;
      xp: number | string;
      rank: number | string;
    }>(
      `SELECT u.display_name,
              u.level,
              u.current_streak,
              u.referral_code,
              ls.xp,
              ls.rank
       FROM leaderboard_snapshots ls
       JOIN users u ON u.id = ls.user_id
       WHERE ls.period = 'referral'
         AND ls.snapshot_date = (
           SELECT MAX(snapshot_date)
           FROM leaderboard_snapshots
           WHERE period = 'referral'
         )
       ORDER BY ls.rank ASC
       LIMIT 20`,
    );

    if (snapshotResult.rows.length > 0) {
      return {
        period: "referral",
        scoreLabel: "Referrals",
        entries: snapshotResult.rows.map((row) => ({
          rank: Number(row.rank),
          displayName: sanitizeDisplayName(row.display_name),
          level: Number(row.level),
          currentStreak: Number(row.current_streak),
          referralCode: row.referral_code,
          score: Number(row.xp),
        })),
      };
    }

    const fallbackResult = await runQuery<{
      display_name: string | null;
      level: number | string;
      current_streak: number | string;
      referral_code: string | null;
      referral_count: number | string;
    }>(
      `SELECT u.display_name,
              u.level,
              u.current_streak,
              u.referral_code,
              COUNT(r.id)::int AS referral_count
       FROM referrals r
       JOIN users u ON u.id = r.referrer_user_id
       GROUP BY u.id, u.display_name, u.level, u.current_streak
       ORDER BY referral_count DESC, MIN(r.created_at) ASC
       LIMIT 20`,
    );

    return {
      period: "referral",
      scoreLabel: "Referrals",
      entries: fallbackResult.rows.map((row, index) => ({
        rank: index + 1,
        displayName: sanitizeDisplayName(row.display_name),
        level: Number(row.level),
        currentStreak: Number(row.current_streak),
        referralCode: row.referral_code,
        score: Number(row.referral_count),
      })),
    };
  },
  ["public-leaderboard-referral"],
  { revalidate: 60 },
);

export async function loadPublicLeaderboardData(period: PublicLeaderboardPeriod): Promise<PublicLeaderboardData> {
  if (!hasDatabaseConfig()) {
    return {
      period,
      scoreLabel: period === "referral" ? "Referrals" : "XP",
      entries: [],
    };
  }

  if (period === "referral") {
    return loadCachedReferralSnapshotLeaderboard();
  }

  return loadCachedSnapshotLeaderboard(period);
}
