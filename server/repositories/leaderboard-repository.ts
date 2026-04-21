import { randomUUID } from "crypto";

import type { QueryResultRow } from "pg";

import type { LeaderboardEntry, SubscriptionTier } from "@/lib/types";
import { runQuery } from "@/server/db/client";
import { mapLeaderboardDelta } from "@/server/repositories/leaderboard-rules";

type CurrentRankRow = QueryResultRow & {
  rank: number;
};

type LiveLeaderboardRow = QueryResultRow & {
  user_id: string;
  rank: number;
  previous_rank: number | null;
  display_name: string;
  level: number;
  xp: number;
  subscription_tier: SubscriptionTier;
  badge_count: number;
};

type SnapshotSourceRow = QueryResultRow & {
  user_id: string;
  xp: number;
  rank: number;
};

type SnapshotPeriod = "all-time" | "referral" | "weekly" | "monthly";

function getSnapshotDate(snapshotDate?: string) {
  return snapshotDate ?? new Date().toISOString().slice(0, 10);
}

async function getSnapshotSource(period: SnapshotPeriod, snapshotDate?: string) {
  if (period === "referral") {
    return runQuery<SnapshotSourceRow>(
      `SELECT u.id AS user_id,
              COALESCE(SUM(r.signup_reward_xp + r.conversion_reward_xp), 0)::int AS xp,
              RANK() OVER (
                ORDER BY COALESCE(SUM(r.signup_reward_xp + r.conversion_reward_xp), 0) DESC,
                         COUNT(*) FILTER (WHERE r.referee_subscribed = TRUE) DESC,
                         u.created_at ASC
              ) AS rank
       FROM users u
       LEFT JOIN referrals r ON r.referrer_user_id = u.id
       GROUP BY u.id, u.created_at`,
    );
  }

  if (period === "weekly" || period === "monthly") {
    const interval = period === "weekly" ? "week" : "month";
    const anchorDate = snapshotDate ? "$1::date" : "CURRENT_DATE";

    return runQuery<SnapshotSourceRow>(
      `SELECT u.id AS user_id,
              COALESCE(SUM(al.xp_earned), 0)::int AS xp,
              RANK() OVER (
                ORDER BY COALESCE(SUM(al.xp_earned), 0) DESC,
                         u.total_xp DESC,
                         u.level DESC,
                         u.created_at ASC
              ) AS rank
       FROM users u
       LEFT JOIN activity_log al
         ON al.user_id = u.id
        AND al.created_at >= DATE_TRUNC('${interval}', ${anchorDate})
        AND al.created_at < DATE_TRUNC('${interval}', ${anchorDate}) + INTERVAL '1 ${interval}'
       GROUP BY u.id, u.total_xp, u.level, u.created_at`,
      snapshotDate ? [snapshotDate] : [],
    );
  }

  return runQuery<SnapshotSourceRow>(
    `SELECT u.id AS user_id,
            u.total_xp AS xp,
            RANK() OVER (ORDER BY u.total_xp DESC, u.level DESC, u.created_at ASC) AS rank
     FROM users u`,
  );
}

export async function syncLeaderboardSnapshot({
  period,
  snapshotDate,
}: {
  period: SnapshotPeriod;
  snapshotDate?: string;
}) {
  const source = await getSnapshotSource(period, snapshotDate);
  const resolvedSnapshotDate = getSnapshotDate(snapshotDate);

  for (const row of source.rows) {
    await runQuery(
      `INSERT INTO leaderboard_snapshots (id, user_id, period, xp, rank, snapshot_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, period, snapshot_date)
       DO UPDATE SET xp = EXCLUDED.xp, rank = EXCLUDED.rank`,
      [randomUUID(), row.user_id, period, row.xp, row.rank, resolvedSnapshotDate],
    );
  }
}

export async function syncLeaderboardSnapshotsForToday() {
  const today = getSnapshotDate();

  await Promise.all([
    syncLeaderboardSnapshot({ period: "all-time", snapshotDate: today }),
    syncLeaderboardSnapshot({ period: "referral", snapshotDate: today }),
    syncLeaderboardSnapshot({ period: "weekly", snapshotDate: today }),
    syncLeaderboardSnapshot({ period: "monthly", snapshotDate: today }),
  ]);
}

