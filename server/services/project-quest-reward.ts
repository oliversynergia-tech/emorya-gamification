import { getRulesEngineTierMultiplier } from "../../lib/progression-rules.ts";
import type { QuestRuntimeContext, RewardConfig, SubscriptionTier, TokenEffect } from "../../lib/types.ts";

export function projectQuestReward({
  rewardConfig,
  subscriptionTier,
  runtimeContext,
  walletLinked,
}: {
  rewardConfig: RewardConfig;
  subscriptionTier: SubscriptionTier;
  runtimeContext: QuestRuntimeContext;
  walletLinked: boolean;
}) {
  let multiplier = rewardConfig.xp.premiumMultiplierEligible
    ? getRulesEngineTierMultiplier(subscriptionTier)
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
    rewardConfig.directTokenReward && (!rewardConfig.directTokenReward.requiresWallet || walletLinked)
      ? {
          asset: rewardConfig.directTokenReward.asset,
          amount: rewardConfig.directTokenReward.amount,
        }
      : undefined;

  return {
    xp,
    tokenEffect,
    directTokenReward,
  };
}
