import { getLevelProgress } from "../../lib/progression.ts";
import type { SubscriptionTier, UserSnapshot } from "../../lib/types.ts";

export const REFERRAL_SIGNUP_REWARD_XP = 40;
export const REFERRAL_MONTHLY_CONVERSION_REWARD_XP = 150;
export const REFERRAL_ANNUAL_CONVERSION_REWARD_XP = 300;
export const REFERRAL_ANNUAL_DIRECT_TOKEN_REWARD = 25;

export type ReferralCampaignSource = UserSnapshot["campaignSource"];

export type ReferralCampaignIncentive = {
  source: Exclude<ReferralCampaignSource, null>;
  label: string;
  signupBonusXp: number;
  monthlyConversionBonusXp: number;
  annualConversionBonusXp: number;
  annualDirectTokenBonus: number;
};

export type ReferralRewardState = {
  id: string;
  refereeDisplayName: string;
  refereeSubscriptionTier: SubscriptionTier;
  refereeCampaignSource: ReferralCampaignSource;
  signupRewardXp: number;
  conversionRewardXp: number;
};

export const referralCampaignIncentives: ReferralCampaignIncentive[] = [
  {
    source: "direct",
    label: "Direct entrant",
    signupBonusXp: 0,
    monthlyConversionBonusXp: 0,
    annualConversionBonusXp: 0,
    annualDirectTokenBonus: 0,
  },
  {
    source: "zealy",
    label: "Zealy bridge",
    signupBonusXp: 10,
    monthlyConversionBonusXp: 20,
    annualConversionBonusXp: 40,
    annualDirectTokenBonus: 5,
  },
  {
    source: "galxe",
    label: "Galxe activation",
    signupBonusXp: 5,
    monthlyConversionBonusXp: 30,
    annualConversionBonusXp: 55,
    annualDirectTokenBonus: 7,
  },
  {
    source: "layer3",
    label: "Layer3 operator",
    signupBonusXp: 15,
    monthlyConversionBonusXp: 25,
    annualConversionBonusXp: 70,
    annualDirectTokenBonus: 10,
  },
];

export function normalizeReferralCampaignSource(source: string | null | undefined): ReferralCampaignSource {
  const normalized = source?.trim().toLowerCase() ?? "";

  if (normalized === "zealy" || normalized === "galxe" || normalized === "layer3" || normalized === "direct") {
    return normalized;
  }

  return normalized ? "direct" : null;
}

export function getReferralCampaignIncentive(source: string | null | undefined): ReferralCampaignIncentive {
  const normalized = normalizeReferralCampaignSource(source) ?? "direct";

  return (
    referralCampaignIncentives.find((entry) => entry.source === normalized) ??
    referralCampaignIncentives[0]
  );
}

export function getReferralRewardTargets({
  subscriptionTier,
  campaignSource,
}: {
  subscriptionTier: SubscriptionTier;
  campaignSource: string | null | undefined;
}) {
  const incentive = getReferralCampaignIncentive(campaignSource);
  const signupXp = REFERRAL_SIGNUP_REWARD_XP + incentive.signupBonusXp;

  if (subscriptionTier === "annual") {
    return {
      signupXp,
      conversionXp: REFERRAL_ANNUAL_CONVERSION_REWARD_XP + incentive.annualConversionBonusXp,
      annualDirectTokenReward: REFERRAL_ANNUAL_DIRECT_TOKEN_REWARD + incentive.annualDirectTokenBonus,
      incentive,
    };
  }

  if (subscriptionTier === "monthly") {
    return {
      signupXp,
      conversionXp: REFERRAL_MONTHLY_CONVERSION_REWARD_XP + incentive.monthlyConversionBonusXp,
      annualDirectTokenReward: null,
      incentive,
    };
  }

  return {
    signupXp,
    conversionXp: 0,
    annualDirectTokenReward: null,
    incentive,
  };
}

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
    const targets = getReferralRewardTargets({
      subscriptionTier: referral.refereeSubscriptionTier,
      campaignSource: referral.refereeCampaignSource,
    });
    let signupRewardXp = referral.signupRewardXp;
    let conversionRewardXp = referral.conversionRewardXp;
    let deltaXp = 0;

    if (signupRewardXp < targets.signupXp) {
      deltaXp += targets.signupXp - signupRewardXp;
      signupRewardXp = targets.signupXp;
    }

    if (conversionRewardXp < targets.conversionXp) {
      deltaXp += targets.conversionXp - conversionRewardXp;
      conversionRewardXp = targets.conversionXp;
    }

    nextTotalXp += deltaXp;
    nextLevel = getLevelProgress(nextTotalXp).level;

    return {
      id: referral.id,
      signupRewardXp,
      conversionRewardXp,
      deltaXp,
      directTokenReward: targets.annualDirectTokenReward,
      incentive: targets.incentive,
    };
  });

  return {
    totalXp: nextTotalXp,
    level: nextLevel,
    updates,
  };
}
