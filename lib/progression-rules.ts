import type {
  CompletionRuleGroup,
  QuestCadence,
  QuestTrack,
  QuestRuntimeContext,
  RewardConfig,
  SubscriptionTier,
  TokenEffect,
  UnlockRuleGroup,
} from "@/lib/types";

export const starterPathRequirements = {
  minXp: 250,
  minLevel: 3,
  starterQuestCount: 3,
  wellnessQuestCount: 1,
  socialQuestCount: 1,
} as const;

export const firstTokenEligibilityLevel = 5;
export const ambassadorMinimumLevel = 10;
export const ambassadorReferralRequirement = 10;

export const rulesEngineTierMultipliers: Record<SubscriptionTier, number> = {
  free: 1,
  monthly: 1.25,
  annual: 1.5,
};

export function getRulesEngineTierMultiplier(tier: SubscriptionTier) {
  return rulesEngineTierMultipliers[tier];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asRewardConfig(value: unknown): RewardConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const xp = asRecord(record.xp);

  if (typeof xp.base !== "number") {
    return null;
  }

  const tokenEffect =
    record.tokenEffect === "none" ||
    record.tokenEffect === "eligibility_progress" ||
    record.tokenEffect === "token_bonus" ||
    record.tokenEffect === "direct_token_reward"
      ? record.tokenEffect
      : undefined;
  const tokenEligibility = asRecord(record.tokenEligibility);
  const tokenBonus = asRecord(record.tokenBonus);
  const directTokenReward = asRecord(record.directTokenReward);
  const referralBonus = asRecord(record.referralBonus);

  return {
    xp: {
      base: xp.base,
      premiumMultiplierEligible: xp.premiumMultiplierEligible !== false,
    },
    tokenEffect,
    tokenEligibility:
      typeof tokenEligibility.progressPoints === "number"
        ? { progressPoints: tokenEligibility.progressPoints }
        : undefined,
    tokenBonus:
      typeof tokenBonus.multiplier === "number"
        ? { multiplier: tokenBonus.multiplier }
        : undefined,
    directTokenReward:
      typeof directTokenReward.amount === "number"
        ? {
            asset:
              directTokenReward.asset === "EGLD" || directTokenReward.asset === "PARTNER"
                ? directTokenReward.asset
                : "EMR",
            amount: directTokenReward.amount,
            requiresWallet: directTokenReward.requiresWallet !== false,
          }
        : undefined,
    referralBonus:
      typeof referralBonus.xpBonus === "number"
        ? {
            xpBonus: referralBonus.xpBonus,
            tokenBonusMultiplier:
              typeof referralBonus.tokenBonusMultiplier === "number"
                ? referralBonus.tokenBonusMultiplier
                : undefined,
          }
        : undefined,
  };
}

function asUnlockRuleGroup(value: unknown): UnlockRuleGroup | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  return {
    all: Array.isArray(record.all) ? (record.all as UnlockRuleGroup["all"]) : undefined,
    any: Array.isArray(record.any) ? (record.any as UnlockRuleGroup["any"]) : undefined,
  };
}

function inferTrackFromCategory(category: string): QuestTrack {
  switch (category) {
    case "social":
      return "social";
    case "staking":
      return "wallet";
    case "referral":
      return "referral";
    case "creative":
      return "creative";
    case "learn":
      return "quiz";
    default:
      return "daily";
  }
}

export function inferQuestTrack({
  slug,
  category,
  verificationType,
  isPremiumPreview,
  metadata,
}: {
  slug: string;
  category: string;
  verificationType: string;
  isPremiumPreview: boolean;
  metadata?: Record<string, unknown>;
}): QuestTrack {
  if (
    metadata?.track === "starter" ||
    metadata?.track === "daily" ||
    metadata?.track === "social" ||
    metadata?.track === "wallet" ||
    metadata?.track === "referral" ||
    metadata?.track === "premium" ||
    metadata?.track === "ambassador" ||
    metadata?.track === "quiz" ||
    metadata?.track === "creative" ||
    metadata?.track === "campaign"
  ) {
    return metadata.track;
  }

  if (slug.includes("ambassador") || slug.includes("creator-brief")) {
    return "ambassador";
  }

  if (slug.includes("premium") || isPremiumPreview) {
    return "premium";
  }

  if (slug.includes("referral")) {
    return "referral";
  }

  if (slug.includes("wallet") || verificationType === "wallet-check") {
    return "wallet";
  }

  if (slug.includes("welcome") || slug.includes("starter") || slug.includes("connect-xportal")) {
    return "starter";
  }

  if (verificationType === "quiz") {
    return "quiz";
  }

  return inferTrackFromCategory(category);
}

export function mapQuestCadence(recurrence: "one-time" | "daily" | "weekly", metadata: Record<string, unknown>): QuestCadence {
  if (
    metadata.cadence === "one_time" ||
    metadata.cadence === "daily" ||
    metadata.cadence === "weekly" ||
    metadata.cadence === "campaign_limited"
  ) {
    return metadata.cadence;
  }

  if (metadata.campaignLimited === true || metadata.timebox) {
    return "campaign_limited";
  }

  switch (recurrence) {
    case "one-time":
      return "one_time";
    default:
      return recurrence;
  }
}

