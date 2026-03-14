import { randomUUID } from "crypto";

import type { QueryResultRow } from "pg";

import type { SubscriptionTier } from "@/lib/types";
import { runQuery } from "@/server/db/client";
import { getActiveEconomySettings } from "@/server/repositories/economy-settings-repository";
import { getReferralRewardTargets, normalizeReferralCampaignSource } from "@/server/services/referral-rules";

type ReferrerRow = QueryResultRow & {
  id: string;
};

type ReferralRewardRow = QueryResultRow & {
  id: string;
  referrer_user_id: string;
  referee_user_id: string;
  referee_display_name: string;
  referee_subscription_tier: SubscriptionTier;
  referee_attribution_source: string | null;
  referee_subscribed: boolean;
  signup_reward_xp: number;
  conversion_reward_xp: number;
  signup_rewarded_at: string | null;
  conversion_rewarded_at: string | null;
  created_at: string;
};

type RecentReferralRow = QueryResultRow & {
  display_name: string;
  subscription_tier: SubscriptionTier;
  attribution_source: string | null;
  created_at: string;
  referee_subscribed: boolean;
};

type ReferralAnalyticsSummaryRow = QueryResultRow & {
  invited_count: string;
  converted_count: string;
  reward_xp_earned: string;
  pending_conversion_xp: string;
};

type ReferralTopReferrerRow = QueryResultRow & {
  display_name: string;
  subscription_tier: SubscriptionTier;
  invited_count: string;
  converted_count: string;
  reward_xp_earned: string;
};

type ReferralSourceBreakdownRow = QueryResultRow & {
  source: string | null;
  invited_count: string;
  converted_count: string;
};

type ReferralConversionWindowRow = QueryResultRow & {
  label: string;
  count: string;
};

type ReferralAnalyticsRewardRow = QueryResultRow & {
  referee_subscription_tier: SubscriptionTier;
  referee_attribution_source: string | null;
  conversion_reward_xp: number;
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
            u.attribution_source AS referee_attribution_source,
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
  const economySettings = await getActiveEconomySettings();
  const [rewardStates, recentResult] = await Promise.all([
    listReferralRewardStates(userId),
    runQuery<RecentReferralRow>(
      `SELECT u.display_name, u.subscription_tier, u.attribution_source, r.created_at, r.referee_subscribed
       FROM referrals r
       INNER JOIN users u ON u.id = r.referee_user_id
       WHERE r.referrer_user_id = $1
       ORDER BY r.created_at DESC
       LIMIT 4`,
      [userId],
    ),
  ]);

  return {
    invitedCount: rewardStates.length,
    convertedCount: rewardStates.filter((row) => row.referee_subscribed).length,
    rewardXpEarned: rewardStates.reduce((sum, row) => sum + row.signup_reward_xp + row.conversion_reward_xp, 0),
    pendingConversionXp: rewardStates.reduce((sum, row) => {
      const targets = getReferralRewardTargets({
        subscriptionTier: row.referee_subscription_tier,
        campaignSource: row.referee_attribution_source,
        settings: economySettings,
      });

      return sum + Math.max(targets.conversionXp - row.conversion_reward_xp, 0);
    }, 0),
    recentReferrals: recentResult.rows.map((row) => ({
      displayName: row.display_name,
      tier: row.subscription_tier,
      status: row.referee_subscribed ? ("converted" as const) : ("joined" as const),
      joinedAt: row.created_at,
      source: normalizeReferralCampaignSource(row.attribution_source),
    })),
  };
}

