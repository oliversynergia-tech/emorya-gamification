import { normalizeCampaignAttributionSource } from "../../lib/attribution-source.ts";
import { defaultEconomySettings, resolveCampaignExperienceSource } from "../../lib/economy-settings.ts";
import { getLevelProgress } from "../../lib/progression.ts";
import type { EconomySettings, SubscriptionTier, UserSnapshot } from "../../lib/types.ts";

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
    source: "taskon",
    label: "TaskOn operator",
    signupBonusXp: 15,
    monthlyConversionBonusXp: 25,
    annualConversionBonusXp: 70,
    annualDirectTokenBonus: 10,
  },
];

function applyCampaignOverride(
  source: Exclude<ReferralCampaignSource, null>,
  settings?: EconomySettings,
): ReferralCampaignIncentive {
  const resolvedSource = settings ? resolveCampaignExperienceSource(settings, source) : source;
  const base =
    referralCampaignIncentives.find((entry) => entry.source === resolvedSource) ??
    referralCampaignIncentives[0];
  const override = settings?.campaignOverrides?.[resolvedSource];

  if (!override) {
    return base;
  }

  return {
    ...base,
    signupBonusXp: override.signupBonusXp,
    monthlyConversionBonusXp: override.monthlyConversionBonusXp,
    annualConversionBonusXp: override.annualConversionBonusXp,
    annualDirectTokenBonus: override.annualDirectTokenBonus,
  };
}

export function normalizeReferralCampaignSource(source: string | null | undefined): ReferralCampaignSource {
  return normalizeCampaignAttributionSource(source);
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
  settings = defaultEconomySettings,
}: {
  subscriptionTier: SubscriptionTier;
  campaignSource: string | null | undefined;
  settings?: EconomySettings;
}) {
  const incentive = applyCampaignOverride(normalizeReferralCampaignSource(campaignSource) ?? "direct", settings);
  const signupXp = settings.referralSignupBaseXp + incentive.signupBonusXp;

  if (subscriptionTier === "annual") {
    return {
      signupXp,
      conversionXp: settings.referralAnnualConversionBaseXp + incentive.annualConversionBonusXp,
      annualDirectTokenReward: settings.directRewardsEnabled && settings.directAnnualReferralEnabled
        ? settings.annualReferralDirectTokenAmount + incentive.annualDirectTokenBonus
        : null,
      incentive,
    };
  }

  if (subscriptionTier === "monthly") {
    return {
      signupXp,
      conversionXp: settings.referralMonthlyConversionBaseXp + incentive.monthlyConversionBonusXp,
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
  settings = defaultEconomySettings,
}: {
  totalXp: number;
  level: number;
  referrals: ReferralRewardState[];
  settings?: EconomySettings;
}) {
  let nextTotalXp = totalXp;
  let nextLevel = level;

  const updates = referrals.map((referral) => {
    const targets = getReferralRewardTargets({
      subscriptionTier: referral.refereeSubscriptionTier,
      campaignSource: referral.refereeCampaignSource,
      settings,
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
