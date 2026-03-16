import type { CampaignSource, EconomySettings, QuestTrack, SubscriptionTier, TokenAsset } from "./types.ts";

export const defaultEconomySettings: EconomySettings = {
  id: "default",
  payoutAsset: "EMR",
  payoutMode: "manual",
  redemptionEnabled: false,
  settlementProcessingEnabled: true,
  directRewardQueueEnabled: true,
  settlementNotesRequired: false,
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
      questXpMultiplierBonus: 0,
      eligibilityPointsMultiplierBonus: 0,
      tokenYieldMultiplierBonus: 0,
      minimumEligibilityPointsOffset: 0,
      directTokenRewardBonus: 0,
    },
    zealy: {
      signupBonusXp: 10,
      monthlyConversionBonusXp: 20,
      annualConversionBonusXp: 40,
      annualDirectTokenBonus: 5,
      questXpMultiplierBonus: 0.05,
      eligibilityPointsMultiplierBonus: 0.1,
      tokenYieldMultiplierBonus: 0.05,
      minimumEligibilityPointsOffset: -10,
      directTokenRewardBonus: 1,
    },
    galxe: {
      signupBonusXp: 5,
      monthlyConversionBonusXp: 30,
      annualConversionBonusXp: 55,
      annualDirectTokenBonus: 7,
      questXpMultiplierBonus: 0.03,
      eligibilityPointsMultiplierBonus: 0.12,
      tokenYieldMultiplierBonus: 0.08,
      minimumEligibilityPointsOffset: -5,
      directTokenRewardBonus: 2,
    },
    layer3: {
      signupBonusXp: 15,
      monthlyConversionBonusXp: 25,
      annualConversionBonusXp: 70,
      annualDirectTokenBonus: 10,
      questXpMultiplierBonus: 0.08,
      eligibilityPointsMultiplierBonus: 0.15,
      tokenYieldMultiplierBonus: 0.1,
      minimumEligibilityPointsOffset: -15,
      directTokenRewardBonus: 2,
    },
  },
  updatedAt: new Date(0).toISOString(),
};

export function getCampaignEconomyOverride(
  settings: EconomySettings,
  source: CampaignSource | null | undefined,
) {
  return settings.campaignOverrides[source ?? "direct"] ?? settings.campaignOverrides.direct;
}

export function getXpTierMultiplier(
  settings: EconomySettings,
  tier: SubscriptionTier,
  source?: CampaignSource | null,
) {
  const override = getCampaignEconomyOverride(settings, source);
  return settings.xpTierMultipliers[tier] + override.questXpMultiplierBonus;
}

export function getTokenTierMultiplier(
  settings: EconomySettings,
  tier: SubscriptionTier,
  source?: CampaignSource | null,
) {
  const override = getCampaignEconomyOverride(settings, source);
  return settings.tokenTierMultipliers[tier] + override.tokenYieldMultiplierBonus;
}

export function getMinimumEligibilityPoints(
  settings: EconomySettings,
  source?: CampaignSource | null,
) {
  const override = getCampaignEconomyOverride(settings, source);
  return Math.max(settings.minimumEligibilityPoints + override.minimumEligibilityPointsOffset, 1);
}

export function applyEligibilityPointsMultiplier(
  basePoints: number,
  settings: EconomySettings,
  source?: CampaignSource | null,
) {
  const override = getCampaignEconomyOverride(settings, source);
  const multiplier = 1 + override.eligibilityPointsMultiplierBonus;
  return Math.max(Math.round(basePoints * multiplier), 0);
}

export function applyDirectTokenRewardBonus(
  amount: number,
  settings: EconomySettings,
  source?: CampaignSource | null,
) {
  const override = getCampaignEconomyOverride(settings, source);
  return Math.max(amount + override.directTokenRewardBonus, 0);
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
  if (previous.payoutMode !== next.payoutMode) {
    changes.push(`payout mode ${previous.payoutMode} -> ${next.payoutMode}`);
  }
  if (previous.redemptionEnabled !== next.redemptionEnabled) {
    changes.push(`redemption ${next.redemptionEnabled ? "enabled" : "disabled"}`);
  }
  if (previous.settlementProcessingEnabled !== next.settlementProcessingEnabled) {
    changes.push(`settlement processing ${next.settlementProcessingEnabled ? "enabled" : "disabled"}`);
  }
  if (previous.directRewardQueueEnabled !== next.directRewardQueueEnabled) {
    changes.push(`direct reward queue ${next.directRewardQueueEnabled ? "enabled" : "disabled"}`);
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
  return typeof value === "string" && value.trim() ? value.trim().toUpperCase() : "EMR";
}
