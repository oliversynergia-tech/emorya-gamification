import type { QueryResultRow } from "pg";

import {
  activationPathCompletionQuestSlug,
  ambassadorMinimumLevel,
  ambassadorReferralRequirement,
  firstTokenEligibilityLevel,
  inferQuestTrack,
} from "../../lib/progression-rules.ts";
import { normalizeCampaignAttributionSource } from "../../lib/attribution-source.ts";
import type { QuestCategory, TrustScoreBand, UserProgressState } from "../../lib/types.ts";

type ProgressUserRow = QueryResultRow & {
  id: string;
  level: number;
  total_xp: number;
  current_streak: number;
  subscription_tier: UserProgressState["subscriptionTier"];
  attribution_source: string | null;
};

type WalletIdentityRow = QueryResultRow & {
  created_at: string;
};

type SocialRow = QueryResultRow & {
  platform: string;
};

type ReferralCountsRow = QueryResultRow & {
  successful_referrals: string;
  monthly_premium_referrals: string;
  annual_premium_referrals: string;
};

type WeeklyXpRow = QueryResultRow & {
  weekly_xp: string;
};

type CompletedQuestRow = QueryResultRow & {
  slug: string;
  category: QuestCategory;
  verification_type: string;
  required_level: number;
  is_premium_preview: boolean;
  completed_at: string | Date | null;
};

type DeriveUserProgressStateInput = {
  userId: string;
  level: number;
  totalXp: number;
  currentStreak: number;
  weeklyXp: number;
  walletLinked: boolean;
  walletAgeDays: number;
  subscriptionTier: UserProgressState["subscriptionTier"];
  connectedSocials: string[];
  successfulReferralCount: number;
  monthlyPremiumReferralCount: number;
  annualPremiumReferralCount: number;
  approvedQuests: Array<{
    slug: string;
    category: QuestCategory;
    verificationType: string;
    requiredLevel: number;
    isPremiumPreview: boolean;
    completedAt?: string | Date | null;
  }>;
  campaignSource: string | null;
  ambassadorActive?: boolean;
};

function getUtcStartOfTodayIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function normalizeCampaignSource(source: string | null): UserProgressState["campaignSource"] {
  return normalizeCampaignAttributionSource(source);
}

function isWellnessQuest(category: QuestCategory, slug: string) {
  return category === "app" || /steps|wellness|movement|hydration|workout|recovery/.test(slug);
}

function getTrustScoreBand({
  walletLinked,
  subscriptionTier,
  totalXp,
  successfulReferralCount,
  connectedSocialCount,
}: {
  walletLinked: boolean;
  subscriptionTier: UserProgressState["subscriptionTier"];
  totalXp: number;
  successfulReferralCount: number;
  connectedSocialCount: number;
}): TrustScoreBand {
  if (
    subscriptionTier === "annual" ||
    (walletLinked && totalXp >= 1500) ||
    successfulReferralCount >= 5
  ) {
    return "high";
  }

  if (
    walletLinked ||
    subscriptionTier === "monthly" ||
    totalXp >= 700 ||
    connectedSocialCount >= 2
  ) {
    return "medium";
  }

  return "low";
}

export function deriveUserProgressState(input: DeriveUserProgressStateInput): UserProgressState {
  const connectedSocialCount = input.connectedSocials.length;
  const starterQuestCount =
    input.approvedQuests.filter((quest) => {
      const track = inferQuestTrack({
        slug: quest.slug,
        category: quest.category,
        verificationType: quest.verificationType,
        isPremiumPreview: quest.isPremiumPreview,
      });

      return track === "starter" || quest.requiredLevel <= 3;
    }).length +
    (input.walletLinked ? 1 : 0) +
    (connectedSocialCount > 0 ? 1 : 0);

  const wellnessQuestCount = input.approvedQuests.filter((quest) => isWellnessQuest(quest.category, quest.slug)).length;
  const socialQuestCount =
    input.approvedQuests.filter((quest) => quest.category === "social").length +
    (connectedSocialCount > 0 ? 1 : 0);
  const approvedQuestCount = input.approvedQuests.length;
  const completedQuestSlugs = input.approvedQuests.map((quest) => quest.slug);
  const utcStartOfToday = Date.parse(getUtcStartOfTodayIso());
  const completedQuestSlugsToday = input.approvedQuests
    .filter((quest) => {
      if (!quest.completedAt) {
        return false;
      }

      const completedAt =
        quest.completedAt instanceof Date
          ? quest.completedAt.getTime()
          : Date.parse(quest.completedAt);
      return Number.isFinite(completedAt) && completedAt >= utcStartOfToday;
    })
    .map((quest) => quest.slug);
  const trustScoreBand = getTrustScoreBand({
    walletLinked: input.walletLinked,
    subscriptionTier: input.subscriptionTier,
    totalXp: input.totalXp,
    successfulReferralCount: input.successfulReferralCount,
    connectedSocialCount,
  });

  const starterPathComplete = completedQuestSlugs.includes(activationPathCompletionQuestSlug);

  const rewardEligible =
    input.level >= firstTokenEligibilityLevel &&
    starterPathComplete &&
    input.walletLinked &&
    trustScoreBand !== "low";

  const ambassadorCandidate =
    input.level >= ambassadorMinimumLevel &&
    starterPathComplete &&
    input.walletLinked &&
    input.successfulReferralCount >= ambassadorReferralRequirement &&
    trustScoreBand !== "low";

  return {
    userId: input.userId,
    level: input.level,
    totalXp: input.totalXp,
    currentStreak: input.currentStreak,
    weeklyXp: input.weeklyXp,
    starterPathComplete,
    rewardEligible,
    walletLinked: input.walletLinked,
    walletAgeDays: input.walletAgeDays,
    trustScoreBand,
    subscriptionTier: input.subscriptionTier,
    connectedSocials: input.connectedSocials,
    successfulReferralCount: input.successfulReferralCount,
    monthlyPremiumReferralCount: input.monthlyPremiumReferralCount,
    annualPremiumReferralCount: input.annualPremiumReferralCount,
    connectedSocialCount,
    approvedQuestCount,
    starterQuestCount,
    wellnessQuestCount,
    socialQuestCount,
    completedQuestSlugs,
    completedQuestSlugsToday,
    ambassadorCandidate,
    ambassadorActive: input.ambassadorActive ?? false,
    campaignSource: normalizeCampaignSource(input.campaignSource),
  };
}

