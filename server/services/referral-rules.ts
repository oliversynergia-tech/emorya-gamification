import { getLevelProgress } from "../../lib/progression.ts";

export const REFERRAL_SIGNUP_REWARD_XP = 40;
export const REFERRAL_CONVERSION_REWARD_XP = 120;

export type ReferralRewardState = {
  id: string;
  refereeDisplayName: string;
  refereeSubscribed: boolean;
  signupRewardXp: number;
  conversionRewardXp: number;
};

export function calculateReferralRewardState({
  totalXp,
  level,
  referrals,
}: {
  totalXp: number;
  level: number;
  referrals: ReferralRewardState[];
}) {
  let nextTotalXp = totalXp;
  let nextLevel = level;

  const updates = referrals.map((referral) => {
    let signupRewardXp = referral.signupRewardXp;
    let conversionRewardXp = referral.conversionRewardXp;
    let deltaXp = 0;

    if (signupRewardXp < REFERRAL_SIGNUP_REWARD_XP) {
      deltaXp += REFERRAL_SIGNUP_REWARD_XP - signupRewardXp;
      signupRewardXp = REFERRAL_SIGNUP_REWARD_XP;
    }

    if (referral.refereeSubscribed && conversionRewardXp < REFERRAL_CONVERSION_REWARD_XP) {
      deltaXp += REFERRAL_CONVERSION_REWARD_XP - conversionRewardXp;
      conversionRewardXp = REFERRAL_CONVERSION_REWARD_XP;
    }

    nextTotalXp += deltaXp;
    nextLevel = getLevelProgress(nextTotalXp).level;

    return {
      id: referral.id,
      signupRewardXp,
      conversionRewardXp,
      deltaXp,
    };
  });

  return {
    totalXp: nextTotalXp,
    level: nextLevel,
    updates,
  };
}