export async function getReferralAnalytics() {
  const economySettings = await getActiveEconomySettings();
  const [summaryResult, topReferrersResult, sourceBreakdownResult, conversionWindowResult, rewardRowsResult] = await Promise.all([
    runQuery<ReferralAnalyticsSummaryRow>(
      `SELECT COUNT(*)::text AS invited_count,
              COUNT(*) FILTER (WHERE r.referee_subscribed = TRUE)::text AS converted_count,
              COALESCE(SUM(r.signup_reward_xp + r.conversion_reward_xp), 0)::text AS reward_xp_earned,
              '0'::text AS pending_conversion_xp
       FROM referrals r`,
    ),
    runQuery<ReferralTopReferrerRow>(
      `SELECT u.display_name,
              u.subscription_tier,
              COUNT(r.id)::text AS invited_count,
              COUNT(*) FILTER (WHERE r.referee_subscribed = TRUE)::text AS converted_count,
              COALESCE(SUM(r.signup_reward_xp + r.conversion_reward_xp), 0)::text AS reward_xp_earned
       FROM users u
       INNER JOIN referrals r ON r.referrer_user_id = u.id
       GROUP BY u.id, u.display_name, u.subscription_tier, u.created_at
       ORDER BY COALESCE(SUM(r.signup_reward_xp + r.conversion_reward_xp), 0) DESC,
                COUNT(*) FILTER (WHERE r.referee_subscribed = TRUE) DESC,
                u.created_at ASC
      LIMIT 5`,
    ),
    runQuery<ReferralSourceBreakdownRow>(
      `SELECT COALESCE(NULLIF(TRIM(LOWER(u.attribution_source)), ''), 'unknown') AS source,
              COUNT(r.id)::text AS invited_count,
              COUNT(*) FILTER (WHERE r.referee_subscribed = TRUE)::text AS converted_count
       FROM referrals r
       INNER JOIN users u ON u.id = r.referee_user_id
       GROUP BY source
       ORDER BY COUNT(r.id) DESC, source ASC`,
    ),
    runQuery<ReferralConversionWindowRow>(
      `WITH windows AS (
         SELECT CASE
                  WHEN r.conversion_rewarded_at IS NULL THEN 'Pending conversion'
                  WHEN r.conversion_rewarded_at <= r.created_at + INTERVAL '7 days' THEN 'Converted in 7d'
                  WHEN r.conversion_rewarded_at <= r.created_at + INTERVAL '30 days' THEN 'Converted in 30d'
                  ELSE 'Converted after 30d'
                END AS label,
                COUNT(*)::text AS count
         FROM referrals r
         GROUP BY 1
       )
       SELECT label, count
       FROM windows
       ORDER BY CASE label
         WHEN 'Converted in 7d' THEN 1
         WHEN 'Converted in 30d' THEN 2
         WHEN 'Converted after 30d' THEN 3
         ELSE 4
      END`,
    ),
    runQuery<ReferralAnalyticsRewardRow>(
      `SELECT referee_user.subscription_tier AS referee_subscription_tier,
              referee_user.attribution_source AS referee_attribution_source,
              r.conversion_reward_xp
       FROM referrals r
       INNER JOIN users referee_user ON referee_user.id = r.referee_user_id`,
    ),
  ]);

  const summary = summaryResult.rows[0];
  const invitedCount = Number(summary?.invited_count ?? 0);
  const convertedCount = Number(summary?.converted_count ?? 0);

  const pendingConversionXp = rewardRowsResult.rows.reduce((sum, row) => {
    const targets = getReferralRewardTargets({
      subscriptionTier: row.referee_subscription_tier,
      campaignSource: row.referee_attribution_source,
      settings: economySettings,
    });

    return sum + Math.max(targets.conversionXp - Number(row.conversion_reward_xp), 0);
  }, 0);

  return {
    invitedCount,
    convertedCount,
    conversionRate: invitedCount > 0 ? convertedCount / invitedCount : 0,
    rewardXpEarned: Number(summary?.reward_xp_earned ?? 0),
    pendingConversionXp,
    sourceBreakdown: sourceBreakdownResult.rows.map((row) => ({
      source: row.source ?? "unknown",
      invitedCount: Number(row.invited_count),
      convertedCount: Number(row.converted_count),
    })),
    conversionWindows: conversionWindowResult.rows.map((row) => ({
      label: row.label,
      count: Number(row.count),
    })),
    topReferrers: topReferrersResult.rows.map((row) => ({
      displayName: row.display_name,
      tier: row.subscription_tier,
      invitedCount: Number(row.invited_count),
      convertedCount: Number(row.converted_count),
      rewardXpEarned: Number(row.reward_xp_earned),
    })),
  };
}
