import { createActivityLogEntry, getUserProgressById, updateUserProgressById } from "@/server/repositories/progression-repository";
import {
  findReferrerByCode,
  getReferralSummary,
  listReferralRewardStates,
  updateReferralRewardState,
} from "@/server/repositories/referral-repository";
import { getActiveEconomySettings as getEconomySettings } from "@/server/repositories/economy-settings-repository";
import { findPreferredRewardProgramByAssetSymbol } from "@/server/repositories/reward-program-repository";
import { createClaimedTokenRedemption } from "@/server/repositories/token-redemption-repository";
import { calculateReferralRewardState, normalizeReferralCampaignSource } from "@/server/services/referral-rules";

export async function resolveReferrerUserId(referralCode?: string | null) {
  const normalized = referralCode?.trim();

  if (!normalized) {
    return null;
  }

  return findReferrerByCode(normalized);
}

export async function syncReferralRewardsForReferrer(referrerUserId: string) {
  const [referrer, referrals] = await Promise.all([
    getUserProgressById(referrerUserId),
    listReferralRewardStates(referrerUserId),
  ]);

  if (!referrer || referrals.length === 0) {
    return;
  }

  const economySettings = await getEconomySettings();
  const activeRewardProgram = await findPreferredRewardProgramByAssetSymbol(economySettings.payoutAsset);
  const rewardState = calculateReferralRewardState({
    totalXp: referrer.total_xp,
    level: referrer.level,
    referrals: referrals.map((referral) => ({
      id: referral.id,
      refereeDisplayName: referral.referee_display_name,
      refereeSubscriptionTier: referral.referee_subscription_tier,
      refereeCampaignSource: normalizeReferralCampaignSource(referral.referee_attribution_source),
      signupRewardXp: referral.signup_reward_xp,
      conversionRewardXp: referral.conversion_reward_xp,
    })),
    settings: economySettings,
  });

  for (const referral of referrals) {
    const update = rewardState.updates.find((entry) => entry.id === referral.id);

    if (!update) {
      continue;
    }

    const signupRewardedAt =
      update.signupRewardXp > referral.signup_reward_xp
        ? new Date().toISOString()
        : referral.signup_rewarded_at;
    const conversionRewardedAt =
      update.conversionRewardXp > referral.conversion_reward_xp
        ? new Date().toISOString()
        : referral.conversion_rewarded_at;
    const annualDirectTokenRewardedAt =
      (update.directTokenReward ?? 0) > Number(referral.annual_direct_token_amount ?? 0)
        ? new Date().toISOString()
        : referral.annual_direct_token_rewarded_at;

    if (update.signupRewardXp > referral.signup_reward_xp) {
      // TODO: Auto-trigger the referral milestone share prompt for the referrer when signup confirmation UX is ready.
      await createActivityLogEntry({
        userId: referrerUserId,
        actionType: "referral-signup-reward",
        xpEarned: update.signupRewardXp - referral.signup_reward_xp,
        metadata: {
          actor: referrer.display_name,
          action: "earned a referral reward",
          detail: `${referral.referee_display_name} joined with your code`,
          rewardType: "signup",
          referee: referral.referee_display_name,
          campaignSource: referral.referee_attribution_source ?? "direct",
        },
      });
    }

    if (update.conversionRewardXp > referral.conversion_reward_xp) {
      await createActivityLogEntry({
        userId: referrerUserId,
        actionType: "referral-conversion-reward",
        xpEarned: update.conversionRewardXp - referral.conversion_reward_xp,
        metadata: {
          actor: referrer.display_name,
          action: "earned a conversion reward",
          detail: `${referral.referee_display_name} upgraded and triggered the premium referral bonus`,
          rewardType: "conversion",
          referee: referral.referee_display_name,
          campaignSource: referral.referee_attribution_source ?? "direct",
        },
      });
    }

    if (
      economySettings.directRewardQueueEnabled &&
      (update.directTokenReward ?? 0) > Number(referral.annual_direct_token_amount ?? 0)
    ) {
      await createClaimedTokenRedemption({
        userId: referrerUserId,
        asset: economySettings.payoutAsset,
        rewardAssetId: activeRewardProgram?.rewardAssetId ?? null,
        rewardProgramId: activeRewardProgram?.id ?? null,
        tokenAmount: update.directTokenReward ?? 0,
        source: "annual-referral-direct",
        metadata: {
          referralId: referral.id,
          referee: referral.referee_display_name,
          campaignSource: referral.referee_attribution_source ?? "direct",
        },
      });

      await createActivityLogEntry({
        userId: referrerUserId,
        actionType: "referral-direct-token-claimed",
        xpEarned: 0,
        metadata: {
          actor: referrer.display_name,
          action: "claimed an annual referral token reward",
          detail: `${referral.referee_display_name} triggered a direct ${economySettings.payoutAsset} payout`,
          rewardType: "annual-direct-token",
          referee: referral.referee_display_name,
          campaignSource: referral.referee_attribution_source ?? "direct",
        },
      });
    }

    await updateReferralRewardState({
      referralId: referral.id,
      signupRewardXp: update.signupRewardXp,
      conversionRewardXp: update.conversionRewardXp,
      annualDirectTokenAmount: update.directTokenReward ?? Number(referral.annual_direct_token_amount ?? 0),
      signupRewardedAt,
      conversionRewardedAt,
      annualDirectTokenRewardedAt,
      refereeSubscribed: referral.referee_subscribed,
    });
  }

  if (rewardState.totalXp !== referrer.total_xp || rewardState.level !== referrer.level) {
    await updateUserProgressById({
      userId: referrerUserId,
      totalXp: rewardState.totalXp,
      level: rewardState.level,
      currentStreak: referrer.current_streak,
      longestStreak: referrer.longest_streak,
    });
  }
}

export async function getReferralSnapshot(userId: string) {
  await syncReferralRewardsForReferrer(userId);
  return getReferralSummary(userId);
}