export function inferTokenEffect(track: QuestTrack, metadata: Record<string, unknown>): TokenEffect {
  const rewardConfig = asRecord(metadata.rewardConfig);
  const configured = rewardConfig.tokenEffect ?? metadata.tokenEffect;

  if (
    configured === "none" ||
    configured === "eligibility_progress" ||
    configured === "token_bonus" ||
    configured === "direct_token_reward"
  ) {
    return configured;
  }

  if (track === "wallet" || track === "premium" || track === "ambassador") {
    return "eligibility_progress";
  }

  if (track === "referral" && metadata.directTokenReward) {
    return "direct_token_reward";
  }

  return "none";
}

export function buildRewardConfig({
  baseXp,
  tierEligible = true,
  tokenEffect,
  metadata,
}: {
  baseXp: number;
  tierEligible?: boolean;
  tokenEffect: TokenEffect;
  metadata: Record<string, unknown>;
}): RewardConfig {
  const configuredReward = asRewardConfig(metadata.rewardConfig);

  if (configuredReward) {
    return configuredReward;
  }

  const directToken = asRecord(metadata.directTokenReward);
  const tokenBonus = asRecord(metadata.tokenBonus);
  const tokenEligibility = asRecord(metadata.tokenEligibility);

  return {
    xp: {
      base: baseXp,
      premiumMultiplierEligible: tierEligible,
    },
    tokenEffect,
    tokenEligibility:
      tokenEffect === "eligibility_progress"
        ? {
            progressPoints:
              typeof tokenEligibility.progressPoints === "number"
                ? tokenEligibility.progressPoints
                : Math.max(Math.round(baseXp / 2), 10),
          }
        : undefined,
    tokenBonus:
      tokenEffect === "token_bonus"
        ? {
            multiplier:
              typeof tokenBonus.multiplier === "number"
                ? tokenBonus.multiplier
                : 1.15,
          }
        : undefined,
    directTokenReward:
      tokenEffect === "direct_token_reward"
        ? {
            asset:
              directToken.asset === "EGLD" || directToken.asset === "PARTNER"
                ? directToken.asset
                : "EMR",
            amount: typeof directToken.amount === "number" ? directToken.amount : 10,
            requiresWallet: directToken.requiresWallet !== false,
          }
        : undefined,
  };
}

export function buildUnlockRules({
  requiredLevel,
  requiredTier,
  isPremiumPreview,
  track,
  metadata,
}: {
  requiredLevel: number;
  requiredTier: SubscriptionTier;
  isPremiumPreview: boolean;
  track: QuestTrack;
  metadata: Record<string, unknown>;
}): UnlockRuleGroup {
  const configuredRules = asUnlockRuleGroup(metadata.unlockRules);

  if (configuredRules) {
    return configuredRules;
  }

  const all = [];

  if (requiredLevel > 1) {
    all.push({ type: "min_level", value: requiredLevel } as const);
  }

  if (requiredTier === "monthly" || requiredTier === "annual") {
    all.push({ type: "subscription_tier", value: requiredTier } as const);
  }

  if (track === "wallet" || metadata.walletCheckMode === "linked-wallet-ownership") {
    all.push({ type: "wallet_linked", value: true } as const);
  }

  if (track === "premium" && !isPremiumPreview && requiredTier === "free") {
    all.push({ type: "starter_path_complete", value: true } as const);
  }

  if (track === "ambassador") {
    all.push({ type: "ambassador_candidate", value: true } as const);
  }

  if (typeof metadata.requiredConnectedSocialCount === "number") {
    all.push({ type: "connected_social_count", value: metadata.requiredConnectedSocialCount } as const);
  }

  if (typeof metadata.requiredWalletAgeDays === "number") {
    all.push({ type: "wallet_age_days", value: metadata.requiredWalletAgeDays } as const);
  }

  if (typeof metadata.requiredSuccessfulReferrals === "number") {
    all.push({ type: "successful_referrals", value: metadata.requiredSuccessfulReferrals } as const);
  }

  return {
    all,
  };
}

export function buildCompletionRules(metadata: Record<string, unknown>): CompletionRuleGroup {
  const linkedSocials = asStringArray(metadata.requiresLinkedSocial);

  return {
    cooldownHours: typeof metadata.cooldownHours === "number" ? metadata.cooldownHours : undefined,
    requiresReview: metadata.requiresReview === true,
    requiresWalletOwnership: metadata.walletCheckMode === "linked-wallet-ownership" || metadata.requiresWalletOwnership === true,
    requiresLinkedSocial: linkedSocials.length > 0 ? linkedSocials : undefined,
    quizPassScore: typeof metadata.passScore === "number" ? metadata.passScore : undefined,
    minWalletAgeDays: typeof metadata.requiredWalletAgeDays === "number" ? metadata.requiredWalletAgeDays : undefined,
    campaignWindowRequired: metadata.campaignLimited === true,
  };
}

export function createDefaultQuestRuntimeContext(now = new Date()): QuestRuntimeContext {
  return {
    now: now.toISOString(),
    activeCampaignSlugs: [],
    flashRewardDay: false,
    referralBoostWeek: false,
  };
}
