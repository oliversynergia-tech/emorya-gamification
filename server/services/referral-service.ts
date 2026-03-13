import { getLevelProgress } from "@/lib/progression";
import { createActivityLogEntry, getUserProgressById, updateUserProgressById } from "@/server/repositories/progression-repository";
import {
  findReferrerByCode,
  getReferralSummary,
  listReferralRewardStates,
  updateReferralRewardState,
} from "@/server/repositories/referral-repository";

const REFERRAL_SIGNUP_REWARD_XP = 40;
const REFERRAL_CONVERSION_REWARD_XP = 120;

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

  let totalXp = referrer.total_xp;
  let level = referrer.level;

  for (const referral of referrals) {
    let signupRewardXp = referral.signup_reward_xp;
    let conversionRewardXp = referral.conversion_reward_xp;
    let signupRewardedAt = referral.signup_rewarded_at;
    let conversionRewardedAt = referral.conversion_rewarded_at;

    if (signupRewardXp < REFERRAL_SIGNUP_REWARD_XP) {
      const deltaXp = REFERRAL_SIGNUP_REWARD_XP - signupRewardXp;
      totalXp += deltaXp;
      level = getLevelProgress(totalXp).level;
      signupRewardXp = REFERRAL_SIGNUP_REWARD_XP;
      signupRewardedAt = new Date().toISOString();

      await createActivityLogEntry({
        userId: referrerUserId,
        actionType: "referral-signup-reward",
        xpEarned: deltaXp,
        metadata: {
          actor: referrer.display_name,
          action: "earned a referral reward",
          detail: `${referral.referee_display_name} joined with your code`,
          rewardType: "signup",
          referee: referral.referee_display_name,
        },
      });
    }

    if (referral.referee_subscribed && conversionRewardXp < REFERRAL_CONVERSION_REWARD_XP) {
      const deltaXp = REFERRAL_CONVERSION_REWARD_XP - conversionRewardXp;
      totalXp += deltaXp;
      level = getLevelProgress(totalXp).level;
      conversionRewardXp = REFERRAL_CONVERSION_REWARD_XP;
      conversionRewardedAt = new Date().toISOString();

      await createActivityLogEntry({
        userId: referrerUserId,
        actionType: "referral-conversion-reward",
        xpEarned: deltaXp,
        metadata: {
          actor: referrer.display_name,
          action: "earned a conversion reward",
          detail: `${referral.referee_display_name} upgraded and triggered the premium referral bonus`,
          rewardType: "conversion",
          referee: referral.referee_display_name,
        },
      });
    }

    await updateReferralRewardState({
      referralId: referral.id,
      signupRewardXp,
      conversionRewardXp,
      signupRewardedAt,
      conversionRewardedAt,
      refereeSubscribed: referral.referee_subscribed,
    });
  }

  if (totalXp !== referrer.total_xp || level !== referrer.level) {
    await updateUserProgressById({
      userId: referrerUserId,
      totalXp,
      level,
      currentStreak: referrer.current_streak,
      longestStreak: referrer.longest_streak,
    });
  }
}

export async function getReferralSnapshot(userId: string) {
  await syncReferralRewardsForReferrer(userId);
  return getReferralSummary(userId);
}
