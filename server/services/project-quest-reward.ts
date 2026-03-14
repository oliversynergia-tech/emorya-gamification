import { defaultEconomySettings, isDirectRewardAllowedForTrack } from "../../lib/economy-settings.ts";
import { applyCampaignDirectRewardBonus, getRulesEngineTierMultiplier } from "../../lib/progression-rules.ts";
import type { CampaignSource, EconomySettings, QuestRuntimeContext, QuestTrack, RewardConfig, SubscriptionTier, TokenEffect } from "../../lib/types.ts";

export function projectQuestReward({
  rewardConfig,
  track,
  subscriptionTier,
  runtimeContext,
  walletLinked,
  campaignSource,
  settings = defaultEconomySettings,
}: {
  rewardConfig: RewardConfig;
  track: QuestTrack;
  subscriptionTier: SubscriptionTier;
  runtimeContext: QuestRuntimeContext;
  walletLinked: boolean;
  campaignSource?: CampaignSource | null;
  settings?: EconomySettings;
}) {
  let multiplier = rewardConfig.xp.premiumMultiplierEligible
    ? getRulesEngineTierMultiplier(subscriptionTier, settings, campaignSource)
    : 1;

  if (runtimeContext.flashRewardDay) {
    multiplier += 0.1;
  }

  if (runtimeContext.referralBoostWeek && rewardConfig.referralBonus?.tokenBonusMultiplier) {
    multiplier += rewardConfig.referralBonus.tokenBonusMultiplier - 1;
  }

  const xp = Math.max(Math.round(rewardConfig.xp.base * multiplier), rewardConfig.xp.base);
  const tokenEffect: TokenEffect = rewardConfig.tokenEffect ?? "none";
  const directTokenReward =
    rewardConfig.directTokenReward &&
    isDirectRewardAllowedForTrack({ settings, track }) &&
    (!rewardConfig.directTokenReward.requiresWallet || walletLinked)
      ? {
          asset: settings.payoutAsset,
          amount: applyCampaignDirectRewardBonus({
            amount: rewardConfig.directTokenReward.amount,
            settings,
            campaignSource,
          }),
        }
      : undefined;

  return {
    xp,
    tokenEffect,
    directTokenReward,
  };
}