export async function getCurrentAllTimeRankForUser(userId: string) {
  const result = await runQuery<CurrentRankRow>(
    `WITH ranked_users AS (
       SELECT u.id,
              RANK() OVER (ORDER BY u.total_xp DESC, u.level DESC, u.created_at ASC) AS rank
       FROM users u
     )
     SELECT rank
     FROM ranked_users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );

  return result.rows[0]?.rank ?? 0;
}

export async function getCurrentReferralRankForUser(userId: string) {
  const result = await runQuery<CurrentRankRow>(
    `WITH ranked_referrers AS (
       SELECT u.id,
              RANK() OVER (
                ORDER BY COALESCE(SUM(r.signup_reward_xp + r.conversion_reward_xp), 0) DESC,
                         COUNT(*) FILTER (WHERE r.referee_subscribed = TRUE) DESC,
                         u.created_at ASC
              ) AS rank
       FROM users u
       LEFT JOIN referrals r ON r.referrer_user_id = u.id
       GROUP BY u.id, u.created_at
     )
     SELECT rank
     FROM ranked_referrers
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );

  return result.rows[0]?.rank ?? 0;
}

export async function getLiveAllTimeLeaderboard(limit = 12): Promise<LeaderboardEntry[]> {
  const result = await runQuery<LiveLeaderboardRow>(
    `WITH current_leaderboard AS (
       SELECT u.id AS user_id,
              RANK() OVER (ORDER BY u.total_xp DESC, u.level DESC, u.created_at ASC) AS rank,
              u.display_name,
              u.level,
              u.total_xp AS xp,
              u.subscription_tier,
              u.created_at
       FROM users u
     ),
     latest_previous_snapshot AS (
       SELECT DISTINCT ON (ls.user_id) ls.user_id, ls.rank
       FROM leaderboard_snapshots ls
       WHERE ls.period = 'all-time'
         AND ls.snapshot_date < CURRENT_DATE
       ORDER BY ls.user_id, ls.snapshot_date DESC
     )
     SELECT cl.user_id,
            cl.rank,
            lps.rank AS previous_rank,
            cl.display_name,
            cl.level,
            cl.xp,
            cl.subscription_tier,
            COUNT(ua.achievement_id)::int AS badge_count
     FROM current_leaderboard cl
     LEFT JOIN latest_previous_snapshot lps ON lps.user_id = cl.user_id
     LEFT JOIN user_achievements ua ON ua.user_id = cl.user_id AND ua.earned_at IS NOT NULL
     GROUP BY cl.user_id, cl.rank, lps.rank, cl.display_name, cl.level, cl.xp, cl.subscription_tier, cl.created_at
     ORDER BY cl.rank ASC, cl.created_at ASC
     LIMIT $1`,
    [limit],
  );

  return result.rows.map((entry) => ({
    userId: entry.user_id,
    rank: entry.rank,
    displayName: entry.display_name,
    level: entry.level,
    xp: entry.xp,
    badges: entry.badge_count,
    tier: entry.subscription_tier,
    delta: mapLeaderboardDelta(entry.rank, entry.previous_rank),
  }));
}

