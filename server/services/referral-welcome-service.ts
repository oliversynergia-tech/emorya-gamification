import { runQuery } from "@/server/db/client";

export type ReferralWelcomeReferrer = {
  id: string;
  displayName: string;
  level: number;
  totalXp: number;
  currentStreak: number;
  avatarUrl: string | null;
  referralCode: string;
  attributionSource: string | null;
  rank: number | null;
  questsCompleted: number;
};

export type ReferralWelcomeContext = {
  userId: string;
  referredBy: string | null;
  createdAt: string;
  referrer: ReferralWelcomeReferrer | null;
};

type ReferralWelcomeUserRow = {
  id: string;
  referred_by: string | null;
  created_at: string;
};

type ReferrerRow = {
  id: string;
  display_name: string | null;
  level: number | string;
  total_xp: number | string;
  current_streak: number | string;
  avatar_url: string | null;
  referral_code: string;
  attribution_source: string | null;
};

type RankRow = {
  rank: number | string;
};

type CountRow = {
  count: string;
};

export async function getReferralWelcomeContextForUser(userId: string): Promise<ReferralWelcomeContext | null> {
  const userResult = await runQuery<ReferralWelcomeUserRow>(
    `SELECT id, referred_by, created_at::text
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );

  const user = userResult.rows[0];

  if (!user) {
    return null;
  }

  if (!user.referred_by) {
    return {
      userId: user.id,
      referredBy: null,
      createdAt: user.created_at,
      referrer: null,
    };
  }

  const [referrerResult, rankResult, questCountResult] = await Promise.all([
    runQuery<ReferrerRow>(
      `SELECT id, display_name, level, total_xp, current_streak, avatar_url, referral_code, attribution_source
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [user.referred_by],
    ),
    runQuery<RankRow>(
      `SELECT rank
       FROM leaderboard_snapshots
       WHERE user_id = $1
         AND period = 'all-time'
         AND snapshot_date = (
           SELECT MAX(snapshot_date)
           FROM leaderboard_snapshots
           WHERE period = 'all-time'
         )
       LIMIT 1`,
      [user.referred_by],
    ),
    runQuery<CountRow>(
      `SELECT COUNT(*)::text AS count
       FROM quest_completions
       WHERE user_id = $1
         AND status = 'approved'`,
      [user.referred_by],
    ),
  ]);

  const referrer = referrerResult.rows[0];

  if (!referrer) {
    return {
      userId: user.id,
      referredBy: user.referred_by,
      createdAt: user.created_at,
      referrer: null,
    };
  }

  return {
    userId: user.id,
    referredBy: user.referred_by,
    createdAt: user.created_at,
    referrer: {
      id: referrer.id,
      displayName: referrer.display_name?.trim() || "Community member",
      level: Number(referrer.level),
      totalXp: Number(referrer.total_xp),
      currentStreak: Number(referrer.current_streak),
      avatarUrl: referrer.avatar_url,
      referralCode: referrer.referral_code,
      attributionSource: referrer.attribution_source,
      rank: rankResult.rows[0] ? Number(rankResult.rows[0].rank) : null,
      questsCompleted: Number(questCountResult.rows[0]?.count ?? 0),
    },
  };
}
