import { randomUUID } from "crypto";

import type { QueryResultRow } from "pg";

import type { SubscriptionTier } from "@/lib/types";
import { runQuery } from "@/server/db/client";

type ReferrerRow = QueryResultRow & {
  id: string;
};

type ReferralRewardRow = QueryResultRow & {
  id: string;
  referrer_user_id: string;
  referee_user_id: string;
  referee_display_name: string;
  referee_subscription_tier: SubscriptionTier;
  referee_subscribed: boolean;
  signup_reward_xp: number;
  conversion_reward_xp: number;
  signup_rewarded_at: string | null;
  conversion_rewarded_at: string | null;
  created_at: string;
};

type ReferralSummaryRow = QueryResultRow & {
  invited_count: string;
  converted_count: string;
  reward_xp_earned: string;
  pending_conversion_xp: string;
};

type RecentReferralRow = QueryResultRow & {
  display_name: string;
  subscription_tier: SubscriptionTier;
  created_at: string;
  referee_subscribed: boolean;
};

export async function findReferrerByCode(referralCode: string) {
  const result = await runQuery<ReferrerRow>(
    `SELECT id
     FROM users
     WHERE upper(referral_code) = upper($1)
     LIMIT 1`,
    [referralCode],
  );

  return result.rows[0]?.id ?? null;
}

export async function createReferralRelationship({
  referrerUserId,
  refereeUserId,
}: {
  referrerUserId: string;
  refereeUserId: string;
}) {
  await runQuery(
    `INSERT INTO referrals (id, referrer_user_id, referee_user_id)
     VALUES ($3, $1, $2)
     ON CONFLICT (referrer_user_id, referee_user_id) DO NOTHING`,
    [referrerUserId, refereeUserId, randomUUID()],
  );
}

export async function listReferralRewardStates(referrerUserId: string) {
  const result = await runQuery<ReferralRewardRow>(
    `SELECT r.id, r.referrer_user_id, r.referee_user_id, u.display_name AS referee_display_name,
            u.subscription_tier AS referee_subscription_tier,
            (u.subscription_tier <> 'free') AS referee_subscribed,
            r.signup_reward_xp, r.conversion_reward_xp,
            r.signup_rewarded_at, r.conversion_rewarded_at, r.created_at
     FROM referrals r
     INNER JOIN users u ON u.id = r.referee_user_id
     WHERE r.referrer_user_id = $1
     ORDER BY r.created_at ASC`,
    [referrerUserId],
  );

  return result.rows;
}

export async function updateReferralRewardState({
  referralId,
  signupRewardXp,
  conversionRewardXp,
  signupRewardedAt,
  conversionRewardedAt,
  refereeSubscribed,
}: {
  referralId: string;
  signupRewardXp: number;
  conversionRewardXp: number;
  signupRewardedAt: string | null;
  conversionRewardedAt: string | null;
  refereeSubscribed: boolean;
}) {
  await runQuery(
    `UPDATE referrals
     SET signup_reward_xp = $2,
         conversion_reward_xp = $3,
         signup_rewarded_at = $4,
         conversion_rewarded_at = $5,
         referee_subscribed = $6
     WHERE id = $1`,
    [
      referralId,
      signupRewardXp,
      conversionRewardXp,
      signupRewardedAt,
      conversionRewardedAt,
      refereeSubscribed,
    ],
  );
}

export async function getReferralSummary(userId: string) {
  const [summaryResult, recentResult] = await Promise.all([
    runQuery<ReferralSummaryRow>(
      `SELECT COUNT(*)::text AS invited_count,
              COUNT(*) FILTER (WHERE referee_subscribed = TRUE)::text AS converted_count,
              COALESCE(SUM(signup_reward_xp + conversion_reward_xp), 0)::text AS reward_xp_earned,
              COALESCE(SUM(
                CASE
                  WHEN referee_subscribed = FALSE THEN GREATEST(120 - conversion_reward_xp, 0)
                  ELSE 0
                END
              ), 0)::text AS pending_conversion_xp
       FROM referrals
       WHERE referrer_user_id = $1`,
      [userId],
    ),
    runQuery<RecentReferralRow>(
      `SELECT u.display_name, u.subscription_tier, r.created_at, r.referee_subscribed
       FROM referrals r
       INNER JOIN users u ON u.id = r.referee_user_id
       WHERE r.referrer_user_id = $1
       ORDER BY r.created_at DESC
       LIMIT 4`,
      [userId],
    ),
  ]);

  const summary = summaryResult.rows[0];

  return {
    invitedCount: Number(summary?.invited_count ?? 0),
    convertedCount: Number(summary?.converted_count ?? 0),
    rewardXpEarned: Number(summary?.reward_xp_earned ?? 0),
    pendingConversionXp: Number(summary?.pending_conversion_xp ?? 0),
    recentReferrals: recentResult.rows.map((row) => ({
      displayName: row.display_name,
      tier: row.subscription_tier,
      status: row.referee_subscribed ? ("converted" as const) : ("joined" as const),
      joinedAt: row.created_at,
    })),
  };
}