export async function getLiveReferralLeaderboard(limit = 8): Promise<LeaderboardEntry[]> {
  const result = await runQuery<LiveLeaderboardRow>(
    `WITH current_referral_leaderboard AS (
       SELECT u.id AS user_id,
              RANK() OVER (
                ORDER BY COALESCE(SUM(r.signup_reward_xp + r.conversion_reward_xp), 0) DESC,
                         COUNT(*) FILTER (WHERE r.referee_subscribed = TRUE) DESC,
                         u.created_at ASC
              ) AS rank,
              u.display_name,
              u.level,
              COALESCE(SUM(r.signup_reward_xp + r.conversion_reward_xp), 0)::int AS xp,
              u.subscription_tier,
              u.created_at
       FROM users u
       LEFT JOIN referrals r ON r.referrer_user_id = u.id
       GROUP BY u.id, u.display_name, u.level, u.subscription_tier, u.created_at
     ),
     latest_previous_snapshot AS (
       SELECT DISTINCT ON (ls.user_id) ls.user_id, ls.rank
       FROM leaderboard_snapshots ls
       WHERE ls.period = 'referral'
         AND ls.snapshot_date < CURRENT_DATE
       ORDER BY ls.user_id, ls.snapshot_date DESC
     )
     SELECT crl.user_id,
            crl.rank,
            lps.rank AS previous_rank,
            crl.display_name,
            crl.level,
            crl.xp,
            crl.subscription_tier,
            COUNT(ua.achievement_id)::int AS badge_count
     FROM current_referral_leaderboard crl
     LEFT JOIN latest_previous_snapshot lps ON lps.user_id = crl.user_id
     LEFT JOIN user_achievements ua ON ua.user_id = crl.user_id AND ua.earned_at IS NOT NULL
     GROUP BY crl.user_id, crl.rank, lps.rank, crl.display_name, crl.level, crl.xp, crl.subscription_tier, crl.created_at
     ORDER BY crl.rank ASC, crl.created_at ASC
     LIMIT $1`,
    [limit],
  );

  return result.rows.map((entry) => ({
    userId: entry.user_id,
    rank: entry.rank,
    displayName: entry.display_name,
    level: entry.level,
    xp: entry.xp,
    badges: entry.badge_count,
    tier: entry.subscription_tier,
    delta: mapLeaderboardDelta(entry.rank, entry.previous_rank),
  }));
}

export async function getLiveActivityLeaderboard(period: Extract<SnapshotPeriod, "weekly" | "monthly">, limit = 8): Promise<LeaderboardEntry[]> {
  const interval = period === "weekly" ? "week" : "month";
  const result = await runQuery<LiveLeaderboardRow>(
    `WITH current_activity_leaderboard AS (
       SELECT u.id AS user_id,
              RANK() OVER (
                ORDER BY COALESCE(SUM(al.xp_earned), 0) DESC,
                         u.total_xp DESC,
                         u.level DESC,
                         u.created_at ASC
              ) AS rank,
              u.display_name,
              u.level,
              COALESCE(SUM(al.xp_earned), 0)::int AS xp,
              u.subscription_tier,
              u.created_at
       FROM users u
       LEFT JOIN activity_log al
         ON al.user_id = u.id
        AND al.created_at >= DATE_TRUNC('${interval}', NOW())
       GROUP BY u.id, u.display_name, u.level, u.total_xp, u.subscription_tier, u.created_at
     ),
     latest_previous_snapshot AS (
       SELECT DISTINCT ON (ls.user_id) ls.user_id, ls.rank
       FROM leaderboard_snapshots ls
       WHERE ls.period = $2
         AND ls.snapshot_date < CURRENT_DATE
       ORDER BY ls.user_id, ls.snapshot_date DESC
     )
     SELECT cal.user_id,
            cal.rank,
            lps.rank AS previous_rank,
            cal.display_name,
            cal.level,
            cal.xp,
            cal.subscription_tier,
            COUNT(ua.achievement_id)::int AS badge_count
     FROM current_activity_leaderboard cal
     LEFT JOIN latest_previous_snapshot lps ON lps.user_id = cal.user_id
     LEFT JOIN user_achievements ua ON ua.user_id = cal.user_id AND ua.earned_at IS NOT NULL
     GROUP BY cal.user_id, cal.rank, lps.rank, cal.display_name, cal.level, cal.xp, cal.subscription_tier, cal.created_at
     ORDER BY cal.rank ASC, cal.created_at ASC
     LIMIT $1`,
    [limit, period],
  );

  return result.rows.map((entry) => ({
    userId: entry.user_id,
    rank: entry.rank,
    displayName: entry.display_name,
    level: entry.level,
    xp: entry.xp,
    badges: entry.badge_count,
    tier: entry.subscription_tier,
    delta: mapLeaderboardDelta(entry.rank, entry.previous_rank),
  }));
}
