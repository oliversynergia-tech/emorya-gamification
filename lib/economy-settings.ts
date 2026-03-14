import type { EconomySettings, QuestTrack, SubscriptionTier, TokenAsset } from "./types.ts";

export const defaultEconomySettings: EconomySettings = {
  id: "default",
  payoutAsset: "EMR",
  redemptionEnabled: false,
  directRewardsEnabled: true,
  directAnnualReferralEnabled: true,
  directPremiumFlashEnabled: true,
  directAmbassadorEnabled: true,
  minimumEligibilityPoints: 100,
  pointsPerToken: 20,
  xpTierMultipliers: {
    free: 1,
    monthly: 1.25,
    annual: 1.5,
  },
  tokenTierMultipliers: {
    free: 1,
    monthly: 1.15,
    annual: 1.3,
  },
  referralSignupBaseXp: 40,
  referralMonthlyConversionBaseXp: 150,
  referralAnnualConversionBaseXp: 300,
  annualReferralDirectTokenAmount: 25,
  campaignOverrides: {
    direct: {
      signupBonusXp: 0,
      monthlyConversionBonusXp: 0,
      annualConversionBonusXp: 0,
      annualDirectTokenBonus: 0,
    },
    zealy: {
      signupBonusXp: 10,
      monthlyConversionBonusXp: 20,
      annualConversionBonusXp: 40,
      annualDirectTokenBonus: 5,
    },
    galxe: {
      signupBonusXp: 5,
      monthlyConversionBonusXp: 30,
      annualConversionBonusXp: 55,
      annualDirectTokenBonus: 7,
    },
    layer3: {
      signupBonusXp: 15,
      monthlyConversionBonusXp: 25,
      annualConversionBonusXp: 70,
      annualDirectTokenBonus: 10,
    },
  },
  updatedAt: new Date(0).toISOString(),
};

export function getXpTierMultiplier(settings: EconomySettings, tier: SubscriptionTier) {
  return settings.xpTierMultipliers[tier];
}

export function getTokenTierMultiplier(settings: EconomySettings, tier: SubscriptionTier) {
  return settings.tokenTierMultipliers[tier];
}

export function isDirectRewardAllowedForTrack({
  settings,
  track,
}: {
  settings: EconomySettings;
  track: QuestTrack;
}) {
  if (!settings.directRewardsEnabled) {
    return false;
  }

  if (track === "premium") {
    return settings.directPremiumFlashEnabled;
  }

  if (track === "ambassador" || track === "creative") {
    return settings.directAmbassadorEnabled;
  }

  return true;
}

export function buildEconomySettingsSummary(previous: EconomySettings, next: EconomySettings) {
  const changes: string[] = [];

  if (previous.payoutAsset !== next.payoutAsset) {
    changes.push(`asset ${previous.payoutAsset} -> ${next.payoutAsset}`);
  }
  if (previous.redemptionEnabled !== next.redemptionEnabled) {
    changes.push(`redemption ${next.redemptionEnabled ? "enabled" : "disabled"}`);
  }
  if (previous.pointsPerToken !== next.pointsPerToken) {
    changes.push(`points/token ${previous.pointsPerToken} -> ${next.pointsPerToken}`);
  }
  if (previous.minimumEligibilityPoints !== next.minimumEligibilityPoints) {
    changes.push(`minimum ${previous.minimumEligibilityPoints} -> ${next.minimumEligibilityPoints}`);
  }
  if (previous.xpTierMultipliers.monthly !== next.xpTierMultipliers.monthly) {
    changes.push(`monthly XP ${previous.xpTierMultipliers.monthly}x -> ${next.xpTierMultipliers.monthly}x`);
  }
  if (previous.xpTierMultipliers.annual !== next.xpTierMultipliers.annual) {
    changes.push(`annual XP ${previous.xpTierMultipliers.annual}x -> ${next.xpTierMultipliers.annual}x`);
  }
  if (previous.referralAnnualConversionBaseXp !== next.referralAnnualConversionBaseXp) {
    changes.push(`annual referral XP ${previous.referralAnnualConversionBaseXp} -> ${next.referralAnnualConversionBaseXp}`);
  }
  if (previous.annualReferralDirectTokenAmount !== next.annualReferralDirectTokenAmount) {
    changes.push(`annual referral direct reward ${previous.annualReferralDirectTokenAmount} -> ${next.annualReferralDirectTokenAmount}`);
  }
  if (JSON.stringify(previous.campaignOverrides) !== JSON.stringify(next.campaignOverrides)) {
    changes.push("campaign overrides updated");
  }

  return changes.length > 0 ? changes.join(", ") : "Economy settings saved with no effective change.";
}

export function normalizeTokenAsset(value: unknown): TokenAsset {
  return value === "EGLD" || value === "PARTNER" ? value : "EMR";
}