export async function getUserProgressState(userId: string): Promise<UserProgressState> {
  const { runQuery } = await import("../db/client.ts");
  const [userResult, walletResult, socialsResult, referralResult, weeklyXpResult, completedQuestResult] = await Promise.all([
    runQuery<ProgressUserRow>(
      `SELECT id, level, total_xp, current_streak, subscription_tier, attribution_source
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId],
    ),
    runQuery<WalletIdentityRow>(
      `SELECT created_at
       FROM user_identities
       WHERE user_id = $1
         AND provider = 'multiversx'
         AND status = 'active'
       ORDER BY created_at ASC
       LIMIT 1`,
      [userId],
    ),
    runQuery<SocialRow>(
      `SELECT platform
       FROM social_connections
       WHERE user_id = $1
         AND verified = TRUE
       ORDER BY platform ASC`,
      [userId],
    ),
    runQuery<ReferralCountsRow>(
      `SELECT COUNT(*)::text AS successful_referrals,
              COUNT(*) FILTER (WHERE referee_subscribed = TRUE AND referee_user.subscription_tier = 'monthly')::text AS monthly_premium_referrals,
              COUNT(*) FILTER (WHERE referee_subscribed = TRUE AND referee_user.subscription_tier = 'annual')::text AS annual_premium_referrals
       FROM referrals
       INNER JOIN users referee_user ON referee_user.id = referrals.referee_user_id
       WHERE referrer_user_id = $1`,
      [userId],
    ),
    runQuery<WeeklyXpRow>(
      `SELECT COALESCE(SUM(xp_earned), 0)::text AS weekly_xp
       FROM activity_log
       WHERE user_id = $1
         AND created_at >= NOW() - INTERVAL '7 days'`,
      [userId],
    ),
    runQuery<CompletedQuestRow>(
      `SELECT q.slug, q.category, q.verification_type, q.required_level, q.is_premium_preview, qc.completed_at
       FROM quest_completions qc
       INNER JOIN quest_definitions q ON q.id = qc.quest_id
       WHERE qc.user_id = $1
         AND qc.status = 'approved'
       ORDER BY qc.completed_at ASC NULLS LAST, qc.created_at ASC`,
      [userId],
    ),
  ]);

  const user = userResult.rows[0];

  if (!user) {
    throw new Error(`User not found for progress state: ${userId}`);
  }

  const earliestWalletLink = walletResult.rows[0]?.created_at ?? null;
  const walletAgeDays = earliestWalletLink
    ? Math.max(Math.floor((Date.now() - new Date(earliestWalletLink).getTime()) / 86400000), 0)
    : 0;

  return deriveUserProgressState({
    userId: user.id,
    level: user.level,
    totalXp: user.total_xp,
    currentStreak: user.current_streak,
    weeklyXp: Number(weeklyXpResult.rows[0]?.weekly_xp ?? 0),
    walletLinked: Boolean(earliestWalletLink),
    walletAgeDays,
    subscriptionTier: user.subscription_tier,
    connectedSocials: socialsResult.rows.map((row) => row.platform),
    successfulReferralCount: Number(referralResult.rows[0]?.successful_referrals ?? 0),
    monthlyPremiumReferralCount: Number(referralResult.rows[0]?.monthly_premium_referrals ?? 0),
    annualPremiumReferralCount: Number(referralResult.rows[0]?.annual_premium_referrals ?? 0),
    approvedQuests: completedQuestResult.rows.map((quest) => ({
      slug: quest.slug,
      category: quest.category,
      verificationType: quest.verification_type,
      requiredLevel: quest.required_level,
      isPremiumPreview: quest.is_premium_preview,
      completedAt: quest.completed_at,
    })),
    campaignSource: user.attribution_source,
  });
}
