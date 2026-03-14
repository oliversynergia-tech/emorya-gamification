import assert from "node:assert/strict";
import test from "node:test";

import { createDefaultQuestRuntimeContext, projectTokenRedemption } from "../lib/progression-rules.ts";
import { projectQuestReward } from "../server/services/project-quest-reward.ts";

test("projectQuestReward applies the rules-engine premium multiplier", () => {
  const result = projectQuestReward({
    track: "premium",
    rewardConfig: {
      xp: {
        base: 100,
        premiumMultiplierEligible: true,
      },
      tokenEffect: "eligibility_progress",
      tokenEligibility: {
        progressPoints: 20,
      },
    },
    subscriptionTier: "annual",
    runtimeContext: createDefaultQuestRuntimeContext(),
    walletLinked: true,
  });

  assert.deepEqual(result, {
    xp: 150,
    tokenEffect: "eligibility_progress",
    directTokenReward: undefined,
  });
});

test("projectQuestReward only projects direct token payouts when wallet requirements pass", () => {
  const rewardConfig = {
    xp: {
      base: 300,
      premiumMultiplierEligible: true,
    },
    tokenEffect: "direct_token_reward" as const,
    directTokenReward: {
      asset: "EMR" as const,
      amount: 25,
      requiresWallet: true,
    },
  };

  const withoutWallet = projectQuestReward({
    track: "premium",
    rewardConfig,
    subscriptionTier: "monthly",
    runtimeContext: createDefaultQuestRuntimeContext(),
    walletLinked: false,
  });

  const withWallet = projectQuestReward({
    track: "premium",
    rewardConfig,
    subscriptionTier: "monthly",
    runtimeContext: createDefaultQuestRuntimeContext(),
    walletLinked: true,
  });

  assert.equal(withoutWallet.directTokenReward, undefined);
  assert.deepEqual(withWallet.directTokenReward, {
    asset: "EMR",
    amount: 25,
  });
});

test("projectTokenRedemption remains locked until reward eligibility and wallet conditions are met", () => {
  const result = projectTokenRedemption({
    eligibilityPoints: 140,
    subscriptionTier: "monthly",
    rewardEligible: false,
    walletLinked: false,
  });

  assert.deepEqual(result, {
    asset: "EMR",
    minimumPoints: 100,
    projectedRedemptionAmount: 0,
    nextRedemptionPoints: 100,
    tierMultiplier: 1.15,
    status: "locked",
  });
});

test("projectTokenRedemption projects a tier-adjusted redemption amount once unlocked", () => {
  const result = projectTokenRedemption({
    eligibilityPoints: 200,
    subscriptionTier: "annual",
    rewardEligible: true,
    walletLinked: true,
  });

  assert.deepEqual(result, {
    asset: "EMR",
    minimumPoints: 100,
    projectedRedemptionAmount: 0,
    nextRedemptionPoints: 100,
    tierMultiplier: 1.3,
    status: "locked",
  });
});

test("projectTokenRedemption can unlock through active economy settings", () => {
  const result = projectTokenRedemption({
    eligibilityPoints: 200,
    subscriptionTier: "annual",
    rewardEligible: true,
    walletLinked: true,
    settings: {
      id: "economy",
      payoutAsset: "EGLD",
      redemptionEnabled: true,
      directRewardsEnabled: true,
      directAnnualReferralEnabled: true,
      directPremiumFlashEnabled: true,
      directAmbassadorEnabled: true,
      minimumEligibilityPoints: 100,
      pointsPerToken: 20,
      xpTierMultipliers: { free: 1, monthly: 1.25, annual: 1.5 },
      tokenTierMultipliers: { free: 1, monthly: 1.15, annual: 1.3 },
      referralSignupBaseXp: 40,
      referralMonthlyConversionBaseXp: 150,
      referralAnnualConversionBaseXp: 300,
      annualReferralDirectTokenAmount: 25,
      updatedAt: "2026-03-14T00:00:00.000Z",
    },
  });

  assert.deepEqual(result, {
    asset: "EGLD",
    minimumPoints: 100,
    projectedRedemptionAmount: 13,
    nextRedemptionPoints: null,
    tierMultiplier: 1.3,
    status: "redeemable",
  });
});
