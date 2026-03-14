import { defaultEconomySettings, isDirectRewardAllowedForTrack } from "../../lib/economy-settings.ts";
import { getRulesEngineTierMultiplier } from "../../lib/progression-rules.ts";
import type { EconomySettings, QuestRuntimeContext, QuestTrack, RewardConfig, SubscriptionTier, TokenEffect } from "../../lib/types.ts";

export function projectQuestReward({
  rewardConfig,
  track,
  subscriptionTier,
  runtimeContext,
  walletLinked,
  settings = defaultEconomySettings,
}: {
  rewardConfig: RewardConfig;
  track: QuestTrack;
  subscriptionTier: SubscriptionTier;
  runtimeContext: QuestRuntimeContext;
  walletLinked: boolean;
  settings?: EconomySettings;
}) {
  let multiplier = rewardConfig.xp.premiumMultiplierEligible
    ? getRulesEngineTierMultiplier(subscriptionTier, settings)
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
          amount: rewardConfig.directTokenReward.amount,
        }
      : undefined;

  return {
    xp,
    tokenEffect,
    directTokenReward,
  };
}
